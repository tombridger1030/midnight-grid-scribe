/**
 * SubscriptionsTab Component
 *
 * Main wrapper for subscription review and daily spending features.
 * Handles file upload, processing, and state management.
 */

import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  CreditCard,
  Calendar,
  AlertCircle,
  Loader2,
  FileText,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SubscriptionReview } from "./SubscriptionReview";
import { DailySpendingView } from "./DailySpendingView";
import { BankStatementImporter } from "./BankStatementImporter";
import type { Expense } from "./ExpensesTab";
import type { ParsedTransaction } from "@/lib/ai/bankStatementParser";
import { detectSubscriptions } from "@/lib/ai/subscriptionDetector";
import {
  rankSubscriptionsWithAI,
  setRankingOverride,
  type RankedSubscription,
} from "@/lib/ai/subscriptionRanker";
import { correctMerchantName } from "@/lib/ai/merchantResolver";
import {
  saveSubscriptions,
  loadSubscriptions,
  saveNameCorrection,
  dismissSuggestion,
  saveAnalysisMetadata,
  loadAnalysisMetadata,
} from "@/lib/subscriptionStorage";

type ViewMode = "subscriptions" | "daily";

interface SubscriptionsTabProps {
  expenses: Expense[];
  hideBalances: boolean;
  onAddExpenses: (expenses: Omit<Expense, "id">[]) => void;
}

export const SubscriptionsTab: React.FC<SubscriptionsTabProps> = ({
  expenses,
  hideBalances,
  onAddExpenses,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("subscriptions");
  const [subscriptions, setSubscriptions] = useState<RankedSubscription[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastAnalysis, setLastAnalysis] = useState(loadAnalysisMetadata());

  // Load cached subscriptions on mount
  React.useEffect(() => {
    const cached = loadSubscriptions();
    if (cached.length > 0) {
      // Convert stored subscriptions back to RankedSubscription format
      const restored: RankedSubscription[] = cached.map((s) => ({
        ...s,
        confidence: 0.95,
        transactions: [],
        source: "cache" as const,
      }));
      setSubscriptions(restored);
    }
  }, []);

  // Handle imported transactions from bank statement
  const handleImportTransactions = useCallback(
    async (transactions: ParsedTransaction[]) => {
      if (transactions.length === 0) return;

      setIsProcessing(true);
      setError(null);

      try {
        // Step 1: Detect subscriptions
        setProcessingStep("Detecting subscriptions...");
        const detected = await detectSubscriptions(transactions);

        // Step 2: Rank with AI
        setProcessingStep("Analyzing importance with AI...");
        const ranked = await rankSubscriptionsWithAI(detected);

        // Step 3: Save to storage
        setProcessingStep("Saving results...");
        saveSubscriptions(ranked);

        const metadata = {
          timestamp: new Date().toISOString(),
          totalSubscriptions: ranked.length,
          totalAnnualCost: ranked.reduce((sum, s) => sum + s.annualCost, 0),
          potentialSavings: ranked
            .filter((s) => s.importance <= 2)
            .reduce((sum, s) => sum + s.annualCost, 0),
        };
        saveAnalysisMetadata(metadata);
        setLastAnalysis(metadata);

        // Update state
        setSubscriptions(ranked);

        // Also add to expenses
        const expensesToAdd: Omit<Expense, "id">[] = transactions.map((t) => ({
          amount: Math.abs(t.amount),
          account: "Bank Import",
          item: t.description,
          category: undefined,
          date: t.date,
        }));
        onAddExpenses(expensesToAdd);
      } catch (err) {
        console.error("Error processing transactions:", err);
        setError(
          err instanceof Error ? err.message : "Failed to process transactions",
        );
      } finally {
        setIsProcessing(false);
        setProcessingStep("");
      }
    },
    [onAddExpenses],
  );

  // Handle name update
  const handleUpdateName = useCallback((id: string, newName: string) => {
    setSubscriptions((prev) =>
      prev.map((sub) => {
        if (sub.id === id) {
          // Save correction to cache
          saveNameCorrection(sub.merchantName, newName, sub.category);
          correctMerchantName(sub.merchantName, newName, sub.category);
          return { ...sub, displayName: newName, isUserOverride: true };
        }
        return sub;
      }),
    );
  }, []);

  // Handle importance update
  const handleUpdateImportance = useCallback(
    (id: string, importance: 1 | 2 | 3 | 4 | 5) => {
      setSubscriptions((prev) =>
        prev.map((sub) => {
          if (sub.id === id) {
            setRankingOverride(id, importance);
            return { ...sub, importance, isUserOverride: true };
          }
          return sub;
        }),
      );
    },
    [],
  );

  // Handle dismiss suggestion
  const handleDismissSuggestion = useCallback((id: string) => {
    dismissSuggestion(id);
    setSubscriptions((prev) =>
      prev.map((sub) => {
        if (sub.id === id) {
          return { ...sub, cancelRecommendation: undefined };
        }
        return sub;
      }),
    );
  }, []);

  // Re-analyze subscriptions
  const handleReanalyze = useCallback(async () => {
    if (subscriptions.length === 0) return;

    setIsProcessing(true);
    setProcessingStep("Re-analyzing with AI...");

    try {
      const reranked = await rankSubscriptionsWithAI(subscriptions);
      saveSubscriptions(reranked);
      setSubscriptions(reranked);
    } catch (err) {
      console.error("Re-analysis failed:", err);
      setError("Failed to re-analyze subscriptions");
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  }, [subscriptions]);

  // Current month expenses for daily view
  const currentMonthExpenses = useMemo(() => {
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return expenses.filter((e) => e.date.startsWith(monthPrefix));
  }, [expenses]);

  return (
    <div className="space-y-6">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 p-1 bg-surface-secondary rounded-lg">
          <button
            onClick={() => setViewMode("subscriptions")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              viewMode === "subscriptions"
                ? "bg-terminal-accent text-black"
                : "text-terminal-accent/70 hover:text-terminal-accent hover:bg-terminal-accent/10",
            )}
          >
            <CreditCard size={16} />
            Subscriptions
          </button>
          <button
            onClick={() => setViewMode("daily")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              viewMode === "daily"
                ? "bg-terminal-accent text-black"
                : "text-terminal-accent/70 hover:text-terminal-accent hover:bg-terminal-accent/10",
            )}
          >
            <Calendar size={16} />
            Daily Spending
          </button>
        </div>

        {/* Re-analyze Button */}
        {subscriptions.length > 0 && viewMode === "subscriptions" && (
          <button
            onClick={handleReanalyze}
            disabled={isProcessing}
            className="flex items-center gap-2 px-3 py-1.5 text-sm
                       text-terminal-accent/70 hover:text-terminal-accent
                       border border-line hover:border-terminal-accent/30
                       rounded transition-colors disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={isProcessing ? "animate-spin" : ""}
            />
            Re-analyze
          </button>
        )}
      </div>

      {/* Bank Statement Importer */}
      {subscriptions.length === 0 && !isProcessing && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <BankStatementImporter
            onImportExpenses={(exps) => {
              // Convert expenses to transactions format
              const transactions: ParsedTransaction[] = exps.map((e) => ({
                date: e.date,
                description: e.item,
                amount: -e.amount, // Expenses are negative
                type: "debit" as const,
              }));
              handleImportTransactions(transactions);
            }}
            existingExpenses={expenses}
          />
        </motion.div>
      )}

      {/* Processing State */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-6 rounded-lg bg-surface-secondary border border-terminal-accent/30 text-center"
          >
            <Loader2
              size={32}
              className="mx-auto mb-3 animate-spin text-terminal-accent"
            />
            <p className="text-terminal-accent font-medium">{processingStep}</p>
            <p className="text-sm text-terminal-accent/60 mt-1">
              This may take a moment...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error State */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3"
          >
            <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-300 font-medium">Processing Error</p>
              <p className="text-sm text-red-300/70 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400/70 hover:text-red-400 text-sm"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Last Analysis Info */}
      {lastAnalysis && subscriptions.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-xs text-terminal-accent/40"
        >
          <FileText size={12} />
          <span>
            Last analyzed:{" "}
            {new Date(lastAnalysis.timestamp).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        </motion.div>
      )}

      {/* Content based on view mode */}
      <AnimatePresence mode="wait">
        {viewMode === "subscriptions" ? (
          <motion.div
            key="subscriptions"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <SubscriptionReview
              subscriptions={subscriptions}
              hideBalances={hideBalances}
              isLoading={isProcessing}
              onUpdateName={handleUpdateName}
              onUpdateImportance={handleUpdateImportance}
              onDismissSuggestion={handleDismissSuggestion}
            />
          </motion.div>
        ) : (
          <motion.div
            key="daily"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <DailySpendingView
              expenses={currentMonthExpenses}
              hideBalances={hideBalances}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload New Statement CTA */}
      {subscriptions.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="pt-4 border-t border-line/30"
        >
          <BankStatementImporter
            onImportExpenses={(exps) => {
              const transactions: ParsedTransaction[] = exps.map((e) => ({
                date: e.date,
                description: e.item,
                amount: -e.amount,
                type: "debit" as const,
              }));
              handleImportTransactions(transactions);
            }}
            existingExpenses={expenses}
          />
        </motion.div>
      )}
    </div>
  );
};

export default SubscriptionsTab;
