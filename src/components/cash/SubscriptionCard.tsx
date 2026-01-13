/**
 * SubscriptionCard Component
 *
 * Displays a single subscription with clean vendor name, amount,
 * frequency, importance rating, and AI recommendations.
 */

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Star,
  Edit3,
  Check,
  X,
  Calendar,
  RefreshCw,
  AlertTriangle,
  Trash2,
  CheckCircle,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RankedSubscription } from "@/lib/ai/subscriptionRanker";
import {
  getRankingLabel,
  getRankingColor,
  getRankingBgColor,
} from "@/lib/ai/subscriptionRanker";
import type { MerchantCategory } from "@/lib/ai/knownMerchants";

interface SubscriptionCardProps {
  subscription: RankedSubscription;
  hideBalances: boolean;
  onUpdateName: (id: string, newName: string) => void;
  onUpdateImportance: (id: string, importance: 1 | 2 | 3 | 4 | 5) => void;
  onDismissSuggestion?: (id: string) => void;
  onDelete?: (id: string) => void;
  onClick?: () => void;
  onToggleCancelled?: (id: string, cancelled: boolean) => void;
  onUpdateCategory?: (id: string, category: MerchantCategory) => void;
}

// Available categories for dropdown
const CATEGORY_OPTIONS: { value: MerchantCategory; label: string }[] = [
  { value: "entertainment", label: "Entertainment" },
  { value: "gaming", label: "Gaming" },
  { value: "productivity", label: "Productivity" },
  { value: "utilities", label: "Utilities" },
  { value: "finance", label: "Finance" },
  { value: "health", label: "Health" },
  { value: "education", label: "Education" },
  { value: "news", label: "News" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "food", label: "Food" },
  { value: "shopping", label: "Shopping" },
  { value: "transportation", label: "Transportation" },
  { value: "other", label: "Other" },
];

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
  onDelete,
  onClick,
  onToggleCancelled,
  onUpdateCategory,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(subscription.displayName);

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
          onClick={(e) => {
            e.stopPropagation();
            onUpdateImportance(subscription.id, level as 1 | 2 | 3 | 4 | 5);
          }}
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
      onClick={onClick}
      className={cn(
        "relative rounded-lg border transition-colors group",
        onClick && "cursor-pointer",
        subscription.isCancelled
          ? "bg-surface-secondary/50 border-green-500/30"
          : "bg-surface-secondary",
        !subscription.isCancelled && showCancelWarning
          ? "border-orange-500/30 hover:border-orange-500/50"
          : !subscription.isCancelled &&
              "border-line hover:border-terminal-accent/30",
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
                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveName();
                      }}
                      className="p-1 text-[#5FE3B3] hover:bg-[#5FE3B3]/20 rounded"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelEdit();
                      }}
                      className="p-1 text-terminal-accent/60 hover:bg-terminal-accent/20 rounded"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <span
                      className={cn(
                        "font-bold truncate",
                        subscription.isCancelled
                          ? "text-terminal-accent/50 line-through"
                          : "text-terminal-accent",
                      )}
                    >
                      {subscription.displayName}
                    </span>
                    {subscription.isCancelled && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
                        Cancelled
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditingName(true);
                      }}
                      className="p-1 text-terminal-accent/30 hover:text-terminal-accent/70
                                 opacity-0 group-hover:opacity-100 transition-all rounded"
                      title="Edit name"
                    >
                      <Edit3 size={12} />
                    </button>
                    {onDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(subscription.id);
                        }}
                        className="p-1 text-terminal-accent/30 hover:text-red-400
                                   opacity-0 group-hover:opacity-100 transition-all rounded"
                        title="Delete subscription"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Category and Frequency */}
              <div className="flex items-center gap-2 mt-1">
                {onUpdateCategory ? (
                  <select
                    value={subscription.category || "other"}
                    onChange={(e) => {
                      e.stopPropagation();
                      onUpdateCategory(
                        subscription.id,
                        e.target.value as MerchantCategory,
                      );
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-terminal-accent/70 bg-transparent border-none
                               cursor-pointer hover:text-terminal-accent focus:outline-none
                               focus:ring-1 focus:ring-terminal-accent/30 rounded px-1 -ml-1"
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  subscription.category && (
                    <span className="text-xs text-terminal-accent/50 capitalize">
                      {subscription.category}
                    </span>
                  )
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
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismissSuggestion(subscription.id);
                    }}
                    className="text-xs text-terminal-accent/50 hover:text-terminal-accent/70 mt-1"
                  >
                    Dismiss suggestion
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Cancelled Toggle Button */}
        {onToggleCancelled && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCancelled(subscription.id, !subscription.isCancelled);
            }}
            className={cn(
              "flex items-center gap-1.5 mt-3 text-xs transition-colors",
              subscription.isCancelled
                ? "text-green-400 hover:text-green-300"
                : "text-terminal-accent/50 hover:text-terminal-accent/70",
            )}
          >
            {subscription.isCancelled ? (
              <>
                <CheckCircle size={14} />
                Marked as cancelled
              </>
            ) : (
              <>
                <Circle size={14} />
                Mark as cancelled
              </>
            )}
          </button>
        )}
      </div>

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
