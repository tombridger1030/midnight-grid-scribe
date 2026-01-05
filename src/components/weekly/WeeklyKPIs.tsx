/**
 * WeeklyKPIs Component
 * 
 * Main weekly KPI tracking interface.
 * Streamlined, fast input with multi-type training and book tracking.
 * 
 * Design: Cyberpunk aesthetic with Electric Cyan, Neon Green accents
 */

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { colors, shadows } from '@/styles/design-tokens';
import { useWeeklyKPIs } from '@/hooks/useWeeklyKPIs';
import { useTraining } from '@/hooks/useTraining';
import { useBooks } from '@/hooks/useBooks';
import { useAutoSync } from '@/hooks/useAutoSync';
import { useNutrition } from '@/hooks/useNutrition';
import { useSleep } from '@/hooks/useSleep';
import { KPIRow } from './KPIRow';
import { TrainingKPI } from './TrainingKPI';
import { ReadingKPI } from './ReadingKPI';
import { NutritionKPI } from './NutritionKPI';
import { SleepKPI } from './SleepKPI';
import { WeeklyHistory } from './WeeklyHistory';
import { getCurrentWeek, getRecentWeeks, loadWeeklyKPIs } from '@/lib/weeklyKpi';
import { DEFAULT_KPIS } from '@/lib/kpiDefaults';

// Local storage keys for targets
const NUTRITION_TARGETS_KEY = 'noctisium-nutrition-targets';
const SLEEP_TARGET_KEY = 'noctisium-sleep-target';

interface NutritionTargets {
  calories: number;
  protein: number;
}

const DEFAULT_NUTRITION_TARGETS: NutritionTargets = { calories: 1900, protein: 150 };
const DEFAULT_SLEEP_TARGET = 7;

interface WeeklyKPIsProps {
  className?: string;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0, 0, 0.2, 1] as const },
  },
};

export const WeeklyKPIs: React.FC<WeeklyKPIsProps> = ({ className }) => {
  // Main KPI data
  const {
    kpis,
    values,
    weekKey,
    weekLabel,
    weekDates,
    overallProgress,
    isLoading: kpisLoading,
    updateValue,
    navigateWeek,
    refreshData,
  } = useWeeklyKPIs();

  // Training data
  const {
    trainingTypes,
    sessions,
    countingSessionCount,
    addSession,
    removeSession,
    addTrainingType,
    isLoading: trainingLoading,
  } = useTraining(weekKey);

  // Books data
  const {
    activeBooks,
    completedThisYear,
    weeklyPagesRead,
    addBook,
    updateProgress,
    completeBook,
    pauseBook,
    resumeBook,
    deleteBook,
    isLoading: booksLoading,
  } = useBooks(weekKey);

  // Nutrition data
  const {
    weekData: nutritionData,
    weeklyTotals: nutritionTotals,
    dailyAverage: nutritionAverage,
    daysTracked: nutritionDaysTracked,
    updateMeal,
    isLoading: nutritionLoading,
  } = useNutrition(weekKey);

  // Sleep data
  const {
    weekData: sleepData,
    weeklyTotal: sleepTotal,
    dailyAverage: sleepAverage,
    daysTracked: sleepDaysTracked,
    updateDay: updateSleep,
    isLoading: sleepLoading,
  } = useSleep(weekKey);

  // Nutrition and Sleep targets (persisted in localStorage)
  const [nutritionTargets, setNutritionTargets] = useState<NutritionTargets>(() => {
    try {
      const stored = localStorage.getItem(NUTRITION_TARGETS_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_NUTRITION_TARGETS;
    } catch {
      return DEFAULT_NUTRITION_TARGETS;
    }
  });

  const [sleepTarget, setSleepTarget] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(SLEEP_TARGET_KEY);
      return stored ? parseFloat(stored) : DEFAULT_SLEEP_TARGET;
    } catch {
      return DEFAULT_SLEEP_TARGET;
    }
  });

  // Save targets to localStorage when changed
  const handleUpdateNutritionTargets = useCallback((calories: number, protein: number) => {
    const newTargets = { calories, protein };
    setNutritionTargets(newTargets);
    localStorage.setItem(NUTRITION_TARGETS_KEY, JSON.stringify(newTargets));
  }, []);

  const handleUpdateSleepTarget = useCallback((hours: number) => {
    setSleepTarget(hours);
    localStorage.setItem(SLEEP_TARGET_KEY, hours.toString());
  }, []);

  // Auto-sync data
  const {
    syncedValues,
    isSyncing,
    syncNow,
  } = useAutoSync(weekKey);

  // Merge synced values with manual values
  const mergedValues = useMemo(() => ({
    ...values,
    prs_created: Math.max(values.prs_created || 0, syncedValues.prs_created || 0),
    deep_work_hours: Math.max(values.deep_work_hours || 0, syncedValues.deep_work_hours || 0),
  }), [values, syncedValues]);

  // Calculate history data
  const historyWeeks = useMemo(() => {
    const weekKeys = getRecentWeeks(5);
    const weeklyData = loadWeeklyKPIs();
    
    return weekKeys.map(wk => {
      const record = weeklyData.records.find(r => r.weekKey === wk);
      const weekValues = record?.values || {};
      
      const activeKpis = kpis.filter(k => k.is_active && k.target && k.target > 0);
      if (activeKpis.length === 0) {
        return { weekKey: wk, percentage: 0 };
      }
      
      let totalProgress = 0;
      for (const kpi of activeKpis) {
        const value = weekValues[kpi.kpi_id] || 0;
        const progress = Math.min(100, (value / kpi.target!) * 100);
        totalProgress += progress;
      }
      
      return {
        weekKey: wk,
        percentage: Math.round(totalProgress / activeKpis.length),
      };
    });
  }, [kpis, weekKey]);

  // Get progress color using design tokens
  const getProgressColor = useCallback((percentage: number): string => {
    if (percentage >= 90) return colors.success.DEFAULT;
    if (percentage >= 70) return colors.primary.DEFAULT;
    if (percentage >= 50) return colors.warning.DEFAULT;
    return colors.danger.DEFAULT;
  }, []);

  // Filter KPIs by type - with fallback to defaults for Training and Reading
  const simpleKpis = kpis.filter(k => 
    k.kpi_type !== 'training' && k.kpi_type !== 'reading'
  );
  
  // Always show Training/Reading with fallback to defaults if not in user's KPIs
  const trainingKpi = kpis.find(k => k.kpi_type === 'training') || 
    DEFAULT_KPIS.find(k => k.kpi_type === 'training');
  const readingKpi = kpis.find(k => k.kpi_type === 'reading') || 
    DEFAULT_KPIS.find(k => k.kpi_type === 'reading');

  const isLoading = kpisLoading || trainingLoading || booksLoading || nutritionLoading || sleepLoading;

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div 
          className="flex items-center justify-center py-16 rounded-lg"
          style={{ 
            backgroundColor: colors.background.secondary,
            border: `1px solid ${colors.border.accent}`,
          }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <RefreshCw size={28} style={{ color: colors.primary.DEFAULT }} />
          </motion.div>
        </div>
      </div>
    );
  }

  const progressColor = getProgressColor(overallProgress);
  const isComplete = overallProgress >= 100;

  return (
    <motion.div 
      className={cn("space-y-4", className)}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Week Header */}
      <motion.div 
        variants={itemVariants}
        className="flex items-center justify-between p-4 rounded-lg"
        style={{
          backgroundColor: colors.background.secondary,
          border: `1px solid ${colors.border.accent}`,
        }}
      >
        <button
          onClick={() => navigateWeek('prev')}
          className="p-2 rounded-md transition-all duration-200 hover:scale-105"
          style={{ 
            border: `1px solid ${colors.primary.DEFAULT}30`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = `${colors.primary.DEFAULT}15`;
            e.currentTarget.style.borderColor = `${colors.primary.DEFAULT}60`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = `${colors.primary.DEFAULT}30`;
          }}
        >
          <ChevronLeft size={20} style={{ color: colors.primary.DEFAULT }} />
        </button>

        <div className="text-center flex-1">
          <div 
            className="text-lg font-semibold tracking-wide"
            style={{ color: colors.primary.DEFAULT }}
          >
            {weekLabel}
          </div>
          <div 
            className="text-xs font-mono mt-0.5"
            style={{ color: colors.text.muted }}
          >
            {weekKey}
          </div>
        </div>

        <button
          onClick={() => navigateWeek('next')}
          className="p-2 rounded-md transition-all duration-200 hover:scale-105"
          style={{ 
            border: `1px solid ${colors.primary.DEFAULT}30`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = `${colors.primary.DEFAULT}15`;
            e.currentTarget.style.borderColor = `${colors.primary.DEFAULT}60`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = `${colors.primary.DEFAULT}30`;
          }}
        >
          <ChevronRight size={20} style={{ color: colors.primary.DEFAULT }} />
        </button>
      </motion.div>

      {/* Overall Progress */}
      <motion.div 
        variants={itemVariants}
        className="p-6 rounded-lg text-center relative overflow-hidden"
        style={{
          backgroundColor: colors.background.secondary,
          border: `1px solid ${colors.border.accent}`,
          boxShadow: isComplete ? shadows.glow.green : undefined,
        }}
      >
        {/* Background glow effect for high progress */}
        {overallProgress >= 70 && (
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              background: `radial-gradient(circle at center, ${progressColor} 0%, transparent 70%)`,
            }}
          />
        )}
        
        <motion.div
          key={overallProgress}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-5xl font-bold font-mono mb-3 relative"
          style={{ 
            color: progressColor,
            textShadow: isComplete ? `0 0 20px ${progressColor}` : undefined,
          }}
        >
          {overallProgress}%
        </motion.div>
        
        <div 
          className="h-2.5 rounded-full overflow-hidden max-w-xs mx-auto relative"
          style={{ backgroundColor: `${colors.primary.DEFAULT}15` }}
        >
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            style={{ 
              backgroundColor: progressColor,
              boxShadow: isComplete ? `0 0 12px ${progressColor}` : undefined,
            }}
          />
        </div>
        
        <div 
          className="text-xs mt-3 uppercase tracking-widest font-medium"
          style={{ color: colors.text.muted }}
        >
          Week Progress
        </div>
      </motion.div>

      {/* Simple KPIs */}
      <motion.div variants={itemVariants} className="space-y-2">
        {simpleKpis.map((kpi, index) => (
          <motion.div
            key={kpi.kpi_id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
          >
            <KPIRow
              name={kpi.name}
              value={mergedValues[kpi.kpi_id] || 0}
              target={kpi.target}
              unit={kpi.unit}
              color={kpi.color}
              autoSynced={!!kpi.auto_sync_source && (syncedValues as any)[kpi.kpi_id] !== undefined}
              step={kpi.kpi_type === 'hours' ? 0.5 : 1}
              onChange={(value) => updateValue(kpi.kpi_id, value)}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Training KPI - Always rendered */}
      {trainingKpi && (
        <motion.div variants={itemVariants}>
          <TrainingKPI
            target={trainingKpi.target}
            sessions={sessions}
            countingSessionCount={countingSessionCount}
            trainingTypes={trainingTypes}
            color={trainingKpi.color}
            weekDates={weekDates}
            onAddSession={addSession}
            onRemoveSession={removeSession}
            onAddType={addTrainingType}
          />
        </motion.div>
      )}

      {/* Reading KPI - Always rendered */}
      {readingKpi && (
        <motion.div variants={itemVariants}>
          <ReadingKPI
            target={readingKpi.target}
            activeBooks={activeBooks}
            completedThisYear={completedThisYear}
            weeklyPagesRead={weeklyPagesRead}
            color={readingKpi.color}
            onUpdateProgress={updateProgress}
            onAddBook={addBook}
            onCompleteBook={completeBook}
            onPauseBook={pauseBook}
            onResumeBook={resumeBook}
            onDeleteBook={deleteBook}
          />
        </motion.div>
      )}

      {/* Nutrition KPI */}
      <motion.div variants={itemVariants}>
        <NutritionKPI
          weekData={nutritionData}
          weeklyTotals={nutritionTotals}
          dailyAverage={nutritionAverage}
          daysTracked={nutritionDaysTracked}
          targetCalories={nutritionTargets.calories}
          targetProtein={nutritionTargets.protein}
          onUpdateMeal={updateMeal}
          onUpdateTargets={handleUpdateNutritionTargets}
          weekDates={weekDates}
        />
      </motion.div>

      {/* Sleep KPI */}
      <motion.div variants={itemVariants}>
        <SleepKPI
          weekData={sleepData}
          weeklyTotal={sleepTotal}
          dailyAverage={sleepAverage}
          daysTracked={sleepDaysTracked}
          targetHours={sleepTarget}
          onUpdateDay={updateSleep}
          onUpdateTarget={handleUpdateSleepTarget}
          weekDates={weekDates}
        />
      </motion.div>

      {/* History */}
      <motion.div variants={itemVariants}>
        <WeeklyHistory
          weeks={historyWeeks}
          currentWeekKey={weekKey}
        />
      </motion.div>

      {/* Sync button */}
      <motion.div variants={itemVariants} className="flex justify-center pt-2">
        <button
          onClick={syncNow}
          disabled={isSyncing}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-all duration-200",
            isSyncing && "opacity-50 cursor-not-allowed"
          )}
          style={{
            color: colors.text.secondary,
            border: `1px solid ${colors.border.DEFAULT}`,
          }}
          onMouseEnter={(e) => {
            if (!isSyncing) {
              e.currentTarget.style.color = colors.primary.DEFAULT;
              e.currentTarget.style.borderColor = colors.primary.DEFAULT;
              e.currentTarget.style.backgroundColor = `${colors.primary.DEFAULT}10`;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = colors.text.secondary;
            e.currentTarget.style.borderColor = colors.border.DEFAULT;
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <RefreshCw size={14} className={cn(isSyncing && "animate-spin")} />
          {isSyncing ? 'Syncing...' : 'Sync External Data'}
        </button>
      </motion.div>
    </motion.div>
  );
};

export default WeeklyKPIs;
