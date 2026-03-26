/**
 * Subscription Detector Service
 *
 * Detects recurring subscriptions from bank transactions.
 * Uses the merchant resolver to get clean vendor names, then
 * analyzes patterns to identify monthly and yearly subscriptions.
 */

import type { ParsedTransaction } from "./bankStatementParser";
import { resolveMerchants, type ResolvedMerchant } from "./merchantResolver";
import type { MerchantCategory } from "./knownMerchants";
import { detectTransferType } from "./transferDetector";

export interface DetectedSubscription {
  id: string;
  merchantName: string; // Original merchant name from statement
  displayName: string; // Clean vendor name
  amount: number; // Average charge amount
  frequency: "monthly" | "yearly" | "quarterly" | "weekly";
  category?: MerchantCategory;
  importance: 1 | 2 | 3 | 4 | 5; // 1 = cancel first, 5 = keep
  isUserOverride: boolean;
  confidence: number; // Detection confidence 0-1
  lastCharged: string; // Most recent charge date
  nextExpected?: string; // Predicted next charge
  transactions: TransactionRef[];
  annualCost: number; // Calculated yearly cost
  source: "pattern" | "ai" | "user" | "cache";
  isSubscriptionService: boolean; // True if known subscription, false if just recurring
  recurringType?: "subscription" | "bill" | "transfer" | "investment" | "other";
}

interface TransactionRef {
  date: string;
  amount: number;
  description: string;
}

interface TransactionGroup {
  vendor: string;
  resolved: ResolvedMerchant;
  transactions: ParsedTransaction[];
  averageAmount: number;
  totalAmount: number;
}

/**
 * Calculate days between two date strings
 */
function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.abs(
    Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

/**
 * Detect subscription frequency from transaction dates
 */
function detectFrequency(dates: string[]): {
  frequency: "monthly" | "yearly" | "quarterly" | "weekly" | null;
  confidence: number;
} {
  if (dates.length < 2) {
    return { frequency: null, confidence: 0 };
  }

  // Sort dates
  const sortedDates = [...dates].sort();

  // Calculate intervals between consecutive charges
  const intervals: number[] = [];
  for (let i = 1; i < sortedDates.length; i++) {
    intervals.push(daysBetween(sortedDates[i - 1], sortedDates[i]));
  }

  if (intervals.length === 0) {
    return { frequency: null, confidence: 0 };
  }

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

  // Classify based on average interval
  // Weekly: 5-9 days
  if (avgInterval >= 5 && avgInterval <= 9) {
    const variance =
      intervals.reduce((sum, i) => sum + Math.abs(i - avgInterval), 0) /
      intervals.length;
    return {
      frequency: "weekly",
      confidence: Math.max(0.5, 1 - variance / 7),
    };
  }

  // Monthly: 28-35 days (at least 1 month between transactions)
  if (avgInterval >= 28 && avgInterval <= 35) {
    const variance =
      intervals.reduce((sum, i) => sum + Math.abs(i - avgInterval), 0) /
      intervals.length;
    return {
      frequency: "monthly",
      confidence: Math.max(0.5, 1 - variance / 30),
    };
  }

  // Quarterly: 80-100 days
  if (avgInterval >= 80 && avgInterval <= 100) {
    const variance =
      intervals.reduce((sum, i) => sum + Math.abs(i - avgInterval), 0) /
      intervals.length;
    return {
      frequency: "quarterly",
      confidence: Math.max(0.5, 1 - variance / 90),
    };
  }

  // Yearly: 350-380 days
  if (avgInterval >= 350 && avgInterval <= 380) {
    return {
      frequency: "yearly",
      confidence: 0.8,
    };
  }

  // Not a clear pattern
  return { frequency: null, confidence: 0 };
}

/**
 * Calculate annual cost based on frequency and amount
 */
function calculateAnnualCost(amount: number, frequency: string): number {
  switch (frequency) {
    case "weekly":
      return amount * 52;
    case "monthly":
      return amount * 12;
    case "quarterly":
      return amount * 4;
    case "yearly":
      return amount;
    default:
      return amount * 12; // Assume monthly as default
  }
}

/**
 * Predict next charge date
 */
function predictNextCharge(lastDate: string, frequency: string): string {
  const date = new Date(lastDate);

  switch (frequency) {
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "quarterly":
      date.setMonth(date.getMonth() + 3);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  return date.toISOString().slice(0, 10);
}

/**
 * Generate unique ID for subscription
 */
function generateSubscriptionId(vendor: string): string {
  return `sub-${vendor.toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString(36)}`;
}

/**
 * Get default importance based on category
 */
function getDefaultImportance(
  category?: MerchantCategory,
  isSubscription?: boolean,
): 1 | 2 | 3 | 4 | 5 {
  if (!category) return 3;

  const importanceMap: Record<MerchantCategory, 1 | 2 | 3 | 4 | 5> = {
    utilities: 5, // Essential - keep
    finance: 4, // Important
    productivity: 4, // Important for work
    health: 3, // Depends on usage
    education: 3, // Depends on usage
    news: 2, // Nice to have
    entertainment: 2, // Nice to have
    gaming: 2, // Nice to have
    lifestyle: 2, // Nice to have
    food: 3, // Depends
    shopping: 3, // Depends
    transportation: 4, // Often necessary
    other: 3, // Unknown
  };

  return importanceMap[category];
}

/**
 * Determine the recurring type based on transaction characteristics
 */
function determineRecurringType(
  description: string,
  category?: MerchantCategory,
  isKnownSubscription?: boolean,
): "subscription" | "bill" | "transfer" | "investment" | "other" {
  // Check for transfer/investment patterns first
  const transferDetection = detectTransferType(description);
  if (transferDetection.type === "investment") {
    return "investment";
  }
  if (transferDetection.type === "transfer") {
    return "transfer";
  }

  // Known subscription services
  if (isKnownSubscription) {
    return "subscription";
  }

  // Bills based on category
  if (category === "utilities") {
    return "bill";
  }

  // Default to subscription if it has a category that suggests it
  const subscriptionCategories: MerchantCategory[] = [
    "entertainment",
    "gaming",
    "news",
    "productivity",
    "health",
    "education",
  ];
  if (category && subscriptionCategories.includes(category)) {
    return "subscription";
  }

  return "other";
}

/**
 * Detect subscriptions from transactions
 */
export async function detectSubscriptions(
  transactions: ParsedTransaction[],
): Promise<DetectedSubscription[]> {
  if (transactions.length === 0) {
    return [];
  }

  // Get unique descriptions
  const uniqueDescriptions = [
    ...new Set(transactions.map((t) => t.description)),
  ];

  // Resolve all merchant names
  const resolvedMerchants = await resolveMerchants(uniqueDescriptions);

  // Group transactions by resolved vendor name
  const vendorGroups = new Map<string, TransactionGroup>();

  for (const txn of transactions) {
    const resolved = resolvedMerchants.get(txn.description);
    if (!resolved) continue;

    const vendorKey = resolved.vendor.toLowerCase();

    if (!vendorGroups.has(vendorKey)) {
      vendorGroups.set(vendorKey, {
        vendor: resolved.vendor,
        resolved,
        transactions: [],
        averageAmount: 0,
        totalAmount: 0,
      });
    }

    const group = vendorGroups.get(vendorKey)!;
    group.transactions.push(txn);
    group.totalAmount += Math.abs(txn.amount);
  }

  // Calculate averages
  for (const group of vendorGroups.values()) {
    group.averageAmount = group.totalAmount / group.transactions.length;
  }

  // Analyze each group for subscription patterns
  const subscriptions: DetectedSubscription[] = [];

  for (const group of vendorGroups.values()) {
    // STRICT: Need at least 2 transactions to be considered a subscription
    // Even known subscription services need multiple charges to confirm
    if (group.transactions.length < 2) {
      continue;
    }

    // Detect frequency from transaction dates
    const dates = group.transactions.map((t) => t.date);
    const { frequency, confidence } = detectFrequency(dates);

    // Skip if no clear pattern and not a known subscription
    if (!frequency && !group.resolved.isSubscription) {
      continue;
    }

    // Check amount consistency (within 10% variance)
    const amounts = group.transactions.map((t) => Math.abs(t.amount));
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const amountVariance =
      amounts.reduce((sum, a) => sum + Math.abs(a - avgAmount), 0) /
      amounts.length;
    const amountConsistency = 1 - amountVariance / avgAmount;

    // Only consider as subscription if amounts are reasonably consistent
    if (amountConsistency < 0.8 && !group.resolved.isSubscription) {
      continue;
    }

    // Sort transactions by date (newest first)
    const sortedTxns = [...group.transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    const lastCharged = sortedTxns[0].date;
    const detectedFrequency = frequency || "monthly";

    // Calculate overall confidence
    const overallConfidence = group.resolved.isSubscription
      ? Math.max(0.75, (confidence + amountConsistency) / 2)
      : (confidence + amountConsistency) / 2;

    const recurringType = determineRecurringType(
      group.transactions[0].description,
      group.resolved.category,
      group.resolved.isSubscription,
    );

    subscriptions.push({
      id: generateSubscriptionId(group.vendor),
      merchantName: group.transactions[0].description,
      displayName: group.vendor,
      amount: avgAmount,
      frequency: detectedFrequency,
      category: group.resolved.category,
      importance: getDefaultImportance(
        group.resolved.category,
        group.resolved.isSubscription,
      ),
      isUserOverride: false,
      confidence: overallConfidence,
      lastCharged,
      nextExpected: predictNextCharge(lastCharged, detectedFrequency),
      transactions: sortedTxns.map((t) => ({
        date: t.date,
        amount: t.amount,
        description: t.description,
      })),
      annualCost: calculateAnnualCost(avgAmount, detectedFrequency),
      source: group.resolved.source,
      isSubscriptionService: group.resolved.isSubscription || false,
      recurringType,
    });
  }

  // Filter out transfers and investments - these are NOT subscriptions
  const filteredSubscriptions = subscriptions.filter(
    (sub) =>
      sub.recurringType !== "transfer" && sub.recurringType !== "investment",
  );

  // Sort by annual cost (highest first)
  filteredSubscriptions.sort((a, b) => b.annualCost - a.annualCost);

  return filteredSubscriptions;
}

/**
 * Calculate total annual cost of all subscriptions
 */
export function calculateTotalAnnualCost(
  subscriptions: DetectedSubscription[],
): number {
  return subscriptions.reduce((sum, sub) => sum + sub.annualCost, 0);
}

/**
 * Get subscriptions grouped by category
 */
export function groupSubscriptionsByCategory(
  subscriptions: DetectedSubscription[],
): Map<MerchantCategory | "other", DetectedSubscription[]> {
  const groups = new Map<MerchantCategory | "other", DetectedSubscription[]>();

  for (const sub of subscriptions) {
    const category = sub.category || "other";
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category)!.push(sub);
  }

  return groups;
}

/**
 * Get subscriptions that might be good to cancel (low importance, high cost)
 */
export function getCancelCandidates(
  subscriptions: DetectedSubscription[],
  maxImportance: number = 2,
): DetectedSubscription[] {
  return subscriptions
    .filter((sub) => sub.importance <= maxImportance)
    .sort((a, b) => b.annualCost - a.annualCost);
}

/**
 * Calculate potential savings from canceling low-importance subscriptions
 */
export function calculatePotentialSavings(
  subscriptions: DetectedSubscription[],
  maxImportance: number = 2,
): number {
  return getCancelCandidates(subscriptions, maxImportance).reduce(
    (sum, sub) => sum + sub.annualCost,
    0,
  );
}

/**
 * Get only true subscription services (Netflix, Spotify, etc.)
 */
export function getSubscriptionServices(
  subscriptions: DetectedSubscription[],
): DetectedSubscription[] {
  return subscriptions.filter(
    (sub) => sub.isSubscriptionService || sub.recurringType === "subscription",
  );
}

/**
 * Get recurring bills (utilities, rent, etc.)
 */
export function getRecurringBills(
  subscriptions: DetectedSubscription[],
): DetectedSubscription[] {
  return subscriptions.filter((sub) => sub.recurringType === "bill");
}

/**
 * Get recurring transfers
 */
export function getRecurringTransfers(
  subscriptions: DetectedSubscription[],
): DetectedSubscription[] {
  return subscriptions.filter((sub) => sub.recurringType === "transfer");
}

/**
 * Get recurring investments
 */
export function getRecurringInvestments(
  subscriptions: DetectedSubscription[],
): DetectedSubscription[] {
  return subscriptions.filter((sub) => sub.recurringType === "investment");
}

/**
 * Get all non-subscription recurring payments
 */
export function getNonSubscriptionRecurring(
  subscriptions: DetectedSubscription[],
): DetectedSubscription[] {
  return subscriptions.filter(
    (sub) => !sub.isSubscriptionService && sub.recurringType !== "subscription",
  );
}
