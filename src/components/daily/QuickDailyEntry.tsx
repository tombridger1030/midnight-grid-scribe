/**
 * QuickDailyEntry Component
 *
 * Simplified daily entry with:
 * - Automated: Deep work (from commits), PRs (from GitHub)
 * - Manual: Sleep hours, Weight (only 2 inputs)
 * - Weekly pattern defaults as hints
 */

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Loader2,
  Zap,
  GitPullRequest,
  Moon,
  Scale,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays, subDays, isToday } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useDeepWorkFromCommits } from "@/hooks/useDeepWorkFromCommits";
import { useWeeklyDefaults } from "@/hooks/useWeeklyDefaults";
import {
  getSleepForDate,
  saveSleepForDate,
  DailySleep,
} from "@/hooks/useSleep";
import {
  getWeightForDate,
  saveWeightForDate,
  DailyWeight,
} from "@/hooks/useWeight";
import { getPRsCreatedOnDate } from "@/lib/github";

interface QuickDailyEntryProps {
  date: Date;
  onDateChange: (date: Date) => void;
  className?: string;
}

export const QuickDailyEntry: React.FC<QuickDailyEntryProps> = ({
  date,
  onDateChange,
  className,
}) => {
  const { user } = useAuth();
  const dateStr = format(date, "yyyy-MM-dd");

  // Hooks for automated data
  const {
    deepWorkHours,
    commitCount,
    isLoading: commitLoading,
    isConfigured,
  } = useDeepWorkFromCommits(date);
  const { defaults, isLoading: defaultsLoading } = useWeeklyDefaults(date);

  // Local state for manual inputs
  const [sleepValue, setSleepValue] = useState<string>("");
  const [weightValue, setWeightValue] = useState<string>("");
  const [prCount, setPrCount] = useState<number>(0);

  // Save states
  const [sleepSaved, setSleepSaved] = useState(false);
  const [weightSaved, setWeightSaved] = useState(false);
  const [sleepSaving, setSleepSaving] = useState(false);
  const [weightSaving, setWeightSaving] = useState(false);

  // Loading state for initial data
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Load existing data for the date
  useEffect(() => {
    const loadExistingData = async () => {
      if (!user?.id) {
        setIsLoadingData(false);
        return;
      }

      setIsLoadingData(true);
      setSleepSaved(false);
      setWeightSaved(false);

      try {
        const [sleepData, weightData, prs] = await Promise.all([
          getSleepForDate(user.id, dateStr),
          getWeightForDate(user.id, dateStr),
          getPRsCreatedOnDate(dateStr),
        ]);

        if (sleepData && sleepData.hours > 0) {
          setSleepValue(sleepData.hours.toString());
          setSleepSaved(true);
        } else {
          setSleepValue("");
        }

        if (weightData && weightData.weight_lbs > 0) {
          setWeightValue(weightData.weight_lbs.toString());
          setWeightSaved(true);
        } else {
          setWeightValue("");
        }

        setPrCount(prs);
      } catch (err) {
        console.error("Failed to load existing data:", err);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadExistingData();
  }, [user?.id, dateStr]);

  // Save sleep on blur
  const handleSleepBlur = useCallback(async () => {
    if (!user?.id || !sleepValue.trim()) return;

    const hours = parseFloat(sleepValue);
    if (isNaN(hours) || hours <= 0) return;

    setSleepSaving(true);
    const success = await saveSleepForDate(user.id, dateStr, hours);
    setSleepSaving(false);
    if (success) {
      setSleepSaved(true);
    }
  }, [user?.id, dateStr, sleepValue]);

  // Save weight on blur
  const handleWeightBlur = useCallback(async () => {
    if (!user?.id || !weightValue.trim()) return;

    const lbs = parseFloat(weightValue);
    if (isNaN(lbs) || lbs <= 0) return;

    setWeightSaving(true);
    const success = await saveWeightForDate(user.id, dateStr, lbs);
    setWeightSaving(false);
    if (success) {
      setWeightSaved(true);
    }
  }, [user?.id, dateStr, weightValue]);

  // Date navigation
  const goToPrevDay = () => onDateChange(subDays(date, 1));
  const goToNextDay = () => onDateChange(addDays(date, 1));
  const goToToday = () => onDateChange(new Date());

  const isLoadingAny = commitLoading || defaultsLoading || isLoadingData;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("space-y-4", className)}
    >
      {/* Date Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={goToPrevDay}
          className="p-2 hover:bg-surface-secondary rounded-lg transition-colors"
        >
          <ChevronLeft size={20} className="text-content-muted" />
        </button>

        <div className="flex items-center gap-3">
          <span className="text-lg font-medium text-content-primary">
            {format(date, "EEEE, MMM d")}
          </span>
          {!isToday(date) && (
            <button
              onClick={goToToday}
              className="text-xs px-2 py-1 bg-neon-cyan/10 text-neon-cyan rounded hover:bg-neon-cyan/20 transition-colors"
            >
              Today
            </button>
          )}
        </div>

        <button
          onClick={goToNextDay}
          className="p-2 hover:bg-surface-secondary rounded-lg transition-colors"
        >
          <ChevronRight size={20} className="text-content-muted" />
        </button>
      </div>

      {/* Automated Section */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-content-muted uppercase tracking-wider">
          Automated
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {/* Deep Work (from commits) */}
          <div
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: "rgba(95, 227, 179, 0.05)",
              borderColor: "rgba(95, 227, 179, 0.2)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap size={16} className="text-neon-cyan" />
              <span className="text-sm font-medium text-content-primary">
                Deep Work
              </span>
            </div>
            {commitLoading ? (
              <Loader2 size={20} className="animate-spin text-neon-cyan" />
            ) : (
              <>
                <div className="text-2xl font-bold text-neon-cyan">
                  {deepWorkHours}h
                </div>
                <div className="text-xs text-content-muted">
                  {isConfigured
                    ? `${commitCount} commits`
                    : "GitHub not configured"}
                </div>
              </>
            )}
          </div>

          {/* PRs (from GitHub) */}
          <div
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: "rgba(74, 144, 226, 0.05)",
              borderColor: "rgba(74, 144, 226, 0.2)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <GitPullRequest size={16} className="text-[#4A90E2]" />
              <span className="text-sm font-medium text-content-primary">
                PRs
              </span>
            </div>
            {isLoadingData ? (
              <Loader2 size={20} className="animate-spin text-[#4A90E2]" />
            ) : (
              <>
                <div className="text-2xl font-bold text-[#4A90E2]">
                  {prCount}
                </div>
                <div className="text-xs text-content-muted">created today</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Manual Section */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-content-muted uppercase tracking-wider">
          Manual
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {/* Sleep Input */}
          <div
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: sleepSaved
                ? "rgba(157, 78, 221, 0.1)"
                : "rgba(157, 78, 221, 0.03)",
              borderColor: sleepSaved
                ? "rgba(157, 78, 221, 0.4)"
                : "rgba(157, 78, 221, 0.2)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Moon size={16} className="text-[#9D4EDD]" />
                <span className="text-sm font-medium text-content-primary">
                  Sleep
                </span>
              </div>
              {sleepSaving ? (
                <Loader2 size={14} className="animate-spin text-[#9D4EDD]" />
              ) : sleepSaved ? (
                <Check size={14} className="text-[#9D4EDD]" />
              ) : null}
            </div>
            <div className="flex items-baseline gap-1">
              <input
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={sleepValue}
                onChange={(e) => {
                  setSleepValue(e.target.value);
                  setSleepSaved(false);
                }}
                onBlur={handleSleepBlur}
                placeholder={
                  defaults.sleepHours ? defaults.sleepHours.toString() : "0"
                }
                className="w-16 text-2xl font-bold bg-transparent border-none outline-none text-[#9D4EDD] placeholder:text-[#9D4EDD]/30"
              />
              <span className="text-lg text-content-muted">h</span>
            </div>
            {defaults.sleepHours && !sleepValue && (
              <div className="text-xs text-content-muted mt-1">
                Last week: {defaults.sleepHours}h
              </div>
            )}
          </div>

          {/* Weight Input */}
          <div
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: weightSaved
                ? "rgba(255, 215, 0, 0.1)"
                : "rgba(255, 215, 0, 0.03)",
              borderColor: weightSaved
                ? "rgba(255, 215, 0, 0.4)"
                : "rgba(255, 215, 0, 0.2)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Scale size={16} className="text-[#FFD700]" />
                <span className="text-sm font-medium text-content-primary">
                  Weight
                </span>
              </div>
              {weightSaving ? (
                <Loader2 size={14} className="animate-spin text-[#FFD700]" />
              ) : weightSaved ? (
                <Check size={14} className="text-[#FFD700]" />
              ) : null}
            </div>
            <div className="flex items-baseline gap-1">
              <input
                type="number"
                step="0.1"
                min="0"
                value={weightValue}
                onChange={(e) => {
                  setWeightValue(e.target.value);
                  setWeightSaved(false);
                }}
                onBlur={handleWeightBlur}
                placeholder={
                  defaults.weightLbs ? defaults.weightLbs.toString() : "0"
                }
                className="w-20 text-2xl font-bold bg-transparent border-none outline-none text-[#FFD700] placeholder:text-[#FFD700]/30"
              />
              <span className="text-lg text-content-muted">lbs</span>
            </div>
            {defaults.weightLbs && !weightValue && (
              <div className="text-xs text-content-muted mt-1">
                Last week: {defaults.weightLbs} lbs
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default QuickDailyEntry;
