/**
 * StreakCalendar Component
 * 
 * Shows streak information for overall and individual KPIs.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Trophy, Calendar } from 'lucide-react';
import type { Streak } from '@/lib/analyticsCalculations';

interface StreakCalendarProps {
  streaks: Record<string, Streak[]>;
  kpiNames: Record<string, string>;
}

export const StreakCalendar: React.FC<StreakCalendarProps> = ({
  streaks,
  kpiNames,
}) => {
  // Get overall streaks
  const overallStreaks = streaks['overall'] || [];
  const currentOverallStreak = overallStreaks.find(s => s.type === 'current');
  const longestOverallStreak = overallStreaks.length > 0
    ? overallStreaks.reduce((max, s) => s.length > max.length ? s : max, overallStreaks[0])
    : null;

  // Get KPI-specific streaks
  const kpiStreaks = Object.entries(streaks)
    .filter(([key]) => key !== 'overall')
    .map(([kpiId, streakList]) => ({
      kpiId,
      name: kpiNames[kpiId] || kpiId,
      current: streakList.find(s => s.type === 'current'),
      longest: streakList.length > 0
        ? streakList.reduce((max, s) => s.length > max.length ? s : max, streakList[0])
        : null,
    }))
    .filter(s => s.current || s.longest)
    .sort((a, b) => {
      const aLen = a.current?.length || a.longest?.length || 0;
      const bLen = b.current?.length || b.longest?.length || 0;
      return bLen - aLen;
    });

  return (
    <div className="rounded-xl bg-surface-secondary border border-line p-6">
      <h3 className="text-sm font-semibold text-terminal-accent mb-6 uppercase tracking-wider">
        Streaks
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Overall Streaks */}
        <div className="space-y-4">
          <h4 className="text-xs text-terminal-accent/60 uppercase tracking-wider">
            Overall Performance
          </h4>

          {/* Current Streak */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-lg bg-surface-primary/50 border border-line"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#FFB800]/15">
                <Flame size={24} className="text-[#FFB800]" />
              </div>
              <div>
                <div className="text-xs text-terminal-accent/60">Current Streak</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono text-[#FFB800]">
                    {currentOverallStreak?.length || 0}
                  </span>
                  <span className="text-sm text-terminal-accent/40">weeks</span>
                </div>
              </div>
            </div>
            {currentOverallStreak && (
              <div className="mt-2 text-xs text-terminal-accent/40">
                Since {currentOverallStreak.startDate}
              </div>
            )}
          </motion.div>

          {/* Longest Streak */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-lg bg-surface-primary/50 border border-line"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#00FF88]/15">
                <Trophy size={24} className="text-[#00FF88]" />
              </div>
              <div>
                <div className="text-xs text-terminal-accent/60">Longest Streak</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono text-[#00FF88]">
                    {longestOverallStreak?.length || 0}
                  </span>
                  <span className="text-sm text-terminal-accent/40">weeks</span>
                </div>
              </div>
            </div>
            {longestOverallStreak && (
              <div className="mt-2 text-xs text-terminal-accent/40">
                {longestOverallStreak.startDate} → {longestOverallStreak.endDate}
              </div>
            )}
          </motion.div>
        </div>

        {/* KPI Streaks */}
        <div>
          <h4 className="text-xs text-terminal-accent/60 uppercase tracking-wider mb-4">
            KPI Streaks
          </h4>

          {kpiStreaks.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {kpiStreaks.slice(0, 6).map((kpi, index) => (
                <motion.div
                  key={kpi.kpiId}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-surface-primary/50 border border-line"
                >
                  <span className="text-sm text-terminal-accent truncate flex-1 mr-4">
                    {kpi.name}
                  </span>
                  <div className="flex items-center gap-4 text-xs">
                    {kpi.current && (
                      <div className="flex items-center gap-1">
                        <Flame size={12} className="text-[#FFB800]" />
                        <span className="font-mono text-[#FFB800]">
                          {kpi.current.length}
                        </span>
                      </div>
                    )}
                    {kpi.longest && (
                      <div className="flex items-center gap-1">
                        <Trophy size={12} className="text-[#00FF88]" />
                        <span className="font-mono text-[#00FF88]">
                          {kpi.longest.length}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-terminal-accent/40 p-4 text-center">
              No KPI streaks recorded yet.
              <br />
              Hit your targets consistently to build streaks!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StreakCalendar;
