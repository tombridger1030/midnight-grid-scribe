import React, { useState, useEffect } from 'react';
import { Focus, Edit2, Check, X, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getCurrentWeeklyConstraint,
  setWeeklyConstraint,
  WeeklyConstraint as WeeklyConstraintType
} from '@/lib/storage';

interface WeeklyConstraintProps {
  className?: string;
  variant?: 'full' | 'compact';
}

export const WeeklyConstraint: React.FC<WeeklyConstraintProps> = ({
  className,
  variant = 'full'
}) => {
  const [currentConstraint, setCurrentConstraint] = useState<WeeklyConstraintType | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editConstraint, setEditConstraint] = useState('');
  const [editReason, setEditReason] = useState('');

  useEffect(() => {
    const loadConstraint = () => {
      const constraint = getCurrentWeeklyConstraint();
      setCurrentConstraint(constraint);
    };

    loadConstraint();

    // Refresh every hour
    const interval = setInterval(loadConstraint, 60000 * 60);
    return () => clearInterval(interval);
  }, []);

  const handleStartEdit = () => {
    setEditConstraint(currentConstraint?.constraint || '');
    setEditReason(currentConstraint?.reason || '');
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!editConstraint.trim()) return;

    const constraint = setWeeklyConstraint(
      editConstraint.trim(),
      editReason.trim() || undefined
    );

    setCurrentConstraint(constraint);
    setIsEditing(false);
    setEditConstraint('');
    setEditReason('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditConstraint('');
    setEditReason('');
  };

  const getWeekInfo = () => {
    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    return {
      weekStart: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      weekEnd: weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
  };

  const weekInfo = getWeekInfo();

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Focus size={16} className="text-[#FFD700]" />
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={editConstraint}
                onChange={(e) => setEditConstraint(e.target.value)}
                placeholder="This week's single constraint..."
                className="flex-1 bg-transparent border-b border-terminal-accent/30 text-terminal-accent text-sm px-1 py-0.5 focus:outline-none focus:border-[#FFD700]"
                autoFocus
                maxLength={100}
              />
              <button
                onClick={handleSave}
                className="p-0.5 hover:bg-[#333] transition-colors rounded"
                disabled={!editConstraint.trim()}
              >
                <Check size={12} className="text-[#5FE3B3]" />
              </button>
              <button
                onClick={handleCancel}
                className="p-0.5 hover:bg-[#333] transition-colors rounded"
              >
                <X size={12} className="text-terminal-accent/70" />
              </button>
            </div>
          ) : (
            <div
              className="flex items-center gap-1 cursor-pointer hover:bg-[#333] px-2 py-1 rounded transition-colors"
              onClick={handleStartEdit}
            >
              <span className="text-sm text-terminal-accent truncate">
                {currentConstraint?.constraint || "Set weekly constraint"}
              </span>
              <Edit2 size={12} className="text-terminal-accent/50" />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Focus size={20} className="text-[#FFD700]" />
          <div>
            <h3 className="text-lg text-terminal-accent font-medium">Weekly Constraint</h3>
            <div className="flex items-center gap-1 text-xs text-terminal-accent/70">
              <Calendar size={12} />
              <span>{weekInfo.weekStart} - {weekInfo.weekEnd}</span>
            </div>
          </div>
        </div>
        {!isEditing && (
          <button
            onClick={handleStartEdit}
            className="p-1 hover:bg-[#333] transition-colors rounded"
            title="Edit constraint"
          >
            <Edit2 size={16} className="text-terminal-accent/70" />
          </button>
        )}
      </div>

      <div className="border border-terminal-accent/30 p-4 bg-terminal-bg/20 rounded">
        {isEditing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-terminal-accent/70">
                Constraint (the one thing to remove/focus on this week)
              </label>
              <textarea
                value={editConstraint}
                onChange={(e) => setEditConstraint(e.target.value)}
                placeholder="e.g., 'Cut social media scrolling' or 'Only work on user auth feature'"
                className="w-full bg-transparent border border-terminal-accent/30 text-terminal-accent px-3 py-2 focus:outline-none focus:border-[#FFD700] resize-none rounded"
                rows={2}
                maxLength={150}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-terminal-accent/70">
                Reason (why this constraint matters)
              </label>
              <textarea
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Optional: Why is this constraint important this week?"
                className="w-full bg-transparent border border-terminal-accent/30 text-terminal-accent px-3 py-2 focus:outline-none focus:border-[#FFD700] resize-none rounded"
                rows={2}
                maxLength={200}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-terminal-accent/50">
                Constraint: {editConstraint.length}/150 • Reason: {editReason.length}/200
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 text-sm text-terminal-accent/70 hover:text-terminal-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!editConstraint.trim()}
                  className="px-3 py-1 text-sm bg-[#FFD700] text-black hover:bg-[#FFD700]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded"
                >
                  Set Constraint
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {currentConstraint ? (
              <>
                <div className="p-3 bg-[#FFD700]/10 border-l-2 border-[#FFD700] rounded-r">
                  <p className="text-terminal-accent text-lg leading-relaxed mb-2">
                    {currentConstraint.constraint}
                  </p>
                  {currentConstraint.reason && (
                    <p className="text-terminal-accent/70 text-sm">
                      <span className="text-[#FFD700]">Why:</span> {currentConstraint.reason}
                    </p>
                  )}
                </div>

                <div className="text-xs text-terminal-accent/50">
                  This constraint guides your weekly decisions and helps maintain focus
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <Focus size={32} className="mx-auto mb-2 text-terminal-accent/50" />
                <p className="text-terminal-accent/70 mb-2">No weekly constraint set</p>
                <p className="text-sm text-terminal-accent/50">
                  Set one thing to focus on or remove this week
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="text-xs text-terminal-accent/50 space-y-1">
        <p>• A constraint is something you either focus exclusively on, or eliminate entirely</p>
        <p>• Examples: "Only work on core features", "Cut all meetings this week"</p>
      </div>
    </div>
  );
};