/**
 * SummaryCards Component
 *
 * Displays 4 key metrics cards:
 * - This Month total spending
 * - Average per day
 * - Subscription costs
 * - Top category
 */

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Folder,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ParsedTransaction } from "@/lib/ai/bankStatementParser";
import type { RankedSubscription } from "@/lib/ai/subscriptionRanker";

interface SummaryCardsProps {
  transactions: ParsedTransaction[];
  subscriptions: RankedSubscription[];
  hideBalances: boolean;
  onCategoryClick?: (
    category: string,
    transactions: ParsedTransaction[],
  ) => void;
}

interface CardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  hideValue?: boolean;
  delay?: number;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  hideValue,
  delay = 0,
  onClick,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      onClick={onClick}
      className={cn(
        "p-6 rounded-xl bg-surface-secondary border border-line/50",
        "hover:border-terminal-accent/30 transition-all duration-200",
        "hover:shadow-lg hover:shadow-terminal-accent/5",
        onClick && "cursor-pointer",
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 rounded-lg bg-terminal-accent/10 text-terminal-accent">
          {icon}
        </div>
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trend === "up" && "text-red-400",
              trend === "down" && "text-neon-green",
              trend === "neutral" && "text-terminal-accent/50",
            )}
          >
            {trend === "up" && <TrendingUp size={12} />}
            {trend === "down" && <TrendingDown size={12} />}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wider text-terminal-accent/50">
          {title}
        </p>
        <p className="text-2xl font-bold font-mono text-terminal-accent">
          {hideValue ? "••••" : value}
        </p>
        {subtitle && (
          <p className="text-xs text-terminal-accent/40">{subtitle}</p>
        )}
      </div>
    </motion.div>
  );
};

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  transactions,
  subscriptions,
  hideBalances,
  onCategoryClick,
}) => {
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // All expense transactions (negative amounts)
    const allExpenses = transactions.filter((t) => t.amount < 0);

    // Filter to current month transactions for "This Month" card
    const thisMonthTransactions = allExpenses.filter((t) => {
      const date = new Date(t.date);
      return (
        date.getMonth() === currentMonth && date.getFullYear() === currentYear
      );
    });

    // Total this month
    const thisMonthTotal = thisMonthTransactions.reduce(
      (sum, t) => sum + Math.abs(t.amount),
      0,
    );

    // Calculate avg/day over ALL expenses (not just current month)
    let avgPerDay: number | null = null;
    if (allExpenses.length > 0) {
      const totalSpent = allExpenses.reduce(
        (sum, t) => sum + Math.abs(t.amount),
        0,
      );
      const dates = allExpenses.map((t) => new Date(t.date).getTime());
      const earliestDate = Math.min(...dates);
      const daysSpan = Math.ceil(
        (Date.now() - earliestDate) / (1000 * 60 * 60 * 24),
      );
      avgPerDay = daysSpan > 0 ? totalSpent / daysSpan : null;
    }

    // Subscription costs (monthly)
    const monthlySubscriptionCost = subscriptions.reduce((sum, sub) => {
      if (sub.frequency === "weekly") return sum + sub.amount * 4.33; // ~4.33 weeks per month
      if (sub.frequency === "monthly") return sum + sub.amount;
      if (sub.frequency === "yearly") return sum + sub.amount / 12;
      if (sub.frequency === "quarterly") return sum + sub.amount / 3;
      return sum;
    }, 0);

    // Top category from ALL expenses (not just current month)
    const categoryTotals: Record<string, number> = {};
    const categoryTransactions: Record<string, ParsedTransaction[]> = {};
    allExpenses.forEach((t) => {
      const cat = t.category || "Other";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(t.amount);
      if (!categoryTransactions[cat]) {
        categoryTransactions[cat] = [];
      }
      categoryTransactions[cat].push(t);
    });

    const topCategory =
      Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "N/A";

    const topCategoryTransactions = categoryTransactions[topCategory] || [];

    return {
      thisMonthTotal,
      avgPerDay,
      monthlySubscriptionCost,
      topCategory,
      topCategoryTransactions,
    };
  }, [transactions, subscriptions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card
        title="This Month"
        value={formatCurrency(stats.thisMonthTotal)}
        subtitle={`${transactions.length} transactions`}
        icon={<DollarSign size={20} />}
        hideValue={hideBalances}
        delay={0}
      />
      <Card
        title="Avg / Day"
        value={
          stats.avgPerDay !== null ? formatCurrency(stats.avgPerDay) : "---"
        }
        subtitle={
          stats.avgPerDay !== null ? "All-time average" : "Need more data"
        }
        icon={<TrendingUp size={20} />}
        hideValue={hideBalances}
        delay={0.05}
      />
      <Card
        title="Subscriptions"
        value={formatCurrency(stats.monthlySubscriptionCost)}
        subtitle={`${subscriptions.length} active`}
        icon={<CreditCard size={20} />}
        hideValue={hideBalances}
        delay={0.1}
      />
      <Card
        title="Top Category"
        value={stats.topCategory}
        subtitle="Highest spending"
        icon={<Folder size={20} />}
        delay={0.15}
        onClick={
          onCategoryClick && stats.topCategory !== "N/A"
            ? () =>
                onCategoryClick(
                  stats.topCategory,
                  stats.topCategoryTransactions,
                )
            : undefined
        }
      />
    </div>
  );
};

export default SummaryCards;
