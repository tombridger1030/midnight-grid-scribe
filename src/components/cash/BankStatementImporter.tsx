/**
 * BankStatementImporter Component
 *
 * Collapsible section for uploading and importing bank statements.
 * Supports PDF and image files with AI-powered transaction extraction.
 */

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  parseBankStatement,
  transactionsToExpenses,
  type ParsedTransaction,
  type ParseResult,
} from "@/lib/ai/bankStatementParser";
import { colors } from "@/styles/design-tokens";

export interface Expense {
  id: string;
  amount: number;
  account: string;
  item: string;
  category?: string;
  date: string;
}

interface BankStatementImporterProps {
  onImportExpenses: (expenses: Omit<Expense, "id">[]) => void;
  existingExpenses: Expense[];
}

export const BankStatementImporter: React.FC<BankStatementImporterProps> = ({
  onImportExpenses,
  existingExpenses,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(
    new Set(),
  );
  const [error, setError] = useState<string | null>(null);

  // Reset state
  const reset = useCallback(() => {
    setFile(null);
    setParseResult(null);
    setSelectedTransactions(new Set());
    setError(null);
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;

      // Validate file type
      const validTypes = [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/jpg",
      ];
      const validExtensions = [".pdf", ".png", ".jpg", ".jpeg"];
      const fileExt = "." + selectedFile.name.split(".").pop()?.toLowerCase();

      if (
        !validTypes.includes(selectedFile.type) &&
        !validExtensions.includes(fileExt)
      ) {
        toast.error("Please upload a PDF or image file (PNG, JPG)");
        return;
      }

      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }

      reset();
      setFile(selectedFile);
      setIsProcessing(true);
      setError(null);

      // Process the file
      parseBankStatement(selectedFile)
        .then((result) => {
          setParseResult(result);
          // Select all transactions by default
          setSelectedTransactions(
            new Set(result.transactions.map((_, i) => i)),
          );
          toast.success(`Found ${result.transactions.length} transactions`);
        })
        .catch((err) => {
          const errorMsg =
            err instanceof Error
              ? err.message
              : "Failed to parse bank statement";
          setError(errorMsg);
          toast.error(errorMsg);
        })
        .finally(() => {
          setIsProcessing(false);
        });
    },
    [reset],
  );

  // Toggle transaction selection
  const toggleTransaction = useCallback((index: number) => {
    setSelectedTransactions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  // Toggle all transactions
  const toggleAll = useCallback(() => {
    if (!parseResult) return;

    if (selectedTransactions.size === parseResult.transactions.length) {
      // Deselect all
      setSelectedTransactions(new Set());
    } else {
      // Select all
      setSelectedTransactions(
        new Set(parseResult.transactions.map((_, i) => i)),
      );
    }
  }, [parseResult, selectedTransactions.size]);

  // Remove a transaction
  const removeTransaction = useCallback(
    (index: number) => {
      if (!parseResult) return;

      const newTransactions = [...parseResult.transactions];
      newTransactions.splice(index, 1);

      setParseResult({
        ...parseResult,
        transactions: newTransactions,
        totalAmount: newTransactions.reduce(
          (sum, t) => sum + Math.abs(t.amount),
          0,
        ),
        confidence:
          newTransactions.length > 0
            ? newTransactions.reduce(
                (sum, t) => sum + (t.confidence || 0.5),
                0,
              ) / newTransactions.length
            : 0.5,
      });

      // Update selections
      const newSelections = new Set<number>();
      newTransactions.forEach((_, i) => {
        if (
          selectedTransactions.has(index === i ? index : i > index ? i - 1 : i)
        ) {
          newSelections.add(i);
        }
      });
      setSelectedTransactions(newSelections);
    },
    [parseResult, selectedTransactions],
  );

  // Handle import
  const handleImport = useCallback(() => {
    if (!parseResult || selectedTransactions.size === 0) {
      toast.error("Please select at least one transaction");
      return;
    }

    const selectedExpenses = parseResult.transactions.filter((_, i) =>
      selectedTransactions.has(i),
    );

    // Convert to expense format
    const expensesToAdd = transactionsToExpenses(selectedExpenses);

    // Call parent callback
    onImportExpenses(expensesToAdd);

    toast.success(`Imported ${expensesToAdd.length} expenses`);

    // Reset
    reset();
    setIsCollapsed(true);
  }, [parseResult, selectedTransactions, onImportExpenses, reset]);

  // Format currency
  const formatCurrency = (value: number): string => {
    return `$${value.toFixed(2)}`;
  };

  // Get category color
  const getCategoryColor = (category?: string): string => {
    if (!category) return colors.text.muted;
    const colorMap: Record<string, string> = {
      "Food & Dining": "#FF6B6B",
      Shopping: "#5FE3B3",
      Transportation: "#4ECDC4",
      "Bills & Utilities": "#FFD700",
      Entertainment: "#FF9F43",
      "Health & Wellness": "#26C6DA",
      Travel: "#AB47BC",
      Education: "#42A5F5",
      "Personal Care": "#EC407A",
      "Home Improvement": "#66BB6A",
      Subscriptions: "#FFA726",
      Income: "#5FE3B3",
      Transfer: colors.text.muted,
      Other: colors.text.muted,
    };
    return colorMap[category] || colors.text.muted;
  };

  return (
    <motion.div
      className="rounded-lg overflow-hidden"
      style={{
        backgroundColor: colors.background.secondary,
        border: `1px solid ${colors.border.accent}`,
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header - Clickable to toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-hover transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center"
            style={{
              backgroundColor: `${colors.primary.DEFAULT}20`,
              border: `1px solid ${colors.primary.DEFAULT}40`,
            }}
          >
            <Sparkles size={16} style={{ color: colors.primary.DEFAULT }} />
          </div>
          <span
            className="font-semibold text-sm"
            style={{ color: colors.primary.DEFAULT }}
          >
            AI Bank Statement Import
          </span>
        </div>
        {isCollapsed ? (
          <ChevronDown size={18} style={{ color: colors.text.muted }} />
        ) : (
          <ChevronUp size={18} style={{ color: colors.text.muted }} />
        )}
      </button>

      {/* Content */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="p-4 border-t"
              style={{ borderColor: colors.border.DEFAULT }}
            >
              {/* Upload Area */}
              {!file && !parseResult && (
                <div className="space-y-4">
                  <p className="text-sm" style={{ color: colors.text.muted }}>
                    Upload a bank statement (PDF or image) and AI will
                    automatically extract transactions with categorization.
                  </p>

                  <label
                    className={cn(
                      "flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed cursor-pointer transition-all",
                      isProcessing
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:border-terminal-accent/60",
                    )}
                    style={{
                      borderColor: isProcessing
                        ? colors.border.DEFAULT
                        : `${colors.primary.DEFAULT}40`,
                      backgroundColor: colors.background.tertiary,
                    }}
                  >
                    {isProcessing ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2
                          size={32}
                          className="animate-spin"
                          style={{ color: colors.primary.DEFAULT }}
                        />
                        <span
                          className="text-sm font-medium"
                          style={{ color: colors.primary.DEFAULT }}
                        >
                          Processing bank statement...
                        </span>
                      </div>
                    ) : (
                      <>
                        <Upload
                          size={32}
                          style={{ color: colors.primary.DEFAULT }}
                        />
                        <div className="text-center mt-3">
                          <span
                            className="text-sm font-medium"
                            style={{ color: colors.text.primary }}
                          >
                            Click to upload or drag and drop
                          </span>
                          <p
                            className="text-xs mt-1"
                            style={{ color: colors.text.muted }}
                          >
                            PDF, PNG, JPG up to 10MB
                          </p>
                        </div>
                      </>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleFileSelect}
                      disabled={isProcessing}
                    />
                  </label>

                  {/* Supported formats info */}
                  <div
                    className="flex items-start gap-2 p-3 rounded-md"
                    style={{
                      backgroundColor: `${colors.primary.DEFAULT}10`,
                      border: `1px solid ${colors.primary.DEFAULT}30`,
                    }}
                  >
                    <AlertCircle
                      size={16}
                      style={{ color: colors.primary.DEFAULT }}
                    />
                    <p
                      className="text-xs"
                      style={{ color: colors.text.secondary }}
                    >
                      <strong>Tip:</strong> For best results, use clear images
                      or PDFs. AI works with most bank statement formats from
                      major banks.
                    </p>
                  </div>
                </div>
              )}

              {/* Processing state with file */}
              {file && isProcessing && !parseResult && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2
                    size={32}
                    className="animate-spin"
                    style={{ color: colors.primary.DEFAULT }}
                  />
                  <span
                    className="text-sm font-medium"
                    style={{ color: colors.primary.DEFAULT }}
                  >
                    Analyzing {file.name}...
                  </span>
                  <p className="text-xs" style={{ color: colors.text.muted }}>
                    This may take a moment
                  </p>
                </div>
              )}

              {/* Error state */}
              {error && !parseResult && (
                <div
                  className="flex items-center gap-3 p-4 rounded-md"
                  style={{
                    backgroundColor: `${colors.danger.DEFAULT}10`,
                    border: `1px solid ${colors.danger.DEFAULT}30`,
                  }}
                >
                  <AlertCircle
                    size={18}
                    style={{ color: colors.danger.DEFAULT }}
                  />
                  <div className="flex-1">
                    <p
                      className="text-sm font-medium"
                      style={{ color: colors.danger.DEFAULT }}
                    >
                      Parsing Failed
                    </p>
                    <p
                      className="text-xs mt-1"
                      style={{ color: colors.text.muted }}
                    >
                      {error}
                    </p>
                  </div>
                  <button
                    onClick={reset}
                    className="px-3 py-1 rounded text-xs font-medium"
                    style={{
                      backgroundColor: colors.danger.DEFAULT,
                      color: colors.background.primary,
                    }}
                  >
                    Try Again
                  </button>
                </div>
              )}

              {/* Results */}
              {parseResult && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div
                    className="flex items-center justify-between p-3 rounded-md"
                    style={{ backgroundColor: colors.background.tertiary }}
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <p
                          className="text-xs"
                          style={{ color: colors.text.muted }}
                        >
                          Transactions Found
                        </p>
                        <p
                          className="text-lg font-bold font-mono"
                          style={{ color: colors.primary.DEFAULT }}
                        >
                          {parseResult.transactions.length}
                        </p>
                      </div>
                      <div>
                        <p
                          className="text-xs"
                          style={{ color: colors.text.muted }}
                        >
                          Total Amount
                        </p>
                        <p
                          className="text-lg font-bold font-mono"
                          style={{ color: colors.success.DEFAULT }}
                        >
                          {formatCurrency(parseResult.totalAmount)}
                        </p>
                      </div>
                      <div>
                        <p
                          className="text-xs"
                          style={{ color: colors.text.muted }}
                        >
                          AI Confidence
                        </p>
                        <p
                          className="text-lg font-bold font-mono"
                          style={{
                            color:
                              parseResult.confidence > 0.8
                                ? colors.success.DEFAULT
                                : parseResult.confidence > 0.6
                                  ? colors.warning.DEFAULT
                                  : colors.danger.DEFAULT,
                          }}
                        >
                          {Math.round(parseResult.confidence * 100)}%
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleAll}
                        className="px-3 py-1.5 rounded text-xs font-medium transition-all"
                        style={{
                          backgroundColor: colors.background.elevated,
                          border: `1px solid ${colors.border.DEFAULT}`,
                          color: colors.text.primary,
                        }}
                      >
                        {selectedTransactions.size ===
                        parseResult.transactions.length
                          ? "Deselect All"
                          : "Select All"}
                      </button>
                      <button
                        onClick={reset}
                        className="p-1.5 rounded transition-all"
                        style={{
                          backgroundColor: `${colors.danger.DEFAULT}20`,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = `${colors.danger.DEFAULT}30`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = `${colors.danger.DEFAULT}20`;
                        }}
                      >
                        <X size={16} style={{ color: colors.danger.DEFAULT }} />
                      </button>
                    </div>
                  </div>

                  {/* Transaction List */}
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {parseResult.transactions.map((txn, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-md cursor-pointer transition-all",
                          selectedTransactions.has(index)
                            ? "opacity-100"
                            : "opacity-50",
                        )}
                        style={{
                          backgroundColor: selectedTransactions.has(index)
                            ? `${colors.primary.DEFAULT}15`
                            : colors.background.elevated,
                          border: selectedTransactions.has(index)
                            ? `1px solid ${colors.primary.DEFAULT}40`
                            : `1px solid ${colors.border.DEFAULT}`,
                        }}
                        onClick={() => toggleTransaction(index)}
                      >
                        {/* Checkbox */}
                        <div
                          className={cn(
                            "w-4 h-4 rounded flex items-center justify-center shrink-0",
                            selectedTransactions.has(index)
                              ? "bg-terminal-accent"
                              : "border border-terminal-accent/40",
                          )}
                          style={{
                            backgroundColor: selectedTransactions.has(index)
                              ? colors.primary.DEFAULT
                              : undefined,
                          }}
                        >
                          {selectedTransactions.has(index) && (
                            <Check size={12} style={{ color: "black" }} />
                          )}
                        </div>

                        {/* Date */}
                        <span
                          className="text-xs font-mono w-20 shrink-0"
                          style={{ color: colors.text.muted }}
                        >
                          {txn.date}
                        </span>

                        {/* Description */}
                        <span
                          className="flex-1 text-sm truncate"
                          style={{ color: colors.text.primary }}
                        >
                          {txn.description}
                        </span>

                        {/* Category badge */}
                        {txn.category && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full shrink-0"
                            style={{
                              backgroundColor: `${getCategoryColor(txn.category)}20`,
                              color: getCategoryColor(txn.category),
                            }}
                          >
                            {txn.category}
                          </span>
                        )}

                        {/* Amount */}
                        <span
                          className="text-sm font-mono font-medium w-20 text-right shrink-0"
                          style={{ color: colors.danger.DEFAULT }}
                        >
                          {formatCurrency(Math.abs(txn.amount))}
                        </span>

                        {/* Confidence indicator */}
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              txn.confidence > 0.8
                                ? colors.success.DEFAULT
                                : txn.confidence > 0.6
                                  ? colors.warning.DEFAULT
                                  : colors.danger.DEFAULT,
                          }}
                        />

                        {/* Remove button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTransaction(index);
                          }}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-terminal-accent/20 transition-all"
                          style={{ color: colors.danger.DEFAULT }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </motion.div>
                    ))}
                  </div>

                  {/* Import button */}
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs" style={{ color: colors.text.muted }}>
                      {selectedTransactions.size} transaction
                      {selectedTransactions.size !== 1 ? "s" : ""} selected
                    </p>
                    <button
                      onClick={handleImport}
                      disabled={selectedTransactions.size === 0}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all",
                        selectedTransactions.size > 0
                          ? "hover:opacity-90"
                          : "opacity-50 cursor-not-allowed",
                      )}
                      style={{
                        backgroundColor: colors.primary.DEFAULT,
                        color: "black",
                      }}
                    >
                      <Check size={16} />
                      Import Expenses
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default BankStatementImporter;
