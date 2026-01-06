/**
 * DailyChecklist Component
 *
 * Unified checklist for all daily data entry items.
 * Shows completion status and provides quick access to detailed entry.
 */

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Check,
  ChevronRight,
  Loader2,
  Zap,
  Dumbbell,
  Moon,
  Apple,
  Scale,
  BookOpen,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { getWeekKey, loadWeeklyKPIsWithSync } from "@/lib/weeklyKpi";
import { REALTIME_EVENTS } from "@/hooks/useRealtimeSync";

interface ChecklistItem {
  id: string;
  name: string;
  category: "deep work" | "fitness" | "health" | "learning" | "finance";
  isComplete: boolean;
  value?: string; // Display value when complete (e.g., "3 sessions")
  onClick: () => void;
}

interface DailyChecklistProps {
  date: Date;
  className?: string;
  onItemComplete?: (itemId: string) => void;
}

// Category colors
const CATEGORY_COLORS = {
  "deep work": "#5FE3B3",
  fitness: "#FF073A",
  health: "#9D4EDD",
  learning: "#FFA500",
  finance: "#FFD700",
};

// Icon components for each category
const getCategoryIcon = (item: { id: string; category: string }) => {
  switch (item.id) {
    case "deep-work":
      return Zap;
    case "training":
      return Dumbbell;
    case "sleep":
      return Moon;
    case "nutrition":
      return Apple;
    case "weight":
      return Scale;
    case "reading":
      return BookOpen;
    case "expenses":
      return DollarSign;
    default:
      return Check;
  }
};

export const DailyChecklist: React.FC<DailyChecklistProps> = ({
  date,
  className,
  onItemComplete,
}) => {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load completion status for the selected date
  const loadCompletionStatus = async () => {
    setIsLoading(true);
    const dateStr = format(date, "yyyy-MM-dd");

    // Initialize all items as incomplete
    const checklistItems: ChecklistItem[] = [
      {
        id: "deep-work",
        name: "Deep Work Sessions",
        category: "deep work",
        isComplete: false,
        onClick: () => {
          document.getElementById("daily-schedule")?.scrollIntoView({
            behavior: "smooth",
          });
        },
      },
      {
        id: "nutrition",
        name: "Nutrition Logged",
        category: "health",
        isComplete: false,
        onClick: () => {
          document.getElementById("nutrition-kpi")?.scrollIntoView({
            behavior: "smooth",
          });
        },
      },
      {
        id: "sleep",
        name: "Sleep Logged",
        category: "health",
        isComplete: false,
        onClick: () => {
          document.getElementById("sleep-kpi")?.scrollIntoView({
            behavior: "smooth",
          });
        },
      },
      {
        id: "weight",
        name: "Weight Logged",
        category: "health",
        isComplete: false,
        onClick: () => {
          document.getElementById("weight-kpi")?.scrollIntoView({
            behavior: "smooth",
          });
        },
      },
      {
        id: "training",
        name: "Training Sessions",
        category: "fitness",
        isComplete: false,
        onClick: () => {
          document.getElementById("training-kpi")?.scrollIntoView({
            behavior: "smooth",
          });
        },
      },
      {
        id: "reading",
        name: "Reading Progress",
        category: "learning",
        isComplete: false,
        onClick: () => {
          document.getElementById("reading-kpi")?.scrollIntoView({
            behavior: "smooth",
          });
        },
      },
      {
        id: "expenses",
        name: "Expenses Logged",
        category: "finance",
        isComplete: false,
        onClick: () => {
          document.getElementById("expenses-section")?.scrollIntoView({
            behavior: "smooth",
          });
        },
      },
    ];

    try {
      // 1. Load weekly KPI data with Supabase sync
      const weeklyKpiData = await loadWeeklyKPIsWithSync();
      const weekKey = getWeekKey(date);
      const record = weeklyKpiData.records?.find((r) => r.weekKey === weekKey);

      if (record?.values) {
        const values = record.values;

        // Deep Work: check if any hours logged
        const deepWorkValue = values.deepWorkHours || 0;
        checklistItems[0].isComplete = deepWorkValue > 0;
        checklistItems[0].value = `${deepWorkValue.toFixed(1)}h`;

        // Training: check if sessions logged
        const trainingValue = values.strengthSessions || 0;
        checklistItems[4].isComplete = trainingValue > 0;
        checklistItems[4].value = `${trainingValue} session${trainingValue !== 1 ? "s" : ""}`;

        // Reading: check if pages logged
        const readingValue = values.pagesRead || 0;
        checklistItems[5].isComplete = readingValue > 0;
        checklistItems[5].value = `${readingValue} page${readingValue !== 1 ? "s" : ""}`;
      }

      // 2. Check daily data for health metrics (from dailyByDate)
      if (record?.dailyByDate) {
        const dailyData = record.dailyByDate[dateStr];

        if (dailyData) {
          // Nutrition: check if any meals logged
          const hasNutrition =
            (dailyData.avg_calories || 0) > 0 ||
            (dailyData.avg_protein || 0) > 0;
          checklistItems[1].isComplete = hasNutrition;

          // Sleep: check if sleep logged
          const hasSleep = (dailyData.sleepTarget || 0) > 0;
          checklistItems[2].isComplete = hasSleep;

          // Weight: check if weight logged
          const hasWeight = (dailyData.weightTarget || 0) > 0;
          checklistItems[3].isComplete = hasWeight;
        }
      }

      // 3. Check expenses from cash storage
      const cashData = localStorage.getItem("noctisium-cash-data");
      if (cashData) {
        const parsed = JSON.parse(cashData);
        const expenses = parsed.expenses?.items || [];
        const todayExpenses = expenses.filter(
          (e: { date: string }) => e.date === dateStr,
        );
        const hasExpenses = todayExpenses.length > 0;
        checklistItems[6].isComplete = hasExpenses;

        if (hasExpenses) {
          const total = todayExpenses.reduce(
            (sum: number, e: { amount: number }) => sum + e.amount,
            0,
          );
          checklistItems[6].value = `$${total.toFixed(0)}`;
        }
      }
    } catch (error) {
      console.error("Failed to load completion status:", error);
    }

    setItems(checklistItems);
    setIsLoading(false);
  };

  useEffect(() => {
    loadCompletionStatus();
  }, [date]);

  // Listen for KPI update events to refresh the checklist
  useEffect(() => {
    const handleKPIUpdate = () => {
      console.log("[DailyChecklist] KPI update detected, refreshing...");
      loadCompletionStatus();
    };

    window.addEventListener(REALTIME_EVENTS.KPI_UPDATED, handleKPIUpdate);

    return () => {
      window.removeEventListener(REALTIME_EVENTS.KPI_UPDATED, handleKPIUpdate);
    };
  }, [date]);

  const completedCount = items.filter((i) => i.isComplete).length;
  const totalCount = items.length;
  const completionPercent =
    totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center p-6 rounded-lg",
          className,
        )}
        style={{
          backgroundColor: "rgba(95, 227, 179, 0.05)",
          border: "1px solid rgba(95, 227, 179, 0.2)",
        }}
      >
        <Loader2 size={24} className="animate-spin text-neon-cyan" />
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.2 },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn("space-y-3", className)}
    >
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-content-primary">
          Daily Checklist
        </h3>
        <div className="flex items-center gap-3">
          <div className="text-sm font-medium text-content-primary">
            {completedCount}/{totalCount}
          </div>
          <div className="text-xs text-content-muted">
            {format(date, "MMM d")}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full overflow-hidden bg-surface-tertiary">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-neon-cyan to-neon-green"
          initial={{ width: 0 }}
          animate={{ width: `${completionPercent}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Checklist items */}
      <div className="space-y-2">
        {items.map((item, index) => {
          const IconComponent = getCategoryIcon(item);
          return (
            <motion.div
              key={item.id}
              variants={itemVariants}
              onClick={item.onClick}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer group",
                item.isComplete
                  ? "opacity-100"
                  : "opacity-70 hover:opacity-100",
              )}
              style={{
                borderColor: item.isComplete
                  ? `${CATEGORY_COLORS[item.category]}40`
                  : "rgba(255, 255, 255, 0.1)",
                backgroundColor: item.isComplete
                  ? `${CATEGORY_COLORS[item.category]}10`
                  : "transparent",
              }}
            >
              {/* Checkbox */}
              <div
                className={cn(
                  "w-5 h-5 rounded-md flex items-center justify-center transition-all shrink-0",
                  item.isComplete
                    ? "bg-neon-cyan text-black"
                    : "border border-line/50 group-hover:border-neon-cyan/50",
                )}
              >
                {item.isComplete && <Check size={14} />}
              </div>

              {/* Icon and Name */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <IconComponent
                  size={16}
                  style={{ color: CATEGORY_COLORS[item.category] }}
                  className="shrink-0"
                />
                <span className="text-sm font-medium text-content-primary truncate">
                  {item.name}
                </span>
              </div>

              {/* Value (when complete) */}
              {item.value && (
                <span className="text-xs text-content-muted">{item.value}</span>
              )}

              {/* Chevron */}
              <ChevronRight
                size={16}
                className="text-content-muted shrink-0 group-hover:text-content-primary transition-colors"
              />
            </motion.div>
          );
        })}
      </div>

      {/* Empty state message when nothing complete */}
      {completedCount === 0 && !isLoading && (
        <div className="text-center py-4 text-xs text-content-muted">
          Tap an item to view or add data
        </div>
      )}
    </motion.div>
  );
};

export default DailyChecklist;
