import { userStorage } from './userStorage';
import { kpiManager, ConfigurableKPI } from './configurableKpis';
import { loadWeeklyKPIs, getCurrentWeek, getWeeklyKPIRecord } from './weeklyKpi';

// Ranking system types
export type RankTier = 'bronze' | 'gold' | 'platinum' | 'diamond' | 'grandmaster';

export interface UserRank {
  current_rank: RankTier;
  rr_points: number;
  total_weeks: number;
  weeks_completed: number;
  last_assessment: string; // ISO date string
  created_at: string;
  updated_at: string;
}

export interface RankChange {
  week_key: string;
  old_rank: RankTier;
  new_rank: RankTier;
  old_rr: number;
  new_rr: number;
  completion_percentage: number;
  timestamp: string;
}

export interface WeeklyAssessment {
  week_key: string;
  completion_percentage: number;
  rr_change: number;
  rank_before: RankTier;
  rank_after: RankTier;
  kpi_breakdown: Array<{
    kpi_id: string;
    name: string;
    completed: boolean;
    percentage: number;
  }>;
}

// Rank configuration
export const RANK_CONFIG: Record<RankTier, {
  name: string;
  min_rr: number;
  max_rr: number;
  color: string;
  icon: string;
  rr_multiplier: number;
}> = {
  bronze: {
    name: 'Bronze',
    min_rr: 0,
    max_rr: 199,
    color: '#CD7F32',
    icon: '🥉',
    rr_multiplier: 1.0
  },
  gold: {
    name: 'Gold',
    min_rr: 200,
    max_rr: 499,
    color: '#FFD700',
    icon: '🥇',
    rr_multiplier: 1.5
  },
  platinum: {
    name: 'Platinum',
    min_rr: 500,
    max_rr: 999,
    color: '#E5E4E2',
    icon: '💎',
    rr_multiplier: 2.0
  },
  diamond: {
    name: 'Diamond',
    min_rr: 1000,
    max_rr: 1999,
    color: '#185ADB',
    icon: '💎',
    rr_multiplier: 3.0
  },
  grandmaster: {
    name: 'Grandmaster',
    min_rr: 2000,
    max_rr: 9999,
    color: '#B026FF',
    icon: '👑',
    rr_multiplier: 5.0
  }
};

// Base RR values
const BASE_RR_GAIN = 50;
const BASE_RR_LOSS = 30;
const COMPLETION_THRESHOLD = 50; // Below this percentage = RR loss

export class RankingManager {
  // Get user's current rank data
  async getUserRank(): Promise<UserRank | null> {
    try {
      const rankData = await userStorage.getUserRank();
      return rankData;
    } catch (error) {
      console.error('Failed to get user rank:', error);
      return null;
    }
  }

  // Initialize ranking for new user
  async initializeUserRank(): Promise<UserRank> {
    const initialRank: Omit<UserRank, 'created_at' | 'updated_at'> = {
      current_rank: 'bronze',
      rr_points: 100, // Start in middle of bronze
      total_weeks: 0,
      weeks_completed: 0,
      last_assessment: new Date().toISOString()
    };

    try {
      const savedRank = await userStorage.setUserRank(initialRank);
      return savedRank;
    } catch (error) {
      console.error('Failed to initialize user rank:', error);
      throw error;
    }
  }

  // Calculate weekly completion percentage
  async calculateWeeklyCompletion(weekKey: string): Promise<WeeklyAssessment> {
    const activeKPIs = await kpiManager.getActiveKPIs();
    const weekRecord = getWeeklyKPIRecord(weekKey);

    if (activeKPIs.length === 0) {
      throw new Error('No active KPIs found');
    }

    // If no record exists for this week, return empty assessment
    if (!weekRecord || !weekRecord.values) {
      return {
        week_key: weekKey,
        completion_percentage: 0,
        rr_change: 0,
        rank_before: 'bronze',
        rank_after: 'bronze',
        kpi_breakdown: activeKPIs.map(kpi => ({
          kpi_id: kpi.kpi_id,
          name: kpi.name,
          current_value: 0,
          target_value: kpi.min_target || kpi.target,
          completion_percentage: 0,
          completed: false
        })),
        assessed_at: new Date().toISOString()
      };
    }

    // Use the same calculation method as other components (kpiManager)
    const completionPercentage = Math.round(kpiManager.calculateWeekCompletion(weekRecord.values, activeKPIs));

    // Create KPI breakdown for detailed assessment
    const kpiBreakdown = activeKPIs.map(kpi => {
      const currentValue = weekRecord.values[kpi.kpi_id] || 0;
      const targetValue = kpi.min_target || kpi.target;

      // Calculate percentage using the KPI manager's logic (simplified for breakdown)
      let percentage: number;
      if (kpi.equal_is_better) {
        const difference = Math.abs(currentValue - targetValue);
        const tolerance = targetValue * 0.1;
        const maxAcceptableDifference = targetValue * 0.5;
        
        if (difference <= tolerance) {
          percentage = 100;
        } else {
          percentage = Math.max(0, (1 - ((difference - tolerance) / (maxAcceptableDifference - tolerance))) * 100);
        }
      } else if (kpi.reverse_scoring) {
        if (currentValue <= targetValue) {
          percentage = 100;
        } else {
          const excess = currentValue - targetValue;
          const maxAcceptableExcess = targetValue * 0.5;
          percentage = Math.max(0, (1 - (excess / maxAcceptableExcess)) * 100);
        }
      } else {
        // Normal scoring (higher is better)
        percentage = targetValue > 0 ? Math.min(100, (currentValue / targetValue) * 100) : 0;
      }

      const completed = percentage >= 100;

      return {
        kpi_id: kpi.kpi_id,
        name: kpi.name,
        current_value: currentValue,
        target_value: targetValue,
        completion_percentage: Math.round(percentage),
        completed
      };
    });

    // Get current rank for before/after comparison
    const currentRank = await this.getUserRank();
    const currentRankTier = currentRank?.current_rank || 'bronze';

    return {
      week_key: weekKey,
      completion_percentage: completionPercentage,
      rr_change: 0, // Will be calculated by assessWeeklyPerformance
      rank_before: currentRankTier,
      rank_after: currentRankTier, // Will be updated by assessWeeklyPerformance
      kpi_breakdown: kpiBreakdown
    };
  }

  // Calculate RR change based on completion percentage and current rank
  calculateRRChange(completionPercentage: number, currentRank: RankTier): number {
    const rankConfig = RANK_CONFIG[currentRank];
    let baseChange: number;

    if (completionPercentage >= 100) {
      // Perfect completion (100%)
      baseChange = BASE_RR_GAIN; // +50 RR
    } else if (completionPercentage >= 80) {
      // Excellent completion (80-99%)
      baseChange = BASE_RR_GAIN * 0.7; // +35 RR
    } else if (completionPercentage >= COMPLETION_THRESHOLD) {
      // Good completion (50-79%)
      baseChange = BASE_RR_GAIN * 0.3; // +15 RR
    } else if (completionPercentage >= 40) {
      // Close to target (40-49%) - small penalty
      baseChange = -10; // -10 RR (not too harsh)
    } else if (completionPercentage >= 30) {
      // Below target (30-39%) - medium penalty  
      baseChange = -20; // -20 RR (your 35% example)
    } else if (completionPercentage >= 20) {
      // Poor performance (20-29%) - large penalty
      baseChange = -BASE_RR_LOSS; // -30 RR
    } else {
      // Very poor performance (0-19%) - maximum penalty
      baseChange = -40; // -40 RR (for really bad weeks)
    }

    // Apply rank multiplier (exponential scaling)
    const adjustedChange = baseChange * rankConfig.rr_multiplier;

    return Math.round(adjustedChange);
  }

  // Determine rank based on RR points
  getRankFromRR(rrPoints: number): RankTier {
    if (rrPoints >= RANK_CONFIG.grandmaster.min_rr) return 'grandmaster';
    if (rrPoints >= RANK_CONFIG.diamond.min_rr) return 'diamond';
    if (rrPoints >= RANK_CONFIG.platinum.min_rr) return 'platinum';
    if (rrPoints >= RANK_CONFIG.gold.min_rr) return 'gold';
    return 'bronze';
  }

  // Assess weekly performance and update rank
  async assessWeeklyPerformance(weekKey: string): Promise<WeeklyAssessment> {
    try {
      // Get current rank data
      let currentRank = await this.getUserRank();
      if (!currentRank) {
        currentRank = await this.initializeUserRank();
      }

      // Calculate completion for the week
      const assessment = await this.calculateWeeklyCompletion(weekKey);

      // Calculate RR change
      const rrChange = this.calculateRRChange(assessment.completion_percentage, currentRank.current_rank);

      // Apply RR change (don't let RR go below 0)
      const newRR = Math.max(0, currentRank.rr_points + rrChange);

      // Determine new rank
      const newRank = this.getRankFromRR(newRR);

      // Update assessment with calculated values
      assessment.rr_change = rrChange;
      assessment.rank_after = newRank;

      // Save updated rank data
      const updatedRank: Omit<UserRank, 'created_at' | 'updated_at'> = {
        current_rank: newRank,
        rr_points: newRR,
        total_weeks: currentRank.total_weeks + 1,
        weeks_completed: assessment.completion_percentage >= COMPLETION_THRESHOLD ?
          currentRank.weeks_completed + 1 : currentRank.weeks_completed,
        last_assessment: new Date().toISOString()
      };

      await userStorage.setUserRank(updatedRank);

      // Save rank change history if rank changed
      if (newRank !== currentRank.current_rank) {
        await this.saveRankChange({
          week_key: weekKey,
          old_rank: currentRank.current_rank,
          new_rank: newRank,
          old_rr: currentRank.rr_points,
          new_rr: newRR,
          completion_percentage: assessment.completion_percentage,
          timestamp: new Date().toISOString()
        });
      }

      return assessment;
    } catch (error) {
      console.error('Failed to assess weekly performance:', error);
      throw error;
    }
  }

  // Save rank change to history
  async saveRankChange(change: RankChange): Promise<void> {
    try {
      await userStorage.saveRankChange(change);
    } catch (error) {
      console.error('Failed to save rank change:', error);
    }
  }

  // Get rank change history
  async getRankHistory(): Promise<RankChange[]> {
    try {
      const history = await userStorage.getRankHistory();
      
      // If no history exists, try to generate it from existing KPI data
      if (history.length === 0) {
        console.log('No rank history found, attempting to generate from KPI data...');
        await this.generateRankHistoryFromKPIs();
        // Try again after generation
        return await userStorage.getRankHistory();
      }
      
      return history;
    } catch (error) {
      console.error('Failed to get rank history:', error);
      return [];
    }
  }

  // Clear existing rank history (for recalculation)
  async clearRankHistory(): Promise<void> {
    try {
      await userStorage.clearRankHistory();
      console.log('✅ Cleared existing rank history for recalculation');
    } catch (error) {
      console.error('Failed to clear rank history:', error);
    }
  }

  // Regenerate rank history (clears existing first)
  async regenerateRankHistory(): Promise<void> {
    // Prevent multiple regenerations running at once
    if ((this as any)._regenerating) {
      console.log('⏳ Rank history regeneration already in progress, skipping...');
      return;
    }

    try {
      (this as any)._regenerating = true;
      console.log('🔄 Regenerating rank history from updated KPI data...');
      
      await this.clearRankHistory();
      // Add a small delay to ensure clear operation completes
      await new Promise(resolve => setTimeout(resolve, 200));
      
      await this.generateRankHistoryFromKPIs();
    } finally {
      (this as any)._regenerating = false;
    }
  }

  // Force regenerate rank history with debug output (for troubleshooting)
  async debugRegenerateRankHistory(): Promise<void> {
    // Force clear any existing regeneration flag
    (this as any)._regenerating = false;
    
    console.log('🔍 DEBUG: Force regenerating rank history with detailed output...');
    console.log('🗑️ Step 1: Clearing existing rank history...');
    await this.clearRankHistory();
    
    // Verify clearing worked
    const clearedHistory = await this.getRankHistory();
    console.log(`✅ Cleared history, now have ${clearedHistory.length} records (should be 0)`);
    
    // Add delay to ensure clear operation fully completes
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('🔄 Step 2: Regenerating from KPI data...');
    await this.generateRankHistoryFromKPIs();
    
    // Show the results
    const history = await this.getRankHistory();
    console.log(`📈 Final result: Generated ${history.length} rank change records:`);
    
    // Group by week to identify duplicates
    const byWeek = new Map<string, number>();
    history.forEach((change) => {
      byWeek.set(change.week_key, (byWeek.get(change.week_key) || 0) + 1);
    });
    
    console.log('📊 Records per week:');
    Array.from(byWeek.entries()).sort().forEach(([week, count]) => {
      console.log(`  ${week}: ${count} record${count > 1 ? 's' : ''} ${count > 1 ? '⚠️ DUPLICATE!' : '✅'}`);
    });
    
    history.forEach((change, index) => {
      console.log(`  ${index + 1}. Week ${change.week_key}: ${change.completion_percentage}% → ${change.old_rr} to ${change.new_rr} RR (${change.old_rank} → ${change.new_rank})`);
    });
  }

  // Generate rank history retroactively from existing KPI data
  async generateRankHistoryFromKPIs(): Promise<void> {
    try {
      console.log('🔄 Generating rank history from existing KPI data...');
      
      // Get all weekly KPI records from local storage first (more complete data)
      const localData = loadWeeklyKPIs();
      let weeklyRecords = localData.records || [];
      
      // If no local data, try Supabase
      if (weeklyRecords.length === 0) {
        const weeklyData = await userStorage.getUserWeeklyKPIs();
        weeklyRecords = (weeklyData.records || []).map((record: any) => ({
          weekKey: record.week_key,
          values: record.data?.values || record.data || {},
          createdAt: record.created_at,
          updatedAt: record.updated_at
        }));
      }
      
      if (weeklyRecords.length === 0) {
        console.log('No weekly KPI data found to generate history from');
        return;
      }

      // Sort records by week key (oldest first) and remove duplicates
      const uniqueWeeks = new Map<string, any>();
      
      // Keep only the most recent record for each week (by updatedAt)
      weeklyRecords
        .filter(record => record.weekKey && record.values && Object.keys(record.values).length > 0)
        .forEach(record => {
          const existing = uniqueWeeks.get(record.weekKey);
          if (!existing || (record.updatedAt && record.updatedAt > (existing.updatedAt || ''))) {
            uniqueWeeks.set(record.weekKey, record);
          }
        });

      const sortedWeeks = Array.from(uniqueWeeks.values())
        .sort((a, b) => a.weekKey.localeCompare(b.weekKey));

      if (sortedWeeks.length === 0) {
        console.log('No valid weekly records found');
        return;
      }

      console.log(`Found ${sortedWeeks.length} unique weeks of KPI data to process`);
      
      // Debug: Show what data we're working with
      sortedWeeks.forEach(week => {
        console.log(`📋 Week ${week.weekKey}: ${Object.keys(week.values).length} KPIs, updated: ${week.updatedAt}`);
      });

      // Initialize with starting rank
      let currentRank = await this.getUserRank();
      if (!currentRank) {
        currentRank = await this.initializeUserRank();
      }

      // Start with bronze rank and 100 RR for retroactive calculation
      let runningRank: RankTier = 'bronze';
      let runningRR = 100;

      for (const weekRecord of sortedWeeks) {
        try {
          const weekKey = weekRecord.weekKey;
          
          // Extract values from the record
          const values = weekRecord.values || {};
          
          // Skip if no values
          if (Object.keys(values).length === 0) {
            console.log(`Skipping week ${weekKey} - no KPI values`);
            continue;
          }

          // Calculate what the completion percentage would have been using proper KPI logic
          const activeKPIs = await kpiManager.getActiveKPIs();
          let completionPercentage = 0;
          
          if (activeKPIs.length > 0) {
            console.log(`🧮 Calculating completion for ${weekKey}:`);
            console.log(`   📊 KPI Values:`, values);
            console.log(`   🎯 Active KPIs: ${activeKPIs.length} (${activeKPIs.map(k => k.name).join(', ')})`);
            
            completionPercentage = Math.round(kpiManager.calculateWeekCompletion(values, activeKPIs));
            console.log(`   ✅ Calculated completion: ${completionPercentage}%`);
          }
          
          if (completionPercentage === 0) {
            console.log(`Skipping week ${weekKey} - 0% completion`);
            continue;
          }

          // Calculate RR change for this week
          const rrChange = this.calculateRRChange(completionPercentage, runningRank);
          const newRR = Math.max(0, runningRR + rrChange);
          const newRank = this.getRankFromRR(newRR);

          console.log(`📊 Week ${weekKey}: ${completionPercentage}% completion, ${runningRank} rank, ${rrChange} RR change (${runningRR} → ${newRR})`);

          // Create rank change record if rank actually changed or if it's significant RR change  
          // ALWAYS save rank changes for debugging - removed threshold
          const rankChange: RankChange = {
            week_key: weekKey,
            old_rank: runningRank,
            new_rank: newRank,
            old_rr: runningRR,
            new_rr: newRR,
            completion_percentage: completionPercentage,
            timestamp: weekRecord.updatedAt || weekRecord.createdAt || new Date().toISOString()
          };

          // Save this rank change
          await this.saveRankChange(rankChange);
          console.log(`✅ Generated rank change for ${weekKey}: ${runningRank} → ${newRank} (${rrChange >= 0 ? '+' : ''}${rrChange} RR)`);

          // Also check if the change should have been significant
          if (newRank === runningRank && Math.abs(rrChange) < 10) {
            console.log(`⚠️ Note: This was a small change (${rrChange} RR) with no rank change, but saved anyway for visibility`);
          }

          // Update running totals for next iteration
          runningRank = newRank;
          runningRR = newRR;

        } catch (error) {
          console.error(`Failed to process week ${weekRecord.weekKey}:`, error);
          continue;
        }
      }

      // Update user's current rank to reflect the final calculated rank
      const updatedRank: Omit<UserRank, 'created_at' | 'updated_at'> = {
        current_rank: runningRank,
        rr_points: runningRR,
        total_weeks: sortedWeeks.length,
        weeks_completed: sortedWeeks.filter(w => {
          try {
            const values = w.values || {};
            return Object.keys(values).length > 0;
          } catch {
            return false;
          }
        }).length,
        last_assessment: new Date().toISOString()
      };

      await userStorage.setUserRank(updatedRank);
      console.log(`✅ Generated rank history for ${sortedWeeks.length} weeks. Final rank: ${runningRank} (${runningRR} RR)`);

    } catch (error) {
      console.error('Failed to generate rank history from KPIs:', error);
    }
  }

  // Get rank progress within current tier
  getRankProgress(rrPoints: number, currentRank: RankTier): number {
    const config = RANK_CONFIG[currentRank];
    const progress = ((rrPoints - config.min_rr) / (config.max_rr - config.min_rr)) * 100;
    return Math.max(0, Math.min(100, progress));
  }

  // Get next rank information
  getNextRank(currentRank: RankTier): { rank: RankTier; rrNeeded: number } | null {
    const ranks: RankTier[] = ['bronze', 'gold', 'platinum', 'diamond', 'grandmaster'];
    const currentIndex = ranks.indexOf(currentRank);

    if (currentIndex >= ranks.length - 1) {
      return null; // Already at highest rank
    }

    const nextRank = ranks[currentIndex + 1];
    const rrNeeded = RANK_CONFIG[nextRank].min_rr;

    return { rank: nextRank, rrNeeded };
  }

  // Check if user needs weekly assessment
  async needsWeeklyAssessment(): Promise<boolean> {
    const currentRank = await this.getUserRank();
    if (!currentRank) return true; // New user needs initialization

    const currentWeek = getCurrentWeek();
    const lastAssessmentDate = new Date(currentRank.last_assessment);
    const currentWeekStart = new Date(); // This should be calculated based on week start

    // Check if assessment was done for current week
    // This is a simplified check - you might want to implement proper week comparison
    const daysSinceAssessment = (Date.now() - lastAssessmentDate.getTime()) / (1000 * 60 * 60 * 24);

    return daysSinceAssessment >= 7; // Assess if more than 7 days since last assessment
  }
}

// Global instance
export const rankingManager = new RankingManager();

// Make debugging functions available globally for troubleshooting
if (typeof window !== 'undefined') {
  (window as any).debugRankHistory = async () => {
    await rankingManager.debugRegenerateRankHistory();
  };
  
  (window as any).calculateRRChange = (percentage: number, rank: string) => {
    return rankingManager.calculateRRChange(percentage, rank as any);
  };

  (window as any).showRRTable = () => {
    console.log('📊 RR Change Table (Bronze Rank):');
    console.log('100%: +50 RR (Perfect!)');
    console.log('90%:  +35 RR (Excellent)');
    console.log('70%:  +15 RR (Good)');
    console.log('45%:  -10 RR (Close - small penalty)');
    console.log('35%:  -20 RR (Below target - medium penalty)');
    console.log('25%:  -30 RR (Poor - large penalty)');
    console.log('15%:  -40 RR (Very poor - max penalty)');
    console.log('Higher ranks multiply these values (Gold 1.5x, Platinum 2.0x, etc.)');
  };
  
  console.log('🔧 Debug functions available: window.debugRankHistory(), window.calculateRRChange(percentage, rank), window.showRRTable()');
}