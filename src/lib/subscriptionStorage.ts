/**
 * Subscription Storage Service
 *
 * Manages localStorage for subscription-related data:
 * - Detected subscriptions cache
 * - User name corrections
 * - Ranking overrides
 * - Last analysis results
 */

import type { RankedSubscription } from "./ai/subscriptionRanker";
import type { MerchantCategory } from "./ai/knownMerchants";

// LocalStorage keys
const STORAGE_KEYS = {
  SUBSCRIPTIONS: "noctisium-subscriptions",
  NAME_CORRECTIONS: "noctisium-name-corrections",
  RANKING_OVERRIDES: "noctisium-subscription-rankings",
  LAST_ANALYSIS: "noctisium-last-analysis",
  DISMISSED_SUGGESTIONS: "noctisium-dismissed-suggestions",
} as const;

/**
 * Stored subscription data (subset of full subscription for storage)
 */
export interface StoredSubscription {
  id: string;
  displayName: string;
  merchantName: string;
  amount: number;
  frequency: "monthly" | "yearly" | "quarterly" | "weekly";
  category?: MerchantCategory;
  importance: 1 | 2 | 3 | 4 | 5;
  isUserOverride: boolean;
  annualCost: number;
  lastCharged: string;
  aiReason?: string;
}

/**
 * Name correction entry
 */
export interface NameCorrection {
  original: string;
  corrected: string;
  category?: MerchantCategory;
  updatedAt: string;
}

/**
 * Analysis metadata
 */
export interface AnalysisMetadata {
  timestamp: string;
  totalSubscriptions: number;
  totalAnnualCost: number;
  potentialSavings: number;
  sourceFile?: string;
}

// ==================== Generic Storage Helpers ====================

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, data: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch {
    console.warn(`Failed to save to ${key}`);
    return false;
  }
}

function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    console.warn(`Failed to remove ${key}`);
  }
}

// ==================== Subscription Storage ====================

/**
 * Save subscriptions to storage
 */
export function saveSubscriptions(
  subscriptions: RankedSubscription[],
): boolean {
  const stored: StoredSubscription[] = subscriptions.map((sub) => ({
    id: sub.id,
    displayName: sub.displayName,
    merchantName: sub.merchantName,
    amount: sub.amount,
    frequency: sub.frequency,
    category: sub.category,
    importance: sub.importance,
    isUserOverride: sub.isUserOverride,
    annualCost: sub.annualCost,
    lastCharged: sub.lastCharged,
    aiReason: sub.aiReason,
  }));

  return saveToStorage(STORAGE_KEYS.SUBSCRIPTIONS, stored);
}

/**
 * Load subscriptions from storage
 */
export function loadSubscriptions(): StoredSubscription[] {
  return loadFromStorage<StoredSubscription[]>(STORAGE_KEYS.SUBSCRIPTIONS, []);
}

/**
 * Clear subscriptions from storage
 */
export function clearSubscriptions(): void {
  removeFromStorage(STORAGE_KEYS.SUBSCRIPTIONS);
}

// ==================== Name Corrections ====================

/**
 * Get all name corrections
 */
export function getNameCorrections(): Record<string, NameCorrection> {
  return loadFromStorage<Record<string, NameCorrection>>(
    STORAGE_KEYS.NAME_CORRECTIONS,
    {},
  );
}

/**
 * Save a name correction
 */
export function saveNameCorrection(
  original: string,
  corrected: string,
  category?: MerchantCategory,
): void {
  const corrections = getNameCorrections();
  const key = original.toUpperCase().trim();

  corrections[key] = {
    original,
    corrected,
    category,
    updatedAt: new Date().toISOString(),
  };

  saveToStorage(STORAGE_KEYS.NAME_CORRECTIONS, corrections);
}

/**
 * Get a specific name correction
 */
export function getNameCorrection(original: string): NameCorrection | null {
  const corrections = getNameCorrections();
  const key = original.toUpperCase().trim();
  return corrections[key] || null;
}

/**
 * Remove a name correction
 */
export function removeNameCorrection(original: string): void {
  const corrections = getNameCorrections();
  const key = original.toUpperCase().trim();
  delete corrections[key];
  saveToStorage(STORAGE_KEYS.NAME_CORRECTIONS, corrections);
}

/**
 * Clear all name corrections
 */
export function clearNameCorrections(): void {
  removeFromStorage(STORAGE_KEYS.NAME_CORRECTIONS);
}

// ==================== Analysis Metadata ====================

/**
 * Save analysis metadata
 */
export function saveAnalysisMetadata(metadata: AnalysisMetadata): void {
  saveToStorage(STORAGE_KEYS.LAST_ANALYSIS, metadata);
}

/**
 * Load analysis metadata
 */
export function loadAnalysisMetadata(): AnalysisMetadata | null {
  return loadFromStorage<AnalysisMetadata | null>(
    STORAGE_KEYS.LAST_ANALYSIS,
    null,
  );
}

/**
 * Clear analysis metadata
 */
export function clearAnalysisMetadata(): void {
  removeFromStorage(STORAGE_KEYS.LAST_ANALYSIS);
}

// ==================== Dismissed Suggestions ====================

/**
 * Dismiss a cancel suggestion
 */
export function dismissSuggestion(subscriptionId: string): void {
  const dismissed = loadFromStorage<string[]>(
    STORAGE_KEYS.DISMISSED_SUGGESTIONS,
    [],
  );
  if (!dismissed.includes(subscriptionId)) {
    dismissed.push(subscriptionId);
    saveToStorage(STORAGE_KEYS.DISMISSED_SUGGESTIONS, dismissed);
  }
}

/**
 * Check if a suggestion is dismissed
 */
export function isSuggestionDismissed(subscriptionId: string): boolean {
  const dismissed = loadFromStorage<string[]>(
    STORAGE_KEYS.DISMISSED_SUGGESTIONS,
    [],
  );
  return dismissed.includes(subscriptionId);
}

/**
 * Restore a dismissed suggestion
 */
export function restoreSuggestion(subscriptionId: string): void {
  const dismissed = loadFromStorage<string[]>(
    STORAGE_KEYS.DISMISSED_SUGGESTIONS,
    [],
  );
  const filtered = dismissed.filter((id) => id !== subscriptionId);
  saveToStorage(STORAGE_KEYS.DISMISSED_SUGGESTIONS, filtered);
}

/**
 * Get all dismissed suggestions
 */
export function getDismissedSuggestions(): string[] {
  return loadFromStorage<string[]>(STORAGE_KEYS.DISMISSED_SUGGESTIONS, []);
}

/**
 * Clear dismissed suggestions
 */
export function clearDismissedSuggestions(): void {
  removeFromStorage(STORAGE_KEYS.DISMISSED_SUGGESTIONS);
}

// ==================== Full Reset ====================

/**
 * Clear all subscription-related storage
 */
export function clearAllSubscriptionData(): void {
  Object.values(STORAGE_KEYS).forEach((key) => {
    removeFromStorage(key);
  });
}

// ==================== Export/Import ====================

/**
 * Export all subscription data for backup
 */
export function exportSubscriptionData(): string {
  const data = {
    subscriptions: loadSubscriptions(),
    nameCorrections: getNameCorrections(),
    analysis: loadAnalysisMetadata(),
    dismissed: getDismissedSuggestions(),
    exportedAt: new Date().toISOString(),
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Import subscription data from backup
 */
export function importSubscriptionData(jsonData: string): boolean {
  try {
    const data = JSON.parse(jsonData);

    if (data.subscriptions) {
      saveToStorage(STORAGE_KEYS.SUBSCRIPTIONS, data.subscriptions);
    }

    if (data.nameCorrections) {
      saveToStorage(STORAGE_KEYS.NAME_CORRECTIONS, data.nameCorrections);
    }

    if (data.analysis) {
      saveToStorage(STORAGE_KEYS.LAST_ANALYSIS, data.analysis);
    }

    if (data.dismissed) {
      saveToStorage(STORAGE_KEYS.DISMISSED_SUGGESTIONS, data.dismissed);
    }

    return true;
  } catch {
    console.error("Failed to import subscription data");
    return false;
  }
}

/**
 * Get storage statistics
 */
export function getStorageStats(): {
  subscriptionCount: number;
  correctionCount: number;
  lastAnalysis: string | null;
  storageSize: number;
} {
  const subscriptions = loadSubscriptions();
  const corrections = getNameCorrections();
  const analysis = loadAnalysisMetadata();

  // Estimate storage size
  let storageSize = 0;
  Object.values(STORAGE_KEYS).forEach((key) => {
    const item = localStorage.getItem(key);
    if (item) {
      storageSize += item.length * 2; // UTF-16 encoding
    }
  });

  return {
    subscriptionCount: subscriptions.length,
    correctionCount: Object.keys(corrections).length,
    lastAnalysis: analysis?.timestamp || null,
    storageSize,
  };
}
