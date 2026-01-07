/**
 * DeepWorkKPI Component
 *
 * Shows weekly deep work hours with expandable daily breakdown.
 * Displays sessions per day with hours worked.
 */

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ChevronDown, ChevronUp } from "lucide-react";
import { colors } from "@/styles/design-tokens";
import {
  deepWorkService,
  WeeklyDeepWorkSummary,
  DailyDeepWorkSummary,
} from "@/lib/deepWorkService";

interface DeepWorkKPIProps {
  target: number;
  weekDates: { start: Date; end: Date };
}

export const DeepWorkKPI: React.FC<DeepWorkKPIProps> = ({
  target,
  weekDates,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [weeklySummary, setWeeklySummary] =
    useState<WeeklyDeepWorkSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load weekly summary
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const summary = await deepWorkService.getWeeklySummary(target);
        setWeeklySummary(summary);
      } catch (error) {
        console.error("Failed to load deep work summary:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [target, weekDates.start, weekDates.end]);

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

  // Create a map of daily summaries by date
  const dailySummaryMap = useMemo(() => {
    if (!weeklySummary) return {};
    return weeklySummary.dailySummaries.reduce(
      (acc, summary) => {
        acc[summary.date] = summary;
        return acc;
      },
      {} as Record<string, DailyDeepWorkSummary>,
    );
  }, [weeklySummary]);

  const totalHours = weeklySummary?.totalHours || 0;
  const progress = target > 0 ? Math.min(100, (totalHours / target) * 100) : 0;
  const isComplete = progress >= 100;

  const progressColor = isComplete ? colors.success.DEFAULT : "#5FE3B3";

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

  // Format hours display
  const formatHours = (hours: number) => {
    if (hours === 0) return "0h";
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    return `${hours.toFixed(1)}h`;
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
            <Zap size={16} style={{ color: progressColor }} />
          </div>
          <div className="text-left">
            <span
              className="font-semibold text-sm"
              style={{ color: progressColor }}
            >
              Deep Work
            </span>
            <div
              className="text-xs font-mono"
              style={{ color: colors.text.muted }}
            >
              {formatHours(totalHours)}/{target}h this week
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
                const daySummary = dailySummaryMap[date];
                const dayHours = daySummary?.totalHours || 0;
                const sessionCount = daySummary?.sessions.length || 0;
                const hasData = dayHours > 0;

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
                      {hasData ? (
                        <div className="flex items-center gap-2">
                          <span
                            className="text-sm font-mono font-medium"
                            style={{ color: progressColor }}
                          >
                            {formatHours(dayHours)}
                          </span>
                          <span
                            className="text-xs"
                            style={{ color: colors.text.muted }}
                          >
                            ({sessionCount} session
                            {sessionCount !== 1 ? "s" : ""})
                          </span>
                        </div>
                      ) : (
                        <span
                          className="text-xs"
                          style={{ color: colors.text.disabled }}
                        >
                          No sessions
                        </span>
                      )}
                    </div>
                    {/* Mini progress bar for the day */}
                    {hasData && (
                      <div
                        className="w-16 h-1.5 rounded-full overflow-hidden"
                        style={{ backgroundColor: `${progressColor}20` }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, (dayHours / (target / 7)) * 100)}%`,
                            backgroundColor: progressColor,
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Stats summary */}
            <div
              className="mt-4 pt-3 flex justify-between items-center"
              style={{ borderTop: `1px solid ${colors.border.DEFAULT}` }}
            >
              <span
                className="text-xs font-medium"
                style={{ color: colors.text.muted }}
              >
                {weeklySummary?.onTrack ? "On track" : "Behind target"}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-mono"
                  style={{ color: colors.text.muted }}
                >
                  {weeklySummary?.remainingHours
                    ? `${formatHours(weeklySummary.remainingHours)} remaining`
                    : "Target reached!"}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DeepWorkKPI;
