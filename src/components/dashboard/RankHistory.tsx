/**
 * RankHistory Component
 * 
 * Modal showing rank history for the last several weeks.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatWeekKey } from '@/lib/weeklyKpi';

type Rank = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

interface WeekData {
  weekKey: string;
  percentage: number;
  rrChange?: number;
  rank?: Rank;
}

interface RankHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  history: WeekData[];
  currentRank: Rank;
}

const RANK_CONFIG: Record<Rank, { color: string; icon: string; name: string }> = {
  bronze: { color: '#CD7F32', icon: '🥉', name: 'Bronze' },
  silver: { color: '#C0C0C0', icon: '🥈', name: 'Silver' },
  gold: { color: '#FFD700', icon: '🥇', name: 'Gold' },
  platinum: { color: '#E5E4E2', icon: '🏅', name: 'Platinum' },
  diamond: { color: '#B9F2FF', icon: '👑', name: 'Diamond' },
};

export const RankHistory: React.FC<RankHistoryProps> = ({
  isOpen,
  onClose,
  history,
  currentRank,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              "relative w-full max-w-md mx-4",
              "bg-terminal-bg border border-terminal-accent/30 rounded-lg shadow-2xl",
              "overflow-hidden"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-terminal-accent/20">
              <h2 className="text-lg font-bold text-terminal-accent">
                Rank History
              </h2>
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-terminal-accent/10 transition-colors"
              >
                <X size={20} className="text-terminal-accent/70" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {history.length === 0 ? (
                <div className="text-center py-8 text-terminal-accent/50">
                  No history yet
                </div>
              ) : (
                history.map((week, index) => {
                  const rank = week.rank || currentRank;
                  const config = RANK_CONFIG[rank];
                  const rrChange = week.rrChange ?? 0;

                  return (
                    <motion.div
                      key={week.weekKey}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={cn(
                        "flex items-center justify-between p-3 rounded",
                        "bg-terminal-accent/5 border border-terminal-accent/10",
                        index === 0 && "border-terminal-accent/30 bg-terminal-accent/10"
                      )}
                    >
                      {/* Week info */}
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{config.icon}</span>
                        <div>
                          <div className="text-terminal-accent font-medium">
                            {formatWeekKey(week.weekKey)}
                          </div>
                          <div className="text-terminal-accent/60 text-sm">
                            {week.percentage}% completion
                          </div>
                        </div>
                      </div>

                      {/* RR Change */}
                      <div className={cn(
                        "flex items-center gap-1 font-mono text-sm",
                        rrChange > 0 && "text-[#5FE3B3]",
                        rrChange < 0 && "text-[#FF6B6B]",
                        rrChange === 0 && "text-terminal-accent/50"
                      )}>
                        {rrChange > 0 ? (
                          <TrendingUp size={14} />
                        ) : rrChange < 0 ? (
                          <TrendingDown size={14} />
                        ) : (
                          <Minus size={14} />
                        )}
                        <span>
                          {rrChange > 0 ? '+' : ''}{rrChange} RR
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default RankHistory;
