/**
 * DailySchedule Component
 *
 * Timeline view of daily deep work sessions with custom categories
 * Shows 15-min block visualization and session list
 */

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Grid,
  List,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  deepWorkService,
  TimelineBlock,
  ActivityCategory,
} from "@/lib/deepWorkService";
import { useActivityCategories } from "@/hooks/useActivityCategories";
import { CategorySummaryCards } from "./CategorySummaryCards";
import { TimelineView } from "./TimelineView";
import { ManualSessionEntry } from "./ManualSessionEntry";

type ViewMode = "timeline" | "list";

interface ScheduleSession {
  id: string;
  taskName: string;
  startTime: string;
  endTime: string | null;
  duration: number;
  durationFormatted: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  activityLabel: string | null;
  isActive: boolean;
}

interface DailyScheduleData {
  date: string;
  categoryHours: Map<string, number>;
  totalHours: number;
  sessions: ScheduleSession[];
}

interface DailyScheduleProps {
  className?: string;
}

export const DailySchedule: React.FC<DailyScheduleProps> = ({ className }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scheduleData, setScheduleData] = useState<DailyScheduleData | null>(
    null,
  );
  const [timelineBlocks, setTimelineBlocks] = useState<TimelineBlock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("timeline");
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  const {
    categories,
    defaultCategory,
    isLoading: categoriesLoading,
  } = useActivityCategories();

  // Load schedule for current date
  const loadSchedule = useCallback(
    async (date: Date) => {
      setIsLoading(true);
      try {
        // Load sessions
        const data = await deepWorkService.getDailySchedule(date);

        // Create category hours map
        const categoryHours = new Map<string, number>();
        for (const session of data.sessions) {
          const catId = session.activityType as string;
          categoryHours.set(
            catId,
            (categoryHours.get(catId) || 0) + session.duration / 3600,
          );
        }

        // Map sessions with category info
        const categoryMap = new Map(categories.map((c) => [c.id, c]));

        const sessionsWithCategories: ScheduleSession[] = data.sessions.map(
          (s) => {
            const category = categoryMap.get(s.activityType as string) || {
              id: "uncategorized",
              name: "Uncategorized",
              color: "#6B7280",
              icon: "circle",
              sort_order: 999,
              is_default: false,
            };
            return {
              id: s.id,
              taskName: s.taskName,
              startTime: s.startTime,
              endTime: s.endTime,
              duration: s.duration,
              durationFormatted: s.durationFormatted,
              categoryId: category.id,
              categoryName: category.name,
              categoryColor: category.color,
              activityLabel: s.activityLabel,
              isActive: s.isActive,
            };
          },
        );

        setScheduleData({
          date: data.date,
          categoryHours,
          totalHours: data.totalHours,
          sessions: sessionsWithCategories,
        });

        // Load timeline blocks
        const timeline = await deepWorkService.getTimelineBlocks(date);
        setTimelineBlocks(timeline.blocks);
      } catch (error) {
        console.error("Failed to load schedule:", error);
        setScheduleData(null);
      } finally {
        setIsLoading(false);
      }
    },
    [categories],
  );

  useEffect(() => {
    if (!categoriesLoading) {
      loadSchedule(currentDate);
    }
  }, [currentDate, categoriesLoading, loadSchedule]);

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

  const handleBlockClick = (block: TimelineBlock) => {
    // If empty block, open manual entry with that time pre-filled
    if (block.coverage === 0) {
      const blockDate = new Date(block.startTime);
      const hours = blockDate.getHours();
      const minutes = blockDate.getMinutes();

      // Set end time to 1 hour later
      const endDate = new Date(blockDate);
      endDate.setHours(hours + 1, minutes);

      setShowManualEntry(true);
      // Note: We'd need to pass these times to ManualSessionEntry
      // For now, just opening the dialog
    }
  };

  return (
    <>
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

        {/* Actions row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Today Button */}
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm text-content-muted hover:text-content-primary hover:bg-surface-tertiary rounded transition-colors"
            >
              Today
            </button>

            {/* View Toggle */}
            <div className="flex items-center bg-surface-tertiary rounded-lg p-1 border border-line/50">
              <button
                onClick={() => setViewMode("timeline")}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  viewMode === "timeline"
                    ? "bg-terminal-accent text-black"
                    : "text-content-muted hover:text-content-primary",
                )}
              >
                <Grid size={16} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  viewMode === "list"
                    ? "bg-terminal-accent text-black"
                    : "text-content-muted hover:text-content-primary",
                )}
              >
                <List size={16} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Category Manager */}
            <button
              onClick={() => setShowCategoryManager(true)}
              className="px-3 py-1.5 text-sm text-content-muted hover:text-content-primary hover:bg-surface-tertiary rounded transition-colors flex items-center gap-1"
            >
              <Settings size={14} />
              <span>Categories</span>
            </button>

            {/* Add Entry Button */}
            <button
              onClick={() => setShowManualEntry(true)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium",
                "bg-terminal-accent text-black",
                "hover:bg-terminal-accent/90 hover:shadow-glow",
                "transition-all",
              )}
            >
              <Plus size={16} />
              <span>Add Entry</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Schedule Content */}
        {!isLoading && scheduleData && (
          <AnimatePresence mode="wait">
            {viewMode === "timeline" ? (
              <motion.div
                key="timeline"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* Category Summary Cards */}
                <CategorySummaryCards
                  categoryHours={scheduleData.categoryHours}
                  totalHours={scheduleData.totalHours}
                  categories={categories}
                  className="mb-4"
                />

                {/* Timeline View */}
                <div className="p-4 rounded-lg bg-surface-secondary border border-line">
                  <h3 className="text-sm font-semibold text-content-primary mb-3 flex items-center gap-2">
                    <CalendarIcon size={16} className="text-neon-cyan" />
                    15-Minute Timeline
                  </h3>
                  <TimelineView
                    blocks={timelineBlocks}
                    onBlockClick={handleBlockClick}
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Category Summary Cards */}
                <CategorySummaryCards
                  categoryHours={scheduleData.categoryHours}
                  totalHours={scheduleData.totalHours}
                  categories={categories}
                />

                {/* Sessions List */}
                <div className="p-4 rounded-lg bg-surface-secondary border border-line">
                  <h3 className="text-sm font-semibold text-content-primary mb-3 flex items-center gap-2">
                    <CalendarIcon size={16} className="text-neon-cyan" />
                    Sessions
                  </h3>

                  {scheduleData.sessions.length === 0 ? (
                    <div className="text-center py-8 text-content-muted">
                      <p className="text-sm">
                        No sessions recorded for this day
                      </p>
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
                            {/* Category Indicator */}
                            <div
                              className="flex flex-col items-center justify-center w-8 h-8 rounded-full shrink-0"
                              style={{
                                backgroundColor: `${session.categoryColor}20`,
                                color: session.categoryColor,
                              }}
                            >
                              <Clock size={14} />
                            </div>

                            {/* Session Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-medium text-content-primary truncate">
                                    {session.taskName}
                                  </h4>
                                  <div className="text-xs text-content-muted">
                                    {session.categoryName}
                                  </div>
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
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Manual Entry Dialog */}
      <ManualSessionEntry
        isOpen={showManualEntry}
        onClose={() => {
          setShowManualEntry(false);
          loadSchedule(currentDate);
        }}
        onSave={() => loadSchedule(currentDate)}
        initialDate={currentDate}
        categories={categories}
        defaultCategoryId={defaultCategory?.id || "cat_work"}
      />

      {/* Category Manager Dialog - TODO: implement */}
    </>
  );
};

export default DailySchedule;
