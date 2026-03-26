/**
 * Cash Page
 *
 * AI-powered expense tracking with upload-only approach:
 * - Upload CSV/PDF bank statements
 * - AI parses transactions, categorizes, detects subscriptions
 * - Four views: Daily, Weekly, Monthly, Subscriptions
 *
 * All values in CAD.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  Calendar,
  BarChart2,
  CalendarDays,
  CreditCard,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  InvestmentsTab,
  BankStatementImporter,
  DailySpendingView,
  SubscriptionReview,
  CategoryTransactionsModal,
} from "@/components/cash";
import { SummaryCards } from "@/components/cash/SummaryCards";
import { WeeklyView } from "@/components/cash/WeeklyView";
import { MonthlyView } from "@/components/cash/MonthlyView";
import type { ParsedTransaction } from "@/lib/ai/bankStatementParser";
import {
  storeStatementRecord,
  loadTransactionsFromSupabase,
} from "@/lib/ai/bankStatementParser";
import { detectSubscriptions } from "@/lib/ai/subscriptionDetector";
import {
  rankSubscriptionsWithAI,
  type RankedSubscription,
} from "@/lib/ai/subscriptionRanker";
import {
  saveSubscriptions,
  loadSubscriptions,
  saveAnalysisMetadata,
  loadAnalysisMetadata,
  deleteSubscription,
} from "@/lib/subscriptionStorage";

type ViewTab = "daily" | "weekly" | "monthly" | "subscriptions";
type MainTab = "expenses" | "investments";

const Cash: React.FC = () => {
  const [mainTab, setMainTab] = useState<MainTab>("expenses");
  const [viewTab, setViewTab] = useState<ViewTab>("daily");
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<RankedSubscription[]>([]);
  const [hideBalances, setHideBalances] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Category modal state
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categoryTransactions, setCategoryTransactions] = useState<
    ParsedTransaction[]
  >([]);

  // Load cached data on mount (localStorage first, Supabase fallback)
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load cached subscriptions
        const cachedSubs = loadSubscriptions();
        if (cachedSubs.length > 0) {
          const restored: RankedSubscription[] = cachedSubs.map((s) => ({
            ...s,
            confidence: 0.95,
            transactions: [],
            source: "cache" as const,
          }));
          setSubscriptions(restored);
        }

        // Load transactions: localStorage first, then Supabase fallback
        const cachedTransactions = localStorage.getItem(
          "noctisium-transactions",
        );
        if (cachedTransactions) {
          const parsed = JSON.parse(cachedTransactions);
          if (parsed.length > 0) {
            setTransactions(parsed);
          } else {
            // localStorage empty, try Supabase
            const supabaseTransactions = await loadTransactionsFromSupabase();
            if (supabaseTransactions.length > 0) {
              setTransactions(supabaseTransactions);
              // Sync back to localStorage
              localStorage.setItem(
                "noctisium-transactions",
                JSON.stringify(supabaseTransactions),
              );
            }
          }
        } else {
          // No localStorage data, load from Supabase
          const supabaseTransactions = await loadTransactionsFromSupabase();
          if (supabaseTransactions.length > 0) {
            setTransactions(supabaseTransactions);
            // Sync back to localStorage
            localStorage.setItem(
              "noctisium-transactions",
              JSON.stringify(supabaseTransactions),
            );
          }
        }
      } catch (error) {
        console.error("Failed to load cached data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Re-link transactions to subscriptions when both are loaded
  useEffect(() => {
    if (transactions.length === 0 || subscriptions.length === 0) return;

    // Check if subscriptions need transaction linking (from cache)
    const needsLinking = subscriptions.some(
      (s) => s.source === "cache" && s.transactions.length === 0,
    );
    if (!needsLinking) return;

    // Link transactions to subscriptions by matching merchant name
    setSubscriptions((prev) =>
      prev.map((sub) => {
        if (sub.transactions.length > 0) return sub;

        // Find matching transactions for this subscription
        // Match by: merchantName contains description OR description contains merchantName/displayName
        const matchingTxns = transactions
          .filter((t) => {
            const desc = t.description.toLowerCase();
            const merchant = sub.merchantName.toLowerCase();
            const display = sub.displayName.toLowerCase();

            // Direct match or partial match
            return (
              desc === merchant ||
              desc.includes(merchant) ||
              merchant.includes(desc) ||
              desc.includes(display) ||
              display.includes(desc.split(" ")[0])
            );
          })
          .map((t) => ({
            date: t.date,
            amount: t.amount,
            description: t.description,
          }))
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          );

        return {
          ...sub,
          transactions: matchingTxns,
        };
      }),
    );
  }, [transactions, subscriptions]);

  // Handle imported transactions from bank statement
  const handleImportTransactions = useCallback(
    async (newTransactions: ParsedTransaction[]) => {
      if (newTransactions.length === 0) return;

      setIsProcessing(true);

      try {
        // Merge with existing transactions (avoid duplicates by date+description+amount)
        const existingKeys = new Set(
          transactions.map((t) => `${t.date}-${t.description}-${t.amount}`),
        );
        const uniqueNew = newTransactions.filter(
          (t) => !existingKeys.has(`${t.date}-${t.description}-${t.amount}`),
        );
        const merged = [...uniqueNew, ...transactions];

        setTransactions(merged);
        localStorage.setItem("noctisium-transactions", JSON.stringify(merged));

        // Persist to Supabase (fire and forget, don't block UI)
        setProcessingStep("Saving to cloud...");
        storeStatementRecord("import", "csv", {
          transactions: uniqueNew,
          totalAmount: uniqueNew.reduce(
            (sum, t) => sum + Math.abs(t.amount),
            0,
          ),
          confidence: 0.9,
        }).catch((err) => console.error("Failed to save to Supabase:", err));

        // Detect subscriptions from all transactions
        setProcessingStep("Detecting subscriptions...");
        const detected = await detectSubscriptions(merged);

        // Rank with AI
        setProcessingStep("Analyzing importance with AI...");
        const ranked = await rankSubscriptionsWithAI(detected);

        // Save to storage
        setProcessingStep("Saving results...");
        saveSubscriptions(ranked);
        setSubscriptions(ranked);

        const metadata = {
          timestamp: new Date().toISOString(),
          totalSubscriptions: ranked.length,
          totalAnnualCost: ranked.reduce((sum, s) => sum + s.annualCost, 0),
          potentialSavings: ranked
            .filter((s) => s.importance <= 2)
            .reduce((sum, s) => sum + s.annualCost, 0),
        };
        saveAnalysisMetadata(metadata);
      } catch (error) {
        console.error("Error processing transactions:", error);
      } finally {
        setIsProcessing(false);
        setProcessingStep("");
      }
    },
    [transactions],
  );

  // Convert transactions to expenses format for DailySpendingView
  // Only outflow (negative amounts) for expense views
  const expensesForDaily = useMemo(() => {
    return transactions
      .filter((t) => t.amount < 0) // Only outflow
      .map((t) => ({
        id: `tx-${t.date}-${Math.random().toString(36).slice(2, 8)}`,
        amount: t.amount, // Keep negative sign
        account: "Bank Import",
        item: t.description,
        category: t.category,
        date: t.date,
        isInflow: false,
      }));
  }, [transactions]);

  // Get income transactions for income tracking
  const incomeTransactions = useMemo(() => {
    return transactions
      .filter((t) => t.amount > 0) // Only inflow
      .map((t) => ({
        id: `tx-${t.date}-${Math.random().toString(36).slice(2, 8)}`,
        amount: t.amount, // Keep positive sign
        account: "Bank Import",
        item: t.description,
        category: t.category,
        date: t.date,
        isInflow: true,
      }));
  }, [transactions]);

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-terminal-accent/60">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-terminal-accent mb-1">Cash</h1>
          <p className="text-terminal-accent/50 text-sm">
            AI-powered expense tracking
          </p>
        </div>
        <button
          onClick={() => setHideBalances(!hideBalances)}
          className="flex items-center gap-2 px-4 py-2.5
                     bg-surface-secondary border border-line/50 rounded-lg
                     text-terminal-accent/70 hover:text-terminal-accent
                     hover:border-terminal-accent/30 transition-all"
        >
          {hideBalances ? <Eye size={18} /> : <EyeOff size={18} />}
          <span className="text-sm font-medium">
            {hideBalances ? "Show" : "Hide"}
          </span>
        </button>
      </div>

      {/* Main Tabs - Expenses / Investments */}
      <div className="flex gap-2 mb-8 p-1.5 bg-surface-secondary rounded-xl w-fit">
        <button
          onClick={() => setMainTab("expenses")}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all font-medium",
            mainTab === "expenses"
              ? "bg-terminal-accent text-black"
              : "text-terminal-accent/70 hover:text-terminal-accent hover:bg-surface-hover",
          )}
        >
          <CreditCard size={18} />
          Expenses
        </button>
        <button
          onClick={() => setMainTab("investments")}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all font-medium",
            mainTab === "investments"
              ? "bg-terminal-accent text-black"
              : "text-terminal-accent/70 hover:text-terminal-accent hover:bg-surface-hover",
          )}
        >
          <TrendingUp size={18} />
          Investments
        </button>
      </div>

      {mainTab === "expenses" ? (
        <div className="space-y-8">
          {/* Hero Upload Zone */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <BankStatementImporter
              onImportExpenses={(exps) => {
                const txs: ParsedTransaction[] = exps.map((e) => ({
                  date: e.date,
                  description: e.item,
                  amount: e.amount, // Sign already correct: negative=outflow, positive=inflow
                  category: e.category,
                  confidence: 0.9,
                }));
                handleImportTransactions(txs);
              }}
              existingExpenses={expensesForDaily}
            />
          </motion.div>

          {/* Processing State */}
          <AnimatePresence>
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-6 rounded-xl bg-surface-secondary border border-terminal-accent/30 text-center"
              >
                <Loader2
                  size={32}
                  className="mx-auto mb-3 animate-spin text-terminal-accent"
                />
                <p className="text-terminal-accent font-medium">
                  {processingStep}
                </p>
                <p className="text-sm text-terminal-accent/50 mt-1">
                  This may take a moment...
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Summary Cards - Only show when we have data */}
          {transactions.length > 0 && !isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <SummaryCards
                transactions={transactions}
                subscriptions={subscriptions}
                hideBalances={hideBalances}
                onCategoryClick={(category, txns) => {
                  setSelectedCategory(category);
                  setCategoryTransactions(txns);
                  setCategoryModalOpen(true);
                }}
              />
            </motion.div>
          )}

          {/* View Tabs */}
          {transactions.length > 0 && !isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex gap-1 mb-6 p-1 bg-surface-secondary rounded-lg w-fit">
                <button
                  onClick={() => setViewTab("daily")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium",
                    viewTab === "daily"
                      ? "bg-terminal-accent text-black"
                      : "text-terminal-accent/70 hover:text-terminal-accent hover:bg-surface-hover",
                  )}
                >
                  <Calendar size={16} />
                  Daily
                </button>
                <button
                  onClick={() => setViewTab("weekly")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium",
                    viewTab === "weekly"
                      ? "bg-terminal-accent text-black"
                      : "text-terminal-accent/70 hover:text-terminal-accent hover:bg-surface-hover",
                  )}
                >
                  <BarChart2 size={16} />
                  Weekly
                </button>
                <button
                  onClick={() => setViewTab("monthly")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium",
                    viewTab === "monthly"
                      ? "bg-terminal-accent text-black"
                      : "text-terminal-accent/70 hover:text-terminal-accent hover:bg-surface-hover",
                  )}
                >
                  <CalendarDays size={16} />
                  Monthly
                </button>
                <button
                  onClick={() => setViewTab("subscriptions")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium",
                    viewTab === "subscriptions"
                      ? "bg-terminal-accent text-black"
                      : "text-terminal-accent/70 hover:text-terminal-accent hover:bg-surface-hover",
                  )}
                >
                  <CreditCard size={16} />
                  Subscriptions
                </button>
              </div>

              {/* View Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={viewTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {viewTab === "daily" && (
                    <DailySpendingView
                      expenses={expensesForDaily}
                      hideBalances={hideBalances}
                    />
                  )}
                  {viewTab === "weekly" && (
                    <WeeklyView
                      transactions={transactions}
                      hideBalances={hideBalances}
                    />
                  )}
                  {viewTab === "monthly" && (
                    <MonthlyView
                      transactions={transactions}
                      hideBalances={hideBalances}
                    />
                  )}
                  {viewTab === "subscriptions" && (
                    <SubscriptionReview
                      subscriptions={subscriptions}
                      hideBalances={hideBalances}
                      isLoading={isProcessing}
                      onUpdateName={(id, name) => {
                        setSubscriptions((prev) => {
                          const updated = prev.map((s) =>
                            s.id === id ? { ...s, displayName: name } : s,
                          );
                          saveSubscriptions(updated);
                          return updated;
                        });
                      }}
                      onUpdateImportance={(id, importance) => {
                        setSubscriptions((prev) => {
                          const updated = prev.map((s) =>
                            s.id === id ? { ...s, importance } : s,
                          );
                          saveSubscriptions(updated);
                          return updated;
                        });
                      }}
                      onDismissSuggestion={(id) => {
                        setSubscriptions((prev) =>
                          prev.map((s) =>
                            s.id === id
                              ? { ...s, cancelRecommendation: undefined }
                              : s,
                          ),
                        );
                      }}
                      onDelete={(id) => {
                        // Remove from UI state
                        setSubscriptions((prev) =>
                          prev.filter((s) => s.id !== id),
                        );
                        // Remove from localStorage
                        deleteSubscription(id);
                      }}
                      onToggleCancelled={(id, cancelled) => {
                        setSubscriptions((prev) => {
                          const updated = prev.map((s) =>
                            s.id === id ? { ...s, isCancelled: cancelled } : s,
                          );
                          // Save to localStorage
                          saveSubscriptions(updated);
                          return updated;
                        });
                      }}
                      onUpdateCategory={(id, category) => {
                        setSubscriptions((prev) => {
                          const updated = prev.map((s) =>
                            s.id === id ? { ...s, category } : s,
                          );
                          saveSubscriptions(updated);
                          return updated;
                        });
                      }}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}

          {/* Empty State */}
          {transactions.length === 0 && !isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <p className="text-terminal-accent/40 text-lg mb-2">
                No transactions yet
              </p>
              <p className="text-terminal-accent/30 text-sm">
                Upload a bank statement to get started
              </p>
            </motion.div>
          )}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          <InvestmentsTab hideBalances={hideBalances} />
        </motion.div>
      )}

      {/* Category Transactions Modal */}
      <CategoryTransactionsModal
        category={selectedCategory}
        transactions={categoryTransactions}
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        hideBalances={hideBalances}
      />
    </div>
  );
};

export default Cash;
