import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const INSIGHTS = [
  "Right now, the highest energy is on Floor 16, centered on the AI Workshop.",
  "A new DeSci meetup is gaining momentum on Floor 9.",
  "Cross-collaboration is happening between AI and Biotech groups.",
  "Floor 12's Robotics Lab is experiencing peak activity with 85 participants.",
  "The Crypto Trading floor shows unusual late-night activity patterns.",
  "AI Safety Summit on Floor 16 is the largest event right now.",
  "Real-time data shows 247 active members across 15 innovation spaces.",
  "Breakthrough moment: Three floors are collaborating on quantum computing."
];

export default function LivingTitle() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % INSIGHTS.length);
        setIsVisible(true);
      }, 500);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-8 left-8 z-40 max-w-lg">
      <div className="bg-black/80 backdrop-blur-md rounded-lg px-6 py-4 border border-white/10">
        <div className="flex items-start gap-3">
          <div className="mt-1">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-2 h-2 bg-blue-500 rounded-full"
            />
          </div>
          
          <div className="flex-1">
            <AnimatePresence mode="wait">
              {isVisible && (
                <motion.p
                  key={currentIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5 }}
                  className="text-white text-sm leading-relaxed"
                >
                  {INSIGHTS[currentIndex]}
                </motion.p>
              )}
            </AnimatePresence>
            
            <div className="mt-2 flex gap-1">
              {INSIGHTS.map((_, index) => (
                <div
                  key={index}
                  className={`h-0.5 transition-all duration-300 ${
                    index === currentIndex
                      ? 'w-4 bg-blue-500'
                      : 'w-1 bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}