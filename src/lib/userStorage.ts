import { supabase } from "./supabase";

// User-aware storage abstraction
export class UserStorage {
  private userId: string | null = null;

  setUserId(userId: string | null) {
    this.userId = userId;
  }

  getCurrentUserId(): string | null {
    return this.userId;
  }

  // User configurations
  async getUserConfig(key: string, defaultValue: any = null) {
    // Always check localStorage first for immediate reads (it's always kept in sync)
    const localValue = this.getLocalStorage(key, null);

    if (!this.userId) {
      return localValue !== null ? localValue : defaultValue;
    }

    // If we have a local value, return it (it's the source of truth for immediate reads)
    if (localValue !== null) {
      return localValue;
    }

    // Otherwise try Supabase
    try {
      const { data, error } = await supabase
        .from("user_configs")
        .select("config_value")
        .eq("user_id", this.userId)
        .eq("config_key", key)
        .maybeSingle();

      if (error) {
        return defaultValue;
      }

      if (
        !data ||
        typeof data.config_value === "undefined" ||
        data.config_value === null
      ) {
        return defaultValue;
      }

      // Sync to localStorage for future reads
      this.setLocalStorage(key, data.config_value);
      return data.config_value;
    } catch (error) {
      console.error("Error getting user config from Supabase:", error);
      return defaultValue;
    }
  }

  async setUserConfig(key: string, value: any) {
    // Always save to localStorage first for immediate persistence
    this.setLocalStorage(key, value);

    if (!this.userId) {
      return;
    }

    try {
      const { error } = await supabase.from("user_configs").upsert(
        {
          user_id: this.userId,
          config_key: key,
          config_value: value,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,config_key",
        },
      );

      if (error) {
        console.error(
          "Error setting user config to Supabase (localStorage already saved):",
          error,
        );
      }
    } catch (error) {
      console.error(
        "Error setting user config to Supabase (localStorage already saved):",
        error,
      );
    }
  }

  // User KPIs
  async getUserKPIs() {
    if (!this.userId) {
      console.log("[UserStorage] getUserKPIs: No user ID set");
      return [];
    }

    try {
      console.log("[UserStorage] Fetching KPIs for user:", this.userId);
      const { data, error } = await supabase
        .from("user_kpis")
        .select("*")
        .eq("user_id", this.userId)
        // Removed .eq('is_active', true) filter - return all KPIs so disabled ones can be shown and re-enabled
        .order("sort_order");

      if (error) {
        console.error("[UserStorage] Error getting user KPIs:", error);
        return [];
      }

      console.log("[UserStorage] Fetched KPIs:", data?.length, "records");
      return data || [];
    } catch (error) {
      console.error("[UserStorage] Error getting user KPIs:", error);
      return [];
    }
  }

  async setUserKPI(kpiData: any) {
    if (!this.userId) {
      console.error("[UserStorage] Cannot set KPI: No user ID");
      return null;
    }

    console.log("[UserStorage] Setting KPI:", { userId: this.userId, kpiData });

    try {
      const { data, error } = await supabase
        .from("user_kpis")
        .upsert(
          {
            user_id: this.userId,
            ...kpiData,
          },
          {
            onConflict: "user_id,kpi_id",
          },
        )
        .select()
        .single();

      console.log("[UserStorage] Set KPI result:", { data, error });

      if (error) {
        // Retry without weight if schema cache doesn't have it yet
        const msg = (error as any)?.message || "";
        const code = (error as any)?.code || "";
        if (code === "PGRST204" || String(msg).includes("'weight'")) {
          try {
            const { data: data2, error: error2 } = await supabase
              .from("user_kpis")
              .upsert({
                user_id: this.userId,
                ...Object.fromEntries(
                  Object.entries(kpiData).filter(([k]) => k !== "weight"),
                ),
              })
              .select()
              .single();
            // Persist weight to hybrid config as a temporary overlay
            if (
              typeof kpiData?.kpi_id === "string" &&
              typeof kpiData?.weight === "number"
            ) {
              const map = await this.getHybridData(
                "kpi_weights",
                {} as Record<string, number>,
              );
              map[kpiData.kpi_id] = kpiData.weight;
              await this.setHybridData("kpi_weights", map);
            }
            if (!error2) return data2;
          } catch {}
        }
        console.error("Error setting user KPI:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error setting user KPI:", error);
      return null;
    }
  }

  async updateUserKPI(kpiId: string, kpiData: any) {
    if (!this.userId) {
      console.error("[UserStorage] Cannot update KPI: No user ID");
      return null;
    }

    console.log("[UserStorage] Updating KPI:", {
      kpiId,
      userId: this.userId,
      kpiData,
    });

    try {
      // Use kpi_id (string) instead of id (UUID) for the query
      const { data, error } = await supabase
        .from("user_kpis")
        .update(kpiData)
        .eq("kpi_id", kpiId)
        .eq("user_id", this.userId)
        .select()
        .single();

      console.log("[UserStorage] Update KPI result:", { data, error });

      if (error) {
        // If weight is not yet visible to PostgREST schema cache, retry without weight field
        const msg = (error as any)?.message || "";
        const code = (error as any)?.code || "";
        if (code === "PGRST204" || String(msg).includes("'weight'")) {
          try {
            const filtered = Object.fromEntries(
              Object.entries(kpiData).filter(([k]) => k !== "weight"),
            );
            const { data: data2, error: error2 } = await supabase
              .from("user_kpis")
              .update(filtered)
              .eq("kpi_id", kpiId)
              .eq("user_id", this.userId)
              .select()
              .single();
            // Persist weight to hybrid config as a temporary overlay
            if (typeof kpiData?.weight === "number") {
              // kpiId is already the kpi_id string, use it directly
              const map = await this.getHybridData(
                "kpi_weights",
                {} as Record<string, number>,
              );
              map[kpiId] = kpiData.weight;
              await this.setHybridData("kpi_weights", map);
            }
            if (!error2) return data2;
          } catch {}
        }
        try {
          console.error("Error updating user KPI:", JSON.stringify(error));
        } catch {
          console.error("Error updating user KPI:", error);
        }
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error updating user KPI:", error);
      return null;
    }
  }

  async deleteUserKPI(kpiId: string) {
    if (!this.userId) {
      console.error("Cannot delete KPI: No user ID set");
      throw new Error("Cannot delete KPI: Not authenticated");
    }

    console.log("userStorage.deleteUserKPI called with:", {
      kpiId,
      userId: this.userId,
    });

    try {
      // Use kpi_id (string) instead of id (UUID) for the query
      const { data, error, count } = await supabase
        .from("user_kpis")
        .delete()
        .eq("kpi_id", kpiId)
        .eq("user_id", this.userId)
        .select();

      console.log("Delete response:", { data, error, count });

      if (error) {
        console.error("Error deleting user KPI:", error);
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.warn("No rows deleted - KPI may not exist or user mismatch");
      }

      return true;
    } catch (error) {
      console.error("Error deleting user KPI:", error);
      throw error;
    }
  }

  // User goals
  async getUserGoals() {
    if (!this.userId) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from("user_goals")
        .select("*")
        .eq("user_id", this.userId)
        .eq("is_active", true);

      if (error) {
        console.error("Error getting user goals:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error getting user goals:", error);
      return [];
    }
  }

  async setUserGoal(goalData: any) {
    if (!this.userId) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("user_goals")
        .upsert({
          user_id: this.userId,
          ...goalData,
        })
        .select()
        .single();

      if (error) {
        console.error("Error setting user goal:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error setting user goal:", error);
      return null;
    }
  }

  // Weekly KPIs with user context
  async getUserWeeklyKPIs() {
    if (!this.userId) {
      return { records: [] };
    }

    try {
      const { data, error } = await supabase
        .from("weekly_kpis")
        .select("*")
        .eq("user_id", this.userId)
        .order("week_key", { ascending: false });

      if (error) {
        console.error("Error getting user weekly KPIs:", error);
        return { records: [] };
      }

      return { records: data || [] };
    } catch (error) {
      console.error("Error getting user weekly KPIs:", error);
      return { records: [] };
    }
  }

  async setUserWeeklyKPIs(weeklyKPIData: any) {
    if (!this.userId) {
      return;
    }

    try {
      // Update each record with user_id
      const recordsWithUserId = weeklyKPIData.records.map((record: any) => ({
        ...record,
        user_id: this.userId,
      }));

      for (const record of recordsWithUserId) {
        const { error } = await supabase.from("weekly_kpis").upsert(record);

        if (error) {
          console.error("Error setting user weekly KPI record:", error);
        }
      }
    } catch (error) {
      console.error("Error setting user weekly KPIs:", error);
    }
  }

  // Weekly KPI target overrides (per-week targets)
  async getWeeklyTargetOverrides(weekKey: string) {
    if (!this.userId) {
      return [] as Array<{
        kpi_id: string;
        target_value: number;
        min_target_value: number | null;
        name_override: string | null;
      }>;
    }

    try {
      const { data, error } = await supabase
        .from("weekly_kpi_targets")
        .select("kpi_id,target_value,min_target_value,name_override")
        .eq("user_id", this.userId)
        .eq("week_key", weekKey);

      if (error) {
        console.error("Error getting weekly target overrides:", error);
        return [];
      }

      return (data || []) as Array<{
        kpi_id: string;
        target_value: number;
        min_target_value: number | null;
        name_override: string | null;
      }>;
    } catch (error) {
      console.error("Error getting weekly target overrides:", error);
      return [];
    }
  }

  async setWeeklyTargetOverride(
    weekKey: string,
    kpiId: string,
    targetValue: number,
    minTargetValue?: number | null,
    nameOverride?: string | null,
  ) {
    if (!this.userId) {
      return null;
    }

    try {
      const payload: any = {
        user_id: this.userId,
        week_key: weekKey,
        kpi_id: kpiId,
        target_value: targetValue,
        min_target_value:
          typeof minTargetValue === "number" ? minTargetValue : null,
        updated_at: new Date().toISOString(),
      };
      if (typeof nameOverride !== "undefined") {
        payload.name_override = nameOverride;
      }

      const { data, error } = await supabase
        .from("weekly_kpi_targets")
        .upsert(payload, {
          onConflict: "user_id,week_key,kpi_id",
        })
        .select()
        .maybeSingle();

      if (error) {
        console.error("Error setting weekly target override:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error setting weekly target override:", error);
      return null;
    }
  }

  async clearWeeklyNameOverride(weekKey: string, kpiId: string) {
    if (!this.userId) return false;
    try {
      const { error } = await supabase
        .from("weekly_kpi_targets")
        .update({ name_override: null, updated_at: new Date().toISOString() })
        .eq("user_id", this.userId)
        .eq("week_key", weekKey)
        .eq("kpi_id", kpiId);
      if (error) {
        console.error("Error clearing weekly name override:", error);
        return false;
      }
      return true;
    } catch (e) {
      console.error("Error clearing weekly name override:", e);
      return false;
    }
  }

  async deleteWeeklyTargetOverride(weekKey: string, kpiId: string) {
    if (!this.userId) {
      return false;
    }

    try {
      const { error } = await supabase
        .from("weekly_kpi_targets")
        .delete()
        .eq("user_id", this.userId)
        .eq("week_key", weekKey)
        .eq("kpi_id", kpiId);

      if (error) {
        console.error("Error deleting weekly target override:", error);
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error deleting weekly target override:", error);
      return false;
    }
  }

  // Ships and events with user context
  async getUserShips() {
    if (!this.userId) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from("ships")
        .select("*")
        .eq("user_id", this.userId)
        .order("timestamp", { ascending: false });

      if (error) {
        console.error("Error getting user ships:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error getting user ships:", error);
      return [];
    }
  }

  async addUserShip(shipData: any) {
    if (!this.userId) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("ships")
        .insert({
          user_id: this.userId,
          ...shipData,
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding user ship:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error adding user ship:", error);
      return null;
    }
  }

  // Content data with user context
  async getUserContent() {
    if (!this.userId) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from("content_data")
        .select("*")
        .eq("user_id", this.userId)
        .order("date", { ascending: false });

      if (error) {
        console.error("Error getting user content:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error getting user content:", error);
      return [];
    }
  }

  async addUserContent(contentData: any) {
    if (!this.userId) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("content_data")
        .insert({
          user_id: this.userId,
          ...contentData,
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding user content:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error adding user content:", error);
      return null;
    }
  }

  // Metrics with user context
  async getUserMetrics() {
    if (!this.userId) {
      return { metrics: [], dates: [] };
    }

    try {
      const { data, error } = await supabase
        .from("metrics")
        .select("*")
        .eq("user_id", this.userId)
        .order("date", { ascending: true });

      if (error) {
        console.error("Error getting user metrics:", error);
        return { metrics: [], dates: [] };
      }

      // Convert to the expected format
      const metrics: any[] = [];
      const dates: string[] = [];

      // Process the data to match the expected TrackerData format
      // This will need to be adapted based on your metrics table structure
      data?.forEach((record) => {
        if (!dates.includes(record.date)) {
          dates.push(record.date);
        }
        // Process metrics based on your specific structure
      });

      return { metrics, dates };
    } catch (error) {
      console.error("Error getting user metrics:", error);
      return { metrics: [], dates: [] };
    }
  }

  // Fallback to localStorage for offline functionality
  getLocalStorage(key: string, defaultValue: any = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error("Error reading from localStorage:", error);
      return defaultValue;
    }
  }

  setLocalStorage(key: string, value: any) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("Error writing to localStorage:", error);
    }
  }

  // Hybrid storage: try Supabase first, fallback to localStorage
  async getHybridData(key: string, defaultValue: any = null) {
    if (this.userId) {
      // Try to get from Supabase first
      const supabaseData = await this.getUserConfig(key, null);
      if (supabaseData !== null) {
        return supabaseData;
      }
    }

    // Fallback to localStorage
    return this.getLocalStorage(key, defaultValue);
  }

  async setHybridData(key: string, value: any) {
    // Save to localStorage immediately
    this.setLocalStorage(key, value);

    // Also save to Supabase if user is authenticated
    if (this.userId) {
      await this.setUserConfig(key, value);
    }
  }

  // User ranking system methods
  async getUserRank() {
    if (!this.userId) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("user_ranks")
        .select("*")
        .eq("user_id", this.userId)
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error getting user rank:", error);
      return null;
    }
  }

  async setUserRank(rankData: any) {
    if (!this.userId) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("user_ranks")
        .upsert(
          {
            user_id: this.userId,
            ...rankData,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          },
        )
        .select()
        .single();

      if (error) {
        console.error("Error setting user rank:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error setting user rank:", error);
      return null;
    }
  }

  async saveRankChange(rankChange: any) {
    if (!this.userId) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("rank_history")
        .insert({
          user_id: this.userId,
          ...rankChange,
        })
        .select()
        .single();

      if (error) {
        console.error("Error saving rank change:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error saving rank change:", error);
      return null;
    }
  }

  async getRankHistory() {
    if (!this.userId) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from("rank_history")
        .select("*")
        .eq("user_id", this.userId)
        .order("timestamp", { ascending: false })
        .limit(50); // Get last 50 rank changes

      if (error) {
        console.error("Error getting rank history:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error getting rank history:", error);
      return [];
    }
  }

  async clearRankHistory() {
    if (!this.userId) {
      console.log("⚠️ No user ID available for clearing rank history");
      return;
    }

    try {
      console.log("🗑️ Clearing all rank history for user:", this.userId);

      const { data: existingRecords, error: selectError } = await supabase
        .from("rank_history")
        .select("id")
        .eq("user_id", this.userId);

      if (selectError) {
        console.error("Error checking existing rank history:", selectError);
        throw selectError;
      }

      console.log(
        `📊 Found ${existingRecords?.length || 0} existing rank history records to delete`,
      );

      const { error: deleteError } = await supabase
        .from("rank_history")
        .delete()
        .eq("user_id", this.userId);

      if (deleteError) {
        console.error("Error clearing rank history:", deleteError);
        throw deleteError;
      }

      // Verify deletion worked
      const { data: remainingRecords, error: verifyError } = await supabase
        .from("rank_history")
        .select("id")
        .eq("user_id", this.userId);

      if (verifyError) {
        console.warn("Could not verify rank history deletion:", verifyError);
      } else {
        console.log(
          `✅ Rank history cleared successfully. Remaining records: ${remainingRecords?.length || 0}`,
        );
      }
    } catch (error) {
      console.error("Error clearing rank history:", error);
      throw error;
    }
  }

  async getWeeklyAssessments(limit: number = 10) {
    if (!this.userId) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from("weekly_assessments")
        .select("*")
        .eq("user_id", this.userId)
        .order("week_key", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error getting weekly assessments:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error getting weekly assessments:", error);
      return [];
    }
  }

  async saveWeeklyAssessment(assessment: any) {
    if (!this.userId) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("weekly_assessments")
        .upsert(
          {
            user_id: this.userId,
            ...assessment,
          },
          {
            onConflict: "user_id,week_key",
          },
        )
        .select()
        .single();

      if (error) {
        console.error("Error saving weekly assessment:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error saving weekly assessment:", error);
      return null;
    }
  }

  // GitHub Integration Settings
  async getGithubSettings(): Promise<{
    api_token: string;
    username: string;
    repos: string;
  } | null> {
    try {
      const settings = await this.getUserConfig("github_settings", null);
      if (settings) {
        return settings;
      }

      // Fallback to localStorage for backward compatibility
      const api_token = localStorage.getItem("github_api_token") || "";
      const username = localStorage.getItem("github_username") || "";
      const repos = localStorage.getItem("github_repos") || "";

      return { api_token, username, repos };
    } catch (error) {
      console.error("Error getting GitHub settings:", error);
      // Fallback to localStorage
      const api_token = localStorage.getItem("github_api_token") || "";
      const username = localStorage.getItem("github_username") || "";
      const repos = localStorage.getItem("github_repos") || "";
      return { api_token, username, repos };
    }
  }

  async saveGithubSettings(
    api_token: string,
    username: string,
    repos: string,
  ): Promise<boolean> {
    try {
      const settings = { api_token, username, repos };

      // Save to Supabase user_configs
      await this.setUserConfig("github_settings", settings);

      // Also save to localStorage for immediate access and backward compatibility
      localStorage.setItem("github_api_token", api_token);
      localStorage.setItem("github_username", username);
      localStorage.setItem("github_repos", repos);

      return true;
    } catch (error) {
      console.error("Error saving GitHub settings:", error);

      // Fallback: at least save to localStorage
      try {
        localStorage.setItem("github_api_token", api_token);
        localStorage.setItem("github_username", username);
        localStorage.setItem("github_repos", repos);
        return true;
      } catch (localError) {
        console.error("Failed to save GitHub settings anywhere:", localError);
        return false;
      }
    }
  }

  async clearGithubSettings(): Promise<boolean> {
    try {
      // Clear from Supabase
      await this.setUserConfig("github_settings", {
        api_token: "",
        username: "",
        repos: "",
      });

      // Clear from localStorage
      localStorage.removeItem("github_api_token");
      localStorage.removeItem("github_username");
      localStorage.removeItem("github_repos");

      return true;
    } catch (error) {
      console.error("Error clearing GitHub settings:", error);

      // Fallback: at least clear localStorage
      try {
        localStorage.removeItem("github_api_token");
        localStorage.removeItem("github_username");
        localStorage.removeItem("github_repos");
        return true;
      } catch (localError) {
        console.error("Failed to clear GitHub settings:", localError);
        return false;
      }
    }
  }

  // User Profile Management
  async getUserProfile(): Promise<{
    username: string;
    display_name: string;
  } | null> {
    if (!this.userId) {
      console.warn("No user ID set for getUserProfile");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("username, display_name")
        .eq("id", this.userId)
        .single();

      if (error) {
        console.log("No user profile found in database:", error);

        // Fallback to localStorage
        const localProfile = localStorage.getItem(`profile_${this.userId}`);
        if (localProfile) {
          const parsed = JSON.parse(localProfile);
          return {
            username: parsed.username,
            display_name: parsed.display_name,
          };
        }

        return null;
      }

      return data;
    } catch (error) {
      console.error("Error getting user profile:", error);

      // Fallback to localStorage
      const localProfile = localStorage.getItem(`profile_${this.userId}`);
      if (localProfile) {
        const parsed = JSON.parse(localProfile);
        return { username: parsed.username, display_name: parsed.display_name };
      }

      return null;
    }
  }

  async saveUserProfile(
    username: string,
    displayName: string,
  ): Promise<boolean> {
    if (!this.userId) {
      console.warn("No user ID set for saveUserProfile");
      return false;
    }

    try {
      console.log("💾 Saving user profile to Supabase:", {
        username,
        displayName,
      });

      // Save to Supabase user_profiles table
      const { data, error } = await supabase
        .from("user_profiles")
        .update({
          username: username,
          display_name: displayName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", this.userId)
        .select()
        .single();

      if (error) {
        console.error("Error saving profile to Supabase:", error);

        // Try to insert if update failed (profile might not exist)
        const { data: insertData, error: insertError } = await supabase
          .from("user_profiles")
          .insert({
            id: this.userId,
            username: username,
            display_name: displayName,
            user_preferences: {
              show_content_tab: true,
              enabled_modules: [
                "dashboard",
                "kpis",
                "visualizer",
                "roadmap",
                "cash",
                "content",
              ],
              default_view: "dashboard",
              theme_settings: {
                terminal_style: "cyberpunk",
                animation_enabled: true,
                sound_enabled: false,
              },
            },
          })
          .select()
          .single();

        if (insertError) {
          console.error("Failed to insert profile:", insertError);
        } else {
          console.log(
            "✅ Profile created successfully in Supabase:",
            insertData,
          );
        }
      } else {
        console.log("✅ Profile updated successfully in Supabase:", data);
      }

      // Also update localStorage for consistency
      const localProfile = localStorage.getItem(`profile_${this.userId}`);
      if (localProfile) {
        const parsed = JSON.parse(localProfile);
        parsed.username = username;
        parsed.display_name = displayName;
        parsed.updated_at = new Date().toISOString();
        localStorage.setItem(`profile_${this.userId}`, JSON.stringify(parsed));
        console.log("✅ Profile also updated in localStorage");
      }

      return true;
    } catch (error) {
      console.error("Error saving user profile:", error);

      // Fallback: at least save to localStorage
      try {
        const localProfile = localStorage.getItem(`profile_${this.userId}`);
        if (localProfile) {
          const parsed = JSON.parse(localProfile);
          parsed.username = username;
          parsed.display_name = displayName;
          parsed.updated_at = new Date().toISOString();
          localStorage.setItem(
            `profile_${this.userId}`,
            JSON.stringify(parsed),
          );
          console.log(
            "⚠️ Profile saved to localStorage only (Supabase failed)",
          );
          return true;
        }
      } catch (localError) {
        console.error("Failed to save profile anywhere:", localError);
      }

      return false;
    }
  }

  // Weekly Constraints Management
  async getCurrentWeeklyConstraint(): Promise<{
    id: string;
    weekStart: string;
    constraint: string;
    reason?: string;
    isActive: boolean;
  } | null> {
    try {
      const weeklyConstraints = await this.getUserConfig(
        "weekly_constraints",
        [],
      );
      const now = new Date();
      const weekStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - now.getDay(),
      )
        .toISOString()
        .split("T")[0];

      return (
        weeklyConstraints.find(
          (c: any) => c.weekStart === weekStart && c.isActive,
        ) || null
      );
    } catch (error) {
      console.error("Error getting current weekly constraint:", error);

      // Fallback to old localStorage method
      try {
        const { getCurrentWeeklyConstraint } = await import("./storage");
        return getCurrentWeeklyConstraint();
      } catch (fallbackError) {
        console.error("Fallback to storage.ts also failed:", fallbackError);
        return null;
      }
    }
  }

  async setWeeklyConstraint(
    constraint: string,
    reason?: string,
  ): Promise<{
    id: string;
    weekStart: string;
    constraint: string;
    reason?: string;
    isActive: boolean;
  } | null> {
    try {
      const now = new Date();
      const weekStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - now.getDay(),
      )
        .toISOString()
        .split("T")[0];

      // Get existing constraints
      const weeklyConstraints = await this.getUserConfig(
        "weekly_constraints",
        [],
      );

      // Deactivate any existing constraint for this week
      weeklyConstraints.forEach((c: any) => {
        if (c.weekStart === weekStart) {
          c.isActive = false;
        }
      });

      // Create new constraint
      const newConstraint = {
        id: `constraint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        weekStart,
        constraint,
        reason,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      weeklyConstraints.push(newConstraint);

      // Save to Supabase via user config
      await this.setUserConfig("weekly_constraints", weeklyConstraints);

      console.log("✅ Weekly constraint saved to Supabase and localStorage");
      return newConstraint;
    } catch (error) {
      console.error("Error saving weekly constraint:", error);

      // Fallback to old localStorage method
      try {
        const { setWeeklyConstraint } = await import("./storage");
        return setWeeklyConstraint(constraint, reason);
      } catch (fallbackError) {
        console.error("Fallback to storage.ts also failed:", fallbackError);
        return null;
      }
    }
  }

  async clearWeeklyConstraint(weekStart?: string): Promise<boolean> {
    try {
      const targetWeekStart =
        weekStart ||
        new Date(Date.now() - new Date().getDay() * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];

      // Get existing constraints
      const weeklyConstraints = await this.getUserConfig(
        "weekly_constraints",
        [],
      );

      // Deactivate constraint for the specified week
      let found = false;
      weeklyConstraints.forEach((c: any) => {
        if (c.weekStart === targetWeekStart) {
          c.isActive = false;
          found = true;
        }
      });

      if (found) {
        await this.setUserConfig("weekly_constraints", weeklyConstraints);
        console.log(
          "✅ Weekly constraint cleared from Supabase and localStorage",
        );
      }

      return found;
    } catch (error) {
      console.error("Error clearing weekly constraint:", error);
      return false;
    }
  }

  // Avoidance Items Management
  async getAvoidanceItems(): Promise<
    { id: string; text: string; isCompleted: boolean; createdAt: string }[]
  > {
    try {
      const avoidanceItems = await this.getUserConfig("avoidance_items", []);
      return avoidanceItems;
    } catch (error) {
      console.error("Error getting avoidance items:", error);

      // Fallback to old localStorage method
      try {
        const { getAvoidanceItems } = await import("./storage");
        return getAvoidanceItems();
      } catch (fallbackError) {
        console.error("Fallback to storage.ts also failed:", fallbackError);
        return [];
      }
    }
  }

  async addAvoidanceItem(text: string): Promise<{
    id: string;
    text: string;
    isCompleted: boolean;
    createdAt: string;
  } | null> {
    try {
      const avoidanceItems = await this.getUserConfig("avoidance_items", []);

      const newItem = {
        id: `avoid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: text.trim(),
        isCompleted: false,
        createdAt: new Date().toISOString(),
      };

      avoidanceItems.push(newItem);
      await this.setUserConfig("avoidance_items", avoidanceItems);

      console.log("✅ Avoidance item added to Supabase and localStorage");
      return newItem;
    } catch (error) {
      console.error("Error adding avoidance item:", error);

      // Fallback to old localStorage method
      try {
        const { addAvoidanceItem } = await import("./storage");
        return addAvoidanceItem(text);
      } catch (fallbackError) {
        console.error("Fallback to storage.ts also failed:", fallbackError);
        return null;
      }
    }
  }

  async toggleAvoidanceItem(itemId: string): Promise<boolean> {
    try {
      const avoidanceItems = await this.getUserConfig("avoidance_items", []);
      const item = avoidanceItems.find((item: any) => item.id === itemId);

      if (item) {
        item.isCompleted = !item.isCompleted;
        await this.setUserConfig("avoidance_items", avoidanceItems);
        console.log("✅ Avoidance item toggled in Supabase and localStorage");
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error toggling avoidance item:", error);

      // Fallback to old localStorage method
      try {
        const { toggleAvoidanceItem } = await import("./storage");
        toggleAvoidanceItem(itemId);
        return true;
      } catch (fallbackError) {
        console.error("Fallback to storage.ts also failed:", fallbackError);
        return false;
      }
    }
  }

  async deleteAvoidanceItem(itemId: string): Promise<boolean> {
    try {
      const avoidanceItems = await this.getUserConfig("avoidance_items", []);
      const originalLength = avoidanceItems.length;
      const filteredItems = avoidanceItems.filter(
        (item: any) => item.id !== itemId,
      );

      if (filteredItems.length !== originalLength) {
        await this.setUserConfig("avoidance_items", filteredItems);
        console.log("✅ Avoidance item deleted from Supabase and localStorage");
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error deleting avoidance item:", error);

      // Fallback to old localStorage method
      try {
        const { deleteAvoidanceItem } = await import("./storage");
        deleteAvoidanceItem(itemId);
        return true;
      } catch (fallbackError) {
        console.error("Fallback to storage.ts also failed:", fallbackError);
        return false;
      }
    }
  }
}

// Global instance
export const userStorage = new UserStorage();
