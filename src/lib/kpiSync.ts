/**
 * KPI Sync Utility
 * Provides functions to sync KPI definitions between database and frontend
 * This is optional for current implementation but provides future extensibility
 */

import { supabase } from './supabase';
import { WEEKLY_KPI_DEFINITIONS, WeeklyKPIDefinition } from './weeklyKpi';

export interface DatabaseKPIDefinition {
  id: string;
  name: string;
  target: number;
  min_target?: number;
  unit: string;
  category: string;
  color: string;
  created_at: string;
  updated_at: string;
}

/**
 * Load KPI definitions from database
 */
export async function loadKPIDefinitionsFromDB(): Promise<DatabaseKPIDefinition[]> {
  const { data, error } = await supabase
    .from('kpi_definitions')
    .select('*')
    .order('name');

  if (error) {
    console.error('Failed to load KPI definitions from database:', error);
    return [];
  }

  return data || [];
}

/**
 * Sync frontend KPI definitions to database
 * This ensures the database has the latest definitions from the frontend
 */
export async function syncKPIDefinitionsToDB(): Promise<boolean> {
  try {
    // Convert frontend definitions to database format
    const dbDefinitions = WEEKLY_KPI_DEFINITIONS.map(kpi => ({
      id: kpi.id,
      name: kpi.name,
      target: kpi.target,
      min_target: kpi.minTarget || null,
      unit: kpi.unit,
      category: kpi.category,
      color: kpi.color
    }));

    // Use upsert to update existing or insert new definitions
    const { error } = await supabase
      .from('kpi_definitions')
      .upsert(dbDefinitions, { onConflict: 'id' });

    if (error) {
      console.error('Failed to sync KPI definitions to database:', error);
      return false;
    }

    console.log('Successfully synced KPI definitions to database');
    return true;
  } catch (error) {
    console.error('Error syncing KPI definitions:', error);
    return false;
  }
}

/**
 * Get KPI definitions by category from database
 */
export async function getKPIDefinitionsByCategory(): Promise<Record<string, WeeklyKPIDefinition[]>> {
  try {
    const { data, error } = await supabase
      .from('kpi_definitions_by_category')
      .select('*');

    if (error) {
      console.error('Failed to load KPI definitions by category:', error);
      return {};
    }

    // Convert database result to frontend format
    const result: Record<string, WeeklyKPIDefinition[]> = {};

    data?.forEach(row => {
      result[row.category] = row.kpis.map((kpi: any) => ({
        id: kpi.id,
        name: kpi.name,
        target: kpi.target,
        minTarget: kpi.minTarget,
        unit: kpi.unit,
        category: row.category,
        color: kpi.color
      }));
    });

    return result;
  } catch (error) {
    console.error('Error loading KPI definitions by category:', error);
    return {};
  }
}

/**
 * Validate that all required KPIs exist in database
 */
export async function validateKPIDefinitions(): Promise<{
  valid: boolean;
  missing: string[];
  outdated: string[];
}> {
  try {
    const dbDefinitions = await loadKPIDefinitionsFromDB();
    const dbMap = new Map(dbDefinitions.map(def => [def.id, def]));

    const missing: string[] = [];
    const outdated: string[] = [];

    // Check each frontend definition
    WEEKLY_KPI_DEFINITIONS.forEach(frontendKpi => {
      const dbKpi = dbMap.get(frontendKpi.id);

      if (!dbKpi) {
        missing.push(frontendKpi.id);
      } else if (
        dbKpi.color !== frontendKpi.color ||
        dbKpi.target !== frontendKpi.target ||
        dbKpi.name !== frontendKpi.name
      ) {
        outdated.push(frontendKpi.id);
      }
    });

    return {
      valid: missing.length === 0 && outdated.length === 0,
      missing,
      outdated
    };
  } catch (error) {
    console.error('Error validating KPI definitions:', error);
    return { valid: false, missing: [], outdated: [] };
  }
}

/**
 * Auto-sync KPI definitions if they're outdated
 * This can be called on app startup to ensure consistency
 */
export async function autoSyncKPIDefinitions(): Promise<void> {
  try {
    const validation = await validateKPIDefinitions();

    if (!validation.valid) {
      console.log('KPI definitions are outdated, syncing...', {
        missing: validation.missing,
        outdated: validation.outdated
      });

      const success = await syncKPIDefinitionsToDB();

      if (success) {
        console.log('KPI definitions auto-sync completed successfully');
      } else {
        console.error('KPI definitions auto-sync failed');
      }
    } else {
      console.log('KPI definitions are up to date');
    }
  } catch (error) {
    console.error('Error in auto-sync KPI definitions:', error);
  }
}