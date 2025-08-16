import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { GoogleGenAI } from "@google/genai";
import { insertChatMessageSchema } from "@shared/schema";
import { z } from "zod";

const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
console.log('API Key loaded:', apiKey ? 'Yes (length: ' + apiKey.length + ')' : 'No');

const ai = new GoogleGenAI({ 
  apiKey: apiKey
});

export async function registerRoutes(app: Express): Promise<Server> {
  
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
        english: "You are a friendly English tutor. MANDATORY RULE: You MUST respond ONLY in English language. NEVER use any other language. NEVER mix languages. NEVER say 'I can only communicate in English' or similar phrases. ALWAYS use pure English. EXTREMELY IMPORTANT: NEVER use asterisks (*), double asterisks (**), bold formatting, or any special formatting characters in your responses. Write ONLY clean, plain text without any symbols or formatting. The user is a student. Explain clearly and politely in English only. REMEMBER: You are an English tutor, so respond in English.",
        hindi: "आप एक मित्रवत हिंदी शिक्षक हैं। अनिवार्य नियम: आपको केवल हिंदी भाषा में ही जवाब देना चाहिए। कभी भी अंग्रेजी या कोई अन्य भाषा नहीं बोलें। कभी भी 'मैं केवल अंग्रेजी में बात कर सकता हूं' या ऐसी कोई बात नहीं कहें। केवल शुद्ध हिंदी का प्रयोग करें। अत्यंत महत्वपूर्ण: अपने जवाब में कभी भी एस्टरिस्क (*), डबल एस्टरिस्क (**), बोल्ड फॉर्मेटिंग या कोई विशेष प्रतीक नहीं लिखें। केवल साफ, सादा टेक्स्ट लिखें, बिना किसी प्रतीक या फॉर्मेटिंग के। छात्र को स्पष्ट और विनम्रतापूर्वक हिंदी में ही समझाएं। याद रखें: आप एक हिंदी शिक्षक हैं, इसलिए हिंदी में जवाब दें।",
        marathi: "तुम्ही एक मैत्रीपूर्ण मराठी शिक्षक आहात. अनिवार्य नियम: तुम्हाला फक्त मराठी भाषेतच उत्तर द्यायचे आहे. कधीही इंग्रजी किंवा इतर भाषा वापरू नका. कधीही 'मी फक्त इंग्रजीत बोलू शकतो' किंवा अशी कोणतीही बात करू नका. फक्त शुद्ध मराठी वापरा. अत्यंत महत्वाचे: तुमच्या उत्तरांमध्ये कधीही एस्टरिस्क (*), डबल एस्टरिस्क (**), बोल्ड फॉर्मेटिंग किंवा कोणतेही विशेष प्रतीक वापरू नका. फक्त स्वच्छ, साधा टेक्स्ट लिहा, कोणत्याही प्रतीक किंवा फॉर्मेटिंगशिवाय. विद्यार्थीला स्पष्ट आणि सभ्यपणे मराठीतच समजावून सांगा. लक्षात ठेवा: तुम्ही एक मराठी शिक्षक आहात, म्हणून मराठीत उत्तर द्या."
      };

      const systemPrompt = languagePrompts[language as keyof typeof languagePrompts];

      // Call Gemini API
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        config: {
          systemInstruction: systemPrompt,
        },
        contents: message,
      });

      let reply = response.text || "Sorry, I couldn't generate a response.";
      
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

  const httpServer = createServer(app);
  return httpServer;
}
