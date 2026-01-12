/**
 * WeeklyView Component
 *
 * Shows weekly spending breakdown:
 * - Horizontal bar chart for last 4 weeks
 * - Category breakdown
 * - Week-over-week comparison
 */

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ParsedTransaction } from "@/lib/ai/bankStatementParser";

interface WeeklyViewProps {
  transactions: ParsedTransaction[];
  hideBalances: boolean;
}

interface WeekData {
  weekStart: Date;
  weekEnd: Date;
  total: number;
  transactions: ParsedTransaction[];
  categories: Record<string, number>;
}

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
  "Food & Dining": "bg-orange-500",
  Shopping: "bg-blue-500",
  Transportation: "bg-yellow-500",
  "Bills & Utilities": "bg-red-500",
  Entertainment: "bg-purple-500",
  "Health & Wellness": "bg-green-500",
  Travel: "bg-cyan-500",
  Education: "bg-indigo-500",
  "Personal Care": "bg-pink-500",
  "Home Improvement": "bg-amber-500",
  Subscriptions: "bg-violet-500",
  Income: "bg-emerald-500",
  Transfer: "bg-gray-500",
  Other: "bg-slate-500",
};

function getWeekRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Start on Monday
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function formatWeekRange(start: Date, end: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  return `${start.toLocaleDateString("en-US", options)} - ${end.toLocaleDateString("en-US", options)}`;
}

export const WeeklyView: React.FC<WeeklyViewProps> = ({
  transactions,
  hideBalances,
}) => {
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);

  // Get last 8 weeks of data
  const weeksData = useMemo(() => {
    const weeks: WeekData[] = [];
    const now = new Date();

    for (let i = 0; i < 8; i++) {
      const weekDate = new Date(now);
      weekDate.setDate(now.getDate() - i * 7);
      const { start, end } = getWeekRange(weekDate);

      const weekTransactions = transactions.filter((t) => {
        const date = new Date(t.date);
        return date >= start && date <= end && t.amount < 0;
      });

      const categories: Record<string, number> = {};
      weekTransactions.forEach((t) => {
        const cat = t.category || "Other";
        categories[cat] = (categories[cat] || 0) + Math.abs(t.amount);
      });

      weeks.push({
        weekStart: start,
        weekEnd: end,
        total: weekTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0),
        transactions: weekTransactions,
        categories,
      });
    }

    return weeks;
  }, [transactions]);

  const maxTotal = Math.max(...weeksData.map((w) => w.total), 1);
  const selectedWeek = weeksData[selectedWeekIndex];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const sortedCategories = Object.entries(selectedWeek?.categories || {}).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-terminal-accent flex items-center gap-2">
          <Calendar size={20} />
          Weekly Breakdown
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setSelectedWeekIndex(Math.min(selectedWeekIndex + 1, 7))
            }
            disabled={selectedWeekIndex >= 7}
            className="p-2 rounded-lg bg-surface-secondary border border-line/50
                       text-terminal-accent/70 hover:text-terminal-accent
                       disabled:opacity-30 disabled:cursor-not-allowed
                       transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-terminal-accent/70 min-w-[140px] text-center">
            {selectedWeek &&
              formatWeekRange(selectedWeek.weekStart, selectedWeek.weekEnd)}
          </span>
          <button
            onClick={() =>
              setSelectedWeekIndex(Math.max(selectedWeekIndex - 1, 0))
            }
            disabled={selectedWeekIndex <= 0}
            className="p-2 rounded-lg bg-surface-secondary border border-line/50
                       text-terminal-accent/70 hover:text-terminal-accent
                       disabled:opacity-30 disabled:cursor-not-allowed
                       transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Last 4 Weeks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-xl bg-surface-secondary border border-line/50"
        >
          <h4 className="text-sm font-medium text-terminal-accent/70 mb-4">
            Last 4 Weeks
          </h4>
          <div className="space-y-3">
            {weeksData.slice(0, 4).map((week, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedWeekIndex(index)}
                className={cn(
                  "cursor-pointer p-3 rounded-lg transition-all",
                  selectedWeekIndex === index
                    ? "bg-terminal-accent/10 border border-terminal-accent/30"
                    : "hover:bg-surface-hover",
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-terminal-accent/50">
                    {formatWeekRange(week.weekStart, week.weekEnd)}
                  </span>
                  <span className="text-sm font-mono text-terminal-accent font-medium">
                    {hideBalances ? "••••" : formatCurrency(week.total)}
                  </span>
                </div>
                <div className="h-2 bg-surface-primary rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(week.total / maxTotal) * 100}%` }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className={cn(
                      "h-full rounded-full",
                      index === 0
                        ? "bg-terminal-accent"
                        : "bg-terminal-accent/50",
                    )}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Category Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-xl bg-surface-secondary border border-line/50"
        >
          <h4 className="text-sm font-medium text-terminal-accent/70 mb-4">
            Category Breakdown
          </h4>
          {sortedCategories.length === 0 ? (
            <div className="text-center py-8 text-terminal-accent/40">
              No transactions this week
            </div>
          ) : (
            <div className="space-y-3">
              {sortedCategories.slice(0, 6).map(([category, amount], index) => (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3"
                >
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full",
                      CATEGORY_COLORS[category] || "bg-slate-500",
                    )}
                  />
                  <span className="text-sm text-terminal-accent/70 flex-1 truncate">
                    {category}
                  </span>
                  <span className="text-sm font-mono text-terminal-accent">
                    {hideBalances ? "••••" : formatCurrency(amount)}
                  </span>
                  <span className="text-xs text-terminal-accent/40 w-12 text-right">
                    {selectedWeek.total > 0
                      ? `${Math.round((amount / selectedWeek.total) * 100)}%`
                      : "0%"}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Week Summary Stats */}
      {selectedWeek && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 gap-4"
        >
          <div className="p-4 rounded-lg bg-surface-secondary border border-line/50 text-center">
            <p className="text-xs uppercase tracking-wider text-terminal-accent/50 mb-1">
              Week Total
            </p>
            <p className="text-xl font-bold font-mono text-terminal-accent">
              {hideBalances ? "••••" : formatCurrency(selectedWeek.total)}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-surface-secondary border border-line/50 text-center">
            <p className="text-xs uppercase tracking-wider text-terminal-accent/50 mb-1">
              Transactions
            </p>
            <p className="text-xl font-bold font-mono text-terminal-accent">
              {selectedWeek.transactions.length}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-surface-secondary border border-line/50 text-center">
            <p className="text-xs uppercase tracking-wider text-terminal-accent/50 mb-1">
              Avg / Day
            </p>
            <p className="text-xl font-bold font-mono text-terminal-accent">
              {hideBalances ? "••••" : formatCurrency(selectedWeek.total / 7)}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default WeeklyView;
