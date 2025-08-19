import { useState } from "react";
import ChatbotWidget from "../components/chatbot-widget";

export default function Home() {
  return (
    <div className="bg-gradient-to-br from-black via-gray-900 to-black min-h-screen font-inter">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-10 pointer-events-none">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `url('data:image/svg+xml,<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="%23FFD700" stroke-width="0.5"/></pattern></defs><rect width="100%" height="100%" fill="url(%23grid)" /></svg>')`
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-saffron-400 to-saffron-500 rounded-lg flex items-center justify-center shadow-2xl">
              <i className="fas fa-graduation-cap text-black text-lg"></i>
            </div>
            <div className="text-white font-poppins font-semibold text-xl">Marathi Vidyalaya</div>
          </div>
          <div className="hidden md:flex items-center space-x-6">
            <a href="#" className="text-gray-300 hover:text-saffron-400 transition-colors duration-200 font-medium">About</a>
            <a href="#" className="text-gray-300 hover:text-saffron-400 transition-colors duration-200 font-medium">Courses</a>
            <a href="#" className="text-gray-300 hover:text-saffron-400 transition-colors duration-200 font-medium">Contact</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Hero Content */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-black/40 backdrop-blur-sm rounded-full border border-saffron-400 mb-6 shadow-2xl">
              <i className="fas fa-sparkles text-saffron-400 mr-2"></i>
              <span className="text-white font-medium text-sm">AI-Powered Learning</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-poppins font-bold text-white mb-6 leading-tight">
              Marathi Vidyalaya
              <span className="block text-saffron-400 text-4xl md:text-5xl mt-2">Smart AI Tutor</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Ask your doubts in <span className="font-semibold text-saffron-400">English</span>, 
              <span className="font-semibold text-forest-400"> Hindi</span>, or 
              <span className="font-semibold text-saffron-400"> Marathi</span>
            </p>

            {/* Language Examples */}
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
              <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-saffron-400/30 hover:border-saffron-400 hover:shadow-saffron-400/20 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center mb-4 mx-auto shadow-lg">
                  <span className="text-2xl">🇬🇧</span>
                </div>
                <h3 className="font-poppins font-semibold text-white mb-2">English</h3>
                <p className="text-sm text-gray-300">"What is photosynthesis?"</p>
              </div>
              <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-saffron-400/30 hover:border-saffron-400 hover:shadow-saffron-400/20 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center mb-4 mx-auto shadow-lg">
                  <span className="text-2xl">🇮🇳</span>
                </div>
                <h3 className="font-poppins font-semibold text-white mb-2">हिंदी</h3>
                <p className="text-sm text-gray-300">"प्रकाश संश्लेषण क्या है?"</p>
              </div>
              <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-saffron-400/30 hover:border-saffron-400 hover:shadow-saffron-400/20 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-saffron-400 to-saffron-600 rounded-xl flex items-center justify-center mb-4 mx-auto shadow-lg">
                  <span className="text-2xl">🟠</span>
                </div>
                <h3 className="font-poppins font-semibold text-white mb-2">मराठी</h3>
                <p className="text-sm text-gray-300">"प्रकाशसंश्लेषण म्हणजे काय?"</p>
              </div>
            </div>

            {/* CTA Section */}
            <div className="text-center">
              <p className="text-gray-300 mb-4">Click the chat widget to start learning!</p>
              <div className="flex items-center justify-center">
                <i className="fas fa-arrow-down text-saffron-400 text-2xl animate-bounce"></i>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-saffron-400 to-saffron-500 rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-2xl group-hover:scale-110 transition-transform duration-300">
                <i className="fas fa-microphone text-black text-xl"></i>
              </div>
              <h3 className="font-poppins font-semibold text-white text-lg mb-2">Voice Input</h3>
              <p className="text-gray-300 text-sm">Speak naturally in any language</p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-forest-400 to-forest-500 rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-2xl group-hover:scale-110 transition-transform duration-300">
                <i className="fas fa-brain text-black text-xl"></i>
              </div>
              <h3 className="font-poppins font-semibold text-white text-lg mb-2">AI Tutor</h3>
              <p className="text-gray-300 text-sm">Intelligent responses for all subjects</p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-500 rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-2xl group-hover:scale-110 transition-transform duration-300">
                <i className="fas fa-language text-black text-xl"></i>
              </div>
              <h3 className="font-poppins font-semibold text-white text-lg mb-2">Multi-Language</h3>
              <p className="text-gray-300 text-sm">Support for 3 languages</p>
            </div>
          </div>
        </div>
      </section>

      {/* Subject Areas */}
      <section className="relative z-10 py-20 px-6 bg-black/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-poppins font-semibold text-white text-center mb-12">
            Subjects We Cover
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 shadow-2xl border border-saffron-400/30 hover:border-saffron-400 hover:shadow-saffron-400/20 transition-all duration-300 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-lg flex items-center justify-center mx-auto mb-3 shadow-lg">
                <i className="fas fa-calculator text-white"></i>
              </div>
              <h3 className="font-poppins font-medium text-white">Mathematics</h3>
            </div>
            <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 shadow-2xl border border-saffron-400/30 hover:border-saffron-400 hover:shadow-saffron-400/20 transition-all duration-300 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center mx-auto mb-3 shadow-lg">
                <i className="fas fa-flask text-white"></i>
              </div>
              <h3 className="font-poppins font-medium text-white">Science</h3>
            </div>
            <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 shadow-2xl border border-saffron-400/30 hover:border-saffron-400 hover:shadow-saffron-400/20 transition-all duration-300 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-3 shadow-lg">
                <i className="fas fa-book text-white"></i>
              </div>
              <h3 className="font-poppins font-medium text-white">Literature</h3>
            </div>
            <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 shadow-2xl border border-saffron-400/30 hover:border-saffron-400 hover:shadow-saffron-400/20 transition-all duration-300 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center mx-auto mb-3 shadow-lg">
                <i className="fas fa-globe text-white"></i>
              </div>
              <h3 className="font-poppins font-medium text-white">Geography</h3>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-6 bg-black/80 backdrop-blur-sm border-t border-saffron-400/30">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-300 font-inter">Built with AI ❤️ for Marathi Students</p>
        </div>
      </footer>

      {/* Chatbot Widget */}
      <ChatbotWidget />
    </div>
  );
}
