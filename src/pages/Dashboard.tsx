import React, { useState, useEffect } from 'react';
import TypewriterText from '@/components/TypewriterText';
import WeeklyProgressBar from '@/components/WeeklyProgressBar';
import WeekStreakChart from '@/components/WeekStreakChart';
import RevenueLostCounter from '@/components/RevenueLostCounter';
import { Progress } from "@/components/ui/progress";
import { useSkillProgressionStore } from '@/stores/skillProgressionStore';
import { ShipFeed } from '@/components/ShipFeed';
import { PriorityManager } from '@/components/PriorityManager';
import { WeeklyConstraint } from '@/components/WeeklyConstraint';
import { AlertSystem } from '@/components/AlertSystem';
import {
  Target, TrendingUp, CheckCircle2, BarChart3, GitBranch, Award, Brain, Ship, Focus
} from 'lucide-react';
import { 
  Goal, 
  GoalsData, 
  loadGoalsData, 
  getCurrentMonth
} from '@/lib/storage';
import { loadRecentContent } from '@/lib/storage';
import {
  loadWeeklyKPIs,
  getCurrentWeek,
  getWeeklyKPIRecord,
  calculateWeekCompletion,
  WeeklyKPIValues,
  loadWeeklyKPIsWithSync,
  calculateKPIProgress,
  getKPIStatus
} from '@/lib/weeklyKpi';
import { kpiManager, ConfigurableKPI } from '@/lib/configurableKpis';

const Dashboard = () => {
  const [goalsData, setGoalsData] = useState<GoalsData>({ goals: [] });
  const [currentWeekData, setCurrentWeekData] = useState<WeeklyKPIValues>({});
  const [isLoading, setIsLoading] = useState(true);
  const [contentSnapshot, setContentSnapshot] = useState<{ views: number; follows: number } | null>(null);
  const [userKPIs, setUserKPIs] = useState<ConfigurableKPI[]>([]);
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

        // Load user's configured KPIs first
        const activeKPIs = await kpiManager.getActiveKPIs();
        setUserKPIs(activeKPIs);

        // Load weekly KPI data from Supabase
        await loadWeeklyKPIsWithSync();
        
        // Load current week KPI data
        const weekRecord = getWeeklyKPIRecord(currentWeek);
        setCurrentWeekData(weekRecord?.values || {});
        
        // Load skill progression data
        await loadSkillsFromSupabase();
        
        // Calculate skill progression from current week's KPIs
        await calculateProgressFromKPIs();

        // Content snapshot (recent 10 items)
        try {
          const recent = await loadRecentContent(10);
          const views = recent.reduce((s, r) => s + (Number(r.views || 0)), 0);
          const follows = recent.reduce((s, r) => s + (Number(r.follows || 0)), 0);
          setContentSnapshot({ views, follows });
        } catch (e) {}
        
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

  // Get category color (use first KPI color from each category)
  const getCategoryColor = (category: string): string => {
    const firstKPI = userKPIs.find(kpi => kpi.category === category);
    return firstKPI?.color || '#FF6B00';
  };

  // Calculate overall week completion
  const weekCompletion = Math.round(kpiManager.calculateWeekCompletion(currentWeekData, userKPIs));

  // Get KPI summary stats
  const getKPISummary = () => {
    let excellent = 0;
    let good = 0;
    let fair = 0;
    let poor = 0;

    userKPIs.forEach(kpi => {
      const value = currentWeekData[kpi.kpi_id] || 0;
      const status = getKPIStatus(kpi.kpi_id, value);

      switch (status) {
        case 'excellent':
          excellent++;
          break;
        case 'good':
          good++;
          break;
        case 'fair':
          fair++;
          break;
        case 'poor':
          poor++;
          break;
      }
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
        {/* Alert System */}
        <div className="mb-6">
          <AlertSystem />
        </div>

        {/* Noctisium Core Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Priority and Constraint */}
          <div className="space-y-6">
            <PriorityManager />
            <WeeklyConstraint />
          </div>

          {/* Ship Feed with GitHub Commits and Recent Content */}
          <div>
            <ShipFeed maxItems={5} />
          </div>
        </div>

        {/* Main Revenue Lost Counter */}
        <div className="mb-8">
          <RevenueLostCounter
            startDate="2025-07-08T21:00:00-07:00"
            targetARR={1000000}
            currency="USD"
          />
        </div>

      </div>
    </div>
  );
};

export default Dashboard; 