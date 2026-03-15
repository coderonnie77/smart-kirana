import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Mic } from 'lucide-react';
import { fetchFinancials, fetchVelocityReport } from '../api';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Hi! I am your Smart Kirana AI Support. Feel free to ask me anything about the platform!", sender: 'bot' }
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [contextData, setContextData] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && !contextData) {
      Promise.all([
        fetchFinancials().then(r => r.data).catch(() => null),
        fetchVelocityReport().then(r => r.data).catch(() => null)
      ]).then(([financials, velocity]) => {
        setContextData({ financials, velocity });
      });
    }
  }, [isOpen]);

  const speak = (text) => {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hi-IN'; // Speak in Hindi natively
    synth.speak(utterance);
  };

  const handleMic = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Browser does not support voice input");
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.start();
    setIsListening(true);
    
    recognition.onresult = (e) => setInput(e.results[0][0].transcript);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { text: userMessage, sender: 'user' }]);
    setInput('');

    setMessages(prev => [...prev, { text: "...", sender: 'bot', isTyping: true }]);

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyCCzQjlOBkNnFkAPBBTz9ZQQ37-M3r4bII`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are the friendly Smart Kirana AI Support assistant. Make your answers extremely concise (max 2 sentences), helpful, use a friendly tone, and format in plain text. Reply primarily in Hindi so local retailers can understand easily. Smart Kirana is a platform connecting Customers, Retailers, and Wholesalers using AI and voice commands for hyper-local grocery delivery. The user asks: ${userMessage}. Here is some context about the user's business if asked: ${contextData ? JSON.stringify(contextData) : 'Not available'}. Give suggestions regarding business based on this context if requested.`
            }]
          }]
        })
      });

      const data = await response.json();
      let botResponse = "I'm sorry, I encountered an error. Please try again.";
      if (data.candidates && data.candidates[0].content.parts[0].text) {
        botResponse = data.candidates[0].content.parts[0].text;
      }

      setMessages(prev => {
        const withoutTyping = prev.filter(m => !m.isTyping);
        return [...withoutTyping, { text: botResponse, sender: 'bot' }];
      });
      speak(botResponse);
    } catch (err) {
      setMessages(prev => {
        const withoutTyping = prev.filter(m => !m.isTyping);
        return [...withoutTyping, { text: "I am having trouble connecting to AI services right now.", sender: 'bot' }];
      });
      speak("I am having trouble connecting to AI services right now.");
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-8 right-8 p-4 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-700 hover:scale-110 transition-all z-50 flex items-center justify-center ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100 duration-500'}`}
      >
        <MessageSquare size={28} />
      </button>

      {/* Chat Window */}
      <div 
        className={`fixed bottom-6 right-6 w-80 sm:w-96 bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-100 z-50 flex flex-col overflow-hidden transition-all duration-500 origin-bottom-right ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-full">
              <Bot size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm">Smart Kirana Support</h3>
              <p className="text-[10px] text-blue-100 font-medium tracking-widest uppercase">Answers queries instantly</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="h-80 overflow-y-auto p-4 bg-slate-50 flex flex-col gap-4 custom-scrollbar">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-2 max-w-[85%] ${msg.sender === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.sender === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-600'}`}>
                {msg.sender === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div className={`p-3 rounded-2xl text-sm ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-100 shadow-sm rounded-tl-none font-medium'} ${msg.isTyping ? 'animate-pulse text-2xl px-5 flex items-center justify-center tracking-widest' : ''}`}>
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 flex gap-2 items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about delivery, orders..."
            className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
          <button 
            type="button" 
            onClick={handleMic}
            className={`p-3 rounded-xl transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <Mic size={18} />
          </button>
          <button 
            type="submit" 
            disabled={!input.trim()}
            className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </>
  );
};

export default Chatbot;
