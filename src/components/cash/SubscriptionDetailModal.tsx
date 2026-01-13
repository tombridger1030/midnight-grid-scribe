/**
 * SubscriptionDetailModal Component
 *
 * Modal popup showing detailed subscription information
 * including all transaction history.
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  RefreshCw,
  DollarSign,
  Star,
  Clock,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RankedSubscription } from "@/lib/ai/subscriptionRanker";
import {
  getRankingLabel,
  getRankingColor,
  getRankingBgColor,
} from "@/lib/ai/subscriptionRanker";

interface SubscriptionDetailModalProps {
  subscription: RankedSubscription | null;
  isOpen: boolean;
  onClose: () => void;
  hideBalances: boolean;
}

// Category icons
function getCategoryIcon(category?: string): string {
  switch (category) {
    case "entertainment":
      return "Film";
    case "gaming":
      return "Gamepad";
    case "productivity":
      return "Briefcase";
    case "utilities":
      return "Zap";
    case "finance":
      return "CreditCard";
    case "health":
      return "Heart";
    case "education":
      return "BookOpen";
    case "news":
      return "Newspaper";
    case "lifestyle":
      return "Sparkles";
    case "food":
      return "UtensilsCrossed";
    case "shopping":
      return "ShoppingCart";
    case "transportation":
      return "Car";
    default:
      return "Package";
  }
}

// Frequency label
function getFrequencyLabel(frequency: string): string {
  switch (frequency) {
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
    case "quarterly":
      return "Quarterly";
    case "yearly":
      return "Yearly";
    default:
      return frequency;
  }
}

export const SubscriptionDetailModal: React.FC<
  SubscriptionDetailModalProps
> = ({ subscription, isOpen, onClose, hideBalances }) => {
  const formatCurrency = (value: number): string => {
    if (hideBalances) return "$***.**";
    return `$${value.toLocaleString("en-CA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!subscription) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
            className="bg-black/60 backdrop-blur-sm z-[9999]"
          />

          {/* Modal Container - fixed centering */}
          <div
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
            className="flex items-center justify-center z-[9999] pointer-events-none p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-lg max-h-[90vh] overflow-hidden
                         bg-surface-primary border border-line rounded-xl shadow-2xl pointer-events-auto"
            >
              {/* Header */}
              <div className="flex items-start justify-between p-5 border-b border-line">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-terminal-accent truncate">
                    {subscription.displayName}
                  </h2>
                  <div className="flex items-center gap-3 mt-1">
                    {subscription.category && (
                      <span className="text-sm text-terminal-accent/60 capitalize">
                        {subscription.category}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-sm text-terminal-accent/60">
                      <RefreshCw size={12} />
                      {getFrequencyLabel(subscription.frequency)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-terminal-accent/60 hover:text-terminal-accent
                           hover:bg-surface-secondary rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 overflow-y-auto max-h-[calc(90vh-180px)]">
                {/* Amount Summary */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-surface-secondary border border-line">
                    <div className="flex items-center gap-2 text-terminal-accent/60 text-sm mb-1">
                      <DollarSign size={14} />
                      Per {subscription.frequency.replace("ly", "")}
                    </div>
                    <div className="text-2xl font-bold font-mono text-terminal-accent">
                      {formatCurrency(subscription.amount)}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-surface-secondary border border-line">
                    <div className="flex items-center gap-2 text-terminal-accent/60 text-sm mb-1">
                      <TrendingUp size={14} />
                      Annual Cost
                    </div>
                    <div className="text-2xl font-bold font-mono text-terminal-accent">
                      {formatCurrency(subscription.annualCost)}
                    </div>
                  </div>
                </div>

                {/* Importance Rating */}
                <div className="mb-6 p-4 rounded-lg bg-surface-secondary border border-line">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <Star
                            key={level}
                            size={16}
                            className={cn(
                              level <= subscription.importance
                                ? getRankingColor(subscription.importance)
                                : "text-terminal-accent/20",
                            )}
                            fill={
                              level <= subscription.importance
                                ? "currentColor"
                                : "none"
                            }
                          />
                        ))}
                      </div>
                      <span
                        className={cn(
                          "text-sm px-2 py-0.5 rounded",
                          getRankingBgColor(subscription.importance),
                          getRankingColor(subscription.importance),
                        )}
                      >
                        {getRankingLabel(subscription.importance)}
                      </span>
                    </div>
                  </div>
                  {subscription.aiReason && (
                    <p className="mt-2 text-sm text-terminal-accent/70">
                      {subscription.aiReason}
                    </p>
                  )}
                </div>

                {/* Next Charge */}
                {subscription.nextExpected && (
                  <div className="mb-6 flex items-center gap-2 p-3 rounded-lg bg-terminal-accent/5 border border-terminal-accent/10">
                    <Clock size={16} className="text-terminal-accent/60" />
                    <span className="text-sm text-terminal-accent/70">
                      Next expected charge:{" "}
                      <span className="font-medium text-terminal-accent">
                        {formatDate(subscription.nextExpected)}
                      </span>
                    </span>
                  </div>
                )}

                {/* Transaction History */}
                <div>
                  <h3 className="text-sm font-medium text-terminal-accent/60 uppercase tracking-wider mb-3">
                    Transaction History ({subscription.transactions.length})
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {subscription.transactions.length > 0 ? (
                      subscription.transactions.map((txn, idx) => (
                        <div
                          key={idx}
                          className="py-3 px-3 bg-surface-secondary rounded-lg border border-line/50"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Calendar
                                size={14}
                                className="text-terminal-accent/40"
                              />
                              <span className="text-sm text-terminal-accent/80">
                                {formatDate(txn.date)}
                              </span>
                            </div>
                            <span className="font-mono font-medium text-terminal-accent">
                              {formatCurrency(Math.abs(txn.amount))}
                            </span>
                          </div>
                          <div className="text-xs text-terminal-accent/50 truncate pl-6">
                            {txn.description}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-terminal-accent/40 text-sm">
                        No transaction history available
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-line bg-surface-secondary">
                <button
                  onClick={onClose}
                  className="w-full py-2.5 rounded-lg bg-terminal-accent text-black
                           font-medium hover:bg-terminal-accent/90 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SubscriptionDetailModal;
