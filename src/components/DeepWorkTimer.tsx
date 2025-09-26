import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Clock, Target, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  startDeepWorkSession,
  stopDeepWorkSession,
  getCurrentDeepWorkSession,
  getCurrentWorkSlice,
  DeepWorkSession
} from '@/lib/storage';

interface DeepWorkTimerProps {
  className?: string;
}

export const DeepWorkTimer: React.FC<DeepWorkTimerProps> = ({ className }) => {
  const [currentSession, setCurrentSession] = useState<DeepWorkSession | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [priority, setPriority] = useState('');
  const [isSettingPriority, setIsSettingPriority] = useState(false);

  // Load current session on mount
  useEffect(() => {
    const session = getCurrentDeepWorkSession();
    setCurrentSession(session);

    if (session) {
      const elapsed = Math.floor((Date.now() - new Date(session.startTime).getTime()) / 1000);
      setElapsedTime(elapsed);
    }
  }, []);

  // Update timer every second when active
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (currentSession?.isActive) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - new Date(currentSession.startTime).getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentSession]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    if (!priority.trim()) {
      setIsSettingPriority(true);
      return;
    }

    const session = startDeepWorkSession(priority.trim());
    setCurrentSession(session);
    setElapsedTime(0);
    setIsSettingPriority(false);
  };

  const handleStop = () => {
    if (currentSession) {
      stopDeepWorkSession();
      setCurrentSession(null);
      setElapsedTime(0);
    }
  };

  const handleSetPriority = (e: React.FormEvent) => {
    e.preventDefault();
    if (priority.trim()) {
      handleStart();
    }
  };

  const getTimerColor = (): string => {
    if (!currentSession?.isActive) return 'text-terminal-accent';

    const minutes = Math.floor(elapsedTime / 60);

    // Green for 0-90 minutes (optimal focus time)
    if (minutes <= 90) return 'text-[#5FE3B3]';

    // Amber for 90-120 minutes (extended focus)
    if (minutes <= 120) return 'text-[#FFD700]';

    // Red after 120 minutes (take a break!)
    return 'text-[#FF6B6B]';
  };

  const getProgressBar = (): number => {
    if (!currentSession?.isActive) return 0;
    const minutes = Math.floor(elapsedTime / 60);
    // Progress bar fills at 90 minutes (optimal session length)
    return Math.min(100, (minutes / 90) * 100);
  };

  if (isSettingPriority) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <form onSubmit={handleSetPriority} className="flex items-center gap-2">
          <AlertCircle size={16} className="text-[#5FE3B3]" />
          <input
            type="text"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            placeholder="What are you tackling right now?"
            className="bg-transparent border-b border-terminal-accent/30 text-terminal-accent text-sm px-2 py-1 focus:outline-none focus:border-[#5FE3B3] min-w-[200px]"
            autoFocus
            maxLength={50}
          />
          <button
            type="submit"
            className="text-[#5FE3B3] hover:text-white transition-colors"
            disabled={!priority.trim()}
          >
            <Play size={16} />
          </button>
          <button
            type="button"
            onClick={() => setIsSettingPriority(false)}
            className="text-terminal-accent/70 hover:text-terminal-accent transition-colors"
          >
            <Square size={16} />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Timer Display */}
      <div className="flex items-center gap-2">
        <Clock size={16} className={getTimerColor()} />
        <div className="font-mono text-lg font-bold" style={{ color: getTimerColor() }}>
          {formatTime(elapsedTime)}
        </div>

        {/* Progress indicator */}
        {currentSession?.isActive && (
          <div className="w-12 h-1 bg-terminal-accent/20 rounded overflow-hidden">
            <div
              className="h-full transition-all duration-1000 bg-[#5FE3B3]"
              style={{ width: `${getProgressBar()}%` }}
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1">
        {!currentSession?.isActive ? (
          <button
            onClick={() => setIsSettingPriority(true)}
            className="p-1 hover:bg-[#333] transition-colors min-h-[24px] min-w-[24px] flex items-center justify-center rounded"
            title="Start deep work session"
          >
            <Play size={14} className="text-[#5FE3B3]" />
          </button>
        ) : (
          <>
            <button
              onClick={handleStop}
              className="p-1 hover:bg-[#333] transition-colors min-h-[24px] min-w-[24px] flex items-center justify-center rounded"
              title="Stop session"
            >
              <Square size={14} className="text-[#FF6B6B]" />
            </button>
          </>
        )}
      </div>

      {/* Current Priority */}
      {currentSession?.priority && (
        <div className="hidden md:flex items-center gap-1 max-w-[200px]">
          <span className="text-xs text-terminal-accent/70 truncate">
            {currentSession.priority}
          </span>
        </div>
      )}
    </div>
  );
};