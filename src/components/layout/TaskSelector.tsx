/**
 * TaskSelector Component
 * Quick task selection panel for starting deep work sessions
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { deepWorkService } from '@/lib/deepWorkService';

interface TaskSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTask: (taskName: string) => void;
}

export const TaskSelector: React.FC<TaskSelectorProps> = ({
  isOpen,
  onClose,
  onSelectTask,
}) => {
  const [recentTasks, setRecentTasks] = useState<string[]>([]);
  const [newTask, setNewTask] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Load recent tasks when panel opens
  useEffect(() => {
    if (isOpen) {
      loadRecentTasks();
      // Focus input after a short delay
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const loadRecentTasks = async () => {
    setIsLoading(true);
    try {
      const tasks = await deepWorkService.getRecentTasks(5);
      setRecentTasks(tasks);
    } catch (error) {
      console.error('Failed to load recent tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTask.trim()) {
      onSelectTask(newTask.trim());
      setNewTask('');
    }
  };

  const handleSelectRecent = (task: string) => {
    onSelectTask(task);
    setNewTask('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={cn(
            'absolute top-full left-0 mt-2 z-50',
            'w-80 rounded-lg overflow-hidden',
            'bg-surface-secondary border border-line',
            'shadow-lg shadow-black/50'
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

          {/* Recent Tasks */}
          {recentTasks.length > 0 && (
            <div className="px-4 py-3 border-b border-line">
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
                        'w-full text-left px-3 py-2 rounded',
                        'text-sm text-content-secondary',
                        'hover:bg-surface-hover hover:text-content-primary',
                        'transition-colors',
                        'flex items-center justify-between group'
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
                  'flex-1 px-3 py-2 rounded',
                  'bg-surface-tertiary border border-line',
                  'text-sm text-content-primary placeholder:text-content-muted',
                  'focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan',
                  'transition-colors'
                )}
                maxLength={100}
              />
              <button
                type="submit"
                disabled={!newTask.trim()}
                className={cn(
                  'p-2 rounded',
                  'bg-neon-cyan text-black',
                  'hover:bg-neon-cyan/90',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-colors'
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
