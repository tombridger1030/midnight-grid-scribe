import React, { useState, useEffect } from 'react';
import {
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
import { kpiManager, ConfigurableKPI } from '@/lib/configurableKpis';
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Target, TrendingUp, Plus, Minus } from 'lucide-react';

interface SimpleWeeklyKPIInputProps {
  onWeekChange?: (weekKey: string) => void;
}

const SimpleWeeklyKPIInput: React.FC<SimpleWeeklyKPIInputProps> = ({ onWeekChange }) => {
  const [currentWeek, setCurrentWeek] = useState(getCurrentWeek());
  const [values, setValues] = useState<WeeklyKPIValues>({});
  const [isLoading, setIsLoading] = useState(true);
  const [userKPIs, setUserKPIs] = useState<ConfigurableKPI[]>([]);

  // Load data from Supabase on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // Load user's configured KPIs first
        const activeKPIs = await kpiManager.getActiveKPIs();
        setUserKPIs(activeKPIs);

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

  const navigateWeek = (direction: 'prev' | 'next') => {
    const currentDate = new Date();
    const [year, week] = currentWeek.split('-W').map(Number);

    let newWeek = week + (direction === 'next' ? 1 : -1);
    let newYear = year;

    if (newWeek > 52) {
      newWeek = 1;
      newYear += 1;
    } else if (newWeek < 1) {
      newWeek = 52;
      newYear -= 1;
    }

    const newWeekKey = `${newYear}-W${String(newWeek).padStart(2, '0')}`;
    setCurrentWeek(newWeekKey);
  };

  const updateKPI = async (kpiId: string, value: number) => {
    const newValues = { ...values, [kpiId]: value };
    setValues(newValues);

    try {
      await updateWeeklyKPIRecord(currentWeek, newValues);
    } catch (error) {
      console.error('Failed to save KPI update:', error);
    }
  };

  const incrementKPI = (kpiId: string) => {
    const currentValue = values[kpiId] || 0;
    updateKPI(kpiId, currentValue + 1);
  };

  const decrementKPI = (kpiId: string) => {
    const currentValue = values[kpiId] || 0;
    updateKPI(kpiId, Math.max(0, currentValue - 1));
  };

  // Group KPIs by category
  const kpisByCategory = userKPIs.reduce((acc, kpi) => {
    if (!acc[kpi.category]) {
      acc[kpi.category] = [];
    }
    acc[kpi.category].push(kpi);
    return acc;
  }, {} as Record<string, ConfigurableKPI[]>);

  const overallCompletion = calculateWeekCompletion(values, currentWeek);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return '#5FE3B3';
      case 'good': return '#FFD700';
      case 'fair': return '#FF6B35';
      case 'poor': return '#FF073A';
      default: return '#666';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="text-center text-gray-400">Loading KPIs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <div className="flex items-center justify-between bg-sidebar border border-terminal-accent/30 p-4 rounded-sm">
        <button
          onClick={() => navigateWeek('prev')}
          className="p-2 text-terminal-accent hover:text-white hover:bg-terminal-accent/20 rounded"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="text-center">
          <div className="text-terminal-accent font-mono text-lg">
            {formatWeekKey(currentWeek)}
          </div>
          <div className="text-sm text-terminal-accent/70">
            Week Progress: {overallCompletion}%
          </div>
        </div>

        <button
          onClick={() => navigateWeek('next')}
          className="p-2 text-terminal-accent hover:text-white hover:bg-terminal-accent/20 rounded"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Overall Progress */}
      <div className="bg-sidebar border border-terminal-accent/30 p-4 rounded-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-terminal-accent font-mono text-sm">Overall Progress</span>
          <span className="text-terminal-accent font-mono text-sm">{overallCompletion}%</span>
        </div>
        <Progress value={overallCompletion} className="h-2 bg-gray-700" />
      </div>

      {/* KPI Categories */}
      {Object.entries(kpisByCategory).map(([category, kpis]) => (
        <div key={category} className="bg-sidebar border border-terminal-accent/30 p-4 rounded-sm">
          <h3 className="text-terminal-accent font-mono text-sm mb-4 capitalize">
            {category} KPIs
          </h3>

          <div className="space-y-4">
            {kpis.map(kpi => {
              const currentValue = values[kpi.kpi_id] || 0;
              const progress = calculateKPIProgress(kpi.kpi_id, currentValue, currentWeek);
              const status = getKPIStatus(kpi.kpi_id, currentValue, currentWeek);
              const statusColor = getStatusColor(status);

              return (
                <div key={kpi.kpi_id} className="space-y-2">
                  {/* KPI Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: kpi.color }}
                      />
                      <span className="font-medium">{kpi.name}</span>
                      <span className="text-xs text-gray-400">
                        Target: {kpi.target} {kpi.unit}
                      </span>
                    </div>
                    <div className="text-sm" style={{ color: statusColor }}>
                      {status.toUpperCase()}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>{currentValue} {kpi.unit}</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress
                      value={progress}
                      className="h-2 bg-gray-700"
                      style={{
                        '--progress-background': statusColor
                      } as React.CSSProperties}
                    />
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => decrementKPI(kpi.kpi_id)}
                      className="p-1 text-gray-400 hover:text-white hover:bg-gray-600 rounded"
                    >
                      <Minus size={16} />
                    </button>

                    <input
                      type="number"
                      value={currentValue}
                      onChange={(e) => {
                        const parsed = parseFloat(e.target.value) || 0;
                        updateKPI(kpi.kpi_id, parsed);
                      }}
                      className="w-20 bg-panel border border-gray-600 rounded px-2 py-1 text-center text-sm"
                      min="0"
                      step="0.1"
                    />

                    <button
                      onClick={() => incrementKPI(kpi.kpi_id)}
                      className="p-1 text-gray-400 hover:text-white hover:bg-gray-600 rounded"
                    >
                      <Plus size={16} />
                    </button>

                    <span className="text-xs text-gray-400 ml-2">
                      {kpi.unit}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        {['excellent', 'good', 'fair', 'poor'].map(statusType => (
          <div key={statusType} className="border border-terminal-accent/30 p-3 rounded-sm">
            <div className="text-2xl font-bold" style={{ color: getStatusColor(statusType) }}>
              {userKPIs.filter(kpi => getKPIStatus(kpi.kpi_id, values[kpi.kpi_id] || 0) === statusType).length}
            </div>
            <div className="text-xs text-terminal-accent/70 capitalize">{statusType}</div>
          </div>
        ))}
      </div>

      {userKPIs.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <Target className="mx-auto mb-2 opacity-50" size={48} />
          <p>No KPIs configured yet.</p>
          <p className="text-sm">Go to Profile → KPIs to set up your goals.</p>
        </div>
      )}
    </div>
  );
};

export default SimpleWeeklyKPIInput;
