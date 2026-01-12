/**
 * TrainingKPI Component
 *
 * Training sessions with multi-type support.
 * Cyberpunk aesthetic with glow effects.
 */

import React, { useState } from "react";
import {
  X,
  Dumbbell,
  ChevronDown,
  ChevronUp,
  Edit2,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { colors, shadows } from "@/styles/design-tokens";
import { TrainingType, TrainingSession } from "@/lib/kpiDefaults";
import { AddSessionDropdown } from "./AddSessionDropdown";

interface TrainingKPIProps {
  target: number | null;
  sessions: TrainingSession[];
  countingSessionCount: number;
  trainingTypes: TrainingType[];
  color: string;
  weekDates: { start: Date; end: Date };
  onAddSession: (typeId: string, date: string) => void;
  onRemoveSession: (sessionId: string) => void;
  onAddType: (name: string, color: string) => void;
  onUpdateTarget?: (target: number) => void;
}

export const TrainingKPI: React.FC<TrainingKPIProps> = ({
  target,
  sessions,
  countingSessionCount,
  trainingTypes,
  color,
  weekDates,
  onAddSession,
  onRemoveSession,
  onAddType,
  onUpdateTarget,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [editTarget, setEditTarget] = useState<number>(target ?? 5);

  // Calculate progress
  const progress =
    target && target > 0
      ? Math.min(100, (countingSessionCount / target) * 100)
      : 0;
  const isComplete = progress >= 100;

  // Get progress color
  const getProgressColor = (pct: number): string => {
    if (pct >= 100) return colors.success.DEFAULT;
    if (pct >= 70) return color;
    return color;
  };

  const progressColor = getProgressColor(progress);

  // Format date for display
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString(undefined, { weekday: "short" });
  };

  // Group sessions by date
  const sessionsByDate = sessions.reduce(
    (acc, session) => {
      if (!acc[session.date]) {
        acc[session.date] = [];
      }
      acc[session.date].push(session);
      return acc;
    },
    {} as Record<string, TrainingSession[]>,
  );

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
      {/* Header - Clickable to toggle collapse */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsCollapsed(!isCollapsed)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsCollapsed(!isCollapsed);
          }
        }}
        className="w-full flex items-center justify-between mb-3 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center"
            style={{
              backgroundColor: `${color}20`,
              border: `1px solid ${color}40`,
            }}
          >
            <Dumbbell size={16} style={{ color }} />
          </div>
          <div className="text-left">
            <span
              className="font-semibold text-sm"
              style={{ color: isComplete ? colors.success.DEFAULT : color }}
            >
              Training
            </span>
            <div
              className="text-xs font-mono flex items-center gap-1"
              style={{ color: colors.text.muted }}
            >
              {countingSessionCount}
              {isEditingTarget ? (
                <span className="flex items-center gap-1">
                  /
                  <input
                    type="number"
                    min="1"
                    value={editTarget}
                    onChange={(e) =>
                      setEditTarget(parseInt(e.target.value) || 1)
                    }
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        onUpdateTarget?.(editTarget);
                        setIsEditingTarget(false);
                      } else if (e.key === "Escape") {
                        e.stopPropagation();
                        setEditTarget(target ?? 5);
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
                <>
                  {target ? `/${target}` : ""} sessions
                  {onUpdateTarget && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditTarget(target ?? 5);
                        setIsEditingTarget(true);
                      }}
                      className="p-0.5 rounded hover:bg-white/10 ml-1 opacity-50 hover:opacity-100"
                      title="Edit target"
                    >
                      <Edit2 size={10} style={{ color: colors.text.muted }} />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {target && (
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
      </div>

      {/* Progress bar - always visible */}
      {target && target > 0 && (
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
              backgroundColor: progressColor,
              boxShadow: isComplete ? `0 0 10px ${progressColor}` : undefined,
            }}
          />
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
            className="overflow-visible"
          >
            {/* Sessions list */}
            <AnimatePresence mode="popLayout">
              {sessions.length > 0 && (
                <motion.div
                  className="space-y-2 mb-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {Object.entries(sessionsByDate).map(
                    ([date, dateSessions]) => (
                      <motion.div
                        key={date}
                        className="flex flex-wrap items-center gap-2"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                      >
                        <span
                          className="text-xs font-mono w-10"
                          style={{ color: colors.text.muted }}
                        >
                          {formatDate(date)}
                        </span>
                        {dateSessions.map((session) => {
                          const type =
                            session.training_type ||
                            trainingTypes.find(
                              (t) => t.id === session.training_type_id,
                            );
                          const typeColor = type?.color || color;

                          return (
                            <motion.div
                              key={session.id}
                              layout
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm"
                              style={{
                                border: `1px solid ${typeColor}50`,
                                backgroundColor: `${typeColor}10`,
                                color: typeColor,
                              }}
                            >
                              <span className="text-base">
                                {type?.icon || "🏋️"}
                              </span>
                              <span className="font-medium">
                                {type?.name || "Unknown"}
                              </span>
                              {!type?.counts_toward_target && (
                                <span
                                  className="text-[10px] px-1 rounded"
                                  style={{
                                    backgroundColor: `${colors.text.muted}20`,
                                    color: colors.text.muted,
                                  }}
                                >
                                  +
                                </span>
                              )}
                              <motion.button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRemoveSession(session.id);
                                }}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="ml-0.5 p-0.5 rounded transition-colors"
                                style={{ color: `${typeColor}80` }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = `${typeColor}20`;
                                  e.currentTarget.style.color = typeColor;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor =
                                    "transparent";
                                  e.currentTarget.style.color = `${typeColor}80`;
                                }}
                              >
                                <X size={12} />
                              </motion.button>
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    ),
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty state */}
            {sessions.length === 0 && (
              <motion.div
                className="text-sm py-3 text-center rounded-md mb-4"
                style={{
                  color: colors.text.muted,
                  backgroundColor: `${colors.background.tertiary}`,
                  border: `1px dashed ${colors.border.DEFAULT}`,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                No training sessions this week
              </motion.div>
            )}

            {/* Add session dropdown */}
            <AddSessionDropdown
              trainingTypes={trainingTypes}
              onAddSession={onAddSession}
              onAddType={onAddType}
              weekDates={weekDates}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TrainingKPI;
