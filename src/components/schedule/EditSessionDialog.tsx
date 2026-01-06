/**
 * EditSessionDialog Component
 *
 * Dialog for editing existing deep work sessions
 */

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Clock, Trash2, Pencil, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { deepWorkService, ActivityCategory } from "@/lib/deepWorkService";

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

interface EditSessionDialogProps {
  session: ScheduleSession;
  categories: ActivityCategory[];
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

interface FormData {
  taskName: string;
  categoryId: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  notes: string;
}

export const EditSessionDialog: React.FC<EditSessionDialogProps> = ({
  session,
  categories,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<FormData>({
    taskName: session.taskName,
    categoryId: session.categoryId,
    startTime: "",
    endTime: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Parse ISO time to HH:MM format
  const parseTimeToHM = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toTimeString().slice(0, 5);
  };

  // Initialize form when session changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        taskName: session.taskName,
        categoryId: session.categoryId,
        startTime: session.endTime ? parseTimeToHM(session.startTime) : "",
        endTime: session.endTime ? parseTimeToHM(session.endTime) : "",
        notes: "", // Notes field not in current session interface
      });
      setShowDeleteConfirm(false);
    }
  }, [isOpen, session]);

  const calculateDuration = () => {
    if (!formData.startTime || !formData.endTime) return null;

    const [startH, startM] = formData.startTime.split(":").map(Number);
    const [endH, endM] = formData.endTime.split(":").map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const durationMinutes = endMinutes - startMinutes;

    if (durationMinutes <= 0) return null;

    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.taskName.trim()) {
      toast.error("Please enter a task name");
      return;
    }

    // Validate times
    if (formData.startTime && formData.endTime) {
      const [startH, startM] = formData.startTime.split(":").map(Number);
      const [endH, endM] = formData.endTime.split(":").map(Number);

      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (endMinutes <= startMinutes) {
        toast.error("End time must be after start time");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Get the date from the session's start time
      const sessionDate = new Date(session.startTime);
      sessionDate.setHours(0, 0, 0, 0);

      // Create date objects for start and end times
      const [startH, startM] = formData.startTime.split(":").map(Number);
      const [endH, endM] = formData.endTime.split(":").map(Number);

      const startDate = new Date(sessionDate);
      startDate.setHours(startH, startM, 0, 0);

      const endDate = new Date(sessionDate);
      endDate.setHours(endH, endM, 0, 0);

      const result = await deepWorkService.updateSession(session.id, {
        taskName: formData.taskName,
        categoryId: formData.categoryId,
        startTime: startDate,
        endTime: endDate,
        notes: formData.notes || undefined,
      });

      if (result) {
        toast.success("Session updated successfully");
        onSave();
        onClose();
      } else {
        toast.error("Failed to update session");
      }
    } catch (error) {
      console.error("Error updating session:", error);
      toast.error("Failed to update session");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setIsDeleting(true);

    try {
      const result = await deepWorkService.deleteSession(session.id);
      if (result) {
        toast.success("Session deleted");
        onSave();
        onClose();
      } else {
        toast.error("Failed to delete session");
      }
    } catch (error) {
      console.error("Error deleting session:", error);
      toast.error("Failed to delete session");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  const duration = calculateDuration();
  const selectedCategory = categories.find((c) => c.id === formData.categoryId);

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
          <div className="flex items-center gap-2">
            <div
              className="p-1.5 rounded-md"
              style={{
                backgroundColor: `${selectedCategory?.color || "#5FE3B3"}20`,
              }}
            >
              <Pencil
                size={16}
                style={{ color: selectedCategory?.color || "#5FE3B3" }}
              />
            </div>
            <h2 className="text-lg font-semibold text-content-primary">
              Edit Session
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-surface-tertiary transition-colors"
          >
            <X size={18} className="text-content-muted" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-4 space-y-4">
          {/* Task name */}
          <div>
            <label className="block text-sm text-content-muted mb-1.5">
              Task Name
            </label>
            <input
              type="text"
              value={formData.taskName}
              onChange={(e) =>
                setFormData({ ...formData, taskName: e.target.value })
              }
              placeholder="What did you work on?"
              className="w-full px-3 py-2 bg-surface-tertiary border border-line rounded-lg focus:outline-none focus:border-terminal-accent text-content-primary"
              autoFocus
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

          {/* Notes */}
          <div>
            <label className="block text-sm text-content-muted mb-1.5">
              Notes (optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Add any notes about this session..."
              rows={3}
              className="w-full px-3 py-2 bg-surface-tertiary border border-line rounded-lg focus:outline-none focus:border-terminal-accent text-content-primary text-sm resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || session.isActive}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                showDeleteConfirm
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "text-red-400 hover:text-red-300 hover:bg-red-500/10",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              {showDeleteConfirm ? (
                <>
                  <Check size={16} />
                  <span>Confirm Delete</span>
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  <span>Delete</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-3">
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
                <Check size={16} />
                <span>{isSubmitting ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default EditSessionDialog;
