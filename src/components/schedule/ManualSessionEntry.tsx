/**
 * ManualSessionEntry Component
 *
 * Dialog form for adding/editing past sessions with specific times
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Clock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { deepWorkService } from "@/lib/deepWorkService";
import { ActivityCategory } from "@/lib/deepWorkService";

interface ManualSessionEntryProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  initialDate?: Date;
  categories?: ActivityCategory[];
  defaultCategoryId?: string;
}

interface FormData {
  taskName: string;
  categoryId: string;
  activityLabel: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
}

export const ManualSessionEntry: React.FC<ManualSessionEntryProps> = ({
  isOpen,
  onClose,
  onSave,
  initialDate,
  categories = [],
  defaultCategoryId = "cat_work",
}) => {
  const [formData, setFormData] = useState<FormData>({
    taskName: "",
    categoryId: defaultCategoryId,
    activityLabel: "",
    date: initialDate
      ? initialDate.toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "10:00",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setFormData({
        taskName: "",
        categoryId: defaultCategoryId,
        activityLabel: "",
        date: initialDate
          ? initialDate.toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        startTime: "09:00",
        endTime: "10:00",
      });
    }
  }, [isOpen, initialDate, defaultCategoryId]);

  const calculateDuration = () => {
    const [startH, startM] = formData.startTime.split(":").map(Number);
    const [endH, endM] = formData.endTime.split(":").map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    const durationMinutes = endMinutes - startMinutes;
    if (durationMinutes <= 0) return 0;

    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.taskName.trim()) {
      toast.error("Please enter a task name");
      return;
    }

    // Validate times
    const [startH, startM] = formData.startTime.split(":").map(Number);
    const [endH, endM] = formData.endTime.split(":").map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const durationMinutes = endMinutes - startMinutes;

    if (durationMinutes <= 0) {
      toast.error("End time must be after start time");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create date objects for start and end times
      const startDate = new Date(formData.date);
      startDate.setHours(startH, startM, 0, 0);

      const endDate = new Date(formData.date);
      endDate.setHours(endH, endM, 0, 0);

      const result = await deepWorkService.addManualSession({
        taskName: formData.taskName,
        categoryId: formData.categoryId,
        activityLabel: formData.activityLabel || undefined,
        startTime: startDate,
        endTime: endDate,
      });

      if (result) {
        toast.success("Session added successfully");
        onSave?.();
        onClose();
      } else {
        toast.error("Failed to add session");
      }
    } catch (error) {
      console.error("Error adding session:", error);
      toast.error("Failed to add session");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const duration = calculateDuration();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md bg-surface-secondary border border-line rounded-xl shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-line/50">
          <h2 className="text-lg font-semibold text-content-primary">
            Add Session
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-surface-tertiary transition-colors"
          >
            <X size={18} className="text-content-muted" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Task name */}
          <div>
            <label className="block text-sm text-content-muted mb-1.5">
              What did you work on?
            </label>
            <input
              type="text"
              value={formData.taskName}
              onChange={(e) =>
                setFormData({ ...formData, taskName: e.target.value })
              }
              placeholder="e.g., Built feature X"
              className="w-full px-3 py-2 bg-surface-tertiary border border-line rounded-lg focus:outline-none focus:border-terminal-accent text-content-primary"
              autoFocus
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm text-content-muted mb-1.5">
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                Date
              </div>
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              className="w-full px-3 py-2 bg-surface-tertiary border border-line rounded-lg focus:outline-none focus:border-terminal-accent text-content-primary"
            />
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-content-muted mb-1.5">
                Start Time
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) =>
                  setFormData({ ...formData, startTime: e.target.value })
                }
                className="w-full px-3 py-2 bg-surface-tertiary border border-line rounded-lg focus:outline-none focus:border-terminal-accent text-content-primary"
              />
            </div>
            <div>
              <label className="block text-sm text-content-muted mb-1.5">
                End Time
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) =>
                  setFormData({ ...formData, endTime: e.target.value })
                }
                className="w-full px-3 py-2 bg-surface-tertiary border border-line rounded-lg focus:outline-none focus:border-terminal-accent text-content-primary"
              />
            </div>
          </div>

          {/* Duration display */}
          {duration && (
            <div className="flex items-center gap-2 text-sm text-content-muted">
              <Clock size={14} />
              <span>Duration: {duration}</span>
            </div>
          )}

          {/* Category */}
          {categories.length > 0 && (
            <div>
              <label className="block text-sm text-content-muted mb-1.5">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, categoryId: category.id })
                    }
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                      formData.categoryId === category.id
                        ? "ring-1 ring-white/50"
                        : "opacity-60 hover:opacity-100",
                    )}
                    style={{
                      backgroundColor:
                        formData.categoryId === category.id
                          ? category.color
                          : `${category.color}30`,
                      color:
                        formData.categoryId === category.id ? "#000" : "#fff",
                    }}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Activity label (optional) */}
          <div>
            <label className="block text-sm text-content-muted mb-1.5">
              Label (optional)
            </label>
            <input
              type="text"
              value={formData.activityLabel}
              onChange={(e) =>
                setFormData({ ...formData, activityLabel: e.target.value })
              }
              placeholder="e.g., Frontend, Research..."
              className="w-full px-3 py-2 bg-surface-tertiary border border-line rounded-lg focus:outline-none focus:border-terminal-accent text-content-primary text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-content-muted hover:text-content-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.taskName.trim()}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                "bg-terminal-accent text-black",
                "hover:bg-terminal-accent/90 hover:shadow-glow",
                "transition-all disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              <Plus size={16} />
              <span>{isSubmitting ? "Adding..." : "Add Session"}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default ManualSessionEntry;
