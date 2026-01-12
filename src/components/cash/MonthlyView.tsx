/**
 * MonthlyView Component
 *
 * Shows monthly spending overview:
 * - Month cards with totals
 * - Trend arrows (up/down compared to previous)
 * - Category breakdown per month
 */

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ParsedTransaction } from "@/lib/ai/bankStatementParser";

interface MonthlyViewProps {
  transactions: ParsedTransaction[];
  hideBalances: boolean;
}

interface MonthData {
  month: number;
  year: number;
  label: string;
  total: number;
  transactions: ParsedTransaction[];
  categories: Record<string, number>;
  changePercent: number | null;
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

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const MonthlyView: React.FC<MonthlyViewProps> = ({
  transactions,
  hideBalances,
}) => {
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  // Get last 6 months of data
  const monthsData = useMemo(() => {
    const months: MonthData[] = [];
    const now = new Date();

    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.getMonth();
      const year = date.getFullYear();

      const monthTransactions = transactions.filter((t) => {
        const tDate = new Date(t.date);
        return (
          tDate.getMonth() === month &&
          tDate.getFullYear() === year &&
          t.amount < 0
        );
      });

      const categories: Record<string, number> = {};
      monthTransactions.forEach((t) => {
        const cat = t.category || "Other";
        categories[cat] = (categories[cat] || 0) + Math.abs(t.amount);
      });

      const total = monthTransactions.reduce(
        (sum, t) => sum + Math.abs(t.amount),
        0,
      );

      months.push({
        month,
        year,
        label: `${MONTH_NAMES[month]} ${year}`,
        total,
        transactions: monthTransactions,
        categories,
        changePercent: null, // Will be calculated after
      });
    }

    // Calculate change percentages
    for (let i = 0; i < months.length - 1; i++) {
      const current = months[i].total;
      const previous = months[i + 1].total;
      if (previous > 0) {
        months[i].changePercent = ((current - previous) / previous) * 100;
      }
    }

    return months;
  }, [transactions]);

  const maxTotal = Math.max(...monthsData.map((m) => m.total), 1);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getMonthKey = (m: MonthData) => `${m.year}-${m.month}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-terminal-accent flex items-center gap-2">
          <BarChart3 size={20} />
          Monthly Overview
        </h3>
        <span className="text-sm text-terminal-accent/50">Last 6 months</span>
      </div>

      {/* Month Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {monthsData.map((month, index) => {
          const isExpanded = expandedMonth === getMonthKey(month);
          const sortedCategories = Object.entries(month.categories).sort(
            (a, b) => b[1] - a[1],
          );

          return (
            <motion.div
              key={getMonthKey(month)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "p-5 rounded-xl bg-surface-secondary border border-line/50",
                "hover:border-terminal-accent/30 transition-all duration-200",
                "cursor-pointer",
                isExpanded && "border-terminal-accent/50 bg-surface-secondary",
              )}
              onClick={() =>
                setExpandedMonth(isExpanded ? null : getMonthKey(month))
              }
            >
              {/* Month Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-terminal-accent/50">
                    {MONTH_NAMES[month.month]}
                  </p>
                  <p className="text-2xl font-bold font-mono text-terminal-accent">
                    {hideBalances ? "••••" : formatCurrency(month.total)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {month.changePercent !== null && (
                    <div
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                        month.changePercent > 5 && "bg-red-500/10 text-red-400",
                        month.changePercent < -5 &&
                          "bg-neon-green/10 text-neon-green",
                        Math.abs(month.changePercent) <= 5 &&
                          "bg-terminal-accent/10 text-terminal-accent/50",
                      )}
                    >
                      {month.changePercent > 5 && <TrendingUp size={12} />}
                      {month.changePercent < -5 && <TrendingDown size={12} />}
                      {Math.abs(month.changePercent) <= 5 && (
                        <Minus size={12} />
                      )}
                      {Math.abs(month.changePercent).toFixed(0)}%
                    </div>
                  )}
                  <ChevronRight
                    size={16}
                    className={cn(
                      "text-terminal-accent/30 transition-transform",
                      isExpanded && "rotate-90",
                    )}
                  />
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-2 bg-surface-primary rounded-full overflow-hidden mb-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(month.total / maxTotal) * 100}%` }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={cn(
                    "h-full rounded-full",
                    index === 0
                      ? "bg-terminal-accent"
                      : "bg-terminal-accent/40",
                  )}
                />
              </div>

              {/* Transaction Count */}
              <p className="text-xs text-terminal-accent/40">
                {month.transactions.length} transactions
              </p>

              {/* Expanded Category Breakdown */}
              <AnimatePresence>
                {isExpanded && sortedCategories.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 pt-4 border-t border-line/30"
                  >
                    <p className="text-xs uppercase tracking-wider text-terminal-accent/40 mb-3">
                      Categories
                    </p>
                    <div className="space-y-2">
                      {sortedCategories
                        .slice(0, 5)
                        .map(([category, amount]) => (
                          <div
                            key={category}
                            className="flex items-center gap-2"
                          >
                            <div
                              className={cn(
                                "w-2 h-2 rounded-full",
                                CATEGORY_COLORS[category] || "bg-slate-500",
                              )}
                            />
                            <span className="text-xs text-terminal-accent/60 flex-1 truncate">
                              {category}
                            </span>
                            <span className="text-xs font-mono text-terminal-accent">
                              {hideBalances ? "••••" : formatCurrency(amount)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-3 gap-4"
      >
        <div className="p-4 rounded-lg bg-surface-secondary border border-line/50 text-center">
          <p className="text-xs uppercase tracking-wider text-terminal-accent/50 mb-1">
            6-Month Total
          </p>
          <p className="text-xl font-bold font-mono text-terminal-accent">
            {hideBalances
              ? "••••"
              : formatCurrency(monthsData.reduce((sum, m) => sum + m.total, 0))}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-surface-secondary border border-line/50 text-center">
          <p className="text-xs uppercase tracking-wider text-terminal-accent/50 mb-1">
            Monthly Avg
          </p>
          <p className="text-xl font-bold font-mono text-terminal-accent">
            {hideBalances
              ? "••••"
              : formatCurrency(
                  monthsData.reduce((sum, m) => sum + m.total, 0) /
                    monthsData.length,
                )}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-surface-secondary border border-line/50 text-center">
          <p className="text-xs uppercase tracking-wider text-terminal-accent/50 mb-1">
            Highest Month
          </p>
          <p className="text-xl font-bold font-mono text-terminal-accent">
            {hideBalances ? "••••" : formatCurrency(maxTotal)}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default MonthlyView;
