/**
 * BankStatementImporter Component
 *
 * Hero-style upload zone for bank statements with 3-step wizard:
 * 1. Upload - Drop/select multiple files
 * 2. Review - Review low confidence items before import
 * 3. Preview - See all transactions with inflow/outflow tabs
 *
 * Supports PDF, CSV, and image files with AI-powered transaction extraction.
 */

import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  X,
  Check,
  AlertCircle,
  Loader2,
  FileText,
  ChevronRight,
  AlertTriangle,
  Edit2,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  parseBankStatement,
  transactionsToExpenses,
  type ParseResult,
  type ParsedTransaction,
} from "@/lib/ai/bankStatementParser";

export interface Expense {
  id: string;
  amount: number;
  account: string;
  item: string;
  category?: string;
  date: string;
  isInflow?: boolean;
}

interface BankStatementImporterProps {
  onImportExpenses: (expenses: Omit<Expense, "id">[]) => void;
  existingExpenses: Expense[];
}

// File parse state for multi-file support
interface FileParseState {
  file: File;
  status: "pending" | "parsing" | "done" | "error";
  result?: ParseResult;
  error?: string;
}

// Import wizard step
type ImportStep = "upload" | "review" | "preview";

// Transaction filter for preview
type TransactionFilter = "all" | "outflow" | "inflow";

// Categories for manual editing
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

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
  "Food & Dining": "text-orange-400 bg-orange-400/10",
  Shopping: "text-blue-400 bg-blue-400/10",
  Transportation: "text-yellow-400 bg-yellow-400/10",
  "Bills & Utilities": "text-red-400 bg-red-400/10",
  Entertainment: "text-purple-400 bg-purple-400/10",
  "Health & Wellness": "text-green-400 bg-green-400/10",
  Travel: "text-cyan-400 bg-cyan-400/10",
  Education: "text-indigo-400 bg-indigo-400/10",
  "Personal Care": "text-pink-400 bg-pink-400/10",
  Subscriptions: "text-violet-400 bg-violet-400/10",
  Income: "text-emerald-400 bg-emerald-400/10",
  Transfer: "text-blue-300 bg-blue-300/10",
  Investment: "text-teal-400 bg-teal-400/10",
  Other: "text-slate-400 bg-slate-400/10",
};

// Confidence threshold for review
const CONFIDENCE_THRESHOLD = 0.7;

export const BankStatementImporter: React.FC<BankStatementImporterProps> = ({
  onImportExpenses,
}) => {
  // Wizard step state
  const [step, setStep] = useState<ImportStep>("upload");

  // Multi-file state
  const [files, setFiles] = useState<FileParseState[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // Merged transactions from all files
  const [allTransactions, setAllTransactions] = useState<ParsedTransaction[]>(
    [],
  );

  // Selected transactions for import
  const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(
    new Set(),
  );

  // Review state
  const [reviewedIndices, setReviewedIndices] = useState<Set<number>>(
    new Set(),
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");

  // Preview filter
  const [filter, setFilter] = useState<TransactionFilter>("all");

  // Compute low confidence items
  const lowConfidenceItems = useMemo(() => {
    return allTransactions
      .map((txn, index) => ({ txn, index }))
      .filter(({ txn }) => txn.confidence < CONFIDENCE_THRESHOLD);
  }, [allTransactions]);

  const unreviewedItems = useMemo(() => {
    return lowConfidenceItems.filter(
      ({ index }) => !reviewedIndices.has(index),
    );
  }, [lowConfidenceItems, reviewedIndices]);

  // Compute totals
  const totals = useMemo(() => {
    const outflow = allTransactions
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const inflow = allTransactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    const outflowCount = allTransactions.filter((t) => t.amount < 0).length;
    const inflowCount = allTransactions.filter((t) => t.amount > 0).length;
    return {
      outflow,
      inflow,
      net: inflow - outflow,
      outflowCount,
      inflowCount,
    };
  }, [allTransactions]);

  // Filtered transactions for preview
  const filteredTransactions = useMemo(() => {
    switch (filter) {
      case "outflow":
        return allTransactions.filter((t) => t.amount < 0);
      case "inflow":
        return allTransactions.filter((t) => t.amount > 0);
      default:
        return allTransactions;
    }
  }, [allTransactions, filter]);

  // Reset all state
  const reset = useCallback(() => {
    setStep("upload");
    setFiles([]);
    setAllTransactions([]);
    setSelectedTransactions(new Set());
    setReviewedIndices(new Set());
    setEditingIndex(null);
    setFilter("all");
  }, []);

  // Process a single file
  const processFile = useCallback(async (file: File, index: number) => {
    setFiles((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status: "parsing" };
      return updated;
    });

    try {
      const result = await parseBankStatement(file);
      setFiles((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], status: "done", result };
        return updated;
      });
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to parse";
      setFiles((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          status: "error",
          error: errorMsg,
        };
        return updated;
      });
      return null;
    }
  }, []);

  // Process all pending files
  const processAllFiles = useCallback(async () => {
    const pendingFiles = files.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) return;

    // Process files sequentially to avoid overwhelming the API
    const allResults: ParsedTransaction[] = [];

    for (let i = 0; i < files.length; i++) {
      if (files[i].status === "pending") {
        const result = await processFile(files[i].file, i);
        if (result) {
          allResults.push(...result.transactions);
        }
      } else if (files[i].status === "done" && files[i].result) {
        allResults.push(...files[i].result!.transactions);
      }
    }

    // Merge all transactions
    setAllTransactions(allResults);
    setSelectedTransactions(new Set(allResults.map((_, i) => i)));

    // Determine next step
    const lowConf = allResults.filter(
      (t) => t.confidence < CONFIDENCE_THRESHOLD,
    );
    if (lowConf.length > 0) {
      setStep("review");
    } else {
      setStep("preview");
    }

    toast.success(
      `Found ${allResults.length} transactions from ${files.length} file${files.length > 1 ? "s" : ""}`,
    );
  }, [files, processFile]);

  // Handle file selection (multi)
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      if (selectedFiles.length === 0) return;

      const validFiles = selectedFiles.filter((file) => {
        const validTypes = [
          "application/pdf",
          "image/png",
          "image/jpeg",
          "image/jpg",
          "text/csv",
          "application/vnd.ms-excel",
        ];
        const validExtensions = [".pdf", ".png", ".jpg", ".jpeg", ".csv"];
        const fileExt = "." + file.name.split(".").pop()?.toLowerCase();
        return (
          validTypes.includes(file.type) || validExtensions.includes(fileExt)
        );
      });

      if (validFiles.length === 0) {
        toast.error("Please upload PDF, CSV, or image files");
        return;
      }

      const newFiles: FileParseState[] = validFiles.map((file) => ({
        file,
        status: "pending" as const,
      }));

      setFiles((prev) => [...prev, ...newFiles]);
    },
    [],
  );

  // Handle drag and drop (multi)
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;

    const validFiles = droppedFiles.filter((file) => {
      const validTypes = [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/jpg",
        "text/csv",
        "application/vnd.ms-excel",
      ];
      const validExtensions = [".pdf", ".png", ".jpg", ".jpeg", ".csv"];
      const fileExt = "." + file.name.split(".").pop()?.toLowerCase();
      return (
        validTypes.includes(file.type) || validExtensions.includes(fileExt)
      );
    });

    if (validFiles.length === 0) {
      toast.error("Please upload PDF, CSV, or image files");
      return;
    }

    const newFiles: FileParseState[] = validFiles.map((file) => ({
      file,
      status: "pending" as const,
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  // Remove a file
  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Review: Start editing
  const startEdit = useCallback((index: number, txn: ParsedTransaction) => {
    setEditingIndex(index);
    setEditName(txn.description);
    setEditCategory(txn.category || "Other");
  }, []);

  // Review: Save edit
  const saveEdit = useCallback(
    (originalIndex: number) => {
      setAllTransactions((prev) => {
        const updated = [...prev];
        updated[originalIndex] = {
          ...updated[originalIndex],
          description: editName,
          category: editCategory,
          confidence: 0.95, // Boost confidence after manual review
        };
        return updated;
      });
      setReviewedIndices((prev) => new Set([...prev, originalIndex]));
      setEditingIndex(null);
    },
    [editName, editCategory],
  );

  // Review: Confirm as correct
  const confirmCorrect = useCallback((index: number) => {
    setAllTransactions((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        confidence: 0.95,
      };
      return updated;
    });
    setReviewedIndices((prev) => new Set([...prev, index]));
  }, []);

  // Review: Cancel edit
  const cancelEdit = useCallback(() => {
    setEditingIndex(null);
    setEditName("");
    setEditCategory("");
  }, []);

  // Continue to preview from review
  const continueToPreview = useCallback(() => {
    setStep("preview");
  }, []);

  // Toggle transaction selection in preview
  const toggleTransaction = useCallback((index: number) => {
    setSelectedTransactions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  // Toggle all in current filter
  const toggleAll = useCallback(() => {
    const filteredIndices = filteredTransactions.map((t) =>
      allTransactions.indexOf(t),
    );
    const allSelected = filteredIndices.every((i) =>
      selectedTransactions.has(i),
    );

    if (allSelected) {
      setSelectedTransactions((prev) => {
        const next = new Set(prev);
        filteredIndices.forEach((i) => next.delete(i));
        return next;
      });
    } else {
      setSelectedTransactions((prev) => {
        const next = new Set(prev);
        filteredIndices.forEach((i) => next.add(i));
        return next;
      });
    }
  }, [filteredTransactions, allTransactions, selectedTransactions]);

  // Handle import
  const handleImport = useCallback(() => {
    if (selectedTransactions.size === 0) {
      toast.error("Please select at least one transaction");
      return;
    }

    const selectedTxns = allTransactions.filter((_, i) =>
      selectedTransactions.has(i),
    );
    const expensesToAdd = transactionsToExpenses(selectedTxns);
    onImportExpenses(expensesToAdd);
    toast.success(`Imported ${expensesToAdd.length} transactions`);
    reset();
  }, [allTransactions, selectedTransactions, onImportExpenses, reset]);

  const formatCurrency = (value: number): string => {
    const absValue = Math.abs(value);
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 2,
    }).format(absValue);
  };

  const getCategoryStyle = (category?: string): string => {
    return CATEGORY_COLORS[category || "Other"] || CATEGORY_COLORS.Other;
  };

  const isProcessing = files.some((f) => f.status === "parsing");
  const hasPendingFiles = files.some((f) => f.status === "pending");
  const allDone =
    files.length > 0 &&
    files.every((f) => f.status === "done" || f.status === "error");

  return (
    <div className="space-y-4">
      {/* Step 1: Upload */}
      {step === "upload" && (
        <>
          {/* Main Upload Zone */}
          <motion.label
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              "flex flex-col items-center justify-center p-12 rounded-xl",
              "border-2 border-dashed cursor-pointer transition-all duration-200",
              isDragOver
                ? "border-terminal-accent bg-terminal-accent/10"
                : "border-line/50 hover:border-terminal-accent/50 hover:bg-surface-secondary",
            )}
          >
            <div
              className={cn(
                "w-16 h-16 rounded-xl flex items-center justify-center mb-4 transition-colors",
                isDragOver ? "bg-terminal-accent/20" : "bg-surface-secondary",
              )}
            >
              <Upload
                size={28}
                className={cn(
                  "transition-colors",
                  isDragOver
                    ? "text-terminal-accent"
                    : "text-terminal-accent/60",
                )}
              />
            </div>
            <p className="text-lg font-medium text-terminal-accent mb-1">
              Drop your bank statements here
            </p>
            <p className="text-sm text-terminal-accent/50 mb-4">
              or click to browse files (multiple supported)
            </p>
            <div className="flex items-center gap-3 text-xs text-terminal-accent/40">
              <span className="px-2 py-1 rounded bg-surface-secondary">
                PDF
              </span>
              <span className="px-2 py-1 rounded bg-surface-secondary">
                CSV
              </span>
              <span className="px-2 py-1 rounded bg-surface-secondary">
                PNG
              </span>
              <span className="px-2 py-1 rounded bg-surface-secondary">
                JPG
              </span>
            </div>
            <input
              type="file"
              className="hidden"
              accept=".pdf,.csv,.png,.jpg,.jpeg"
              onChange={handleFileSelect}
              multiple
              disabled={isProcessing}
            />
          </motion.label>

          {/* File List */}
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              {files.map((f, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-all",
                    f.status === "done"
                      ? "bg-neon-green/5 border-neon-green/30"
                      : f.status === "error"
                        ? "bg-red-500/5 border-red-500/30"
                        : f.status === "parsing"
                          ? "bg-terminal-accent/5 border-terminal-accent/30"
                          : "bg-surface-secondary border-line/30",
                  )}
                >
                  <FileText
                    size={18}
                    className={cn(
                      f.status === "done"
                        ? "text-neon-green"
                        : f.status === "error"
                          ? "text-red-400"
                          : "text-terminal-accent/60",
                    )}
                  />
                  <span className="flex-1 text-sm text-terminal-accent truncate">
                    {f.file.name}
                  </span>
                  {f.status === "parsing" && (
                    <Loader2
                      size={16}
                      className="animate-spin text-terminal-accent"
                    />
                  )}
                  {f.status === "done" && f.result && (
                    <span className="text-xs text-neon-green">
                      {f.result.transactions.length} transactions
                    </span>
                  )}
                  {f.status === "error" && (
                    <span className="text-xs text-red-400">{f.error}</span>
                  )}
                  {f.status === "pending" && (
                    <button
                      onClick={() => removeFile(i)}
                      className="p-1 rounded hover:bg-red-500/10 text-red-400/50 hover:text-red-400 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}

              {/* Parse Button */}
              {hasPendingFiles && !isProcessing && (
                <button
                  onClick={processAllFiles}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg
                           bg-terminal-accent text-black font-medium hover:opacity-90 transition-all"
                >
                  <ChevronRight size={18} />
                  Parse {
                    files.filter((f) => f.status === "pending").length
                  }{" "}
                  File
                  {files.filter((f) => f.status === "pending").length > 1
                    ? "s"
                    : ""}
                </button>
              )}

              {/* Processing indicator */}
              {isProcessing && (
                <div className="flex items-center justify-center gap-2 p-3 text-terminal-accent/60">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Analyzing with AI...</span>
                </div>
              )}
            </motion.div>
          )}
        </>
      )}

      {/* Step 2: Review Low Confidence Items */}
      {step === "review" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Review Header */}
          <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle size={16} className="text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-300">
                  Review Needed ({unreviewedItems.length} of{" "}
                  {lowConfidenceItems.length})
                </p>
                <p className="text-xs text-amber-300/60">
                  These items have low confidence and may need correction
                </p>
              </div>
            </div>

            {/* Review List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {lowConfidenceItems.map(({ txn, index }) => {
                const isEditing = editingIndex === index;
                const isReviewed = reviewedIndices.has(index);

                return (
                  <motion.div
                    key={`review-${index}`}
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
                            onClick={() => saveEdit(index)}
                            className="px-3 py-1.5 text-xs font-medium text-black bg-terminal-accent rounded-lg hover:opacity-90 transition-colors"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-terminal-accent/40 w-20 shrink-0">
                          {txn.date}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-terminal-accent truncate">
                            {txn.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={cn(
                                "text-xs px-2 py-0.5 rounded-full",
                                getCategoryStyle(txn.category),
                              )}
                            >
                              {txn.category || "Other"}
                            </span>
                            <span className="text-xs text-amber-400">
                              {Math.round(txn.confidence * 100)}% confident
                            </span>
                          </div>
                        </div>
                        <span
                          className={cn(
                            "text-sm font-mono shrink-0",
                            txn.amount < 0
                              ? "text-red-400"
                              : "text-emerald-400",
                          )}
                        >
                          {txn.amount < 0 ? "-" : "+"}
                          {formatCurrency(txn.amount)}
                        </span>
                        {isReviewed ? (
                          <Check
                            size={16}
                            className="text-neon-green shrink-0"
                          />
                        ) : (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => confirmCorrect(index)}
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
          </div>

          {/* Continue Button */}
          <button
            onClick={continueToPreview}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg
                     bg-terminal-accent text-black font-medium hover:opacity-90 transition-all"
          >
            Continue to Preview
            <ChevronRight size={18} />
          </button>

          {/* Back Button */}
          <button
            onClick={reset}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg
                     text-terminal-accent/60 hover:text-terminal-accent transition-colors"
          >
            <X size={16} />
            Start Over
          </button>
        </motion.div>
      )}

      {/* Step 3: Preview */}
      {step === "preview" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpRight size={16} className="text-red-400" />
                <span className="text-xs text-red-400/70">Outflow</span>
              </div>
              <p className="text-xl font-bold font-mono text-red-400">
                -{formatCurrency(totals.outflow)}
              </p>
              <p className="text-xs text-red-400/50 mt-1">
                {totals.outflowCount} transactions
              </p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownLeft size={16} className="text-emerald-400" />
                <span className="text-xs text-emerald-400/70">Inflow</span>
              </div>
              <p className="text-xl font-bold font-mono text-emerald-400">
                +{formatCurrency(totals.inflow)}
              </p>
              <p className="text-xs text-emerald-400/50 mt-1">
                {totals.inflowCount} transactions
              </p>
            </div>
            <div className="p-4 rounded-xl bg-surface-secondary border border-line/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-terminal-accent/50">Net</span>
              </div>
              <p
                className={cn(
                  "text-xl font-bold font-mono",
                  totals.net >= 0 ? "text-emerald-400" : "text-red-400",
                )}
              >
                {totals.net >= 0 ? "+" : "-"}
                {formatCurrency(totals.net)}
              </p>
              <p className="text-xs text-terminal-accent/50 mt-1">
                {allTransactions.length} total
              </p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-1 p-1 bg-surface-secondary rounded-lg w-fit">
            <button
              onClick={() => setFilter("all")}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all",
                filter === "all"
                  ? "bg-terminal-accent text-black"
                  : "text-terminal-accent/70 hover:text-terminal-accent",
              )}
            >
              All ({allTransactions.length})
            </button>
            <button
              onClick={() => setFilter("outflow")}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all",
                filter === "outflow"
                  ? "bg-red-500 text-white"
                  : "text-red-400/70 hover:text-red-400",
              )}
            >
              Outflow ({totals.outflowCount})
            </button>
            <button
              onClick={() => setFilter("inflow")}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all",
                filter === "inflow"
                  ? "bg-emerald-500 text-white"
                  : "text-emerald-400/70 hover:text-emerald-400",
              )}
            >
              Inflow ({totals.inflowCount})
            </button>
          </div>

          {/* Select/Deselect All */}
          <div className="flex items-center justify-between">
            <button
              onClick={toggleAll}
              className="text-sm text-terminal-accent/60 hover:text-terminal-accent transition-colors"
            >
              {filteredTransactions.every((t) =>
                selectedTransactions.has(allTransactions.indexOf(t)),
              )
                ? "Deselect All"
                : "Select All"}
            </button>
            <span className="text-sm text-terminal-accent/50">
              {selectedTransactions.size} selected
            </span>
          </div>

          {/* Transaction List */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto rounded-xl">
            {filteredTransactions.map((txn) => {
              const originalIndex = allTransactions.indexOf(txn);
              const isSelected = selectedTransactions.has(originalIndex);

              return (
                <motion.div
                  key={originalIndex}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => toggleTransaction(originalIndex)}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-all",
                    isSelected
                      ? "bg-terminal-accent/10 border border-terminal-accent/30"
                      : "bg-surface-secondary border border-line/30 opacity-60 hover:opacity-80",
                  )}
                >
                  {/* Checkbox */}
                  <div
                    className={cn(
                      "w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors",
                      isSelected ? "bg-terminal-accent" : "border border-line",
                    )}
                  >
                    {isSelected && <Check size={14} className="text-black" />}
                  </div>

                  {/* Date */}
                  <span className="text-sm font-mono text-terminal-accent/50 w-24 shrink-0">
                    {txn.date}
                  </span>

                  {/* Description */}
                  <span className="flex-1 text-sm text-terminal-accent truncate">
                    {txn.description}
                  </span>

                  {/* Category */}
                  {txn.category && (
                    <span
                      className={cn(
                        "text-xs px-2.5 py-1 rounded-full shrink-0",
                        getCategoryStyle(txn.category),
                      )}
                    >
                      {txn.category}
                    </span>
                  )}

                  {/* Amount */}
                  <span
                    className={cn(
                      "text-sm font-mono font-medium w-28 text-right shrink-0",
                      txn.amount < 0 ? "text-red-400" : "text-emerald-400",
                    )}
                  >
                    {txn.amount < 0 ? "-" : "+"}
                    {formatCurrency(txn.amount)}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {/* Import Button */}
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={reset}
              className="px-4 py-3 rounded-lg border border-line/50 text-terminal-accent/60
                       hover:text-terminal-accent hover:border-terminal-accent/30 transition-all"
            >
              <X size={18} />
            </button>
            <button
              onClick={handleImport}
              disabled={selectedTransactions.size === 0}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all",
                selectedTransactions.size > 0
                  ? "bg-terminal-accent text-black hover:opacity-90"
                  : "bg-surface-secondary text-terminal-accent/30 cursor-not-allowed",
              )}
            >
              <Check size={18} />
              Import {selectedTransactions.size} Transactions
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default BankStatementImporter;
