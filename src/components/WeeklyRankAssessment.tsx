import React, { useState } from "react";
import {
  rankingManager,
  WeeklyAssessment,
  RANK_CONFIG,
} from "@/lib/rankingSystem";
import { getCurrentWeek, getPreviousWeek } from "@/lib/weeklyKpi";
import { userStorage } from "@/lib/userStorage";
import { toast } from "sonner";
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Target,
  Calendar,
  Award,
  AlertTriangle,
} from "lucide-react";
import RankBadge from "./RankBadge";
import { useProgressionStore } from "@/stores/progressionStore";

interface WeeklyRankAssessmentProps {
  weekKey?: string;
  autoAssess?: boolean;
  onAssessmentComplete?: (assessment: WeeklyAssessment) => void;
  className?: string;
}

const WeeklyRankAssessment: React.FC<WeeklyRankAssessmentProps> = ({
  weekKey,
  autoAssess = false,
  onAssessmentComplete,
  className = "",
}) => {
  const [isAssessing, setIsAssessing] = useState(false);
  const [assessment, setAssessment] = useState<WeeklyAssessment | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Use previous week if no week specified (since we assess completed weeks)
  const targetWeek = weekKey || getPreviousWeek();

  // Auto-assess on component mount if enabled
  React.useEffect(() => {
    if (autoAssess && !assessment) {
      handleAssessment();
    }
  }, [autoAssess, assessment]);

  const handleAssessment = async () => {
    if (isAssessing) return;

    setIsAssessing(true);
    try {
      // Check if assessment is needed
      const needsAssessment = await rankingManager.needsWeeklyAssessment();
      if (!needsAssessment && !weekKey) {
        toast.info("Weekly assessment already completed");
        return;
      }

      // Perform the assessment
      const weeklyAssessment =
        await rankingManager.assessWeeklyPerformance(targetWeek);
      setAssessment(weeklyAssessment);

      // Save the assessment for historical tracking
      await userStorage.saveWeeklyAssessment({
        week_key: weeklyAssessment.week_key,
        completion_percentage: weeklyAssessment.completion_percentage,
        rr_change: weeklyAssessment.rr_change,
        rank_before: weeklyAssessment.rank_before,
        rank_after: weeklyAssessment.rank_after,
        kpi_breakdown: JSON.stringify(weeklyAssessment.kpi_breakdown),
        assessed_at: new Date().toISOString(),
      });

      // Trigger progression system - award XP based on weekly completion
      const currentRR = await rankingManager.getCurrentRR();
      const progressionResult = await useProgressionStore
        .getState()
        .onWeekComplete(
          weeklyAssessment.completion_percentage,
          currentRR + weeklyAssessment.rr_change,
        );

      // Show XP notification if XP was gained
      if (progressionResult.xpGained > 0) {
        toast.success(`+${progressionResult.xpGained} XP earned!`, {
          duration: 3000,
        });
      }
      if (progressionResult.leveledUp) {
        toast.success(`Level up!`, { duration: 5000 });
      }

      // Show notification based on performance
      if (weeklyAssessment.rr_change > 0) {
        toast.success(
          `Week completed! +${weeklyAssessment.rr_change} RR (${weeklyAssessment.completion_percentage}%)`,
          { duration: 5000 },
        );
      } else if (weeklyAssessment.rr_change < 0) {
        toast.error(
          `Week completed. ${weeklyAssessment.rr_change} RR (${weeklyAssessment.completion_percentage}%)`,
          { duration: 5000 },
        );
      } else {
        toast.info(
          `Week completed. No RR change (${weeklyAssessment.completion_percentage}%)`,
          { duration: 5000 },
        );
      }

      // Show rank change notification if applicable
      if (weeklyAssessment.rank_after !== weeklyAssessment.rank_before) {
        const rankUp =
          RANK_CONFIG[weeklyAssessment.rank_after].min_rr >
          RANK_CONFIG[weeklyAssessment.rank_before].min_rr;
        toast.success(
          `🎉 ${rankUp ? "Rank Up!" : "Rank Down"} ${RANK_CONFIG[weeklyAssessment.rank_before].name} → ${RANK_CONFIG[weeklyAssessment.rank_after].name}`,
          { duration: 8000 },
        );
      }

      onAssessmentComplete?.(weeklyAssessment);
    } catch (error) {
      console.error("Failed to assess weekly performance:", error);
      toast.error("Failed to complete weekly assessment");
    } finally {
      setIsAssessing(false);
    }
  };

  if (!assessment && !autoAssess) {
    return (
      <div
        className={`border border-terminal-accent/30 p-4 bg-terminal-bg/20 ${className}`}
      >
        <div className="text-center">
          <Trophy className="mx-auto mb-3 text-terminal-accent/60" size={32} />
          <h3 className="text-lg font-bold text-terminal-accent mb-2">
            Weekly Assessment
          </h3>
          <p className="text-sm text-terminal-accent/70 mb-4">
            Evaluate your performance for week {targetWeek.split("-W")[1]} and
            update your rank.
          </p>
          <button
            onClick={handleAssessment}
            disabled={isAssessing}
            className="terminal-button px-4 py-2"
          >
            {isAssessing ? "Assessing..." : "Run Assessment"}
          </button>
        </div>
      </div>
    );
  }

  if (isAssessing) {
    return (
      <div
        className={`border border-terminal-accent/30 p-4 bg-terminal-bg/20 ${className}`}
      >
        <div className="text-center">
          <div
            className="animate-spin mx-auto mb-3 text-terminal-accent"
            size={32}
          >
            ⚡
          </div>
          <h3 className="text-lg font-bold text-terminal-accent mb-2">
            Assessing Performance...
          </h3>
          <p className="text-sm text-terminal-accent/70">
            Calculating your weekly performance and updating your rank.
          </p>
        </div>
      </div>
    );
  }

  if (!assessment) return null;

  return (
    <div
      className={`border border-terminal-accent/30 p-4 bg-terminal-bg/20 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="text-terminal-accent" size={20} />
          <h3 className="text-lg font-bold text-terminal-accent">
            Week {assessment.week_key.split("-W")[1]} Assessment
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-terminal-accent/60">
          <Calendar size={12} />
          <span>Completed</span>
        </div>
      </div>

      {/* Main Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Performance Summary */}
        <div className="space-y-3">
          <div className="text-center">
            <div
              className="text-3xl font-bold mb-1"
              style={{
                color:
                  assessment.completion_percentage >= 80
                    ? "#5FE3B3"
                    : assessment.completion_percentage >= 50
                      ? "#FFD700"
                      : "#FF6B6B",
              }}
            >
              {assessment.completion_percentage}%
            </div>
            <div className="text-sm text-terminal-accent/70">
              Weekly Completion
            </div>
          </div>

          {/* RR Change */}
          <div className="flex items-center justify-center gap-2">
            {assessment.rr_change > 0 ? (
              <TrendingUp className="text-green-400" size={20} />
            ) : assessment.rr_change < 0 ? (
              <TrendingDown className="text-red-400" size={20} />
            ) : (
              <Target className="text-terminal-accent/60" size={20} />
            )}
            <div
              className={`text-lg font-bold font-mono ${
                assessment.rr_change > 0
                  ? "text-green-400"
                  : assessment.rr_change < 0
                    ? "text-red-400"
                    : "text-terminal-accent/60"
              }`}
            >
              {assessment.rr_change > 0 ? "+" : ""}
              {assessment.rr_change} RR
            </div>
          </div>
        </div>

        {/* Rank Change */}
        <div className="flex items-center justify-center gap-3">
          <RankBadge
            rank={assessment.rank_before}
            rrPoints={0}
            size="small"
            showRR={false}
          />
          <div className="text-terminal-accent/60">→</div>
          <RankBadge
            rank={assessment.rank_after}
            rrPoints={0}
            size="small"
            showRR={false}
          />
        </div>
      </div>

      {/* Rank Change Notification */}
      {assessment.rank_after !== assessment.rank_before && (
        <div
          className={`p-3 rounded border mb-4 ${
            RANK_CONFIG[assessment.rank_after].min_rr >
            RANK_CONFIG[assessment.rank_before].min_rr
              ? "border-green-400/30 bg-green-900/20"
              : "border-red-400/30 bg-red-900/20"
          }`}
        >
          <div className="flex items-center gap-2">
            <Award
              className={
                RANK_CONFIG[assessment.rank_after].min_rr >
                RANK_CONFIG[assessment.rank_before].min_rr
                  ? "text-green-400"
                  : "text-red-400"
              }
              size={16}
            />
            <span className="text-sm font-bold">
              {RANK_CONFIG[assessment.rank_after].min_rr >
              RANK_CONFIG[assessment.rank_before].min_rr
                ? "🎉 Rank Up!"
                : "📉 Rank Down"}
            </span>
          </div>
          <div className="text-sm text-terminal-accent/70 mt-1">
            {RANK_CONFIG[assessment.rank_before].name} →{" "}
            {RANK_CONFIG[assessment.rank_after].name}
          </div>
        </div>
      )}

      {/* KPI Details Toggle */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full text-sm text-terminal-accent/60 hover:text-terminal-accent transition-colors mb-2"
      >
        {showDetails ? "▼" : "▶"} KPI Breakdown
      </button>

      {/* KPI Breakdown */}
      {showDetails && (
        <div className="space-y-2 border-t border-terminal-accent/20 pt-3">
          {assessment.kpi_breakdown.map((kpi, index) => (
            <div
              key={index}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                {kpi.completed ? (
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                ) : (
                  <div className="w-2 h-2 bg-red-400 rounded-full" />
                )}
                <span>{kpi.name}</span>
              </div>
              <div
                className={`font-mono ${kpi.completed ? "text-green-400" : "text-red-400"}`}
              >
                {kpi.percentage.toFixed(0)}%
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WeeklyRankAssessment;
