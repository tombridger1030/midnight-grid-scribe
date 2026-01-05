/**
 * GoalCard Component
 * 
 * Clean, minimal goal card matching RankBar design language.
 * Collapsible with smooth animations.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Edit3, Zap, Dumbbell, DollarSign, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GoalWithProgress } from '@/hooks/useGoals';
import GoalCascade from './GoalCascade';

interface GoalCardProps {
  goal: GoalWithProgress;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  index: number;
}

const GOAL_ICONS: Record<string, React.ElementType> = {
  'deep work': Zap,
  'training': Dumbbell,
  'revenue': DollarSign,
  'followers': Users,
};

const GOAL_COLORS: Record<string, string> = {
  'deep work': '#00F0FF',
  'training': '#00FF88',
  'revenue': '#FFB800',
  'followers': '#FF3366',
};

const formatValue = (value: number, unit: string): string => {
  if (unit === '$' || unit === 'dollars') {
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
    return `$${Math.round(value)}`;
  }
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return `${Math.round(value).toLocaleString()}`;
};

const GoalCard: React.FC<GoalCardProps> = ({ goal, isExpanded, onToggle, onEdit, index }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const pct = Math.round(goal.progressPct * 100);
  const goalKey = goal.name.toLowerCase();
  const Icon = GOAL_ICONS[goalKey] || Zap;
  const accentColor = GOAL_COLORS[goalKey] || '#00F0FF';
  
  const isOnPace = goal.status === 'on-pace';

  const getProgressColor = () => {
    if (pct >= 100) return '#00FF88';
    if (isOnPace) return accentColor;
    if (pct >= 50) return '#FFB800';
    return '#FF3366';
  };

  const progressColor = getProgressColor();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "rounded-lg overflow-hidden transition-all duration-200",
        "bg-[#0A0A0A] border border-[#1F1F1F]",
        isHovered && "border-[#2A2A2A]",
        isOnPace && isHovered && "shadow-[0_0_20px_rgba(0,255,136,0.1)]"
      )}
    >
      {/* Header - Always visible */}
      <div
        onClick={onToggle}
        className="p-4 cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div 
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${accentColor}15` }}
          >
            <Icon size={18} style={{ color: accentColor }} />
          </div>

          {/* Goal name */}
          <span className="text-sm font-medium text-[#E8E8E8] uppercase tracking-wide flex-shrink-0">
            {goal.name}
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Values */}
          <div className="flex items-center gap-2 text-sm font-mono">
            <span className="text-[#E8E8E8]">
              {formatValue(goal.currentTotal, goal.unit)}
            </span>
            <span className="text-[#6B6B6B]">/</span>
            <span className="text-[#6B6B6B]">
              {formatValue(goal.yearlyTarget, goal.unit)}
            </span>
          </div>

          {/* Percentage */}
          <span 
            className="text-sm font-mono font-medium min-w-[3rem] text-right"
            style={{ color: progressColor }}
          >
            {pct}%
          </span>

          {/* Edit button (on hover) */}
          <AnimatePresence>
            {isHovered && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-1.5 rounded-md text-[#6B6B6B] hover:text-[#E8E8E8] hover:bg-[#1F1F1F] transition-colors"
              >
                <Edit3 size={14} />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Chevron */}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-[#6B6B6B]"
          >
            <ChevronDown size={16} />
          </motion.div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1 bg-[#1F1F1F] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: progressColor }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, pct)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>

        {/* Status line */}
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span 
            className="flex items-center gap-1"
            style={{ color: isOnPace ? '#00FF88' : '#FFB800' }}
          >
            <span className={isOnPace ? 'text-[#00FF88]' : 'text-[#FFB800]'}>
              {isOnPace ? '●' : '○'}
            </span>
            {isOnPace ? 'On pace' : 'Behind'}
          </span>
          <span className="text-[#6B6B6B]">•</span>
          <span className="text-[#6B6B6B]">
            {formatValue(goal.monthlyTarget, goal.unit)}/mo target
          </span>
          <span className="text-[#6B6B6B]">•</span>
          <span 
            className={cn(
              "font-mono",
              goal.trend.direction === 'up' ? 'text-[#00FF88]' : 
              goal.trend.direction === 'down' ? 'text-[#FF3366]' : 'text-[#6B6B6B]'
            )}
          >
            {goal.trend.direction === 'up' ? '▲' : goal.trend.direction === 'down' ? '▼' : '─'}
            {goal.trend.percentChange > 0 ? '+' : ''}{Math.round(goal.trend.percentChange)}%
          </span>
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-[#1F1F1F]">
              <GoalCascade goal={goal} accentColor={accentColor} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default GoalCard;
