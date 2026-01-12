/**
 * DailySpendingCalendar Component
 *
 * Heat map calendar showing daily spending for the current month.
 * Days are colored based on spending amount.
 */

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Expense } from "./ExpensesTab";

interface DailySpendingCalendarProps {
  expenses: Expense[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  hideBalances: boolean;
}

interface DayData {
  date: string;
  dayOfMonth: number;
  total: number;
  count: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
}

// Get calendar days for a month (including padding days from prev/next months)
function getCalendarDays(year: number, month: number): DayData[] {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const days: DayData[] = [];

  // Padding days from previous month
  const startPadding = firstDay.getDay(); // 0 = Sunday
  for (let i = startPadding - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({
      date: d.toISOString().slice(0, 10),
      dayOfMonth: d.getDate(),
      total: 0,
      count: 0,
      isCurrentMonth: false,
      isToday: false,
      isFuture: d > today,
    });
  }

  // Current month days
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const d = new Date(year, month, i);
    const dateStr = d.toISOString().slice(0, 10);
    days.push({
      date: dateStr,
      dayOfMonth: i,
      total: 0,
      count: 0,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isFuture: d > today,
    });
  }

  // Padding days from next month
  const endPadding = 42 - days.length; // 6 rows × 7 days
  for (let i = 1; i <= endPadding; i++) {
    const d = new Date(year, month + 1, i);
    days.push({
      date: d.toISOString().slice(0, 10),
      dayOfMonth: i,
      total: 0,
      count: 0,
      isCurrentMonth: false,
      isToday: false,
      isFuture: true,
    });
  }

  return days;
}

// Get heat color based on spending relative to max
function getHeatColor(amount: number, maxAmount: number): string {
  if (amount === 0) return "bg-surface-tertiary";

  const intensity = Math.min(amount / maxAmount, 1);

  if (intensity < 0.2) return "bg-green-900/40";
  if (intensity < 0.4) return "bg-green-800/50";
  if (intensity < 0.6) return "bg-yellow-800/50";
  if (intensity < 0.8) return "bg-orange-800/50";
  return "bg-red-800/60";
}

export const DailySpendingCalendar: React.FC<DailySpendingCalendarProps> = ({
  expenses,
  selectedDate,
  onSelectDate,
  hideBalances,
}) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  // Get calendar structure
  const days = getCalendarDays(year, month);

  // Aggregate expenses by date
  const expensesByDate = new Map<string, { total: number; count: number }>();
  expenses.forEach((exp) => {
    const existing = expensesByDate.get(exp.date) || { total: 0, count: 0 };
    expensesByDate.set(exp.date, {
      total: existing.total + exp.amount,
      count: existing.count + 1,
    });
  });

  // Populate days with expense data
  days.forEach((day) => {
    const data = expensesByDate.get(day.date);
    if (data) {
      day.total = data.total;
      day.count = data.count;
    }
  });

  // Find max spending for heat calculation
  const maxSpending = Math.max(...days.map((d) => d.total), 1);

  // Month total
  const monthTotal = expenses
    .filter((e) =>
      e.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`),
    )
    .reduce((sum, e) => sum + e.amount, 0);

  const formatCurrency = (value: number): string => {
    if (hideBalances) return "•••";
    return `$${value.toLocaleString("en-CA", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-lg bg-surface-secondary border border-line"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-terminal-accent">
            {today.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </h3>
          <p className="text-sm text-terminal-accent/60">
            Daily spending breakdown
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold font-mono text-terminal-accent">
            {formatCurrency(monthTotal)}
          </div>
          <p className="text-xs text-terminal-accent/50">this month</p>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs text-terminal-accent/50 py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => (
          <motion.button
            key={day.date}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.01 }}
            onClick={() =>
              day.isCurrentMonth && !day.isFuture && onSelectDate(day.date)
            }
            disabled={!day.isCurrentMonth || day.isFuture}
            className={cn(
              "aspect-square rounded-md flex flex-col items-center justify-center",
              "text-sm transition-all relative",
              day.isCurrentMonth
                ? day.isFuture
                  ? "bg-surface-tertiary/30 text-terminal-accent/20 cursor-not-allowed"
                  : cn(
                      getHeatColor(day.total, maxSpending),
                      "cursor-pointer hover:ring-2 hover:ring-terminal-accent/50",
                      selectedDate === day.date &&
                        "ring-2 ring-terminal-accent",
                    )
                : "bg-transparent text-terminal-accent/10 cursor-not-allowed",
              day.isToday && "ring-1 ring-terminal-accent/60",
            )}
            title={
              day.isCurrentMonth && !day.isFuture
                ? `${formatCurrency(day.total)} (${day.count} transactions)`
                : undefined
            }
          >
            <span
              className={cn(
                "font-medium",
                day.isCurrentMonth
                  ? day.total > 0
                    ? "text-white/90"
                    : "text-terminal-accent/70"
                  : "text-terminal-accent/20",
              )}
            >
              {day.dayOfMonth}
            </span>
            {day.isCurrentMonth && day.total > 0 && !hideBalances && (
              <span className="text-[8px] text-white/70 font-mono">
                ${Math.round(day.total)}
              </span>
            )}
            {day.isToday && (
              <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-terminal-accent" />
            )}
          </motion.button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 mt-4 text-xs text-terminal-accent/50">
        <span>Less</span>
        <div className="flex gap-0.5">
          <div className="w-3 h-3 rounded bg-surface-tertiary" />
          <div className="w-3 h-3 rounded bg-green-900/40" />
          <div className="w-3 h-3 rounded bg-yellow-800/50" />
          <div className="w-3 h-3 rounded bg-orange-800/50" />
          <div className="w-3 h-3 rounded bg-red-800/60" />
        </div>
        <span>More</span>
      </div>
    </motion.div>
  );
};

export default DailySpendingCalendar;
