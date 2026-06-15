import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LOADING_MESSAGES = [
  "INITIALIZING SECURE CONNECTION...",
  "AUTHENTICATING CREDENTIALS...",
  "LOADING CAPFINLOAN ENGINE...",
  "VERIFYING DATA INTEGRITY...",
  "PREPARING DASHBOARD..."
];

export function GlobalLoader({ fullScreen = false }: { fullScreen?: boolean }) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  const containerClasses = fullScreen 
    ? "fixed inset-0 z-[9999] flex items-center justify-center bg-surface mesh-gradient-bg"
    : "w-full py-24 flex items-center justify-center";

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center gap-8">
        {/* Animated geometric loader */}
        <div className="relative w-20 h-20 flex items-center justify-center">
          {/* Outer rotating ring */}
          <motion.div 
            className="absolute inset-0 border-2 border-dashed border-primary/30 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
          {/* Middle pulse ring */}
          <motion.div 
            className="absolute inset-2 border-2 border-primary/50 rounded-full"
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Inner fast spinner */}
          <motion.div 
            className="absolute inset-4 border-t-2 border-l-2 border-secondary rounded-full"
            animate={{ rotate: -360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
          {/* Glowing core */}
          <div className="absolute w-3 h-3 bg-primary rounded-full shadow-[0_0_15px_rgba(76,215,246,1)] animate-pulse" />
        </div>

        {/* Text */}
        <div className="h-6 overflow-hidden relative w-72 flex justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={messageIndex}
              initial={{ y: 20, opacity: 0, filter: "blur(4px)" }}
              animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
              exit={{ y: -20, opacity: 0, filter: "blur(4px)" }}
              transition={{ duration: 0.3 }}
              className="text-xs font-mono tracking-[0.2em] text-primary whitespace-nowrap text-center"
            >
              {LOADING_MESSAGES[messageIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
