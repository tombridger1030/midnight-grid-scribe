/**
 * StatLine Component
 * 
 * Single line showing Level, Streak, and XP gained.
 * Centered, clean, minimal.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Flame, Sparkles } from 'lucide-react';

interface StatLineProps {
  level: number;
  streak: number;
  xpGainedThisWeek: number;
  onClick?: () => void;
  className?: string;
}

export const StatLine: React.FC<StatLineProps> = ({
  level,
  streak,
  xpGainedThisWeek,
  onClick,
  className,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-6 py-3",
        "text-terminal-accent/80 cursor-pointer",
        "hover:text-terminal-accent transition-colors",
        className
      )}
    >
      {/* Level */}
      <div className="flex items-center gap-1.5">
        <span className="text-sm text-terminal-accent/60">Lv.</span>
        <span className="text-lg font-bold font-mono">{level}</span>
      </div>

      <span className="text-terminal-accent/30">|</span>

      {/* Streak */}
      <div className="flex items-center gap-1.5">
        <Flame size={18} className={cn(
          streak > 0 ? "text-orange-400" : "text-terminal-accent/40"
        )} />
        <span className="text-lg font-bold font-mono">{streak}</span>
        <span className="text-sm text-terminal-accent/60">weeks</span>
      </div>

      <span className="text-terminal-accent/30">|</span>

      {/* XP Gained */}
      <div className="flex items-center gap-1.5">
        <Sparkles size={16} className="text-[#5FE3B3]" />
        <span className="text-lg font-bold font-mono text-[#5FE3B3]">
          +{xpGainedThisWeek}
        </span>
        <span className="text-sm text-terminal-accent/60">XP</span>
      </div>
    </motion.div>
  );
};

export default StatLine;
