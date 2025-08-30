import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveStats {
  activeMembers: number;
  liveEvents: number;
}

const EVENT_COLORS = [
  { type: 'AI', color: '#3B82F6' },
  { type: 'Crypto', color: '#F59E0B' },
  { type: 'Biotech', color: '#10B981' },
  { type: 'Robotics', color: '#EF4444' },
  { type: 'DeSci', color: '#8B5CF6' }
];

export default function HeaderUI() {
  const [liveStats, setLiveStats] = useState<LiveStats>({ activeMembers: 247, liveEvents: 15 });
  const [pulseAnimation, setPulseAnimation] = useState(true);

  useEffect(() => {
    // Simulate live data updates with mock data
    const interval = setInterval(() => {
      setLiveStats(prev => ({
        activeMembers: prev.activeMembers + Math.floor(Math.random() * 5) - 2,
        liveEvents: Math.max(10, Math.min(20, prev.liveEvents + Math.floor(Math.random() * 3) - 1))
      }));
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-4 left-4 right-4 z-50 pointer-events-none"
    >
      <div className="flex items-start justify-between">
        <div className="bg-black/80 backdrop-blur-md rounded-lg px-6 py-3 border border-white/10">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <motion.div
                  animate={{
                    scale: pulseAnimation ? [1, 1.3, 1] : 1,
                    opacity: pulseAnimation ? [1, 0.5, 1] : 1
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 bg-red-500 rounded-full blur-md"
                />
                <div className="relative w-3 h-3 bg-red-500 rounded-full" />
              </div>
              <span className="text-white font-bold text-sm tracking-wider">
                FRONTIER TOWER - LIVE DIGITAL TWIN
              </span>
            </div>

            <div className="h-6 w-px bg-white/20" />

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-white/60">Active Members:</span>
                <motion.span
                  key={liveStats.activeMembers}
                  initial={{ scale: 1.2, color: '#3B82F6' }}
                  animate={{ scale: 1, color: '#FFFFFF' }}
                  className="font-mono font-bold"
                >
                  {liveStats.activeMembers}
                </motion.span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/60">Live Events:</span>
                <motion.span
                  key={liveStats.liveEvents}
                  initial={{ scale: 1.2, color: '#F59E0B' }}
                  animate={{ scale: 1, color: '#FFFFFF' }}
                  className="font-mono font-bold"
                >
                  {liveStats.liveEvents}
                </motion.span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-black/80 backdrop-blur-md rounded-lg px-4 py-3 border border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-white/60 text-xs uppercase tracking-wider">Event Types</span>
            {EVENT_COLORS.map((event) => (
              <div key={event.type} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: event.color }}
                />
                <span className="text-white/80 text-xs">{event.type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}