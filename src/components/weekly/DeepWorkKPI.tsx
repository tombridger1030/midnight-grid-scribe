/**
 * DeepWorkKPI Component
 *
 * Shows weekly deep work hours with expandable daily breakdown.
 * Uses hybrid calculation: commit hours (auto) + manual session hours.
 */

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ChevronDown, ChevronUp, Code, Clock } from "lucide-react";
import { colors } from "@/styles/design-tokens";
import { formatLocalDate } from "@/lib/dateUtils";
import { useWeeklyDeepWorkFromCommits } from "@/hooks/useWeeklyDeepWorkFromCommits";
import { deepWorkService, DailyDeepWorkSummary } from "@/lib/deepWorkService";

interface DeepWorkKPIProps {
  target: number;
  weekDates: { start: Date; end: Date };
}

// Interface for combined daily data
interface DailyDeepWorkData {
  date: string;
  commitHours: number;
  manualHours: number;
  totalHours: number;
  commitCount: number;
  sessionCount: number;
}

export const DeepWorkKPI: React.FC<DeepWorkKPIProps> = ({
  target,
  weekDates,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [manualSessions, setManualSessions] = useState<
    Record<string, DailyDeepWorkSummary>
  >({});
  const [isLoadingManual, setIsLoadingManual] = useState(true);

  // Fetch commit-based deep work hours
  const {
    dailyData: commitData,
    totalHours: commitTotalHours,
    isLoading: isLoadingCommits,
    isConfigured,
  } = useWeeklyDeepWorkFromCommits(weekDates.start, weekDates.end);

  // Load manual sessions (non-commit sessions from timeline)
  useEffect(() => {
    const loadManualSessions = async () => {
      setIsLoadingManual(true);
      try {
        const sessions: Record<string, DailyDeepWorkSummary> = {};
        const current = new Date(weekDates.start);
        while (current <= weekDates.end) {
          const summary = await deepWorkService.getDailySummary(current);
          if (summary.sessions.length > 0) {
            sessions[summary.date] = summary;
          }
          current.setDate(current.getDate() + 1);
        }
        setManualSessions(sessions);
      } catch (error) {
        console.error("Failed to load manual sessions:", error);
      } finally {
        setIsLoadingManual(false);
      }
    };

    loadManualSessions();
  }, [weekDates.start, weekDates.end]);

  const isLoading = isLoadingCommits || isLoadingManual;

  // Generate all 7 days of the week
  const weekDays = useMemo(() => {
    const days: string[] = [];
    const current = new Date(weekDates.start);
    while (current <= weekDates.end) {
      days.push(formatLocalDate(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [weekDates]);

  // Combine commit hours and manual session hours per day
  const dailyCombinedData = useMemo(() => {
    const combined: Record<string, DailyDeepWorkData> = {};

    weekDays.forEach((date) => {
      const commitInfo = commitData[date] || { hours: 0, commitCount: 0 };
      const manualInfo = manualSessions[date] || {
        totalHours: 0,
        sessions: [],
      };

      combined[date] = {
        date,
        commitHours: commitInfo.hours,
        manualHours: manualInfo.totalHours,
        totalHours: commitInfo.hours + manualInfo.totalHours,
        commitCount: commitInfo.commitCount,
        sessionCount: manualInfo.sessions?.length || 0,
      };
    });

    return combined;
  }, [weekDays, commitData, manualSessions]);

  // Calculate total hours (commit + manual)
  const { totalHours, manualTotalHours } = useMemo(() => {
    let total = 0;
    let manual = 0;
    Object.values(dailyCombinedData).forEach((data) => {
      total += data.totalHours;
      manual += data.manualHours;
    });
    return { totalHours: total, manualTotalHours: manual };
  }, [dailyCombinedData]);

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
                const dayData = dailyCombinedData[date];
                const dayHours = dayData?.totalHours || 0;
                const commitHours = dayData?.commitHours || 0;
                const manualHours = dayData?.manualHours || 0;
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
                          <div
                            className="flex items-center gap-1.5 text-xs"
                            style={{ color: colors.text.muted }}
                          >
                            {commitHours > 0 && (
                              <span className="flex items-center gap-0.5">
                                <Code size={10} />
                                {formatHours(commitHours)}
                              </span>
                            )}
                            {manualHours > 0 && (
                              <span className="flex items-center gap-0.5">
                                <Clock size={10} />
                                {formatHours(manualHours)}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span
                          className="text-xs"
                          style={{ color: colors.text.disabled }}
                        >
                          No activity
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
              <div className="flex items-center gap-3">
                <span
                  className="text-xs font-medium"
                  style={{ color: colors.text.muted }}
                >
                  {progress >= 90 ? "On track" : "Behind target"}
                </span>
                {isConfigured && (
                  <span
                    className="text-xs flex items-center gap-1"
                    style={{ color: colors.text.disabled }}
                  >
                    <Code size={10} /> auto from commits
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-mono"
                  style={{ color: colors.text.muted }}
                >
                  {totalHours >= target
                    ? "Target reached!"
                    : `${formatHours(target - totalHours)} remaining`}
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
