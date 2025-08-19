import { useState, useRef, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

interface Message {
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

type Language = 'english' | 'hindi' | 'marathi';

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [currentLanguage, setCurrentLanguage] = useState<Language>('english');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [mode, setMode] = useState<'assistant' | 'quiz'>('assistant');
  const [quizDifficulty, setQuizDifficulty] = useState<'easy'|'medium'|'hard'>('easy');
  const [quizLang, setQuizLang] = useState<Language>('english');
  const [quiz, setQuiz] = useState<{questions: {q:string, options:string[], answerIndex:number, explanation:string}[]} | null>(null);
  const [quizTopic, setQuizTopic] = useState<string>('');
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([]);
  const [showResults, setShowResults] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ startX: 0, startY: 0, startLeft: 0, startTop: 0 });
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[] | null>(null);
  const [voicesReady, setVoicesReady] = useState(false);

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
    }
  };

  const greetings = {
    english: "Hello! I am your Tutor. How can I help you today?",
    hindi: "नमस्ते! मैं आपका शिक्षक हूँ। आज मैं आपकी किस प्रकार मदद कर सकता हूँ?",
    marathi: "नमस्कार! मी तुमचा शिक्षक आहे. आज मी तुम्हाला कशी मदत करू शकतो?"
  };

  // Initialize speech recognition
  useEffect(() => {
    // Prepare voices
    const loadVoices = () => {
      if ('speechSynthesis' in window) {
        const v = window.speechSynthesis.getVoices();
        if (v && v.length > 0) {
          voicesRef.current = v;
          setVoicesReady(true);
        }
      }
    };
    if ('speechSynthesis' in window) {
      loadVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        loadVoices();
      };
    }

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      // Always capture STT as-is in English (roman script) to avoid auto-translation and accept Hinglish/English/Marathi typed Latin
      recognitionRef.current.lang = 'en-IN';
      
      recognitionRef.current.onstart = () => {
        aggressiveStop();
        setIsListening(true);
      };

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setCurrentMessage(transcript);
        handleSendMessage(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Keep STT fixed to English (en-IN) regardless of tab per requirements
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = 'en-IN';
    }
  }, [currentLanguage]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize with greeting (assistant mode only)
  useEffect(() => {
    if (mode !== 'assistant') return;
    if (!voicesReady && 'speechSynthesis' in window) {
      // wait briefly for voices to load to avoid default English voice
      const t = setTimeout(() => setVoicesReady(true), 200);
      return () => clearTimeout(t);
    }
    stopSpeaking();
    setMessages([{
      text: greetings[currentLanguage],
      sender: 'bot',
      timestamp: new Date()
    }]);
    speakText(greetings[currentLanguage], currentLanguage);
  }, [currentLanguage, mode, voicesReady]);

  const speakText = (text: string, language: Language) => {
    if ('speechSynthesis' in window) {
      // If voices not yet ready, wait briefly and retry to avoid fallback English voice
      if (!voicesReady || !voicesRef.current || voicesRef.current.length === 0) {
        setTimeout(() => speakText(text, language), 150);
        return;
      }
      // interrupt any ongoing/queued speech
      stopSpeaking();
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure voice based on language
      const voices = voicesRef.current && voicesRef.current.length > 0 ? voicesRef.current : speechSynthesis.getVoices();
      let selectedVoice = null;
      
      // Debug: Log all available voices for Marathi
      if (language === 'marathi') {
        console.log('Available voices for Marathi:', voices.map(v => ({ name: v.name, lang: v.lang, default: v.default })));
      }
      
      if (language === 'hindi' || language === 'marathi') {
        // Priority 1: Look for matching language female voice
        selectedVoice = voices.find(voice => 
          ((language === 'hindi' && (voice.lang.toLowerCase().includes('hi') || voice.name.toLowerCase().includes('hindi')))
           || (language === 'marathi' && (voice.lang.toLowerCase().includes('mr') || voice.name.toLowerCase().includes('marathi')))) &&
          (voice.name.includes('Female') || voice.name.includes('Girl') || voice.name.includes('Woman'))
        );
        
        // Priority 2: Look for any matching language voice
        if (!selectedVoice) {
          selectedVoice = voices.find(voice => 
            (language === 'hindi' && (voice.lang.toLowerCase().includes('hi') || voice.name.toLowerCase().includes('hindi'))) ||
            (language === 'marathi' && (voice.lang.toLowerCase().includes('mr') || voice.name.toLowerCase().includes('marathi')))
          );
        }
        
        // Priority 3: Look for Indian female voice
        if (!selectedVoice) {
          selectedVoice = voices.find(voice => 
            (voice.name.includes('India') || voice.name.includes('Indian')) &&
            (voice.name.includes('Female') || voice.name.includes('Girl') || voice.name.includes('Woman'))
          );
        }
        
        // Priority 4: Look for any Indian voice
        if (!selectedVoice) {
          selectedVoice = voices.find(voice => 
            voice.name.includes('India') || voice.name.includes('Indian')
          );
        }
        
        // Priority 5: Look for any female voice with Hindi/Marathi language code
        if (!selectedVoice) {
          selectedVoice = voices.find(voice => 
            (voice.lang.toLowerCase().includes('hi') || voice.lang.toLowerCase().includes('mr')) && 
            (voice.name.includes('Female') || voice.name.includes('Girl') || voice.name.includes('Woman'))
          );
        }
        
        // Priority 6: Fallback to any Hindi/Marathi language voice
        if (!selectedVoice) {
          selectedVoice = voices.find(voice => voice.lang.toLowerCase().includes('hi') || voice.lang.toLowerCase().includes('mr'));
        }
        
        // Priority 7: For Marathi specifically, try Hindi voices as fallback
        if (!selectedVoice && language === 'marathi') {
          selectedVoice = voices.find(voice => voice.lang.toLowerCase().includes('hi'));
          console.log('Marathi fallback to Hindi voice:', selectedVoice?.name);
        }
        
        // Priority 8: For Marathi, try any Indian voice as final fallback
        if (!selectedVoice && language === 'marathi') {
          selectedVoice = voices.find(voice => 
            voice.name.includes('India') || voice.name.includes('Indian') || voice.lang.toLowerCase().includes('in')
          );
          console.log('Marathi fallback to Indian voice:', selectedVoice?.name);
        }
        
        // Priority 9: Fallback to any female voice
        if (!selectedVoice) {
          selectedVoice = voices.find(voice => 
            voice.name.includes('Female') || voice.name.includes('Girl') || voice.name.includes('Woman')
          );
        }
      } else {
        // English voice selection
        // Prefer Indian English female voice if available, otherwise previous heuristic
        selectedVoice = voices.find(voice => (voice.lang.toLowerCase().includes('en-in') || voice.name.includes('India')) && (voice.name.includes('Female') || voice.name.includes('Girl') || voice.name.includes('Woman')))
          || voices.find(voice => voice.name.includes('Female') && (voice.name.includes('Google') || voice.name.includes('UK')));
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        // Set proper lang hint to improve TTS voice behavior
        utterance.lang = language === 'hindi' ? 'hi-IN' : language === 'marathi' ? 'mr-IN' : 'en-IN';
        console.log('Selected voice:', selectedVoice.name, 'for language:', language, 'lang:', utterance.lang);
      } else {
        // Still set a language code so system picks a better fallback
        utterance.lang = language === 'hindi' ? 'hi-IN' : language === 'marathi' ? 'mr-IN' : 'en-IN';
        console.log('No suitable voice found for language:', language, 'Available voices:', voices.length);
      }
      
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      utterance.onend = () => { 
        console.log('TTS ended for language:', language);
        utteranceRef.current = null; 
      };
      utterance.onerror = (event) => { 
        console.error('TTS error for language:', language, event);
        utteranceRef.current = null; 
      };
      utteranceRef.current = utterance;
      
      // For Marathi, ensure we have a voice selected
      if (language === 'marathi' && !utterance.voice) {
        console.warn('No voice selected for Marathi, using system default');
        // Force speech synthesis to work even without specific voice
        utterance.lang = 'mr-IN';
      }
      
      speechSynthesis.speak(utterance);
      console.log('Started TTS for language:', language, 'text length:', text.length, 'voice:', utterance.voice?.name || 'default');
    }
  };

  const handleSendMessage = async (messageText?: string) => {
    // stop any current speech when a new message is sent
    aggressiveStop();
    const message = messageText || currentMessage.trim();
    if (!message) return;

    // Add user message
    const userMessage: Message = {
      text: message,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      // Send to API
      const response = await apiRequest('POST', '/api/chat', {
        message,
        language: currentLanguage
      });
      
      const data = await response.json();
      
      // Add bot response
      const botMessage: Message = {
        text: data.reply,
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
      
      // Speak the response
      speakText(data.reply, currentLanguage);
      
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        text: "Sorry, I couldn't process your message. Please try again.",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const startVoiceRecording = () => {
    if (recognitionRef.current && !isListening) {
      // stop TTS before starting mic
      aggressiveStop();
      recognitionRef.current.start();
    } else if (isListening) {
      recognitionRef.current.stop();
    }
  };

  const handleLanguageChange = (language: Language) => {
    aggressiveStop();
    setCurrentLanguage(language);
    setMessages([]);
  };

  const generateQuiz = async () => {
    try {
      setIsLoading(true);
      setShowResults(false);
      setQuiz(null);
      const res = await apiRequest('POST', '/api/quiz', {
        topic: quizTopic && quizTopic.trim() ? quizTopic.trim() : undefined,
        difficulty: quizDifficulty,
        language: quizLang,
        numQuestions: 5,
      });
      const data = await res.json();
      setQuiz(data);
      setSelectedAnswers(Array.from({ length: (data?.questions?.length || 0) }, () => null));
    } catch (e) {
      console.error('quiz error', e);
      setQuiz(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Aggressive stop utility: cancels and flushes speech queue
  const aggressiveStop = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
        window.speechSynthesis.cancel();
      } catch {}
    }
  };

  // Stop speaking on unmount / page unload
  useEffect(() => {
    const handleBeforeUnload = () => aggressiveStop();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      aggressiveStop();
    };
  }, []);

  // Stop TTS when widget is closed/toggled
  useEffect(() => {
    if (!isOpen) aggressiveStop();
  }, [isOpen]);

  // Stop on tab hide/visibility change
  useEffect(() => {
    const onVisibility = () => { if (document.hidden) aggressiveStop(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.chat-content')) return;
    
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startLeft: position.x,
      startTop: position.y
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const defaultW = 448; // fallback
    const defaultH = 544; // fallback
    const cw = chatWindowRef.current?.offsetWidth || defaultW;
    const ch = chatWindowRef.current?.offsetHeight || defaultH;
    const newX = Math.max(0, Math.min(window.innerWidth - cw, dragRef.current.startLeft + dx));
    const newY = Math.max(0, Math.min(window.innerHeight - ch, dragRef.current.startTop + dy));
    
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  return (
    <div 
      className={`fixed z-50 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        left: position.x || undefined,
        top: position.y || undefined,
        right: position.x ? undefined : '24px',
        bottom: position.y ? undefined : '24px'
      }}
      onMouseDown={handleMouseDown}
      data-testid="chatbot-container"
    >
      {/* Floating Button */}
      <div 
        className={`w-16 h-16 bg-gradient-to-br from-saffron-400 to-saffron-500 rounded-full shadow-2xl cursor-pointer flex items-center justify-center hover:scale-110 transition-all duration-300 animate-float ${isOpen ? 'scale-90' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        data-testid="chatbot-button"
      >
        <i className="fas fa-comments text-black text-xl"></i>
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-forest-400 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-white text-xs font-bold">AI</span>
        </div>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div ref={chatWindowRef} className="absolute bottom-20 right-0 w-[90vw] sm:w-[28rem] h-[70vh] sm:h-[34rem] bg-black/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-saffron-400/30 overflow-hidden chat-content">
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-saffron-400 to-saffron-500 p-4 flex items-center justify-between text-black">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-black/20 rounded-full flex items-center justify-center">
                <i className="fas fa-robot text-sm"></i>
              </div>
              <div>
                <h3 className="font-poppins font-semibold text-sm">{mode === 'assistant' ? 'AI Tutor' : 'Test Your Knowledge'}</h3>
                <p className="text-xs opacity-90">{mode === 'assistant' ? 'Ready to help!' : 'Auto-generated MCQ quiz'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* Mode toggle */}
              <select 
                value={mode}
                onChange={(e) => setMode(e.target.value as 'assistant' | 'quiz')}
                className="bg-black/20 rounded-lg px-2 py-1 text-xs border-none outline-none cursor-pointer text-black"
                style={{ color: 'black' }}
              >
                <option value="assistant" style={{ color: 'white' }}>🤖 Assistant</option>
                <option value="quiz" style={{ color: 'white' }}>📝 Quiz</option>
              </select>
              <select 
                value={currentLanguage}
                onChange={(e) => handleLanguageChange(e.target.value as Language)}
                className="bg-black/20 rounded-lg px-2 py-1 text-xs border-none outline-none cursor-pointer text-black"
                style={{
                  color: 'black'
                }}
                data-testid="language-selector"
              >
                <option value="english" style={{color: 'white'}}>🇬🇧 EN</option>
                <option value="hindi" style={{color: 'white'}}>🇮🇳 HI</option>
                <option value="marathi" style={{color: 'white'}}>🟠 MR</option>
              </select>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 flex items-center justify-center hover:bg-black/20 rounded-full transition-colors"
                data-testid="close-chat"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Messages Area */}
            <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-gradient-to-b from-gray-900 to-black min-h-[200px] max-h-[400px] scrollbar-always">
              {mode === 'assistant' ? (
                <>
                  {/* Welcome message when no messages exist */}
                  {messages.length === 0 && !isLoading && (
                    <>
                      <div className="flex items-center justify-center h-full min-h-[150px]">
                        <div className="text-center text-gray-400">
                          <div className="w-16 h-16 bg-saffron-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="fas fa-robot text-saffron-400 text-2xl"></i>
                          </div>
                          <p className="text-sm">Start a conversation with your AI Tutor!</p>
                        </div>
                      </div>
                      
                      {/* Additional content to ensure scrollbar appears */}
                      <div className="space-y-4 mt-8">
                        <div className="text-center text-gray-500 text-xs">
                          <p>💡 Tip: You can ask questions in English, Hindi, or Marathi</p>
                        </div>
                        <div className="text-center text-gray-500 text-xs">
                          <p>🎤 Use voice input for hands-free interaction</p>
                        </div>
                        <div className="text-center text-gray-500 text-xs">
                          <p>📚 Get help with any subject or topic</p>
                        </div>
                        <div className="text-center text-gray-500 text-xs">
                          <p>🧠 Switch to Quiz mode to test your knowledge</p>
                        </div>
                      </div>
                    </>
                  )}
                  
                  {messages.map((message, index) => (
                    <div key={index} className={`flex ${message.sender === 'user' ? 'justify-end' : 'items-start space-x-2'}`}>
                      {message.sender === 'bot' && (
                        <div className="w-8 h-8 bg-saffron-400 rounded-full flex items-center justify-center flex-shrink-0">
                          <i className="fas fa-robot text-black text-xs"></i>
                        </div>
                      )}
                      <div className={`rounded-xl p-3 max-w-64 ${
                        message.sender === 'bot' 
                          ? 'bg-gray-800 shadow-lg border border-saffron-400/30 text-white' 
                          : 'bg-saffron-400 text-black'
                      }`}>
                        <p className="text-sm">{message.text}</p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-start space-x-2">
                      <div className="w-8 h-8 bg-saffron-400 rounded-full flex items-center justify-center flex-shrink-0">
                        <i className="fas fa-robot text-black text-xs"></i>
                      </div>
                      <div className="bg-gray-800 rounded-xl p-3 shadow-lg border border-saffron-400/30">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-saffron-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-saffron-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-saffron-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Quiz Controls */}
                  <div className="flex items-center gap-2">
                    <select value={quizLang} onChange={(e)=> setQuizLang(e.target.value as Language)} className="border border-saffron-400/30 rounded px-2 py-1 text-sm bg-gray-800 text-white">
                      <option value="english">English</option>
                      <option value="hindi">हिंदी</option>
                      <option value="marathi">मराठी</option>
                    </select>
                    <select value={quizDifficulty} onChange={(e)=> setQuizDifficulty(e.target.value as any)} className="border border-saffron-400/30 rounded px-2 py-1 text-sm bg-gray-800 text-white">
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                    <input value={quizTopic} onChange={(e)=> setQuizTopic(e.target.value)} placeholder="What type question you want to practise?" className="flex-1 border border-saffron-400/30 rounded px-2 py-1 text-sm bg-gray-800 text-white placeholder-gray-400" />
                    <button onClick={async ()=> { await generateQuiz(); }} className="px-3 py-1 rounded bg-saffron-400 text-black text-xs hover:bg-saffron-500">Generate</button>
                  </div>

                  {/* Quiz Body */}
                  {quiz?.questions?.map((q, idx) => (
                    <div key={idx} className="border border-saffron-400/30 rounded-lg p-3 bg-gray-800">
                      <div className="font-medium text-sm mb-2 text-white">{idx+1}. {q.q}</div>
                      <div className="grid gap-2">
                        {q.options.map((opt, oi) => (
                          <label key={oi} className={`flex items-center gap-2 text-sm border border-saffron-400/30 rounded px-2 py-1 cursor-pointer text-white ${selectedAnswers[idx] === oi ? 'bg-saffron-400/20 border-saffron-400' : 'bg-gray-700'}`}>
                            <input type="radio" name={`q-${idx}`} checked={selectedAnswers[idx] === oi} onChange={()=> {
                              const next = [...selectedAnswers];
                              next[idx] = oi;
                              setSelectedAnswers(next);
                            }} />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                      {showResults && (
                        <div className="mt-2 text-xs">
                          <div className={selectedAnswers[idx] === q.answerIndex ? 'text-green-400' : 'text-red-400'}>
                            {selectedAnswers[idx] === q.answerIndex ? 'Correct' : 'Incorrect'}
                          </div>
                          <div className="text-gray-300 mt-1">{q.explanation}</div>
                        </div>
                      )}
                    </div>
                  ))}

                  {quiz && (
                    <div className="flex gap-2">
                      <button onClick={()=> setShowResults(true)} className="px-3 py-1 rounded bg-forest-400 text-black text-xs hover:bg-forest-500">Check answers</button>
                      <button onClick={()=> { setQuiz(null); setSelectedAnswers([]); setShowResults(false); }} className="px-3 py-1 rounded bg-gray-600 text-white text-xs hover:bg-gray-700">Clear</button>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Section - Fixed positioning at bottom */}
            <div className="flex-shrink-0 p-4 bg-gray-900 border-t border-saffron-400/30">
              {mode === 'assistant' ? (
                <div className="flex items-center space-x-2">
                  <div className="flex-1 relative">
                    <input 
                      type="text" 
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type your question..." 
                      className="w-full px-4 py-2 rounded-xl border border-saffron-400/30 focus:outline-none focus:ring-2 focus:ring-saffron-400 focus:border-transparent text-sm bg-gray-800 text-white placeholder-gray-400"
                      data-testid="chat-input"
                    />
                    <button 
                      onClick={startVoiceRecording}
                      className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-6 h-6 flex items-center justify-center hover:bg-gray-700 rounded-full transition-colors ${isListening ? 'text-red-400' : 'text-saffron-400'}`}
                      data-testid="voice-button"
                    >
                      <i className={`fas ${isListening ? 'fa-stop' : 'fa-microphone'} text-xs`}></i>
                    </button>
                  </div>
                  <button 
                    onClick={() => handleSendMessage()}
                    disabled={isLoading}
                    className="w-8 h-8 bg-saffron-400 hover:bg-saffron-500 disabled:opacity-50 rounded-full flex items-center justify-center transition-colors"
                    data-testid="send-button"
                  >
                    <i className="fas fa-paper-plane text-black text-xs"></i>
                  </button>
                </div>
              ) : (
                <div className="text-xs text-gray-300">Generate a quiz above and select answers. Click "Check answers" to see results.</div>
              )}
              
              {/* Voice Recording Indicator */}
              {mode === 'assistant' && isListening && (
                <div className="mt-2 flex items-center justify-center space-x-2 text-saffron-400">
                  <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                  <span className="text-xs">Listening...</span>
                </div>
              )}
            </div>
          </div>


          {isLoading && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20">
              <div className="flex items-center gap-2 text-white text-sm">
                <div className="w-3 h-3 bg-saffron-400 rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-saffron-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-3 h-3 bg-saffron-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <span>{mode === 'assistant' ? 'Thinking...' : 'Generating quiz...'}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
