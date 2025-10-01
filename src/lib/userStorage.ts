import { supabase } from './supabase';

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
    if (!this.userId) {
      console.warn('No user ID set for getUserConfig, checking localStorage');
      return this.getLocalStorage(key, defaultValue);
    }

    try {
      const { data, error } = await supabase
        .from('user_configs')
        .select('config_value')
        .eq('user_id', this.userId)
        .eq('config_key', key)
        .single();

      if (error) {
        console.log(`Config key ${key} not found in database, checking localStorage:`, error);
        const localValue = this.getLocalStorage(key, defaultValue);
        if (localValue !== defaultValue) {
          console.log(`Found ${key} in localStorage:`, localValue);
          return localValue;
        }
        return defaultValue;
      }

      return data.config_value;
    } catch (error) {
      console.error('Error getting user config, falling back to localStorage:', error);
      return this.getLocalStorage(key, defaultValue);
    }
  }

  async setUserConfig(key: string, value: any) {
    if (!this.userId) {
      console.warn('No user ID set for setUserConfig, saving to localStorage instead');
      this.setLocalStorage(key, value);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_configs')
        .upsert({
          user_id: this.userId,
          config_key: key,
          config_value: value,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,config_key'
        });

      if (error) {
        console.error('Error setting user config, falling back to localStorage:', error);
        console.warn('💡 If this is the first time running, you may need to create the user_configs table');
        this.setLocalStorage(key, value);
        return;
      }
    } catch (error) {
      console.error('Error setting user config, falling back to localStorage:', error);
      this.setLocalStorage(key, value);
    }
  }

  // User KPIs
  async getUserKPIs() {
    if (!this.userId) {
      console.warn('No user ID set for getUserKPIs');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('user_kpis')
        .select('*')
        .eq('user_id', this.userId)
        .eq('is_active', true)
        .order('sort_order');

      if (error) {
        console.error('Error getting user KPIs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting user KPIs:', error);
      return [];
    }
  }

  async setUserKPI(kpiData: any) {
    if (!this.userId) {
      console.warn('No user ID set for setUserKPI');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('user_kpis')
        .upsert({
          user_id: this.userId,
          ...kpiData
        })
        .select()
        .single();

      if (error) {
        console.error('Error setting user KPI:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error setting user KPI:', error);
      return null;
    }
  }

  async updateUserKPI(kpiId: string, kpiData: any) {
    if (!this.userId) {
      console.warn('No user ID set for updateUserKPI');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('user_kpis')
        .update(kpiData)
        .eq('id', kpiId)
        .eq('user_id', this.userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating user KPI:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error updating user KPI:', error);
      return null;
    }
  }

  async deleteUserKPI(kpiId: string) {
    if (!this.userId) {
      console.warn('No user ID set for deleteUserKPI');
      return false;
    }

    try {
      const { error } = await supabase
        .from('user_kpis')
        .delete()
        .eq('id', kpiId)
        .eq('user_id', this.userId);

      if (error) {
        console.error('Error deleting user KPI:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting user KPI:', error);
      return false;
    }
  }

  // User goals
  async getUserGoals() {
    if (!this.userId) {
      console.warn('No user ID set for getUserGoals');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', this.userId)
        .eq('is_active', true);

      if (error) {
        console.error('Error getting user goals:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting user goals:', error);
      return [];
    }
  }

  async setUserGoal(goalData: any) {
    if (!this.userId) {
      console.warn('No user ID set for setUserGoal');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('user_goals')
        .upsert({
          user_id: this.userId,
          ...goalData
        })
        .select()
        .single();

      if (error) {
        console.error('Error setting user goal:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error setting user goal:', error);
      return null;
    }
  }

  // Weekly KPIs with user context
  async getUserWeeklyKPIs() {
    if (!this.userId) {
      console.warn('No user ID set for getUserWeeklyKPIs');
      return { records: [] };
    }

    try {
      const { data, error } = await supabase
        .from('weekly_kpis')
        .select('*')
        .eq('user_id', this.userId)
        .order('week_key', { ascending: false });

      if (error) {
        console.error('Error getting user weekly KPIs:', error);
        return { records: [] };
      }

      return { records: data || [] };
    } catch (error) {
      console.error('Error getting user weekly KPIs:', error);
      return { records: [] };
    }
  }

  async setUserWeeklyKPIs(weeklyKPIData: any) {
    if (!this.userId) {
      console.warn('No user ID set for setUserWeeklyKPIs');
      return;
    }

    try {
      // Update each record with user_id
      const recordsWithUserId = weeklyKPIData.records.map((record: any) => ({
        ...record,
        user_id: this.userId
      }));

      for (const record of recordsWithUserId) {
        const { error } = await supabase
          .from('weekly_kpis')
          .upsert(record);

        if (error) {
          console.error('Error setting user weekly KPI record:', error);
        }
      }
    } catch (error) {
      console.error('Error setting user weekly KPIs:', error);
    }
  }

  // Ships and events with user context
  async getUserShips() {
    if (!this.userId) {
      console.warn('No user ID set for getUserShips');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('ships')
        .select('*')
        .eq('user_id', this.userId)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error getting user ships:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting user ships:', error);
      return [];
    }
  }

  async addUserShip(shipData: any) {
    if (!this.userId) {
      console.warn('No user ID set for addUserShip');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('ships')
        .insert({
          user_id: this.userId,
          ...shipData
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding user ship:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error adding user ship:', error);
      return null;
    }
  }

  // Content data with user context
  async getUserContent() {
    if (!this.userId) {
      console.warn('No user ID set for getUserContent');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('content_data')
        .select('*')
        .eq('user_id', this.userId)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error getting user content:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting user content:', error);
      return [];
    }
  }

  async addUserContent(contentData: any) {
    if (!this.userId) {
      console.warn('No user ID set for addUserContent');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('content_data')
        .insert({
          user_id: this.userId,
          ...contentData
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding user content:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error adding user content:', error);
      return null;
    }
  }

  // Metrics with user context
  async getUserMetrics() {
    if (!this.userId) {
      console.warn('No user ID set for getUserMetrics');
      return { metrics: [], dates: [] };
    }

    try {
      const { data, error } = await supabase
        .from('metrics')
        .select('*')
        .eq('user_id', this.userId)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error getting user metrics:', error);
        return { metrics: [], dates: [] };
      }

      // Convert to the expected format
      const metrics: any[] = [];
      const dates: string[] = [];

      // Process the data to match the expected TrackerData format
      // This will need to be adapted based on your metrics table structure
      data?.forEach(record => {
        if (!dates.includes(record.date)) {
          dates.push(record.date);
        }
        // Process metrics based on your specific structure
      });

      return { metrics, dates };
    } catch (error) {
      console.error('Error getting user metrics:', error);
      return { metrics: [], dates: [] };
    }
  }

  // Fallback to localStorage for offline functionality
  getLocalStorage(key: string, defaultValue: any = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue;
    }
  }

  setLocalStorage(key: string, value: any) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
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
      console.warn('No user ID set for getUserRank');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('user_ranks')
        .select('*')
        .eq('user_id', this.userId)
        .single();

      if (error) {
        console.log('No user rank found, user may need initialization:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting user rank:', error);
      return null;
    }
  }

  async setUserRank(rankData: any) {
    if (!this.userId) {
      console.warn('No user ID set for setUserRank');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('user_ranks')
        .upsert({
          user_id: this.userId,
          ...rankData,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Error setting user rank:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error setting user rank:', error);
      return null;
    }
  }

  async saveRankChange(rankChange: any) {
    if (!this.userId) {
      console.warn('No user ID set for saveRankChange');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('rank_history')
        .insert({
          user_id: this.userId,
          ...rankChange
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving rank change:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error saving rank change:', error);
      return null;
    }
  }

  async getRankHistory() {
    if (!this.userId) {
      console.warn('No user ID set for getRankHistory');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('rank_history')
        .select('*')
        .eq('user_id', this.userId)
        .order('timestamp', { ascending: false })
        .limit(50); // Get last 50 rank changes

      if (error) {
        console.error('Error getting rank history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting rank history:', error);
      return [];
    }
  }

  async getWeeklyAssessments(limit: number = 10) {
    if (!this.userId) {
      console.warn('No user ID set for getWeeklyAssessments');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('weekly_assessments')
        .select('*')
        .eq('user_id', this.userId)
        .order('week_key', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting weekly assessments:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting weekly assessments:', error);
      return [];
    }
  }

  async saveWeeklyAssessment(assessment: any) {
    if (!this.userId) {
      console.warn('No user ID set for saveWeeklyAssessment');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('weekly_assessments')
        .upsert({
          user_id: this.userId,
          ...assessment
        }, {
          onConflict: 'user_id,week_key'
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving weekly assessment:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error saving weekly assessment:', error);
      return null;
    }
  }

  // GitHub Integration Settings
  async getGithubSettings(): Promise<{ api_token: string; username: string } | null> {
    try {
      const settings = await this.getUserConfig('github_settings', null);
      if (settings) {
        return settings;
      }

      // Fallback to localStorage for backward compatibility
      const api_token = localStorage.getItem('github_api_token') || '';
      const username = localStorage.getItem('github_username') || '';

      return { api_token, username };
    } catch (error) {
      console.error('Error getting GitHub settings:', error);
      // Fallback to localStorage
      const api_token = localStorage.getItem('github_api_token') || '';
      const username = localStorage.getItem('github_username') || '';
      return { api_token, username };
    }
  }

  async saveGithubSettings(api_token: string, username: string): Promise<boolean> {
    try {
      const settings = { api_token, username };

      // Save to Supabase user_configs
      await this.setUserConfig('github_settings', settings);

      // Also save to localStorage for immediate access and backward compatibility
      localStorage.setItem('github_api_token', api_token);
      localStorage.setItem('github_username', username);

      console.log('✅ GitHub settings saved to both Supabase and localStorage');
      return true;
    } catch (error) {
      console.error('Error saving GitHub settings:', error);

      // Fallback: at least save to localStorage
      try {
        localStorage.setItem('github_api_token', api_token);
        localStorage.setItem('github_username', username);
        console.log('⚠️ GitHub settings saved to localStorage only (Supabase failed)');
        return true;
      } catch (localError) {
        console.error('Failed to save GitHub settings anywhere:', localError);
        return false;
      }
    }
  }

  async clearGithubSettings(): Promise<boolean> {
    try {
      // Clear from Supabase
      await this.setUserConfig('github_settings', { api_token: '', username: '' });

      // Clear from localStorage
      localStorage.removeItem('github_api_token');
      localStorage.removeItem('github_username');

      console.log('✅ GitHub settings cleared from both Supabase and localStorage');
      return true;
    } catch (error) {
      console.error('Error clearing GitHub settings:', error);

      // Fallback: at least clear localStorage
      try {
        localStorage.removeItem('github_api_token');
        localStorage.removeItem('github_username');
        console.log('⚠️ GitHub settings cleared from localStorage only (Supabase failed)');
        return true;
      } catch (localError) {
        console.error('Failed to clear GitHub settings:', localError);
        return false;
      }
    }
  }
}

// Global instance
export const userStorage = new UserStorage();