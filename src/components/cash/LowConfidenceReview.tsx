/**
 * LowConfidenceReview Component
 *
 * Displays transactions with low confidence scores for manual review.
 * Users can confirm, edit names, or change categories.
 * Corrections are cached for future imports.
 */

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Check,
  X,
  Edit2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ParsedTransaction } from "@/lib/ai/bankStatementParser";

// Transaction categories for editing
const CATEGORIES = [
  "Food & Dining",
  "Shopping",
  "Transportation",
  "Bills & Utilities",
  "Entertainment",
  "Health & Wellness",
  "Travel",
  "Education",
  "Personal Care",
  "Home Improvement",
  "Subscriptions",
  "Income",
  "Transfer",
  "Investment",
  "Other",
] as const;

// Cache key for storing user corrections
const CORRECTIONS_CACHE_KEY = "noctisium-transaction-corrections";

interface TransactionCorrection {
  originalDescription: string;
  correctedName?: string;
  correctedCategory?: string;
  confirmedAt: string;
}

interface LowConfidenceReviewProps {
  transactions: ParsedTransaction[];
  confidenceThreshold?: number;
  onCorrection: (
    index: number,
    correction: { description?: string; category?: string },
  ) => void;
  onDismiss?: () => void;
}

// Load cached corrections
function loadCorrections(): Map<string, TransactionCorrection> {
  try {
    const cached = localStorage.getItem(CORRECTIONS_CACHE_KEY);
    if (cached) {
      const entries = JSON.parse(cached) as TransactionCorrection[];
      return new Map(entries.map((c) => [c.originalDescription, c]));
    }
  } catch {
    // Ignore errors
  }
  return new Map();
}

// Save correction to cache
function saveCorrection(correction: TransactionCorrection) {
  try {
    const corrections = loadCorrections();
    corrections.set(correction.originalDescription, correction);
    localStorage.setItem(
      CORRECTIONS_CACHE_KEY,
      JSON.stringify([...corrections.values()]),
    );
  } catch {
    // Ignore errors
  }
}

export const LowConfidenceReview: React.FC<LowConfidenceReviewProps> = ({
  transactions,
  confidenceThreshold = 0.7,
  onCorrection,
  onDismiss,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [reviewedIndices, setReviewedIndices] = useState<Set<number>>(
    new Set(),
  );

  // Filter low confidence transactions
  const lowConfidenceItems = transactions
    .map((txn, index) => ({ txn, index }))
    .filter(({ txn }) => txn.confidence < confidenceThreshold);

  // Start editing a transaction
  const startEdit = useCallback((index: number, txn: ParsedTransaction) => {
    setEditingIndex(index);
    setEditName(txn.description);
    setEditCategory(txn.category || "Other");
  }, []);

  // Save edit
  const saveEdit = useCallback(
    (originalIndex: number, originalTxn: ParsedTransaction) => {
      const correction: TransactionCorrection = {
        originalDescription: originalTxn.description,
        correctedName:
          editName !== originalTxn.description ? editName : undefined,
        correctedCategory:
          editCategory !== originalTxn.category ? editCategory : undefined,
        confirmedAt: new Date().toISOString(),
      };

      // Save to cache
      saveCorrection(correction);

      // Apply correction
      onCorrection(originalIndex, {
        description: editName,
        category: editCategory,
      });

      // Mark as reviewed
      setReviewedIndices((prev) => new Set([...prev, originalIndex]));
      setEditingIndex(null);
    },
    [editName, editCategory, onCorrection],
  );

  // Confirm as correct
  const confirmCorrect = useCallback(
    (index: number, txn: ParsedTransaction) => {
      const correction: TransactionCorrection = {
        originalDescription: txn.description,
        confirmedAt: new Date().toISOString(),
      };
      saveCorrection(correction);
      setReviewedIndices((prev) => new Set([...prev, index]));
    },
    [],
  );

  // Cancel edit
  const cancelEdit = useCallback(() => {
    setEditingIndex(null);
    setEditName("");
    setEditCategory("");
  }, []);

  // Filter out already reviewed items
  const unreviewedItems = lowConfidenceItems.filter(
    ({ index }) => !reviewedIndices.has(index),
  );

  if (lowConfidenceItems.length === 0) {
    return null;
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(Math.abs(amount));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-amber-500/5 border border-amber-500/20 overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-amber-500/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle size={16} className="text-amber-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-amber-300">
              Review Needed ({unreviewedItems.length} of{" "}
              {lowConfidenceItems.length})
            </p>
            <p className="text-xs text-amber-300/60">
              Low confidence transactions that may need correction
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onDismiss && unreviewedItems.length === 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-500/10 rounded-lg hover:bg-amber-500/20 transition-colors"
            >
              Dismiss
            </button>
          )}
          {isExpanded ? (
            <ChevronUp size={18} className="text-amber-300/50" />
          ) : (
            <ChevronDown size={18} className="text-amber-300/50" />
          )}
        </div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-2 max-h-[300px] overflow-y-auto">
              {lowConfidenceItems.map(({ txn, index }) => {
                const isEditing = editingIndex === index;
                const isReviewed = reviewedIndices.has(index);

                return (
                  <motion.div
                    key={`${txn.date}-${txn.description}-${index}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: isReviewed ? 0.5 : 1, x: 0 }}
                    className={cn(
                      "p-3 rounded-lg border transition-all",
                      isReviewed
                        ? "bg-neon-green/5 border-neon-green/20"
                        : "bg-surface-secondary border-line/30",
                    )}
                  >
                    {isEditing ? (
                      // Edit Mode
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-terminal-accent/50 w-20">
                            Name:
                          </span>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-surface-primary border border-line/50 text-terminal-accent focus:border-terminal-accent/50 focus:outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-terminal-accent/50 w-20">
                            Category:
                          </span>
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-surface-primary border border-line/50 text-terminal-accent focus:border-terminal-accent/50 focus:outline-none"
                          >
                            {CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={cancelEdit}
                            className="px-3 py-1.5 text-xs font-medium text-terminal-accent/70 bg-surface-primary border border-line/50 rounded-lg hover:border-terminal-accent/30 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => saveEdit(index, txn)}
                            className="px-3 py-1.5 text-xs font-medium text-black bg-terminal-accent rounded-lg hover:opacity-90 transition-colors"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className="flex items-center gap-3">
                        {/* Date */}
                        <span className="text-xs font-mono text-terminal-accent/40 w-20 shrink-0">
                          {txn.date}
                        </span>

                        {/* Description */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-terminal-accent truncate">
                            {txn.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={cn(
                                "text-xs px-2 py-0.5 rounded-full",
                                txn.category === "Transfer"
                                  ? "bg-blue-500/10 text-blue-400"
                                  : txn.category === "Investment"
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "bg-terminal-accent/10 text-terminal-accent/60",
                              )}
                            >
                              {txn.category || "Other"}
                            </span>
                            <span className="text-xs text-amber-400">
                              {Math.round(txn.confidence * 100)}% confident
                            </span>
                          </div>
                        </div>

                        {/* Amount */}
                        <span className="text-sm font-mono text-red-400 shrink-0">
                          {formatCurrency(txn.amount)}
                        </span>

                        {/* Actions */}
                        {isReviewed ? (
                          <Check
                            size={16}
                            className="text-neon-green shrink-0"
                          />
                        ) : (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => confirmCorrect(index, txn)}
                              className="p-1.5 rounded-lg text-neon-green/70 hover:text-neon-green hover:bg-neon-green/10 transition-colors"
                              title="Confirm as correct"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => startEdit(index, txn)}
                              className="p-1.5 rounded-lg text-terminal-accent/50 hover:text-terminal-accent hover:bg-terminal-accent/10 transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {unreviewedItems.length === 0 && (
                <div className="text-center py-4 text-neon-green/70">
                  <Check size={24} className="mx-auto mb-2" />
                  <p className="text-sm">All items reviewed!</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/**
 * Apply cached corrections to new transactions
 */
export function applyCachedCorrections(
  transactions: ParsedTransaction[],
): ParsedTransaction[] {
  const corrections = loadCorrections();

  return transactions.map((txn) => {
    const correction = corrections.get(txn.description);
    if (correction) {
      return {
        ...txn,
        description: correction.correctedName || txn.description,
        category: correction.correctedCategory || txn.category,
        confidence: 0.95, // Boost confidence for corrected items
      };
    }
    return txn;
  });
}

export default LowConfidenceReview;
