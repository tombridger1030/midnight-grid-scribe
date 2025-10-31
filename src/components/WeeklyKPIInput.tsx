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
  loadWeeklyKPIsWithSync,
  getWeeklyDailyValues,
  updateWeeklyDailyValue,
  getWeekDayDates,
  clearWeeklyTargetCache
} from '@/lib/weeklyKpi';
import { kpiManager, ConfigurableKPI } from '@/lib/configurableKpis';
import { userStorage } from '@/lib/userStorage';
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Target, TrendingUp, Plus, Minus, Edit3, Trash2, Save, X, PlusCircle } from 'lucide-react';

interface WeeklyKPIInputProps {
  onWeekChange?: (weekKey: string) => void;
}

const WeeklyKPIInput: React.FC<WeeklyKPIInputProps> = ({ onWeekChange }) => {
  const [currentWeek, setCurrentWeek] = useState(getCurrentWeek());
  const [values, setValues] = useState<WeeklyKPIValues>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [userKPIs, setUserKPIs] = useState<ConfigurableKPI[]>([]);
  const [dailyRefresh, setDailyRefresh] = useState(0); // Force re-render of daily values
  const [editingKPI, setEditingKPI] = useState<string | null>(null);
  const [editingDaily, setEditingDaily] = useState<{kpiId: string, dayIndex: number} | null>(null);
  const [isCreatingKPI, setIsCreatingKPI] = useState<string | null>(null); // Track which category is creating
  const [editForm, setEditForm] = useState({
    name: '',
    target: 0,
    minTarget: 0,
    unit: '',
    weight: 1
  });
  // Week-specific target overrides state
  const [weekTargets, setWeekTargets] = useState<Record<string, { target: number; minTarget?: number }>>({});
  const [editingWeekTarget, setEditingWeekTarget] = useState<string | null>(null);
  const [weekTargetForm, setWeekTargetForm] = useState<{ target: number; minTarget?: number }>({ target: 0, minTarget: undefined });
  const [newKPIForm, setNewKPIForm] = useState({
    name: '',
    target: 0,
    minTarget: 0,
    unit: '',
    category: '',
    color: '#5FE3B3',
    isAverage: false,
    reverseScoring: false,
    equalIsBetter: false,
    weight: 1
  });
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryForm, setNewCategoryForm] = useState({
    name: '',
    color: '#FF6B00'
  });

  // Load data from Supabase on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // Initialize default KPIs if user has none
        await kpiManager.initializeDefaultKPIs();

        // Run migration to set is_average flag on Sleep Average KPI
        await kpiManager.migrateAverageKPIs();

        // Load user's configured KPIs first
        const activeKPIs = await kpiManager.getActiveKPIs();
        setUserKPIs(activeKPIs);

        await loadWeeklyKPIsWithSync();

        // Now load the current week's data
        const record = getWeeklyKPIRecord(currentWeek);
        setValues(record?.values || {});
        onWeekChange?.(currentWeek);

        // Load week-specific target overrides for current week
        try {
          const overrides = await userStorage.getWeeklyTargetOverrides(currentWeek);
          const map: Record<string, { target: number; minTarget?: number }> = {};
          overrides.forEach(o => {
            map[o.kpi_id] = { target: Number(o.target_value) || 0, minTarget: o.min_target_value !== null ? Number(o.min_target_value) : undefined };
          });
          setWeekTargets(map);
        } catch (e) {
          console.warn('Failed to load weekly target overrides:', e);
        }
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
      // Refresh week-specific targets on week change
      (async () => {
        try {
          const overrides = await userStorage.getWeeklyTargetOverrides(currentWeek);
          const map: Record<string, { target: number; minTarget?: number }> = {};
          overrides.forEach(o => {
            map[o.kpi_id] = { target: Number(o.target_value) || 0, minTarget: o.min_target_value !== null ? Number(o.min_target_value) : undefined };
          });
          setWeekTargets(map);
        } catch (e) {
          console.warn('Failed to load weekly target overrides for week change:', e);
        }
      })();
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
    const newValues = { ...values, [kpiId]: Math.max(0, value) };
    setValues(newValues);

    try {
      setIsSyncing(true);
      await updateWeeklyKPIRecord(currentWeek, { [kpiId]: Math.max(0, value) });
    } catch (error) {
      console.error('Failed to sync KPI update:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Increment KPI value
  const incrementKPI = async (kpiId: string) => {
    const kpi = userKPIs.find(k => k.kpi_id === kpiId);
    const step = kpi?.unit === 'hours' ? 0.5 : 1;
    let currentValue = values[kpiId] || 0;

    // For average KPIs, get the correct calculated current average
    const isAverageKPI = kpi?.is_average || kpiId === 'sleepAverage' || kpi?.name === 'Sleep Average';
    if (isAverageKPI) {
      const dailyValues = getWeeklyDailyValues(currentWeek, kpiId);
      const daysWithData = dailyValues.filter(val => val > 0).length;
      const totalValue = dailyValues.reduce((sum, val) => sum + (val || 0), 0);
      currentValue = daysWithData > 0 ? (totalValue / daysWithData) : 0;
    }

    updateKPI(kpiId, currentValue + step);
  };

  // Decrement KPI value
  const decrementKPI = async (kpiId: string) => {
    const kpi = userKPIs.find(k => k.kpi_id === kpiId);
    const step = kpi?.unit === 'hours' ? 0.5 : 1;
    let currentValue = values[kpiId] || 0;

    // For average KPIs, get the correct calculated current average
    const isAverageKPI = kpi?.is_average || kpiId === 'sleepAverage' || kpi?.name === 'Sleep Average';
    if (isAverageKPI) {
      const dailyValues = getWeeklyDailyValues(currentWeek, kpiId);
      const daysWithData = dailyValues.filter(val => val > 0).length;
      const totalValue = dailyValues.reduce((sum, val) => sum + (val || 0), 0);
      currentValue = daysWithData > 0 ? (totalValue / daysWithData) : 0;
    }

    updateKPI(kpiId, Math.max(0, currentValue - step));
  };

  // Start editing a KPI
  const startEditing = (kpi: ConfigurableKPI) => {
    setEditingKPI(kpi.kpi_id);
    setEditForm({
      name: kpi.name,
      target: kpi.target,
      minTarget: kpi.min_target || 0,
      unit: kpi.unit,
      weight: (typeof kpi.weight === 'number' ? kpi.weight : 1)
    });
    try {
      // Minimal debug to confirm weight is loaded for existing KPIs
      console.log('[KPI Edit] Start editing', kpi.kpi_id, 'weight=', kpi.weight);
    } catch {}
  };

  // Save KPI edits
  const saveKPIEdit = async (kpiId: string) => {
    try {
      const kpi = userKPIs.find(k => k.kpi_id === kpiId);
      if (!kpi) return;

      await kpiManager.updateKPI(kpi.id, {
        name: editForm.name,
        target: editForm.target,
        min_target: editForm.minTarget || undefined,
        unit: editForm.unit,
        weight: typeof editForm.weight === 'number' ? editForm.weight : 1
      });
      try {
        console.log('[KPI Edit] Saved', kpiId, 'new weight=', editForm.weight || 1);
      } catch {}

      // Update local state
      setUserKPIs(prev =>
        prev.map(k =>
          k.kpi_id === kpiId
            ? {
                ...k,
                name: editForm.name,
                target: editForm.target,
                min_target: editForm.minTarget || undefined,
                unit: editForm.unit,
                weight: typeof editForm.weight === 'number' ? editForm.weight : 1
              }
            : k
        )
      );

      setEditingKPI(null);
      setEditForm({ name: '', target: 0, minTarget: 0, unit: '', weight: 1 });
    } catch (error) {
      console.error('Failed to save KPI edit:', error);
    }
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingKPI(null);
    setEditForm({ name: '', target: 0, minTarget: 0, unit: '', weight: 1 });
  };

  // Delete KPI
  const deleteKPI = async (kpiId: string) => {
    if (!confirm('Are you sure you want to delete this KPI?')) return;

    try {
      const kpi = userKPIs.find(k => k.kpi_id === kpiId);
      if (!kpi) return;

      await kpiManager.permanentlyDeleteKPI(kpi.id);
      setUserKPIs(prev => prev.filter(k => k.kpi_id !== kpiId));
    } catch (error) {
      console.error('Failed to delete KPI:', error);
    }
  };

  // Begin editing week-specific target for a KPI
  const startEditingWeekTarget = (kpi: ConfigurableKPI) => {
    setEditingWeekTarget(kpi.kpi_id);
    const effective = weekTargets[kpi.kpi_id] || { target: kpi.target, minTarget: kpi.min_target };
    setWeekTargetForm({ target: effective.target, minTarget: effective.minTarget });
  };

  // Save week-specific target override
  const saveWeekTarget = async (kpi: ConfigurableKPI) => {
    try {
      await userStorage.setWeeklyTargetOverride(
        currentWeek,
        kpi.kpi_id,
        Number(weekTargetForm.target) || 0,
        typeof weekTargetForm.minTarget === 'number' ? Number(weekTargetForm.minTarget) : null
      );
      clearWeeklyTargetCache(currentWeek);
      setWeekTargets(prev => ({
        ...prev,
        [kpi.kpi_id]: { target: Number(weekTargetForm.target) || 0, minTarget: typeof weekTargetForm.minTarget === 'number' ? Number(weekTargetForm.minTarget) : undefined }
      }));
      setEditingWeekTarget(null);
    } catch (e) {
      console.error('Failed to save weekly target override:', e);
    }
  };

  // Clear week-specific target override (revert to global)
  const clearWeekTarget = async (kpi: ConfigurableKPI) => {
    try {
      await userStorage.deleteWeeklyTargetOverride(currentWeek, kpi.kpi_id);
      clearWeeklyTargetCache(currentWeek);
      setWeekTargets(prev => {
        const { [kpi.kpi_id]: _, ...rest } = prev;
        return rest;
      });
      setEditingWeekTarget(null);
    } catch (e) {
      console.error('Failed to clear weekly target override:', e);
    }
  };

  // Create new KPI
  const createNewKPI = async (category: string) => {
    if (!newKPIForm.name || !newKPIForm.unit || newKPIForm.target <= 0) {
      return;
    }

    try {
      const newKPI = await kpiManager.createCustomKPI(
        newKPIForm.name,
        newKPIForm.target,
        newKPIForm.unit,
        category,
        newKPIForm.color,
        newKPIForm.minTarget || undefined,
        newKPIForm.isAverage,
        newKPIForm.reverseScoring,
        newKPIForm.equalIsBetter,
        (typeof newKPIForm.weight === 'number' ? newKPIForm.weight : 1)
      );

      if (newKPI) {
        setUserKPIs(prev => [...prev, newKPI]);
        setNewKPIForm({
          name: '',
          target: 0,
          minTarget: 0,
          unit: '',
          category: '',
          color: '#5FE3B3',
          isAverage: false,
          reverseScoring: false,
          equalIsBetter: false,
          weight: 1
        });
        setIsCreatingKPI(null);
      }
    } catch (error) {
      console.error('Failed to create KPI:', error);
    }
  };

  // Create new category with first KPI
  const createNewCategory = async () => {
    if (!newCategoryForm.name || !newKPIForm.name || !newKPIForm.unit || newKPIForm.target <= 0) {
      return;
    }

    try {
      const newKPI = await kpiManager.createCustomKPI(
        newKPIForm.name,
        newKPIForm.target,
        newKPIForm.unit,
        newCategoryForm.name.toLowerCase(),
        newCategoryForm.color,
        newKPIForm.minTarget || undefined,
        newKPIForm.isAverage,
        newKPIForm.reverseScoring,
        newKPIForm.equalIsBetter,
        (typeof newKPIForm.weight === 'number' ? newKPIForm.weight : 1)
      );

      if (newKPI) {
        setUserKPIs(prev => [...prev, newKPI]);
        setNewKPIForm({
          name: '',
          target: 0,
          minTarget: 0,
          unit: '',
          category: '',
          color: '#5FE3B3',
          isAverage: false,
          reverseScoring: false,
          equalIsBetter: false,
          weight: 1
        });
        setNewCategoryForm({
          name: '',
          color: '#FF6B00'
        });
        setIsCreatingCategory(false);
      }
    } catch (error) {
      console.error('Failed to create category:', error);
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
  const kpisByCategory = userKPIs.reduce((acc, kpi) => {
    if (!acc[kpi.category]) {
      acc[kpi.category] = [];
    }
    acc[kpi.category].push(kpi);
    return acc;
  }, {} as Record<string, ConfigurableKPI[]>);

  // Get category color (use first KPI color from each category)
  const getCategoryColor = (category: string): string => {
    const firstKPI = userKPIs.find(kpi => kpi.category === category);
    return firstKPI?.color || '#FF6B00';
  };

  const overallCompletion = Math.round(kpiManager.calculateWeekCompletion(values, userKPIs));

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
        {/* DAILY METRICS REMOVED - WEEKLY ONLY */}
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

          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {kpis.map(kpi => {
              const rawValue = values[kpi.kpi_id] || 0;

              // Check if this is an average-based KPI
              const isAverageKPI = kpi.is_average || kpi.kpi_id === 'sleepAverage' || kpi.name === 'Sleep Average';

              // Calculate the correct current value display
              let currentValue = rawValue;
              if (isAverageKPI) {
                // For average KPIs, calculate the actual average from daily data
                const dailyValues = getWeeklyDailyValues(currentWeek, kpi.kpi_id);
                const daysWithData = dailyValues.filter(val => val > 0).length;
                const totalValue = dailyValues.reduce((sum, val) => sum + (val || 0), 0);

                // Show the average, not the total
                currentValue = daysWithData > 0 ? Math.round((totalValue / daysWithData) * 10) / 10 : 0;
              }

              // Calculate progress based on KPI type (respect week-specific overrides)
              let progress = 0;
              let status: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';

              // Effective targets for this week
              const effOverride = weekTargets[kpi.kpi_id];
              const effTarget = (effOverride?.target ?? kpi.target) as number;
              const effMinTarget = (typeof effOverride?.minTarget === 'number'
                ? effOverride.minTarget
                : (typeof kpi.min_target === 'number' ? kpi.min_target : undefined)) as number | undefined;

              if (isAverageKPI && kpi.kpi_id === 'sleepAverage') {
                // Sleep Average has an optimal range (6.5-7 hours)
                const avg = currentValue;
                const minTarget = typeof effMinTarget === 'number' ? effMinTarget : 6;
                const maxTarget = effTarget || 7;

                // Optimal band: 6.5-7 hours = 100%
                if (avg >= 6.5 && avg <= 7) {
                  progress = 100;
                  status = 'excellent';
                } else if (avg >= minTarget && avg < 6.5) {
                  // Between 6-6.5: scale from 80% to 100%
                  progress = 80 + ((avg - minTarget) / (6.5 - minTarget)) * 20;
                  status = progress >= 90 ? 'excellent' : 'good';
                } else if (avg > 7 && avg <= maxTarget + 1) {
                  // Between 7-8: scale from 100% to 80%
                  progress = 100 - ((avg - 7) / 1) * 20;
                  status = progress >= 90 ? 'excellent' : 'good';
                } else if (avg < minTarget) {
                  // Below 6: scale linearly toward 0%
                  progress = (avg / minTarget) * 80;
                  status = progress >= 50 ? 'fair' : 'poor';
                } else {
                  // Above 8: scale down further
                  progress = Math.max(0, 80 - ((avg - 8) / 2) * 80);
                  status = progress >= 50 ? 'fair' : 'poor';
                }
              } else {
                // Standard progress calculation for other KPIs
                const targetValue = (typeof effMinTarget === 'number' ? effMinTarget : effTarget);
                
                if (kpi.equal_is_better) {
                  // For equal is better (being exactly at target is best)
                  const difference = Math.abs(currentValue - targetValue);
                  const tolerance = targetValue * 0.1; // Allow 10% tolerance for perfect score
                  const maxAcceptableDifference = targetValue * 0.5; // 50% difference = 0 score
                  
                  if (difference <= tolerance) {
                    progress = 100; // Perfect score if within tolerance
                    status = 'excellent';
                  } else {
                    progress = Math.max(0, 100 - ((difference - tolerance) / (maxAcceptableDifference - tolerance)) * 100);
                    status = progress >= 80 ? 'good' :
                             progress >= 50 ? 'fair' : 'poor';
                  }
                } else if (kpi.reverse_scoring) {
                  // For reverse scoring (lower is better), calculate progress differently
                  if (currentValue <= targetValue) {
                    // If we're at or below target, that's excellent (100%)
                    progress = 100;
                    status = 'excellent';
                  } else {
                    // If we're above target, calculate how far above we are
                    // The further above, the worse the score
                    const excess = currentValue - targetValue;
                    const maxAcceptableExcess = targetValue * 0.5; // Allow 50% above target before hitting 0%
                    
                    progress = Math.max(0, 100 - (excess / maxAcceptableExcess) * 100);
                    status = progress >= 80 ? 'good' :
                             progress >= 50 ? 'fair' : 'poor';
                  }
                } else {
                  // Normal scoring (higher is better)
                  progress = targetValue > 0 ? Math.min(100, (currentValue / targetValue) * 100) : 0;
                  status = progress >= 100 ? 'excellent' :
                           progress >= 80 ? 'good' :
                           progress >= 50 ? 'fair' : 'poor';
                }
              }

              const isRange = kpi.min_target !== undefined;

              return (
                <div key={kpi.kpi_id} className="space-y-3 border-2 p-4" style={{ borderColor: kpi.color + '40' }}>
                  {/* KPI Header */}
                  {editingKPI === kpi.kpi_id ? (
                    // Edit Mode
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                          className="terminal-input text-sm"
                          placeholder="KPI Name"
                        />
                        <input
                          type="text"
                          value={editForm.unit}
                          onChange={(e) => setEditForm(prev => ({ ...prev, unit: e.target.value }))}
                          className="terminal-input text-sm"
                          placeholder="Unit"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          value={editForm.minTarget}
                          onChange={(e) => setEditForm(prev => ({ ...prev, minTarget: parseFloat(e.target.value) || 0 }))}
                          className="terminal-input text-sm"
                          placeholder="Min Target (optional)"
                          min="0"
                          step="0.1"
                        />
                        <input
                          type="number"
                          value={editForm.target}
                          onChange={(e) => setEditForm(prev => ({ ...prev, target: parseFloat(e.target.value) || 0 }))}
                          className="terminal-input text-sm"
                          placeholder="Target"
                          min="0"
                          step="0.1"
                        />
                        <input
                          type="number"
                          value={editForm.weight}
                          onChange={(e) => setEditForm(prev => ({ ...prev, weight: Math.max(0, parseFloat(e.target.value) || 0) }))}
                          className="terminal-input text-sm"
                          placeholder="Weight"
                          min="0"
                          step="0.1"
                          title="Relative importance for weekly completion"
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => saveKPIEdit(kpi.kpi_id)}
                          className="terminal-button p-2"
                          style={{ color: kpi.color }}
                        >
                          <Save size={16} />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="terminal-button p-2 text-terminal-accent/60"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Display Mode
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{kpi.name}</div>
                        {editingWeekTarget === kpi.kpi_id ? (
                          <div className="mt-2 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="number"
                                value={weekTargetForm.minTarget ?? ''}
                                onChange={(e) => setWeekTargetForm(prev => ({ ...prev, minTarget: e.target.value === '' ? undefined : (parseFloat(e.target.value) || 0) }))}
                                className="terminal-input text-xs"
                                placeholder="Min (optional)"
                                min="0"
                                step="0.1"
                              />
                              <input
                                type="number"
                                value={weekTargetForm.target}
                                onChange={(e) => setWeekTargetForm(prev => ({ ...prev, target: parseFloat(e.target.value) || 0 }))}
                                className="terminal-input text-xs"
                                placeholder="Target"
                                min="0"
                                step="0.1"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => saveWeekTarget(kpi)}
                                className="terminal-button px-2 py-1 text-xs"
                                style={{ color: kpi.color }}
                              >Save</button>
                              <button
                                onClick={() => setEditingWeekTarget(null)}
                                className="terminal-button px-2 py-1 text-xs text-terminal-accent/70"
                              >Cancel</button>
                              <button
                                onClick={() => clearWeekTarget(kpi)}
                                className="terminal-button px-2 py-1 text-xs text-red-400"
                              >Clear week override</button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditingWeekTarget(kpi)}
                            className="text-xs text-terminal-accent/70 hover:text-white transition-colors"
                            title="Click to edit this week's target only"
                          >
                            Target: {(() => {
                              const eff = weekTargets[kpi.kpi_id];
                              const effTarget = eff?.target ?? kpi.target;
                              const effMin = eff?.minTarget ?? kpi.min_target;
                              return isRange || eff?.minTarget !== undefined
                                ? `${effMin ?? effTarget}-${effTarget}`
                                : effTarget;
                            })()} {kpi.unit}
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-lg font-bold" style={{ color: kpi.color }}>
                            {currentValue}
                          </div>
                          <div className="text-xs text-terminal-accent/70">
                            {Math.round(progress)}%
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => startEditing(kpi)}
                            className="terminal-button p-1"
                            style={{ color: kpi.color }}
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={() => deleteKPI(kpi.kpi_id)}
                            className="terminal-button p-1 text-red-400"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Progress Bar - Only show when not editing */}
                  {editingKPI !== kpi.kpi_id && (
                    <div className="space-y-2">
                      <div className="relative">
                        <Progress
                          value={progress}
                          className="h-3"
                        />
                        <div
                          className="absolute top-0 left-0 h-full rounded-full transition-all duration-300 ease-in-out shadow-sm"
                          style={{
                            width: `${progress}%`,
                            backgroundColor: kpi.color,
                            opacity: 0.9,
                            boxShadow: `0 0 8px ${kpi.color}40`
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-terminal-accent/50">
                        <span>0</span>
                        {(() => {
                          const eff = weekTargets[kpi.kpi_id];
                          const effMin = eff?.minTarget ?? kpi.min_target;
                          return (isRange || typeof effMin === 'number') ? (
                          <span className="text-terminal-accent/70">
                            Min: {effMin}
                          </span>
                          ) : null;
                        })()}
                        <span>Target: {(weekTargets[kpi.kpi_id]?.target ?? kpi.target)}</span>
                      </div>
                    </div>
                  )}

                  {/* Daily Progress Bubbles */}
                  {editingKPI !== kpi.kpi_id && (
                    <div className="space-y-2 mt-2">
                      <div className="flex justify-center gap-1">
                        {(() => {
                          // Calculate guidance once for this KPI
                          const dailyValues = getWeeklyDailyValues(currentWeek, kpi.kpi_id);
                          const weekDates = getWeekDayDates(currentWeek);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);

                          const eff = weekTargets[kpi.kpi_id];
                          const weeklyMinTarget = (typeof eff?.minTarget === 'number' ? eff.minTarget : undefined) ?? (typeof kpi.min_target === 'number' ? kpi.min_target : undefined) ?? (eff?.target ?? kpi.target);

                          // Check if this is an average-based KPI (from the kpi.is_average field)
                          // Fallback: also check for known average KPI IDs for backward compatibility
                          const isAverageKPI = kpi.is_average || kpi.kpi_id === 'sleepAverage' || kpi.name === 'Sleep Average';

                          // Calculate current week total differently for averages vs totals
                          let currentWeekTotal;
                          let remainingNeeded;

                          if (isAverageKPI) {
                            // For averages: we need to achieve weeklyMinTarget average across all 7 days
                            // Calculate total hours needed for the week and hours accumulated so far
                            const totalNeededForWeek = weeklyMinTarget * 7;
                            currentWeekTotal = dailyValues.reduce((sum, val) => sum + (val || 0), 0);
                            remainingNeeded = Math.max(0, totalNeededForWeek - currentWeekTotal);
                          } else {
                            // For totals: sum all daily values
                            currentWeekTotal = dailyValues.reduce((sum, val) => sum + (val || 0), 0);
                            remainingNeeded = Math.max(0, weeklyMinTarget - currentWeekTotal);
                          }

                          // Only show guidance for the current week
                          const isCurrentWeek = currentWeek === getCurrentWeek();

                          let futureDayIndices = [];
                          let futureDaysCount = 0;
                          let suggestedDailyValue = 0;

                          // Calculate distribution for each day
                          let dailyGuidanceValues = new Array(7).fill(0);

                          if (isCurrentWeek) {
                            // Get future day indices from today onwards
                            futureDayIndices = weekDates
                              .map((date, idx) => ({ date, idx }))
                              .filter(day => day.date.getTime() >= today.getTime())
                              .map(day => day.idx);

                            futureDaysCount = futureDayIndices.length;

                            if (isAverageKPI) {
                              // Average KPIs: distribute remaining hours needed across empty future days
                              // to achieve the target average for the week

                              // Find empty future days (days from today forward with no current value)
                              const emptyFutureDayIndices = futureDayIndices.filter(dayIdx => dailyValues[dayIdx] === 0);

                              if (emptyFutureDayIndices.length > 0 && remainingNeeded > 0) {
                                // Distribute remaining hours across empty future days
                                const avgPerEmptyDay = remainingNeeded / emptyFutureDayIndices.length;

                                emptyFutureDayIndices.forEach(dayIdx => {
                                  // Round to 1 decimal place for cleaner display
                                  dailyGuidanceValues[dayIdx] = Math.round(avgPerEmptyDay * 10) / 10;
                                });

                                suggestedDailyValue = Math.round(avgPerEmptyDay * 10) / 10;
                              } else if (emptyFutureDayIndices.length > 0) {
                                // No remaining hours needed, but show target as guidance
                                emptyFutureDayIndices.forEach(dayIdx => {
                                  dailyGuidanceValues[dayIdx] = weeklyMinTarget;
                                });
                                suggestedDailyValue = weeklyMinTarget;
                              } else {
                                suggestedDailyValue = weeklyMinTarget; // Default to target average
                              }
                            } else if (remainingNeeded > 0) {
                              // For non-average KPIs, only show guidance when there's remaining work needed

                              // For discrete items: only show guidance on empty future days
                              if (kpi.unit === 'sessions' || kpi.unit === 'requests' || kpi.unit === 'bugs' || kpi.unit === 'items' || kpi.unit === 'days') {
                                // Find empty future days (days with no current value)
                                const emptyFutureDayIndices = futureDayIndices.filter(dayIdx => dailyValues[dayIdx] === 0);

                                if (emptyFutureDayIndices.length >= remainingNeeded) {
                                  // We have enough empty days, show 1 per day for the first N days needed
                                  for (let i = 0; i < remainingNeeded; i++) {
                                    dailyGuidanceValues[emptyFutureDayIndices[i]] = 1;
                                  }
                                } else if (emptyFutureDayIndices.length > 0) {
                                  // Not enough empty days, distribute as best we can
                                  const baseValue = Math.floor(remainingNeeded / emptyFutureDayIndices.length);
                                  const remainder = remainingNeeded % emptyFutureDayIndices.length;

                                  emptyFutureDayIndices.forEach((dayIdx, i) => {
                                    dailyGuidanceValues[dayIdx] = baseValue + (i < remainder ? 1 : 0);
                                  });
                                }

                                suggestedDailyValue = remainingNeeded > 0 ? 1 : 0; // For debug display
                              } else {
                                // For other continuous values: redistribute across only empty future days
                                const emptyFutureDayIndices = futureDayIndices.filter(dayIdx => dailyValues[dayIdx] === 0);

                                if (emptyFutureDayIndices.length > 0) {
                                  // Redistribute remaining work across only the empty days
                                  const avgPerEmptyDay = Math.ceil(remainingNeeded / emptyFutureDayIndices.length);
                                  emptyFutureDayIndices.forEach(dayIdx => {
                                    dailyGuidanceValues[dayIdx] = avgPerEmptyDay;
                                  });
                                  suggestedDailyValue = avgPerEmptyDay;
                                } else {
                                  suggestedDailyValue = 0; // No empty days left
                                }
                              }
                            }
                          }

                          // Debug logging removed

                          return [0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                            const dailyValue = dailyValues[dayIndex] || 0;
                            const dayDate = weekDates[dayIndex];
                            const isToday = dayDate.getTime() === today.getTime();
                            const isFuture = dayDate.getTime() >= today.getTime();

                            // Calculate daily target and progress
                            const dailyTarget = weeklyMinTarget / 7;
                            const dailyProgress = dailyTarget > 0 ? Math.min(1, dailyValue / dailyTarget) : 0;

                            // Determine visual state
                            const isComplete = dailyProgress >= 1;
                            const hasProgress = dailyValue > 0;
                            const isEmpty = dailyValue === 0;
                            const shouldShowGuidance = isCurrentWeek && isEmpty && isFuture && (isAverageKPI || remainingNeeded > 0) && suggestedDailyValue > 0;
                            const isEditing = editingDaily?.kpiId === kpi.kpi_id && editingDaily?.dayIndex === dayIndex;

                            // Display value logic
                            let displayValue = '';
                            if (hasProgress) {
                              displayValue = dailyValue.toString();
                            } else if (shouldShowGuidance) {
                              // Use pre-calculated daily guidance value
                              const guidanceValue = dailyGuidanceValues[dayIndex];
                              if (guidanceValue > 0) {
                                displayValue = guidanceValue.toString();
                              }
                            }

                            return (
                              <button
                              key={dayIndex}
                              onClick={() => {
                                if (isEditing) {
                                  setEditingDaily(null);
                                } else {
                                  setEditingDaily({kpiId: kpi.kpi_id, dayIndex});
                                }
                              }}
                              className="w-6 h-6 rounded-full border-2 transition-all hover:scale-110 relative flex items-center justify-center text-xs font-bold"
                              style={{
                                backgroundColor: isEditing
                                  ? kpi.color
                                  : isComplete
                                    ? kpi.color
                                    : hasProgress
                                      ? `${kpi.color}40`
                                      : 'transparent',
                                // Primary colored ring
                                borderColor: kpi.color,
                                borderWidth: '2px',
                                color: isEditing || isComplete
                                  ? '#000'
                                  : hasProgress
                                    ? kpi.color
                                    : `${kpi.color}80`,
                                opacity: hasProgress || isEditing ? 1 : (shouldShowGuidance ? 0.7 : 0.3),
                                // Add white outline outside the colored border for contrast on dark backgrounds
                                boxShadow: `${isEditing ? `0 0 12px ${kpi.color}, ` : ''}0 0 0 2px #ffffff`
                              }}
                              title={hasProgress
                                ? `Day ${dayIndex + 1}: ${dailyValue}/${Math.ceil(dailyTarget)}`
                                : shouldShowGuidance
                                  ? `Day ${dayIndex + 1}: Need ${suggestedDailyValue} to reach weekly minimum (${remainingNeeded} remaining)`
                                  : `Day ${dayIndex + 1}: ${isToday ? 'Today' : isFuture ? 'Future day' : 'Past day'}`}
                            >
                              {displayValue}
                            </button>
                          );
                        });
                      })()}
                      </div>

                    </div>
                  )}

                  {/* Input Controls - Only show when not editing KPI */}
                  {editingKPI !== kpi.kpi_id && (
                    <div className="flex items-center gap-3">
                    {/* Show daily editing mode when a day is selected */}
                    {editingDaily?.kpiId === kpi.kpi_id ? (
                      <>
                        {/* Daily Mode Label */}
                        <div className="text-xs font-medium" style={{ color: kpi.color }}>
                          Day {editingDaily.dayIndex + 1}
                        </div>

                        {/* Daily Decrement Button */}
                        <button
                          onClick={async () => {
                            const dailyValues = getWeeklyDailyValues(currentWeek, kpi.kpi_id);
                            const currentDailyValue = dailyValues[editingDaily.dayIndex] || 0;
                            const newValue = Math.max(0, currentDailyValue - (kpi.unit === 'hours' ? 0.5 : 1));
                            await updateWeeklyDailyValue(currentWeek, kpi.kpi_id, editingDaily.dayIndex, newValue);
                            const record = getWeeklyKPIRecord(currentWeek);
                            setValues(record?.values || {});
                            setDailyRefresh(prev => prev + 1);
                          }}
                          className="w-10 h-10 rounded border border-terminal-accent/30 hover:border-terminal-accent/60 bg-terminal-bg hover:bg-terminal-accent/10 flex items-center justify-center transition-colors"
                          style={{ borderColor: kpi.color + '40', color: kpi.color }}
                        >
                          <Minus size={16} />
                        </button>

                        {/* Daily Input Field */}
                        <input
                          type="number"
                          min="0"
                          step={kpi.unit === 'hours' ? '0.1' : '1'}
                          value={getWeeklyDailyValues(currentWeek, kpi.kpi_id)[editingDaily.dayIndex] || 0}
                          onChange={async (e) => {
                            const newValue = Math.max(0, parseFloat(e.target.value) || 0);
                            await updateWeeklyDailyValue(currentWeek, kpi.kpi_id, editingDaily.dayIndex, newValue);
                            const record = getWeeklyKPIRecord(currentWeek);
                            setValues(record?.values || {});
                            setDailyRefresh(prev => prev + 1);
                          }}
                          className="terminal-input w-20 text-center"
                          placeholder="0"
                          style={{ borderColor: kpi.color + '60' }}
                        />

                        {/* Daily Increment Button */}
                        <button
                          onClick={async () => {
                            const dailyValues = getWeeklyDailyValues(currentWeek, kpi.kpi_id);
                            const currentDailyValue = dailyValues[editingDaily.dayIndex] || 0;
                            const newValue = currentDailyValue + (kpi.unit === 'hours' ? 0.5 : 1);
                            await updateWeeklyDailyValue(currentWeek, kpi.kpi_id, editingDaily.dayIndex, newValue);
                            const record = getWeeklyKPIRecord(currentWeek);
                            setValues(record?.values || {});
                            setDailyRefresh(prev => prev + 1);
                          }}
                          className="w-10 h-10 rounded border border-terminal-accent/30 hover:border-terminal-accent/60 bg-terminal-bg hover:bg-terminal-accent/10 flex items-center justify-center transition-colors"
                          style={{ borderColor: kpi.color + '40', color: kpi.color }}
                        >
                          <Plus size={16} />
                        </button>

                        {/* Daily Done Button */}
                        <button
                          onClick={() => setEditingDaily(null)}
                          className="px-3 py-2 text-xs rounded terminal-button"
                          style={{ color: kpi.color, borderColor: kpi.color + '40' }}
                        >
                          Done
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Weekly Mode - Default */}
                        {/* Weekly Decrement Button */}
                        <button
                          onClick={() => decrementKPI(kpi.kpi_id)}
                          className="w-10 h-10 rounded border border-terminal-accent/30 hover:border-terminal-accent/60 bg-terminal-bg hover:bg-terminal-accent/10 flex items-center justify-center transition-colors"
                          style={{ borderColor: kpi.color + '40', color: kpi.color }}
                          disabled={currentValue <= 0}
                        >
                          <Minus size={16} />
                        </button>

                        {/* Weekly Input Field */}
                        <input
                          type="number"
                          min="0"
                          step={kpi.unit === 'hours' ? '0.5' : '1'}
                          value={currentValue}
                          onChange={async (e) => {
                            const raw = parseFloat(e.target.value);
                            const parsed = Number.isFinite(raw) ? raw : 0;
                            updateKPI(kpi.kpi_id, parsed);
                          }}
                          className="terminal-input w-20 text-center"
                          placeholder="0"
                        />

                        {/* Weekly Increment Button */}
                        <button
                          onClick={() => incrementKPI(kpi.kpi_id)}
                          className="w-10 h-10 rounded border border-terminal-accent/30 hover:border-terminal-accent/60 bg-terminal-bg hover:bg-terminal-accent/10 flex items-center justify-center transition-colors"
                          style={{ borderColor: kpi.color + '40', color: kpi.color }}
                        >
                          <Plus size={16} />
                        </button>

                        {/* Status Badge */}
                        <div className={`px-3 py-1 text-xs rounded ${getStatusColor(status)} text-white font-medium ml-auto`}>
                          {status.toUpperCase()}
                        </div>
                      </>
                    )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add New KPI Button */}
            <div className="border-2 border-dashed p-4" style={{ borderColor: getCategoryColor(category) + '40' }}>
              {isCreatingKPI === category ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newKPIForm.name}
                      onChange={(e) => setNewKPIForm(prev => ({ ...prev, name: e.target.value }))}
                      className="terminal-input text-sm"
                      placeholder="KPI Name"
                    />
                    <input
                      type="text"
                      value={newKPIForm.unit}
                      onChange={(e) => setNewKPIForm(prev => ({ ...prev, unit: e.target.value }))}
                      className="terminal-input text-sm"
                      placeholder="Unit"
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <input
                      type="number"
                      value={newKPIForm.minTarget}
                      onChange={(e) => setNewKPIForm(prev => ({ ...prev, minTarget: parseFloat(e.target.value) || 0 }))}
                      className="terminal-input text-sm"
                      placeholder="Min Target"
                      min="0"
                      step="0.1"
                    />
                    <input
                      type="number"
                      value={newKPIForm.target}
                      onChange={(e) => setNewKPIForm(prev => ({ ...prev, target: parseFloat(e.target.value) || 0 }))}
                      className="terminal-input text-sm"
                      placeholder="Target"
                      min="0"
                      step="0.1"
                    />
                    <input
                      type="number"
                      value={newKPIForm.weight}
                      onChange={(e) => setNewKPIForm(prev => ({ ...prev, weight: Math.max(0, parseFloat(e.target.value) || 0) }))}
                      className="terminal-input text-sm"
                      placeholder="Weight"
                      min="0"
                      step="0.1"
                      title="Relative importance for weekly completion"
                    />
                    <input
                      type="color"
                      value={newKPIForm.color}
                      onChange={(e) => setNewKPIForm(prev => ({ ...prev, color: e.target.value }))}
                      className="terminal-input h-8"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setNewKPIForm(prev => ({ ...prev, isAverage: !prev.isAverage, reverseScoring: false, equalIsBetter: false }))}
                        className="flex items-center gap-2 text-sm cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        <div
                          className="w-5 h-5 border-2 rounded flex items-center justify-center transition-all"
                          style={{
                            borderColor: getCategoryColor(category),
                            backgroundColor: newKPIForm.isAverage ? getCategoryColor(category) : 'transparent'
                          }}
                        >
                          {newKPIForm.isAverage && (
                            <span className="text-black font-bold text-xs">✓</span>
                          )}
                        </div>
                        <span className="text-terminal-accent">Average Type (shows avg of days with data)</span>
                      </button>
                    </div>
                    {newKPIForm.isAverage && (
                      <div className="space-y-2 ml-7">
                        <div className="text-xs text-terminal-accent/70 mb-1">Scoring Preference:</div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setNewKPIForm(prev => ({ ...prev, reverseScoring: !prev.reverseScoring, equalIsBetter: prev.reverseScoring ? false : prev.equalIsBetter }))}
                            className="flex items-center gap-2 text-sm cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            <div
                              className="w-4 h-4 border-2 rounded flex items-center justify-center transition-all"
                              style={{
                                borderColor: getCategoryColor(category),
                                backgroundColor: newKPIForm.reverseScoring ? getCategoryColor(category) : 'transparent'
                              }}
                            >
                              {newKPIForm.reverseScoring && (
                                <span className="text-black font-bold text-xs">✓</span>
                              )}
                            </div>
                            <span className="text-terminal-accent/90">Lower is Better (e.g., screen time)</span>
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setNewKPIForm(prev => ({ ...prev, equalIsBetter: !prev.equalIsBetter, reverseScoring: prev.equalIsBetter ? false : prev.reverseScoring }))}
                            className="flex items-center gap-2 text-sm cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            <div
                              className="w-4 h-4 border-2 rounded flex items-center justify-center transition-all"
                              style={{
                                borderColor: getCategoryColor(category),
                                backgroundColor: newKPIForm.equalIsBetter ? getCategoryColor(category) : 'transparent'
                              }}
                            >
                              {newKPIForm.equalIsBetter && (
                                <span className="text-black font-bold text-xs">✓</span>
                              )}
                            </div>
                            <span className="text-terminal-accent/90">Equal is Better (e.g., sleep hours)</span>
                          </button>
                        </div>
                        {!newKPIForm.reverseScoring && !newKPIForm.equalIsBetter && (
                          <div className="text-xs text-terminal-accent/60 italic">Default: Higher is Better</div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => createNewKPI(category)}
                      className="terminal-button px-3 py-2 text-sm"
                      style={{ color: getCategoryColor(category) }}
                    >
                      <Save size={14} className="mr-1" />
                      Add KPI
                    </button>
                    <button
                      onClick={() => {
                        setIsCreatingKPI(null);
                        setNewKPIForm({
                          name: '',
                          target: 0,
                          minTarget: 0,
                          unit: '',
                          category: '',
                          color: '#5FE3B3',
                          isAverage: false
                        });
                      }}
                      className="terminal-button px-3 py-2 text-sm text-terminal-accent/60"
                    >
                      <X size={14} className="mr-1" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsCreatingKPI(category);
                    setNewKPIForm(prev => ({ ...prev, category }));
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm opacity-70 hover:opacity-100 transition-opacity"
                  style={{ color: getCategoryColor(category) }}
                >
                  <PlusCircle size={16} />
                  Add New KPI
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Add New Category */}
      <div className="border-2 border-dashed border-terminal-accent/30 p-4">
        {isCreatingCategory ? (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-terminal-accent flex items-center gap-2">
              <PlusCircle size={16} />
              Create New Category
            </h3>

            {/* Category Details */}
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={newCategoryForm.name}
                onChange={(e) => setNewCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                className="terminal-input"
                placeholder="Category name (e.g., 'fitness')"
              />
              <input
                type="color"
                value={newCategoryForm.color}
                onChange={(e) => setNewCategoryForm(prev => ({ ...prev, color: e.target.value }))}
                className="terminal-input h-10"
              />
            </div>

            {/* First KPI in Category */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-terminal-accent/80">Add first KPI to this category:</h4>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newKPIForm.name}
                  onChange={(e) => setNewKPIForm(prev => ({ ...prev, name: e.target.value }))}
                  className="terminal-input text-sm"
                  placeholder="KPI Name"
                />
                <input
                  type="text"
                  value={newKPIForm.unit}
                  onChange={(e) => setNewKPIForm(prev => ({ ...prev, unit: e.target.value }))}
                  className="terminal-input text-sm"
                  placeholder="Unit"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  value={newKPIForm.minTarget}
                  onChange={(e) => setNewKPIForm(prev => ({ ...prev, minTarget: parseFloat(e.target.value) || 0 }))}
                  className="terminal-input text-sm"
                  placeholder="Min Target (optional)"
                  min="0"
                  step="0.1"
                />
                <input
                  type="number"
                  value={newKPIForm.target}
                  onChange={(e) => setNewKPIForm(prev => ({ ...prev, target: parseFloat(e.target.value) || 0 }))}
                  className="terminal-input text-sm"
                  placeholder="Target"
                  min="0"
                  step="0.1"
                />
                <input
                  type="number"
                  value={newKPIForm.weight}
                  onChange={(e) => setNewKPIForm(prev => ({ ...prev, weight: Math.max(0, parseFloat(e.target.value) || 0) }))}
                  className="terminal-input text-sm"
                  placeholder="Weight"
                  min="0"
                  step="0.1"
                  title="Relative importance for weekly completion"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNewKPIForm(prev => ({ ...prev, isAverage: !prev.isAverage, reverseScoring: false, equalIsBetter: false }))}
                    className="flex items-center gap-2 text-sm cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <div
                      className="w-5 h-5 border-2 rounded flex items-center justify-center transition-all"
                      style={{
                        borderColor: newCategoryForm.color,
                        backgroundColor: newKPIForm.isAverage ? newCategoryForm.color : 'transparent'
                      }}
                    >
                      {newKPIForm.isAverage && (
                        <span className="text-black font-bold text-xs">✓</span>
                      )}
                    </div>
                    <span className="text-terminal-accent">Average Type (shows avg of days with data)</span>
                  </button>
                </div>
                {newKPIForm.isAverage && (
                  <div className="space-y-2 ml-7">
                    <div className="text-xs text-terminal-accent/70 mb-1">Scoring Preference:</div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setNewKPIForm(prev => ({ ...prev, reverseScoring: !prev.reverseScoring, equalIsBetter: prev.reverseScoring ? false : prev.equalIsBetter }))}
                        className="flex items-center gap-2 text-sm cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        <div
                          className="w-4 h-4 border-2 rounded flex items-center justify-center transition-all"
                          style={{
                            borderColor: newCategoryForm.color,
                            backgroundColor: newKPIForm.reverseScoring ? newCategoryForm.color : 'transparent'
                          }}
                        >
                          {newKPIForm.reverseScoring && (
                            <span className="text-black font-bold text-xs">✓</span>
                          )}
                        </div>
                        <span className="text-terminal-accent/90">Lower is Better (e.g., screen time)</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setNewKPIForm(prev => ({ ...prev, equalIsBetter: !prev.equalIsBetter, reverseScoring: prev.equalIsBetter ? false : prev.reverseScoring }))}
                        className="flex items-center gap-2 text-sm cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        <div
                          className="w-4 h-4 border-2 rounded flex items-center justify-center transition-all"
                          style={{
                            borderColor: newCategoryForm.color,
                            backgroundColor: newKPIForm.equalIsBetter ? newCategoryForm.color : 'transparent'
                          }}
                        >
                          {newKPIForm.equalIsBetter && (
                            <span className="text-black font-bold text-xs">✓</span>
                          )}
                        </div>
                        <span className="text-terminal-accent/90">Equal is Better (e.g., sleep hours)</span>
                      </button>
                    </div>
                    {!newKPIForm.reverseScoring && !newKPIForm.equalIsBetter && (
                      <div className="text-xs text-terminal-accent/60 italic">Default: Higher is Better</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={createNewCategory}
                className="terminal-button px-4 py-2"
                style={{ color: newCategoryForm.color }}
              >
                <Save size={16} className="mr-2" />
                Create Category & KPI
              </button>
              <button
                onClick={() => {
                  setIsCreatingCategory(false);
                  setNewCategoryForm({ name: '', color: '#FF6B00' });
                  setNewKPIForm({
                    name: '',
                    target: 0,
                    minTarget: 0,
                    unit: '',
                    category: '',
                    color: '#5FE3B3',
                    isAverage: false
                  });
                }}
                className="terminal-button px-4 py-2 text-terminal-accent/60"
              >
                <X size={16} className="mr-2" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsCreatingCategory(true)}
            className="w-full flex items-center justify-center gap-2 py-4 text-terminal-accent/70 hover:text-terminal-accent transition-colors"
          >
            <PlusCircle size={20} />
            <span className="text-lg">Add New Category</span>
          </button>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div className="border border-terminal-accent/30 p-3">
          <div className="text-2xl font-bold text-[#5FE3B3]">
            {userKPIs.filter(kpi => getKPIStatus(kpi.kpi_id, values[kpi.kpi_id] || 0) === 'excellent').length}
          </div>
          <div className="text-xs text-terminal-accent/70">Excellent</div>
        </div>
        <div className="border border-terminal-accent/30 p-3">
          <div className="text-2xl font-bold text-[#FFD700]">
            {userKPIs.filter(kpi => getKPIStatus(kpi.kpi_id, values[kpi.kpi_id] || 0) === 'good').length}
          </div>
          <div className="text-xs text-terminal-accent/70">Good</div>
        </div>
        <div className="border border-terminal-accent/30 p-3">
          <div className="text-2xl font-bold text-[#FF6B00]">
            {userKPIs.filter(kpi => getKPIStatus(kpi.kpi_id, values[kpi.kpi_id] || 0) === 'fair').length}
          </div>
          <div className="text-xs text-terminal-accent/70">Fair</div>
        </div>
        <div className="border border-terminal-accent/30 p-3">
          <div className="text-2xl font-bold text-[#FF6B6B]">
            {userKPIs.filter(kpi => getKPIStatus(kpi.kpi_id, values[kpi.kpi_id] || 0) === 'poor').length}
          </div>
          <div className="text-xs text-terminal-accent/70">Needs Work</div>
        </div>
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

export default WeeklyKPIInput;
