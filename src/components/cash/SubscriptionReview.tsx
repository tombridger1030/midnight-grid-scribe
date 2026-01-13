/**
 * SubscriptionReview Component
 *
 * Displays all detected subscriptions with filtering, sorting,
 * and summary statistics.
 */

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign,
  TrendingDown,
  Filter,
  ArrowUpDown,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SubscriptionCard } from "./SubscriptionCard";
import { SubscriptionDetailModal } from "./SubscriptionDetailModal";
import type { RankedSubscription } from "@/lib/ai/subscriptionRanker";
import {
  getRankingSummary,
  sortByImportanceAndCost,
} from "@/lib/ai/subscriptionRanker";
import type { MerchantCategory } from "@/lib/ai/knownMerchants";

interface SubscriptionReviewProps {
  subscriptions: RankedSubscription[];
  hideBalances: boolean;
  isLoading?: boolean;
  onUpdateName: (id: string, newName: string) => void;
  onUpdateImportance: (id: string, importance: 1 | 2 | 3 | 4 | 5) => void;
  onDismissSuggestion: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggleCancelled?: (id: string, cancelled: boolean) => void;
  onUpdateCategory?: (id: string, category: MerchantCategory) => void;
}

type SortOption =
  | "importance-asc"
  | "importance-desc"
  | "cost-high"
  | "cost-low";
type FilterOption = "all" | "cancel" | "keep" | "cancelled" | MerchantCategory;

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "importance-asc", label: "Priority (cancel first)" },
  { value: "importance-desc", label: "Priority (keep first)" },
  { value: "cost-high", label: "Cost (highest first)" },
  { value: "cost-low", label: "Cost (lowest first)" },
];

const FILTER_OPTIONS: { value: FilterOption; label: string }[] = [
  { value: "all", label: "All Subscriptions" },
  { value: "cancelled", label: "Cancelled" },
  { value: "cancel", label: "Consider Canceling" },
  { value: "keep", label: "Essential" },
  { value: "entertainment", label: "Entertainment" },
  { value: "productivity", label: "Productivity" },
  { value: "utilities", label: "Utilities" },
  { value: "finance", label: "Finance" },
];

export const SubscriptionReview: React.FC<SubscriptionReviewProps> = ({
  subscriptions,
  hideBalances,
  isLoading,
  onUpdateName,
  onUpdateImportance,
  onDismissSuggestion,
  onDelete,
  onToggleCancelled,
  onUpdateCategory,
}) => {
  const [sortBy, setSortBy] = useState<SortOption>("importance-asc");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [selectedSubscription, setSelectedSubscription] =
    useState<RankedSubscription | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Calculate summary statistics
  const summary = useMemo(
    () => getRankingSummary(subscriptions),
    [subscriptions],
  );

  // Calculate cancelled savings
  const cancelledSavings = useMemo(() => {
    const cancelledSubs = subscriptions.filter((s) => s.isCancelled);
    return {
      count: cancelledSubs.length,
      annualSavings: cancelledSubs.reduce((sum, s) => sum + s.annualCost, 0),
    };
  }, [subscriptions]);

  // Filter subscriptions
  const filteredSubscriptions = useMemo(() => {
    let filtered = [...subscriptions];

    switch (filterBy) {
      case "cancelled":
        filtered = filtered.filter((s) => s.isCancelled);
        break;
      case "cancel":
        filtered = filtered.filter((s) => s.importance <= 2 && !s.isCancelled);
        break;
      case "keep":
        filtered = filtered.filter((s) => s.importance >= 4);
        break;
      case "entertainment":
      case "productivity":
      case "utilities":
      case "finance":
        filtered = filtered.filter((s) => s.category === filterBy);
        break;
      default:
        break;
    }

    return filtered;
  }, [subscriptions, filterBy]);

  // Sort subscriptions
  const sortedSubscriptions = useMemo(() => {
    const sorted = [...filteredSubscriptions];

    switch (sortBy) {
      case "importance-asc":
        return sortByImportanceAndCost(sorted, true);
      case "importance-desc":
        return sortByImportanceAndCost(sorted, false);
      case "cost-high":
        return sorted.sort((a, b) => b.annualCost - a.annualCost);
      case "cost-low":
        return sorted.sort((a, b) => a.annualCost - b.annualCost);
      default:
        return sorted;
    }
  }, [filteredSubscriptions, sortBy]);

  const formatCurrency = (value: number): string => {
    if (hideBalances) return "•••••";
    return `$${value.toLocaleString("en-CA", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="mb-4"
        >
          <Sparkles size={32} className="text-terminal-accent" />
        </motion.div>
        <p className="text-terminal-accent/60">Analyzing subscriptions...</p>
        <p className="text-sm text-terminal-accent/40 mt-1">
          AI is ranking by importance
        </p>
      </div>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <div className="text-center py-16 text-terminal-accent/40">
        <DollarSign size={48} className="mx-auto mb-4 opacity-50" />
        <p>No subscriptions detected</p>
        <p className="text-sm mt-1">
          Upload a bank statement to find recurring charges
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Annual Cost */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-lg bg-surface-secondary border border-line"
        >
          <div className="flex items-center gap-2 text-terminal-accent/60 mb-2">
            <DollarSign size={16} />
            <span className="text-sm uppercase tracking-wider">
              Annual Subscription Cost
            </span>
          </div>
          <div className="text-3xl font-bold font-mono text-terminal-accent">
            {formatCurrency(summary.totalAnnualCost)}
          </div>
          <div className="text-sm text-terminal-accent/50 mt-1">
            {formatCurrency(summary.totalAnnualCost / 12)}/month avg
          </div>
        </motion.div>

        {/* Potential Savings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={cn(
            "p-5 rounded-lg border",
            summary.potentialSavings > 0
              ? "bg-orange-500/5 border-orange-500/30"
              : "bg-surface-secondary border-line",
          )}
        >
          <div className="flex items-center gap-2 text-orange-400/80 mb-2">
            <TrendingDown size={16} />
            <span className="text-sm uppercase tracking-wider">
              Potential Savings
            </span>
          </div>
          <div className="text-3xl font-bold font-mono text-orange-400">
            {formatCurrency(summary.potentialSavings)}
          </div>
          <div className="text-sm text-terminal-accent/50 mt-1">
            {summary.countByImportance[1] + summary.countByImportance[2]}{" "}
            subscription(s) to review
          </div>
        </motion.div>

        {/* Subscription Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-lg bg-surface-secondary border border-line"
        >
          <div className="flex items-center gap-2 text-terminal-accent/60 mb-2">
            <Filter size={16} />
            <span className="text-sm uppercase tracking-wider">Breakdown</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-green-400" />
                <span className="text-terminal-accent/70">Essential</span>
              </span>
              <span className="font-mono text-terminal-accent">
                {summary.countByImportance[4] + summary.countByImportance[5]}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-400/50" />
                <span className="text-terminal-accent/70">Moderate</span>
              </span>
              <span className="font-mono text-terminal-accent">
                {summary.countByImportance[3]}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <AlertCircle size={12} className="text-orange-400" />
                <span className="text-terminal-accent/70">Review</span>
              </span>
              <span className="font-mono text-terminal-accent">
                {summary.countByImportance[1] + summary.countByImportance[2]}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Cancelled Savings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={cn(
            "p-5 rounded-lg border",
            cancelledSavings.count > 0
              ? "bg-green-500/5 border-green-500/30"
              : "bg-surface-secondary border-line",
          )}
        >
          <div className="flex items-center gap-2 text-green-400/80 mb-2">
            <CheckCircle2 size={16} />
            <span className="text-sm uppercase tracking-wider">
              Cancelled Savings
            </span>
          </div>
          <div className="text-3xl font-bold font-mono text-green-400">
            {formatCurrency(cancelledSavings.annualSavings)}
          </div>
          <div className="text-sm text-terminal-accent/50 mt-1">
            {cancelledSavings.count} subscription(s) cancelled
          </div>
        </motion.div>
      </div>

      {/* Filter and Sort Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-terminal-accent/60" />
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as FilterOption)}
              className="px-3 py-1.5 bg-surface-tertiary border border-line rounded
                         text-terminal-accent text-sm cursor-pointer
                         focus:outline-none focus:border-terminal-accent"
            >
              {FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <ArrowUpDown size={14} className="text-terminal-accent/60" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-1.5 bg-surface-tertiary border border-line rounded
                         text-terminal-accent text-sm cursor-pointer
                         focus:outline-none focus:border-terminal-accent"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-sm text-terminal-accent/50">
          Showing {sortedSubscriptions.length} of {subscriptions.length}{" "}
          subscriptions
        </div>
      </div>

      {/* Subscription List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {sortedSubscriptions.map((subscription, index) => (
            <motion.div
              key={subscription.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: index * 0.03 }}
              layout
            >
              <SubscriptionCard
                subscription={subscription}
                hideBalances={hideBalances}
                onUpdateName={onUpdateName}
                onUpdateImportance={onUpdateImportance}
                onDismissSuggestion={onDismissSuggestion}
                onDelete={onDelete}
                onClick={() => {
                  setSelectedSubscription(subscription);
                  setIsModalOpen(true);
                }}
                onToggleCancelled={onToggleCancelled}
                onUpdateCategory={onUpdateCategory}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {sortedSubscriptions.length === 0 && (
          <div className="text-center py-8 text-terminal-accent/40">
            <p>No subscriptions match your filter</p>
          </div>
        )}
      </div>

      {/* AI Analysis Note */}
      {subscriptions.some((s) => s.aiReason) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-start gap-2 p-4 rounded-lg bg-terminal-accent/5 border border-terminal-accent/10"
        >
          <Sparkles size={16} className="text-terminal-accent/60 mt-0.5" />
          <div className="text-sm text-terminal-accent/60">
            <span className="font-medium">AI Analysis:</span> Subscriptions have
            been ranked by Claude AI based on typical importance levels. Click
            the stars to override any ranking.
          </div>
        </motion.div>
      )}

      {/* Subscription Detail Modal */}
      <SubscriptionDetailModal
        subscription={selectedSubscription}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedSubscription(null);
        }}
        hideBalances={hideBalances}
      />
    </div>
  );
};

export default SubscriptionReview;
