import React from 'react';
import { SkillData, SkillCheckpoint, getDaysUntilDate, isDateOverdue } from '@/lib/skillProgression';

// Helper function to format belt values
const getBeltName = (value: number): string => {
  const beltNames = ['White', 'Blue', 'Purple', 'Brown', 'Black'];
  const beltIndex = Math.floor(value);
  const progress = value - beltIndex;
  
  if (beltIndex >= beltNames.length) return 'Black Belt+';
  
  const currentBelt = beltNames[beltIndex];
  if (progress > 0 && beltIndex + 1 < beltNames.length) {
    const nextBelt = beltNames[beltIndex + 1];
    return `${currentBelt} → ${nextBelt}`;
  }
  
  return `${currentBelt} Belt`;
};

interface VerticalProgressBarProps {
  skill: SkillData;
}

interface CheckpointDotProps {
  checkpoint: SkillCheckpoint;
  percent: number;
  color: string;
  isNext?: boolean;
}

const CheckpointDot: React.FC<CheckpointDotProps> = ({ checkpoint, percent, color, isNext = false }) => {
  const isOverdue = isDateOverdue(checkpoint.targetDate);
  const isCompleted = checkpoint.isCompleted;
  
  return (
    <div
      className={`absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 transition-all z-20
                  ${isCompleted 
                    ? `bg-green-500 border-green-400 shadow-lg` 
                    : isOverdue 
                    ? `bg-red-500 border-red-400 shadow-lg` 
                    : `bg-white border-2 shadow-lg`
                  }
                  ${isNext ? 'ring-2 ring-white/70 scale-110' : ''}
                  hover:scale-125 cursor-pointer`}
      style={{ 
        bottom: `${percent * 100}%`,
        borderColor: isCompleted ? '#10b981' : isOverdue ? '#ef4444' : color,
        boxShadow: isCompleted 
          ? '0 0 8px #10b98160' 
          : isOverdue 
          ? '0 0 8px #ef444460'
          : `0 0 6px ${color}40`
      }}
      title={`${checkpoint.name} - ${checkpoint.progressPercentage.toFixed(1)}% (${getDaysUntilDate(checkpoint.targetDate)} days)`}
    />
  );
};

const VerticalProgressBar: React.FC<VerticalProgressBarProps> = ({ skill }) => {
  // Get next incomplete checkpoint
  const nextCheckpoint = skill.checkpoints
    .filter(cp => !cp.isCompleted)
    .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())[0];
  
  // Calculate days left for next checkpoint
  const daysLeft = nextCheckpoint ? getDaysUntilDate(nextCheckpoint.targetDate) : null;
  
  return (
    <div className="flex flex-col items-center w-36 p-4 bg-terminal-bg/10 border border-terminal-accent/20 rounded-lg">
      {/* Skill name and current value */}
      <div className="text-center mb-6">
        <div className="text-2xl font-bold mb-2" style={{ color: skill.color }}>
          {skill.icon}
        </div>
        <div className="text-base font-semibold mb-2" style={{ color: skill.color }}>
          {skill.name}
        </div>
        <div className="text-sm font-bold text-white bg-black/30 px-3 py-1 rounded-full border border-terminal-accent/30">
          {skill.unit === 'USD' 
            ? `$${(skill.currentValue / 1000).toFixed(1)}K`
            : skill.unit === 'USD/year'
            ? `$${(skill.currentValue / 1000).toFixed(1)}K ARR`
            : skill.unit === 'belt'
            ? getBeltName(skill.currentValue)
            : skill.unit === '% BF'
            ? `${skill.currentValue.toFixed(1)}%`
            : `${skill.currentValue}${skill.unit}`
          }
        </div>
      </div>

      {/* Vertical progress rail */}
      <div className="relative flex flex-col items-center">
        {/* Target label at top */}
        <div className="text-xs text-terminal-accent/70 mb-3 text-center font-medium">
          <span className="text-terminal-accent/50">Target:</span><br/>
          {skill.unit === 'USD' 
            ? `$${(skill.targetValue / 1000000).toFixed(1)}M`
            : skill.unit === 'USD/year'
            ? `$${(skill.targetValue / 1000000).toFixed(1)}M ARR`
            : skill.unit === 'belt'
            ? getBeltName(skill.targetValue)
            : skill.unit === '% BF'
            ? `${skill.targetValue}%`
            : `${skill.targetValue}${skill.unit}`
          }
        </div>

        {/* Rail container */}
        <div className="w-6 bg-terminal-accent/20 h-80 rounded-full relative overflow-hidden shadow-inner border border-terminal-accent/30">
          {/* Progress fill (grows upward from bottom) */}
          <div
            className="absolute bottom-0 left-0 w-full rounded-full transition-all duration-700 ease-out"
            style={{ 
              height: `${Math.min(100, skill.progressPercentage)}%`,
              backgroundColor: skill.color,
              boxShadow: `0 0 10px ${skill.color}40`
            }}
          />
          
          {/* Current position indicator */}
          <div
            className="absolute left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-3 bg-white shadow-lg z-10"
            style={{ 
              bottom: `${Math.min(100, skill.progressPercentage)}%`,
              borderColor: skill.color,
              transform: 'translateX(-50%) translateY(50%)',
              boxShadow: `0 0 8px ${skill.color}60`
            }}
            title={`Current: ${skill.progressPercentage.toFixed(1)}%`}
          />
          
          {/* Checkpoint dots */}
          {skill.checkpoints.map(checkpoint => {
            // Calculate percentage position based on skill's overall progress
            const checkpointPercent = checkpoint.progressPercentage / 100;
            
            return (
              <CheckpointDot
                key={checkpoint.id}
                checkpoint={checkpoint}
                percent={checkpointPercent}
                color={skill.color}
                isNext={nextCheckpoint?.id === checkpoint.id}
              />
            );
          })}
        </div>

        {/* Start label at bottom */}
        <div className="text-xs text-terminal-accent/70 mt-3 text-center font-medium">
          <span className="text-terminal-accent/50">Start</span><br/>
          <span className="text-terminal-accent/40">0%</span>
        </div>
      </div>

      {/* Next checkpoint info */}
      {nextCheckpoint && (
        <div className="text-center mt-4">
          <div className="text-xs font-medium" style={{ color: skill.color }}>
            Next: {nextCheckpoint.name}
          </div>
          <div className={`text-xs ${daysLeft && daysLeft < 0 ? 'text-red-400' : 'text-terminal-accent/70'}`}>
            {daysLeft !== null 
              ? daysLeft < 0 
                ? `${Math.abs(daysLeft)} days overdue`
                : `${daysLeft} days left`
              : 'No upcoming checkpoints'
            }
          </div>
        </div>
      )}
    </div>
  );
};

export default VerticalProgressBar; 