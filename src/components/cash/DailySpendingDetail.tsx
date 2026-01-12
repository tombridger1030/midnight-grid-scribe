/**
 * DailySpendingDetail Component
 *
 * Shows detailed breakdown of spending for a selected day.
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, DollarSign, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Expense } from "./ExpensesTab";

interface DailySpendingDetailProps {
  date: string;
  expenses: Expense[];
  hideBalances: boolean;
  onClose: () => void;
}

// Group expenses by category
function groupByCategory(expenses: Expense[]): Map<string, Expense[]> {
  const groups = new Map<string, Expense[]>();

  expenses.forEach((exp) => {
    const category = exp.category || "Uncategorized";
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category)!.push(exp);
  });

  return groups;
}

// Get category color
function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    Food: "bg-orange-500/20 text-orange-400",
    Transportation: "bg-blue-500/20 text-blue-400",
    Entertainment: "bg-purple-500/20 text-purple-400",
    Shopping: "bg-pink-500/20 text-pink-400",
    Utilities: "bg-cyan-500/20 text-cyan-400",
    Health: "bg-green-500/20 text-green-400",
    Education: "bg-indigo-500/20 text-indigo-400",
    Uncategorized: "bg-gray-500/20 text-gray-400",
  };

  return colors[category] || colors.Uncategorized;
}

export const DailySpendingDetail: React.FC<DailySpendingDetailProps> = ({
  date,
  expenses,
  hideBalances,
  onClose,
}) => {
  const dayExpenses = expenses.filter((e) => e.date === date);
  const total = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const groupedExpenses = groupByCategory(dayExpenses);

  const formatCurrency = (value: number): string => {
    if (hideBalances) return "•••••";
    return `$${value.toLocaleString("en-CA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formattedDate = new Date(date + "T12:00:00").toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    },
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="p-4 rounded-lg bg-surface-secondary border border-line"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 text-terminal-accent/60 text-sm mb-1">
              <Calendar size={14} />
              <span>Daily Breakdown</span>
            </div>
            <h3 className="font-bold text-terminal-accent">{formattedDate}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-terminal-accent/50 hover:text-terminal-accent
                       hover:bg-terminal-accent/10 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Total */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-surface-primary mb-4">
          <div className="flex items-center gap-2 text-terminal-accent/70">
            <DollarSign size={16} />
            <span>Total Spent</span>
          </div>
          <div className="text-xl font-bold font-mono text-terminal-accent">
            {formatCurrency(total)}
          </div>
        </div>

        {/* Expense List */}
        {dayExpenses.length > 0 ? (
          <div className="space-y-4">
            {Array.from(groupedExpenses.entries()).map(
              ([category, categoryExpenses]) => (
                <div key={category}>
                  {/* Category Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <Tag size={12} className="text-terminal-accent/50" />
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        getCategoryColor(category),
                      )}
                    >
                      {category}
                    </span>
                    <span className="text-xs text-terminal-accent/50">
                      ({categoryExpenses.length})
                    </span>
                  </div>

                  {/* Category Expenses */}
                  <div className="space-y-1">
                    {categoryExpenses.map((expense) => (
                      <motion.div
                        key={expense.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between py-2 px-3
                                   rounded bg-surface-primary/50
                                   border border-line/30"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-terminal-accent truncate">
                            {expense.item}
                          </p>
                          <p className="text-xs text-terminal-accent/50">
                            {expense.account}
                          </p>
                        </div>
                        <span className="font-mono text-terminal-accent font-medium ml-3">
                          {formatCurrency(expense.amount)}
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Category Total */}
                  <div className="flex justify-end mt-1 pr-3">
                    <span className="text-xs text-terminal-accent/50">
                      Subtotal:{" "}
                      {formatCurrency(
                        categoryExpenses.reduce((sum, e) => sum + e.amount, 0),
                      )}
                    </span>
                  </div>
                </div>
              ),
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-terminal-accent/40">
            <DollarSign size={32} className="mx-auto mb-2 opacity-50" />
            <p>No spending recorded</p>
            <p className="text-sm mt-1">This day has no transactions</p>
          </div>
        )}

        {/* Quick Stats */}
        {dayExpenses.length > 0 && (
          <div className="mt-4 pt-4 border-t border-line/50 grid grid-cols-2 gap-3">
            <div className="text-center p-2 rounded bg-surface-primary/50">
              <p className="text-lg font-bold font-mono text-terminal-accent">
                {dayExpenses.length}
              </p>
              <p className="text-xs text-terminal-accent/50">Transactions</p>
            </div>
            <div className="text-center p-2 rounded bg-surface-primary/50">
              <p className="text-lg font-bold font-mono text-terminal-accent">
                {formatCurrency(total / dayExpenses.length)}
              </p>
              <p className="text-xs text-terminal-accent/50">Avg per item</p>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default DailySpendingDetail;
