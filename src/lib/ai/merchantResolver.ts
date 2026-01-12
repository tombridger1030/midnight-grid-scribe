/**
 * Merchant Resolver Service
 *
 * 3-layer system to resolve confusing credit card merchant names to clean vendor names.
 *
 * Layer 1: Pattern matching against 200+ known merchants
 * Layer 2: Claude AI interpretation for unknown merchants (batched)
 * Layer 3: Cache results in localStorage for future use
 */

import { supabase, SUPABASE_URL } from "@/lib/supabase";
import {
  findMerchantPattern,
  extractVendorFromProcessor,
  type MerchantCategory,
  type MerchantPattern,
} from "./knownMerchants";

// Edge Function URL for AI proxy
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/ai-proxy`;

// LocalStorage keys
const MERCHANT_CACHE_KEY = "noctisium-merchant-cache";

export interface ResolvedMerchant {
  original: string;
  vendor: string;
  category?: MerchantCategory;
  isSubscription?: boolean;
  source: "pattern" | "ai" | "user" | "cache";
  confidence: number;
}

interface MerchantCacheEntry {
  vendor: string;
  source: "pattern" | "ai" | "user";
  category?: MerchantCategory;
  isSubscription?: boolean;
  lastSeen: string;
  hitCount: number;
}

interface MerchantCache {
  [normalizedPattern: string]: MerchantCacheEntry;
}

/**
 * Normalize description for cache key
 */
function normalizeForCache(description: string): string {
  return description
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50); // Limit key length
}

/**
 * Extract core merchant identifier from description
 * Removes transaction IDs, dates, reference numbers
 */
function extractCoreIdentifier(description: string): string {
  let core = description.toUpperCase();

  // Remove common suffixes with numbers
  core = core
    .replace(/[*#]+\S+/g, "") // Remove *12345, #ABC123
    .replace(/\d{6,}/g, "") // Remove long numbers (transaction IDs)
    .replace(/\d{2}\/\d{2}\/\d{2,4}/g, "") // Remove dates
    .replace(/\s+\d+\s*$/g, "") // Remove trailing numbers
    .replace(/\s*[-\/]\s*\d+\s*$/g, "") // Remove -123 or /123 at end
    .replace(/\s+/g, " ")
    .trim();

  return core;
}

/**
 * Load merchant cache from localStorage
 */
function loadCache(): MerchantCache {
  try {
    const cached = localStorage.getItem(MERCHANT_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

/**
 * Save merchant cache to localStorage
 */
function saveCache(cache: MerchantCache): void {
  try {
    localStorage.setItem(MERCHANT_CACHE_KEY, JSON.stringify(cache));
  } catch {
    console.warn("Failed to save merchant cache");
  }
}

/**
 * Get cached merchant entry
 */
function getCachedMerchant(description: string): MerchantCacheEntry | null {
  const cache = loadCache();
  const key = normalizeForCache(description);

  if (cache[key]) {
    // Update hit count and last seen
    cache[key].hitCount++;
    cache[key].lastSeen = new Date().toISOString().slice(0, 10);
    saveCache(cache);
    return cache[key];
  }

  return null;
}

/**
 * Save merchant to cache
 */
function saveMerchantToCache(
  description: string,
  vendor: string,
  source: "pattern" | "ai" | "user",
  category?: MerchantCategory,
  isSubscription?: boolean,
): void {
  const cache = loadCache();
  const key = normalizeForCache(description);

  cache[key] = {
    vendor,
    source,
    category,
    isSubscription,
    lastSeen: new Date().toISOString().slice(0, 10),
    hitCount: 1,
  };

  saveCache(cache);
}

/**
 * Layer 1: Pattern matching against known merchants
 */
function resolveFromPattern(description: string): ResolvedMerchant | null {
  const pattern = findMerchantPattern(description);

  if (!pattern) return null;

  // Check if it's a payment processor that needs vendor extraction
  if (pattern.extractVendor) {
    const extractedVendor = extractVendorFromProcessor(description, pattern);
    if (extractedVendor) {
      // Try to find a pattern for the extracted vendor
      const nestedPattern = findMerchantPattern(extractedVendor);
      if (nestedPattern && nestedPattern.name) {
        return {
          original: description,
          vendor: nestedPattern.name,
          category: nestedPattern.category,
          isSubscription: nestedPattern.isSubscription,
          source: "pattern",
          confidence: 0.9,
        };
      }

      // Return the extracted vendor with title case
      return {
        original: description,
        vendor: toTitleCase(extractedVendor),
        source: "pattern",
        confidence: 0.75,
      };
    }
  }

  // Direct pattern match
  if (pattern.name) {
    return {
      original: description,
      vendor: pattern.name,
      category: pattern.category,
      isSubscription: pattern.isSubscription,
      source: "pattern",
      confidence: 0.95,
    };
  }

  return null;
}

/**
 * Convert string to title case
 */
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Layer 2: Claude AI interpretation for unknown merchants
 */
async function resolveFromAI(
  descriptions: string[],
): Promise<Map<string, ResolvedMerchant>> {
  const results = new Map<string, ResolvedMerchant>();

  if (descriptions.length === 0) return results;

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
        system: `You are analyzing credit card transaction descriptions to identify the actual vendor.

Rules:
1. Remove transaction IDs, reference numbers, dates
2. Decode common abbreviations (AMZN=Amazon, SP=Spotify, etc.)
3. Handle payment processors - identify the ACTUAL vendor:
   - "PAYPAL *ETSY INC" → "Etsy" (not PayPal)
   - "SQ *JOES COFFEE" → "Joe's Coffee" (not Square)
4. Capitalize properly
5. Return ONLY the clean vendor name

For each transaction, also identify:
- category: entertainment, productivity, shopping, food, transportation, utilities, health, finance, education, lifestyle, gaming, news, or other
- isSubscription: true if this is likely a recurring subscription service

Return ONLY valid JSON array, no explanation.`,
        messages: [
          {
            role: "user",
            content: `Analyze these credit card transactions and identify the actual vendors:

${JSON.stringify(descriptions, null, 2)}

Return JSON array:
[
  {
    "original": "ORIGINAL_DESCRIPTION",
    "vendor": "Clean Vendor Name",
    "category": "category",
    "isSubscription": true/false,
    "confidence": 0.0-1.0
  }
]`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("AI vendor resolution failed:", error);
      return results;
    }

    const data = await response.json();
    const content = data.content[0].text;

    // Parse JSON response
    let parsed: Array<{
      original: string;
      vendor: string;
      category?: string;
      isSubscription?: boolean;
      confidence?: number;
    }> = [];

    try {
      parsed = JSON.parse(content);
    } catch {
      // Try to extract JSON array from response
      const match = content.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          console.error("Could not parse AI vendor response");
          return results;
        }
      }
    }

    // Process results
    for (const item of parsed) {
      if (item.original && item.vendor) {
        const resolved: ResolvedMerchant = {
          original: item.original,
          vendor: item.vendor,
          category: item.category as MerchantCategory,
          isSubscription: item.isSubscription,
          source: "ai",
          confidence: item.confidence || 0.8,
        };

        results.set(item.original, resolved);

        // Cache the result
        saveMerchantToCache(
          item.original,
          item.vendor,
          "ai",
          item.category as MerchantCategory,
          item.isSubscription,
        );
      }
    }
  } catch (error) {
    console.error("AI vendor resolution error:", error);
  }

  return results;
}

/**
 * Resolve a single merchant description
 */
export async function resolveMerchant(
  description: string,
): Promise<ResolvedMerchant> {
  // Layer 3: Check cache first
  const cached = getCachedMerchant(description);
  if (cached) {
    return {
      original: description,
      vendor: cached.vendor,
      category: cached.category,
      isSubscription: cached.isSubscription,
      source: "cache",
      confidence: 0.95,
    };
  }

  // Layer 1: Pattern matching
  const patternResult = resolveFromPattern(description);
  if (patternResult) {
    // Cache pattern results too
    saveMerchantToCache(
      description,
      patternResult.vendor,
      "pattern",
      patternResult.category,
      patternResult.isSubscription,
    );
    return patternResult;
  }

  // Layer 2: AI resolution (single item)
  const aiResults = await resolveFromAI([description]);
  const aiResult = aiResults.get(description);

  if (aiResult) {
    return aiResult;
  }

  // Fallback: Return cleaned original
  const core = extractCoreIdentifier(description);
  return {
    original: description,
    vendor: toTitleCase(core) || description,
    source: "pattern",
    confidence: 0.5,
  };
}

/**
 * Resolve multiple merchant descriptions efficiently
 * Uses batching for AI calls to minimize API usage
 */
export async function resolveMerchants(
  descriptions: string[],
): Promise<Map<string, ResolvedMerchant>> {
  const results = new Map<string, ResolvedMerchant>();
  const needsAI: string[] = [];

  // First pass: Try cache and pattern matching
  for (const description of descriptions) {
    // Check cache
    const cached = getCachedMerchant(description);
    if (cached) {
      results.set(description, {
        original: description,
        vendor: cached.vendor,
        category: cached.category,
        isSubscription: cached.isSubscription,
        source: "cache",
        confidence: 0.95,
      });
      continue;
    }

    // Try pattern matching
    const patternResult = resolveFromPattern(description);
    if (patternResult) {
      results.set(description, patternResult);
      // Cache the result
      saveMerchantToCache(
        description,
        patternResult.vendor,
        "pattern",
        patternResult.category,
        patternResult.isSubscription,
      );
      continue;
    }

    // Need AI resolution
    needsAI.push(description);
  }

  // Second pass: Batch AI resolution for unknown merchants
  if (needsAI.length > 0) {
    // Process in batches of 15 to avoid token limits
    const batchSize = 15;
    for (let i = 0; i < needsAI.length; i += batchSize) {
      const batch = needsAI.slice(i, i + batchSize);
      const aiResults = await resolveFromAI(batch);

      for (const [desc, resolved] of aiResults) {
        results.set(desc, resolved);
      }

      // For any that AI couldn't resolve, use fallback
      for (const desc of batch) {
        if (!results.has(desc)) {
          const core = extractCoreIdentifier(desc);
          results.set(desc, {
            original: desc,
            vendor: toTitleCase(core) || desc,
            source: "pattern",
            confidence: 0.5,
          });
        }
      }
    }
  }

  return results;
}

/**
 * Manually correct a merchant name (user override)
 * Saves to cache with 'user' source for highest priority
 */
export function correctMerchantName(
  originalDescription: string,
  correctedVendor: string,
  category?: MerchantCategory,
  isSubscription?: boolean,
): void {
  saveMerchantToCache(
    originalDescription,
    correctedVendor,
    "user",
    category,
    isSubscription,
  );
}

/**
 * Get all cached merchant corrections
 */
export function getCachedMerchants(): MerchantCache {
  return loadCache();
}

/**
 * Clear merchant cache
 */
export function clearMerchantCache(): void {
  localStorage.removeItem(MERCHANT_CACHE_KEY);
}

/**
 * Export cache for backup
 */
export function exportMerchantCache(): string {
  return JSON.stringify(loadCache(), null, 2);
}

/**
 * Import cache from backup
 */
export function importMerchantCache(jsonData: string): boolean {
  try {
    const data = JSON.parse(jsonData);
    if (typeof data === "object") {
      saveCache(data);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
