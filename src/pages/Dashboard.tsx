import React, { useState, useEffect } from 'react';
import TypewriterText from '@/components/TypewriterText';
import WeeklyProgressBar from '@/components/WeeklyProgressBar';
import WeekStreakChart from '@/components/WeekStreakChart';
import RevenueLostCounter from '@/components/RevenueLostCounter';
import { Progress } from "@/components/ui/progress";
import { useSkillProgressionStore } from '@/stores/skillProgressionStore';
import { 
  Target, TrendingUp, CheckCircle2, BarChart3, GitBranch, Award, Brain
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
  
  // Skill progression store
  const {
    skills,
    getOverallProgress,
    getUpcomingCheckpoints,
    getOverdueCheckpoints,
    loadSkillsFromSupabase,
    calculateProgressFromKPIs
  } = useSkillProgressionStore();

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
        
        // Load skill progression data
        await loadSkillsFromSupabase();
        
        // Calculate skill progression from current week's KPIs
        await calculateProgressFromKPIs();
        
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
          Real-time opportunity tracking and KPI trends
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Main Revenue Lost Counter */}
        <div className="mb-8">
          <RevenueLostCounter
            startDate="2025-07-08T21:00:00-07:00"
            targetARR={1000000}
            currency="USD"
          />
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

        {/* Skill Progression Summary */}
        <div className="mt-8 border border-terminal-accent/30 p-4 bg-terminal-bg/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain size={20} className="text-[#9D4EDD]" />
              <h2 className="text-lg text-terminal-accent">Skill Progression</h2>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-[#9D4EDD]">{getOverallProgress()}%</div>
              <div className="text-xs text-terminal-accent/70">Overall Progress</div>
            </div>
          </div>
          
          <div className="mb-4">
            <Progress 
              value={getOverallProgress()} 
              className="h-2"
              style={{ '--progress-background': '#9D4EDD' } as React.CSSProperties}
            />
          </div>
          
          <div className="space-y-3">
            {/* Skills Checkpoints - Vertical Layout */}
            <div className="text-sm text-terminal-accent/70 mb-2">Next Skill Checkpoints</div>
            <div className="space-y-2">
              {skills.map(skill => {
                // Get the next incomplete checkpoint for this skill
                const nextCheckpoint = skill.checkpoints
                  .filter(cp => !cp.isCompleted)
                  .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())[0];
                
                if (!nextCheckpoint) return null;
                
                // Calculate days until target date
                const daysUntil = Math.ceil((new Date(nextCheckpoint.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const isOverdue = daysUntil < 0;
                
                return (
                  <div key={skill.id} className="p-3 border border-terminal-accent/20 bg-terminal-bg/10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{skill.icon}</span>
                        <div>
                          <div className="text-sm font-medium">{skill.name}</div>
                          <div className="text-xs text-terminal-accent/70">{skill.category}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold" style={{ color: skill.color }}>
                          {nextCheckpoint.progressPercentage.toFixed(1)}%
                        </div>
                        <div className="text-xs text-terminal-accent/70">
                          {isOverdue ? `${Math.abs(daysUntil)} days late` : `${daysUntil} days left`}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-2">
                      <div className="text-xs font-medium mb-1">{nextCheckpoint.name}</div>
                      <div className="text-xs text-terminal-accent/70">{nextCheckpoint.description}</div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-terminal-accent/20 rounded overflow-hidden">
                        <div 
                          className="h-full transition-all duration-300"
                          style={{ 
                            width: `${nextCheckpoint.progressPercentage}%`,
                            backgroundColor: skill.color
                          }}
                        />
                      </div>
                      <div className="text-xs text-terminal-accent/70 min-w-0">
                        {new Date(nextCheckpoint.targetDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Overdue Summary */}
            {getOverdueCheckpoints().length > 0 && (
              <div className="mt-3 p-2 border border-red-400/30 bg-red-400/10">
                <div className="text-sm text-red-400 font-medium mb-1">
                  ⚠️ {getOverdueCheckpoints().length} Overdue Checkpoint{getOverdueCheckpoints().length > 1 ? 's' : ''}
                </div>
                <div className="text-xs text-terminal-accent/70">
                  Review and update your skill progression plan
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 