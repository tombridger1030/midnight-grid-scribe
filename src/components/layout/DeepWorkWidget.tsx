/**
 * DeepWorkWidget Component
 * Displays deep work progress and timer in the header
 */

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Play, Square, Clock, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { deepWorkService, DeepWorkSession } from "@/lib/deepWorkService";
import { kpiManager } from "@/lib/configurableKpis";
import { TaskSelector, SessionConfig } from "./TaskSelector";
import { ExpandablePanel } from "./ExpandablePanel";

interface DeepWorkWidgetProps {
  className?: string;
}

export const DeepWorkWidget: React.FC<DeepWorkWidgetProps> = ({
  className,
}) => {
  // State
  const [activeSession, setActiveSession] = useState<DeepWorkSession | null>(
    null,
  );
  const [todayTotalSeconds, setTodayTotalSeconds] = useState(0);
  const [dailyTargetHours, setDailyTargetHours] = useState(8);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [todaySessions, setTodaySessions] = useState<DeepWorkSession[]>([]);
  const [weekSummary, setWeekSummary] = useState<{
    totalHours: number;
    targetHours: number;
    dailyTargetHours: number;
  } | null>(null);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      // Load active session
      const session = await deepWorkService.getActiveSession();
      setActiveSession(session);

      // Load today's total
      const total = await deepWorkService.getTodayTotalSeconds();
      setTodayTotalSeconds(total);

      // Load today's sessions for history
      const sessions = await deepWorkService.getTodaySessions();
      setTodaySessions(sessions);

      // Load weekly target from KPIs
      const kpis = await kpiManager.getActiveKPIs();
      const deepWorkKpi = kpis.find((k) => k.kpi_id === "deepWorkHours");
      if (deepWorkKpi) {
        setDailyTargetHours(deepWorkKpi.target / 7);
      }

      // Load week summary
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

  // Timer tick for active session
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (activeSession?.is_active) {
      const startTime = new Date(activeSession.start_time).getTime();

      // Update immediately
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));

      // Then update every second
      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeSession]);

  // Listen for auto-stop events
  useEffect(() => {
    const handleAutoStop = () => {
      setActiveSession(null);
      loadData();
    };

    window.addEventListener("deepWorkAutoStopped", handleAutoStop);
    return () =>
      window.removeEventListener("deepWorkAutoStopped", handleAutoStop);
  }, [loadData]);

  // Start session
  const handleStartSession = async (config: string | SessionConfig) => {
    setShowTaskSelector(false);
    try {
      // Handle both legacy string and new SessionConfig
      const taskName = typeof config === "string" ? config : config.taskName;
      const activityType =
        typeof config === "string" ? "work" : config.activityType;
      const activityLabel =
        typeof config === "string" ? undefined : config.activityLabel;

      const session = await deepWorkService.startSession(
        taskName,
        activityType,
        activityLabel,
      );
      if (session) {
        setActiveSession(session);
      }
    } catch (error) {
      console.error("Failed to start session:", error);
    }
  };

  // Stop session
  const handleStopSession = async () => {
    if (!activeSession) return;

    try {
      await deepWorkService.stopSession(activeSession.id);
      setActiveSession(null);
      loadData(); // Refresh totals
    } catch (error) {
      console.error("Failed to stop session:", error);
    }
  };

  // Format time for display
  const formatHours = (seconds: number): string => {
    const hours = seconds / 3600;
    return hours.toFixed(1);
  };

  const formatTimer = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate progress
  const todayHours = todayTotalSeconds / 3600;
  const progressPercent = Math.min(100, (todayHours / dailyTargetHours) * 100);

  return (
    <div className={cn("relative flex items-center", className)}>
      {activeSession?.is_active ? (
        // Active Session Display
        <div className="flex items-center gap-3">
          {/* Pulsing Indicator */}
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-danger"
          />

          {/* Timer */}
          <button
            onClick={() => setShowHistoryPanel(!showHistoryPanel)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded",
              "bg-surface-tertiary/50 hover:bg-surface-tertiary",
              "transition-colors",
            )}
          >
            <span className="font-mono text-sm font-semibold text-content-primary">
              {formatTimer(elapsedSeconds)}
            </span>
            {activeSession.task_name && (
              <span className="text-xs text-content-muted max-w-32 truncate hidden sm:inline">
                "{activeSession.task_name}"
              </span>
            )}
          </button>

          {/* Stop Button */}
          <button
            onClick={handleStopSession}
            className={cn(
              "p-1.5 rounded",
              "bg-danger/10 text-danger",
              "hover:bg-danger/20",
              "transition-colors",
            )}
            title="Stop session"
          >
            <Square size={14} />
          </button>
        </div>
      ) : (
        // Idle State Display
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
              {formatHours(todayTotalSeconds)}h
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

          {/* Start Button */}
          <button
            onClick={() => setShowTaskSelector(true)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded",
              "bg-neon-cyan text-black",
              "hover:bg-neon-cyan/90 hover:shadow-glow-cyan",
              "transition-all text-sm font-medium",
            )}
          >
            <Play size={14} />
            <span className="hidden sm:inline">Start</span>
          </button>
        </div>
      )}

      {/* Task Selector Panel */}
      <TaskSelector
        isOpen={showTaskSelector}
        onClose={() => setShowTaskSelector(false)}
        onSelectTask={handleStartSession}
      />

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

        {/* Sessions List */}
        {todaySessions.length > 0 ? (
          <div className="space-y-2 mb-4">
            <div className="text-xs text-content-muted">Sessions today</div>
            {todaySessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  "flex items-center justify-between p-2 rounded",
                  "bg-surface-tertiary/50",
                  session.is_active && "ring-1 ring-neon-cyan",
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
                    : session.is_active
                      ? formatTimer(elapsedSeconds)
                      : "-"}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-content-muted text-center py-4">
            No sessions today yet
          </div>
        )}

        {/* Week Summary */}
        {weekSummary && (
          <div className="pt-3 border-t border-line">
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
