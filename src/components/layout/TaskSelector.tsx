/**
 * TaskSelector Component
 * Quick task selection panel for starting deep work sessions
 * Supports activity type (work/personal) and custom activity labels
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Clock, X, Briefcase, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { deepWorkService, ActivityType } from "@/lib/deepWorkService";

export interface SessionConfig {
  taskName: string;
  activityType: ActivityType;
  activityLabel?: string;
}

interface TaskSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTask: (config: SessionConfig | string) => void;
}

export const TaskSelector: React.FC<TaskSelectorProps> = ({
  isOpen,
  onClose,
  onSelectTask,
}) => {
  const [recentTasks, setRecentTasks] = useState<string[]>([]);
  const [recentLabels, setRecentLabels] = useState<string[]>([]);
  const [newTask, setNewTask] = useState("");
  const [activityType, setActivityType] = useState<ActivityType>("work");
  const [activityLabel, setActivityLabel] = useState("");
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [filteredLabels, setFilteredLabels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Load recent tasks and labels when panel opens
  useEffect(() => {
    if (isOpen) {
      loadRecentData();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Filter labels based on input
  useEffect(() => {
    if (activityLabel) {
      const filtered = recentLabels.filter((label) =>
        label.toLowerCase().includes(activityLabel.toLowerCase()),
      );
      setFilteredLabels(filtered);
    } else {
      setFilteredLabels(recentLabels.slice(0, 5));
    }
  }, [activityLabel, recentLabels]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      const timer = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 100);
      return () => {
        clearTimeout(timer);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  const loadRecentData = async () => {
    setIsLoading(true);
    try {
      const [tasks, labels] = await Promise.all([
        deepWorkService.getRecentTasks(5),
        deepWorkService.getRecentActivityLabels(10),
      ]);
      setRecentTasks(tasks);
      setRecentLabels(labels);
      setFilteredLabels(labels.slice(0, 5));
    } catch (error) {
      console.error("Failed to load recent data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTask.trim()) {
      const config: SessionConfig = {
        taskName: newTask.trim(),
        activityType,
        activityLabel: activityLabel.trim() || undefined,
      };
      onSelectTask(config);
      resetForm();
    }
  };

  const handleSelectRecent = (task: string) => {
    onSelectTask({
      taskName: task,
      activityType,
      activityLabel: activityLabel.trim() || undefined,
    });
    resetForm();
  };

  const handleSelectLabel = (label: string) => {
    setActivityLabel(label);
    setShowLabelInput(false);
  };

  const resetForm = () => {
    setNewTask("");
    setActivityLabel("");
    setShowLabelInput(false);
    setActivityType("work");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className={cn(
            "absolute top-full left-0 mt-2 z-50",
            "w-96 rounded-lg overflow-hidden",
            "bg-surface-secondary border border-line",
            "shadow-lg shadow-black/50",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <h3 className="text-sm font-display font-semibold text-content-primary">
              Start Deep Work
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-surface-hover transition-colors text-content-muted hover:text-content-primary"
            >
              <X size={16} />
            </button>
          </div>

          {/* Activity Type Toggle */}
          <div className="px-4 py-3 border-b border-line">
            <div className="text-xs text-content-muted mb-2">Activity Type</div>
            <div className="flex gap-2">
              <button
                onClick={() => setActivityType("work")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-all",
                  activityType === "work"
                    ? "bg-neon-cyan text-black shadow-glow-cyan"
                    : "bg-surface-tertiary text-content-muted hover:text-content-primary",
                )}
              >
                <Briefcase size={14} />
                <span>Work</span>
              </button>
              <button
                onClick={() => setActivityType("personal")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-all",
                  activityType === "personal"
                    ? "bg-purple-500 text-white shadow-glow-purple"
                    : "bg-surface-tertiary text-content-muted hover:text-content-primary",
                )}
              >
                <Heart size={14} />
                <span>Personal</span>
              </button>
            </div>
          </div>

          {/* Activity Label */}
          <div className="px-4 py-3 border-b border-line">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-content-muted">Activity Label</div>
              {!showLabelInput && (
                <button
                  onClick={() => {
                    setShowLabelInput(true);
                    setTimeout(() => labelInputRef.current?.focus(), 100);
                  }}
                  className="text-xs text-neon-cyan hover:underline"
                >
                  + Add Label
                </button>
              )}
            </div>

            {showLabelInput ? (
              <div className="relative">
                <input
                  ref={labelInputRef}
                  type="text"
                  value={activityLabel}
                  onChange={(e) => setActivityLabel(e.target.value)}
                  placeholder="e.g., Coding, Reading, Exercise..."
                  className={cn(
                    "w-full px-3 py-2 rounded pr-8",
                    "bg-surface-tertiary border border-line",
                    "text-sm text-content-primary placeholder:text-content-muted",
                    "focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan",
                    "transition-colors",
                  )}
                  maxLength={50}
                />
                {activityLabel && (
                  <button
                    onClick={() => setActivityLabel("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-primary"
                  >
                    <X size={14} />
                  </button>
                )}

                {/* Autocomplete dropdown */}
                {filteredLabels.length > 0 &&
                  activityLabel &&
                  !recentLabels.includes(activityLabel) && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-surface-secondary border border-line rounded-md shadow-lg z-10">
                      {filteredLabels.map((label) => (
                        <button
                          key={label}
                          onClick={() => handleSelectLabel(label)}
                          className="w-full text-left px-3 py-2 text-sm text-content-secondary hover:bg-surface-hover hover:text-content-primary transition-colors"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            ) : activityLabel ? (
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded text-xs font-medium bg-surface-tertiary text-content-primary">
                  {activityLabel}
                </span>
                <button
                  onClick={() => setActivityLabel("")}
                  className="text-content-muted hover:text-content-primary"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="text-xs text-content-muted italic">
                No label selected
              </div>
            )}
          </div>

          {/* Recent Tasks */}
          {recentTasks.length > 0 && (
            <div className="px-4 py-3 border-b border-line max-h-40 overflow-y-auto">
              <div className="text-xs text-content-muted mb-2 flex items-center gap-1">
                <Clock size={12} />
                <span>Recent tasks</span>
              </div>
              <ul className="space-y-1">
                {recentTasks.map((task, index) => (
                  <li key={index}>
                    <button
                      onClick={() => handleSelectRecent(task)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded",
                        "text-sm text-content-secondary",
                        "hover:bg-surface-hover hover:text-content-primary",
                        "transition-colors",
                        "flex items-center justify-between group",
                      )}
                    >
                      <span className="truncate">{task}</span>
                      <Play
                        size={14}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-neon-cyan shrink-0 ml-2"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* New Task Input */}
          <form onSubmit={handleSubmit} className="p-4">
            <div className="text-xs text-content-muted mb-2">
              Or type a new task
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="What are you working on?"
                className={cn(
                  "flex-1 px-3 py-2 rounded",
                  "bg-surface-tertiary border border-line",
                  "text-sm text-content-primary placeholder:text-content-muted",
                  "focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan",
                  "transition-colors",
                )}
                maxLength={100}
              />
              <button
                type="submit"
                disabled={!newTask.trim()}
                className={cn(
                  "p-2 rounded",
                  activityType === "work"
                    ? "bg-neon-cyan text-black hover:bg-neon-cyan/90"
                    : "bg-purple-500 text-white hover:bg-purple-500/90",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-colors",
                )}
              >
                <Play size={16} />
              </button>
            </div>
          </form>

          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 bg-surface-secondary/80 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TaskSelector;
