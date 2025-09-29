import { useAuth } from '@/contexts/AuthContext';
import { userStorage } from './userStorage';

export interface UserPreferences {
  show_content_tab: boolean;
  enabled_modules: string[];
  default_view: string;
  theme_settings: {
    terminal_style: 'cyberpunk' | 'classic' | 'minimal';
    animation_enabled: boolean;
    sound_enabled: boolean;
    matrix_background: boolean;
    glitch_effects: boolean;
  };
  kpi_preferences: {
    show_weekly_view: boolean;
    show_daily_detail: boolean;
    auto_calculate_from_metrics: boolean;
  };
  dashboard_layout: {
    show_revenue_counter: boolean;
    show_ship_feed: boolean;
    show_priority_manager: boolean;
    show_weekly_constraint: boolean;
    show_alert_system: boolean;
  };
  cash_layout: {
    show_burn_rate: boolean;
    show_runway: boolean;
  };
  integrations?: {
    github?: {
      api_token: string;
      username: string;
    };
  };
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  show_content_tab: true,
  enabled_modules: ['dashboard', 'kpis', 'visualizer', 'roadmap', 'cash', 'content'],
  default_view: 'dashboard',
  theme_settings: {
    terminal_style: 'cyberpunk',
    animation_enabled: true,
    sound_enabled: false,
    matrix_background: true,
    glitch_effects: true,
  },
  kpi_preferences: {
    show_weekly_view: true,
    show_daily_detail: false,
    auto_calculate_from_metrics: true,
  },
  dashboard_layout: {
    show_revenue_counter: true,
    show_ship_feed: true,
    show_priority_manager: true,
    show_weekly_constraint: true,
    show_alert_system: true,
  },
  cash_layout: {
    show_burn_rate: true,
    show_runway: true,
  },
};

export const AVAILABLE_MODULES = [
  { id: 'dashboard', name: 'Dashboard', icon: 'LayoutDashboard', description: 'Main overview and metrics' },
  { id: 'kpis', name: 'Weekly KPIs', icon: 'BarChart3', description: 'Track weekly performance indicators' },
  { id: 'visualizer', name: 'Analytics', icon: 'TrendingUp', description: 'Data visualization and trends' },
  { id: 'roadmap', name: 'Roadmap', icon: 'GitBranch', description: 'Goals and milestone tracking' },
  { id: 'cash', name: 'Cash', icon: 'Network', description: 'Financial tracking and metrics' },
  { id: 'content', name: 'Content', icon: 'FileText', description: 'Content creation and management' },
];

export class UserPreferencesManager {
  // Get user preferences (with fallback to defaults)
  async getUserPreferences(): Promise<UserPreferences> {
    try {
      const preferences = await userStorage.getUserConfig('user_preferences', DEFAULT_PREFERENCES);

      // Merge with defaults to ensure all keys exist
      return {
        ...DEFAULT_PREFERENCES,
        ...preferences,
        theme_settings: {
          ...DEFAULT_PREFERENCES.theme_settings,
          ...preferences.theme_settings,
        },
        kpi_preferences: {
          ...DEFAULT_PREFERENCES.kpi_preferences,
          ...preferences.kpi_preferences,
        },
        dashboard_layout: {
          ...DEFAULT_PREFERENCES.dashboard_layout,
          ...preferences.dashboard_layout,
        },
        cash_layout: {
          ...DEFAULT_PREFERENCES.cash_layout,
          ...preferences.cash_layout,
        },
      };
    } catch (error) {
      console.error('Failed to get user preferences:', error);
      return DEFAULT_PREFERENCES;
    }
  }

  // Update user preferences
  async updatePreferences(updates: Partial<UserPreferences>): Promise<void> {
    try {
      const currentPrefs = await this.getUserPreferences();
      
      const newPreferences = {
        ...currentPrefs,
        ...updates,
        theme_settings: {
          ...currentPrefs.theme_settings,
          ...updates.theme_settings,
        },
        kpi_preferences: {
          ...currentPrefs.kpi_preferences,
          ...updates.kpi_preferences,
        },
        dashboard_layout: {
          ...currentPrefs.dashboard_layout,
          ...updates.dashboard_layout,
        },
        cash_layout: {
          ...currentPrefs.cash_layout,
          ...updates.cash_layout,
        },
      };

      await userStorage.setUserConfig('user_preferences', newPreferences);
    } catch (error) {
      console.error('Failed to update user preferences:', error);
      throw error; // Re-throw so the UI can handle it
    }
  }

  // Toggle module enabled/disabled
  async toggleModule(moduleId: string, enabled: boolean): Promise<void> {
    const preferences = await this.getUserPreferences();
    const enabledModules = new Set(preferences.enabled_modules);

    if (enabled) {
      enabledModules.add(moduleId);
    } else {
      enabledModules.delete(moduleId);
    }

    await this.updatePreferences({
      enabled_modules: Array.from(enabledModules),
    });
  }

  // Check if module is enabled
  async isModuleEnabled(moduleId: string): Promise<boolean> {
    const preferences = await this.getUserPreferences();
    return preferences.enabled_modules.includes(moduleId);
  }

  // Update theme settings
  async updateTheme(themeUpdates: Partial<UserPreferences['theme_settings']>): Promise<void> {
    await this.updatePreferences({
      theme_settings: themeUpdates,
    });
  }

  // Update KPI preferences
  async updateKPIPreferences(kpiUpdates: Partial<UserPreferences['kpi_preferences']>): Promise<void> {
    await this.updatePreferences({
      kpi_preferences: kpiUpdates,
    });
  }

  // Update dashboard layout
  async updateDashboardLayout(layoutUpdates: Partial<UserPreferences['dashboard_layout']>): Promise<void> {
    await this.updatePreferences({
      dashboard_layout: layoutUpdates,
    });
  }

  // Update cash layout
  async updateCashLayout(layoutUpdates: Partial<UserPreferences['cash_layout']>): Promise<void> {
    await this.updatePreferences({
      cash_layout: layoutUpdates,
    });
  }

  // Get available modules that user can enable
  getAvailableModules() {
    return AVAILABLE_MODULES;
  }

  // Get enabled navigation items
  async getEnabledNavItems() {
    const preferences = await this.getUserPreferences();
    return AVAILABLE_MODULES.filter(module =>
      preferences.enabled_modules.includes(module.id)
    );
  }

  // Content tab visibility
  async shouldShowContentTab(): Promise<boolean> {
    const preferences = await this.getUserPreferences();
    return preferences.show_content_tab && preferences.enabled_modules.includes('content');
  }

  // Dashboard component visibility
  async getDashboardVisibility() {
    const preferences = await this.getUserPreferences();
    return preferences.dashboard_layout;
  }

  // Export preferences for backup
  async exportPreferences(): Promise<string> {
    const preferences = await this.getUserPreferences();
    return JSON.stringify(preferences, null, 2);
  }

  // Import preferences from backup
  async importPreferences(preferencesJson: string): Promise<boolean> {
    try {
      const preferences = JSON.parse(preferencesJson) as UserPreferences;

      // Validate that it has the required structure
      if (typeof preferences !== 'object' || !preferences.enabled_modules) {
        throw new Error('Invalid preferences format');
      }

      await this.updatePreferences(preferences);
      return true;
    } catch (error) {
      console.error('Failed to import preferences:', error);
      return false;
    }
  }

  // Reset to defaults
  async resetToDefaults(): Promise<void> {
    await userStorage.setUserConfig('user_preferences', DEFAULT_PREFERENCES);
  }

  // Theme-specific helpers
  async getTerminalStyle(): Promise<'cyberpunk' | 'classic' | 'minimal'> {
    const preferences = await this.getUserPreferences();
    return preferences.theme_settings.terminal_style;
  }

  async shouldShowMatrixBackground(): Promise<boolean> {
    const preferences = await this.getUserPreferences();
    return preferences.theme_settings.matrix_background;
  }

  async shouldShowGlitchEffects(): Promise<boolean> {
    const preferences = await this.getUserPreferences();
    return preferences.theme_settings.glitch_effects;
  }

  async shouldEnableAnimations(): Promise<boolean> {
    const preferences = await this.getUserPreferences();
    return preferences.theme_settings.animation_enabled;
  }

  async shouldEnableSound(): Promise<boolean> {
    const preferences = await this.getUserPreferences();
    return preferences.theme_settings.sound_enabled;
  }
}

// Global instance
export const preferencesManager = new UserPreferencesManager();