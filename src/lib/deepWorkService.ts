/**
 * Deep Work Service
 * Manages deep work sessions in Supabase
 */

import { supabase } from "./supabase";
import { userStorage } from "./userStorage";
import { formatLocalDate } from "./dateUtils";

// Constants
const MAX_SESSION_DURATION_SECONDS = 4 * 60 * 60; // 4 hours in seconds
const MAX_SESSION_DURATION_MS = MAX_SESSION_DURATION_SECONDS * 1000;

// Legacy activity type (kept for backward compatibility)
export type ActivityType = "work" | "personal";

// Activity Category Types (new system)
export interface ActivityCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
  is_default: boolean;
}

export interface ActivityCategoriesConfig {
  categories: ActivityCategory[];
  default_category_id: string;
}

// Timeline Block Types
export interface TimelineBlock {
  timeLabel: string;
  startTime: string;
  endTime: string;
  hour: number;
  quarter: number; // 0-3 for 15-min increments
  categoryId: string | null;
  categoryName: string;
  categoryColor: string;
  coverage: number; // 0-1, how much of block is covered
  sessionIds: string[];
}

export interface DeepWorkSession {
  id: string;
  user_id: string;
  task_name: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  is_active: boolean;
  auto_stopped: boolean;
  activity_type: ActivityType;
  activity_label: string | null;
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
  async startSession(
    taskName: string,
    activityType: ActivityType = "work",
    activityLabel?: string,
  ): Promise<DeepWorkSession | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.error("No authenticated user");
      return null;
    }

    // Check for existing active session
    const activeSession = await this.getActiveSession();
    if (activeSession) {
      console.warn("Active session already exists");
      return activeSession;
    }

    const { data, error } = await supabase
      .from("deep_work_sessions")
      .insert({
        user_id: user.id,
        task_name: taskName.trim(),
        start_time: new Date().toISOString(),
        is_active: true,
        auto_stopped: false,
        activity_type: activityType,
        activity_label: activityLabel?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error starting session:", error);
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
      console.warn("No session to stop");
      return null;
    }

    const endTime = new Date().toISOString();
    const startTime = new Date(session.start_time);
    const durationSeconds = Math.floor(
      (new Date(endTime).getTime() - startTime.getTime()) / 1000,
    );

    const { data, error } = await supabase
      .from("deep_work_sessions")
      .update({
        end_time: endTime,
        duration_seconds: durationSeconds,
        is_active: false,
      })
      .eq("id", session.id)
      .select()
      .single();

    if (error) {
      console.error("Error stopping session:", error);
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
      .from("deep_work_sessions")
      .update({
        end_time: new Date().toISOString(),
        duration_seconds: MAX_SESSION_DURATION_SECONDS,
        is_active: false,
        auto_stopped: true,
      })
      .eq("id", sessionId)
      .select()
      .single();

    if (error) {
      console.error("Error auto-stopping session:", error);
      return null;
    }

    return data;
  }

  /**
   * Get session by ID
   */
  async getSessionById(sessionId: string): Promise<DeepWorkSession | null> {
    const { data, error } = await supabase
      .from("deep_work_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (error) {
      console.error("Error fetching session:", error);
      return null;
    }

    return data;
  }

  /**
   * Get current active session for the user
   */
  async getActiveSession(): Promise<DeepWorkSession | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("deep_work_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("start_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching active session:", error);
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await supabase
      .from("deep_work_sessions")
      .select("*")
      .eq("user_id", user.id)
      .gte("start_time", today.toISOString())
      .lt("start_time", tomorrow.toISOString())
      .order("start_time", { ascending: false });

    if (error) {
      console.error("Error fetching today sessions:", error);
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    // Get start of week (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust for Monday start
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - diff);
    weekStart.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("deep_work_sessions")
      .select("*")
      .eq("user_id", user.id)
      .gte("start_time", weekStart.toISOString())
      .order("start_time", { ascending: false });

    if (error) {
      console.error("Error fetching week sessions:", error);
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("deep_work_sessions")
      .select("task_name")
      .eq("user_id", user.id)
      .order("start_time", { ascending: false })
      .limit(50); // Fetch more to get unique values

    if (error) {
      console.error("Error fetching recent tasks:", error);
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

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        date: formatLocalDate(dayStart),
        totalSeconds: 0,
        totalHours: 0,
        sessions: [],
      };
    }

    const { data, error } = await supabase
      .from("deep_work_sessions")
      .select("*")
      .eq("user_id", user.id)
      .gte("start_time", dayStart.toISOString())
      .lt("start_time", dayEnd.toISOString())
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error fetching daily summary:", error);
      return {
        date: formatLocalDate(dayStart),
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
      date: formatLocalDate(dayStart),
      totalSeconds,
      totalHours: totalSeconds / 3600,
      sessions,
    };
  }

  /**
   * Get weekly summary with target comparison
   */
  async getWeeklySummary(
    weeklyTargetHours: number = 40,
  ): Promise<WeeklyDeepWorkSummary> {
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
      const dateKey = formatLocalDate(new Date(session.start_time));
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
    const dailyTargetHours =
      daysRemaining > 0 ? remainingHours / daysRemaining : 0;

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
        window.dispatchEvent(
          new CustomEvent("deepWorkAutoStopped", {
            detail: { sessionId },
          }),
        );
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
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }

  /**
   * Get daily schedule with work/personal breakdown for timeline view
   */
  async getDailySchedule(date?: Date): Promise<{
    date: string;
    workHours: number;
    personalHours: number;
    totalHours: number;
    sessions: Array<{
      id: string;
      taskName: string;
      startTime: string;
      endTime: string | null;
      duration: number;
      durationFormatted: string;
      activityType: ActivityType;
      activityLabel: string | null;
      isActive: boolean;
    }>;
  }> {
    const targetDate = date || new Date();
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        date: formatLocalDate(dayStart),
        workHours: 0,
        personalHours: 0,
        totalHours: 0,
        sessions: [],
      };
    }

    const { data, error } = await supabase
      .from("deep_work_sessions")
      .select("*")
      .eq("user_id", user.id)
      .gte("start_time", dayStart.toISOString())
      .lt("start_time", dayEnd.toISOString())
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error fetching daily schedule:", error);
      return {
        date: formatLocalDate(dayStart),
        workHours: 0,
        personalHours: 0,
        totalHours: 0,
        sessions: [],
      };
    }

    const sessions = data || [];
    const now = Date.now();
    let workSeconds = 0;
    let personalSeconds = 0;

    const formattedSessions = sessions.map((session) => {
      let duration = session.duration_seconds || 0;
      if (session.is_active && !duration) {
        const startTime = new Date(session.start_time).getTime();
        duration = Math.floor((now - startTime) / 1000);
      }

      if (session.activity_type === "work") {
        workSeconds += duration;
      } else {
        personalSeconds += duration;
      }

      return {
        id: session.id,
        taskName: session.task_name,
        startTime: session.start_time,
        endTime: session.end_time,
        duration,
        durationFormatted: this.formatDuration(duration),
        activityType: session.activity_type as ActivityType,
        activityLabel: session.activity_label,
        isActive: session.is_active,
      };
    });

    return {
      date: formatLocalDate(dayStart),
      workHours: workSeconds / 3600,
      personalHours: personalSeconds / 3600,
      totalHours: (workSeconds + personalSeconds) / 3600,
      sessions: formattedSessions,
    };
  }

  /**
   * Get recent unique activity labels for autocomplete
   */
  async getRecentActivityLabels(limit: number = 10): Promise<string[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("deep_work_sessions")
      .select("activity_label")
      .eq("user_id", user.id)
      .not("activity_label", "is", null)
      .order("start_time", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching recent activity labels:", error);
      return [];
    }

    // Get unique labels, maintaining recency order
    const seen = new Set<string>();
    const uniqueLabels: string[] = [];

    for (const row of data || []) {
      if (row.activity_label && !seen.has(row.activity_label)) {
        seen.add(row.activity_label);
        uniqueLabels.push(row.activity_label);
        if (uniqueLabels.length >= limit) break;
      }
    }

    return uniqueLabels;
  }

  // ============================================================
  // CATEGORY MANAGEMENT METHODS
  // ============================================================

  /**
   * Get user's activity categories from user_configs
   */
  async getActivityCategories(): Promise<ActivityCategoriesConfig> {
    const defaultConfig: ActivityCategoriesConfig = {
      categories: [
        {
          id: "cat_work",
          name: "Work",
          color: "#5FE3B3",
          icon: "briefcase",
          sort_order: 1,
          is_default: true,
        },
        {
          id: "cat_personal",
          name: "Personal",
          color: "#A855F7",
          icon: "heart",
          sort_order: 2,
          is_default: true,
        },
      ],
      default_category_id: "cat_work",
    };

    try {
      const config = await userStorage.getUserConfig(
        "activity_categories",
        defaultConfig,
      );
      return config as ActivityCategoriesConfig;
    } catch (error) {
      console.error("Error getting activity categories:", error);
      return defaultConfig;
    }
  }

  /**
   * Save activity categories to user_configs
   */
  async saveActivityCategories(
    config: ActivityCategoriesConfig,
  ): Promise<boolean> {
    try {
      await userStorage.setUserConfig("activity_categories", config);
      return true;
    } catch (error) {
      console.error("Error saving activity categories:", error);
      return false;
    }
  }

  /**
   * Add a new activity category
   */
  async addActivityCategory(
    category: Omit<ActivityCategory, "id">,
  ): Promise<ActivityCategory | null> {
    const config = await this.getActivityCategories();
    const newCategory: ActivityCategory = {
      ...category,
      id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    config.categories.push(newCategory);
    config.categories.sort((a, b) => a.sort_order - b.sort_order);

    const saved = await this.saveActivityCategories(config);
    return saved ? newCategory : null;
  }

  /**
   * Update an existing activity category
   */
  async updateActivityCategory(
    id: string,
    updates: Partial<Omit<ActivityCategory, "id">>,
  ): Promise<boolean> {
    const config = await this.getActivityCategories();
    const index = config.categories.findIndex((c) => c.id === id);

    if (index === -1) return false;

    config.categories[index] = { ...config.categories[index], ...updates };

    // Update default if changed
    if (updates.is_default && config.default_category_id !== id) {
      config.default_category_id = id;
    }

    return await this.saveActivityCategories(config);
  }

  /**
   * Delete an activity category (if not in use)
   */
  async deleteActivityCategory(id: string): Promise<boolean> {
    const config = await this.getActivityCategories();

    // Don't allow deleting if it's the default category
    if (config.default_category_id === id) {
      console.warn("Cannot delete default category");
      return false;
    }

    // Check if category is in use
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("deep_work_sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("activity_type", id)
        .limit(1);

      if (data && data.length > 0) {
        console.warn("Cannot delete category that is in use");
        return false;
      }
    }

    config.categories = config.categories.filter((c) => c.id !== id);

    // If default was deleted, set to first available
    if (!config.categories.find((c) => c.id === config.default_category_id)) {
      config.default_category_id = config.categories[0]?.id || "cat_work";
    }

    return await this.saveActivityCategories(config);
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: string): Promise<ActivityCategory | null> {
    const config = await this.getActivityCategories();
    return config.categories.find((c) => c.id === id) || null;
  }

  // ============================================================
  // MANUAL SESSION ENTRY METHODS
  // ============================================================

  /**
   * Add a manual session for a past time period
   */
  async addManualSession(params: {
    taskName: string;
    categoryId: string;
    activityLabel?: string;
    startTime: Date;
    endTime: Date;
  }): Promise<DeepWorkSession | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.error("No authenticated user");
      return null;
    }

    // Validate times
    if (params.endTime <= params.startTime) {
      console.error("End time must be after start time");
      return null;
    }

    const durationSeconds = Math.floor(
      (params.endTime.getTime() - params.startTime.getTime()) / 1000,
    );

    const { data, error } = await supabase
      .from("deep_work_sessions")
      .insert({
        user_id: user.id,
        task_name: params.taskName.trim(),
        start_time: params.startTime.toISOString(),
        end_time: params.endTime.toISOString(),
        duration_seconds: durationSeconds,
        is_active: false,
        auto_stopped: false,
        activity_type: params.categoryId,
        activity_label: params.activityLabel?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding manual session:", error);
      return null;
    }

    return data;
  }

  /**
   * Update an existing session's times
   */
  async updateSessionTimes(
    sessionId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<DeepWorkSession | null> {
    // Validate times
    if (endTime <= startTime) {
      console.error("End time must be after start time");
      return null;
    }

    const durationSeconds = Math.floor(
      (endTime.getTime() - startTime.getTime()) / 1000,
    );

    const { data, error } = await supabase
      .from("deep_work_sessions")
      .update({
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_seconds: durationSeconds,
      })
      .eq("id", sessionId)
      .select()
      .single();

    if (error) {
      console.error("Error updating session times:", error);
      return null;
    }

    return data;
  }

  /**
   * Update all session properties (task name, category, times, notes)
   */
  async updateSession(
    sessionId: string,
    updates: {
      taskName?: string;
      categoryId?: string;
      startTime?: Date;
      endTime?: Date;
      notes?: string;
    },
  ): Promise<DeepWorkSession | null> {
    const updateData: any = {};

    if (updates.taskName !== undefined) updateData.task_name = updates.taskName;
    if (updates.categoryId !== undefined)
      updateData.activity_type = updates.categoryId;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    if (updates.startTime && updates.endTime) {
      if (updates.endTime <= updates.startTime) {
        console.error("End time must be after start time");
        return null;
      }
      updateData.start_time = updates.startTime.toISOString();
      updateData.end_time = updates.endTime.toISOString();
      updateData.duration_seconds = Math.floor(
        (updates.endTime.getTime() - updates.startTime.getTime()) / 1000,
      );
    }

    const { data, error } = await supabase
      .from("deep_work_sessions")
      .update(updateData)
      .eq("id", sessionId)
      .select()
      .single();

    if (error) {
      console.error("Error updating session:", error);
      return null;
    }

    return data;
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const { error } = await supabase
      .from("deep_work_sessions")
      .delete()
      .eq("id", sessionId);

    if (error) {
      console.error("Error deleting session:", error);
      return false;
    }

    return true;
  }

  // ============================================================
  // TIMELINE VISUALIZATION METHODS
  // ============================================================

  /**
   * Get 15-minute block coverage for a date
   * Returns 96 blocks (24 hours × 4 blocks per hour)
   */
  async getTimelineBlocks(date: Date): Promise<{
    date: string;
    blocks: TimelineBlock[];
  }> {
    const config = await this.getActivityCategories();
    const categoryMap = new Map(config.categories.map((c) => [c.id, c]));

    // Get sessions for the date
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { date: formatLocalDate(dayStart), blocks: [] };
    }

    const { data: sessions } = await supabase
      .from("deep_work_sessions")
      .select("*")
      .eq("user_id", user.id)
      .gte("start_time", dayStart.toISOString())
      .lt("start_time", dayEnd.toISOString())
      .order("start_time", { ascending: true });

    const sessionList = sessions || [];

    // Initialize all 96 blocks
    const blocks: TimelineBlock[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let quarter = 0; quarter < 4; quarter++) {
        const blockStart = new Date(dayStart);
        blockStart.setHours(hour, quarter * 15, 0, 0);
        const blockEnd = new Date(blockStart);
        blockEnd.setMinutes(blockStart.getMinutes() + 15);

        blocks.push({
          timeLabel: blockStart.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          }),
          startTime: blockStart.toISOString(),
          endTime: blockEnd.toISOString(),
          hour,
          quarter,
          categoryId: null,
          categoryName: "",
          categoryColor: "#374151", // gray-700 for empty blocks
          coverage: 0,
          sessionIds: [],
        });
      }
    }

    // Calculate coverage for each block
    for (const session of sessionList) {
      const sessionStart = new Date(session.start_time);
      const sessionEnd = session.end_time
        ? new Date(session.end_time)
        : new Date();

      const category = categoryMap.get(session.activity_type) || {
        id: "uncategorized",
        name: "Uncategorized",
        color: "#6B7280",
        icon: "circle",
        sort_order: 999,
        is_default: false,
      };

      // Find all blocks this session touches
      for (const block of blocks) {
        const blockStart = new Date(block.startTime);
        const blockEnd = new Date(block.endTime);

        // Calculate overlap
        const overlapStart = new Date(
          Math.max(sessionStart.getTime(), blockStart.getTime()),
        );
        const overlapEnd = new Date(
          Math.min(sessionEnd.getTime(), blockEnd.getTime()),
        );

        if (overlapStart < overlapEnd) {
          const overlapMinutes =
            (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60);
          const coverage = overlapMinutes / 15; // 15-min block

          block.coverage = Math.min(1, block.coverage + coverage);
          block.categoryId = category.id;
          block.categoryName = category.name;
          block.categoryColor = category.color;
          block.sessionIds.push(session.id);
        }
      }
    }

    return {
      date: formatLocalDate(dayStart),
      blocks,
    };
  }
}

// Export singleton instance
export const deepWorkService = new DeepWorkService();
export default deepWorkService;
