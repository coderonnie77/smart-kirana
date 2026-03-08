import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';

const QA_PAIRS = [
  {
    keywords: ['delivery', 'charge', 'fees', 'fee', 'cost', 'shipping'],
    answer: "We offer completely free hyperlocal delivery! No hidden charges or extra fees."
  },
  {
    keywords: ['return', 'refund', 'cancel', 'back'],
    answer: "You can request a return or refund within 24 hours of delivery if the items are damaged or incorrect."
  },
  {
    keywords: ['retailer', 'wholesaler', 'join', 'register', 'become'],
    answer: "To become a Retailer or Wholesaler, just log out and click on 'Register'. During registration, you can choose your account role."
  },
  {
    keywords: ['mic', 'voice', 'speak', 'audio', 'hindi'],
    answer: "Yes! You can use our Voice feature to search for products or update your inventory in both English and Hindi. Just click the Mic button."
  },
  {
    keywords: ['stock', 'inventory', 'add product'],
    answer: "If you are a retailer or wholesaler, you can manage your stock by going to the 'Inventory' section from your Dashboard menu."
  },
  {
    keywords: ['bulk', 'b2b', 'wholesale', 'large'],
    answer: "Yes, Retailers can buy in bulk from Wholesalers using the 'Quick Reorder' feature or by visiting the Wholesale Marketplace."
  },
  {
    keywords: ['hello', 'hi', 'hey', 'start'],
    answer: "Hello! I am the Smart Kirana Assistant. How can I help you regarding our site today?"
  },
  {
    keywords: ['site', 'about', 'platform', 'what is'],
    answer: "Smart Kirana is a revolutionary platform connecting Customers, Retailers, and Wholesalers using advanced AI and voice commands for hyper-local delivery."
  }
];

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Hi! I am your Smart Kirana AI Support. Feel free to ask me anything about the platform!", sender: 'bot' }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { text: userMessage, sender: 'user' }]);
    setInput('');

    // Simulate AI thinking
    setTimeout(() => {
      let botResponse = "I'm sorry, I didn't quite catch that. Could you ask about delivery, orders, features, or becoming a seller?";
      const lowerInput = userMessage.toLowerCase();

      for (let qa of QA_PAIRS) {
        if (qa.keywords.some(kw => lowerInput.includes(kw))) {
          botResponse = qa.answer;
          break;
        }
      }

      setMessages(prev => [...prev, { text: botResponse, sender: 'bot' }]);
    }, 600);
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
              <div className={`p-3 rounded-2xl text-sm ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-100 shadow-sm rounded-tl-none font-medium'}`}>
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
