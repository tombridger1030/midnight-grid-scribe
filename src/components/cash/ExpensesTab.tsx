/**
 * ExpensesTab Component
 *
 * Fast expense logging with runway display.
 * Optimized for daily use - minimal friction to log expenses.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Trash2,
  TrendingDown,
  Edit3,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BankStatementImporter } from "./BankStatementImporter";

export interface Expense {
  id: string;
  amount: number; // CAD
  account: string;
  item: string;
  category?: string;
  date: string; // YYYY-MM-DD
}

interface ExpensesTabProps {
  expenses: Expense[];
  accounts: string[];
  cashReserveCAD: number;
  hideBalances: boolean;
  onAddExpense: (expense: Omit<Expense, "id">) => void;
  onDeleteExpense: (id: string) => void;
  onAddAccount: (account: string) => void;
  onUpdateCashReserve: (amount: number) => void;
}

// Group expenses by month
function groupByMonth(expenses: Expense[]): Map<string, Expense[]> {
  const groups = new Map<string, Expense[]>();

  expenses
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .forEach((exp) => {
      const monthKey = exp.date.slice(0, 7); // YYYY-MM
      if (!groups.has(monthKey)) {
        groups.set(monthKey, []);
      }
      groups.get(monthKey)!.push(exp);
    });

  return groups;
}

// Format month key to readable string
function formatMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// Calculate average monthly burn from last 3 months
function calculateAvgBurn(expenses: Expense[]): number {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  const recentExpenses = expenses.filter(
    (e) => new Date(e.date) >= threeMonthsAgo,
  );

  if (recentExpenses.length === 0) return 0;

  const total = recentExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Calculate number of months we have data for
  const months = new Set(recentExpenses.map((e) => e.date.slice(0, 7))).size;

  return months > 0 ? total / months : total;
}

export const ExpensesTab: React.FC<ExpensesTabProps> = ({
  expenses,
  accounts,
  cashReserveCAD,
  hideBalances,
  onAddExpense,
  onDeleteExpense,
  onAddAccount,
  onUpdateCashReserve,
}) => {
  // Input state
  const [amount, setAmount] = useState("");
  const [account, setAccount] = useState(accounts[0] || "");
  const [item, setItem] = useState("");
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [newAccount, setNewAccount] = useState("");

  // Collapsed months
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  // Refs for focus management
  const amountRef = useRef<HTMLInputElement>(null);
  const itemRef = useRef<HTMLInputElement>(null);

  // Auto-focus amount on mount
  useEffect(() => {
    amountRef.current?.focus();
  }, []);

  // Set default account when accounts change
  useEffect(() => {
    if (accounts.length > 0 && !account) {
      setAccount(accounts[0]);
    }
  }, [accounts, account]);

  // Editing cash reserve
  const [isEditingReserve, setIsEditingReserve] = useState(false);
  const [editReserveValue, setEditReserveValue] = useState("");

  // Calculations
  const avgMonthlyBurn = useMemo(() => calculateAvgBurn(expenses), [expenses]);
  const runwayMonths =
    avgMonthlyBurn > 0 ? cashReserveCAD / avgMonthlyBurn : Infinity;
  const groupedExpenses = useMemo(() => groupByMonth(expenses), [expenses]);

  // Current month total
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const currentMonthTotal = useMemo(() => {
    return expenses
      .filter((e) => e.date.startsWith(currentMonthKey))
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, currentMonthKey]);

  // Auto-expand current month
  useEffect(() => {
    setExpandedMonths(new Set([currentMonthKey]));
  }, [currentMonthKey]);

  // Format currency
  const formatCurrency = (value: number): string => {
    if (hideBalances) return "•••••";
    return `$${value.toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Handle form submission
  const handleSubmit = () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0 || !account || !item.trim()) return;

    onAddExpense({
      amount: amountNum,
      account,
      item: item.trim(),
      date: new Date().toISOString().slice(0, 10),
    });

    // Reset form
    setAmount("");
    setItem("");
    amountRef.current?.focus();
  };

  // Handle new account
  const handleAddAccount = () => {
    if (newAccount.trim()) {
      onAddAccount(newAccount.trim());
      setAccount(newAccount.trim());
      setNewAccount("");
      setShowNewAccount(false);
    }
  };

  // Toggle month expansion
  const toggleMonth = (monthKey: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(monthKey)) {
        next.delete(monthKey);
      } else {
        next.add(monthKey);
      }
      return next;
    });
  };

  // Runway status
  const getRunwayStatus = () => {
    if (runwayMonths === Infinity)
      return { label: "No burn data", color: "text-terminal-accent/60" };
    if (runwayMonths > 12) return { label: "Healthy", color: "text-[#5FE3B3]" };
    if (runwayMonths > 6) return { label: "Moderate", color: "text-[#FFD700]" };
    if (runwayMonths > 3) return { label: "Low", color: "text-[#FFA500]" };
    return { label: "Critical", color: "text-[#FF6B6B]" };
  };

  const runwayStatus = getRunwayStatus();

  // Handle importing expenses from bank statement
  const handleImportExpenses = useCallback(
    (expensesToAdd: Omit<Expense, "id">[]) => {
      expensesToAdd.forEach((expense) => {
        onAddExpense(expense);
      });
    },
    [onAddExpense],
  );

  return (
    <div className="space-y-6">
      {/* Runway Display */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-lg bg-surface-secondary border border-line"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-sm text-terminal-accent/60 uppercase tracking-wider mb-1">
              Cash Reserve
            </div>
            <div className="flex items-baseline gap-3">
              {isEditingReserve ? (
                <div className="flex items-center gap-2">
                  <span className="text-2xl text-terminal-accent/60">$</span>
                  <input
                    type="number"
                    value={editReserveValue}
                    onChange={(e) => setEditReserveValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = parseFloat(editReserveValue);
                        if (val > 0) {
                          onUpdateCashReserve(val);
                        }
                        setIsEditingReserve(false);
                      }
                      if (e.key === "Escape") {
                        setIsEditingReserve(false);
                      }
                    }}
                    autoFocus
                    className="w-32 text-3xl font-bold font-mono text-terminal-accent 
                               bg-transparent border-b-2 border-terminal-accent
                               focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      const val = parseFloat(editReserveValue);
                      if (val > 0) {
                        onUpdateCashReserve(val);
                      }
                      setIsEditingReserve(false);
                    }}
                    className="p-1 text-[#5FE3B3] hover:bg-[#5FE3B3]/20 rounded"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={() => setIsEditingReserve(false)}
                    className="p-1 text-terminal-accent/60 hover:bg-terminal-accent/20 rounded"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditReserveValue(cashReserveCAD.toString());
                    setIsEditingReserve(true);
                  }}
                  className="group flex items-center gap-2 hover:bg-terminal-accent/10 
                             rounded px-2 py-1 -mx-2 -my-1 transition-colors"
                >
                  <span className="text-3xl font-bold font-mono text-terminal-accent">
                    {formatCurrency(cashReserveCAD)}
                  </span>
                  <Edit3
                    size={16}
                    className="text-terminal-accent/40 
                                              group-hover:text-terminal-accent/70 transition-colors"
                  />
                </button>
              )}
              <span className="text-2xl font-bold text-terminal-accent/80">
                {runwayMonths === Infinity ? "∞" : runwayMonths.toFixed(1)} mo
              </span>
            </div>
          </div>
          <div className={cn("text-sm font-medium", runwayStatus.color)}>
            {runwayStatus.label}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-terminal-accent/20 rounded-full overflow-hidden mb-3">
          <motion.div
            className={cn(
              "h-full rounded-full",
              runwayMonths > 12
                ? "bg-[#5FE3B3]"
                : runwayMonths > 6
                  ? "bg-[#FFD700]"
                  : runwayMonths > 3
                    ? "bg-[#FFA500]"
                    : "bg-[#FF6B6B]",
            )}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (runwayMonths / 24) * 100)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-terminal-accent/60">
            Avg burn: {formatCurrency(avgMonthlyBurn)}/mo
          </span>
          <span className="text-terminal-accent/60">
            This month: {formatCurrency(currentMonthTotal)}
          </span>
        </div>
      </motion.div>

      {/* Expense Input */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-4 rounded-lg bg-surface-secondary border border-line"
      >
        <div className="flex items-center gap-3">
          <Plus size={18} className="text-terminal-accent/60 shrink-0" />

          {/* Amount */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-terminal-accent/60">
              $
            </span>
            <input
              ref={amountRef}
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
                if (e.key === "Tab" && !e.shiftKey) {
                  e.preventDefault();
                  document.getElementById("account-select")?.focus();
                }
              }}
              className="w-28 pl-7 pr-3 py-2 bg-surface-tertiary border border-line rounded 
                         text-terminal-accent font-mono text-right
                         focus:outline-none focus:border-terminal-accent"
            />
          </div>

          {/* Account */}
          {showNewAccount ? (
            <input
              type="text"
              placeholder="New account name"
              value={newAccount}
              onChange={(e) => setNewAccount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddAccount();
                if (e.key === "Escape") setShowNewAccount(false);
              }}
              onBlur={() => {
                if (!newAccount.trim()) setShowNewAccount(false);
              }}
              autoFocus
              className="w-36 px-3 py-2 bg-surface-tertiary border border-line rounded 
                         text-terminal-accent
                         focus:outline-none focus:border-terminal-accent"
            />
          ) : (
            <select
              id="account-select"
              value={account}
              onChange={(e) => {
                if (e.target.value === "__new__") {
                  setShowNewAccount(true);
                } else {
                  setAccount(e.target.value);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              className="w-36 px-3 py-2 bg-surface-tertiary border border-line rounded 
                         text-terminal-accent cursor-pointer
                         focus:outline-none focus:border-terminal-accent"
            >
              {accounts.map((acc) => (
                <option key={acc} value={acc}>
                  {acc}
                </option>
              ))}
              <option value="__new__">+ Add Account</option>
            </select>
          )}

          {/* Item */}
          <input
            ref={itemRef}
            type="text"
            placeholder="What did you buy?"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            className="flex-1 px-3 py-2 bg-surface-tertiary border border-line rounded 
                       text-terminal-accent
                       focus:outline-none focus:border-terminal-accent"
          />

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!amount || !account || !item.trim()}
            className="px-4 py-2 bg-terminal-accent text-black font-medium rounded
                       hover:bg-terminal-accent/90 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>

        <div className="mt-2 text-xs text-terminal-accent/40 text-center">
          Press Enter to add expense
        </div>
      </motion.div>

      {/* AI Bank Statement Import */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <BankStatementImporter
          onImportExpenses={handleImportExpenses}
          existingExpenses={expenses}
        />
      </motion.div>

      {/* Expense List by Month */}
      <div className="space-y-3">
        {Array.from(groupedExpenses.entries()).map(
          ([monthKey, monthExpenses], index) => {
            const isExpanded = expandedMonths.has(monthKey);
            const monthTotal = monthExpenses.reduce(
              (sum, e) => sum + e.amount,
              0,
            );

            return (
              <motion.div
                key={monthKey}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className="rounded-lg bg-surface-secondary border border-line overflow-hidden"
              >
                {/* Month Header */}
                <button
                  onClick={() => toggleMonth(monthKey)}
                  className="w-full flex items-center justify-between px-4 py-3 
                           hover:bg-surface-hover transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown
                        size={16}
                        className="text-terminal-accent/60"
                      />
                    ) : (
                      <ChevronRight
                        size={16}
                        className="text-terminal-accent/60"
                      />
                    )}
                    <span className="font-medium text-terminal-accent">
                      {formatMonthKey(monthKey)}
                    </span>
                    <span className="text-sm text-terminal-accent/60">
                      ({monthExpenses.length} items)
                    </span>
                  </div>
                  <span className="font-mono font-bold text-terminal-accent">
                    {formatCurrency(monthTotal)}
                  </span>
                </button>

                {/* Expenses */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-line"
                    >
                      {monthExpenses.map((expense) => (
                        <div
                          key={expense.id}
                          className="flex items-center justify-between px-4 py-2 
                                   border-b border-line/50 last:border-b-0
                                   hover:bg-surface-hover/50 group"
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <span className="font-mono text-terminal-accent w-20 text-right shrink-0">
                              {formatCurrency(expense.amount)}
                            </span>
                            <span className="text-terminal-accent/70 w-28 truncate shrink-0">
                              {expense.account}
                            </span>
                            <span className="text-terminal-accent truncate">
                              {expense.item}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-terminal-accent/50">
                              {new Date(expense.date).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                },
                              )}
                            </span>
                            <button
                              onClick={() => onDeleteExpense(expense.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 
                                       text-terminal-accent/40 hover:text-[#FF6B6B]
                                       transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          },
        )}

        {expenses.length === 0 && (
          <div className="text-center py-12 text-terminal-accent/40">
            <TrendingDown size={48} className="mx-auto mb-4 opacity-50" />
            <p>No expenses logged yet</p>
            <p className="text-sm mt-1">Start tracking to see your runway</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpensesTab;
