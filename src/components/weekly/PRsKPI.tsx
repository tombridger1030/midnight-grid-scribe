/**
 * PRsKPI Component
 *
 * Shows weekly PR count with expandable daily breakdown.
 * Displays PRs created per day.
 */

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitPullRequest, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { colors } from "@/styles/design-tokens";
import { getDailyPRCounts, isGitHubConfigured } from "@/lib/github";

interface PRsKPIProps {
  target: number;
  weekDates: { start: Date; end: Date };
}

export const PRsKPI: React.FC<PRsKPIProps> = ({ target, weekDates }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [dailyPRs, setDailyPRs] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);

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

  // Load weekly PR data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const configured = isGitHubConfigured();
      setIsConfigured(configured);

      if (!configured) {
        setIsLoading(false);
        return;
      }

      try {
        const startDate = weekDates.start.toISOString().split("T")[0];
        const endDate = weekDates.end.toISOString().split("T")[0];
        const counts = await getDailyPRCounts(startDate, endDate);
        setDailyPRs(counts);
      } catch (error) {
        console.error("Failed to load PR data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [weekDates.start, weekDates.end]);

  const totalPRs = Object.values(dailyPRs).reduce(
    (sum, count) => sum + count,
    0,
  );
  const progress = target > 0 ? Math.min(100, (totalPRs / target) * 100) : 0;
  const isComplete = progress >= 100;

  const color = "#4A90E2"; // Engineering blue
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

  if (!isConfigured) {
    return (
      <motion.div
        className="p-4 rounded-lg"
        style={{
          backgroundColor: colors.background.secondary,
          border: `1px solid ${colors.border.accent}`,
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center"
            style={{
              backgroundColor: `${color}20`,
              border: `1px solid ${color}40`,
            }}
          >
            <GitPullRequest size={16} style={{ color }} />
          </div>
          <div>
            <span className="font-semibold text-sm" style={{ color }}>
              PRs Created
            </span>
            <div className="text-xs" style={{ color: colors.text.muted }}>
              Configure GitHub in Settings to track PRs
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

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
            <GitPullRequest size={16} style={{ color: progressColor }} />
          </div>
          <div className="text-left">
            <span
              className="font-semibold text-sm"
              style={{ color: progressColor }}
            >
              PRs Created
            </span>
            <div
              className="text-xs font-mono"
              style={{ color: colors.text.muted }}
            >
              {isLoading ? (
                <span className="flex items-center gap-1">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <Sparkles size={10} />
                  </motion.span>
                  Loading...
                </span>
              ) : (
                `${totalPRs}/${target} this week`
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isLoading && (
            <div
              className="text-lg font-bold font-mono"
              style={{
                color: progressColor,
                textShadow: isComplete
                  ? `0 0 10px ${progressColor}`
                  : undefined,
              }}
            >
              {Math.round(progress)}%
            </div>
          )}
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
          animate={{ width: isLoading ? "0%" : `${progress}%` }}
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
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles size={16} style={{ color: progressColor }} />
                </motion.div>
              </div>
            ) : (
              <div className="space-y-1">
                {weekDays.map((date) => {
                  const prCount = dailyPRs[date] || 0;
                  const hasData = prCount > 0;

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
                          <span
                            className="text-sm font-mono font-medium"
                            style={{ color: progressColor }}
                          >
                            {prCount} PR{prCount !== 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span
                            className="text-xs"
                            style={{ color: colors.text.disabled }}
                          >
                            No PRs
                          </span>
                        )}
                      </div>
                      {/* Visual indicator */}
                      {hasData && (
                        <div className="flex gap-1">
                          {Array.from({ length: Math.min(prCount, 5) }).map(
                            (_, i) => (
                              <div
                                key={i}
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: progressColor }}
                              />
                            ),
                          )}
                          {prCount > 5 && (
                            <span
                              className="text-xs font-mono"
                              style={{ color: progressColor }}
                            >
                              +{prCount - 5}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Stats summary */}
            {!isLoading && (
              <div
                className="mt-4 pt-3 flex justify-between items-center"
                style={{ borderTop: `1px solid ${colors.border.DEFAULT}` }}
              >
                <span
                  className="text-xs font-medium"
                  style={{ color: colors.text.muted }}
                >
                  Weekly Target
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-mono"
                    style={{ color: colors.text.muted }}
                  >
                    {totalPRs >= target
                      ? "Target reached!"
                      : `${target - totalPRs} more to go`}
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PRsKPI;
