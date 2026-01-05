/**
 * Dashboard Page
 *
 * Minimal, focused dashboard showing:
 * - Hero: This week's percentage
 * - Rank bar (Valorant-style)
 * - Stats line (level, streak, XP)
 * - Rolling 4-week average
 * - Year streak visualization
 *
 * Click interactions open detail modals.
 */

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useDashboardData } from "@/hooks/useDashboardData";
import { AchievementToast } from "@/components/progression";
import {
  WeekProgress,
  RankBar,
  RankHistory,
  StatLine,
  MonthProgress,
  YearStreak,
  WeekBreakdown,
} from "@/components/dashboard";

const Dashboard: React.FC = () => {
  const { data, isLoading, error } = useDashboardData();

  // Modal states
  const [showWeekBreakdown, setShowWeekBreakdown] = useState(false);
  const [showRankHistory, setShowRankHistory] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-terminal-accent/60"
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-red-400">
          {error?.message || "Failed to load dashboard data"}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {/* Achievement Toast Notifications */}
      <AchievementToast />

      {/* Modals */}
      <WeekBreakdown
        isOpen={showWeekBreakdown}
        onClose={() => setShowWeekBreakdown(false)}
        weekKey={data.currentWeekKey}
        overallPercentage={data.currentWeekPercentage}
        kpiBreakdown={data.kpiBreakdown}
        xpGained={data.xpGainedThisWeek}
      />

      <RankHistory
        isOpen={showRankHistory}
        onClose={() => setShowRankHistory(false)}
        history={data.rankHistory}
        currentRank={data.rank}
      />

      {/* Main Content */}
      <div className="max-w-xl mx-auto">
        {/* Hero: This Week's Progress */}
        <WeekProgress
          percentage={data.currentWeekPercentage}
          onClick={() => setShowWeekBreakdown(true)}
        />

        {/* Rank Bar */}
        <RankBar
          rank={data.rank}
          rrPoints={data.rrPoints}
          rrToNextRank={data.rrToNextRank}
          nextRank={data.nextRank}
          rrChangeThisWeek={data.rrChangeThisWeek}
          rankProgress={data.rankProgress}
          onClick={() => setShowRankHistory(true)}
          className="mt-8"
        />

        {/* Stats Line */}
        <StatLine
          level={data.level}
          streak={data.currentStreak}
          xpGainedThisWeek={data.xpGainedThisWeek}
          className="mt-6"
        />

        {/* Month Progress */}
        <MonthProgress
          percentage={data.lastFourWeeksPercentage}
          className="mt-6"
        />

        {/* Year Streak */}
        <YearStreak
          weeks={data.yearWeeks}
          currentWeekKey={data.currentWeekKey}
          className="mt-8"
        />
      </div>
    </div>
  );
};

export default Dashboard;
