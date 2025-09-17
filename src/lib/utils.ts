import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Simple market data fetcher (stub). Replace with real API integration.
export async function fetchQuoteUSD(ticker: string): Promise<number | null> {
  try {
    // Placeholder: use a real provider via backend in production
    const base = 50 + (ticker.charCodeAt(0) % 50);
    const drift = (Date.now() % 86400000) / 86400000; // 0..1 within day
    return Number((base * (1 + 0.02 * Math.sin(drift * Math.PI * 2))).toFixed(2));
  } catch {
    return null;
  }
}

export async function fetchQuoteAndPrevCloseUSD(ticker: string): Promise<{ price: number; prevClose: number } | null> {
  try {
    const finnhubKey = (import.meta as any).env?.VITE_FINNHUB_KEY as string | undefined;
    console.log('[quotes] Finnhub key present:', Boolean(finnhubKey));
    if (finnhubKey) {
      const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${encodeURIComponent(finnhubKey)}`;
      console.log('[quotes] Finnhub request:', { ticker, url: `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=***` });
      const res = await fetch(url);
      console.log('[quotes] Finnhub response status:', res.status, res.ok);
      if (res.ok) {
        const j = await res.json();
        console.log('[quotes] Finnhub payload keys:', Object.keys(j || {}));
        const c = Number(j?.c);
        const pc = Number(j?.pc);
        if (Number.isFinite(c) && Number.isFinite(pc) && c > 0 && pc > 0) {
          return { price: c, prevClose: pc };
        }
        console.warn('[quotes] Finnhub missing numeric c/pc:', { c: j?.c, pc: j?.pc });
      }
    }
  } catch (e) {
    console.warn('[utils] Finnhub fetch failed', e);
  }

  try {
    const avKey = (import.meta as any).env?.VITE_ALPHA_VANTAGE_KEY as string | undefined;
    console.log('[quotes] AlphaVantage key present:', Boolean(avKey));
    if (avKey) {
      const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(ticker)}&apikey=${encodeURIComponent(avKey)}`;
      console.log('[quotes] AlphaVantage request:', { ticker, url: `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(ticker)}&apikey=***` });
      const res = await fetch(url);
      console.log('[quotes] AlphaVantage response status:', res.status, res.ok);
      if (res.ok) {
        const j = await res.json();
        console.log('[quotes] AlphaVantage payload keys:', Object.keys(j || {}));
        const series = j?.['Time Series (Daily)'] || j?.['Time Series (Digital Currency Daily)'];
        if (series && typeof series === 'object') {
          const dates = Object.keys(series).sort().reverse();
          if (dates.length >= 2) {
            const latest = series[dates[0]];
            const prev = series[dates[1]];
            const latestClose = Number(latest?.['4. close'] || latest?.['4a. close (USD)']);
            const prevClose = Number(prev?.['4. close'] || prev?.['4a. close (USD)']);
            if (Number.isFinite(latestClose) && Number.isFinite(prevClose)) {
              return { price: latestClose, prevClose };
            }
            console.warn('[quotes] AlphaVantage missing close fields:', { latest, prev });
          }
          console.warn('[quotes] AlphaVantage series dates insufficient');
        }
      }
    }
  } catch (e) {
    console.warn('[utils] AlphaVantage fetch failed', e);
  }

  // Fallback: stub
  console.warn('[quotes] Falling back to stub quote for', ticker);
  const price = await fetchQuoteUSD(ticker);
  if (price == null) return null;
  const prevClose = Number((price / (1 + 0.005 * Math.sin(1))).toFixed(2));
  return { price, prevClose };
}

export async function fetchUsdToCad(): Promise<number | null> {
  try {
    const avKey = (import.meta as any).env?.VITE_ALPHA_VANTAGE_KEY as string | undefined;
    if (avKey) {
      const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=USD&to_currency=CAD&apikey=${encodeURIComponent(avKey)}`;
      const res = await fetch(url);
      if (res.ok) {
        const j = await res.json();
        const rate = Number(j?.['Realtime Currency Exchange Rate']?.['5. Exchange Rate']);
        if (Number.isFinite(rate) && rate > 0) return rate;
      }
    }
  } catch (e) {
    console.warn('[fx] AlphaVantage FX fetch failed', e);
  }
  // Fallback to a static-ish rate for demo
  return 1.35;
}