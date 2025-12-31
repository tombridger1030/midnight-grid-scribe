/**
 * Deep Work Service
 * Manages deep work sessions in Supabase
 */

import { supabase } from './supabase';

// Constants
const MAX_SESSION_DURATION_SECONDS = 4 * 60 * 60; // 4 hours in seconds
const MAX_SESSION_DURATION_MS = MAX_SESSION_DURATION_SECONDS * 1000;

export interface DeepWorkSession {
  id: string;
  user_id: string;
  task_name: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  is_active: boolean;
  auto_stopped: boolean;
  created_at: string;
  updated_at: string;
}

export interface DailyDeepWorkSummary {
  date: string;
  totalSeconds: number;
  totalHours: number;
  sessions: DeepWorkSession[];
}

export interface WeeklyDeepWorkSummary {
  weekStart: string;
  weekEnd: string;
  totalSeconds: number;
  totalHours: number;
  dailySummaries: DailyDeepWorkSummary[];
  targetHours: number;
  remainingHours: number;
  dailyTargetHours: number;
  onTrack: boolean;
}

class DeepWorkService {
  /**
   * Start a new deep work session
   */
  async startSession(taskName: string): Promise<DeepWorkSession | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user');
      return null;
    }

    // Check for existing active session
    const activeSession = await this.getActiveSession();
    if (activeSession) {
      console.warn('Active session already exists');
      return activeSession;
    }

    const { data, error } = await supabase
      .from('deep_work_sessions')
      .insert({
        user_id: user.id,
        task_name: taskName.trim(),
        start_time: new Date().toISOString(),
        is_active: true,
        auto_stopped: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error starting session:', error);
      return null;
    }

    // Schedule auto-stop after 4 hours
    this.scheduleAutoStop(data.id, MAX_SESSION_DURATION_MS);

    return data;
  }

  /**
   * Stop an active session
   */
  async stopSession(sessionId?: string): Promise<DeepWorkSession | null> {
    const session = sessionId 
      ? await this.getSessionById(sessionId)
      : await this.getActiveSession();

    if (!session) {
      console.warn('No session to stop');
      return null;
    }

    const endTime = new Date().toISOString();
    const startTime = new Date(session.start_time);
    const durationSeconds = Math.floor((new Date(endTime).getTime() - startTime.getTime()) / 1000);

    const { data, error } = await supabase
      .from('deep_work_sessions')
      .update({
        end_time: endTime,
        duration_seconds: durationSeconds,
        is_active: false,
      })
      .eq('id', session.id)
      .select()
      .single();

    if (error) {
      console.error('Error stopping session:', error);
      return null;
    }

    return data;
  }

  /**
   * Auto-stop session after max duration (4 hours)
   */
  async autoStopSession(sessionId: string): Promise<DeepWorkSession | null> {
    const session = await this.getSessionById(sessionId);
    
    if (!session || !session.is_active) {
      return null;
    }

    const { data, error } = await supabase
      .from('deep_work_sessions')
      .update({
        end_time: new Date().toISOString(),
        duration_seconds: MAX_SESSION_DURATION_SECONDS,
        is_active: false,
        auto_stopped: true,
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Error auto-stopping session:', error);
      return null;
    }

    return data;
  }

  /**
   * Get session by ID
   */
  async getSessionById(sessionId: string): Promise<DeepWorkSession | null> {
    const { data, error } = await supabase
      .from('deep_work_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      console.error('Error fetching session:', error);
      return null;
    }

    return data;
  }

  /**
   * Get current active session for the user
   */
  async getActiveSession(): Promise<DeepWorkSession | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('deep_work_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching active session:', error);
      return null;
    }

    // Check if session should be auto-stopped (started more than 4 hours ago)
    if (data) {
      const startTime = new Date(data.start_time).getTime();
      const now = Date.now();
      if (now - startTime > MAX_SESSION_DURATION_MS) {
        // Auto-stop the session
        return await this.autoStopSession(data.id);
      }
    }

    return data;
  }

  /**
   * Get today's sessions
   */
  async getTodaySessions(): Promise<DeepWorkSession[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await supabase
      .from('deep_work_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gte('start_time', today.toISOString())
      .lt('start_time', tomorrow.toISOString())
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Error fetching today sessions:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get today's total deep work in seconds
   */
  async getTodayTotalSeconds(): Promise<number> {
    const sessions = await this.getTodaySessions();
    
    let total = 0;
    const now = Date.now();

    for (const session of sessions) {
      if (session.duration_seconds) {
        total += session.duration_seconds;
      } else if (session.is_active) {
        // Calculate elapsed time for active session
        const startTime = new Date(session.start_time).getTime();
        const elapsed = Math.floor((now - startTime) / 1000);
        total += Math.min(elapsed, MAX_SESSION_DURATION_SECONDS);
      }
    }

    return total;
  }

  /**
   * Get this week's sessions
   */
  async getWeekSessions(): Promise<DeepWorkSession[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get start of week (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust for Monday start
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - diff);
    weekStart.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('deep_work_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gte('start_time', weekStart.toISOString())
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Error fetching week sessions:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get this week's total deep work in seconds
   */
  async getWeekTotalSeconds(): Promise<number> {
    const sessions = await this.getWeekSessions();
    
    let total = 0;
    const now = Date.now();

    for (const session of sessions) {
      if (session.duration_seconds) {
        total += session.duration_seconds;
      } else if (session.is_active) {
        const startTime = new Date(session.start_time).getTime();
        const elapsed = Math.floor((now - startTime) / 1000);
        total += Math.min(elapsed, MAX_SESSION_DURATION_SECONDS);
      }
    }

    return total;
  }

  /**
   * Get recent unique task names for quick selection
   */
  async getRecentTasks(limit: number = 5): Promise<string[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('deep_work_sessions')
      .select('task_name')
      .eq('user_id', user.id)
      .order('start_time', { ascending: false })
      .limit(50); // Fetch more to get unique values

    if (error) {
      console.error('Error fetching recent tasks:', error);
      return [];
    }

    // Get unique task names, maintaining recency order
    const seen = new Set<string>();
    const uniqueTasks: string[] = [];

    for (const row of data || []) {
      if (!seen.has(row.task_name)) {
        seen.add(row.task_name);
        uniqueTasks.push(row.task_name);
        if (uniqueTasks.length >= limit) break;
      }
    }

    return uniqueTasks;
  }

  /**
   * Get daily summary
   */
  async getDailySummary(date?: Date): Promise<DailyDeepWorkSummary> {
    const targetDate = date || new Date();
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        date: dayStart.toISOString().split('T')[0],
        totalSeconds: 0,
        totalHours: 0,
        sessions: [],
      };
    }

    const { data, error } = await supabase
      .from('deep_work_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gte('start_time', dayStart.toISOString())
      .lt('start_time', dayEnd.toISOString())
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching daily summary:', error);
      return {
        date: dayStart.toISOString().split('T')[0],
        totalSeconds: 0,
        totalHours: 0,
        sessions: [],
      };
    }

    const sessions = data || [];
    let totalSeconds = 0;
    const now = Date.now();

    for (const session of sessions) {
      if (session.duration_seconds) {
        totalSeconds += session.duration_seconds;
      } else if (session.is_active) {
        const startTime = new Date(session.start_time).getTime();
        const elapsed = Math.floor((now - startTime) / 1000);
        totalSeconds += Math.min(elapsed, MAX_SESSION_DURATION_SECONDS);
      }
    }

    return {
      date: dayStart.toISOString().split('T')[0],
      totalSeconds,
      totalHours: totalSeconds / 3600,
      sessions,
    };
  }

  /**
   * Get weekly summary with target comparison
   */
  async getWeeklySummary(weeklyTargetHours: number = 40): Promise<WeeklyDeepWorkSummary> {
    const sessions = await this.getWeekSessions();
    
    // Calculate week boundaries
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - diff);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Group sessions by day
    const dailyMap = new Map<string, DeepWorkSession[]>();
    for (const session of sessions) {
      const dateKey = new Date(session.start_time).toISOString().split('T')[0];
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, []);
      }
      dailyMap.get(dateKey)!.push(session);
    }

    // Calculate daily summaries
    const dailySummaries: DailyDeepWorkSummary[] = [];
    let totalSeconds = 0;
    const currentTime = Date.now();

    for (const [dateStr, daySessions] of dailyMap) {
      let dayTotal = 0;
      for (const session of daySessions) {
        if (session.duration_seconds) {
          dayTotal += session.duration_seconds;
        } else if (session.is_active) {
          const startTime = new Date(session.start_time).getTime();
          const elapsed = Math.floor((currentTime - startTime) / 1000);
          dayTotal += Math.min(elapsed, MAX_SESSION_DURATION_SECONDS);
        }
      }
      totalSeconds += dayTotal;
      dailySummaries.push({
        date: dateStr,
        totalSeconds: dayTotal,
        totalHours: dayTotal / 3600,
        sessions: daySessions,
      });
    }

    // Calculate remaining time needed
    const totalHours = totalSeconds / 3600;
    const remainingHours = Math.max(0, weeklyTargetHours - totalHours);
    
    // Days remaining in week
    const today = now.getDay();
    const daysRemaining = today === 0 ? 1 : 7 - today + 1; // Include today
    const dailyTargetHours = daysRemaining > 0 ? remainingHours / daysRemaining : 0;

    // Are we on track? (have we done enough for days elapsed?)
    const daysElapsed = diff + 1;
    const expectedHours = (weeklyTargetHours / 7) * daysElapsed;
    const onTrack = totalHours >= expectedHours * 0.9; // 90% threshold

    return {
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      totalSeconds,
      totalHours,
      dailySummaries,
      targetHours: weeklyTargetHours,
      remainingHours,
      dailyTargetHours,
      onTrack,
    };
  }

  /**
   * Schedule auto-stop for a session
   * Note: This only works while the app is open. 
   * The getActiveSession method also checks and auto-stops stale sessions.
   */
  private scheduleAutoStop(sessionId: string, delayMs: number): void {
    setTimeout(async () => {
      const session = await this.getSessionById(sessionId);
      if (session?.is_active) {
        await this.autoStopSession(sessionId);
        // Dispatch event for UI to update
        window.dispatchEvent(new CustomEvent('deepWorkAutoStopped', { 
          detail: { sessionId } 
        }));
      }
    }, delayMs);
  }

  /**
   * Format seconds as "Xh Ym" or "Xm"
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Format seconds as "H:MM:SS"
   */
  formatTimer(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

// Export singleton instance
export const deepWorkService = new DeepWorkService();
export default deepWorkService;
