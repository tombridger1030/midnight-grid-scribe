import React, { useState, useEffect } from 'react';
import TypewriterText from '@/components/TypewriterText';
import WeeklyProgressBar from '@/components/WeeklyProgressBar';
import WeekStreakChart from '@/components/WeekStreakChart';
import { Progress } from "@/components/ui/progress";
import { 
  Target, TrendingUp, CheckCircle2, BarChart3, GitBranch, Award
} from 'lucide-react';
import { 
  Goal, 
  GoalsData, 
  loadGoalsData, 
  getCurrentMonth
} from '@/lib/storage';
import {
  WEEKLY_KPI_DEFINITIONS,
  loadWeeklyKPIs,
  getCurrentWeek,
  getWeeklyKPIRecord,
  calculateWeekCompletion,
  WeeklyKPIValues,
  loadWeeklyKPIsWithSync
} from '@/lib/weeklyKpi';

const Dashboard = () => {
  const [goalsData, setGoalsData] = useState<GoalsData>({ goals: [] });
  const [currentWeekData, setCurrentWeekData] = useState<WeeklyKPIValues>({});
  const [isLoading, setIsLoading] = useState(true);
  const currentWeek = getCurrentWeek();
  const currentMonth = getCurrentMonth();

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Load goals data
        const goals = loadGoalsData();
        setGoalsData(goals);

        // Load weekly KPI data from Supabase
        await loadWeeklyKPIsWithSync();
        
        // Load current week KPI data
        const weekRecord = getWeeklyKPIRecord(currentWeek);
        setCurrentWeekData(weekRecord?.values || {});
        
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        // Fall back to local data
        const weekRecord = getWeeklyKPIRecord(currentWeek);
        setCurrentWeekData(weekRecord?.values || {});
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [currentWeek]);

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

  // Calculate overall week completion
  const weekCompletion = calculateWeekCompletion(currentWeekData);

  // Get KPI summary stats
  const getKPISummary = () => {
    let excellent = 0;
    let good = 0;
    let fair = 0;
    let poor = 0;

    WEEKLY_KPI_DEFINITIONS.forEach(kpi => {
      const value = currentWeekData[kpi.id] || 0;
      const progress = Math.min(100, (value / kpi.target) * 100);
      
      if (progress >= 100) excellent++;
      else if (progress >= 80) good++;
      else if (progress >= 50) fair++;
      else poor++;
    });

    return { excellent, good, fair, poor };
  };

  const kpiSummary = getKPISummary();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-terminal-accent">Loading dashboard data...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <TypewriterText text="Dashboard" className="text-xl mb-2" />
        <p className="text-terminal-accent/70 text-sm">
          Weekly KPI overview and performance tracking
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Weekly KPI Performance Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Target size={20} className="text-terminal-accent" />
              <h2 className="text-lg text-terminal-accent">This Week's Performance</h2>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-terminal-accent">{weekCompletion}%</div>
              <div className="text-xs text-terminal-accent/70">Overall Completion</div>
            </div>
          </div>

          {/* Current Week Progress Overview */}
          <div className="mb-6 p-4 border border-terminal-accent/30 bg-terminal-bg/30">
            <div className="flex items-center justify-between mb-3">
              <span className="text-terminal-accent font-medium">Week {currentWeek} Progress</span>
              <span className="text-2xl font-bold text-terminal-accent">{weekCompletion}%</span>
            </div>
            <Progress value={weekCompletion} className="h-3 mb-3" />
            
            {/* KPI Status Summary */}
            <div className="grid grid-cols-4 gap-4 text-center text-xs">
              <div>
                <div className="text-lg font-bold text-[#5FE3B3]">{kpiSummary.excellent}</div>
                <div className="text-terminal-accent/70">Excellent</div>
              </div>
              <div>
                <div className="text-lg font-bold text-[#FFD700]">{kpiSummary.good}</div>
                <div className="text-terminal-accent/70">Good</div>
              </div>
              <div>
                <div className="text-lg font-bold text-[#FF6B00]">{kpiSummary.fair}</div>
                <div className="text-terminal-accent/70">Fair</div>
              </div>
              <div>
                <div className="text-lg font-bold text-[#FF6B6B]">{kpiSummary.poor}</div>
                <div className="text-terminal-accent/70">Needs Work</div>
              </div>
            </div>
          </div>

          {/* Top Priority KPIs - Show first 6 in compact view */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {WEEKLY_KPI_DEFINITIONS.slice(0, 6).map(kpi => (
              <div key={kpi.id} className="border border-terminal-accent/30 p-4 bg-terminal-bg/20">
                <WeeklyProgressBar 
                  kpi={kpi} 
                  actualValue={currentWeekData[kpi.id] || 0} 
                  compact={true}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Trend Chart */}
        <div className="mb-8">
          <WeekStreakChart weekCount={6} />
        </div>

        {/* Goals Progress Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <GitBranch size={20} className="text-terminal-accent" />
              <h2 className="text-lg text-terminal-accent">2025 Goals Progress</h2>
            </div>
            <button 
              onClick={() => window.location.href = '/roadmap'}
              className="text-xs text-terminal-accent/50 hover:text-terminal-accent transition-colors"
            >
              View All →
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {goalsData.goals.slice(0, 4).map(goal => (
              <div key={goal.id} className="border border-terminal-accent/30 p-4 bg-terminal-bg/20">
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

        {/* System Health & Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* System Status */}
          <div className="border border-terminal-accent/30 p-4 bg-terminal-bg/20">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 size={16} className="text-[#5FE3B3]" />
              <span className="text-xs text-terminal-accent/50">System</span>
            </div>
            <div className="text-xl font-bold text-[#5FE3B3]">Online</div>
            <div className="text-xs text-terminal-accent/70">Data Synced</div>
          </div>

          {/* Active KPIs */}
          <div className="border border-terminal-accent/30 p-4 bg-terminal-bg/20">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 size={16} className="text-terminal-accent" />
              <span className="text-xs text-terminal-accent/50">Tracking</span>
            </div>
            <div className="text-xl font-bold text-terminal-accent">{WEEKLY_KPI_DEFINITIONS.length}</div>
            <div className="text-xs text-terminal-accent/70">Weekly KPIs</div>
          </div>

          {/* Performance Trend */}
          <div className="border border-terminal-accent/30 p-4 bg-terminal-bg/20">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp size={16} className="text-[#5FE3B3]" />
              <span className="text-xs text-terminal-accent/50">Trend</span>
            </div>
            <div className="text-xl font-bold text-[#5FE3B3]">↗ {weekCompletion}%</div>
            <div className="text-xs text-terminal-accent/70">This Week</div>
          </div>

          {/* Goals Tracking */}
          <div className="border border-terminal-accent/30 p-4 bg-terminal-bg/20">
            <div className="flex items-center justify-between mb-2">
              <Award size={16} className="text-[#FFD700]" />
              <span className="text-xs text-terminal-accent/50">Goals</span>
            </div>
            <div className="text-xl font-bold text-[#FFD700]">{goalsData.goals.length}</div>
            <div className="text-xs text-terminal-accent/70">Active Goals</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 