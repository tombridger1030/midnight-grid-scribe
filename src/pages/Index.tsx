
import React from 'react';
import MidnightTracker from '@/components/MidnightTracker';
import TypewriterText from '@/components/TypewriterText';
import { Progress } from '@/components/ui/progress';

const Index = () => {
  // Calculate sprint progress
  const calculateSprintProgress = () => {
    // Get today's date
    const today = new Date();
    
    // Calculate day of sprint (assuming Jan 1, 2025 is day 1 of a sprint)
    const startDate = new Date(2025, 0, 1); // Jan 1, 2025
    const diffTime = Math.abs(today.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Calculate which sprint we're in and which day of the sprint
    const sprintLength = 28; // 21 days on + 7 days off
    const currentSprintNumber = Math.floor(diffDays / sprintLength) + 1;
    const dayOfSprint = (diffDays % sprintLength) + 1;
    
    // If we're in the "on" period (first 21 days) or "off" period (last 7 days)
    const isOnPeriod = dayOfSprint <= 21;
    
    return {
      currentSprintNumber,
      dayOfSprint,
      isOnPeriod,
      progress: isOnPeriod ? (dayOfSprint / 21) * 100 : 100
    };
  };

  const sprint = calculateSprintProgress();

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <TypewriterText text="Metrics Input" className="text-xl mb-2" />
        <p className="text-terminal-accent/70 text-sm">Track your sprint metrics and habits.</p>
      </div>
      
      <div className="mb-4 border border-terminal-accent/30 p-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm">
            Sprint {sprint.currentSprintNumber} | Day {sprint.dayOfSprint}
          </span>
          <span className={`text-xs px-2 py-1 ${sprint.isOnPeriod ? 'bg-[#5FE3B3]/20 text-[#5FE3B3]' : 'bg-[#53B4FF]/20 text-[#53B4FF]'}`}>
            {sprint.isOnPeriod ? 'ACTIVE' : 'REST'}
          </span>
        </div>
        <div className="text-xs mb-1">Sprint Progress</div>
        <Progress 
          value={sprint.isOnPeriod ? (sprint.dayOfSprint / 21) * 100 : 100}
          className="h-1 bg-terminal-accent/20"
        />
        <div className="flex justify-between text-xs mt-1">
          <span>Day {sprint.dayOfSprint}</span>
          <span>{sprint.isOnPeriod ? `${21 - sprint.dayOfSprint} days left` : 'Rest period'}</span>
        </div>
      </div>
      
      <div className="flex-1">
        <MidnightTracker />
      </div>
    </div>
  );
};

export default Index;
