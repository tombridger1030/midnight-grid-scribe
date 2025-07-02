import React, { useState, useEffect } from 'react';
import { 
  WEEKLY_KPI_DEFINITIONS, 
  WeeklyKPIValues,
  getCurrentWeek,
  getWeeklyKPIRecord,
  updateWeeklyKPIRecord,
  calculateKPIProgress,
  getKPIStatus,
  formatWeekKey,
  calculateWeekCompletion,
  loadWeeklyKPIsWithSync
} from '@/lib/weeklyKpi';
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Target, TrendingUp, Plus, Minus } from 'lucide-react';

interface WeeklyKPIInputProps {
  onWeekChange?: (weekKey: string) => void;
}

const WeeklyKPIInput: React.FC<WeeklyKPIInputProps> = ({ onWeekChange }) => {
  const [currentWeek, setCurrentWeek] = useState(getCurrentWeek());
  const [values, setValues] = useState<WeeklyKPIValues>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load data from Supabase on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        await loadWeeklyKPIsWithSync();
        
        // Now load the current week's data
        const record = getWeeklyKPIRecord(currentWeek);
        setValues(record?.values || {});
        onWeekChange?.(currentWeek);
      } catch (error) {
        console.error('Failed to load weekly KPI data:', error);
        // Fall back to local data
        const record = getWeeklyKPIRecord(currentWeek);
        setValues(record?.values || {});
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Load data for current week when week changes
  useEffect(() => {
    if (!isLoading) {
      const record = getWeeklyKPIRecord(currentWeek);
      setValues(record?.values || {});
      onWeekChange?.(currentWeek);
    }
  }, [currentWeek, onWeekChange, isLoading]);

  // Navigate between weeks
  const navigateWeek = (direction: 'prev' | 'next') => {
    const [year, week] = currentWeek.split('-W').map(Number);
    let newWeek = week + (direction === 'next' ? 1 : -1);
    let newYear = year;

    if (newWeek < 1) {
      newWeek = 52; // Approximate - could be 53 in some years
      newYear -= 1;
    } else if (newWeek > 52) {
      newWeek = 1;
      newYear += 1;
    }

    const newWeekKey = `${newYear}-W${newWeek.toString().padStart(2, '0')}`;
    setCurrentWeek(newWeekKey);
  };

  // Update a KPI value
  const updateKPI = async (kpiId: string, value: number) => {
    const newValues = { ...values, [kpiId]: Math.max(0, value) }; // Ensure non-negative
    setValues(newValues);
    
    try {
      setIsSyncing(true);
      await updateWeeklyKPIRecord(currentWeek, { [kpiId]: Math.max(0, value) });
    } catch (error) {
      console.error('Failed to sync KPI update:', error);
      // The value is still updated locally, so the user sees the change
    } finally {
      setIsSyncing(false);
    }
  };

  // Increment KPI value
  const incrementKPI = (kpiId: string) => {
    const kpi = WEEKLY_KPI_DEFINITIONS.find(k => k.id === kpiId);
    const currentValue = values[kpiId] || 0;
    const step = kpi?.unit === 'hours' ? 0.5 : 1;
    updateKPI(kpiId, currentValue + step);
  };

  // Decrement KPI value
  const decrementKPI = (kpiId: string) => {
    const kpi = WEEKLY_KPI_DEFINITIONS.find(k => k.id === kpiId);
    const currentValue = values[kpiId] || 0;
    const step = kpi?.unit === 'hours' ? 0.5 : 1;
    updateKPI(kpiId, Math.max(0, currentValue - step));
  };

  // Get status color for progress bars
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-[#5FE3B3]';
      case 'good': return 'bg-[#FFD700]';
      case 'fair': return 'bg-[#FF6B00]';
      case 'poor': return 'bg-[#FF6B6B]';
      default: return 'bg-terminal-accent/30';
    }
  };

  // Group KPIs by category
  const kpisByCategory = WEEKLY_KPI_DEFINITIONS.reduce((acc, kpi) => {
    if (!acc[kpi.category]) {
      acc[kpi.category] = [];
    }
    acc[kpi.category].push(kpi);
    return acc;
  }, {} as Record<string, typeof WEEKLY_KPI_DEFINITIONS>);

  // Get category color (use first KPI color from each category)
  const getCategoryColor = (category: string): string => {
    const firstKPI = WEEKLY_KPI_DEFINITIONS.find(kpi => kpi.category === category);
    return firstKPI?.color || '#FF6B00';
  };

  const overallCompletion = calculateWeekCompletion(values);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-terminal-accent/70">Loading week data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Week Navigation Header */}
      <div className="flex items-center justify-between p-4 border border-terminal-accent/30 bg-terminal-bg/50">
        <button
          onClick={() => navigateWeek('prev')}
          className="terminal-button p-2"
        >
          <ChevronLeft size={16} />
        </button>
        
        <div className="text-center">
          <h2 className="text-lg text-terminal-accent font-medium">{formatWeekKey(currentWeek)}</h2>
          <div className="text-sm text-terminal-accent/70">
            Week {currentWeek}
            {isSyncing && <span className="ml-2 text-terminal-accent/50">• Syncing...</span>}
          </div>
        </div>
        
        <button
          onClick={() => navigateWeek('next')}
          className="terminal-button p-2"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Overall Progress */}
      <div className="p-4 border border-terminal-accent/30 bg-terminal-bg/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-terminal-accent" />
            <span className="text-terminal-accent font-medium">Week Completion</span>
          </div>
          <div className="text-2xl font-bold text-terminal-accent">{overallCompletion}%</div>
        </div>
        <Progress 
          value={overallCompletion} 
          className="h-3"
        />
        <div className="text-xs text-terminal-accent/70 mt-2">
          Overall progress across all KPIs
        </div>
      </div>

      {/* KPI Categories */}
      {Object.entries(kpisByCategory).map(([category, kpis]) => (
                 <div key={category} className="border p-4" style={{ borderColor: getCategoryColor(category) + '40' }}>
                     <h3 className="font-medium mb-4 capitalize flex items-center gap-2" style={{ color: getCategoryColor(category) }}>
             <TrendingUp size={16} />
             {category}
           </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {kpis.map(kpi => {
              const currentValue = values[kpi.id] || 0;
              const progress = calculateKPIProgress(kpi.id, currentValue);
              const status = getKPIStatus(kpi.id, currentValue);
              const isRange = kpi.minTarget !== undefined;
              
              return (
                <div key={kpi.id} className="space-y-3">
                  {/* KPI Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{kpi.name}</div>
                      <div className="text-xs text-terminal-accent/70">
                        Target: {isRange ? `${kpi.minTarget}-${kpi.target}` : kpi.target} {kpi.unit}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold" style={{ color: kpi.color }}>
                        {currentValue}
                      </div>
                      <div className="text-xs text-terminal-accent/70">
                        {Math.round(progress)}%
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <Progress 
                      value={progress} 
                      className="h-2"
                      style={{ 
                        '--progress-background': kpi.color,
                        '--progress-foreground': kpi.color
                      } as React.CSSProperties}
                    />
                    <div className="flex justify-between text-xs text-terminal-accent/50">
                      <span>0</span>
                      {isRange && (
                        <span className="text-terminal-accent/70">
                          Min: {kpi.minTarget}
                        </span>
                      )}
                      <span>Target: {kpi.target}</span>
                    </div>
                  </div>

                                     {/* Input Field with Increment/Decrement Buttons */}
                   <div className="flex items-center gap-3">
                     {/* Decrement Button */}
                     <button
                       onClick={() => decrementKPI(kpi.id)}
                       className="w-10 h-10 rounded border border-terminal-accent/30 hover:border-terminal-accent/60 bg-terminal-bg hover:bg-terminal-accent/10 flex items-center justify-center transition-colors"
                       style={{ borderColor: kpi.color + '40', color: kpi.color }}
                       disabled={currentValue <= 0}
                     >
                       <Minus size={16} />
                     </button>

                     {/* Input Field */}
                     <input
                       type="number"
                       min="0"
                       step={kpi.unit === 'hours' ? '0.5' : '1'}
                       value={currentValue}
                       onChange={(e) => updateKPI(kpi.id, parseFloat(e.target.value) || 0)}
                       className="terminal-input w-20 text-center"
                       placeholder="0"
                     />

                     {/* Increment Button */}
                     <button
                       onClick={() => incrementKPI(kpi.id)}
                       className="w-10 h-10 rounded border border-terminal-accent/30 hover:border-terminal-accent/60 bg-terminal-bg hover:bg-terminal-accent/10 flex items-center justify-center transition-colors"
                       style={{ borderColor: kpi.color + '40', color: kpi.color }}
                     >
                       <Plus size={16} />
                     </button>

                     {/* Status Badge */}
                     <div className={`px-3 py-1 text-xs rounded ${getStatusColor(status)} text-white font-medium`}>
                       {status.toUpperCase()}
                     </div>
                   </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div className="border border-terminal-accent/30 p-3">
          <div className="text-2xl font-bold text-[#5FE3B3]">
            {WEEKLY_KPI_DEFINITIONS.filter(kpi => getKPIStatus(kpi.id, values[kpi.id] || 0) === 'excellent').length}
          </div>
          <div className="text-xs text-terminal-accent/70">Excellent</div>
        </div>
        <div className="border border-terminal-accent/30 p-3">
          <div className="text-2xl font-bold text-[#FFD700]">
            {WEEKLY_KPI_DEFINITIONS.filter(kpi => getKPIStatus(kpi.id, values[kpi.id] || 0) === 'good').length}
          </div>
          <div className="text-xs text-terminal-accent/70">Good</div>
        </div>
        <div className="border border-terminal-accent/30 p-3">
          <div className="text-2xl font-bold text-[#FF6B00]">
            {WEEKLY_KPI_DEFINITIONS.filter(kpi => getKPIStatus(kpi.id, values[kpi.id] || 0) === 'fair').length}
          </div>
          <div className="text-xs text-terminal-accent/70">Fair</div>
        </div>
        <div className="border border-terminal-accent/30 p-3">
          <div className="text-2xl font-bold text-[#FF6B6B]">
            {WEEKLY_KPI_DEFINITIONS.filter(kpi => getKPIStatus(kpi.id, values[kpi.id] || 0) === 'poor').length}
          </div>
          <div className="text-xs text-terminal-accent/70">Needs Work</div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyKPIInput; 