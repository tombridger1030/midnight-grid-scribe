import React, { useState, useEffect } from 'react';
import { TrendingDown, AlertTriangle, Clock, GitBranch } from 'lucide-react';
import WeekStreakChart from './WeekStreakChart';
import { Progress } from "@/components/ui/progress";
import { 
  Goal, 
  GoalsData, 
  loadGoalsData
} from '@/lib/storage';

interface RevenueLostCounterProps {
  startDate: string; // ISO-8601 format
  targetARR: number; // Annual Recurring Revenue target
  currency?: string; // Default "USD"
}

const RevenueLostCounter: React.FC<RevenueLostCounterProps> = ({
  startDate,
  targetARR,
  currency = "USD"
}) => {
  const [remainingOpportunity, setRemainingOpportunity] = useState(targetARR);
  const [daysElapsed, setDaysElapsed] = useState(0);
  const [percentageLost, setPercentageLost] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [minutesElapsed, setMinutesElapsed] = useState(0);
  const [goalsData, setGoalsData] = useState<GoalsData>({ goals: [] });

  useEffect(() => {
    // Load goals data
    const goals = loadGoalsData();
    setGoalsData(goals);

    const updateCounter = () => {
      const now = Date.now();
      const launchDate = new Date(startDate).getTime();
      
      // Calculate time difference in milliseconds
      const millisElapsed = now - launchDate;
      const daysElapsedCalc = Math.max(0, millisElapsed / (1000 * 60 * 60 * 24));
      const secondsElapsedCalc = Math.max(0, millisElapsed / 1000);
      const minutesElapsedCalc = Math.max(0, millisElapsed / (1000 * 60));
      
      // Fixed daily burn rate
      const perDay = 1369.8630136986;
      const perSecond = perDay / (24 * 60 * 60); // Convert to per-second rate
      
      // Calculate burned revenue with high precision
      const burned = secondsElapsedCalc * perSecond;
      
      // Calculate remaining opportunity (never goes below 0)
      const remaining = Math.max(0, targetARR - burned);
      
      // Calculate percentage lost
      const percentLost = ((targetARR - remaining) / targetARR) * 100;
      
      // Trigger animation on value change
      if (remaining !== remainingOpportunity) {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 100);
      }
      
      setRemainingOpportunity(remaining);
      setDaysElapsed(daysElapsedCalc);
      setPercentageLost(percentLost);
      setSecondsElapsed(secondsElapsedCalc);
      setMinutesElapsed(minutesElapsedCalc);
    };

    // Update immediately
    updateCounter();
    
    // Update every second to avoid blinking/flickering
    const interval = setInterval(updateCounter, 1000);
    
    // Cleanup
    return () => clearInterval(interval);
  }, [startDate, targetARR]);

  // Get category color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'professional': return 'text-[#FF6B00]';
      case 'fitness': return 'text-[#53B4FF]';
      case 'financial': return 'text-[#FFD700]';
      case 'personal': return 'text-[#FF6B6B]';
      default: return 'text-terminal-accent';
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format days with precision
  const formatDays = (days: number) => {
    const wholeDays = Math.floor(days);
    const hours = Math.floor((days - wholeDays) * 24);
    const minutes = Math.floor(((days - wholeDays) * 24 - hours) * 60);
    
    if (wholeDays > 0) {
      return `${wholeDays}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // Get color based on percentage lost
  const getUrgencyColor = () => {
    if (percentageLost >= 80) return 'text-[#FF6B6B]'; // Red - Critical
    if (percentageLost >= 60) return 'text-[#FF6B00]'; // Orange - High
    if (percentageLost >= 40) return 'text-[#FFD700]'; // Yellow - Medium
    if (percentageLost >= 20) return 'text-[#53B4FF]'; // Blue - Low
    return 'text-[#5FE3B3]'; // Green - Minimal
  };

  // Get urgency message
  const getUrgencyMessage = () => {
    if (remainingOpportunity <= 0) return 'RUNWAY DEPLETED';
    if (percentageLost >= 80) return 'CRITICAL: Less than 20% runway remaining';
    if (percentageLost >= 60) return 'HIGH URGENCY: Significant runway consumed';
    if (percentageLost >= 40) return 'MEDIUM URGENCY: Over 40% runway used';
    if (percentageLost >= 20) return 'LOW URGENCY: Early runway consumption';
    return 'HEALTHY: Minimal runway consumed';
  };

  return (
    <div className="w-full">
      {/* Main Counter Display */}
      <div className="border border-terminal-accent/30 bg-terminal-bg/50 p-8 mb-6">
        <div className="text-center">
          {/* Header */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <TrendingDown size={32} className="text-[#FF6B6B]" />
            <h1 className="text-2xl font-bold text-terminal-accent">Revenue Runway Remaining</h1>
            <AlertTriangle size={32} className={getUrgencyColor()} />
          </div>
          
          {/* Main Counter */}
          <div className="mb-6">
            <div className={`text-6xl md:text-8xl font-mono font-bold ${getUrgencyColor()} transition-all duration-300`}>
              {formatCurrency(remainingOpportunity)}
            </div>
            <div className="text-sm text-terminal-accent/70 mt-2">
              of {formatCurrency(targetARR)} runway available
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="w-full bg-terminal-accent/20 h-4 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#5FE3B3] via-[#FFD700] to-[#FF6B6B] transition-all duration-1000"
                style={{ width: `${Math.min(100, percentageLost)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-terminal-accent/70 mt-1">
              <span>0% Used</span>
              <span className={getUrgencyColor()}>
                {percentageLost.toFixed(2)}% Used
              </span>
              <span>100% Used</span>
            </div>
          </div>
          

        </div>
      </div>

      {/* Important Dates and Time */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Time Elapsed */}
        <div className="border border-terminal-accent/30 p-4 bg-terminal-bg/30 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock size={16} className="text-terminal-accent" />
            <span className="text-sm text-terminal-accent">Time Elapsed</span>
          </div>
          <div className="text-2xl font-bold text-terminal-accent font-mono">
            {Math.floor(minutesElapsed).toLocaleString()}
          </div>
          <div className="text-xs text-terminal-accent/70">
            minutes since start
          </div>
        </div>

        {/* Launch Date */}
        <div className="border border-terminal-accent/30 p-4 bg-terminal-bg/30 text-center">
          <div className="text-sm text-terminal-accent/70 mb-1">Target Launch</div>
          <div className="text-lg font-bold text-[#FFD700]">
            September 29, 2025
          </div>
          <div className="text-xs text-terminal-accent/70">
            Goal deadline
          </div>
        </div>

        {/* End Date */}
        <div className="border border-terminal-accent/30 p-4 bg-terminal-bg/30 text-center">
          <div className="text-sm text-terminal-accent/70 mb-1">Runway Depletion</div>
          <div className="text-lg font-bold text-[#FF6B6B]">
            July 8, 2027
          </div>
          <div className="text-xs text-terminal-accent/70">
            ~730 days from start
          </div>
        </div>
      </div>

      {/* Weekly Performance Trend */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown size={20} className="text-terminal-accent" />
          <h2 className="text-lg text-terminal-accent">Weekly Performance Trend</h2>
        </div>
        <div className="border border-terminal-accent/30 p-4 bg-terminal-bg/30">
          <WeekStreakChart weekCount={8} />
        </div>
      </div>

      {/* 2025 Goals Progress */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch size={20} className="text-terminal-accent" />
          <h2 className="text-lg text-terminal-accent">2025 Goals Progress</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {goalsData.goals.slice(0, 4).map(goal => (
            <div key={goal.id} className="border border-terminal-accent/30 p-4 bg-terminal-bg/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">{goal.name}</span>
                <span className={`text-sm ${getCategoryColor(goal.category)}`}>
                  {Math.round(goal.progressPct * 100)}%
                </span>
              </div>
              <Progress value={goal.progressPct * 100} className="h-2 mb-2" />
              <div className="text-xs text-terminal-accent/50">
                {goal.currentTotal.toLocaleString()} / {goal.yearlyTarget.toLocaleString()} {goal.unit}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RevenueLostCounter; 