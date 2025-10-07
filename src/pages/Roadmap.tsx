import React, { useState, useEffect, useCallback } from 'react';
import TypewriterText from '@/components/TypewriterText';
import { Progress } from "@/components/ui/progress";
import { Target, Calendar, TrendingUp, Edit3, Plus, Trash2, Save, X } from 'lucide-react';
import {
  Goal,
  Month,
  GoalsData,
  loadGoalsFromSupabase,
  saveGoalsToSupabase,
  updateGoalMonthly,
  getCurrentMonth,
  monthNumberToName,
  calculateGoalProgress
} from '@/lib/storage';
import {
  loadWeeklyKPIs,
  loadWeeklyKPIsWithSync,
  getWeekDates,
  WeeklyKPIData,
  WEEKLY_KPI_DEFINITIONS,
  WeeklyKPIDefinition
} from '@/lib/weeklyKpi';

const Roadmap = () => {
  const [goalsData, setGoalsData] = useState<GoalsData>({ goals: [] });
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState<'yearly' | 'monthly'>('yearly');
  const [weeklyKPIData, setWeeklyKPIData] = useState<WeeklyKPIData>({ records: [] });
  const [showNewGoalForm, setShowNewGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Goal>>({});
  const [newGoal, setNewGoal] = useState<Partial<Goal>>({
    name: '',
    yearlyTarget: 0,
    unit: '',
    category: 'personal',
    isNumeric: true,
    connectedKpi: undefined,
    monthlyTargets: {}
  });
  const currentMonth = getCurrentMonth();

  // Load goals data and weekly KPI data on mount
  useEffect(() => {
    const loadData = async () => {
      const data = await loadGoalsFromSupabase();
      setGoalsData(data);
      console.log('Roadmap loaded goals data:', data.goals.length, 'goals found');
      console.log('Goals details:', data.goals.map(g => ({ id: g.id, name: g.name, currentTotal: g.currentTotal, monthly: g.monthly })));
    };

    loadData();

    // Load weekly KPI data from Supabase (with migration) then persist locally
    (async () => {
      try {
        const kpiData = await loadWeeklyKPIsWithSync();
        setWeeklyKPIData(kpiData);
      } catch (e) {
        // Fallback to local-only
        const local = loadWeeklyKPIs();
        setWeeklyKPIData(local);
      }
    })();

    // Listen for storage changes (when other components update goals)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'noctisium-goals-data') {
        console.log('Goals data changed in localStorage, reloading...');
        console.log('Storage change event:', e.newValue ? JSON.parse(e.newValue) : 'deleted');
        loadData();
      }
      if (e.key === 'noctisium-weekly-kpis') {
        try {
          const kpiData = loadWeeklyKPIs();
          setWeeklyKPIData(kpiData);
        } catch (error) {
          console.error('Failed to load weekly KPIs from storage:', error);
        }
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
  const calculateCurrentMonthTotals = useCallback(() => {
    const currentDate = new Date();
    const currentMonthNum = currentDate.getMonth() + 1; // 1-based month

    // Calculate totals for all KPIs
    const kpiTotals: Record<string, number> = {};

    // Initialize totals for all KPIs
    WEEKLY_KPI_DEFINITIONS.forEach(kpi => {
      kpiTotals[kpi.id] = 0;
    });

    // Filter weekly records to current month and sum the values
    weeklyKPIData.records.forEach(record => {
      // Use fiscal-week start date to map week to a month
      const { start } = getWeekDates(record.weekKey);
      if (start.getMonth() + 1 === currentMonthNum) {
        // Add KPI values from this week
        Object.keys(record.values).forEach(kpiId => {
          if (kpiId in kpiTotals) {
            kpiTotals[kpiId] += record.values[kpiId] || 0;
          }
        });
      }
    });

    return kpiTotals;
  }, [weeklyKPIData.records]);

  // Auto-update goals with calculated monthly values when weekly KPI data changes
  useEffect(() => {
    const updateGoalsFromKPI = async () => {
      if (weeklyKPIData.records.length > 0) {
        const kpiTotals = calculateCurrentMonthTotals();

        const updatedData = await new Promise<GoalsData>(resolve => {
          setGoalsData(prevData => {
            const updatedGoals = prevData.goals.map(goal => {
              let updatedGoal = { ...goal };

              // Update goals that have connected KPIs
              if (goal.connectedKpi && goal.connectedKpi in kpiTotals) {
                updatedGoal = {
                  ...goal,
                  monthly: {
                    ...goal.monthly,
                    [currentMonth]: kpiTotals[goal.connectedKpi]
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
            resolve(newData);
            return newData;
          });
        });

        // Save the updated data to Supabase
        await saveGoalsToSupabase(updatedData);
      }
    };

    updateGoalsFromKPI();
  }, [weeklyKPIData, currentMonth, calculateCurrentMonthTotals]);

  // Update monthly value for a goal
  const handleUpdateMonthly = (goalId: string, month: Month, value: number) => {
    try {
      const updatedData = updateGoalMonthly(goalId, month, value || null);
      setGoalsData(updatedData);
    } catch (error) {
      console.error('Failed to update monthly value:', error);
    }
  };

  // Add a new goal
  const handleAddGoal = async () => {
    console.log('Creating goal with data:', newGoal);
    
    if (!newGoal.name || !newGoal.unit || !newGoal.yearlyTarget || newGoal.yearlyTarget <= 0) {
      alert('Please fill in all required fields (Name, Target, Unit). Target must be greater than 0.');
      return;
    }

    const goalId = newGoal.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    const goalToAdd: Goal = {
      id: goalId,
      name: newGoal.name!,
      yearlyTarget: newGoal.yearlyTarget!,
      unit: newGoal.unit!,
      category: newGoal.category!,
      isNumeric: newGoal.isNumeric!,
      connectedKpi: newGoal.connectedKpi,
      monthly: {},
      monthlyTargets: newGoal.monthlyTargets || {},
      currentTotal: 0,
      progressPct: 0
    };

    const updatedData = {
      goals: [...goalsData.goals, goalToAdd]
    };

    console.log('Adding goal to data:', goalToAdd);
    console.log('Updated goals data:', updatedData);
    
    setGoalsData(updatedData);
    await saveGoalsToSupabase(updatedData);
    setShowNewGoalForm(false);
    
    console.log('Goal added successfully, form closed');
    setNewGoal({
      name: '',
      yearlyTarget: 0,
      unit: '',
      category: 'personal',
      isNumeric: true,
      connectedKpi: undefined,
      monthlyTargets: {}
    });
  };

  // Delete a goal
  const handleDeleteGoal = async (goalId: string) => {
    if (confirm('Are you sure you want to delete this goal? This action cannot be undone.')) {
      const updatedData = {
        goals: goalsData.goals.filter(goal => goal.id !== goalId)
      };
      setGoalsData(updatedData);
      await saveGoalsToSupabase(updatedData);
    }
  };

  // Update an existing goal
  const handleUpdateGoal = async (goalId: string, updates: Partial<Goal>) => {
    const updatedData = {
      goals: goalsData.goals.map(goal => 
        goal.id === goalId 
          ? { 
              ...goal, 
              ...updates,
              // Recalculate progress if target changed
              ...(updates.yearlyTarget && {
                progressPct: goal.yearlyTarget > 0 ? Math.min(1, goal.currentTotal / updates.yearlyTarget) : 0
              })
            }
          : goal
      )
    };
    setGoalsData(updatedData);
    await saveGoalsToSupabase(updatedData);
    setEditingGoal(null);
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

  // Render new goal form
  const renderNewGoalForm = () => (
    <div className="border border-terminal-accent/30 p-4 mb-6 bg-terminal-accent/5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm text-terminal-accent flex items-center">
          <Plus size={16} className="mr-2" />
          Create New Goal
        </h3>
        <button
          onClick={() => setShowNewGoalForm(false)}
          className="text-terminal-accent/70 hover:text-terminal-accent"
        >
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-terminal-accent/70 mb-1">Goal Name *</label>
          <input
            type="text"
            className="terminal-input w-full"
            value={newGoal.name || ''}
            onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
            placeholder="e.g., Launch SaaS Product"
          />
        </div>

        <div>
          <label className="block text-xs text-terminal-accent/70 mb-1">Category *</label>
          <select
            className="terminal-input w-full"
            value={newGoal.category || 'personal'}
            onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value as Goal['category'] })}
          >
            <option value="personal">Personal</option>
            <option value="professional">Professional</option>
            <option value="financial">Financial</option>
            <option value="fitness">Fitness</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-terminal-accent/70 mb-1">Yearly Target *</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            className="terminal-input w-full"
            value={newGoal.yearlyTarget || ''}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              console.log('Yearly target input changed:', e.target.value, '-> parsed:', value);
              setNewGoal({ ...newGoal, yearlyTarget: isNaN(value) ? undefined : value });
            }}
            placeholder="1000"
          />
        </div>

        <div>
          <label className="block text-xs text-terminal-accent/70 mb-1">Unit *</label>
          <input
            type="text"
            className="terminal-input w-full"
            value={newGoal.unit || ''}
            onChange={(e) => setNewGoal({ ...newGoal, unit: e.target.value })}
            placeholder="e.g., hours, sessions, $"
          />
        </div>

        <div>
          <label className="block text-xs text-terminal-accent/70 mb-1">Connected KPI (Auto-tracking)</label>
          <select
            className="terminal-input w-full"
            value={newGoal.connectedKpi || ''}
            onChange={(e) => setNewGoal({ ...newGoal, connectedKpi: e.target.value || undefined })}
          >
            <option value="">No auto-tracking</option>
            {WEEKLY_KPI_DEFINITIONS.map(kpi => (
              <option key={kpi.id} value={kpi.id}>
                {kpi.name} ({kpi.unit})
              </option>
            ))}
          </select>
          <div className="text-xs text-terminal-accent/50 mt-1">
            Connect to a KPI for automatic monthly value updates
          </div>
        </div>

        <div>
          <label className="flex items-center text-xs text-terminal-accent/70">
            <input
              type="checkbox"
              className="mr-2"
              checked={newGoal.isNumeric || false}
              onChange={(e) => setNewGoal({ ...newGoal, isNumeric: e.target.checked })}
            />
            Numeric goal (supports monthly tracking)
          </label>
        </div>
      </div>

      {/* Monthly Targets Section */}
      {newGoal.isNumeric && (
        <div className="mt-6">
          <h4 className="text-sm text-terminal-accent mb-3 flex items-center">
            <Calendar size={16} className="mr-2" />
            Monthly Targets (Optional)
          </h4>
          <div className="text-xs text-terminal-accent/60 mb-3">
            Set specific monthly targets to break down your yearly goal. Leave empty to use auto-calculated targets.
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {getAllMonths().map(month => (
              <div key={month} className="flex items-center gap-2 p-2 border border-terminal-accent/20">
                <div className="w-8 text-xs font-mono">{month}</div>
                <input
                  type="number"
                  className="terminal-input flex-1 text-xs"
                  value={newGoal.monthlyTargets?.[month]?.target || ''}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    setNewGoal({
                      ...newGoal,
                      monthlyTargets: {
                        ...newGoal.monthlyTargets,
                        [month]: value > 0 ? { target: value, description: '' } : undefined
                      }
                    });
                  }}
                  placeholder="0"
                />
              </div>
            ))}
          </div>
          
          <div className="mt-2 text-xs text-terminal-accent/50">
            Total of monthly targets: {
              Object.values(newGoal.monthlyTargets || {}).reduce((sum, target) => 
                sum + (target?.target || 0), 0
              ).toLocaleString()
            } {newGoal.unit || 'units'}
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <button
          onClick={handleAddGoal}
          className="terminal-button bg-[#5FE3B3] text-black hover:bg-[#5FE3B3]/80 flex items-center"
        >
          <Save size={16} className="mr-2" />
          Create Goal
        </button>
        <button
          onClick={() => setShowNewGoalForm(false)}
          className="terminal-button"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  // Initialize edit data when editing a goal
  useEffect(() => {
    if (editingGoal) {
      const goal = goalsData.goals.find(g => g.id === editingGoal);
      if (goal) {
        setEditData({
          name: goal.name,
          yearlyTarget: goal.yearlyTarget,
          unit: goal.unit,
          category: goal.category,
          connectedKpi: goal.connectedKpi
        });
      }
    }
  }, [editingGoal, goalsData.goals]);

  // Render goal editor
  const renderGoalEditor = (goal: Goal) => (
    <div className="border border-terminal-accent/50 p-3 mb-4 bg-terminal-accent/10">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-xs text-terminal-accent flex items-center">
          <Edit3 size={14} className="mr-2" />
          Editing: {goal.name}
        </h4>
        <button
          onClick={() => setEditingGoal(null)}
          className="text-terminal-accent/70 hover:text-terminal-accent"
        >
          <X size={14} />
        </button>
      </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-terminal-accent/70 mb-1">Name</label>
            <input
              type="text"
              className="terminal-input w-full text-xs"
              value={editData.name || ''}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs text-terminal-accent/70 mb-1">Target</label>
            <input
              type="number"
              className="terminal-input w-full text-xs"
              value={editData.yearlyTarget || ''}
              onChange={(e) => setEditData({ ...editData, yearlyTarget: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div>
            <label className="block text-xs text-terminal-accent/70 mb-1">Unit</label>
            <input
              type="text"
              className="terminal-input w-full text-xs"
              value={editData.unit || ''}
              onChange={(e) => setEditData({ ...editData, unit: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs text-terminal-accent/70 mb-1">Category</label>
            <select
              className="terminal-input w-full text-xs"
              value={editData.category || 'personal'}
              onChange={(e) => setEditData({ ...editData, category: e.target.value as Goal['category'] })}
            >
              <option value="personal">Personal</option>
              <option value="professional">Professional</option>
              <option value="financial">Financial</option>
              <option value="fitness">Fitness</option>
            </select>
          </div>

          <div className="md:col-span-2 lg:col-span-2">
            <label className="block text-xs text-terminal-accent/70 mb-1">Connected KPI</label>
            <select
              className="terminal-input w-full text-xs"
              value={editData.connectedKpi || ''}
              onChange={(e) => setEditData({ ...editData, connectedKpi: e.target.value || undefined })}
            >
              <option value="">No auto-tracking</option>
              {WEEKLY_KPI_DEFINITIONS.map(kpi => (
                <option key={kpi.id} value={kpi.id}>
                  {kpi.name} ({kpi.unit})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Monthly Targets Section for Goal Editor */}
        {goal.isNumeric && (
          <div className="mt-4">
            <h5 className="text-xs text-terminal-accent/70 mb-3 flex items-center">
              <Calendar size={12} className="mr-1" />
              Edit Monthly Targets
            </h5>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {getAllMonths().map(month => (
                <div key={month} className="flex items-center gap-1 p-1 border border-terminal-accent/10">
                  <div className="w-6 text-xs font-mono">{month.slice(0,3)}</div>
                  <input
                    type="number"
                    className="terminal-input flex-1 text-xs py-1"
                    value={goal.monthlyTargets[month]?.target || ''}
                    onChange={async (e) => {
                      const targetValue = parseFloat(e.target.value) || 0;
                      const updatedData = {
                        goals: goalsData.goals.map(g => 
                          g.id === goal.id
                            ? {
                                ...g,
                                monthlyTargets: {
                                  ...g.monthlyTargets,
                                  [month]: targetValue > 0 ? {
                                    target: targetValue,
                                    description: g.monthlyTargets[month]?.description || ''
                                  } : undefined
                                }
                              }
                            : g
                        )
                      };
                      setGoalsData(updatedData);
                      await saveGoalsToSupabase(updatedData);
                    }}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

      <div className="flex gap-2 mt-3">
        <button
          onClick={() => handleUpdateGoal(goal.id, editData)}
          className="terminal-button bg-[#5FE3B3] text-black hover:bg-[#5FE3B3]/80 flex items-center text-xs px-3 py-1"
        >
          <Save size={12} className="mr-1" />
          Save
        </button>
        <button
          onClick={() => setEditingGoal(null)}
          className="terminal-button text-xs px-3 py-1"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  // Render yearly goals view
  const renderYearlyGoals = () => (
    <div className="space-y-6">
      {/* New Goal Form */}
      {editMode && showNewGoalForm && renderNewGoalForm()}

      {/* Add New Goal Button */}
      {editMode && !showNewGoalForm && (
        <div className="flex justify-center">
          <button
            onClick={() => setShowNewGoalForm(true)}
            className="terminal-button bg-[#5FE3B3] text-black hover:bg-[#5FE3B3]/80 flex items-center"
          >
            <Plus size={16} className="mr-2" />
            Add New Goal
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {goalsData.goals.length === 0 && (
          <div className="col-span-full text-center py-8 text-terminal-accent/50">
            No goals found. {editMode ? 'Add your first goal above!' : 'Enable edit mode to add goals.'}
          </div>
        )}
        {goalsData.goals.map(goal => {
          console.log('Rendering goal:', goal.id, goal.name);
          return (
          <div key={goal.id} className="border border-terminal-accent/30 p-4">
            {/* Goal Editor - shown when editing this specific goal */}
            {editMode && editingGoal === goal.id && renderGoalEditor(goal)}

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Target size={16} className={`mr-2 ${getCategoryColor(goal.category)}`} />
                <h3 className="text-sm text-terminal-accent">{goal.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 bg-terminal-accent/20 text-terminal-accent uppercase">
                  {goal.category}
                </span>
                
                {/* Edit Mode Controls */}
                {editMode && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditingGoal(editingGoal === goal.id ? null : goal.id)}
                      className="p-1 text-terminal-accent/70 hover:text-[#5FE3B3] transition-colors"
                      title="Edit goal"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-1 text-terminal-accent/70 hover:text-[#FF6B6B] transition-colors"
                      title="Delete goal"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
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
                {goal.connectedKpi ? (
                  <span className="text-xs text-[#FF6B00]">Auto-tracked from {WEEKLY_KPI_DEFINITIONS.find(kpi => kpi.id === goal.connectedKpi)?.name || goal.connectedKpi}</span>
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
                    goal.connectedKpi ? 'bg-terminal-accent/10' : ''
                  }`}
                  value={goal.monthly[currentMonth] || ''}
                  onChange={(e) => handleUpdateMonthly(goal.id, currentMonth, parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  disabled={!editMode || !!goal.connectedKpi}
                  title={
                    goal.connectedKpi 
                      ? `Auto-tracked from ${WEEKLY_KPI_DEFINITIONS.find(kpi => kpi.id === goal.connectedKpi)?.name || goal.connectedKpi}` 
                      : undefined
                  }
                />
                <span className="text-xs">{goal.unit}</span>
                {goal.connectedKpi && (
                  <span className="text-xs text-terminal-accent/50">auto-tracked</span>
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
            {editMode ? (
              // Edit mode - show editable inputs
              <div className="space-y-3">
                {getAllMonths().map(month => {
                  const actualValue = goal.monthly[month];
                  const monthlyTarget = goal.monthlyTargets[month];
                  const hasActual = actualValue !== undefined && actualValue !== null;
                  const hasTarget = monthlyTarget !== undefined;
                  const isCurrent = month === currentMonth;
                  const isConnectedKpi = !!goal.connectedKpi;
                  
                  return (
                    <div key={month} className="flex items-center gap-3 p-2 border border-terminal-accent/20 bg-terminal-accent/5">
                      <div className="w-8 text-xs font-mono">{month}</div>
                      
                      {/* Target input */}
                      <div className="flex-1">
                        <label className="block text-xs text-terminal-accent/70 mb-1">Target</label>
                        <input
                          type="number"
                          className="terminal-input w-full text-xs"
                          value={monthlyTarget?.target || ''}
                          onChange={async (e) => {
                            const targetValue = parseFloat(e.target.value) || 0;
                            const updatedData = {
                              goals: goalsData.goals.map(g => 
                                g.id === goal.id
                                  ? {
                                      ...g,
                                      monthlyTargets: {
                                        ...g.monthlyTargets,
                                        [month]: {
                                          target: targetValue,
                                          description: monthlyTarget?.description || ''
                                        }
                                      }
                                    }
                                  : g
                              )
                            };
                            setGoalsData(updatedData);
                            await saveGoalsToSupabase(updatedData);
                          }}
                          placeholder="0"
                        />
                      </div>
                      
                      {/* Actual value input */}
                      <div className="flex-1">
                        <label className="block text-xs text-terminal-accent/70 mb-1">
                          Actual {isConnectedKpi && <span className="text-[#FF6B00]">(auto)</span>}
                        </label>
                        <input
                          type="number"
                          className={`terminal-input w-full text-xs ${
                            isConnectedKpi ? 'bg-terminal-accent/10' : ''
                          }`}
                          value={actualValue || ''}
                          onChange={(e) => handleUpdateMonthly(goal.id, month, parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          disabled={isConnectedKpi}
                          title={isConnectedKpi ? 'Auto-tracked from connected KPI' : undefined}
                        />
                      </div>
                      
                      {/* Progress indicator */}
                      {hasActual && hasTarget && monthlyTarget.target > 0 && (
                        <div className="w-12 text-xs text-right">
                          {Math.round((actualValue / monthlyTarget.target) * 100)}%
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              // View mode - show compact grid
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
            )}
          </div>
        </div>
          );
        })}
      </div>
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
                {goal.connectedKpi && (
                  <span className="text-xs text-[#FF6B00]">Auto-tracked</span>
                )}
              </h4>
              
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <input
                    type="number"
                    className={`terminal-input w-20 text-sm ${
                      goal.connectedKpi ? 'bg-terminal-accent/10' : ''
                    }`}
                    value={goal.monthly[currentMonth] || ''}
                    onChange={(e) => handleUpdateMonthly(goal.id, currentMonth, parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    disabled={!!goal.connectedKpi}
                    title={
                      goal.connectedKpi 
                        ? `Auto-tracked from ${WEEKLY_KPI_DEFINITIONS.find(kpi => kpi.id === goal.connectedKpi)?.name || goal.connectedKpi}` 
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
            <p className="text-terminal-accent/70 text-sm">
              {editMode 
                ? 'Create, edit, and manage your yearly goals and deadlines.' 
                : 'Track monthly progress toward yearly goals.'
              }
            </p>
            {editMode && (
              <div className="mt-2 text-xs text-[#FF6B00] flex items-center">
                <Edit3 size={12} className="mr-1" />
                EDIT MODE: Add new goals, modify existing ones, set targets
              </div>
            )}
          </div>
          <button
            className={`terminal-button flex items-center min-h-[44px] px-4 ${
              editMode ? 'bg-[#FF6B00] text-black' : ''
            }`}
            onClick={() => {
              setEditMode(!editMode);
              // Clear edit states when exiting edit mode
              if (editMode) {
                setShowNewGoalForm(false);
                setEditingGoal(null);
              }
            }}
          >
            <Edit3 size={16} className="mr-2" />
            {editMode ? 'Exit Edit Mode' : 'Edit Mode'}
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
