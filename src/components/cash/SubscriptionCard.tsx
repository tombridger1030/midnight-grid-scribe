/**
 * SubscriptionCard Component
 *
 * Displays a single subscription with clean vendor name, amount,
 * frequency, importance rating, and AI recommendations.
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  Edit3,
  Check,
  X,
  Calendar,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RankedSubscription } from "@/lib/ai/subscriptionRanker";
import {
  getRankingLabel,
  getRankingColor,
  getRankingBgColor,
} from "@/lib/ai/subscriptionRanker";

interface SubscriptionCardProps {
  subscription: RankedSubscription;
  hideBalances: boolean;
  onUpdateName: (id: string, newName: string) => void;
  onUpdateImportance: (id: string, importance: 1 | 2 | 3 | 4 | 5) => void;
  onDismissSuggestion?: (id: string) => void;
}

// Category icons/emojis
function getCategoryIcon(category?: string): string {
  switch (category) {
    case "entertainment":
      return "🎬";
    case "gaming":
      return "🎮";
    case "productivity":
      return "💼";
    case "utilities":
      return "⚡";
    case "finance":
      return "💳";
    case "health":
      return "🏥";
    case "education":
      return "📚";
    case "news":
      return "📰";
    case "lifestyle":
      return "🌟";
    case "food":
      return "🍔";
    case "shopping":
      return "🛒";
    case "transportation":
      return "🚗";
    default:
      return "📦";
  }
}

// Frequency label
function getFrequencyLabel(frequency: string): string {
  switch (frequency) {
    case "weekly":
      return "/week";
    case "monthly":
      return "/mo";
    case "quarterly":
      return "/qtr";
    case "yearly":
      return "/yr";
    default:
      return "";
  }
}

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  hideBalances,
  onUpdateName,
  onUpdateImportance,
  onDismissSuggestion,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(subscription.displayName);
  const [showDetails, setShowDetails] = useState(false);

  const formatCurrency = (value: number): string => {
    if (hideBalances) return "•••••";
    return `$${value.toLocaleString("en-CA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const handleSaveName = () => {
    if (editedName.trim() && editedName !== subscription.displayName) {
      onUpdateName(subscription.id, editedName.trim());
    }
    setIsEditingName(false);
  };

  const handleCancelEdit = () => {
    setEditedName(subscription.displayName);
    setIsEditingName(false);
  };

  // Importance stars component
  const ImportanceStars = () => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((level) => (
        <button
          key={level}
          onClick={() =>
            onUpdateImportance(subscription.id, level as 1 | 2 | 3 | 4 | 5)
          }
          className={cn(
            "p-0.5 transition-colors",
            level <= subscription.importance
              ? getRankingColor(subscription.importance)
              : "text-terminal-accent/20 hover:text-terminal-accent/40",
          )}
          title={`Set importance to ${level}`}
        >
          <Star
            size={14}
            fill={level <= subscription.importance ? "currentColor" : "none"}
          />
        </button>
      ))}
    </div>
  );

  const showCancelWarning =
    subscription.importance <= 2 && subscription.cancelRecommendation;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative rounded-lg border transition-colors group",
        "bg-surface-secondary",
        showCancelWarning
          ? "border-orange-500/30 hover:border-orange-500/50"
          : "border-line hover:border-terminal-accent/30",
      )}
    >
      {/* Main Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Icon, Name, Category */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="text-2xl mt-0.5 shrink-0">
              {getCategoryIcon(subscription.category)}
            </div>
            <div className="flex-1 min-w-0">
              {/* Name Row */}
              <div className="flex items-center gap-2">
                {isEditingName ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveName();
                        if (e.key === "Escape") handleCancelEdit();
                      }}
                      autoFocus
                      className="px-2 py-0.5 bg-surface-tertiary border border-terminal-accent
                                 rounded text-terminal-accent font-medium
                                 focus:outline-none w-40"
                    />
                    <button
                      onClick={handleSaveName}
                      className="p-1 text-[#5FE3B3] hover:bg-[#5FE3B3]/20 rounded"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-1 text-terminal-accent/60 hover:bg-terminal-accent/20 rounded"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-bold text-terminal-accent truncate">
                      {subscription.displayName}
                    </span>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="p-1 text-terminal-accent/30 hover:text-terminal-accent/70
                                 opacity-0 group-hover:opacity-100 transition-all rounded"
                      title="Edit name"
                    >
                      <Edit3 size={12} />
                    </button>
                  </>
                )}
              </div>

              {/* Category and Frequency */}
              <div className="flex items-center gap-2 mt-1">
                {subscription.category && (
                  <span className="text-xs text-terminal-accent/50 capitalize">
                    {subscription.category}
                  </span>
                )}
                <span className="text-xs text-terminal-accent/30">•</span>
                <div className="flex items-center gap-1 text-xs text-terminal-accent/50">
                  <RefreshCw size={10} />
                  <span className="capitalize">{subscription.frequency}</span>
                </div>
              </div>

              {/* Importance Stars */}
              <div className="mt-2 flex items-center gap-2">
                <ImportanceStars />
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded",
                    getRankingBgColor(subscription.importance),
                    getRankingColor(subscription.importance),
                  )}
                >
                  {getRankingLabel(subscription.importance)}
                </span>
                {subscription.isUserOverride && (
                  <span className="text-xs text-terminal-accent/40">
                    (custom)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Amount and Annual Cost */}
          <div className="text-right shrink-0">
            <div className="font-mono font-bold text-terminal-accent text-lg">
              {formatCurrency(subscription.amount)}
              <span className="text-sm text-terminal-accent/60">
                {getFrequencyLabel(subscription.frequency)}
              </span>
            </div>
            <div className="text-sm text-terminal-accent/50 mt-1">
              {formatCurrency(subscription.annualCost)}/year
            </div>
            {subscription.nextExpected && (
              <div className="flex items-center justify-end gap-1 mt-1 text-xs text-terminal-accent/40">
                <Calendar size={10} />
                <span>
                  Next:{" "}
                  {new Date(subscription.nextExpected).toLocaleDateString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                    },
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Cancel Warning */}
        {showCancelWarning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-3 pt-3 border-t border-orange-500/20"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle
                size={14}
                className="text-orange-400 mt-0.5 shrink-0"
              />
              <div className="flex-1">
                <p className="text-sm text-orange-300">
                  {subscription.cancelRecommendation || subscription.aiReason}
                </p>
                {onDismissSuggestion && (
                  <button
                    onClick={() => onDismissSuggestion(subscription.id)}
                    className="text-xs text-terminal-accent/50 hover:text-terminal-accent/70 mt-1"
                  >
                    Dismiss suggestion
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Expand Button for Transaction History */}
        {subscription.transactions.length > 0 && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 mt-3 text-xs text-terminal-accent/50
                       hover:text-terminal-accent/70 transition-colors"
          >
            {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {subscription.transactions.length} transactions
          </button>
        )}
      </div>

      {/* Transaction History */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-line/50 overflow-hidden"
          >
            <div className="p-3 bg-surface-primary/50 max-h-40 overflow-y-auto">
              {subscription.transactions.map((txn, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-1.5 text-sm
                             border-b border-line/30 last:border-b-0"
                >
                  <span className="text-terminal-accent/60">
                    {new Date(txn.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span className="font-mono text-terminal-accent/80">
                    {formatCurrency(Math.abs(txn.amount))}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confidence Indicator */}
      {subscription.confidence < 0.8 && (
        <div
          className="absolute top-2 right-2 w-2 h-2 rounded-full bg-yellow-500/50"
          title={`Detection confidence: ${(subscription.confidence * 100).toFixed(0)}%`}
        />
      )}
    </motion.div>
  );
};

export default SubscriptionCard;
