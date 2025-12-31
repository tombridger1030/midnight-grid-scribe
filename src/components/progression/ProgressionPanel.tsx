/**
 * ProgressionPanel Component
 * 
 * Modal showing full progression details: level, XP, rank, achievements.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { useProgression } from '@/hooks/useProgression';
import { X, Flame, Calendar, Trophy, Star } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ProgressionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const ProgressionPanel: React.FC<ProgressionPanelProps> = ({
  isOpen,
  onClose,
  className,
}) => {
  const {
    isLoading,
    level,
    xpProgress,
    rank,
    rankInfo,
    rrPoints,
    rrProgress,
    streak,
    longestStreak,
    weeksCompleted,
    perfectWeeks,
    achievements,
  } = useProgression();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className={cn(
        "relative w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto",
        "bg-terminal-bg border border-terminal-accent/30 rounded-lg shadow-2xl",
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-terminal-accent/20">
          <h2 className="text-lg font-bold text-terminal-accent flex items-center gap-2">
            <Trophy size={20} />
            Your Progression
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-terminal-accent/10 transition-colors"
          >
            <X size={20} className="text-terminal-accent/70" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-terminal-accent/50">
            Loading progression...
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {/* Level & XP Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-terminal-accent/70">Level</span>
                <span className="text-2xl font-bold text-terminal-accent font-mono">
                  {level}
                </span>
              </div>
              <div className="space-y-1">
                <Progress 
                  value={xpProgress.percentage} 
                  className="h-3 bg-terminal-accent/20"
                />
                <div className="flex justify-between text-xs text-terminal-accent/50">
                  <span>{xpProgress.current} / {xpProgress.required} XP</span>
                  <span>{Math.round(xpProgress.percentage)}%</span>
                </div>
              </div>
            </div>

            {/* Rank Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-terminal-accent/70">Rank</span>
                <span className="flex items-center gap-2">
                  <span className="text-xl">{rankInfo.icon}</span>
                  <span 
                    className="text-lg font-bold"
                    style={{ color: rankInfo.color }}
                  >
                    {rankInfo.name}
                  </span>
                </span>
              </div>
              <div className="space-y-1">
                <Progress 
                  value={rrProgress.percentage} 
                  className="h-3 bg-terminal-accent/20"
                />
                <div className="flex justify-between text-xs text-terminal-accent/50">
                  <span>{rrPoints} RR</span>
                  {rrProgress.nextRank ? (
                    <span>{rrProgress.required - rrProgress.current} to {rrProgress.nextRank.charAt(0).toUpperCase() + rrProgress.nextRank.slice(1)}</span>
                  ) : (
                    <span>Max Rank!</span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={<Flame size={16} className="text-orange-400" />}
                label="Current Streak"
                value={`${streak} weeks`}
              />
              <StatCard
                icon={<Flame size={16} className="text-orange-400/50" />}
                label="Longest Streak"
                value={`${longestStreak} weeks`}
              />
              <StatCard
                icon={<Calendar size={16} className="text-blue-400" />}
                label="Weeks Completed"
                value={weeksCompleted.toString()}
              />
              <StatCard
                icon={<Star size={16} className="text-yellow-400" />}
                label="Perfect Weeks"
                value={perfectWeeks.toString()}
              />
            </div>

            {/* Achievements Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-terminal-accent/70 flex items-center gap-2">
                  <Trophy size={16} />
                  Achievements
                </span>
                <span className="text-sm text-terminal-accent/50">
                  {achievements.unlockedCount} / {achievements.total}
                </span>
              </div>

              {/* Unlocked Achievements */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {achievements.unlocked.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="flex flex-col items-center p-2 rounded bg-terminal-accent/10 border border-terminal-accent/20"
                    title={`${achievement.name}: ${achievement.description}`}
                  >
                    <span className="text-2xl">{achievement.icon}</span>
                    <span className="text-[10px] text-terminal-accent/70 text-center mt-1 leading-tight">
                      {achievement.name}
                    </span>
                  </div>
                ))}
              </div>

              {/* Locked Achievements */}
              {achievements.locked.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {achievements.locked.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="flex flex-col items-center p-2 rounded bg-terminal-bg/50 border border-terminal-accent/10 opacity-40"
                      title={`${achievement.name}: ${achievement.description}`}
                    >
                      <span className="text-2xl grayscale">?</span>
                      <span className="text-[10px] text-terminal-accent/50 text-center mt-1 leading-tight">
                        {achievement.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper component for stats
const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <div className="p-3 rounded bg-terminal-accent/5 border border-terminal-accent/10">
    <div className="flex items-center gap-2 mb-1">
      {icon}
      <span className="text-xs text-terminal-accent/50">{label}</span>
    </div>
    <span className="text-lg font-bold text-terminal-accent font-mono">{value}</span>
  </div>
);

export default ProgressionPanel;
