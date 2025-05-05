import React, { useState, useEffect } from 'react';
import SparkLine from './SparkLine';
import { getRandomQuote } from '@/lib/quotes';

interface FinancialData {
  pct7d: number;
  avgSpend: number;
  sparkData: number[];
}

const ContextSidebar: React.FC = () => {
  const [financial, setFinancial] = useState<FinancialData>({ pct7d: 0, avgSpend: 0, sparkData: [] });
  const [headline, setHeadline] = useState<string>('Loading...');
  const [quote, setQuote] = useState<string>(getRandomQuote());

  // Fetch financial data from Wealthsimple if API key provided
  useEffect(() => {
    const key = import.meta.env.VITE_WEALTHSIMPLE_KEY;
    if (key) {
      fetch('https://api.wealthsimple.com/v1/accounts', {
        headers: { Authorization: `Bearer ${key}` }
      })
        .then(res => res.json())
        .then(json => {
          // Adjust based on actual API response structure
          const pct7d = json.portfolio_change_7d_pct || 0;
          const avgSpend = json.avg_daily_spend || 0;
          const sparkData = json.spark_data || [];
          setFinancial({ pct7d, avgSpend, sparkData });
        })
        .catch(err => console.error('Wealthsimple fetch error:', err));
    }
  }, []);

  // Placeholder for daily headline requiring ChatGPT/Perplexity API
  useEffect(() => {
    setHeadline('🔒 API key not configured');
  }, []);

  return (
    <div className="sidebar w-[20ch] border-l border-accent-pink bg-sidebar p-2 shrink-0 overflow-y-auto font-mono text-xs text-main">
      {/* Financial Snapshot */}
      <div className="mb-4">
        <h2 className="uppercase"><span>Financial Snapshot</span><span className="blink">_</span></h2>
        <div>Δ (7d): {financial.pct7d}%</div>
        <div>Avg Daily Spend: ${financial.avgSpend} CAD</div>
        <SparkLine data={financial.sparkData} />
      </div>
      {/* Daily Headline */}
      <div className="mb-4">
        <h2 className="uppercase"><span>Daily Headline</span><span className="blink">_</span></h2>
        <div className="text-[#5FE3B3]">{headline}</div>
      </div>
      {/* Quote of the Day */}
      <div>
        <h2 className="uppercase"><span>Quote of the Day</span><span className="blink">_</span></h2>
        <div className="italic text-[#5FE3B3]">"{quote}"</div>
      </div>
    </div>
  );
};

export default ContextSidebar; 