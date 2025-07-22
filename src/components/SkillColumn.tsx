import React from 'react';
import { SkillData, formatSkillValue, getDaysUntilDate } from '@/lib/skillProgression';
import VerticalProgressBar from './VerticalProgressBar';

interface SkillColumnProps {
  skill: SkillData;
  onSkillClick?: (skill: SkillData) => void;
  isSelected?: boolean;
}

const SkillMeta: React.FC<{ skill: SkillData }> = ({ skill }) => {
  // Get next incomplete checkpoint
  const nextCheckpoint = skill.checkpoints
    .filter(cp => !cp.isCompleted)
    .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())[0];
  
  const completedCount = skill.checkpoints.filter(cp => cp.isCompleted).length;
  const totalCheckpoints = skill.checkpoints.length;
  const daysLeft = nextCheckpoint ? getDaysUntilDate(nextCheckpoint.targetDate) : null;
  
  return (
    <div className="mt-4 p-3 border border-terminal-accent/20 bg-terminal-bg/10 rounded">
      {/* Skill icon and category */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{skill.icon}</span>
        <div>
          <div className="text-xs text-terminal-accent/70 uppercase tracking-wider">
            {skill.category}
          </div>
        </div>
      </div>
      
      {/* Progress stats */}
      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div>
          <div className="text-terminal-accent/70">Progress</div>
          <div className="font-medium" style={{ color: skill.color }}>
            {skill.progressPercentage.toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="text-terminal-accent/70">Checkpoints</div>
          <div className="font-medium">
            {completedCount}/{totalCheckpoints}
          </div>
        </div>
      </div>
      
      {/* Current vs Target */}
      <div className="text-xs mb-3">
        <div className="flex justify-between items-center">
          <span className="text-terminal-accent/70">Current:</span>
          <span className="font-medium">{formatSkillValue(skill, skill.currentValue)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-terminal-accent/70">Target:</span>
          <span className="font-medium">{formatSkillValue(skill, skill.targetValue)}</span>
        </div>
      </div>
      
      {/* Next checkpoint badge */}
      {nextCheckpoint && (
        <div className={`px-2 py-1 rounded text-xs text-center ${
          daysLeft && daysLeft < 0 
            ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
            : 'bg-terminal-accent/20 text-terminal-accent border border-terminal-accent/30'
        }`}>
          <div className="font-medium">{nextCheckpoint.name}</div>
          <div className="text-xs opacity-70">
            {daysLeft !== null 
              ? daysLeft < 0 
                ? `${Math.abs(daysLeft)} days overdue`
                : `${daysLeft} days left`
              : 'No deadline'
            }
          </div>
        </div>
      )}
      
      {!nextCheckpoint && totalCheckpoints > 0 && (
        <div className="px-2 py-1 rounded text-xs text-center bg-green-500/20 text-green-400 border border-green-500/30">
          All checkpoints completed! 🎉
        </div>
      )}
    </div>
  );
};

const SkillColumn: React.FC<SkillColumnProps> = ({ skill, onSkillClick, isSelected = false }) => {
  return (
    <div 
      className={`flex-shrink-0 w-64 p-4 border rounded-lg transition-all cursor-pointer ${
        isSelected 
          ? 'border-terminal-accent bg-terminal-accent/10' 
          : 'border-terminal-accent/30 hover:border-terminal-accent/50'
      }`}
      onClick={() => onSkillClick?.(skill)}
    >
      {/* Vertical Progress Bar */}
      <VerticalProgressBar skill={skill} />
      
      {/* Skill Metadata */}
      <SkillMeta skill={skill} />
    </div>
  );
};

export default SkillColumn; 