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
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      
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

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize with greeting (assistant mode only)
  useEffect(() => {
    if (mode !== 'assistant') return;
    stopSpeaking();
    setMessages([{
      text: greetings[currentLanguage],
      sender: 'bot',
      timestamp: new Date()
    }]);
    // Speak greeting
    speakText(greetings[currentLanguage], currentLanguage);
  }, [currentLanguage, mode]);

  const speakText = (text: string, language: Language) => {
    if ('speechSynthesis' in window) {
      // interrupt any ongoing/queued speech
      stopSpeaking();
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure voice based on language
      const voices = speechSynthesis.getVoices();
      let selectedVoice = null;
      
      if (language === 'hindi' || language === 'marathi') {
        // Priority 1: Look for Hindi female voice
        selectedVoice = voices.find(voice => 
          (voice.name.includes('Hindi') || voice.lang.includes('hi')) &&
          (voice.name.includes('Female') || voice.name.includes('Girl') || voice.name.includes('Woman'))
        );
        
        // Priority 2: Look for any Hindi voice
        if (!selectedVoice) {
          selectedVoice = voices.find(voice => 
            voice.name.includes('Hindi') || voice.lang.includes('hi')
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
        
        // Priority 5: Look for any female voice with Hindi language code
        if (!selectedVoice) {
          selectedVoice = voices.find(voice => 
            voice.lang.includes('hi') && 
            (voice.name.includes('Female') || voice.name.includes('Girl') || voice.name.includes('Woman'))
          );
        }
        
        // Priority 6: Fallback to any Hindi language voice
        if (!selectedVoice) {
          selectedVoice = voices.find(voice => voice.lang.includes('hi'));
        }
        
        // Priority 7: Fallback to any female voice
        if (!selectedVoice) {
          selectedVoice = voices.find(voice => 
            voice.name.includes('Female') || voice.name.includes('Girl') || voice.name.includes('Woman')
          );
        }
      } else {
        // English voice selection
        selectedVoice = voices.find(voice => 
          voice.name.includes('Female') && 
          (voice.name.includes('Google') || voice.name.includes('UK'))
        );
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log('Selected voice:', selectedVoice.name, 'for language:', language);
      } else {
        console.log('No suitable voice found for language:', language);
      }
      
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      utterance.onend = () => { utteranceRef.current = null; };
      utterance.onerror = () => { utteranceRef.current = null; };
      utteranceRef.current = utterance;
      speechSynthesis.speak(utterance);
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
        <i className="fas fa-comments text-white text-xl"></i>
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-forest-400 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">AI</span>
        </div>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div ref={chatWindowRef} className="absolute bottom-20 right-0 w-[90vw] sm:w-[28rem] h-[70vh] sm:h-[34rem] bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden chat-content">
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-saffron-400 to-saffron-500 p-4 flex items-center justify-between text-white">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
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
                className="bg-white/20 rounded-lg px-2 py-1 text-xs border-none outline-none cursor-pointer text-white"
                style={{ color: 'white' }}
              >
                <option value="assistant" style={{ color: 'black' }}>🤖 Assistant</option>
                <option value="quiz" style={{ color: 'black' }}>📝 Quiz</option>
              </select>
              <select 
                value={currentLanguage}
                onChange={(e) => handleLanguageChange(e.target.value as Language)}
                className="bg-white/20 rounded-lg px-2 py-1 text-xs border-none outline-none cursor-pointer text-white"
                style={{
                  color: 'white'
                }}
                data-testid="language-selector"
              >
                <option value="english" style={{color: 'black'}}>🇬🇧 EN</option>
                <option value="hindi" style={{color: 'black'}}>🇮🇳 HI</option>
                <option value="marathi" style={{color: 'black'}}>🟠 MR</option>
              </select>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
                data-testid="close-chat"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[52vh] sm:max-h-[24rem] bg-gradient-to-b from-cream-50 to-white">
            {mode === 'assistant' ? (
              <>
                {messages.map((message, index) => (
                  <div key={index} className={`flex ${message.sender === 'user' ? 'justify-end' : 'items-start space-x-2'}`}>
                    {message.sender === 'bot' && (
                      <div className="w-8 h-8 bg-saffron-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <i className="fas fa-robot text-saffron-500 text-xs"></i>
                      </div>
                    )}
                    <div className={`rounded-xl p-3 max-w-64 ${
                      message.sender === 'bot' 
                        ? 'bg-white shadow-sm border border-cream-200' 
                        : 'bg-saffron-400 text-white'
                    }`}>
                      <p className="text-sm">{message.text}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-start space-x-2">
                    <div className="w-8 h-8 bg-saffron-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-robot text-saffron-500 text-xs"></i>
                    </div>
                    <div className="bg-white rounded-xl p-3 shadow-sm border border-cream-200">
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
                  <select value={quizLang} onChange={(e)=> setQuizLang(e.target.value as Language)} className="border rounded px-2 py-1 text-sm">
                    <option value="english">English</option>
                    <option value="hindi">हिंदी</option>
                    <option value="marathi">मराठी</option>
                  </select>
                  <select value={quizDifficulty} onChange={(e)=> setQuizDifficulty(e.target.value as any)} className="border rounded px-2 py-1 text-sm">
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                  <input value={quizTopic} onChange={(e)=> setQuizTopic(e.target.value)} placeholder="What type question you want to practise?" className="flex-1 border rounded px-2 py-1 text-sm" />
                  <button onClick={async ()=> { await generateQuiz(); }} className="px-3 py-1 rounded bg-saffron-400 text-white text-xs hover:bg-saffron-500">Generate</button>
                </div>

                {/* Quiz Body */}
                {quiz?.questions?.map((q, idx) => (
                  <div key={idx} className="border rounded-lg p-3 bg-white">
                    <div className="font-medium text-sm mb-2">{idx+1}. {q.q}</div>
                    <div className="grid gap-2">
                      {q.options.map((opt, oi) => (
                        <label key={oi} className={`flex items-center gap-2 text-sm border rounded px-2 py-1 cursor-pointer ${selectedAnswers[idx] === oi ? 'bg-saffron-50 border-saffron-300' : 'border-cream-200'}`}>
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
                        <div className={selectedAnswers[idx] === q.answerIndex ? 'text-green-600' : 'text-red-600'}>
                          {selectedAnswers[idx] === q.answerIndex ? 'Correct' : 'Incorrect'}
                        </div>
                        <div className="text-forest-700 mt-1">{q.explanation}</div>
                      </div>
                    )}
                  </div>
                ))}

                {quiz && (
                  <div className="flex gap-2">
                    <button onClick={()=> setShowResults(true)} className="px-3 py-1 rounded bg-forest-500 text-white text-xs hover:bg-forest-600">Check answers</button>
                    <button onClick={()=> { setQuiz(null); setSelectedAnswers([]); setShowResults(false); }} className="px-3 py-1 rounded bg-gray-200 text-xs">Clear</button>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer */}
          <div className="p-4 bg-white border-t border-cream-200">
            {mode === 'assistant' ? (
              <div className="flex items-center space-x-2">
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type your question..." 
                    className="w-full px-4 py-2 rounded-xl border border-cream-300 focus:outline-none focus:ring-2 focus:ring-saffron-400 focus:border-transparent text-sm"
                    data-testid="chat-input"
                  />
                  <button 
                    onClick={startVoiceRecording}
                    className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-6 h-6 flex items-center justify-center hover:bg-cream-100 rounded-full transition-colors ${isListening ? 'text-red-500' : 'text-saffron-500'}`}
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
                  <i className="fas fa-paper-plane text-white text-xs"></i>
                </button>
              </div>
            ) : (
              <div className="text-xs text-forest-700">Generate a quiz above and select answers. Click "Check answers" to see results.</div>
            )}
            
            {/* Voice Recording Indicator */}
            {mode === 'assistant' && isListening && (
              <div className="mt-2 flex items-center justify-center space-x-2 text-saffron-500">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-xs">Listening...</span>
              </div>
            )}
          </div>
          {isLoading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-20">
              <div className="flex items-center gap-2 text-forest-700 text-sm">
                <div className="w-3 h-3 bg-saffron-500 rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-saffron-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-3 h-3 bg-saffron-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <span>{mode === 'assistant' ? 'Thinking...' : 'Generating quiz...'}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
