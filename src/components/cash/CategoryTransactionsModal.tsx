/**
 * CategoryTransactionsModal Component
 *
 * Modal showing all transactions for a specific category
 * with total spent and individual transaction details.
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, DollarSign, TrendingDown } from "lucide-react";
import type { ParsedTransaction } from "@/lib/ai/bankStatementParser";

interface CategoryTransactionsModalProps {
  category: string;
  transactions: ParsedTransaction[];
  isOpen: boolean;
  onClose: () => void;
  hideBalances: boolean;
}

export const CategoryTransactionsModal: React.FC<
  CategoryTransactionsModalProps
> = ({ category, transactions, isOpen, onClose, hideBalances }) => {
  const formatCurrency = (value: number): string => {
    if (hideBalances) return "$***.**";
    return `$${Math.abs(value).toLocaleString("en-CA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const totalSpent = transactions.reduce(
    (sum, t) => sum + Math.abs(t.amount),
    0,
  );

  // Sort transactions by date (newest first)
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

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

          {/* Modal Container */}
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
                  <h2 className="text-xl font-bold text-terminal-accent capitalize">
                    {category} Spending
                  </h2>
                  <p className="text-sm text-terminal-accent/60 mt-1">
                    {transactions.length} transaction
                    {transactions.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-terminal-accent/60 hover:text-terminal-accent
                           hover:bg-surface-secondary rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Summary */}
              <div className="p-5 border-b border-line">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-surface-secondary border border-line">
                    <div className="flex items-center gap-2 text-terminal-accent/60 text-sm mb-1">
                      <DollarSign size={14} />
                      Total Spent
                    </div>
                    <div className="text-2xl font-bold font-mono text-terminal-accent">
                      {formatCurrency(totalSpent)}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-surface-secondary border border-line">
                    <div className="flex items-center gap-2 text-terminal-accent/60 text-sm mb-1">
                      <TrendingDown size={14} />
                      Avg per Transaction
                    </div>
                    <div className="text-2xl font-bold font-mono text-terminal-accent">
                      {formatCurrency(
                        transactions.length > 0
                          ? totalSpent / transactions.length
                          : 0,
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Transaction List */}
              <div className="p-5 overflow-y-auto max-h-[calc(90vh-280px)]">
                <h3 className="text-sm font-medium text-terminal-accent/60 uppercase tracking-wider mb-3">
                  All Transactions
                </h3>
                <div className="space-y-2">
                  {sortedTransactions.length > 0 ? (
                    sortedTransactions.map((txn, idx) => (
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
                            {formatCurrency(txn.amount)}
                          </span>
                        </div>
                        <div className="text-xs text-terminal-accent/50 truncate pl-6">
                          {txn.description}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-terminal-accent/40 text-sm">
                      No transactions in this category
                    </div>
                  )}
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

export default CategoryTransactionsModal;
