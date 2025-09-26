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
import { getWeeklyDailyValues, updateWeeklyDailyValue, getWeekDayDates, setWeeklyDailyValues, loadWeeklyEntriesForWeek } from '@/lib/weeklyKpi';
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
  const [editingDay, setEditingDay] = useState<Record<string, number | null>>({});

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
      const loadWeek = async () => {
        await loadWeeklyEntriesForWeek(currentWeek);
        const record = getWeeklyKPIRecord(currentWeek);
        setValues(record?.values || {});
        onWeekChange?.(currentWeek);
      };
      loadWeek();
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
      // If set to zero, clear all daily dots for that KPI
      if (Math.max(0, value) === 0) {
        await setWeeklyDailyValues(currentWeek, kpiId, new Array(7).fill(0));
        const record = getWeeklyKPIRecord(currentWeek);
        setValues(record?.values || {});
      }
    } catch (error) {
      console.error('Failed to sync KPI update:', error);
      // The value is still updated locally, so the user sees the change
    } finally {
      setIsSyncing(false);
    }
  };

  // Increment KPI value (or selected day's value if a day is active)
  const incrementKPI = async (kpiId: string) => {
    const kpi = WEEKLY_KPI_DEFINITIONS.find(k => k.id === kpiId);
    const step = kpi?.unit === 'hours' ? 0.5 : 1;
    const activeIdx = Number.isInteger(editingDay[kpiId] as number) ? (editingDay[kpiId] as number) : null;
    if (activeIdx !== null) {
      const daily = getWeeklyDailyValues(currentWeek, kpiId);
      const next = Math.max(0, Number(daily[activeIdx] || 0) + step);
      await updateWeeklyDailyValue(currentWeek, kpiId, activeIdx, next);
      const record = getWeeklyKPIRecord(currentWeek);
      setValues(record?.values || {});
    } else {
      const currentValue = values[kpiId] || 0;
      updateKPI(kpiId, currentValue + step);
    }
  };

  // Decrement KPI value (or selected day's value if a day is active)
  const decrementKPI = async (kpiId: string) => {
    const kpi = WEEKLY_KPI_DEFINITIONS.find(k => k.id === kpiId);
    const step = kpi?.unit === 'hours' ? 0.5 : 1;
    const activeIdx = Number.isInteger(editingDay[kpiId] as number) ? (editingDay[kpiId] as number) : null;
    if (activeIdx !== null) {
      const daily = getWeeklyDailyValues(currentWeek, kpiId);
      const next = Math.max(0, Number(daily[activeIdx] || 0) - step);
      await updateWeeklyDailyValue(currentWeek, kpiId, activeIdx, next);
      const record = getWeeklyKPIRecord(currentWeek);
      setValues(record?.values || {});
    } else {
      const currentValue = values[kpiId] || 0;
      updateKPI(kpiId, Math.max(0, currentValue - step));
    }
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

  // Helper: compute suggested per-day values needed to reach minTarget or target
  const getPerDaySuggestions = (kpiId: string) => {
    const kpi = WEEKLY_KPI_DEFINITIONS.find(k => k.id === kpiId);
    if (!kpi) return null;

    const daily = getWeeklyDailyValues(currentWeek, kpiId);
    const weekDates = getWeekDayDates(currentWeek);
    const today = new Date();
    today.setHours(0,0,0,0);

    // Determine remaining days including today if today has not passed
    const remainingDayIndexes: number[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekDates[i]);
      d.setHours(0,0,0,0);
      if (d.getTime() >= today.getTime()) {
        remainingDayIndexes.push(i);
      }
    }
    if (remainingDayIndexes.length === 0) return null;

    const achieved = daily.reduce((s, n) => s + (Number.isFinite(n) ? Number(n) : 0), 0);
    
    // Handle special KPIs
    let goalMin: number;
    let remainingTotal: number;
    
    if (kpiId === 'sleepAverage') {
      // For sleep, we want to achieve the target average per night
      const targetHoursPerNight = typeof kpi.minTarget === 'number' && kpi.minTarget > 0 ? kpi.minTarget : kpi.target;
      const daysWithData = daily.filter(v => Number(v) > 0).length;
      const currentAvg = daysWithData > 0 ? achieved / daysWithData : 0;
      
      // If we're already meeting the target average, no suggestions needed
      if (currentAvg >= targetHoursPerNight) return new Array(7).fill('');
      
      // For remaining days, suggest the target hours per night
      goalMin = targetHoursPerNight;
      remainingTotal = goalMin * remainingDayIndexes.length; // Each remaining day needs target hours
    } else if (kpiId === 'noCompromises') {
      // For no compromises, suggest 1 for each remaining day if not already perfect
      const currentStreak = Math.max(...daily.map((_, i) => {
        let streak = 0;
        for (let j = i; j < daily.length && daily[j] > 0; j++) streak++;
        return streak;
      }));
      
      if (currentStreak >= 7) return new Array(7).fill(''); // Already perfect
      
      // Suggest 1 for each remaining day
      const suggestions: (string | '')[] = new Array(7).fill('');
      remainingDayIndexes.forEach(idx => {
        suggestions[idx] = '1';
      });
      return suggestions;
    } else {
      // Standard KPIs
      goalMin = typeof kpi.minTarget === 'number' && kpi.minTarget > 0 ? kpi.minTarget : kpi.target;
      remainingTotal = Math.max(0, goalMin - achieved);
      
      // Debug logging for problematic KPIs
      if (kpiId === 'deepWorkHours' || kpiId === 'bjjSessions' || kpiId === 'prRequests') {
        console.log(`${kpiId} Debug:`, {
          achieved,
          goalMin,
          minTarget: kpi.minTarget,
          target: kpi.target,
          remainingTotal,
          remainingDays: remainingDayIndexes.length,
          perDay: remainingTotal / remainingDayIndexes.length,
          dailyValues: daily
        });
      }
    }
    
    if (remainingTotal <= 0) return new Array(7).fill('');

    const n = remainingDayIndexes.length;
    const base = remainingTotal / n;

    // Format to fit 1–2 digits: for hours, show at most one decimal (e.g., 16.3)
    const formatCompact = (v: number): string => {
      if (kpi.unit === 'hours') {
        // Round to nearest 0.25 to align with existing 0.5 step while staying compact
        const rounded = Math.round(v * 4) / 4;
        if (rounded < 10) {
          return rounded.toFixed(1).replace(/\.0$/, '');
        } else {
          return Math.round(rounded).toString();
        }
      }
      // For non-hour units, round up to ensure we hit the goal
      // (e.g., if you need 0.67 sessions per day, suggest 1 session)
      return String(Math.ceil(v));
    };

    // Spread remainder cleanly by adding small increments to the earliest remaining days
    const suggestions: (string | '')[] = new Array(7).fill('');
    
    if (kpi.unit === 'hours') {
      // For hours, use fractional distribution
      const step = 0.25;
      const remainder = remainingTotal - base * n;
      let extraUnits = Math.round(remainder / step);
      
      remainingDayIndexes.forEach((idx, i) => {
        let val = base;
        if (extraUnits > 0) {
          val += step;
          extraUnits -= 1;
        }
        suggestions[idx] = formatCompact(val);
      });
    } else {
      // For sessions/requests, distribute whole units intelligently
      let remaining = Math.round(remainingTotal);
      const basePerDay = Math.floor(remaining / n);
      const extraDays = remaining % n;
      
      remainingDayIndexes.forEach((idx, i) => {
        let val = basePerDay;
        if (i < extraDays) {
          val += 1; // Give extra unit to first few days
        }
        if (val > 0) {
          suggestions[idx] = String(val);
        }
      });
    }

    return suggestions;
  };

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
          
          <div className={`grid gap-4 ${category === 'learning' 
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2' 
            : (['fitness','discipline','engineering'].includes(category) 
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
                : 'grid-cols-1 md:grid-cols-2')}`}>
            {kpis.map(kpi => {
              const currentValue = values[kpi.id] || 0;
              // Special-case sleep: compute progress from average across entered days; if none, treat input as average
              const { progress, displayValueForHeader, status } = (() => {
                if (kpi.id === 'sleepAverage') {
                  const daily = getWeeklyDailyValues(currentWeek, kpi.id);
                  const sum = daily.reduce((s, n) => s + (Number.isFinite(n) ? Number(n) : 0), 0);
                  const daysWithData = daily.filter(v => Number(v) > 0).length;
                  const effectiveAvg = daysWithData > 0 ? (sum / daysWithData) : (Number(currentValue) || 0);
                  const weeklySumForProgress = effectiveAvg * 7;
                  const p = calculateKPIProgress(kpi.id, weeklySumForProgress);
                  const st = getKPIStatus(kpi.id, weeklySumForProgress);
                  return { progress: p, displayValueForHeader: effectiveAvg, status: st };
                }
                const p = calculateKPIProgress(kpi.id, currentValue);
                const st = getKPIStatus(kpi.id, currentValue);
                return { progress: p, displayValueForHeader: currentValue, status: st };
              })();
              const isRange = kpi.minTarget !== undefined;
              const activeIdxForInput = Number.isInteger(editingDay[kpi.id] as number) ? (editingDay[kpi.id] as number) : null;
              const inputValue = (() => {
                if (activeIdxForInput !== null) {
                  const daily = getWeeklyDailyValues(currentWeek, kpi.id);
                  return Number(daily[activeIdxForInput] || 0);
                }
                return currentValue;
              })();
              
              return (
                <div key={kpi.id} className="space-y-3 border-2 p-3" style={{ borderColor: '#ff6b40' }}>
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
                        {kpi.id === 'sleepAverage' ? Number(displayValueForHeader).toFixed(1) : currentValue}
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
                    {/* Daily Dots Row */}
                    <div className="flex items-center justify-between py-1">
                      {(() => {
                        const daily = getWeeklyDailyValues(currentWeek, kpi.id);
                        const dayDates = getWeekDayDates(currentWeek);
                        const dayNames = dayDates.map(d => d.toLocaleDateString(undefined, { weekday: 'short' }));
                        const dayLetters = dayNames.map(n => n.slice(0, 1));
                        const formatCount = (v: number, unit: string) => {
                          const baseStep = unit === 'hours' ? 0.5 : 1;
                          const half = baseStep / 2;
                          const decimals = half < 1 ? (String(half).split('.')[1]?.length || 1) : 0;
                          const rounded = Number(v.toFixed(decimals));
                          return decimals > 0 ? rounded.toFixed(decimals) : String(rounded);
                        };
                        return (
                          <div className="w-full">
                            <div className="grid grid-cols-7 gap-2 w-full px-2 justify-items-center">
                              {(() => {
                                const suggestions = getPerDaySuggestions(kpi.id);
                                return daily.map((val, idx) => (
                                  <div key={idx} className="relative flex flex-col items-center justify-center w-6">
                                    <div className="relative">
                                      <button
                                        onClick={() => setEditingDay(prev => ({ ...prev, [kpi.id]: (prev[kpi.id] === idx ? null : idx) }))}
                                        className={`h-2 w-2 rounded-full transition-colors focus:outline-none border-2 ${editingDay[kpi.id] === idx
                                          ? 'bg-[#FF6B00] border-white' // active edit (orange)
                                          : (val > 0 ? 'bg-[#5FE3B3] border-white' : 'bg-white/10 border-white/70')}`}
                                        title={dayNames[idx]}
                                        tabIndex={0}
                                      />
                                      {(val > 0 || editingDay[kpi.id] === idx) && (
                                        <span className="absolute inset-0 flex items-center justify-center text-[8px] leading-none text-white pointer-events-none">
                                          {formatCount(val, kpi.unit)}
                                        </span>
                                      )}
                                      {suggestions && suggestions[idx] && val <= 0 && (
                                        <span className="absolute inset-0 flex items-center justify-center text-[8px] leading-none text-terminal-accent/90 pointer-events-none">
                                          {suggestions[idx] as string}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ));
                              })()}
                            </div>
                            <div className="grid grid-cols-7 gap-2 w-full px-2 mt-1 text-[10px] text-terminal-accent/70 justify-items-center">
                              {dayLetters.map((l, idx) => (
                                <span key={`label-${idx}`} className="leading-none select-none">{l}</span>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    {/* Legacy labels row under dots */}
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
                       disabled={inputValue <= 0}
                     >
                       <Minus size={16} />
                     </button>

                     {/* Input Field */}
                     <input
                       type="number"
                       min="0"
                       step={kpi.unit === 'hours' ? '0.5' : '1'}
                       value={inputValue}
                       onChange={async (e) => {
                        const raw = parseFloat(e.target.value);
                        const parsed = Number.isFinite(raw) ? raw : 0;
                        const activeIdx = Number.isInteger(editingDay[kpi.id] as number) ? (editingDay[kpi.id] as number) : null;
                        if (activeIdx !== null) {
                          await updateWeeklyDailyValue(currentWeek, kpi.id, activeIdx, Math.max(0, parsed));
                          const record = getWeeklyKPIRecord(currentWeek);
                          setValues(record?.values || {});
                        } else {
                          updateKPI(kpi.id, parsed);
                        }
                      }}
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