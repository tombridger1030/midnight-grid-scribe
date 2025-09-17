import React, { useState, useEffect } from 'react';
import { Target, Edit2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  loadNoctisiumData,
  saveNoctisiumData,
  getCurrentWorkSlice
} from '@/lib/storage';

interface PriorityManagerProps {
  className?: string;
  variant?: 'full' | 'compact';
}

export const PriorityManager: React.FC<PriorityManagerProps> = ({
  className,
  variant = 'full'
}) => {
  const [currentPriority, setCurrentPriority] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isActiveSlice, setIsActiveSlice] = useState(false);

  useEffect(() => {
    const loadPriority = () => {
      const data = loadNoctisiumData();
      setCurrentPriority(data.currentPriority || '');

      const slice = getCurrentWorkSlice();
      setIsActiveSlice(!!slice?.isActive);
    };

    loadPriority();

    // Refresh every 30 seconds
    const interval = setInterval(loadPriority, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleStartEdit = () => {
    setEditValue(currentPriority);
    setIsEditing(true);
  };

  const handleSave = () => {
    const data = loadNoctisiumData();
    data.currentPriority = editValue.trim();
    saveNoctisiumData(data);

    setCurrentPriority(editValue.trim());
    setIsEditing(false);
    setEditValue('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Target size={16} className="text-[#5FE3B3]" />
        {isEditing ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="What's your #1 priority?"
              className="bg-transparent border-b border-terminal-accent/30 text-terminal-accent text-sm px-1 py-0.5 focus:outline-none focus:border-[#5FE3B3] min-w-[150px]"
              autoFocus
              maxLength={50}
            />
            <button
              onClick={handleSave}
              className="p-0.5 hover:bg-[#333] transition-colors rounded"
              disabled={!editValue.trim()}
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
            <span className="text-sm text-terminal-accent truncate max-w-[200px]">
              {currentPriority || "Set Top 1 Priority"}
            </span>
            <Edit2 size={12} className="text-terminal-accent/50" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={20} className="text-[#5FE3B3]" />
          <h3 className="text-lg text-terminal-accent font-medium">Top 1 Priority</h3>
        </div>
        {!isEditing && (
          <button
            onClick={handleStartEdit}
            className="p-1 hover:bg-[#333] transition-colors rounded"
            title="Edit priority"
          >
            <Edit2 size={16} className="text-terminal-accent/70" />
          </button>
        )}
      </div>

      <div className="border border-terminal-accent/30 p-4 bg-terminal-bg/20 rounded">
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="What's the single most important thing you need to focus on today?"
              className="w-full bg-transparent border border-terminal-accent/30 text-terminal-accent px-3 py-2 focus:outline-none focus:border-[#5FE3B3] resize-none rounded"
              rows={3}
              maxLength={200}
              autoFocus
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-terminal-accent/50">
                {editValue.length}/200 characters
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
                  disabled={!editValue.trim()}
                  className="px-3 py-1 text-sm bg-[#5FE3B3] text-black hover:bg-[#5FE3B3]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded"
                >
                  Set Priority
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {currentPriority ? (
              <>
                <p className="text-terminal-accent text-lg leading-relaxed">
                  {currentPriority}
                </p>
                {isActiveSlice && (
                  <div className="flex items-center gap-2 text-xs text-[#5FE3B3]">
                    <div className="w-2 h-2 bg-[#5FE3B3] rounded-full animate-pulse" />
                    <span>Active work slice</span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4">
                <Target size={32} className="mx-auto mb-2 text-terminal-accent/50" />
                <p className="text-terminal-accent/70 mb-2">No priority set</p>
                <p className="text-sm text-terminal-accent/50">
                  Click to set your single most important focus for today
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {currentPriority && !isEditing && (
        <div className="text-xs text-terminal-accent/50 text-center">
          This priority guides your deep work sessions and shapes your work slices
        </div>
      )}
    </div>
  );
};