/**
 * DeepWorkWidget Component
 *
 * Displays read-only deep work progress in the header.
 * Shows commit-based hours (auto) + manual session hours.
 * Timer functionality removed - deep work is now automated via commits.
 */

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Clock, ChevronDown, Code, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { deepWorkService, DeepWorkSession } from "@/lib/deepWorkService";
import { kpiManager } from "@/lib/configurableKpis";
import { useDeepWorkFromCommits } from "@/hooks/useDeepWorkFromCommits";
import { ExpandablePanel } from "./ExpandablePanel";
import { useNavigate } from "react-router-dom";

interface DeepWorkWidgetProps {
  className?: string;
}

export const DeepWorkWidget: React.FC<DeepWorkWidgetProps> = ({
  className,
}) => {
  const navigate = useNavigate();

  // State
  const [dailyTargetHours, setDailyTargetHours] = useState(8);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [todaySessions, setTodaySessions] = useState<DeepWorkSession[]>([]);
  const [weekSummary, setWeekSummary] = useState<{
    totalHours: number;
    targetHours: number;
    dailyTargetHours: number;
  } | null>(null);

  // Get commit-based deep work for today
  const {
    deepWorkHours: commitHours,
    commitCount,
    commitHours: hourlyData,
    isLoading: commitLoading,
    isConfigured,
  } = useDeepWorkFromCommits(new Date());

  // Load manual sessions and targets
  const loadData = useCallback(async () => {
    try {
      // Load today's manual sessions
      const sessions = await deepWorkService.getTodaySessions();
      setTodaySessions(sessions);

      // Load weekly target from KPIs
      const kpis = await kpiManager.getActiveKPIs();
      const deepWorkKpi = kpis.find((k) => k.kpi_id === "deepWorkHours");
      if (deepWorkKpi) {
        setDailyTargetHours(deepWorkKpi.target / 7);
      }

      // Load week summary for context
      const weeklyTarget = deepWorkKpi?.target || 40;
      const summary = await deepWorkService.getWeeklySummary(weeklyTarget);
      setWeekSummary({
        totalHours: summary.totalHours,
        targetHours: summary.targetHours,
        dailyTargetHours: summary.dailyTargetHours,
      });
    } catch (error) {
      console.error("Failed to load deep work data:", error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate manual session hours for today
  const manualHours =
    todaySessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0) / 3600;

  // Total today = commit hours + manual hours
  const todayTotalHours = commitHours + manualHours;

  // Format time for display
  const formatHours = (hours: number): string => {
    if (hours === 0) return "0";
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    return hours.toFixed(1);
  };

  // Calculate progress
  const progressPercent = Math.min(
    100,
    (todayTotalHours / dailyTargetHours) * 100,
  );

  // Navigate to daily review to add manual sessions
  const handleAddSession = () => {
    setShowHistoryPanel(false);
    navigate("/daily");
  };

  return (
    <div className={cn("relative flex items-center", className)}>
      {/* Read-only Display */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowHistoryPanel(!showHistoryPanel)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded",
            "bg-surface-tertiary/50 hover:bg-surface-tertiary",
            "transition-colors group",
          )}
        >
          <Clock size={14} className="text-neon-cyan" />
          <span className="font-mono text-sm text-content-primary">
            {formatHours(todayTotalHours)}h
          </span>
          <span className="text-xs text-content-muted">
            / {dailyTargetHours.toFixed(1)}h
          </span>
          <ChevronDown
            size={12}
            className={cn(
              "text-content-muted transition-transform",
              showHistoryPanel && "rotate-180",
            )}
          />
        </button>
      </div>

      {/* History Panel */}
      <ExpandablePanel
        isOpen={showHistoryPanel}
        onClose={() => setShowHistoryPanel(false)}
        title="Deep Work Today"
        position="left"
        width="w-80"
      >
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-content-muted">Today's progress</span>
            <span className="text-content-primary font-medium">
              {progressPercent.toFixed(0)}%
            </span>
          </div>
          <div className="h-2 bg-surface-tertiary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={cn(
                "h-full rounded-full",
                progressPercent >= 100 ? "bg-success" : "bg-neon-cyan",
              )}
            />
          </div>
        </div>

        {/* Commit Hours (Auto) */}
        {isConfigured && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-xs text-content-muted mb-2">
              <Code size={12} className="text-neon-cyan" />
              <span>Code (auto from commits)</span>
            </div>
            {commitLoading ? (
              <div className="text-sm text-content-muted">Loading...</div>
            ) : commitHours > 0 ? (
              <div className="space-y-1">
                <div className="text-sm text-content-primary">
                  {commitHours}h ({commitCount} commits)
                </div>
                <div className="flex flex-wrap gap-1">
                  {hourlyData.map((h) => (
                    <span
                      key={h.hour}
                      className="px-1.5 py-0.5 text-xs rounded bg-neon-cyan/20 text-neon-cyan font-mono"
                    >
                      {h.hour.toString().padStart(2, "0")}:00
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-content-muted">
                No commits today yet
              </div>
            )}
          </div>
        )}

        {/* Manual Sessions */}
        {todaySessions.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-xs text-content-muted mb-2">
              <Clock size={12} />
              <span>Manual sessions</span>
            </div>
            <div className="space-y-2">
              {todaySessions.map((session) => (
                <div
                  key={session.id}
                  className={cn(
                    "flex items-center justify-between p-2 rounded",
                    "bg-surface-tertiary/50",
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-content-primary truncate">
                      {session.task_name}
                    </div>
                    <div className="text-xs text-content-muted">
                      {new Date(session.start_time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {session.end_time && (
                        <>
                          {" "}
                          -{" "}
                          {new Date(session.end_time).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-sm font-mono text-content-secondary">
                    {session.duration_seconds
                      ? deepWorkService.formatDuration(session.duration_seconds)
                      : "-"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No data state */}
        {!isConfigured && todaySessions.length === 0 && (
          <div className="text-sm text-content-muted text-center py-4">
            No deep work tracked today
          </div>
        )}

        {/* Add Session Link */}
        <button
          onClick={handleAddSession}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2 rounded",
            "bg-surface-tertiary/50 hover:bg-surface-tertiary",
            "text-sm text-content-muted hover:text-content-primary",
            "transition-colors",
          )}
        >
          <Plus size={14} />
          <span>Add session in Daily Log</span>
        </button>

        {/* Week Summary */}
        {weekSummary && (
          <div className="mt-3 pt-3 border-t border-line">
            <div className="text-xs text-content-muted mb-1">This week</div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-content-primary">
                {weekSummary.totalHours.toFixed(1)}h / {weekSummary.targetHours}
                h
              </span>
              <span className="text-xs text-content-muted">
                Need {weekSummary.dailyTargetHours.toFixed(1)}h/day
              </span>
            </div>
          </div>
        )}
      </ExpandablePanel>
    </div>
  );
};

export default DeepWorkWidget;
