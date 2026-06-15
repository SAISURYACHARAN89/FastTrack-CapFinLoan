import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import api from '../lib/axios';
import { useAuth } from '../context/AuthContext';

interface Message {
  id: number;
  role: 'user' | 'bot';
  text: string;
}

const WELCOME_MESSAGE: Message = {
  id: 0,
  role: 'bot',
  text: "Hi! I'm the CapFinLoan Assistant. Ask me about your loan applications, required documents, the process, or anything about the platform — I'm here to help! 🤝",
};

const QUICK_PROMPTS = [
  'What is my application status?',
  'What documents do I need?',
  'How long does review take?',
];

export function ChatBot() {
  const { user } = useAuth();
  if (!user || user.role === 'ADMIN') return null;
  return <ChatBotInner />;
}

function ChatBotInner() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [nextId, setNextId] = useState(1);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = { id: nextId, role: 'user', text: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setNextId(id => id + 1);
    setInputValue('');
    setIsLoading(true);

    try {
      const res = await api.post<{ reply: string }>('/chat/message', { message: trimmed });
      const botMsg: Message = { id: nextId + 1, role: 'bot', text: res.data.reply };
      setMessages(prev => [...prev, botMsg]);
      setNextId(id => id + 2);
    } catch {
      const errMsg: Message = {
        id: nextId + 1,
        role: 'bot',
        text: 'The AI assistant is temporarily unavailable. Please ensure Ollama is running locally and try again.',
      };
      setMessages(prev => [...prev, errMsg]);
      setNextId(id => id + 2);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice input is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true; // Keep listening even if user pauses
      recognition.interimResults = true; // Show results while speaking
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setInputValue(prev => prev + (prev ? ' ' : '') + finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          // If no speech is detected, we can just keep listening or stop gracefully
          return;
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <motion.button
        id="chatbot-trigger"
        onClick={() => setIsOpen(prev => !prev)}
        className="fixed bottom-6 right-6 z-[9998] w-14 h-14 rounded-full flex items-center justify-center shadow-2xl overflow-hidden"
        style={{
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
        }}
        whileHover={{ scale: 1.05, borderColor: 'rgba(59, 130, 246, 0.5)' }}
        whileTap={{ scale: 0.95 }}
        animate={!isOpen ? {
          boxShadow: ['0 0 0 0 rgba(59, 130, 246, 0.4)', '0 0 0 12px rgba(59, 130, 246, 0)', '0 0 0 0 rgba(59, 130, 246, 0)'],
        } : {}}
        transition={!isOpen ? { repeat: Infinity, duration: 3, ease: 'easeOut' } : {}}
        aria-label="Open AI Assistant"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.span
              key="close"
              className="material-symbols-outlined text-blue-400 text-xl"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              close
            </motion.span>
          ) : (
            <motion.div
              key="orb"
              className="relative w-7 h-7 flex items-center justify-center"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
            >
              {/* Outer Glow */}
              <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-md animate-pulse" />
              
              {/* Spinning Orb Core */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'radial-gradient(circle at 35% 35%, #93c5fd 0%, #3b82f6 50%, #1d4ed8 100%)',
                  boxShadow: 'inset -2px -2px 4px rgba(0,0,0,0.4)',
                }}
                animate={{ 
                  rotate: 360,
                  boxShadow: [
                    'inset -2px -2px 4px rgba(0,0,0,0.4)',
                    'inset -3px -3px 6px rgba(0,0,0,0.5)',
                    'inset -2px -2px 4px rgba(0,0,0,0.4)'
                  ]
                }}
                transition={{ 
                  rotate: { repeat: Infinity, duration: 6, ease: "linear" },
                  boxShadow: { repeat: Infinity, duration: 3, ease: "easeInOut" }
                }}
              />
              
              {/* Surface Glint */}
              <div className="absolute top-1 left-1.5 w-1.5 h-1.5 bg-white/60 rounded-full blur-[0.5px]" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="chatbot-window"
            className="fixed bottom-24 right-6 z-[9997] w-[360px] max-h-[560px] flex flex-col rounded-3xl overflow-hidden"
            style={{
              background: 'rgba(18, 18, 28, 0.92)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.04) inset',
            }}
            initial={{ opacity: 0, y: 20, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white leading-none">AI Assistant</p>
                <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-widest font-black">Online & Ready</p>
              </div>
              <button
                onClick={() => setMessages([WELCOME_MESSAGE])}
                className="text-slate-500 hover:text-blue-400 transition-colors p-1"
                title="Clear chat"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
              </button>
            </div>

            {/* Quick Actions Navigation Bar */}
            <div className="px-3 py-2 bg-white/5 flex gap-2 overflow-x-auto no-scrollbar border-b border-white/5">
              {[
                { label: 'Applications', path: '/applications', icon: 'list_alt' },
                { label: 'Profile', path: '/profile', icon: 'person' },
                { label: 'New Loan', path: '/applications/new', icon: 'add_circle' },
                { label: 'Docs', path: '/documents', icon: 'description' },
              ].map(action => (
                <Link
                  key={action.path}
                  to={action.path}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/5 text-[10px] text-slate-300 hover:bg-blue-500/20 hover:text-white hover:border-blue-500/30 transition-all whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-[12px]">{action.icon}</span>
                  {action.label}
                </Link>
              ))}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0 custom-scrollbar">
              {messages.map(msg => (
                <motion.div
                  key={msg.id}
                  className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {msg.role === 'bot' && (
                    <div className="w-1 flex-shrink-0" />
                  )}
                  <div
                    className={`group relative max-w-[80%] px-3 py-2 rounded-2xl text-[12.5px] leading-relaxed ${
                      msg.role === 'user'
                        ? 'rounded-tr-sm text-white'
                        : 'rounded-tl-sm text-slate-200'
                    }`}
                    style={
                      msg.role === 'user'
                        ? { background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }
                        : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.07)' }
                    }
                  >
                    {msg.role === 'bot' ? (
                      <ReactMarkdown
                        components={{
                          a: ({ href, children }) => {
                            let targetHref = href || '#';
                            const isInternal = targetHref.startsWith('/');
                            
                            // Role-based route rewriting for applications
                            if (isInternal && user?.role === 'ADMIN' && targetHref.startsWith('/applications/')) {
                              targetHref = targetHref.replace('/applications/', '/admin/applications/');
                            }

                            if (isInternal) {
                              return (
                                <Link to={targetHref} className="text-blue-400 hover:underline font-bold">
                                  {children}
                                </Link>
                              );
                            }
                            return (
                              <a href={targetHref} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-bold">
                                {children}
                              </a>
                            );
                          },
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                          li: ({ children }) => <li className="mb-1">{children}</li>,
                          code: ({ children }) => <code className="bg-white/10 px-1 rounded text-xs font-mono">{children}</code>,
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    ) : (
                      msg.text
                    )}

                    {msg.role === 'bot' && (
                      <div className="flex flex-col gap-2 mt-3">
                        {/* Smart Action Buttons - Extracted from ALL links in the response */}
                        {(() => {
                          // Regex to find markdown links: [Label](URL)
                          const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
                          const idRegex = /(?:Application ID #|App #|ID #)(\d+)/gi;
                          
                          const actions: { label: string, href: string }[] = [];
                          let match;
                          
                          // 1. Extract from markdown links
                          while ((match = linkRegex.exec(msg.text)) !== null) {
                            const [_, label, href] = match;
                            actions.push({ label, href });
                          }

                          // 2. Extract from plain text ID patterns (if not already found in markdown)
                          const idMatches = [...msg.text.matchAll(idRegex)];
                          for (const m of idMatches) {
                            const appId = m[1];
                            const path = `/applications/${appId}`;
                            // Only add if this application path isn't already in actions
                            if (!actions.some(a => a.href.includes(`/applications/${appId}`))) {
                              actions.push({ label: `View Application #${appId}`, href: path });
                            }
                          }

                          if (actions.length === 0) return null;

                          return (
                            <div className="flex flex-wrap gap-2 pt-1 mt-1 border-t border-white/5">
                              {actions.map((action, idx) => {
                                let targetHref = action.href;
                                // Role-based route rewriting
                                if (targetHref.includes('/applications/') && !targetHref.includes('/new') && user?.role === 'ADMIN') {
                                  targetHref = targetHref.replace('/applications/', '/admin/applications/');
                                }

                                return (
                                  <Link
                                    key={idx}
                                    to={targetHref}
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600/20 border border-blue-500/40 text-[11px] text-blue-400 font-bold hover:bg-blue-600 hover:text-white transition-all shadow-lg shadow-blue-900/20 group/btn animate-in fade-in slide-in-from-bottom-2 duration-500"
                                  >
                                    <span className="material-symbols-outlined text-[14px] group-hover/btn:translate-x-0.5 transition-transform">
                                      {targetHref.includes('application') ? 'payments' : 'launch'}
                                    </span>
                                    {action.label}
                                  </Link>
                                );
                              })}
                            </div>
                          );
                        })()}
                        
                        <button
                          onClick={() => navigator.clipboard.writeText(msg.text)}
                          className="absolute -right-8 top-1 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-blue-400"
                          title="Copy message"
                        >
                          <span className="material-symbols-outlined text-[14px]">content_copy</span>
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <motion.div
                  className="flex gap-2 flex-row"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="w-1 flex-shrink-0" />
                  <div
                    className="px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1.5 items-center"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-blue-400"
                        animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                        transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts — only shown when chat is fresh */}
            {messages.length <= 1 && !isLoading && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map(prompt => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="text-[10px] px-2.5 py-1.5 rounded-full border border-blue-500/30 text-blue-300 hover:bg-blue-500/10 hover:border-blue-400/50 transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-3 pb-3 pt-2 border-t border-white/5">
              <div
                className="flex items-center gap-2 rounded-2xl px-3 py-2"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <button
                  onClick={toggleListening}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'text-slate-500 hover:text-blue-400'}`}
                  title={isListening ? 'Stop Listening' : 'Voice Input'}
                >
                  <span className="material-symbols-outlined text-[20px]">{isListening ? 'mic' : 'mic_none'}</span>
                </button>
                <input
                  ref={inputRef}
                  id="chatbot-input"
                  type="text"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isListening ? "Listening..." : "Ask anything about your loan..."}
                  disabled={isLoading}
                  className="flex-1 bg-transparent text-[12.5px] text-white placeholder:text-slate-600 outline-none disabled:opacity-50"
                />
                <button
                  id="chatbot-send"
                  onClick={() => sendMessage(inputValue)}
                  disabled={isLoading || !inputValue.trim()}
                  className="w-7 h-7 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}
                >
                  <span className="material-symbols-outlined text-white" style={{ fontSize: '14px' }}>send</span>
                </button>
              </div>
              <p className="text-center text-[9px] text-slate-700 mt-1.5">AI may make mistakes · Verify important info</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
