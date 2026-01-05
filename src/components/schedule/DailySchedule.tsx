/**
 * DailySchedule Component
 *
 * Timeline view of daily deep work sessions with work/personal breakdown.
 * Shows all sessions for a selected day with navigation.
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Briefcase,
  Heart,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { deepWorkService, ActivityType } from "@/lib/deepWorkService";
import { colors } from "@/styles/design-tokens";

interface DailyScheduleProps {
  className?: string;
}

interface ScheduleSession {
  id: string;
  taskName: string;
  startTime: string;
  endTime: string | null;
  duration: number;
  durationFormatted: string;
  activityType: ActivityType;
  activityLabel: string | null;
  isActive: boolean;
}

interface DailyScheduleData {
  date: string;
  workHours: number;
  personalHours: number;
  totalHours: number;
  sessions: ScheduleSession[];
}

export const DailySchedule: React.FC<DailyScheduleProps> = ({ className }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scheduleData, setScheduleData] = useState<DailyScheduleData | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);

  // Load schedule for current date
  useEffect(() => {
    loadSchedule(currentDate);
  }, [currentDate]);

  const loadSchedule = async (date: Date) => {
    setIsLoading(true);
    try {
      const data = await deepWorkService.getDailySchedule(date);
      setScheduleData(data);
    } catch (error) {
      console.error("Failed to load schedule:", error);
      setScheduleData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (direction === "prev") {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatDate = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";

    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (isoString: string): string => {
    return new Date(isoString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActivityColor = (activityType: ActivityType): string => {
    return activityType === "work" ? colors.primary.DEFAULT : "#A855F7"; // purple-500
  };

  const getActivityIcon = (activityType: ActivityType) => {
    return activityType === "work" ? (
      <Briefcase size={14} />
    ) : (
      <Heart size={14} />
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with Date Navigation */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-surface-secondary border border-line">
        <button
          onClick={() => navigateDate("prev")}
          className="p-2 rounded-md hover:bg-surface-tertiary transition-colors"
          aria-label="Previous day"
        >
          <ChevronLeft size={20} className="text-content-secondary" />
        </button>

        <div className="text-center">
          <div className="text-lg font-semibold text-content-primary">
            {formatDate(currentDate)}
          </div>
          <div className="text-xs text-content-muted font-mono">
            {scheduleData?.date}
          </div>
        </div>

        <button
          onClick={() => navigateDate("next")}
          className="p-2 rounded-md hover:bg-surface-tertiary transition-colors"
          aria-label="Next day"
        >
          <ChevronRight size={20} className="text-content-secondary" />
        </button>
      </div>

      {/* Today Button */}
      <button
        onClick={goToToday}
        className="w-full py-2 text-sm text-content-muted hover:text-content-primary hover:bg-surface-tertiary rounded transition-colors"
      >
        Go to Today
      </button>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Schedule Content */}
      {!isLoading && scheduleData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            {/* Work Hours */}
            <div className="p-3 rounded-lg bg-surface-secondary border border-line/50">
              <div className="flex items-center gap-2 mb-1">
                <Briefcase size={14} className={cn("text-[#5FE3B3]")} />
                <span className="text-xs text-content-muted">Work</span>
              </div>
              <div className="text-lg font-bold text-content-primary">
                {scheduleData.workHours.toFixed(1)}h
              </div>
            </div>

            {/* Personal Hours */}
            <div className="p-3 rounded-lg bg-surface-secondary border border-line/50">
              <div className="flex items-center gap-2 mb-1">
                <Heart size={14} className="text-purple-400" />
                <span className="text-xs text-content-muted">Personal</span>
              </div>
              <div className="text-lg font-bold text-content-primary">
                {scheduleData.personalHours.toFixed(1)}h
              </div>
            </div>

            {/* Total Hours */}
            <div className="p-3 rounded-lg bg-surface-secondary border border-line/50">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={14} className="text-neon-cyan" />
                <span className="text-xs text-content-muted">Total</span>
              </div>
              <div className="text-lg font-bold text-content-primary">
                {scheduleData.totalHours.toFixed(1)}h
              </div>
            </div>
          </div>

          {/* Sessions Timeline */}
          <div className="p-4 rounded-lg bg-surface-secondary border border-line">
            <h3 className="text-sm font-semibold text-content-primary mb-3 flex items-center gap-2">
              <Calendar size={16} className="text-neon-cyan" />
              Timeline
            </h3>

            {scheduleData.sessions.length === 0 ? (
              <div className="text-center py-8 text-content-muted">
                <Circle size={24} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No sessions recorded for this day</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {scheduleData.sessions.map((session, index) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "flex gap-3 p-3 rounded-lg",
                        "bg-surface-tertiary/50 border",
                        session.isActive
                          ? "border-neon-cyan/50 ring-1 ring-neon-cyan/30"
                          : "border-line/50",
                      )}
                    >
                      {/* Activity Type Indicator */}
                      <div
                        className={cn(
                          "flex flex-col items-center justify-center w-8 h-8 rounded-full shrink-0",
                          session.activityType === "work"
                            ? "bg-neon-cyan/10 text-neon-cyan"
                            : "bg-purple-500/10 text-purple-400",
                        )}
                      >
                        {getActivityIcon(session.activityType)}
                      </div>

                      {/* Session Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-content-primary truncate">
                              {session.taskName}
                            </h4>
                            {session.activityLabel && (
                              <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded bg-surface-tertiary text-content-secondary">
                                {session.activityLabel}
                              </span>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-mono text-sm font-semibold text-content-primary">
                              {session.durationFormatted}
                            </div>
                            {session.isActive && (
                              <span className="text-xs text-neon-cyan">
                                Active
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-content-muted">
                          <Clock size={12} />
                          <span>
                            {formatTime(session.startTime)}
                            {session.endTime && (
                              <> - {formatTime(session.endTime)}</>
                            )}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Work vs Personal Bar */}
          {scheduleData.totalHours > 0 && (
            <div className="p-4 rounded-lg bg-surface-secondary border border-line">
              <div className="text-xs text-content-muted mb-2">
                Work vs Personal
              </div>
              <div className="h-3 rounded-full overflow-hidden flex bg-surface-tertiary">
                <div
                  className="transition-all duration-500"
                  style={{
                    width: `${(scheduleData.workHours / scheduleData.totalHours) * 100}%`,
                    backgroundColor: colors.primary.DEFAULT,
                  }}
                />
                <div
                  className="transition-all duration-500"
                  style={{
                    width: `${(scheduleData.personalHours / scheduleData.totalHours) * 100}%`,
                    backgroundColor: "#A855F7",
                  }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-content-muted">
                <span className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: colors.primary.DEFAULT }}
                  />
                  Work{" "}
                  {Math.round(
                    (scheduleData.workHours / scheduleData.totalHours) * 100,
                  )}
                  %
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  Personal{" "}
                  {Math.round(
                    (scheduleData.personalHours / scheduleData.totalHours) *
                      100,
                  )}
                  %
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DailySchedule;
