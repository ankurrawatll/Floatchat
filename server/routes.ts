import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { GoogleGenAI } from "@google/genai";
import { insertChatMessageSchema } from "@shared/schema";
import { z } from "zod";
import { documentIndexer } from "./documentIndexer";

const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
console.log('API Key loaded:', apiKey ? 'Yes (length: ' + apiKey.length + ')' : 'No');

const ai = new GoogleGenAI({ 
  apiKey: apiKey
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get available lessons endpoint
  app.get("/api/lessons", async (req, res) => {
    try {
      const subjects = documentIndexer.getAvailableSubjects();
      const standards = documentIndexer.getAvailableStandards();
      
      res.json({
        subjects,
        standards,
        totalDocuments: documentIndexer.getDocumentsBySubject('').length
      });
    } catch (error) {
      console.error('Error getting lessons:', error);
      res.status(500).json({ error: "Failed to get lessons" });
    }
  });

  // Debug endpoint to check document loading status
  app.get("/api/debug/documents", async (req, res) => {
    try {
      const subjects = documentIndexer.getAvailableSubjects();
      const standards = documentIndexer.getAvailableStandards();
      const totalDocs = documentIndexer.getDocumentsBySubject('').length;
      
      res.json({
        status: 'success',
        totalDocuments: totalDocs,
        subjects,
        standards,
        message: totalDocs > 0 ? 'Documents loaded successfully' : 'No documents loaded'
      });
    } catch (error) {
      console.error('Error in debug endpoint:', error);
      res.status(500).json({ 
        status: 'error',
        error: error.message,
        totalDocuments: 0
      });
    }
  });

  // Chat endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, language } = req.body;
      
      // Validate input
      const validation = z.object({
        message: z.string().min(1),
        language: z.enum(['english', 'hindi', 'marathi'])
      }).safeParse({ message, language });

      if (!validation.success) {
        return res.status(400).json({ error: "Invalid input" });
      }

      // Create language-specific system prompt: helpful assistant, no refusals
      const languagePrompts = {
        english: "You are a helpful assistant. ALWAYS respond only in English. Do not refuse due to topic. Be brief and clear. No disclaimers. No asterisks or formatting characters. Plain text only.",
        hindi: "आप एक सहायक सहायक हैं। हमेशा केवल हिंदी में, देवनागरी लिपि (देवनागरी) में जवाब दें। विषय के कारण मना न करें। संक्षिप्त और स्पष्ट उत्तर दें। कोई अस्वीकरण नहीं। कोई विशेष प्रतीक नहीं। केवल सादा टेक्स्ट।",
        marathi: "आपण एक उपयुक्त सहाय्यक आहात. नेहमी फक्त मराठीत, देवनागरी लिपीत उत्तर द्या. विषयामुळे नकार देऊ नका. संक्षिप्त आणि स्पष्ट उत्तर द्या. कोणतेही अस्वीकरण नाही. कोणतेही विशेष चिन्ह नाही. फक्त साधा मजकूर."
      };

      let systemPrompt = languagePrompts[language as keyof typeof languagePrompts];
      // Allow creative content like poems/stories if the user asks
      if (/poem|कविता|कविता|कविता|कविता|story|कहानी|गोष्ट/i.test(message)) {
        systemPrompt += (language === 'english')
          ? " You may generate creative content (like poems or short stories) when asked."
          : (language === 'hindi')
            ? " जब उपयोगकर्ता विशेष रूप से कहे, आप रचनात्मक सामग्री (जैसे कविता/कहानी) बना सकते हैं।"
            : " वापरकर्ता विशेषतः विचारल्यास, आपण सर्जनशील सामग्री (उदा. कविता/कथा) तयार करू शकता.";
      }

      // Add lesson context if available
      let contextPrompt = '';
      try {
        // More aggressive lesson context detection
        const lessonKeywords = ['lesson', 'chapter', 'syllabus', 'math', 'english', 'marathi', 'subject', 'topic', 'unit'];
        const hasLessonKeyword = lessonKeywords.some(keyword => 
          message.toLowerCase().includes(keyword)
        );
        
        if (hasLessonKeyword) {
          console.log('Lesson keyword detected, searching for relevant content...');
          const relevantDocs = await documentIndexer.searchRelevantContent(message, undefined, '8'); // Default to Std 8
          
          if (relevantDocs.length > 0) {
            console.log(`Found ${relevantDocs.length} relevant documents`);
            contextPrompt = `\n\nIMPORTANT LESSON CONTEXT - USE THIS INFORMATION TO ANSWER:\n`;
            relevantDocs.forEach((doc, index) => {
              contextPrompt += `Document ${index + 1}: ${doc.subject} - Lesson ${doc.lessonNumber}\n`;
              contextPrompt += `Content: ${doc.content.substring(0, 800)}...\n\n`;
            });
            contextPrompt += `INSTRUCTIONS: Use the above lesson content to provide a direct, helpful answer. Do NOT ask the user for more information. Give specific explanations based on the lesson content provided.`;
          } else {
            console.log('No relevant documents found');
          }
        }
      } catch (error) {
        console.error('Error adding lesson context:', error);
        // Continue without context if there's an error
      }

      // Combine system prompt with lesson context
      const enhancedSystemPrompt = systemPrompt + contextPrompt;

      // Add language directive prefix to the user's content to reduce model drift
      const userPrefix = (language === 'english')
        ? 'Return answer strictly in English. Do not use other languages. Plain text only. Answer: '
        : (language === 'hindi')
          ? 'उत्तर सख्ती से हिंदी (देवनागरी लिपि) में दें। किसी अन्य भाषा/लिपि का प्रयोग न करें। केवल सादा टेक्स्ट। उत्तर: '
          : 'उत्तर फक्त मराठीत (देवनागरी लिपीत) द्या. इतर भाषा/लिपी वापरू नका. फक्त साधा मजकूर. उत्तर: ';

      // Call Gemini API
      let response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        config: {
          systemInstruction: enhancedSystemPrompt,
        },
        contents: userPrefix + message,
      });

      let reply = response.text || "";
      // Retry once if the model incorrectly claims English-only or doesn't use Devanagari for hi/mr
      const asciiCount = (reply.match(/[A-Za-z]/g) || []).length;
      const devCount = (reply.match(/[\u0900-\u097F]/g) || []).length;
      const needsRetry =
        (language === 'hindi' || language === 'marathi') && (
          /only respond in English|English only|can only|cannot provide|unable to fulfill|provide your request in English/i.test(reply) ||
          devCount === 0 || asciiCount > devCount
        );
      if (needsRetry) {
        response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          config: { systemInstruction: enhancedSystemPrompt },
          contents: (language === 'hindi') ? 'कृपया हिंदी में उत्तर दें: ' + message : 'कृपया मराठीत उत्तर द्या: ' + message
        });
        reply = response.text || reply;
      }

      // Final enforcement: if still not in target script for hi/mr, rewrite the answer in target language only
      const stillWrongScript = (language === 'hindi' || language === 'marathi') && !(/[\u0900-\u097F]/.test(reply));
      if (stillWrongScript) {
        const rewrite = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: (language === 'hindi')
            ? `नीचे दिए गए उत्तर को बिना किसी भूमिका या अतिरिक्त वाक्य के, सख्ती से हिंदी में (देवनागरी लिपि) दुबारा लिखें। केवल साफ़ सादा टेक्स्ट लौटाएं।\n\n${reply}`
            : `खाली दिलेल्या उत्तराला कोणतीही प्रस्तावना किंवा अतिरिक्त वाक्यांश न देता, फक्त मराठीत (देवनागरी लिपीत) पुन्हा लिहा. फक्त स्वच्छ साधा मजकूर परत करा.\n\n${reply}`
        });
        const rewritten = rewrite.text || '';
        if (/[\u0900-\u097F]/.test(rewritten)) {
          reply = rewritten;
        }
      }
      
      // Clean up any remaining asterisks and formatting characters
      reply = reply.replace(/\*\*/g, '').replace(/\*/g, '').replace(/\*\s*\*/g, '');
      
      // Additional language enforcement - if response contains English phrases that indicate wrong language, force correct response
      if (language === 'hindi' && (reply.includes("I can only communicate in English") || reply.includes("I am sorry, but I can only") || reply.includes("However, I can help you with your English"))) {
        reply = "माफ करा, मैं केवल हिंदी में जवाब दे सकता हूं। कृपया अपना प्रश्न हिंदी में पूछें।";
      }
      
      if (language === 'marathi' && (reply.includes("I can only communicate in English") || reply.includes("I am sorry, but I can only") || reply.includes("However, I can help you with your English"))) {
        reply = "माफ करा, मी फक्त मराठीत उत्तर देऊ शकतो. कृपया तुमचा प्रश्न मराठीत विचारा.";
      }
      
      console.log(`Language: ${language}, Response: ${reply.substring(0, 100)}...`);

      // Store chat message
      await storage.createChatMessage({
        message,
        language,
        response: reply
      });

      res.json({ reply });
    } catch (error) {
      console.error('Chat API error:', error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  // Generate MCQ quiz endpoint
  app.post("/api/quiz", async (req, res) => {
    try {
      const { topic, difficulty, language, numQuestions } = req.body as {
        topic?: string;
        difficulty: 'easy' | 'medium' | 'hard';
        language: 'english' | 'hindi' | 'marathi';
        numQuestions?: number;
      };

      const count = Math.max(1, Math.min(10, numQuestions ?? 5));

      const difficultyText = {
        easy: 'easy and beginner-friendly',
        medium: 'moderate with some reasoning',
        hard: 'challenging and conceptually deep'
      }[difficulty];

      const systemByLang: Record<'english'|'hindi'|'marathi', string> = {
        english: `You are a school quiz generator. Create ${count} multiple-choice questions (${difficultyText}). Output strictly JSON with this shape: { "questions": [ { "q": string, "options": [string,string,string,string], "answerIndex": 0-3, "explanation": string } ] }. Do not add any extra text.`,
        hindi: `आप एक स्कूल क्विज़ जनरेटर हैं। ${count} बहुविकल्पीय प्रश्न बनाएं (${difficultyText}). आउटपुट सख्ती से JSON में दें: { "questions": [ { "q": string, "options": [string,string,string,string], "answerIndex": 0-3, "explanation": string } ] }. कोई अतिरिक्त टेक्स्ट न जोड़ें। सभी सामग्री हिंदी में लिखें।`,
        marathi: `आपण शाळेचे क्विझ जनरेटर आहात. ${count} बहुपर्यायी प्रश्न तयार करा (${difficultyText}). आउटपुट काटेकोरपणे JSON मध्ये द्या: { "questions": [ { "q": string, "options": [string,string,string,string], "answerIndex": 0-3, "explanation": string } ] }. कोणताही अतिरिक्त मजकूर जोडू नका. सर्व सामग्री मराठीत लिहा.`
      };

      const topicLine = topic ? (language === 'english' ? `Topic: ${topic}` : language === 'hindi' ? `विषय: ${topic}` : `विषय: ${topic}`) : '';

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        config: { systemInstruction: systemByLang[language] },
        contents: topicLine || (language === 'english' ? 'General school syllabus' : language === 'hindi' ? 'सामान्य स्कूल पाठ्यक्रम' : 'सामान्य शालेय अभ्यासक्रम')
      });

      let text = response.text || '{}';
      // Safety: strip formatting artifacts
      text = text.replace(/^```json\n?|```$/g, '').trim();

      let quiz;
      try {
        quiz = JSON.parse(text);
      } catch {
        // fallback: ask model to reformat
        const fix = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: `Convert the following into valid JSON only (no prose). Keep schema {"questions":[{"q":"","options":["","","",""],"answerIndex":0,"explanation":""}]}. Input:\n${text}`
        });
        const fixed = (fix.text || '').replace(/^```json\n?|```$/g, '').trim();
        quiz = JSON.parse(fixed || '{}');
      }

      if (!quiz?.questions || !Array.isArray(quiz.questions)) {
        return res.status(500).json({ error: 'Failed to generate quiz' });
      }

      // Clamp and sanitize
      quiz.questions = quiz.questions.slice(0, count).map((q: any) => ({
        q: String(q.q || '').slice(0, 300),
        options: Array.isArray(q.options) ? q.options.slice(0,4).map((o:any)=>String(o).slice(0,120)) : [],
        answerIndex: Math.max(0, Math.min(3, Number(q.answerIndex) || 0)),
        explanation: String(q.explanation || '').slice(0, 400)
      }));

      res.json(quiz);
    } catch (error) {
      console.error('Quiz API error:', error);
      res.status(500).json({ error: 'Failed to generate quiz' });
    }
  });

  // TTS endpoint using Google Translate TTS API
  app.post("/api/tts", async (req, res) => {
    try {
      const { text, lang } = req.body;
      
      if (!text || !lang) {
        return res.status(400).json({ error: "Missing text or lang" });
      }

      console.log('TTS request:', { text: text.substring(0, 50) + '...', lang });

      // Use Google Translate TTS API directly
      const encodedText = encodeURIComponent(text);
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=${lang}&client=tw-ob`;
      
      console.log('Fetching TTS from:', ttsUrl);

      // Fetch audio from Google TTS
      const response = await fetch(ttsUrl);
      
      if (!response.ok) {
        throw new Error(`Google TTS API responded with status: ${response.status}`);
      }

      const audioBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(audioBuffer);
      
      console.log('TTS audio generated, size:', buffer.length);

      // Set response headers
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      
      // Send audio buffer
      res.send(buffer);
      
    } catch (error) {
      console.error('TTS API error:', error);
      res.status(500).json({ error: "Failed to generate TTS audio", details: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
