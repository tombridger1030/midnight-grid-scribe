/**
 * SleepKPI Component
 *
 * Tracks daily sleep with 7-day grid view.
 * Shows sleep time, wake time, and hours per day.
 */

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Moon,
  Sun,
  Clock,
  ChevronDown,
  ChevronUp,
  Edit2,
  Check,
} from "lucide-react";
import { colors } from "@/styles/design-tokens";
import { DailySleep } from "@/hooks/useSleep";

interface SleepKPIProps {
  weekData: Record<string, DailySleep>;
  weeklyTotal: number;
  dailyAverage: number;
  daysTracked: number;
  targetSleep: number;
  onUpdateDay: (date: string, data: Partial<DailySleep>) => void;
  weekDates: { start: Date; end: Date };
  onUpdateTarget?: (target: number) => void;
}

export const SleepKPI: React.FC<SleepKPIProps> = ({
  weekData,
  weeklyTotal,
  dailyAverage,
  daysTracked,
  targetSleep,
  onUpdateDay,
  weekDates,
  onUpdateTarget,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [editTarget, setEditTarget] = useState<number>(targetSleep);
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

  // Calculate progress
  const progress =
    targetSleep > 0 ? Math.min(100, (dailyAverage / targetSleep) * 100) : 0;
  const isOnTarget = dailyAverage >= targetSleep;

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

  // Get bar height percentage based on hours (max 12 hours)
  const getBarHeight = (hours: number) => {
    return Math.min(100, (hours / 12) * 100);
  };

  // Get color based on hours
  const getBarColor = (hours: number) => {
    if (hours >= targetSleep) return colors.success.DEFAULT;
    if (hours >= targetSleep - 1) return colors.warning.DEFAULT;
    if (hours > 0) return colors.danger.DEFAULT;
    return colors.border.DEFAULT;
  };

  const handleTimeChange = (
    date: string,
    field: "sleep_time" | "wake_time",
    value: string,
  ) => {
    onUpdateDay(date, { [field]: value || null });
  };

  const handleHoursChange = (date: string, value: string) => {
    const hours = parseFloat(value) || 0;
    onUpdateDay(date, { hours });
  };

  return (
    <motion.div
      className="p-4 rounded-lg"
      style={{
        backgroundColor: colors.background.secondary,
        border: `1px solid ${isOnTarget ? colors.success.DEFAULT + "50" : colors.border.accent}`,
        boxShadow: isOnTarget
          ? `0 0 20px ${colors.success.DEFAULT}25`
          : undefined,
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header - Clickable to toggle collapse */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between mb-4 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center"
            style={{
              backgroundColor: `${colors.primary.DEFAULT}20`,
              border: `1px solid ${colors.primary.DEFAULT}40`,
            }}
          >
            <Moon size={16} style={{ color: colors.primary.DEFAULT }} />
          </div>
          <div className="text-left">
            <span
              className="font-semibold text-sm"
              style={{
                color: isOnTarget
                  ? colors.success.DEFAULT
                  : colors.primary.DEFAULT,
              }}
            >
              Sleep
            </span>
            <div
              className="text-xs font-mono"
              style={{ color: colors.text.muted }}
            >
              {dailyAverage.toFixed(1)}h avg • {daysTracked}/7 days
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div
              className="text-lg font-bold font-mono"
              style={{
                color: isOnTarget
                  ? colors.success.DEFAULT
                  : colors.primary.DEFAULT,
                textShadow: isOnTarget
                  ? `0 0 10px ${colors.success.DEFAULT}`
                  : undefined,
              }}
            >
              {Math.round(progress)}%
            </div>
          </div>
          {isCollapsed ? (
            <ChevronDown size={18} style={{ color: colors.text.muted }} />
          ) : (
            <ChevronUp size={18} style={{ color: colors.text.muted }} />
          )}
        </div>
      </button>

      {/* Progress bar - always visible */}
      <div
        className="h-2 rounded-full overflow-hidden mb-4"
        style={{ backgroundColor: `${colors.primary.DEFAULT}15` }}
      >
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: [0, 0, 0.2, 1] }}
          style={{
            backgroundColor: isOnTarget
              ? colors.success.DEFAULT
              : colors.primary.DEFAULT,
            boxShadow: isOnTarget
              ? `0 0 10px ${colors.success.DEFAULT}`
              : undefined,
          }}
        />
      </div>

      {/* Collapsible content */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* 7-Day Visual Bar Chart */}
            <div
              className="h-32 flex items-end justify-between gap-2 mb-4 p-3 rounded-md"
              style={{ backgroundColor: colors.background.tertiary }}
            >
              {weekDays.map((date, index) => {
                const dayData = weekData[date];
                const hours = dayData?.hours || 0;
                const barHeight = getBarHeight(hours);
                const barColor = getBarColor(hours);

                return (
                  <div
                    key={date}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    {/* Hour label */}
                    <span
                      className="text-[10px] font-mono"
                      style={{
                        color: hours > 0 ? barColor : colors.text.disabled,
                      }}
                    >
                      {hours > 0 ? hours.toFixed(1) : "-"}
                    </span>

                    {/* Bar */}
                    <motion.div
                      className="w-full rounded-t-sm"
                      initial={{ height: 0 }}
                      animate={{ height: `${barHeight}%` }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                      style={{
                        backgroundColor: barColor,
                        minHeight: hours > 0 ? "4px" : "2px",
                        opacity: hours > 0 ? 1 : 0.3,
                      }}
                    />

                    {/* Day label */}
                    <span
                      className="text-[10px] font-mono"
                      style={{ color: colors.text.muted }}
                    >
                      {formatDayName(date).slice(0, 2)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Target line indicator */}
            <div
              className="flex items-center gap-2 mb-4 text-xs"
              style={{ color: colors.text.muted }}
            >
              <div
                className="h-0.5 flex-1"
                style={{ backgroundColor: colors.success.DEFAULT + "50" }}
              />
              {isEditingTarget ? (
                <span className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max="12"
                    step="0.5"
                    value={editTarget}
                    onChange={(e) =>
                      setEditTarget(parseFloat(e.target.value) || 1)
                    }
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        onUpdateTarget?.(editTarget);
                        setIsEditingTarget(false);
                      } else if (e.key === "Escape") {
                        e.stopPropagation();
                        setEditTarget(targetSleep);
                        setIsEditingTarget(false);
                      }
                    }}
                    className="w-12 px-1 py-0.5 rounded text-xs font-mono"
                    style={{
                      backgroundColor: colors.background.elevated,
                      border: `1px solid ${colors.primary.DEFAULT}`,
                      color: colors.text.primary,
                    }}
                    autoFocus
                  />
                  h target
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateTarget?.(editTarget);
                      setIsEditingTarget(false);
                    }}
                    className="p-0.5 rounded hover:bg-white/10"
                  >
                    <Check
                      size={12}
                      style={{ color: colors.success.DEFAULT }}
                    />
                  </button>
                </span>
              ) : (
                <span className="font-mono flex items-center gap-1">
                  {targetSleep}h target
                  {onUpdateTarget && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditTarget(targetSleep);
                        setIsEditingTarget(true);
                      }}
                      className="p-0.5 rounded hover:bg-white/10 opacity-50 hover:opacity-100"
                      title="Edit target"
                    >
                      <Edit2 size={10} style={{ color: colors.text.muted }} />
                    </button>
                  )}
                </span>
              )}
              <div
                className="h-0.5 flex-1"
                style={{ backgroundColor: colors.success.DEFAULT + "50" }}
              />
            </div>

            {/* Day-by-day inputs */}
            <div className="space-y-2">
              {weekDays.map((date) => {
                const dayData = weekData[date];
                const isToday =
                  new Date(date + "T00:00:00").toDateString() ===
                  new Date().toDateString();

                return (
                  <div
                    key={date}
                    className="flex items-center gap-2 p-2 rounded-md"
                    style={{
                      backgroundColor: isToday
                        ? colors.background.tertiary
                        : "transparent",
                      border: isToday
                        ? `1px solid ${colors.primary.DEFAULT}30`
                        : undefined,
                    }}
                  >
                    {/* Day name */}
                    <span
                      className="text-xs font-mono w-12"
                      style={{
                        color: isToday
                          ? colors.primary.DEFAULT
                          : colors.text.muted,
                      }}
                    >
                      {formatDayName(date)}
                    </span>

                    {/* Sleep time */}
                    <div className="flex items-center gap-1">
                      <Moon size={12} style={{ color: colors.text.muted }} />
                      <input
                        type="time"
                        value={dayData?.sleep_time || ""}
                        onChange={(e) =>
                          handleTimeChange(date, "sleep_time", e.target.value)
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="w-24 px-1.5 py-1 rounded text-xs font-mono"
                        style={{
                          backgroundColor: colors.background.elevated,
                          border: `1px solid ${colors.border.DEFAULT}`,
                          color: colors.text.primary,
                        }}
                      />
                    </div>

                    {/* Wake time */}
                    <div className="flex items-center gap-1">
                      <Sun
                        size={12}
                        style={{ color: colors.warning.DEFAULT }}
                      />
                      <input
                        type="time"
                        value={dayData?.wake_time || ""}
                        onChange={(e) =>
                          handleTimeChange(date, "wake_time", e.target.value)
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="w-24 px-1.5 py-1 rounded text-xs font-mono"
                        style={{
                          backgroundColor: colors.background.elevated,
                          border: `1px solid ${colors.border.DEFAULT}`,
                          color: colors.text.primary,
                        }}
                      />
                    </div>

                    {/* Hours (manual override) */}
                    <div className="flex items-center gap-1 ml-auto">
                      <Clock size={12} style={{ color: colors.text.muted }} />
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="24"
                        placeholder="hrs"
                        value={dayData?.hours || ""}
                        onChange={(e) =>
                          handleHoursChange(date, e.target.value)
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="w-14 px-1.5 py-1 rounded text-xs font-mono text-center"
                        style={{
                          backgroundColor: colors.background.elevated,
                          border: `1px solid ${colors.border.DEFAULT}`,
                          color: colors.text.primary,
                        }}
                      />
                    </div>
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
                Weekly Total
              </span>
              <span
                className="text-sm font-mono font-medium"
                style={{
                  color: isOnTarget
                    ? colors.success.DEFAULT
                    : colors.primary.DEFAULT,
                }}
              >
                {weeklyTotal.toFixed(1)} hours
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SleepKPI;
