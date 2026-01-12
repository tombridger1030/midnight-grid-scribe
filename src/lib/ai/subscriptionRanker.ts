/**
 * Subscription Ranker Service
 *
 * Uses Claude AI to analyze and rank subscriptions by importance.
 * Considers factors like:
 * - Essential services (utilities, insurance)
 * - Work productivity tools
 * - Lifestyle/entertainment value
 * - Cost vs usage patterns
 */

import { supabase, SUPABASE_URL } from "@/lib/supabase";
import type { DetectedSubscription } from "./subscriptionDetector";
import type { MerchantCategory } from "./knownMerchants";

// Edge Function URL for AI proxy
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/ai-proxy`;

// LocalStorage key for user ranking overrides
const RANKING_OVERRIDES_KEY = "noctisium-subscription-rankings";

export interface RankedSubscription extends DetectedSubscription {
  aiReason?: string; // Why AI assigned this ranking
  cancelRecommendation?: string; // Suggestion for canceling
}

interface RankingOverride {
  subscriptionId: string;
  importance: 1 | 2 | 3 | 4 | 5;
  userNote?: string;
  updatedAt: string;
}

interface RankingOverrides {
  [subscriptionId: string]: RankingOverride;
}

interface AIRankingResult {
  vendor: string;
  importance: number;
  reason: string;
  cancelRecommendation?: string;
}

/**
 * Load ranking overrides from localStorage
 */
function loadRankingOverrides(): RankingOverrides {
  try {
    const stored = localStorage.getItem(RANKING_OVERRIDES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Save ranking overrides to localStorage
 */
function saveRankingOverrides(overrides: RankingOverrides): void {
  try {
    localStorage.setItem(RANKING_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    console.warn("Failed to save ranking overrides");
  }
}

/**
 * Get user's ranking override for a subscription
 */
export function getRankingOverride(
  subscriptionId: string,
): RankingOverride | null {
  const overrides = loadRankingOverrides();
  return overrides[subscriptionId] || null;
}

/**
 * Save user's ranking override
 */
export function setRankingOverride(
  subscriptionId: string,
  importance: 1 | 2 | 3 | 4 | 5,
  userNote?: string,
): void {
  const overrides = loadRankingOverrides();
  overrides[subscriptionId] = {
    subscriptionId,
    importance,
    userNote,
    updatedAt: new Date().toISOString(),
  };
  saveRankingOverrides(overrides);
}

/**
 * Remove user's ranking override
 */
export function clearRankingOverride(subscriptionId: string): void {
  const overrides = loadRankingOverrides();
  delete overrides[subscriptionId];
  saveRankingOverrides(overrides);
}

/**
 * Get all ranking overrides
 */
export function getAllRankingOverrides(): RankingOverrides {
  return loadRankingOverrides();
}

/**
 * Build context for AI ranking
 */
function buildSubscriptionContext(
  subscriptions: DetectedSubscription[],
): string {
  return subscriptions
    .map((sub) => {
      const frequency = sub.frequency === "yearly" ? "annual" : sub.frequency;
      return `- ${sub.displayName}: $${sub.amount.toFixed(2)}/${frequency}, category: ${sub.category || "unknown"}, annual cost: $${sub.annualCost.toFixed(2)}`;
    })
    .join("\n");
}

/**
 * Rank subscriptions using Claude AI
 */
export async function rankSubscriptionsWithAI(
  subscriptions: DetectedSubscription[],
): Promise<RankedSubscription[]> {
  if (subscriptions.length === 0) {
    return [];
  }

  // Start with default rankings
  const rankedSubscriptions: RankedSubscription[] = subscriptions.map(
    (sub) => ({
      ...sub,
    }),
  );

  // Apply any existing user overrides first
  const overrides = loadRankingOverrides();
  for (const sub of rankedSubscriptions) {
    const override = overrides[sub.id];
    if (override) {
      sub.importance = override.importance;
      sub.isUserOverride = true;
    }
  }

  // Filter out subscriptions with user overrides for AI ranking
  const needsRanking = rankedSubscriptions.filter((sub) => !sub.isUserOverride);

  if (needsRanking.length === 0) {
    return rankedSubscriptions;
  }

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabase.supabaseKey}`,
        apikey: supabase.supabaseKey,
      },
      body: JSON.stringify({
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: `You are a personal finance advisor analyzing someone's subscription spending.

Your task is to rank subscriptions by importance on a scale of 1-5:
- 5 (Essential): Utilities, insurance, critical work tools, health necessities
- 4 (Very Important): Productivity software for work, professional development
- 3 (Moderately Important): Regular-use services, valuable entertainment
- 2 (Low Priority): Nice-to-have entertainment, redundant services
- 1 (Consider Canceling): Unused, forgotten, or poor value subscriptions

Consider:
1. Is this essential for daily life or work?
2. What's the cost vs value received?
3. Are there free or cheaper alternatives?
4. Is there overlap with other subscriptions?

Be practical and honest. Most streaming services are 2-3, not essential.
Work tools used daily are 4-5.
Redundant services (multiple streaming) should be ranked lower.

Return ONLY valid JSON array, no explanation outside the JSON.`,
        messages: [
          {
            role: "user",
            content: `Analyze and rank these subscriptions by importance (1-5):

${buildSubscriptionContext(needsRanking)}

Return JSON array:
[
  {
    "vendor": "Service Name",
    "importance": 1-5,
    "reason": "Brief explanation (1 sentence)",
    "cancelRecommendation": "Optional: suggestion if importance <= 2"
  }
]`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("AI ranking failed:", error);
      return rankedSubscriptions;
    }

    const data = await response.json();
    const content = data.content[0].text;

    // Parse AI response
    let rankings: AIRankingResult[] = [];
    try {
      rankings = JSON.parse(content);
    } catch {
      // Try to extract JSON array from response
      const match = content.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          rankings = JSON.parse(match[0]);
        } catch {
          console.error("Could not parse AI ranking response");
          return rankedSubscriptions;
        }
      }
    }

    // Apply AI rankings
    for (const ranking of rankings) {
      const sub = rankedSubscriptions.find(
        (s) =>
          s.displayName.toLowerCase() === ranking.vendor.toLowerCase() ||
          s.merchantName.toLowerCase().includes(ranking.vendor.toLowerCase()),
      );

      if (sub && !sub.isUserOverride) {
        sub.importance = Math.max(
          1,
          Math.min(5, Math.round(ranking.importance)),
        ) as 1 | 2 | 3 | 4 | 5;
        sub.aiReason = ranking.reason;
        sub.cancelRecommendation = ranking.cancelRecommendation;
      }
    }
  } catch (error) {
    console.error("AI ranking error:", error);
  }

  return rankedSubscriptions;
}

/**
 * Get ranking label
 */
export function getRankingLabel(importance: number): string {
  switch (importance) {
    case 5:
      return "Essential";
    case 4:
      return "Very Important";
    case 3:
      return "Moderate";
    case 2:
      return "Low Priority";
    case 1:
      return "Consider Canceling";
    default:
      return "Unknown";
  }
}

/**
 * Get ranking color class
 */
export function getRankingColor(importance: number): string {
  switch (importance) {
    case 5:
      return "text-green-400";
    case 4:
      return "text-emerald-400";
    case 3:
      return "text-yellow-400";
    case 2:
      return "text-orange-400";
    case 1:
      return "text-red-400";
    default:
      return "text-muted";
  }
}

/**
 * Get ranking background class
 */
export function getRankingBgColor(importance: number): string {
  switch (importance) {
    case 5:
      return "bg-green-400/10";
    case 4:
      return "bg-emerald-400/10";
    case 3:
      return "bg-yellow-400/10";
    case 2:
      return "bg-orange-400/10";
    case 1:
      return "bg-red-400/10";
    default:
      return "bg-muted/10";
  }
}

/**
 * Sort subscriptions by importance and cost
 */
export function sortByImportanceAndCost(
  subscriptions: RankedSubscription[],
  ascending: boolean = true,
): RankedSubscription[] {
  return [...subscriptions].sort((a, b) => {
    // First sort by importance
    const importanceDiff = ascending
      ? a.importance - b.importance
      : b.importance - a.importance;

    if (importanceDiff !== 0) return importanceDiff;

    // Then by annual cost (higher cost first for same importance)
    return b.annualCost - a.annualCost;
  });
}

/**
 * Get subscriptions that AI recommends canceling
 */
export function getAICancelRecommendations(
  subscriptions: RankedSubscription[],
): RankedSubscription[] {
  return subscriptions.filter(
    (sub) => sub.cancelRecommendation && sub.importance <= 2,
  );
}

/**
 * Calculate potential savings from canceling low-priority subscriptions
 */
export function calculateAISuggestedSavings(
  subscriptions: RankedSubscription[],
): number {
  return subscriptions
    .filter((sub) => sub.importance <= 2)
    .reduce((sum, sub) => sum + sub.annualCost, 0);
}

/**
 * Group subscriptions by importance level
 */
export function groupByImportance(
  subscriptions: RankedSubscription[],
): Map<number, RankedSubscription[]> {
  const groups = new Map<number, RankedSubscription[]>();

  for (let i = 5; i >= 1; i--) {
    groups.set(i, []);
  }

  for (const sub of subscriptions) {
    const group = groups.get(sub.importance) || [];
    group.push(sub);
    groups.set(sub.importance, group);
  }

  return groups;
}

/**
 * Get summary statistics for ranked subscriptions
 */
export function getRankingSummary(subscriptions: RankedSubscription[]): {
  totalAnnualCost: number;
  potentialSavings: number;
  essentialCost: number;
  entertainmentCost: number;
  countByImportance: Record<number, number>;
} {
  const summary = {
    totalAnnualCost: 0,
    potentialSavings: 0,
    essentialCost: 0,
    entertainmentCost: 0,
    countByImportance: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<
      number,
      number
    >,
  };

  for (const sub of subscriptions) {
    summary.totalAnnualCost += sub.annualCost;
    summary.countByImportance[sub.importance]++;

    if (sub.importance <= 2) {
      summary.potentialSavings += sub.annualCost;
    }

    if (sub.importance >= 4) {
      summary.essentialCost += sub.annualCost;
    }

    if (sub.category === "entertainment" || sub.category === "gaming") {
      summary.entertainmentCost += sub.annualCost;
    }
  }

  return summary;
}
