import { userStorage } from './userStorage';
import { supabase } from './supabase';

export interface ConfigurableKPI {
  id: string;
  kpi_id: string;
  name: string;
  target: number;
  min_target?: number;
  unit: string;
  category: string;
  color: string;
  is_active: boolean;
  is_average?: boolean; // If true, calculates average of days with data instead of sum
  reverse_scoring?: boolean; // If true, lower values are better (e.g., screen time). If false, higher values are better
  equal_is_better?: boolean; // If true, being exactly at target is best, scores decrease as you move away in either direction
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface WeeklyKPIValues {
  [kpiId: string]: number;
}

export interface WeeklyKPIRecord {
  weekKey: string;
  values: WeeklyKPIValues;
  user_id?: string;
}

export interface ConfigurableKPIData {
  records: WeeklyKPIRecord[];
}

// Default KPI templates that users can choose from
export const DEFAULT_KPI_TEMPLATES: Omit<ConfigurableKPI, 'id' | 'created_at' | 'updated_at'>[] = [
  // DISCIPLINE KPIs
  {
    kpi_id: 'deepWorkHours',
    name: 'Deep Work Hours',
    target: 40,
    min_target: 30,
    unit: 'hours',
    category: 'discipline',
    color: '#5FE3B3',
    is_active: true,
    sort_order: 1
  },
  {
    kpi_id: 'sleepAverage',
    name: 'Sleep Average',
    target: 7,
    min_target: 6,
    unit: 'hours/night',
    category: 'discipline',
    color: '#9D4EDD',
    is_active: true,
    is_average: true,
    sort_order: 2
  },
  {
    kpi_id: 'noCompromises',
    name: 'No Compromises',
    target: 7,
    unit: 'days',
    category: 'discipline',
    color: '#FFD700',
    is_active: true,
    sort_order: 3
  },

  // ENGINEERING KPIs
  {
    kpi_id: 'prRequests',
    name: 'PR Requests',
    target: 3,
    unit: 'requests',
    category: 'engineering',
    color: '#4A90E2',
    is_active: true,
    sort_order: 4
  },
  {
    kpi_id: 'bugsClosed',
    name: 'Bugs Closed',
    target: 10,
    unit: 'bugs',
    category: 'engineering',
    color: '#FF6B6B',
    is_active: true,
    sort_order: 5
  },
  {
    kpi_id: 'contentShipped',
    name: 'Content Shipped',
    target: 5,
    unit: 'items',
    category: 'engineering',
    color: '#00CED1',
    is_active: true,
    sort_order: 6
  },

  // LEARNING KPIs
  {
    kpi_id: 'pagesRead',
    name: 'Pages Read',
    target: 100,
    unit: 'pages',
    category: 'learning',
    color: '#FFA500',
    is_active: true,
    sort_order: 7
  },
  {
    kpi_id: 'audiobookPercent',
    name: 'Audiobook Listened',
    target: 100,
    unit: '%',
    category: 'learning',
    color: '#DA70D6',
    is_active: true,
    sort_order: 8
  }
];

// KPI category colors and metadata
export const KPI_CATEGORIES: Record<string, { color: string; icon: string }> = {
  discipline: { color: '#5FE3B3', icon: '🧘' },
  engineering: { color: '#E67E22', icon: '⚙️' },
  learning: { color: '#9B59B6', icon: '📚' },
  fitness: { color: '#FF073A', icon: '💪' },
  health: { color: '#2ECC71', icon: '❤️' },
  productivity: { color: '#3498DB', icon: '⚡' },
  social: { color: '#F39C12', icon: '👥' },
  custom: { color: '#95A5A6', icon: '🎯' }
};

export class ConfigurableKPIManager {
  // Get user's configured KPIs
  async getUserKPIs(): Promise<ConfigurableKPI[]> {
    try {
      const kpis = await userStorage.getUserKPIs();
      return kpis.map((kpi: any) => ({
        id: kpi.id,
        kpi_id: kpi.kpi_id,
        name: kpi.name,
        target: parseFloat(kpi.target),
        min_target: kpi.min_target ? parseFloat(kpi.min_target) : undefined,
        unit: kpi.unit,
        category: kpi.category,
        color: kpi.color,
        is_active: kpi.is_active,
        is_average: kpi.is_average || false,
        reverse_scoring: kpi.reverse_scoring || false,
        equal_is_better: kpi.equal_is_better || false,
        sort_order: kpi.sort_order,
        created_at: kpi.created_at,
        updated_at: kpi.updated_at
      }));
    } catch (error) {
      console.error('Failed to get user KPIs:', error);
      return [];
    }
  }

  // Get only active KPIs for UI display
  async getActiveKPIs(): Promise<ConfigurableKPI[]> {
    const allKPIs = await this.getUserKPIs();
    return allKPIs.filter(kpi => kpi.is_active);
  }

  // Add or update a KPI
  async saveKPI(kpiData: Omit<ConfigurableKPI, 'id' | 'created_at' | 'updated_at'>): Promise<ConfigurableKPI | null> {
    try {
      const savedKPI = await userStorage.setUserKPI(kpiData);
      return savedKPI;
    } catch (error) {
      console.error('Failed to save KPI:', error);
      return null;
    }
  }

  // Create a custom KPI
  async createCustomKPI(
    name: string,
    target: number,
    unit: string,
    category: string = 'custom',
    color?: string,
    minTarget?: number,
    isAverage?: boolean,
    reverseScoring?: boolean,
    equalIsBetter?: boolean
  ): Promise<ConfigurableKPI | null> {
    const kpiId = name.toLowerCase().replace(/[^a-z0-9]/g, '');

    const customKPI: Omit<ConfigurableKPI, 'id' | 'created_at' | 'updated_at'> = {
      kpi_id: kpiId,
      name,
      target,
      min_target: minTarget,
      unit,
      category,
      color: color || KPI_CATEGORIES[category]?.color || '#95A5A6',
      is_active: true,
      is_average: isAverage || false,
      reverse_scoring: reverseScoring || false,
      equal_is_better: equalIsBetter || false,
      sort_order: 999 // Custom KPIs go to the end
    };

    return await this.saveKPI(customKPI);
  }

  // Toggle KPI active status
  async toggleKPIActive(kpiId: string, isActive: boolean): Promise<void> {
    try {
      const kpis = await this.getUserKPIs();
      const kpi = kpis.find(k => k.kpi_id === kpiId);

      if (kpi) {
        await this.saveKPI({
          ...kpi,
          is_active: isActive
        });
      }
    } catch (error) {
      console.error('Failed to toggle KPI active status:', error);
    }
  }

  // Update KPI target
  async updateKPITarget(kpiId: string, target: number, minTarget?: number): Promise<void> {
    try {
      const kpis = await this.getUserKPIs();
      const kpi = kpis.find(k => k.kpi_id === kpiId);

      if (kpi) {
        await this.saveKPI({
          ...kpi,
          target,
          min_target: minTarget
        });
      }
    } catch (error) {
      console.error('Failed to update KPI target:', error);
    }
  }

  // Delete a KPI (set inactive)
  async deleteKPI(kpiId: string): Promise<void> {
    await this.toggleKPIActive(kpiId, false);
  }

  // Create a new KPI
  async createKPI(kpiData: Omit<ConfigurableKPI, 'id' | 'created_at' | 'updated_at'>): Promise<ConfigurableKPI | null> {
    try {
      return await userStorage.setUserKPI(kpiData);
    } catch (error) {
      console.error('Failed to create KPI:', error);
      throw error;
    }
  }

  // Update an existing KPI
  async updateKPI(kpiId: string, updates: Partial<Omit<ConfigurableKPI, 'id' | 'kpi_id' | 'created_at' | 'updated_at'>>): Promise<void> {
    try {
      const userKPIs = await this.getUserKPIs();
      const existingKPI = userKPIs.find(kpi => kpi.id === kpiId);

      if (!existingKPI) {
        throw new Error('KPI not found');
      }

      const updatedKPI = {
        ...existingKPI,
        ...updates,
        updated_at: new Date().toISOString()
      };

      await userStorage.updateUserKPI(kpiId, updatedKPI);
    } catch (error) {
      console.error('Failed to update KPI:', error);
      throw error;
    }
  }

  // Permanently delete a KPI and all its data
  async permanentlyDeleteKPI(kpiId: string): Promise<void> {
    try {
      await userStorage.deleteUserKPI(kpiId);
    } catch (error) {
      console.error('Failed to permanently delete KPI:', error);
      throw error;
    }
  }

  // Initialize user with default KPIs (called on first login)
  async initializeDefaultKPIs(): Promise<void> {
    try {
      const existingKPIs = await this.getUserKPIs();
      const existingKPIIds = new Set(existingKPIs.map(kpi => kpi.kpi_id));

      // Only create KPIs that don't already exist
      for (const template of DEFAULT_KPI_TEMPLATES) {
        if (!existingKPIIds.has(template.kpi_id)) {
          try {
            await this.saveKPI(template);
          } catch (error) {
            // Skip if already exists (race condition)
          }
        }
      }
    } catch (error) {
      console.error('Failed to initialize default KPIs:', error);
    }
  }

  // Get available KPI templates that user hasn't added yet
  async getAvailableTemplates(): Promise<typeof DEFAULT_KPI_TEMPLATES> {
    const userKPIs = await this.getUserKPIs();
    const userKPIIds = new Set(userKPIs.map(kpi => kpi.kpi_id));

    return DEFAULT_KPI_TEMPLATES.filter(template =>
      !userKPIIds.has(template.kpi_id)
    );
  }

  // Add a template KPI to user's collection
  async addTemplateKPI(templateKpiId: string): Promise<ConfigurableKPI | null> {
    const template = DEFAULT_KPI_TEMPLATES.find(t => t.kpi_id === templateKpiId);
    if (!template) {
      console.error('Template KPI not found:', templateKpiId);
      return null;
    }

    return await this.saveKPI({
      ...template,
      is_active: true
    });
  }

  // Weekly KPI data management
  async getWeeklyKPIData(): Promise<ConfigurableKPIData> {
    try {
      return await userStorage.getUserWeeklyKPIs();
    } catch (error) {
      console.error('Failed to get weekly KPI data:', error);
      return { records: [] };
    }
  }

  async saveWeeklyKPIData(data: ConfigurableKPIData): Promise<void> {
    try {
      await userStorage.setUserWeeklyKPIs(data);
    } catch (error) {
      console.error('Failed to save weekly KPI data:', error);
    }
  }

  // Calculate completion percentage for a week
  calculateWeekCompletion(weekValues: WeeklyKPIValues, kpis: ConfigurableKPI[]): number {
    if (kpis.length === 0) return 0;

    let totalProgress = 0;
    let validKPIs = 0;

    for (const kpi of kpis.filter(k => k.is_active)) {
      const value = weekValues[kpi.kpi_id] || 0;
      const target = kpi.min_target || kpi.target;

      if (target > 0) {
        let progress;
        
        if (kpi.equal_is_better) {
          // For equal is better (being exactly at target is best)
          const difference = Math.abs(value - target);
          const tolerance = target * 0.1; // Allow 10% tolerance for perfect score
          const maxAcceptableDifference = target * 0.5; // 50% difference = 0 score
          
          if (difference <= tolerance) {
            progress = 1; // Perfect score if within tolerance
          } else {
            progress = Math.max(0, 1 - ((difference - tolerance) / (maxAcceptableDifference - tolerance)));
          }
        } else if (kpi.reverse_scoring) {
          // For reverse scoring (lower is better)
          if (value <= target) {
            progress = 1; // Perfect score if at or below target
          } else {
            const excess = value - target;
            const maxAcceptableExcess = target * 0.5; // Allow 50% above target before hitting 0
            progress = Math.max(0, 1 - (excess / maxAcceptableExcess));
          }
        } else {
          // Normal scoring (higher is better)
          progress = Math.min(1, value / target);
        }
        
        totalProgress += progress;
        validKPIs++;
      }
    }

    return validKPIs > 0 ? (totalProgress / validKPIs) * 100 : 0;
  }

  // Get KPI performance stats
  getKPIStats(weekValues: WeeklyKPIValues, kpis: ConfigurableKPI[]) {
    let excellent = 0;
    let good = 0;
    let fair = 0;
    let poor = 0;

    kpis.filter(kpi => kpi.is_active).forEach(kpi => {
      const value = weekValues[kpi.kpi_id] || 0;
      const target = kpi.target;
      let progress;

      if (kpi.equal_is_better) {
        // For equal is better (being exactly at target is best)
        const difference = Math.abs(value - target);
        const tolerance = target * 0.1; // Allow 10% tolerance for perfect score
        const maxAcceptableDifference = target * 0.5; // 50% difference = 0 score
        
        if (difference <= tolerance) {
          progress = 100; // Perfect score if within tolerance
        } else {
          progress = Math.max(0, 100 - ((difference - tolerance) / (maxAcceptableDifference - tolerance)) * 100);
        }
      } else if (kpi.reverse_scoring) {
        // For reverse scoring (lower is better)
        if (value <= target) {
          progress = 100; // Perfect score if at or below target
        } else {
          const excess = value - target;
          const maxAcceptableExcess = target * 0.5;
          progress = Math.max(0, 100 - (excess / maxAcceptableExcess) * 100);
        }
      } else {
        // Normal scoring (higher is better)
        progress = Math.min(100, (value / target) * 100);
      }

      if (progress >= 100) excellent++;
      else if (progress >= 80) good++;
      else if (progress >= 50) fair++;
      else poor++;
    });

    return { excellent, good, fair, poor };
  }

  // Migration helper: Update Sleep Average KPI to have is_average = true
  async migrateAverageKPIs(): Promise<void> {
    try {
      const userId = userStorage.getCurrentUserId();
      if (!userId) {
        console.warn('No user ID set for migration');
        return;
      }

      const { error } = await supabase
        .from('user_kpis')
        .update({ is_average: true })
        .eq('user_id', userId)
        .in('kpi_id', ['sleepAverage']);

      if (error) {
        console.error('Failed to migrate average KPIs:', error);
      } else {
      }
    } catch (error) {
      console.error('Error during KPI migration:', error);
    }
  }
}

// Global instance
export const kpiManager = new ConfigurableKPIManager();