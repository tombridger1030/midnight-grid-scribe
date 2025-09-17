import React, { useState, useEffect } from 'react';
import TypewriterText from '@/components/TypewriterText';
import { Progress } from "@/components/ui/progress";
import { Target, Calendar, TrendingUp, Edit3 } from 'lucide-react';
import {
  Goal,
  Month,
  GoalsData,
  loadGoalsData,
  saveGoalsData,
  updateGoalMonthly,
  getCurrentMonth,
  monthNumberToName
} from '@/lib/storage';
import {
  loadWeeklyKPIs,
  getCurrentWeek,
  WeeklyKPIData
} from '@/lib/weeklyKpi';

const Roadmap = () => {
  const [goalsData, setGoalsData] = useState<GoalsData>({ goals: [] });
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState<'yearly' | 'monthly'>('yearly');
  const [weeklyKPIData, setWeeklyKPIData] = useState<WeeklyKPIData>({ records: [] });
  const currentMonth = getCurrentMonth();

  // Load goals data and weekly KPI data on mount
  useEffect(() => {
    const loadData = () => {
      const data = loadGoalsData();
      setGoalsData(data);
      console.log('Roadmap loaded goals data:', data.goals.map(g => ({ id: g.id, name: g.name, currentTotal: g.currentTotal, monthly: g.monthly })));
    };

    loadData();

    // Load weekly KPI data
    const kpiData = loadWeeklyKPIs();
    setWeeklyKPIData(kpiData);

    // Listen for storage changes (when other components update goals)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'noctisium-goals-data') {
        console.log('Goals data changed in localStorage, reloading...');
        loadData();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also set up a custom event listener for same-window updates
    const handleGoalsUpdate = () => {
      console.log('Goals updated event received, reloading...');
      loadData();
    };

    window.addEventListener('goalsUpdated', handleGoalsUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('goalsUpdated', handleGoalsUpdate);
    };
  }, []);

  // Calculate monthly totals from weekly KPI data for current month
  const calculateCurrentMonthTotals = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonthNum = currentDate.getMonth() + 1; // 1-based month

    let monthlyDeepWorkHours = 0;
    let monthlyBjjSessions = 0;

    // Filter weekly records to current month and sum the values
    weeklyKPIData.records.forEach(record => {
      // Parse week key to check if it's in current month
      const [year, weekStr] = record.weekKey.split('-W');
      if (parseInt(year) !== currentYear) return;

      // Get the week start date to determine which month this week belongs to
      const weekNum = parseInt(weekStr);
      const startOfYear = new Date(currentYear, 0, 1);
      const daysToAdd = (weekNum - 1) * 7 - startOfYear.getDay() + 1;
      const weekStart = new Date(startOfYear);
      weekStart.setDate(startOfYear.getDate() + daysToAdd);

      // Check if week overlaps with current month (use week start date)
      if (weekStart.getMonth() + 1 === currentMonthNum) {
        // Add KPI values from this week
        monthlyDeepWorkHours += record.values.deepWorkHours || 0;
        monthlyBjjSessions += record.values.bjjSessions || 0;
      }
    });

    return { monthlyDeepWorkHours, monthlyBjjSessions };
  };

  // Auto-update goals with calculated monthly values when weekly KPI data changes
  useEffect(() => {
    if (weeklyKPIData.records.length > 0) {
      const { monthlyDeepWorkHours, monthlyBjjSessions } = calculateCurrentMonthTotals();

      setGoalsData(prevData => {
        const updatedGoals = prevData.goals.map(goal => {
          let updatedGoal = { ...goal };

          // Update Deep Work goal with monthly total
          if (goal.id === 'deep-work') {
            updatedGoal = {
              ...goal,
              monthly: {
                ...goal.monthly,
                [currentMonth]: monthlyDeepWorkHours
              }
            };
            // Recalculate derived values
            const monthlyValues = Object.values(updatedGoal.monthly).filter(val => val !== undefined && val !== null);
            updatedGoal.currentTotal = monthlyValues.reduce((sum, val) => sum + (val || 0), 0);
            updatedGoal.progressPct = updatedGoal.yearlyTarget > 0 ? Math.min(1, updatedGoal.currentTotal / updatedGoal.yearlyTarget) : 0;
          }

          // Update BJJ goal with monthly total
          if (goal.id === 'bjj-sessions') {
            updatedGoal = {
              ...goal,
              monthly: {
                ...goal.monthly,
                [currentMonth]: monthlyBjjSessions
              }
            };
            // Recalculate derived values
            const monthlyValues = Object.values(updatedGoal.monthly).filter(val => val !== undefined && val !== null);
            updatedGoal.currentTotal = monthlyValues.reduce((sum, val) => sum + (val || 0), 0);
            updatedGoal.progressPct = updatedGoal.yearlyTarget > 0 ? Math.min(1, updatedGoal.currentTotal / updatedGoal.yearlyTarget) : 0;
          }

          return updatedGoal;
        });

        const newData = { goals: updatedGoals };
        saveGoalsData(newData); // Save the updated data
        return newData;
      });
    }
  }, [weeklyKPIData, currentMonth]);

  // Update monthly value for a goal
  const handleUpdateMonthly = (goalId: string, month: Month, value: number) => {
    try {
      const updatedData = updateGoalMonthly(goalId, month, value || null);
      setGoalsData(updatedData);
    } catch (error) {
      console.error('Failed to update monthly value:', error);
    }
  };

  // Get category color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'professional': return 'text-[#FF6B00]'; // Updated to use orange theme
      case 'fitness': return 'text-[#53B4FF]';
      case 'financial': return 'text-[#FFD700]';
      case 'personal': return 'text-[#FF6B6B]';
      default: return 'text-terminal-accent';
    }
  };

  // Get all months for year overview
  const getAllMonths = (): Month[] => {
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  };

  // Render yearly goals view
  const renderYearlyGoals = () => (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {goalsData.goals.map(goal => (
        <div key={goal.id} className="border border-terminal-accent/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <Target size={16} className={`mr-2 ${getCategoryColor(goal.category)}`} />
              <h3 className="text-sm text-terminal-accent">{goal.name}</h3>
            </div>
            <span className="text-xs px-2 py-1 bg-terminal-accent/20 text-terminal-accent uppercase">
              {goal.category}
            </span>
          </div>
          
          {/* Yearly Target Display */}
          <div className="mb-3 p-2 bg-terminal-accent/5 border border-terminal-accent/20">
            <div className="text-xs text-terminal-accent/90">
              <span className="font-semibold">{goal.yearlyTarget.toLocaleString()} {goal.unit}</span> by 2025-12-31
            </div>
            <div className="text-xs text-terminal-accent/60 mt-1">
              {goal.category === 'professional' && goal.id === 'echo-revenue' && 'Generate cumulative revenue from Echo AI tutoring platform'}
              {goal.category === 'professional' && goal.id === 'audience-growth' && 'Build total followers across IG + YT + X platforms'}
              {goal.category === 'personal' && goal.id === 'deep-work' && 'Log focused hours working on high-value projects'}
              {goal.category === 'fitness' && goal.id === 'bjj-sessions' && 'Blue-belt promotion and competition achievements'}
              {goal.category === 'financial' && goal.id === 'net-worth' && 'Increase total net worth through investments and revenue'}
            </div>
          </div>
          
          {/* Overall Progress */}
          <div className="mb-4">
            <div className="flex justify-between items-center text-xs mb-1">
              <span>Yearly Progress</span>
              <span className="flex items-center">
                <span className="mr-1">{goal.currentTotal.toLocaleString()}</span>
                / {goal.yearlyTarget.toLocaleString()} {goal.unit}
              </span>
            </div>
            <Progress 
              value={goal.progressPct * 100} 
              className="h-1 bg-terminal-accent/20"
            />
            <div className="flex justify-between text-xs mt-1">
              <span>{Math.round(goal.progressPct * 100)}% complete</span>
              <span>Target: 2025</span>
            </div>
          </div>
          
          {/* Current Month Input */}
          {goal.isNumeric && (
            <div className="mb-4 p-2 border border-terminal-accent/20">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-terminal-accent/70">Current Month ({currentMonth})</span>
                {(goal.id === 'deep-work' || goal.id === 'bjj-sessions') ? (
                  <span className="text-xs text-[#FF6B00]">Auto-calculated</span>
                ) : editMode ? (
                  <span className="text-xs text-terminal-accent/50">Edit Mode</span>
                ) : null}
              </div>
              
              {/* Show monthly target for current month */}
              {goal.monthlyTargets[currentMonth] && (
                <div className="text-xs text-terminal-accent/70 mb-2 p-1 bg-terminal-accent/5 border border-terminal-accent/20">
                  <div className="font-semibold">Target: {goal.monthlyTargets[currentMonth].target.toLocaleString()} {goal.unit}</div>
                  {goal.monthlyTargets[currentMonth].description && (
                    <div className="text-terminal-accent/50">{goal.monthlyTargets[currentMonth].description}</div>
                  )}
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className={`terminal-input w-24 text-sm ${
                    (goal.id === 'deep-work' || goal.id === 'bjj-sessions') ? 'bg-terminal-accent/10' : ''
                  }`}
                  value={goal.monthly[currentMonth] || ''}
                  onChange={(e) => handleUpdateMonthly(goal.id, currentMonth, parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  disabled={!editMode || goal.id === 'deep-work' || goal.id === 'bjj-sessions'}
                  title={
                    (goal.id === 'deep-work' || goal.id === 'bjj-sessions') 
                      ? 'Auto-calculated from daily metrics' 
                      : undefined
                  }
                />
                <span className="text-xs">{goal.unit}</span>
                {(goal.id === 'deep-work' || goal.id === 'bjj-sessions') && (
                  <span className="text-xs text-terminal-accent/50">from metrics</span>
                )}
                
                {/* Show progress toward monthly target */}
                {goal.monthlyTargets[currentMonth] && goal.monthly[currentMonth] && (
                  <span className="text-xs text-terminal-accent/70 ml-2">
                    ({Math.round((goal.monthly[currentMonth] / goal.monthlyTargets[currentMonth].target) * 100)}% of target)
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* Monthly Breakdown */}
          <div className="space-y-2">
            <h4 className="text-xs text-terminal-accent/70 uppercase">Monthly Targets & Progress</h4>
            <div className="grid grid-cols-6 gap-1">
              {getAllMonths().map(month => {
                const actualValue = goal.monthly[month];
                const monthlyTarget = goal.monthlyTargets[month];
                const hasActual = actualValue !== undefined && actualValue !== null;
                const hasTarget = monthlyTarget !== undefined;
                const isCurrent = month === currentMonth;
                
                // Calculate progress toward monthly target
                let monthlyProgress = 0;
                if (hasTarget && hasActual && monthlyTarget.target > 0) {
                  monthlyProgress = Math.min(100, (actualValue / monthlyTarget.target) * 100);
                }
                
                return (
                  <div
                    key={month}
                    className={`text-xs p-1 text-center border relative ${
                      hasActual && hasTarget
                        ? monthlyProgress >= 100 
                          ? 'border-[#5FE3B3] bg-[#5FE3B3]/20' 
                          : monthlyProgress >= 50
                          ? 'border-[#FFD700] bg-[#FFD700]/20'
                          : 'border-[#FF6B6B] bg-[#FF6B6B]/20'
                        : hasTarget 
                        ? 'border-terminal-accent/50 bg-terminal-accent/5' 
                        : hasActual
                        ? 'border-terminal-accent bg-terminal-accent/10'
                        : isCurrent
                        ? 'border-terminal-accent/50 bg-terminal-accent/5'
                        : 'border-terminal-accent/20'
                    }`}
                    title={
                      hasTarget 
                        ? `${month} Target: ${monthlyTarget.target} ${goal.unit}\n${monthlyTarget.description || ''}\nActual: ${actualValue || 0}`
                        : hasActual 
                        ? `${month}: ${actualValue} ${goal.unit}` 
                        : month
                    }
                  >
                    <div>{month}</div>
                    
                    {/* Show target value */}
                    {hasTarget && (
                      <div className="text-terminal-accent/70 font-mono text-xs">
                        {monthlyTarget.target < 1000 ? monthlyTarget.target : `${Math.round(monthlyTarget.target/1000)}k`}
                      </div>
                    )}
                    
                    {/* Show actual value */}
                    {hasActual && (
                      <div className="text-terminal-accent font-mono font-bold">
                        {actualValue < 1000 ? actualValue : `${Math.round(actualValue/1000)}k`}
                      </div>
                    )}
                    
                    {/* Show progress indicator */}
                    {hasActual && hasTarget && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-terminal-accent/20">
                        <div 
                          className={`h-full ${
                            monthlyProgress >= 100 ? 'bg-[#5FE3B3]' :
                            monthlyProgress >= 50 ? 'bg-[#FFD700]' : 'bg-[#FF6B6B]'
                          }`}
                          style={{ width: `${Math.min(100, monthlyProgress)}%` }}
                        />
                      </div>
                    )}
                    
                    {isCurrent && !hasActual && (
                      <div className="text-terminal-accent/50">•</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // Render monthly targets view
  const renderMonthlyView = () => (
    <div className="space-y-6">
      <div className="border border-terminal-accent/30 p-4">
        <h3 className="text-sm text-terminal-accent mb-4 flex items-center">
          <Calendar size={16} className="mr-2" />
          Current Month: {new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goalsData.goals.filter(goal => goal.isNumeric).map(goal => (
            <div key={goal.id} className="border border-terminal-accent/20 p-3">
              <h4 className="text-xs mb-2 flex items-center justify-between">
                <div className="flex items-center">
                  <span className={`w-2 h-2 rounded-full mr-2 ${getCategoryColor(goal.category).replace('text-', 'bg-')}`}></span>
                  {goal.name}
                </div>
                {(goal.id === 'deep-work' || goal.id === 'bjj-sessions') && (
                  <span className="text-xs text-[#FF6B00]">Auto</span>
                )}
              </h4>
              
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <input
                    type="number"
                    className={`terminal-input w-20 text-sm ${
                      (goal.id === 'deep-work' || goal.id === 'bjj-sessions') ? 'bg-terminal-accent/10' : ''
                    }`}
                    value={goal.monthly[currentMonth] || ''}
                    onChange={(e) => handleUpdateMonthly(goal.id, currentMonth, parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    disabled={goal.id === 'deep-work' || goal.id === 'bjj-sessions'}
                    title={
                      (goal.id === 'deep-work' || goal.id === 'bjj-sessions') 
                        ? 'Auto-calculated from daily metrics' 
                        : undefined
                    }
                  />
                  <span className="text-xs">{goal.unit}</span>
                </div>
                <div className="text-xs text-terminal-accent/70">
                  Yearly progress: {goal.currentTotal.toLocaleString()} / {goal.yearlyTarget.toLocaleString()} ({Math.round(goal.progressPct * 100)}%)
                </div>
              </div>
              
              <Progress value={goal.progressPct * 100} className="h-1 mb-1" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Year overview */}
      <div className="border border-terminal-accent/30 p-4">
        <h3 className="text-sm text-terminal-accent mb-4 flex items-center">
          <TrendingUp size={16} className="mr-2" />
          Year Overview
        </h3>
        
        {goalsData.goals.filter(goal => goal.isNumeric).map(goal => (
          <div key={goal.id} className="mb-4 last:mb-0">
            <div className="text-xs mb-2">{goal.name}</div>
            <div className="grid grid-cols-12 gap-1">
              {getAllMonths().map(month => {
                const value = goal.monthly[month];
                const hasValue = value !== undefined && value !== null;
                const isCurrent = month === currentMonth;
                
                return (
                  <div 
                    key={month} 
                    className={`text-xs p-1 text-center border ${
                      hasValue 
                        ? 'border-terminal-accent bg-terminal-accent' 
                        : isCurrent
                        ? 'border-terminal-accent/50 bg-terminal-accent/20'
                        : 'border-terminal-accent/20'
                    }`}
                    title={hasValue ? `${month}: ${value} ${goal.unit}` : month}
                  >
                    <div className={hasValue ? 'text-terminal-bg' : ''}>{month.slice(0,1)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <TypewriterText text="Goals & Roadmap" className="text-xl mb-2" />
            <p className="text-terminal-accent/70 text-sm">Track monthly progress toward yearly goals.</p>
          </div>
          <button
            className="terminal-button flex items-center min-h-[44px] px-4"
            onClick={() => setEditMode(!editMode)}
          >
            <Edit3 size={16} className="mr-2" />
            {editMode ? 'View Mode' : 'Edit Mode'}
          </button>
        </div>
        
        {/* View mode selector */}
        <div className="flex gap-2 mb-4">
          {(['yearly', 'monthly'] as const).map((mode) => (
            <button
              key={mode}
              className={`terminal-button ${viewMode === mode ? 'bg-terminal-accent text-terminal-bg' : ''}`}
              onClick={() => setViewMode(mode)}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>

        {/* Legend for Monthly Progress */}
        {viewMode === 'yearly' && (
          <div className="mb-6 p-3 border border-terminal-accent/30">
            <h4 className="text-xs text-terminal-accent/70 uppercase mb-2">Monthly Progress Legend</h4>
            <div className="flex items-center gap-6 text-xs">
              <span className="text-terminal-accent/70">Target</span>
              <span className="text-terminal-accent font-bold">Actual</span>
              <div className="flex items-center gap-1">
                <div className="w-3 h-2 bg-[#5FE3B3]"></div>
                <span>100%+</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-2 bg-[#FFD700]"></div>
                <span>50%+</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-2 bg-[#FF6B6B]"></div>
                <span>&lt;50%</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {viewMode === 'yearly' && renderYearlyGoals()}
        {viewMode === 'monthly' && renderMonthlyView()}
      </div>
    </div>
  );
};

export default Roadmap;
