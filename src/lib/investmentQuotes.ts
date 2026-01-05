/**
 * Investment Quote Service
 * 
 * Fetches real-time quotes for stocks, ETFs, and crypto.
 * Uses free APIs: Yahoo Finance (stocks/ETFs), CoinGecko (crypto)
 * All values converted to CAD.
 */

// =============================================================================
// Types
// =============================================================================

export interface Holding {
  id: string;
  type: 'stock' | 'etf' | 'crypto' | 'cash';
  symbol: string;
  name: string;
  exchange?: string;
  quantity: number;
  currency: 'USD' | 'CAD';
  currentPrice?: number;
  previousClose?: number;
  change24h?: number;
  valueCAD?: number;
  logoUrl?: string;
  lastUpdated?: string;
}

export interface TickerResult {
  symbol: string;
  name: string;
  exchange: string;
  type: 'stock' | 'etf' | 'crypto';
  currency: 'USD' | 'CAD';
}

export interface HistoryPoint {
  date: string;
  value: number;
}

export interface PortfolioSnapshot {
  date: string;
  totalCAD: number;
  holdings: { symbol: string; valueCAD: number }[];
}

// Crypto symbol mapping (CoinGecko uses IDs, not symbols)
const CRYPTO_MAP: Record<string, { id: string; name: string }> = {
  'BTC': { id: 'bitcoin', name: 'Bitcoin' },
  'ETH': { id: 'ethereum', name: 'Ethereum' },
  'SOL': { id: 'solana', name: 'Solana' },
  'ADA': { id: 'cardano', name: 'Cardano' },
  'DOT': { id: 'polkadot', name: 'Polkadot' },
  'AVAX': { id: 'avalanche-2', name: 'Avalanche' },
  'MATIC': { id: 'matic-network', name: 'Polygon' },
  'LINK': { id: 'chainlink', name: 'Chainlink' },
  'UNI': { id: 'uniswap', name: 'Uniswap' },
  'DOGE': { id: 'dogecoin', name: 'Dogecoin' },
};

// Cache for FX rate (refresh every hour)
let fxCache: { rate: number; timestamp: number } | null = null;
const FX_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// =============================================================================
// FX Rate
// =============================================================================

export async function getUSDToCAD(): Promise<number> {
  // Check cache
  if (fxCache && Date.now() - fxCache.timestamp < FX_CACHE_DURATION) {
    return fxCache.rate;
  }

  try {
    // Try Exchange Rate API (free, no key)
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    if (res.ok) {
      const data = await res.json();
      const rate = data.rates?.CAD;
      if (rate && typeof rate === 'number') {
        fxCache = { rate, timestamp: Date.now() };
        console.log('[FX] USD/CAD rate:', rate);
        return rate;
      }
    }
  } catch (e) {
    console.warn('[FX] Exchange rate fetch failed:', e);
  }

  // Fallback to static rate
  console.warn('[FX] Using fallback rate: 1.43');
  return 1.43;
}

// =============================================================================
// CORS Proxy Configuration
// =============================================================================

const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
];

/**
 * Fetch with automatic CORS proxy fallback
 * Tries each proxy in sequence, falls back to direct fetch
 */
async function fetchWithCorsProxy(url: string, timeoutMs = 10000): Promise<Response> {
  // Try each proxy in sequence
  for (const proxyPrefix of CORS_PROXIES) {
    try {
      const proxyUrl = `${proxyPrefix}${encodeURIComponent(url)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const res = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (res.ok) {
        const proxyName = proxyPrefix.split('/')[2] || 'proxy';
        console.log(`[Proxy] Success via ${proxyName}`);
        return res;
      }
    } catch (e: any) {
      const proxyName = proxyPrefix.split('/')[2] || 'proxy';
      console.warn(`[Proxy] Failed ${proxyName}:`, e.message || e);
      continue; // Try next proxy
    }
  }
  
  // Last resort: try direct (in case CORS gets fixed)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (res.ok) {
      console.log('[Proxy] Success via direct fetch');
      return res;
    }
  } catch (e) {
    console.warn('[Proxy] Direct fetch also failed');
  }
  
  throw new Error('All proxies failed');
}

// =============================================================================
// Price Cache System
// =============================================================================

interface CachedPrice {
  price: number;
  previousClose: number;
  change: number;
  currency: 'USD' | 'CAD';
  name: string;
  exchange: string;
  timestamp: number;
}

interface PriceCache {
  [symbol: string]: CachedPrice;
}

const PRICE_CACHE_KEY = 'noctisium-price-cache';
const PRICE_CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours
const STALE_THRESHOLD = 6 * 60 * 60 * 1000; // 6 hours - show warning after this

export function getPriceAge(timestamp: number): number {
  return Date.now() - timestamp;
}

export function isPriceStale(timestamp: number): boolean {
  return getPriceAge(timestamp) > STALE_THRESHOLD;
}

function getCachedPrice(symbol: string): CachedPrice | null {
  try {
    const cache: PriceCache = JSON.parse(localStorage.getItem(PRICE_CACHE_KEY) || '{}');
    const cached = cache[symbol];
    if (cached) {
      const ageMinutes = Math.round((Date.now() - cached.timestamp) / 60000);
      console.log(`[Cache] Found cached price for ${symbol} (${ageMinutes}m old)`);
      return cached;
    }
  } catch (e) {
    console.warn('[Cache] Failed to read cache:', e);
  }
  return null;
}

function setCachedPrice(symbol: string, data: Omit<CachedPrice, 'timestamp'>): void {
  try {
    const cache: PriceCache = JSON.parse(localStorage.getItem(PRICE_CACHE_KEY) || '{}');
    cache[symbol] = { ...data, timestamp: Date.now() };
    localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(cache));
    console.log(`[Cache] Cached price for ${symbol}`);
  } catch (e) {
    console.warn('[Cache] Failed to write cache:', e);
  }
}

function isCacheFresh(timestamp: number): boolean {
  return Date.now() - timestamp < PRICE_CACHE_DURATION;
}

// =============================================================================
// Stock/ETF Quotes (Yahoo Finance)
// =============================================================================

export async function getStockQuote(symbol: string): Promise<{
  price: number;
  previousClose: number;
  change: number;
  currency: 'USD' | 'CAD';
  name: string;
  exchange: string;
} | null> {
  // Check cache first - if fresh, use it
  const cached = getCachedPrice(symbol);
  if (cached && isCacheFresh(cached.timestamp)) {
    console.log(`[Stock] Using fresh cached price for ${symbol}`);
    return {
      price: cached.price,
      previousClose: cached.previousClose,
      change: cached.change,
      currency: cached.currency,
      name: cached.name,
      exchange: cached.exchange,
    };
  }

  try {
    // Yahoo Finance chart endpoint (public, no key needed)
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
    
    // Use CORS proxy wrapper
    const res = await fetchWithCorsProxy(url);

    const data = await res.json();
    const result = data.chart?.result?.[0];
    
    if (!result) {
      console.warn(`[Stock] No data for ${symbol}`);
      // Fallback to stale cache if available
      if (cached) {
        console.log(`[Stock] Using stale cached price for ${symbol}`);
        return {
          price: cached.price,
          previousClose: cached.previousClose,
          change: cached.change,
          currency: cached.currency,
          name: cached.name,
          exchange: cached.exchange,
        };
      }
      return null;
    }

    const meta = result.meta;
    const quote = result.indicators?.quote?.[0];
    
    const price = meta.regularMarketPrice || quote?.close?.[quote.close.length - 1];
    const previousClose = meta.previousClose || meta.chartPreviousClose;
    
    if (!price) {
      console.warn(`[Stock] No price for ${symbol}`);
      // Fallback to stale cache if available
      if (cached) {
        return {
          price: cached.price,
          previousClose: cached.previousClose,
          change: cached.change,
          currency: cached.currency,
          name: cached.name,
          exchange: cached.exchange,
        };
      }
      return null;
    }

    const change = previousClose ? ((price - previousClose) / previousClose) * 100 : 0;
    const currency: 'USD' | 'CAD' = meta.currency === 'CAD' ? 'CAD' : 'USD';

    const quoteResult = {
      price,
      previousClose: previousClose || price,
      change,
      currency,
      name: meta.shortName || meta.longName || symbol,
      exchange: meta.exchangeName || meta.exchange || 'Unknown',
    };

    // Cache the successful result
    setCachedPrice(symbol, quoteResult);

    return quoteResult;
  } catch (e) {
    console.error(`[Stock] Error fetching ${symbol}:`, e);
    // Try stale cache as last resort
    if (cached) {
      console.log(`[Stock] Using stale cached fallback for ${symbol}`);
      return {
        price: cached.price,
        previousClose: cached.previousClose,
        change: cached.change,
        currency: cached.currency,
        name: cached.name,
        exchange: cached.exchange,
      };
    }
    return null;
  }
}

// =============================================================================
// Crypto Quotes (CoinGecko)
// =============================================================================

export async function getCryptoQuote(symbol: string): Promise<{
  price: number;
  previousClose: number;
  change: number;
  name: string;
} | null> {
  const cryptoInfo = CRYPTO_MAP[symbol.toUpperCase()];
  if (!cryptoInfo) {
    console.warn(`[Crypto] Unknown symbol: ${symbol}`);
    return null;
  }

  // Check cache first - crypto uses same cache but with 'CRYPTO:' prefix
  const cacheKey = `CRYPTO:${symbol.toUpperCase()}`;
  const cached = getCachedPrice(cacheKey);
  if (cached && isCacheFresh(cached.timestamp)) {
    console.log(`[Crypto] Using fresh cached price for ${symbol}`);
    return {
      price: cached.price,
      previousClose: cached.previousClose,
      change: cached.change,
      name: cached.name,
    };
  }

  try {
    // CoinGecko simple price endpoint (free, no key)
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoInfo.id}&vs_currencies=usd&include_24hr_change=true`;
    
    // Use CORS proxy wrapper for consistency
    const res = await fetchWithCorsProxy(url);

    const data = await res.json();
    const coinData = data[cryptoInfo.id];
    
    if (!coinData) {
      console.warn(`[Crypto] No data for ${symbol}`);
      // Fallback to stale cache if available
      if (cached) {
        return {
          price: cached.price,
          previousClose: cached.previousClose,
          change: cached.change,
          name: cached.name,
        };
      }
      return null;
    }

    const price = coinData.usd;
    const change = coinData.usd_24h_change || 0;
    const previousClose = price / (1 + change / 100);

    const quoteResult = {
      price,
      previousClose,
      change,
      name: cryptoInfo.name,
    };

    // Cache the successful result
    setCachedPrice(cacheKey, {
      ...quoteResult,
      currency: 'USD',
      exchange: 'Crypto',
    });

    return quoteResult;
  } catch (e) {
    console.error(`[Crypto] Error fetching ${symbol}:`, e);
    // Try stale cache as last resort
    if (cached) {
      console.log(`[Crypto] Using stale cached fallback for ${symbol}`);
      return {
        price: cached.price,
        previousClose: cached.previousClose,
        change: cached.change,
        name: cached.name,
      };
    }
    return null;
  }
}

// =============================================================================
// Ticker Search
// =============================================================================

export async function searchStocks(query: string): Promise<TickerResult[]> {
  if (!query || query.length < 1) return [];

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`;
    
    // Use CORS proxy wrapper
    const res = await fetchWithCorsProxy(url);

    const data = await res.json();
    const quotes = data.quotes || [];

    return quotes
      .filter((q: any) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
      .map((q: any) => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        exchange: q.exchange || 'Unknown',
        type: q.quoteType === 'ETF' ? 'etf' : 'stock',
        currency: q.symbol.endsWith('.TO') ? 'CAD' : 'USD',
      }))
      .slice(0, 8);
  } catch (e) {
    console.error('[Search] Stock search failed:', e);
    return [];
  }
}

export async function searchCrypto(query: string): Promise<TickerResult[]> {
  if (!query || query.length < 1) return [];

  // First, check our known crypto map
  const upperQuery = query.toUpperCase();
  const localMatches = Object.entries(CRYPTO_MAP)
    .filter(([symbol, info]) => 
      symbol.includes(upperQuery) || 
      info.name.toLowerCase().includes(query.toLowerCase())
    )
    .map(([symbol, info]) => ({
      symbol,
      name: info.name,
      exchange: 'Crypto',
      type: 'crypto' as const,
      currency: 'USD' as const,
    }));

  if (localMatches.length > 0) {
    return localMatches.slice(0, 8);
  }

  // Fallback to CoinGecko search
  try {
    const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`;
    
    // Use CORS proxy wrapper for consistency
    const res = await fetchWithCorsProxy(url);

    const data = await res.json();
    const coins = data.coins || [];

    return coins
      .slice(0, 8)
      .map((c: any) => ({
        symbol: c.symbol?.toUpperCase() || c.id,
        name: c.name,
        exchange: 'Crypto',
        type: 'crypto' as const,
        currency: 'USD' as const,
      }));
  } catch (e) {
    console.error('[Search] Crypto search failed:', e);
    return localMatches;
  }
}

// =============================================================================
// Unified Quote Fetcher
// =============================================================================

export async function refreshHolding(holding: Holding, fxRate: number): Promise<Holding> {
  const updated = { ...holding, lastUpdated: new Date().toISOString() };

  if (holding.type === 'cash') {
    // Cash doesn't need price refresh
    updated.currentPrice = 1;
    updated.valueCAD = holding.quantity;
    updated.change24h = 0;
    return updated;
  }

  if (holding.type === 'crypto') {
    const quote = await getCryptoQuote(holding.symbol);
    if (quote) {
      updated.currentPrice = quote.price;
      updated.previousClose = quote.previousClose;
      updated.change24h = quote.change;
      updated.name = quote.name;
      // Crypto is always USD, convert to CAD
      updated.valueCAD = quote.price * holding.quantity * fxRate;
    }
    return updated;
  }

  // Stock or ETF
  const quote = await getStockQuote(holding.symbol);
  if (quote) {
    updated.currentPrice = quote.price;
    updated.previousClose = quote.previousClose;
    updated.change24h = quote.change;
    updated.name = quote.name;
    updated.exchange = quote.exchange;
    updated.currency = quote.currency;
    
    // Convert to CAD if USD
    if (quote.currency === 'USD') {
      updated.valueCAD = quote.price * holding.quantity * fxRate;
    } else {
      updated.valueCAD = quote.price * holding.quantity;
    }
  }

  return updated;
}

export async function refreshAllHoldings(holdings: Holding[]): Promise<Holding[]> {
  const fxRate = await getUSDToCAD();
  
  // Refresh in parallel with small batches to avoid rate limiting
  const results: Holding[] = [];
  const batchSize = 5;
  
  for (let i = 0; i < holdings.length; i += batchSize) {
    const batch = holdings.slice(i, i + batchSize);
    const refreshed = await Promise.all(
      batch.map(h => refreshHolding(h, fxRate))
    );
    results.push(...refreshed);
    
    // Small delay between batches
    if (i + batchSize < holdings.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return results;
}

// =============================================================================
// Historical Data (for charts)
// =============================================================================

// History cache (24 hours since historical data doesn't change)
const HISTORY_CACHE_KEY = 'noctisium-history-cache';
const HISTORY_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface HistoryCache {
  [key: string]: {
    data: HistoryPoint[];
    timestamp: number;
  };
}

function getCachedHistory(symbol: string, range: string): HistoryPoint[] | null {
  try {
    const cache: HistoryCache = JSON.parse(localStorage.getItem(HISTORY_CACHE_KEY) || '{}');
    const key = `${symbol}:${range}`;
    const cached = cache[key];
    if (cached && Date.now() - cached.timestamp < HISTORY_CACHE_DURATION) {
      console.log(`[History] Using cached history for ${symbol} (${range})`);
      return cached.data;
    }
  } catch (e) {
    console.warn('[History] Failed to read cache:', e);
  }
  return null;
}

function setCachedHistory(symbol: string, range: string, data: HistoryPoint[]): void {
  try {
    const cache: HistoryCache = JSON.parse(localStorage.getItem(HISTORY_CACHE_KEY) || '{}');
    cache[`${symbol}:${range}`] = { data, timestamp: Date.now() };
    localStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('[History] Failed to write cache:', e);
  }
}

export async function getStockHistory(
  symbol: string,
  range: '1W' | '1M' | '3M' | '1Y' | 'ALL'
): Promise<HistoryPoint[]> {
  // Check cache first
  const cached = getCachedHistory(symbol, range);
  if (cached) {
    return cached;
  }

  const rangeMap: Record<string, { range: string; interval: string }> = {
    '1W': { range: '7d', interval: '1d' },
    '1M': { range: '1mo', interval: '1d' },
    '3M': { range: '3mo', interval: '1d' },
    '1Y': { range: '1y', interval: '1wk' },
    'ALL': { range: '5y', interval: '1mo' },
  };

  const { range: r, interval } = rangeMap[range];

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${r}`;
    
    // Use CORS proxy wrapper
    const res = await fetchWithCorsProxy(url);

    const data = await res.json();
    const result = data.chart?.result?.[0];
    
    if (!result) return [];

    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];

    const historyData = timestamps
      .map((ts: number, i: number) => ({
        date: new Date(ts * 1000).toISOString().split('T')[0],
        value: closes[i],
      }))
      .filter((p: HistoryPoint) => p.value != null);

    // Cache the successful result
    if (historyData.length > 0) {
      setCachedHistory(symbol, range, historyData);
    }

    return historyData;
  } catch (e) {
    console.error(`[History] Error fetching ${symbol}:`, e);
    return [];
  }
}

export async function getSP500History(
  range: '1W' | '1M' | '3M' | '1Y' | 'ALL'
): Promise<HistoryPoint[]> {
  // Use SPY as S&P 500 proxy
  return getStockHistory('SPY', range);
}

// =============================================================================
// Portfolio History Storage
// =============================================================================

const HISTORY_KEY = 'noctisium-portfolio-history';

export function loadPortfolioHistory(): PortfolioSnapshot[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('[History] Failed to load:', e);
  }
  return [];
}

export function savePortfolioSnapshot(holdings: Holding[]): void {
  const today = new Date().toISOString().split('T')[0];
  const history = loadPortfolioHistory();
  
  const totalCAD = holdings.reduce((sum, h) => sum + (h.valueCAD || 0), 0);
  const holdingValues = holdings.map(h => ({
    symbol: h.symbol,
    valueCAD: h.valueCAD || 0,
  }));

  // Check if we already have today's snapshot
  const existingIndex = history.findIndex(s => s.date === today);
  
  const snapshot: PortfolioSnapshot = {
    date: today,
    totalCAD,
    holdings: holdingValues,
  };

  if (existingIndex >= 0) {
    // Update existing
    history[existingIndex] = snapshot;
  } else {
    // Add new
    history.push(snapshot);
  }

  // Keep last 365 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 365);
  const filtered = history.filter(s => new Date(s.date) >= cutoff);

  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('[History] Failed to save:', e);
  }
}

export function getPortfolioHistoryForRange(
  range: '1W' | '1M' | '3M' | '1Y' | 'ALL'
): HistoryPoint[] {
  const history = loadPortfolioHistory();
  
  const daysMap: Record<string, number> = {
    '1W': 7,
    '1M': 30,
    '3M': 90,
    '1Y': 365,
    'ALL': 9999,
  };

  const days = daysMap[range];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return history
    .filter(s => new Date(s.date) >= cutoff)
    .map(s => ({ date: s.date, value: s.totalCAD }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// =============================================================================
// Holdings Storage
// =============================================================================

const HOLDINGS_KEY = 'noctisium-holdings';

export function loadHoldings(): Holding[] {
  try {
    const raw = localStorage.getItem(HOLDINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('[Holdings] Failed to load:', e);
  }
  return [];
}

export function saveHoldings(holdings: Holding[]): void {
  try {
    localStorage.setItem(HOLDINGS_KEY, JSON.stringify(holdings));
  } catch (e) {
    console.error('[Holdings] Failed to save:', e);
  }
}

export function addHolding(holding: Omit<Holding, 'id'>): Holding {
  const holdings = loadHoldings();
  const newHolding: Holding = {
    ...holding,
    id: `holding-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
  holdings.push(newHolding);
  saveHoldings(holdings);
  return newHolding;
}

export function updateHolding(id: string, updates: Partial<Holding>): void {
  const holdings = loadHoldings();
  const index = holdings.findIndex(h => h.id === id);
  if (index >= 0) {
    holdings[index] = { ...holdings[index], ...updates };
    saveHoldings(holdings);
  }
}

export function deleteHolding(id: string): void {
  const holdings = loadHoldings();
  saveHoldings(holdings.filter(h => h.id !== id));
}

// =============================================================================
// Migration from old format
// =============================================================================

export function migrateOldHoldings(): Holding[] {
  try {
    const raw = localStorage.getItem('noctisium-cash-console');
    if (!raw) return [];

    const data = JSON.parse(raw);
    const oldHoldings = data.investments?.holdings || [];

    if (oldHoldings.length === 0) return [];

    const migrated: Holding[] = oldHoldings.map((h: any, i: number) => {
      if (h.type === 'cash') {
        return {
          id: `migrated-${i}`,
          type: 'cash' as const,
          symbol: 'CAD',
          name: 'Cash (CAD)',
          quantity: h.amountUsd * (data.fx?.usdToCad || 1.43), // Convert to CAD
          currency: 'CAD' as const,
          valueCAD: h.amountUsd * (data.fx?.usdToCad || 1.43),
        };
      }

      // Determine if ETF or stock (heuristic: common ETF suffixes)
      const isETF = /^(SPY|VOO|QQQ|VTI|VFV|XIC|XUS|ZSP)/i.test(h.ticker);
      
      return {
        id: `migrated-${i}`,
        type: isETF ? 'etf' : 'stock' as const,
        symbol: h.ticker,
        name: h.name || h.ticker,
        quantity: h.quantity,
        currency: h.ticker.endsWith('.TO') ? 'CAD' : 'USD' as const,
        currentPrice: h.lastPriceUsd,
        previousClose: h.prevCloseUsd,
      };
    });

    console.log('[Migration] Migrated', migrated.length, 'holdings from old format');
    return migrated;
  } catch (e) {
    console.error('[Migration] Failed:', e);
    return [];
  }
}
