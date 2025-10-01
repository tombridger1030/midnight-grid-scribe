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

    // Calculate completion for each KPI
    const kpiBreakdown = activeKPIs.map(kpi => {
      const currentValue = weekRecord.values[kpi.kpi_id] || 0;
      const targetValue = kpi.min_target || kpi.target;

      let percentage: number;
      let completed: boolean;

      if (kpi.is_average) {
        // For average KPIs, we need to check if they met the daily average requirement
        // This is more complex and might need daily data analysis
        percentage = targetValue > 0 ? Math.min(100, (currentValue / targetValue) * 100) : 0;
      } else {
        // For total-based KPIs
        percentage = targetValue > 0 ? Math.min(100, (currentValue / targetValue) * 100) : 0;
      }

      completed = percentage >= 100;

      return {
        kpi_id: kpi.kpi_id,
        name: kpi.name,
        completed,
        percentage
      };
    });

    // Calculate overall completion percentage
    const totalPercentage = kpiBreakdown.reduce((sum, kpi) => sum + kpi.percentage, 0);
    const completionPercentage = Math.round(totalPercentage / activeKPIs.length);

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
      // Perfect completion
      baseChange = BASE_RR_GAIN;
    } else if (completionPercentage >= 80) {
      // Good completion (80-99%)
      baseChange = BASE_RR_GAIN * 0.7;
    } else if (completionPercentage >= COMPLETION_THRESHOLD) {
      // Acceptable completion (50-79%)
      baseChange = BASE_RR_GAIN * 0.3;
    } else {
      // Poor completion (<50%) - lose RR
      baseChange = -BASE_RR_LOSS;
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
      return await userStorage.getRankHistory();
    } catch (error) {
      console.error('Failed to get rank history:', error);
      return [];
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