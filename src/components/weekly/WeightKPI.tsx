/**
 * WeightKPI Component
 *
 * Tracks daily weight with 7-day grid view.
 * Shows weight per day with trend indicator and sparkline chart.
 */

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scale,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { colors } from "@/styles/design-tokens";
import { DailyWeight } from "@/hooks/useWeight";

interface WeightKPIProps {
  weekData: Record<string, DailyWeight>;
  weeklyStats: {
    startWeight: number;
    endWeight: number;
    weightChange: number;
    avgWeight: number;
    minWeight: number;
    maxWeight: number;
    trend: "up" | "down" | "neutral";
  };
  daysTracked: number;
  targetLbs: number;
  onUpdateDay: (date: string, data: Partial<DailyWeight>) => void;
  onUpdateTarget?: (target: number) => void;
  weekDates: { start: Date; end: Date };
}

const WEIGHT_COLOR = "#00CED1"; // Turquoise/Teal for weight tracking

export const WeightKPI: React.FC<WeightKPIProps> = ({
  weekData,
  weeklyStats,
  daysTracked,
  targetLbs,
  onUpdateDay,
  onUpdateTarget,
  weekDates,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [editTargetValue, setEditTargetValue] = useState(targetLbs.toString());

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

  // Get weight values in order for sparkline
  const weightValues = useMemo(() => {
    return weekDays.map((date) => weekData[date]?.weight_lbs || null);
  }, [weekDays, weekData]);

  // Calculate target progress (if target is lower than current, loss is good)
  const progress =
    targetLbs > 0
      ? Math.min(
          100,
          Math.max(
            0,
            ((targetLbs - weeklyStats.endWeight) /
              (targetLbs - weeklyStats.startWeight || 1)) *
              100 +
              50,
          ),
        )
      : 50;

  const isOnTarget =
    weeklyStats.trend === "down" || weeklyStats.trend === "neutral";

  // Format day name
  const formatDayName = (date: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateObj = new Date(date + "T00:00:00");
    dateObj.setHours(0, 0, 0, 0);

    if (dateObj.getTime() === today.getTime()) return "Today";
    return dateObj.toLocaleDateString(undefined, { weekday: "short" });
  };

  // Get trend icon
  const getTrendIcon = () => {
    switch (weeklyStats.trend) {
      case "up":
        return (
          <TrendingUp size={16} style={{ color: colors.danger.DEFAULT }} />
        );
      case "down":
        return (
          <TrendingDown size={16} style={{ color: colors.success.DEFAULT }} />
        );
      default:
        return <Minus size={16} style={{ color: colors.text.muted }} />;
    }
  };

  // Generate sparkline path
  const generateSparklinePath = () => {
    const validValues = weightValues.filter((v) => v !== null) as number[];
    if (validValues.length < 2) return "";

    const min = Math.min(...validValues);
    const max = Math.max(...validValues);
    const range = max - min || 1;

    const points = weightValues
      .map((value, index) => {
        if (value === null) return "";
        const x = (index / (weightValues.length - 1)) * 100;
        const y = 100 - ((value - min) / range) * 80 - 10; // 80% height, 10% padding
        return `${x},${y}`;
      })
      .filter((p) => p !== "");

    return `M ${points.join(" L ")}`;
  };

  const handleWeightChange = (date: string, value: string) => {
    const weight = parseFloat(value) || 0;
    onUpdateDay(date, { weight_lbs: weight });
  };

  const handleSaveTarget = () => {
    const target = parseFloat(editTargetValue) || 180;
    onUpdateTarget?.(target);
    setIsEditingTarget(false);
  };

  return (
    <motion.div
      className="p-4 rounded-lg"
      style={{
        backgroundColor: colors.background.secondary,
        border: `1px solid ${isOnTarget ? WEIGHT_COLOR + "50" : colors.border.accent}`,
        boxShadow: isOnTarget ? `0 0 20px ${WEIGHT_COLOR}25` : undefined,
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
              backgroundColor: `${WEIGHT_COLOR}20`,
              border: `1px solid ${WEIGHT_COLOR}40`,
            }}
          >
            <Scale size={16} style={{ color: WEIGHT_COLOR }} />
          </div>
          <div className="text-left">
            <span
              className="font-semibold text-sm flex items-center gap-1"
              style={{ color: isOnTarget ? WEIGHT_COLOR : colors.text.primary }}
            >
              Weight
              {getTrendIcon()}
            </span>
            <div
              className="text-xs font-mono"
              style={{ color: colors.text.muted }}
            >
              {weeklyStats.avgWeight.toFixed(1)}lbs avg • {daysTracked}/7 days
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div
              className="text-lg font-bold font-mono"
              style={{
                color: isOnTarget ? WEIGHT_COLOR : colors.primary.DEFAULT,
              }}
            >
              {weeklyStats.endWeight > 0
                ? weeklyStats.endWeight.toFixed(1)
                : "-"}
            </div>
            {weeklyStats.weightChange !== 0 && (
              <div
                className="text-xs font-mono"
                style={{
                  color:
                    weeklyStats.weightChange > 0
                      ? colors.danger.DEFAULT
                      : colors.success.DEFAULT,
                }}
              >
                {weeklyStats.weightChange > 0 ? "+" : ""}
                {weeklyStats.weightChange.toFixed(1)}lbs
              </div>
            )}
          </div>
          {isCollapsed ? (
            <ChevronDown size={18} style={{ color: colors.text.muted }} />
          ) : (
            <ChevronUp size={18} style={{ color: colors.text.muted }} />
          )}
        </div>
      </button>

      {/* Sparkline chart - always visible */}
      {weightValues.filter((v) => v !== null).length >= 2 && (
        <div
          className="h-12 mb-4 relative"
          style={{ backgroundColor: colors.background.tertiary }}
        >
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="w-full h-full"
            style={{ overflow: "visible" }}
          >
            {/* Grid lines */}
            <line
              x1="0"
              y1="25"
              x2="100"
              y2="25"
              stroke={colors.border.DEFAULT}
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />
            <line
              x1="0"
              y1="50"
              x2="100"
              y2="50"
              stroke={colors.border.DEFAULT}
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />
            <line
              x1="0"
              y1="75"
              x2="100"
              y2="75"
              stroke={colors.border.DEFAULT}
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />

            {/* Target line */}
            {targetLbs > 0 &&
              weeklyStats.maxWeight > 0 &&
              weeklyStats.minWeight > 0 && (
                <line
                  x1="0"
                  y1={
                    100 -
                    ((targetLbs - weeklyStats.minWeight) /
                      (weeklyStats.maxWeight - weeklyStats.minWeight || 1)) *
                      80 -
                    10
                  }
                  x2="100"
                  y1={
                    100 -
                    ((targetLbs - weeklyStats.minWeight) /
                      (weeklyStats.maxWeight - weeklyStats.minWeight || 1)) *
                      80 -
                    10
                  }
                  stroke={WEIGHT_COLOR}
                  strokeWidth="1"
                  strokeDasharray="3,3"
                  opacity="0.5"
                />
              )}

            {/* Sparkline path */}
            <motion.path
              d={generateSparklinePath()}
              fill="none"
              stroke={WEIGHT_COLOR}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, ease: [0, 0, 0.2, 1] }}
            />

            {/* Data points */}
            {weightValues.map((value, index) => {
              if (value === null) return null;
              const x = (index / (weightValues.length - 1)) * 100;
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={
                    100 -
                    ((value - weeklyStats.minWeight) /
                      (weeklyStats.maxWeight - weeklyStats.minWeight || 1)) *
                      80 -
                    10
                  }
                  r="2"
                  fill={WEIGHT_COLOR}
                  opacity="0.8"
                />
              );
            })}
          </svg>
        </div>
      )}

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
            {/* Stats row */}
            <div
              className="flex items-center justify-between mb-4 p-3 rounded-md"
              style={{ backgroundColor: colors.background.tertiary }}
            >
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-xs" style={{ color: colors.text.muted }}>
                    Min
                  </div>
                  <div
                    className="text-sm font-mono"
                    style={{ color: WEIGHT_COLOR }}
                  >
                    {weeklyStats.minWeight > 0
                      ? weeklyStats.minWeight.toFixed(1)
                      : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs" style={{ color: colors.text.muted }}>
                    Avg
                  </div>
                  <div
                    className="text-sm font-mono"
                    style={{ color: WEIGHT_COLOR }}
                  >
                    {weeklyStats.avgWeight > 0
                      ? weeklyStats.avgWeight.toFixed(1)
                      : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs" style={{ color: colors.text.muted }}>
                    Max
                  </div>
                  <div
                    className="text-sm font-mono"
                    style={{ color: WEIGHT_COLOR }}
                  >
                    {weeklyStats.maxWeight > 0
                      ? weeklyStats.maxWeight.toFixed(1)
                      : "-"}
                  </div>
                </div>
              </div>

              {/* Target display/edit */}
              <div className="flex items-center gap-2">
                {isEditingTarget ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.5"
                      min="50"
                      max="400"
                      value={editTargetValue}
                      onChange={(e) => setEditTargetValue(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-16 px-1 py-0.5 text-xs rounded font-mono text-center"
                      style={{
                        backgroundColor: colors.background.elevated,
                        border: `1px solid ${WEIGHT_COLOR}`,
                        color: colors.text.primary,
                      }}
                    />
                    <span
                      className="text-xs"
                      style={{ color: colors.text.muted }}
                    >
                      lbs
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveTarget();
                      }}
                      className="px-2 py-0.5 rounded text-[10px]"
                      style={{
                        backgroundColor: WEIGHT_COLOR,
                        color: colors.background.primary,
                      }}
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditTargetValue(targetLbs.toString());
                      setIsEditingTarget(true);
                    }}
                    className="flex items-center gap-1 text-xs hover:opacity-80 transition-opacity"
                    style={{ color: colors.text.muted }}
                  >
                    <span>Target:</span>
                    <span className="font-mono" style={{ color: WEIGHT_COLOR }}>
                      {targetLbs}lbs
                    </span>
                  </button>
                )}
              </div>
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
                        ? `1px solid ${WEIGHT_COLOR}30`
                        : undefined,
                    }}
                  >
                    {/* Day name */}
                    <span
                      className="text-xs font-mono w-12"
                      style={{
                        color: isToday ? WEIGHT_COLOR : colors.text.muted,
                      }}
                    >
                      {formatDayName(date)}
                    </span>

                    {/* Weight input */}
                    <div className="flex items-center gap-1 flex-1">
                      <Scale size={12} style={{ color: colors.text.muted }} />
                      <input
                        type="number"
                        step="0.1"
                        min="50"
                        max="400"
                        placeholder="lbs"
                        value={dayData?.weight_lbs || ""}
                        onChange={(e) =>
                          handleWeightChange(date, e.target.value)
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-[80px] px-2 py-1 rounded text-xs font-mono text-center"
                        style={{
                          backgroundColor: colors.background.elevated,
                          border: `1px solid ${colors.border.DEFAULT}`,
                          color: colors.text.primary,
                        }}
                      />
                      <span
                        className="text-xs"
                        style={{ color: colors.text.muted }}
                      >
                        lbs
                      </span>
                    </div>

                    {/* Notes (optional) - visual indicator only for now */}
                    {dayData?.notes && (
                      <span
                        className="text-xs"
                        style={{ color: colors.text.muted }}
                      >
                        📝
                      </span>
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
                Week Change
              </span>
              <span
                className="text-sm font-mono font-medium"
                style={{
                  color:
                    weeklyStats.weightChange > 0
                      ? colors.danger.DEFAULT
                      : weeklyStats.weightChange < 0
                        ? colors.success.DEFAULT
                        : colors.text.secondary,
                }}
              >
                {weeklyStats.weightChange > 0 ? "+" : ""}
                {weeklyStats.weightChange.toFixed(1)} lbs
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default WeightKPI;
