import React, { useState, useEffect } from 'react';
import TypewriterText from '@/components/TypewriterText';
import { Progress } from "@/components/ui/progress";
import { 
  Target, Calendar, TrendingUp, Clock, CheckCircle2, 
  AlertCircle, Activity, BarChart3, GitBranch, Kanban,
  User, Flag, Zap, Award, Timer, ArrowUp, ArrowDown
} from 'lucide-react';
import { useMetrics } from '@/hooks/useTracker';
import { 
  Goal, 
  GoalsData, 
  loadGoalsData, 
  getCurrentMonth,
  type KanbanData,
  loadFinancialMetrics,
  FIXED_USER_ID
} from '@/lib/storage';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from 'recharts';
import { supabase } from '@/lib/supabase';
import { formatLocalDate, getCurrentLocalDate } from '@/lib/dateUtils';

// Sprint interface
interface Sprint {
  sprint_id: string;
  user_id: string;
  start_date: string;
  end_date?: string;
  status: 'active' | 'completed' | 'planned';
  name?: string;
  on_days?: number;
  off_days?: number;
}

const Dashboard = () => {
  const [goalsData, setGoalsData] = useState<GoalsData>({ goals: [] });
  const [kanbanData, setKanbanData] = useState<KanbanData | null>(null);
  const [financialData, setFinancialData] = useState({ mrr: 0, netWorth: 0 });
  const [sprintData, setSprintData] = useState({
    currentSprint: 1,
    daysLeft: 0,
    isOnPhase: true,
    sprintName: '',
    totalDays: 28,
    phase: 'ON' as 'ON' | 'OFF' | 'NONE',
    daysUntilNext: 0
  });
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const { metrics, dates } = useMetrics();
  const currentMonth = getCurrentMonth();

  // Helper function to safely get short sprint ID
  const getShortSprintId = (sprintId: string | number): string => {
    const idStr = String(sprintId);
    return idStr.length > 4 ? idStr.slice(-4) : idStr;
  };

  // Auto-update sprint status based on current date (same logic as Schedule page)
  const updateSprintStatuses = async (sprintData: Sprint[]) => {
    const today = getCurrentLocalDate();
    const todayDate = new Date(today);
    let needsUpdate = false;
    
    const updatedSprints = sprintData.map(sprint => {
      const sprintStart = new Date(sprint.start_date);
      const sprintEnd = sprint.end_date ? new Date(sprint.end_date) : null;
      
      let newStatus = sprint.status;
      
      // Auto-update status based on dates
      if (sprint.status === 'planned' && todayDate >= sprintStart) {
        newStatus = 'active';
        needsUpdate = true;
      } else if (sprint.status === 'active' && sprintEnd && todayDate > sprintEnd) {
        newStatus = 'completed';
        needsUpdate = true;
      }
      
      return { ...sprint, status: newStatus };
    });
    
    if (needsUpdate) {
      // Update statuses in database
      for (const sprint of updatedSprints) {
        if (sprint.status !== sprintData.find(s => s.sprint_id === sprint.sprint_id)?.status) {
          await supabase
            .from('sprints')
            .update({ status: sprint.status })
            .eq('sprint_id', sprint.sprint_id)
            .eq('user_id', FIXED_USER_ID);
        }
      }
      
      // Return updated data for immediate use
      return updatedSprints;
    }
    
    return sprintData;
  };

  // Load sprint data from Supabase
  const loadSprintData = async () => {
    try {
      const { data, error } = await supabase
        .from('sprints')
        .select('*')
        .eq('user_id', FIXED_USER_ID)
        .order('start_date', { ascending: true });
      
      if (error) {
        console.error('Error loading sprints:', error);
        return;
      }
      
      // Auto-update sprint statuses first
      const updatedSprints = await updateSprintStatuses(data || []);
      setSprints(updatedSprints);
      
      // Calculate current sprint data
      const today = getCurrentLocalDate();
      const todayDate = new Date(today);
      
      // Find active sprint
      const activeSprint = updatedSprints?.find(s => s.status === 'active');
      
      if (activeSprint) {
        const sprintStart = new Date(activeSprint.start_date);
        const onDays = activeSprint.on_days || 21;
        const offDays = activeSprint.off_days || 7;
        const totalCycleDays = onDays + offDays;
        
        // Calculate days since sprint start
        const daysSinceStart = Math.floor((todayDate.getTime() - sprintStart.getTime()) / (1000 * 60 * 60 * 24));
        
        // Calculate current cycle position
        const cyclePosition = daysSinceStart % totalCycleDays;
        const currentSprint = Math.floor(daysSinceStart / totalCycleDays) + 1;
        const isOnPhase = cyclePosition < onDays;
        const daysLeft = isOnPhase ? onDays - cyclePosition : totalCycleDays - cyclePosition;
        
        let phase: 'ON' | 'OFF' | 'NONE';
        let daysUntilNext = 0;
        
        if (isOnPhase) {
          phase = 'ON';
          daysUntilNext = 0; // Not applicable during ON phase
        } else {
          phase = 'OFF';
          daysUntilNext = totalCycleDays - cyclePosition; // Days until next ON phase
        }
        
        setSprintData({
          currentSprint,
          daysLeft,
          isOnPhase,
          sprintName: activeSprint.name || `Sprint ${getShortSprintId(activeSprint.sprint_id)}`,
          totalDays: totalCycleDays,
          phase,
          daysUntilNext
        });
      } else {
        // Check if there's a planned sprint coming up
        const plannedSprint = updatedSprints?.find(s => s.status === 'planned');
        
        if (plannedSprint) {
          const sprintStart = new Date(plannedSprint.start_date);
          const daysUntilStart = Math.ceil((sprintStart.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
          
          setSprintData({
            currentSprint: 1,
            daysLeft: 0,
            isOnPhase: false,
            sprintName: plannedSprint.name || 'Upcoming Sprint',
            totalDays: 28,
            phase: 'NONE',
            daysUntilNext: daysUntilStart > 0 ? daysUntilStart : 0
          });
        } else {
          // No active or planned sprint
          setSprintData({
            currentSprint: 1,
            daysLeft: 0,
            isOnPhase: false,
            sprintName: 'No Active Sprint',
            totalDays: 28,
            phase: 'NONE',
            daysUntilNext: 0
          });
        }
      }
    } catch (err) {
      console.error('Failed to load sprint data:', err);
      // Set fallback values on error
      setSprintData({
        currentSprint: 1,
        daysLeft: 0,
        isOnPhase: false,
        sprintName: 'Error Loading Sprint',
        totalDays: 28,
        phase: 'NONE',
        daysUntilNext: 0
      });
    }
  };

  // Load all data on mount
  useEffect(() => {
    const loadDashboardData = async () => {
      // Load goals data
      const goals = loadGoalsData();
      setGoalsData(goals);

      // Load kanban data
      const kanbanStored = localStorage.getItem('noctisium-kanban');
      if (kanbanStored) {
        setKanbanData(JSON.parse(kanbanStored));
      }

      // Load financial data
      try {
        const financial = await loadFinancialMetrics();
        setFinancialData(financial);
      } catch (error) {
        console.error('Failed to load financial data:', error);
      }

      // Load sprint data
      await loadSprintData();
    };

    loadDashboardData();
  }, []);

  // Refresh sprint data every 10 seconds to keep it current
  useEffect(() => {
    const interval = setInterval(loadSprintData, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  // Calculate recent metrics summary
  const getRecentMetricsSummary = () => {
    if (!metrics.length || !dates.length) return null;

    const recentDates = dates.slice(-7); // Last 7 days
    const deepWorkMetric = metrics.find(m => m.id === 'deepWork');
    const sleepMetric = metrics.find(m => m.id === 'sleepHours');
    const jiuJitsuMetric = metrics.find(m => m.id === 'jiuJitsuSessions');
    const noDopamineMetric = metrics.find(m => m.id === 'noDopamine');

    let totalDeepWork = 0;
    let avgSleep = 0;
    let jiuJitsuSessions = 0;
    let noDopamineDays = 0;
    let validSleepDays = 0;

    recentDates.forEach(date => {
      if (deepWorkMetric?.values[date]) {
        totalDeepWork += Number(deepWorkMetric.values[date]) || 0;
      }
      if (sleepMetric?.values[date]) {
        avgSleep += Number(sleepMetric.values[date]) || 0;
        validSleepDays++;
      }
      if (jiuJitsuMetric?.values[date] && Number(jiuJitsuMetric.values[date]) > 0) {
        jiuJitsuSessions++;
      }
      if (noDopamineMetric?.values[date] === true) {
        noDopamineDays++;
      }
    });

    avgSleep = validSleepDays > 0 ? avgSleep / validSleepDays : 0;

    return {
      totalDeepWork: totalDeepWork.toFixed(1),
      avgSleep: avgSleep.toFixed(1),
      jiuJitsuSessions,
      noDopamineDays,
      totalDays: recentDates.length
    };
  };

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

  // Calculate habit compliance for recent days
  const getHabitCompliance = () => {
    if (!metrics.length || !dates.length) return 0;

    const recentDates = dates.slice(-30); // Last 30 days
    let compliantDays = 0;

    recentDates.forEach(date => {
      const wakingTimeMetric = metrics.find(m => m.id === 'wakingTime');
      const deepWorkMetric = metrics.find(m => m.id === 'deepWork');
      const jiuJitsuMetric = metrics.find(m => m.id === 'jiuJitsuSessions');
      const weightliftingMetric = metrics.find(m => m.id === 'weightliftingSessions');
      const noDopamineMetric = metrics.find(m => m.id === 'noDopamine');

      // Check wake time (4AM-5AM)
      const wakeTime = wakingTimeMetric?.values[date]?.toString() || '';
      const isValidWakeTime = wakeTime && (() => {
        const [hours, minutes] = wakeTime.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return false;
        const totalMinutes = hours * 60 + minutes;
        return totalMinutes >= 240 && totalMinutes < 300; // 4:00-4:59 AM
      })();

      // Check deep work (3+ hours)
      const deepWorkHours = parseFloat(deepWorkMetric?.values[date]?.toString() || '0');
      const hasDeepWork = deepWorkHours >= 3;

      // Check exercise (BJJ or weightlifting)
      const jiuJitsuSessions = parseFloat(jiuJitsuMetric?.values[date]?.toString() || '0');
      const weightliftingSessions = parseFloat(weightliftingMetric?.values[date]?.toString() || '0');
      const hasExercise = jiuJitsuSessions >= 1 || weightliftingSessions >= 1;

      // Check no dopamine
      const noDopamine = noDopamineMetric?.values[date] === true;

      if (isValidWakeTime && hasDeepWork && hasExercise && noDopamine) {
        compliantDays++;
      }
    });

    return Math.round((compliantDays / recentDates.length) * 100);
  };

  // Get deep work trend data for mini chart
  const getDeepWorkTrend = () => {
    if (!metrics.length || !dates.length) return [];
    
    const deepWorkMetric = metrics.find(m => m.id === 'deepWork');
    if (!deepWorkMetric) return [];
    
    const recentDates = dates.slice(-14); // Last 14 days
    return recentDates.map(date => ({
      date,
      value: Number(deepWorkMetric.values[date]) || 0
    }));
  };

  const recentMetrics = getRecentMetricsSummary();
  const habitCompliance = getHabitCompliance();
  const deepWorkTrend = getDeepWorkTrend();

  // Calculate kanban stats
  const kanbanStats = kanbanData ? {
    totalTasks: Object.values(kanbanData.tasks).filter(task => !task.isDeleted).length,
    completedTasks: kanbanData.columns.done?.taskIds.length || 0,
    inProgressTasks: kanbanData.columns['in-progress']?.taskIds.length || 0,
    totalTimeLogged: Object.values(kanbanData.tasks)
      .filter(task => !task.isDeleted)
      .reduce((sum, task) => sum + task.timeSpent, 0)
  } : null;

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <TypewriterText text="Dashboard" className="text-xl mb-2" />
        <p className="text-terminal-accent/70 text-sm">
          System overview and performance metrics
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[minmax(100px,auto)]">
          
          {/* Sprint Status - Large Card */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2 bg-terminal-bg border border-terminal-accent/20 p-6 relative overflow-hidden group hover:border-terminal-accent/40 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#5FE3B3]/10 to-transparent rounded-full blur-2xl"></div>
            <div className="relative z-10">
              <h3 className="text-xs uppercase text-terminal-accent/70 mb-4 tracking-wider">Current Sprint</h3>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-5xl font-bold text-terminal-accent">#{sprintData.currentSprint}</span>
                <span className={`text-lg font-medium ${
                  sprintData.phase === 'ON' ? 'text-[#5FE3B3]' : 
                  sprintData.phase === 'OFF' ? 'text-[#53B4FF]' : 
                  'text-[#FFD700]'
                }`}>
                  {sprintData.phase}
                </span>
              </div>
              {sprintData.sprintName && (
                <div className="text-sm text-terminal-accent/70 mb-4">{sprintData.sprintName}</div>
              )}
              <div className="space-y-3">
                {sprintData.phase === 'ON' ? (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-terminal-accent/70">Phase Progress</span>
                      <span className="text-terminal-accent">{sprintData.daysLeft} days left</span>
                    </div>
                    <Progress 
                      value={((21 - sprintData.daysLeft) / 21) * 100} 
                      className="h-2"
                    />
                  </div>
                ) : sprintData.phase === 'OFF' ? (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-terminal-accent/70">Recovery Phase</span>
                      <span className="text-terminal-accent">{sprintData.daysUntilNext} days until next ON</span>
                    </div>
                    <div className="text-sm text-[#53B4FF]">Currently in OFF phase</div>
                  </div>
                ) : (
                  <div>
                    <div className="text-sm text-[#FFD700]">
                      {sprintData.daysUntilNext > 0 ? 
                        `Next sprint starts in ${sprintData.daysUntilNext} days` : 
                        'No active sprint scheduled'
                      }
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <div className="text-2xl font-bold text-[#FFD700]">{habitCompliance}%</div>
                    <div className="text-xs text-terminal-accent/70">30-Day Compliance</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-terminal-accent">{dates.length}</div>
                    <div className="text-xs text-terminal-accent/70">Days Tracked</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Deep Work Summary - Medium Card with Chart */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2 row-span-1 bg-terminal-bg border border-terminal-accent/20 p-6 group hover:border-terminal-accent/40 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xs uppercase text-terminal-accent/70 tracking-wider">Deep Work</h3>
                <div className="text-3xl font-bold text-[#FF6B00] mt-1">{recentMetrics?.totalDeepWork || '0'}h</div>
                <div className="text-xs text-terminal-accent/70 mt-1">Last 7 days</div>
              </div>
              <div className="w-24 h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={deepWorkTrend}>
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#FF6B00" 
                      strokeWidth={2}
                      dot={false}
                    />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--bg-panel)', 
                        border: '1px solid var(--line-faint)',
                        fontSize: '10px'
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Financial Overview - Medium Card */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2 row-span-1 bg-terminal-bg border border-terminal-accent/20 p-6 group hover:border-terminal-accent/40 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-xs uppercase text-terminal-accent/70 tracking-wider mb-4">Financial</h3>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <div className="text-xs text-terminal-accent/70 mb-1">MRR</div>
                    <div className="text-2xl font-bold text-[#FFD700]">${financialData.mrr.toLocaleString()}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <ArrowUp size={12} className="text-[#5FE3B3]" />
                      <span className="text-xs text-[#5FE3B3]">+12.5%</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-terminal-accent/70 mb-1">Net Worth</div>
                    <div className="text-2xl font-bold text-[#5FE3B3]">${(financialData.netWorth / 1000).toFixed(0)}k</div>
                    <div className="text-xs text-terminal-accent/70 mt-1">CAD</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Echo Project - Wide Card */}
          <div className="col-span-1 md:col-span-2 lg:col-span-4 row-span-1 bg-terminal-bg border border-terminal-accent/20 p-6 group hover:border-terminal-accent/40 transition-all">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xs uppercase text-terminal-accent/70 tracking-wider">Echo Project</h3>
              <Kanban size={16} className="text-terminal-accent/50" />
            </div>
            {kanbanStats && (
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <div className="text-2xl font-bold text-terminal-accent">{kanbanStats.totalTasks}</div>
                  <div className="text-xs text-terminal-accent/70">Total Tasks</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#5FE3B3]">{kanbanStats.completedTasks}</div>
                  <div className="text-xs text-terminal-accent/70">Completed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#53B4FF]">{kanbanStats.inProgressTasks}</div>
                  <div className="text-xs text-terminal-accent/70">In Progress</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#FFD700]">{Math.round((kanbanStats.completedTasks / kanbanStats.totalTasks) * 100)}%</div>
                  <div className="text-xs text-terminal-accent/70">Complete</div>
                </div>
              </div>
            )}
          </div>

          {/* Metrics Summary - Small Cards */}
          {recentMetrics && (
            <>
              <div className="col-span-1 bg-terminal-bg border border-terminal-accent/20 p-4 group hover:border-terminal-accent/40 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <Activity size={14} className="text-[#53B4FF]" />
                  <span className="text-xs text-terminal-accent/50">7 days</span>
                </div>
                <div className="text-xl font-bold text-[#53B4FF]">{recentMetrics.avgSleep}h</div>
                <div className="text-xs text-terminal-accent/70">Avg Sleep</div>
              </div>

              <div className="col-span-1 bg-terminal-bg border border-terminal-accent/20 p-4 group hover:border-terminal-accent/40 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <Target size={14} className="text-[#5FE3B3]" />
                  <span className="text-xs text-terminal-accent/50">7 days</span>
                </div>
                <div className="text-xl font-bold text-[#5FE3B3]">{recentMetrics.jiuJitsuSessions}</div>
                <div className="text-xs text-terminal-accent/70">BJJ Sessions</div>
              </div>

              <div className="col-span-1 bg-terminal-bg border border-terminal-accent/20 p-4 group hover:border-terminal-accent/40 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <Zap size={14} className="text-[#FFD700]" />
                  <span className="text-xs text-terminal-accent/50">7 days</span>
                </div>
                <div className="text-xl font-bold text-[#FFD700]">{recentMetrics.noDopamineDays}/{recentMetrics.totalDays}</div>
                <div className="text-xs text-terminal-accent/70">No Dopamine</div>
              </div>

              <div className="col-span-1 bg-terminal-bg border border-terminal-accent/20 p-4 group hover:border-terminal-accent/40 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle2 size={14} className="text-[#5FE3B3]" />
                  <span className="text-xs text-terminal-accent/50">Active</span>
                </div>
                <div className="text-xl font-bold text-terminal-accent">{metrics.length}</div>
                <div className="text-xs text-terminal-accent/70">Metrics</div>
              </div>
            </>
          )}

          {/* Goals Progress - Wide Card */}
          <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-terminal-bg border border-terminal-accent/20 p-6 group hover:border-terminal-accent/40 transition-all">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs uppercase text-terminal-accent/70 tracking-wider">2025 Goals Progress</h3>
              <button 
                onClick={() => window.location.href = '/roadmap'}
                className="text-xs text-terminal-accent/50 hover:text-terminal-accent transition-colors"
              >
                View All →
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {goalsData.goals.slice(0, 4).map(goal => (
                <div key={goal.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{goal.name}</span>
                    <span className={`text-xs ${getCategoryColor(goal.category)}`}>{Math.round(goal.progressPct * 100)}%</span>
                  </div>
                  <Progress value={goal.progressPct * 100} className="h-1.5" />
                  <div className="text-xs text-terminal-accent/50">
                    {goal.currentTotal.toLocaleString()} / {goal.yearlyTarget.toLocaleString()} {goal.unit}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Enhanced Cards Row */}
          <div className="col-span-1 md:col-span-2 lg:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* System Health Card */}
            <div className="bg-terminal-bg border border-terminal-accent/20 p-4 group hover:border-terminal-accent/40 transition-all">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 size={14} className="text-[#5FE3B3]" />
                <span className="text-xs text-terminal-accent/50">System</span>
              </div>
              <div className="text-xl font-bold text-[#5FE3B3]">Online</div>
              <div className="text-xs text-terminal-accent/70">Supabase Sync</div>
              <div className="text-xs text-terminal-accent/50 mt-1">Last: 2 min ago</div>
            </div>

            {/* Today's Focus Card */}
            <div className="bg-terminal-bg border border-terminal-accent/20 p-4 group hover:border-terminal-accent/40 transition-all">
              <div className="flex items-center justify-between mb-2">
                <Target size={14} className="text-[#FF6B00]" />
                <span className="text-xs text-terminal-accent/50">Today</span>
              </div>
              <div className="text-xl font-bold text-[#FF6B00]">{getCurrentLocalDate()}</div>
              <div className={`text-xs text-terminal-accent/70 ${
                sprintData.phase === 'ON' ? 'text-[#5FE3B3]' : 
                sprintData.phase === 'OFF' ? 'text-[#53B4FF]' : 
                'text-[#FFD700]'
              }`}>
                Sprint Day {sprintData.phase}
              </div>
              <div className="text-xs text-terminal-accent/50 mt-1">
                {sprintData.phase === 'ON' ? 
                  `${sprintData.daysLeft} days left` : 
                  sprintData.phase === 'OFF' ? 
                    `${sprintData.daysUntilNext} days until next ON` : 
                    sprintData.daysUntilNext > 0 ? 
                      `${sprintData.daysUntilNext} days until start` : 
                      'No sprint active'
                }
              </div>
            </div>

            {/* Streak Tracker Card */}
            <div className="bg-terminal-bg border border-terminal-accent/20 p-4 group hover:border-terminal-accent/40 transition-all">
              <div className="flex items-center justify-between mb-2">
                <Flag size={14} className="text-[#FFD700]" />
                <span className="text-xs text-terminal-accent/50">Streak</span>
              </div>
              <div className="text-xl font-bold text-[#FFD700]">{dates.length}</div>
              <div className="text-xs text-terminal-accent/70">Days Tracked</div>
              <div className="text-xs text-terminal-accent/50 mt-1">Current streak</div>
            </div>

            {/* Performance Trends Card */}
            <div className="bg-terminal-bg border border-terminal-accent/20 p-4 group hover:border-terminal-accent/40 transition-all">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp size={14} className="text-[#53B4FF]" />
                <span className="text-xs text-terminal-accent/50">Trend</span>
              </div>
              <div className="text-xl font-bold text-[#53B4FF]">↗ +{habitCompliance}%</div>
              <div className="text-xs text-terminal-accent/70">Compliance</div>
              <div className="text-xs text-terminal-accent/50 mt-1">vs last month</div>
            </div>
          </div>

          {/* Weekly Rhythm Card - Wide */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2 bg-terminal-bg border border-terminal-accent/20 p-6 group hover:border-terminal-accent/40 transition-all">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xs uppercase text-terminal-accent/70 tracking-wider">Weekly Rhythm</h3>
              <Calendar size={16} className="text-terminal-accent/50" />
            </div>
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => {
                const isToday = new Date().getDay() === idx;
                const isSprintDay = (idx + 1) % 7 !== 0; // Simplified sprint day logic
                return (
                  <div 
                    key={idx} 
                    className={`text-center p-2 text-xs border ${
                      isToday ? 'border-terminal-accent bg-terminal-accent/10' : 
                      isSprintDay ? 'border-[#5FE3B3]/50' : 'border-terminal-accent/20'
                    }`}
                  >
                    <div className="font-medium">{day}</div>
                    <div className={`w-2 h-2 rounded-full mx-auto mt-1 ${
                      isSprintDay ? 'bg-[#5FE3B3]' : 'bg-terminal-accent/30'
                    }`}></div>
                  </div>
                );
              })}
            </div>
            <div className="text-xs text-terminal-accent/70">
              Next phase transition: {sprintData.daysLeft} days
            </div>
          </div>

          {/* Achievement Highlights Card - Wide */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2 bg-terminal-bg border border-terminal-accent/20 p-6 group hover:border-terminal-accent/40 transition-all">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xs uppercase text-terminal-accent/70 tracking-wider">Recent Achievements</h3>
              <Award size={16} className="text-terminal-accent/50" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#5FE3B3]"></div>
                <div className="text-sm">
                  <div className="text-terminal-accent">Sprint #{sprintData.currentSprint} Started</div>
                  <div className="text-xs text-terminal-accent/50">Current cycle active</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#FFD700]"></div>
                <div className="text-sm">
                  <div className="text-terminal-accent">{dates.length} Days Tracked</div>
                  <div className="text-xs text-terminal-accent/50">Consistent logging</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#FF6B00]"></div>
                <div className="text-sm">
                  <div className="text-terminal-accent">{recentMetrics?.totalDeepWork || 0}h Deep Work</div>
                  <div className="text-xs text-terminal-accent/50">Last 7 days</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 