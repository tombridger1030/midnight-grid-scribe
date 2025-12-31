/**
 * AchievementToast Component
 * 
 * Shows notification when achievement is unlocked.
 * Auto-dismisses after 5 seconds.
 */

import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAchievementToasts } from '@/hooks/useProgression';
import { Trophy, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const AchievementToast: React.FC = () => {
  const { toasts, dismiss } = useAchievementToasts();

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (toasts.length === 0) return;

    const timer = setTimeout(() => {
      if (toasts.length > 0) {
        dismiss(toasts[0].id);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [toasts, dismiss]);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {toasts.map((achievement) => (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={cn(
              "flex items-center gap-3 p-4 rounded-lg shadow-lg",
              "bg-gradient-to-r from-terminal-bg to-terminal-bg/90",
              "border border-yellow-500/30",
              "min-w-[280px] max-w-[350px]"
            )}
          >
            {/* Icon */}
            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg bg-yellow-500/20 border border-yellow-500/30">
              <span className="text-2xl">{achievement.icon}</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 text-yellow-400 text-xs uppercase tracking-wide">
                <Trophy size={12} />
                Achievement Unlocked!
              </div>
              <div className="text-terminal-accent font-medium truncate">
                {achievement.name}
              </div>
              <div className="text-terminal-accent/60 text-sm truncate">
                {achievement.description}
              </div>
            </div>

            {/* Dismiss button */}
            <button
              onClick={() => dismiss(achievement.id)}
              className="flex-shrink-0 p-1 rounded hover:bg-terminal-accent/10 transition-colors"
            >
              <X size={16} className="text-terminal-accent/50" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default AchievementToast;
