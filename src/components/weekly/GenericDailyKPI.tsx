/**
 * GenericDailyKPI Component
 *
 * A generic KPI component with collapsible daily breakdown.
 * Used for user-created KPIs with display_mode = 'daily_breakdown'.
 * Based on DeepWorkKPI and PRsKPI patterns.
 */

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Target } from "lucide-react";
import { colors } from "@/styles/design-tokens";

interface DailyValue {
  date: string;
  value: number;
}

interface GenericDailyKPIProps {
  name: string;
  kpiId: string;
  target: number;
  unit: string;
  color: string;
  totalValue: number;
  dailyValues: DailyValue[];
  weekDates: { start: Date; end: Date };
  onUpdateDayValue?: (date: string, value: number) => void;
  isAverage?: boolean;
}

export const GenericDailyKPI: React.FC<GenericDailyKPIProps> = ({
  name,
  kpiId,
  target,
  unit,
  color,
  totalValue,
  dailyValues,
  weekDates,
  onUpdateDayValue,
  isAverage = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  // Generate all 7 days of the week
  const weekDays = useMemo(() => {
    const days: string[] = [];
    const current = new Date(weekDates.start);
    while (current <= weekDates.end) {
      days.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [weekDates]);

  // Create a map of daily values by date
  const dailyValueMap = useMemo(() => {
    return dailyValues.reduce(
      (acc, dv) => {
        acc[dv.date] = dv.value;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [dailyValues]);

  // Calculate display value (total or average)
  const displayValue = isAverage
    ? dailyValues.length > 0
      ? totalValue / dailyValues.filter((d) => d.value > 0).length
      : 0
    : totalValue;

  const progress =
    target > 0 ? Math.min(100, (displayValue / target) * 100) : 0;
  const isComplete = progress >= 100;

  const progressColor = isComplete ? colors.success.DEFAULT : color;

  // Format day name
  const formatDayName = (date: string) => {
    const d = new Date(date + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateObj = new Date(date + "T00:00:00");
    dateObj.setHours(0, 0, 0, 0);

    if (dateObj.getTime() === today.getTime()) return "Today";
    return d.toLocaleDateString(undefined, { weekday: "short" });
  };

  // Format value display
  const formatValue = (value: number) => {
    if (value === 0) return "0";
    if (Number.isInteger(value)) return value.toString();
    return value.toFixed(1);
  };

  const handleStartEdit = (date: string) => {
    setEditingDay(date);
    setEditValue((dailyValueMap[date] || 0).toString());
  };

  const handleSaveEdit = (date: string) => {
    const numValue = parseFloat(editValue) || 0;
    onUpdateDayValue?.(date, numValue);
    setEditingDay(null);
    setEditValue("");
  };

  const handleCancelEdit = () => {
    setEditingDay(null);
    setEditValue("");
  };

  return (
    <motion.div
      className="p-4 rounded-lg"
      style={{
        backgroundColor: colors.background.secondary,
        border: `1px solid ${isComplete ? progressColor + "50" : colors.border.accent}`,
        boxShadow: isComplete ? `0 0 20px ${progressColor}25` : undefined,
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between mb-3 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center"
            style={{
              backgroundColor: `${progressColor}20`,
              border: `1px solid ${progressColor}40`,
            }}
          >
            <Target size={16} style={{ color: progressColor }} />
          </div>
          <div className="text-left">
            <span
              className="font-semibold text-sm"
              style={{ color: progressColor }}
            >
              {name}
            </span>
            <div
              className="text-xs font-mono"
              style={{ color: colors.text.muted }}
            >
              {formatValue(displayValue)}/{target} {unit}
              {isAverage ? " (avg)" : " this week"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="text-lg font-bold font-mono"
            style={{
              color: progressColor,
              textShadow: isComplete ? `0 0 10px ${progressColor}` : undefined,
            }}
          >
            {Math.round(progress)}%
          </div>
          {isCollapsed ? (
            <ChevronDown size={18} style={{ color: colors.text.muted }} />
          ) : (
            <ChevronUp size={18} style={{ color: colors.text.muted }} />
          )}
        </div>
      </button>

      {/* Progress bar */}
      <div
        className="h-2 rounded-full overflow-hidden mb-4"
        style={{ backgroundColor: `${progressColor}15` }}
      >
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: [0, 0, 0.2, 1] }}
          style={{
            backgroundColor: progressColor,
            boxShadow: isComplete ? `0 0 10px ${progressColor}` : undefined,
          }}
        />
      </div>

      {/* Collapsible content - Daily breakdown */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-1">
              {weekDays.map((date) => {
                const dayValue = dailyValueMap[date] || 0;
                const hasData = dayValue > 0;
                const isEditing = editingDay === date;
                const dailyTarget = target / 7;

                return (
                  <div
                    key={date}
                    className="flex items-center justify-between py-2 px-2 rounded-md"
                    style={{
                      backgroundColor: hasData
                        ? `${progressColor}10`
                        : "transparent",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="text-xs font-mono w-12"
                        style={{ color: colors.text.muted }}
                      >
                        {formatDayName(date)}
                      </span>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.stopPropagation();
                                handleSaveEdit(date);
                              } else if (e.key === "Escape") {
                                e.stopPropagation();
                                handleCancelEdit();
                              }
                            }}
                            className="w-16 px-1.5 py-0.5 rounded text-xs font-mono"
                            style={{
                              backgroundColor: colors.background.elevated,
                              border: `1px solid ${colors.primary.DEFAULT}`,
                              color: colors.text.primary,
                            }}
                            autoFocus
                          />
                          <span
                            className="text-xs"
                            style={{ color: colors.text.muted }}
                          >
                            {unit}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onUpdateDayValue) handleStartEdit(date);
                          }}
                          className={`flex items-center gap-2 ${onUpdateDayValue ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
                        >
                          {hasData ? (
                            <div className="flex items-center gap-2">
                              <span
                                className="text-sm font-mono font-medium"
                                style={{ color: progressColor }}
                              >
                                {formatValue(dayValue)} {unit}
                              </span>
                            </div>
                          ) : (
                            <span
                              className="text-xs"
                              style={{ color: colors.text.disabled }}
                            >
                              No data {onUpdateDayValue && "(click to add)"}
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                    {/* Mini progress bar for the day */}
                    {hasData && !isEditing && (
                      <div
                        className="w-16 h-1.5 rounded-full overflow-hidden"
                        style={{ backgroundColor: `${progressColor}20` }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, (dayValue / dailyTarget) * 100)}%`,
                            backgroundColor: progressColor,
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Weekly Summary */}
            <div
              className="mt-4 pt-3 flex justify-between items-center"
              style={{ borderTop: `1px solid ${colors.border.DEFAULT}` }}
            >
              <span
                className="text-xs font-medium"
                style={{ color: colors.text.muted }}
              >
                {isAverage ? "Daily Average" : "Weekly Total"}
              </span>
              <span
                className="text-sm font-mono font-medium"
                style={{
                  color: progressColor,
                }}
              >
                {formatValue(displayValue)} {unit}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default GenericDailyKPI;
