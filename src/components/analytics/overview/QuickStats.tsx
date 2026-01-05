/**
 * QuickStats Component
 * 
 * Compact display of key stats: level, rank, weeks tracked, etc.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Calendar, Target, TrendingUp } from 'lucide-react';

interface QuickStatsProps {
  level: number;
  rank: string;
  rrPoints: number;
  totalWeeksTracked: number;
  perfectWeeks: number;
  yearlyAverage: number;
}

const RANK_COLORS: Record<string, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
  diamond: '#B9F2FF',
  grandmaster: '#FF00FF',
};

export const QuickStats: React.FC<QuickStatsProps> = ({
  level,
  rank,
  rrPoints,
  totalWeeksTracked,
  perfectWeeks,
  yearlyAverage,
}) => {
  const rankColor = RANK_COLORS[rank] || '#00F0FF';

  const stats = [
    {
      icon: Star,
      label: 'Level',
      value: level.toString(),
      color: '#FFB800',
    },
    {
      icon: Trophy,
      label: 'Rank',
      value: rank.charAt(0).toUpperCase() + rank.slice(1),
      subValue: `${rrPoints} RR`,
      color: rankColor,
    },
    {
      icon: Calendar,
      label: 'Weeks Tracked',
      value: totalWeeksTracked.toString(),
      color: '#00F0FF',
    },
    {
      icon: Target,
      label: 'Perfect Weeks',
      value: perfectWeeks.toString(),
      color: '#00FF88',
    },
    {
      icon: TrendingUp,
      label: 'Yearly Avg',
      value: `${yearlyAverage}%`,
      color: yearlyAverage >= 70 ? '#00FF88' : yearlyAverage >= 50 ? '#FFB800' : '#FF3366',
    },
  ];

  return (
    <div className="rounded-xl bg-surface-secondary border border-line p-6 h-full">
      <h3 className="text-sm font-semibold text-terminal-accent mb-4 uppercase tracking-wider">
        Quick Stats
      </h3>

      <div className="space-y-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-3"
            >
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${stat.color}15` }}
              >
                <Icon size={18} style={{ color: stat.color }} />
              </div>
              <div className="flex-1">
                <div className="text-xs text-terminal-accent/50">{stat.label}</div>
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-lg font-bold font-mono"
                    style={{ color: stat.color }}
                  >
                    {stat.value}
                  </span>
                  {stat.subValue && (
                    <span className="text-xs text-terminal-accent/40">
                      {stat.subValue}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default QuickStats;
