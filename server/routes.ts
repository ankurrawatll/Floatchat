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

      // Create language-specific system prompt
      const languagePrompts = {
        english: "You are a knowledgeable English tutor with access to the school's lesson database. MANDATORY RULE: You MUST respond ONLY in English language. NEVER use any other language. NEVER mix languages. NEVER say 'I can only communicate in English' or similar phrases. ALWAYS use pure English. EXTREMELY IMPORTANT: NEVER use asterisks (*), double asterisks (**), bold formatting, or any special formatting characters in your responses. Write ONLY clean, plain text without any symbols or formatting. The user is a student. Explain clearly and politely in English only. REMEMBER: You are an English tutor, so respond in English. CRITICAL: When lesson context is provided, use it immediately to give direct, specific answers. Do NOT ask the user for more information. Provide helpful explanations based on the lesson content given.",
        hindi: "आप एक मित्रवत हिंदी शिक्षक हैं जिनके पास स्कूल के पाठ्यक्रम डेटाबेस तक पहुंच है। अनिवार्य नियम: आपको केवल हिंदी भाषा में ही जवाब देना चाहिए। कभी भी अंग्रेजी या कोई अन्य भाषा नहीं बोलें। कभी भी 'मैं केवल अंग्रेजी में बात कर सकता हूं' या ऐसी कोई बात नहीं कहें। केवल शुद्ध हिंदी का प्रयोग करें। अत्यंत महत्वपूर्ण: अपने जवाब में कभी भी एस्टरिस्क (*), डबल एस्टरिस्क (**), बोल्ड फॉर्मेटिंग या कोई विशेष प्रतीक नहीं लिखें। केवल साफ, सादा टेक्स्ट लिखें, बिना किसी प्रतीक या फॉर्मेटिंग के। छात्र को स्पष्ट और विनम्रतापूर्वक हिंदी में ही समझाएं। याद रखें: आप एक हिंदी शिक्षक हैं, इसलिए हिंदी में जवाब दें। महत्वपूर्ण: दिए गए पाठ संदर्भ का उपयोग करके सटीक, पाठ्यक्रम-विशिष्ट उत्तर दें जब उपलब्ध हो।",
        marathi: "तुम्ही एक मैत्रीपूर्ण मराठी शिक्षक आहात ज्यांच्याकडे शाळेच्या पाठ्यक्रम डेटाबेसची प्रवेश आहे. अनिवार्य नियम: तुम्हाला फक्त मराठी भाषेतच उत्तर द्यायचे आहे. कधीही इंग्रजी किंवा इतर भाषा वापरू नका. कधीही 'मी फक्त इंग्रजीत बोलू शकतो' किंवा अशी कोणतीही बात करू नका. फक्त शुद्ध मराठी वापरा. अत्यंत महत्वाचे: तुमच्या उत्तरांमध्ये कधीही एस्टरिस्क (*), डबल एस्टरिस्क (**), बोल्ड फॉर्मेटिंग किंवा कोणतेही विशेष प्रतीक वापरू नका. फक्त स्वच्छ, साधा टेक्स्ट लिहा, कोणत्याही प्रतीक किंवा फॉर्मेटिंगशिवाय. विद्यार्थीला स्पष्ट आणि सभ्यपणे मराठीतच समजावून सांगा. लक्षात ठेवा: तुम्ही एक मराठी शिक्षक आहात, म्हणून मराठीत उत्तर द्या. महत्वाचे: दिलेल्या पाठ संदर्भाचा वापर करून अचूक, पाठ्यक्रम-विशिष्ट उत्तरे द्या जेव्हा उपलब्ध असतात."
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
          ? 'उत्तर सख्ती से हिंदी में दें। किसी अन्य भाषा का प्रयोग न करें। केवल सादा टेक्स्ट। उत्तर: '
          : 'उत्तर फक्त मराठीत द्या. इतर भाषा वापरू नका. फक्त साधा मजकूर. उत्तर: ';

      // Call Gemini API
      let response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        config: {
          systemInstruction: enhancedSystemPrompt,
        },
        contents: userPrefix + message,
      });

      let reply = response.text || "Sorry, I couldn't generate a response.";
      // Retry once if the model incorrectly claims English-only or doesn't use Devanagari for hi/mr
      const needsRetry =
        (language === 'hindi' || language === 'marathi') && (
          /only respond in English|English only|can only/i.test(reply) ||
          // basic script heuristic: expect Devanagari characters present
          !/[\u0900-\u097F]/.test(reply)
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
            ? `नीचे दिए गए उत्तर को बिना किसी भूमिका या अतिरिक्त वाक्य के, सख्ती से हिंदी में दुबारा लिखें। केवल साफ़ सादा टेक्स्ट लौटाएं।\n\n${reply}`
            : `खाली दिलेल्या उत्तराला कोणतीही प्रस्तावना किंवा अतिरिक्त वाक्यांश न देता, फक्त मराठीत पुन्हा लिहा. फक्त स्वच्छ साधा मजकूर परत करा.\n\n${reply}`
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

  const httpServer = createServer(app);
  return httpServer;
}
