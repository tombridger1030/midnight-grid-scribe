/**
 * WeeklyKPIs Component
 *
 * Main weekly KPI tracking interface.
 * Streamlined, fast input with multi-type training and book tracking.
 *
 * Design: Cyberpunk aesthetic with Electric Cyan, Neon Green accents
 */

import React, { useMemo, useCallback, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { colors, shadows } from "@/styles/design-tokens";
import { useWeeklyKPIs } from "@/hooks/useWeeklyKPIs";
import { useTraining } from "@/hooks/useTraining";
import { useBooks } from "@/hooks/useBooks";
import { useAutoSync } from "@/hooks/useAutoSync";
import { useNutrition } from "@/hooks/useNutrition";
import { useSleep } from "@/hooks/useSleep";
import { useWeight } from "@/hooks/useWeight";
import { KPIRow } from "./KPIRow";
import { TrainingKPI } from "./TrainingKPI";
import { ReadingKPI } from "./ReadingKPI";
import { NutritionKPI } from "./NutritionKPI";
import { SleepKPI } from "./SleepKPI";
import { WeightKPI } from "./WeightKPI";
import { DeepWorkKPI } from "./DeepWorkKPI";
import { PRsKPI } from "./PRsKPI";
import { GenericDailyKPI } from "./GenericDailyKPI";
import { WeeklyHistory } from "./WeeklyHistory";
import { DEFAULT_KPIS } from "@/lib/kpiDefaults";
import { getRecentWeeks, loadWeeklyKPIs } from "@/lib/weeklyKpi";
import { kpiManager } from "@/lib/configurableKpis";
import { toast } from "sonner";

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

  // Weight data
  const {
    weekData: weightData,
    weeklyStats: weightStats,
    daysTracked: weightDaysTracked,
    updateDay: updateWeight,
    isLoading: weightLoading,
  } = useWeight(weekKey);

  // Read targets from KPIs array (database-backed)
  const sleepTargetKpi = kpis.find((k) => k.kpi_id === "sleepTarget");
  const weightTargetKpi = kpis.find((k) => k.kpi_id === "weightTarget");

  // Nutrition targets stored in localStorage for combined score calculation
  const [nutritionTargets, setNutritionTargets] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("noctisium-nutrition-targets");
      if (stored) {
        return JSON.parse(stored);
      }
    }
    return { calories: 2000, protein: 150 };
  });

  const targetCalories = nutritionTargets.calories;
  const targetProtein = nutritionTargets.protein;
  const targetSleep = sleepTargetKpi?.target ?? 7;
  const targetWeight = weightTargetKpi?.target ?? 180;

  // Target update callbacks
  const handleUpdateTrainingTarget = useCallback(
    async (target: number) => {
      try {
        // First ensure training KPI exists in database
        const existingTraining = kpis.find((k) => k.kpi_type === "training");
        if (existingTraining) {
          await kpiManager.updateKPI("training", { target });
        } else {
          // Create training KPI from default
          const defaultTraining = DEFAULT_KPIS.find(
            (k) => k.kpi_type === "training",
          );
          if (defaultTraining) {
            await kpiManager.saveKPI({ ...defaultTraining, target });
          }
        }
        toast.success("Training target updated");
        refreshData();
      } catch (error) {
        console.error("Failed to update training target:", error);
        toast.error("Failed to update target");
      }
    },
    [kpis, refreshData],
  );

  const handleUpdateCaloriesTarget = useCallback(
    (target: number) => {
      const updated = { ...nutritionTargets, calories: target };
      setNutritionTargets(updated);
      localStorage.setItem(
        "noctisium-nutrition-targets",
        JSON.stringify(updated),
      );
      toast.success("Calories target updated");
    },
    [nutritionTargets],
  );

  const handleUpdateProteinTarget = useCallback(
    (target: number) => {
      const updated = { ...nutritionTargets, protein: target };
      setNutritionTargets(updated);
      localStorage.setItem(
        "noctisium-nutrition-targets",
        JSON.stringify(updated),
      );
      toast.success("Protein target updated");
    },
    [nutritionTargets],
  );

  const handleUpdateSleepTarget = useCallback(
    async (target: number) => {
      try {
        await kpiManager.updateKPI("sleepTarget", { target });
        toast.success("Sleep target updated");
        refreshData();
      } catch (error) {
        console.error("Failed to update sleep target:", error);
        toast.error("Failed to update target");
      }
    },
    [refreshData],
  );

  const handleUpdateWeightTarget = useCallback(
    async (target: number) => {
      try {
        await kpiManager.updateKPI("weightTarget", { target });
        toast.success("Weight target updated");
        refreshData();
      } catch (error) {
        console.error("Failed to update weight target:", error);
        toast.error("Failed to update target");
      }
    },
    [refreshData],
  );

  // Auto-sync data
  const { kpiValueMapping, isSyncing, syncNow } = useAutoSync(weekKey);

  // Calculate nutrition score (combined % of calories + protein targets)
  const calculateNutritionScore = useCallback(() => {
    if (nutritionDaysTracked === 0) return 0;
    const calorieScore = Math.min(
      100,
      (nutritionAverage.calories / targetCalories) * 100,
    );
    const proteinScore = Math.min(
      100,
      (nutritionAverage.protein / targetProtein) * 100,
    );
    return Math.round((calorieScore + proteinScore) / 2);
  }, [nutritionAverage, nutritionDaysTracked, targetCalories, targetProtein]);

  // Map specialized KPI values from their respective hooks
  // These KPIs have their own UI components and store data in separate tables
  const specializedKpiValues = useMemo(
    () => ({
      trainingSessions: countingSessionCount,
      sleepAverage: sleepAverage,
      nutrition: calculateNutritionScore(),
      weightDaysTracked: weightDaysTracked,
      pagesRead: weeklyPagesRead,
    }),
    [
      countingSessionCount,
      sleepAverage,
      calculateNutritionScore,
      weightDaysTracked,
      weeklyPagesRead,
    ],
  );

  // Merge synced values with manual values and specialized KPI values
  const mergedValues = useMemo(
    () => ({
      ...values,
      ...kpiValueMapping, // Auto-synced values override manual ones
      ...specializedKpiValues, // Specialized KPI values from their hooks
    }),
    [values, kpiValueMapping, specializedKpiValues],
  );

  // Recalculate overall progress using merged values (includes auto-synced)
  // This fixes the bug where overallProgress from hook uses empty database values
  const calculatedProgress = useMemo(() => {
    // Get training target from kpis for specialized config
    const trainingKpiForTarget = kpis.find((k) => k.kpi_type === "training");

    // Define specialized KPI configs for progress calculation
    // These KPIs exist as components but may not be in the database kpis array
    const specializedKpiConfigs = [
      {
        kpi_id: "trainingSessions",
        target: trainingKpiForTarget?.target ?? 4,
        is_active: true,
        weight: 1,
      },
      {
        kpi_id: "sleepAverage",
        target: targetSleep,
        is_active: true,
        weight: 1,
      },
      {
        kpi_id: "nutrition",
        target: 100,
        is_active: true,
        weight: 1,
      },
      {
        kpi_id: "weightDaysTracked",
        target: 7,
        is_active: true,
        weight: 1,
      },
    ];

    // Combine database KPIs with specialized KPI configs (avoid duplicates)
    const kpiIds = new Set(kpis.map((k) => k.kpi_id));
    const uniqueSpecialized = specializedKpiConfigs.filter(
      (k) => !kpiIds.has(k.kpi_id),
    );
    const combinedKpis = [...kpis, ...uniqueSpecialized];

    const activeKpis = combinedKpis.filter(
      (k) => k.is_active && k.target && k.target > 0 && (k.weight ?? 1) > 0,
    );
    if (activeKpis.length === 0) return 0;

    let totalProgress = 0;
    for (const kpi of activeKpis) {
      const value = mergedValues[kpi.kpi_id] || 0;
      const progress = Math.min(100, (value / kpi.target!) * 100);
      totalProgress += progress;
    }

    return Math.round(totalProgress / activeKpis.length);
  }, [kpis, mergedValues, targetSleep]);

  // Persist auto-synced values based on KPI auto_sync_source configuration
  useEffect(() => {
    const persistSyncedValues = async () => {
      // Persist KPI-specific mapping based on database kpi_id
      for (const [kpiId, value] of Object.entries(kpiValueMapping)) {
        const currentValue = values[kpiId] || 0;
        if (value > currentValue) {
          await updateValue(kpiId, value);
        }
      }
    };

    if (Object.keys(kpiValueMapping).length > 0) {
      persistSyncedValues();
    }
  }, [kpiValueMapping, values]);

  // Calculate history data
  const historyWeeks = useMemo(() => {
    const weekKeys = getRecentWeeks(5);
    const weeklyData = loadWeeklyKPIs();

    return weekKeys.map((wk) => {
      const record = weeklyData.records.find((r) => r.weekKey === wk);
      const weekValues = record?.values || {};

      const activeKpis = kpis.filter(
        (k) => k.is_active && k.target && k.target > 0,
      );
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

  // Handle hash scroll for anchor navigation from Daily Checklist
  useEffect(() => {
    const handleHashScroll = () => {
      const hash = window.location.hash.slice(1); // Remove # from hash
      if (hash) {
        // Wait for component to render then scroll
        setTimeout(() => {
          const element = document.getElementById(hash);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 100);
      }
    };

    handleHashScroll();

    // Listen for hash changes
    window.addEventListener("hashchange", handleHashScroll);
    return () => {
      window.removeEventListener("hashchange", handleHashScroll);
    };
  }, []);

  // Get progress color using design tokens
  const getProgressColor = useCallback((percentage: number): string => {
    if (percentage >= 90) return colors.success.DEFAULT;
    if (percentage >= 70) return colors.primary.DEFAULT;
    if (percentage >= 50) return colors.warning.DEFAULT;
    return colors.danger.DEFAULT;
  }, []);

  // Filter KPIs by type - with fallback to defaults for Training and Reading
  // Exclude deepWorkHours and prRequests as they have dedicated components
  // Also exclude KPIs with daily_breakdown display_mode (rendered separately)
  const simpleKpis = kpis.filter(
    (k) =>
      k.kpi_type !== "training" &&
      k.kpi_type !== "reading" &&
      k.kpi_id !== "deepWorkHours" &&
      k.kpi_id !== "prRequests" &&
      k.display_mode !== "daily_breakdown",
  );

  // Get KPIs with daily breakdown display mode
  const dailyBreakdownKpis = kpis.filter(
    (k) =>
      k.display_mode === "daily_breakdown" &&
      k.kpi_id !== "deepWorkHours" &&
      k.kpi_id !== "prRequests",
  );

  // Get targets for dedicated KPI components
  const deepWorkKpi = kpis.find((k) => k.kpi_id === "deepWorkHours");
  const prRequestsKpi = kpis.find((k) => k.kpi_id === "prRequests");
  const deepWorkTarget = deepWorkKpi?.target ?? 30;
  const prsTarget = prRequestsKpi?.target ?? 5;

  // Always show Training/Reading with fallback to defaults if not in user's KPIs
  const trainingKpi =
    kpis.find((k) => k.kpi_type === "training") ||
    DEFAULT_KPIS.find((k) => k.kpi_type === "training");
  const readingKpi =
    kpis.find((k) => k.kpi_type === "reading") ||
    DEFAULT_KPIS.find((k) => k.kpi_type === "reading");

  const isLoading =
    kpisLoading ||
    trainingLoading ||
    booksLoading ||
    nutritionLoading ||
    sleepLoading ||
    weightLoading;

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
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <RefreshCw size={28} style={{ color: colors.primary.DEFAULT }} />
          </motion.div>
        </div>
      </div>
    );
  }

  const progressColor = getProgressColor(calculatedProgress);
  const isComplete = calculatedProgress >= 100;

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
          onClick={() => navigateWeek("prev")}
          className="p-2 rounded-md transition-all duration-200 hover:scale-105"
          style={{
            border: `1px solid ${colors.primary.DEFAULT}30`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = `${colors.primary.DEFAULT}15`;
            e.currentTarget.style.borderColor = `${colors.primary.DEFAULT}60`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
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
          onClick={() => navigateWeek("next")}
          className="p-2 rounded-md transition-all duration-200 hover:scale-105"
          style={{
            border: `1px solid ${colors.primary.DEFAULT}30`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = `${colors.primary.DEFAULT}15`;
            e.currentTarget.style.borderColor = `${colors.primary.DEFAULT}60`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
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
        {calculatedProgress >= 70 && (
          <div
            className="absolute inset-0 opacity-10"
            style={{
              background: `radial-gradient(circle at center, ${progressColor} 0%, transparent 70%)`,
            }}
          />
        )}

        <motion.div
          key={calculatedProgress}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="text-5xl font-bold font-mono mb-3 relative"
          style={{
            color: progressColor,
            textShadow: isComplete ? `0 0 20px ${progressColor}` : undefined,
          }}
        >
          {calculatedProgress}%
        </motion.div>

        <div
          className="h-2.5 rounded-full overflow-hidden max-w-xs mx-auto relative"
          style={{ backgroundColor: `${colors.primary.DEFAULT}15` }}
        >
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${calculatedProgress}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
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
              autoSynced={
                !!kpi.auto_sync_source &&
                kpiValueMapping[kpi.kpi_id] !== undefined
              }
              step={kpi.kpi_type === "hours" ? 0.5 : 1}
              onChange={(value) => updateValue(kpi.kpi_id, value)}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Deep Work KPI with daily breakdown */}
      <motion.div variants={itemVariants} id="deep-work-kpi">
        <DeepWorkKPI target={deepWorkTarget} weekDates={weekDates} />
      </motion.div>

      {/* PRs Created KPI with daily breakdown */}
      <motion.div variants={itemVariants} id="ship-kpi">
        <PRsKPI target={prsTarget} weekDates={weekDates} />
      </motion.div>

      {/* Generic Daily Breakdown KPIs */}
      {dailyBreakdownKpis.map((kpi) => (
        <motion.div
          key={kpi.kpi_id}
          variants={itemVariants}
          id={`${kpi.kpi_id}-kpi`}
        >
          <GenericDailyKPI
            name={kpi.name}
            kpiId={kpi.kpi_id}
            target={kpi.target || 0}
            unit={kpi.unit}
            color={kpi.color}
            totalValue={mergedValues[kpi.kpi_id] || 0}
            dailyValues={[]}
            weekDates={weekDates}
            onUpdateDayValue={(date, value) => {
              // For now, update the weekly total
              // In the future, we could store per-day values
              const currentTotal = mergedValues[kpi.kpi_id] || 0;
              const newTotal = currentTotal + value;
              updateValue(kpi.kpi_id, newTotal);
            }}
          />
        </motion.div>
      ))}

      {/* Training KPI - Always rendered */}
      {trainingKpi && (
        <motion.div variants={itemVariants} id="training-kpi">
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
            onUpdateTarget={handleUpdateTrainingTarget}
          />
        </motion.div>
      )}

      {/* Reading KPI - Always rendered */}
      {readingKpi && (
        <motion.div variants={itemVariants} id="reading-kpi">
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
      <motion.div variants={itemVariants} id="nutrition-kpi">
        <NutritionKPI
          weekData={nutritionData}
          weeklyTotals={nutritionTotals}
          dailyAverage={nutritionAverage}
          daysTracked={nutritionDaysTracked}
          targetCalories={targetCalories}
          targetProtein={targetProtein}
          onUpdateMeal={updateMeal}
          weekDates={weekDates}
          onUpdateCaloriesTarget={handleUpdateCaloriesTarget}
          onUpdateProteinTarget={handleUpdateProteinTarget}
        />
      </motion.div>

      {/* Sleep KPI */}
      <motion.div variants={itemVariants} id="sleep-kpi">
        <SleepKPI
          weekData={sleepData}
          weeklyTotal={sleepTotal}
          dailyAverage={sleepAverage}
          daysTracked={sleepDaysTracked}
          targetSleep={targetSleep}
          onUpdateDay={updateSleep}
          weekDates={weekDates}
          onUpdateTarget={handleUpdateSleepTarget}
        />
      </motion.div>

      {/* Weight KPI */}
      <motion.div variants={itemVariants} id="weight-kpi">
        <WeightKPI
          weekData={weightData}
          weeklyStats={weightStats}
          daysTracked={weightDaysTracked}
          targetLbs={targetWeight}
          onUpdateDay={updateWeight}
          weekDates={weekDates}
          onUpdateTarget={handleUpdateWeightTarget}
        />
      </motion.div>

      {/* History */}
      <motion.div variants={itemVariants}>
        <WeeklyHistory weeks={historyWeeks} currentWeekKey={weekKey} />
      </motion.div>

      {/* Sync button */}
      <motion.div variants={itemVariants} className="flex justify-center pt-2">
        <button
          onClick={syncNow}
          disabled={isSyncing}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-all duration-200",
            isSyncing && "opacity-50 cursor-not-allowed",
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
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <RefreshCw size={14} className={cn(isSyncing && "animate-spin")} />
          {isSyncing ? "Syncing..." : "Sync External Data"}
        </button>
      </motion.div>
    </motion.div>
  );
};

export default WeeklyKPIs;
