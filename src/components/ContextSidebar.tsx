import React, { useState, useEffect } from 'react';
import SparkLine from './SparkLine';
import StackedSparkLine from './StackedSparkLine';
import { getRandomQuote, getDynamicQuote, getDailyHeadline } from '@/lib/quotes';
import { loadData } from '@/lib/storage';
import { getStackedSparkData } from '@/lib/chartUtils';

interface FinancialData {
  pct7d: number;
  avgSpend: number;
  sparkData: number[];
}

const ContextSidebar: React.FC = () => {
  const [financial, setFinancial] = useState<FinancialData>({ pct7d: 0, avgSpend: 0, sparkData: [] });
  const [headline, setHeadline] = useState<string>('Loading...');
  const [quote, setQuote] = useState<string>(getRandomQuote());
  const [isLoadingQuote, setIsLoadingQuote] = useState<boolean>(false);
  const [isLoadingHeadline, setIsLoadingHeadline] = useState<boolean>(false);
  const [habitData, setHabitData] = useState<{ habitData: Record<string, number[]>; otherData?: { id: string; values: number[]; rollingAvg: number[] } }>({ habitData: {} });

  // Load habit data on mount
  useEffect(() => {
    const data = loadData();
    const sparkData = getStackedSparkData(data, 7);
    setHabitData(sparkData);
  }, []);

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

  // Fetch daily headline
  useEffect(() => {
    const fetchHeadline = async () => {
      setIsLoadingHeadline(true);
      try {
        const dailyHeadline = await getDailyHeadline();
        setHeadline(dailyHeadline);
      } catch (error) {
        console.error('Error fetching daily headline:', error);
        setHeadline('Connection to neural feed disrupted');
      } finally {
        setIsLoadingHeadline(false);
      }
    };

    fetchHeadline();
  }, []);

  // Fetch dynamic quote on mount
  useEffect(() => {
    const fetchQuote = async () => {
      setIsLoadingQuote(true);
      try {
        const dynamicQuote = await getDynamicQuote();
        setQuote(dynamicQuote);
      } catch (error) {
        console.error('Error fetching dynamic quote:', error);
        // Fallback to static quote is handled in getDynamicQuote
      } finally {
        setIsLoadingQuote(false);
      }
    };

    fetchQuote();
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
      {/* Habit Trends */}
      <div className="mb-4">
        <h2 className="uppercase"><span>Habit Trends</span><span className="blink">_</span></h2>
        <div>
          <StackedSparkLine 
            habitData={habitData.habitData} 
            otherData={habitData.otherData} 
          />
        </div>
        {habitData.otherData && (
          <div className="text-xs opacity-70 mt-1">
            {habitData.otherData.id} (4-Day Avg): {habitData.otherData.rollingAvg.length > 0 
              ? habitData.otherData.rollingAvg[habitData.otherData.rollingAvg.length - 1].toFixed(1)
              : '0'}
          </div>
        )}
      </div>
      {/* Daily Headline */}
      <div className="mb-4">
        <h2 className="uppercase"><span>Daily Headline</span><span className="blink">_</span></h2>
        <div className="text-[#5FE3B3]">
          {isLoadingHeadline ? 'Syncing neural feed...' : headline}
        </div>
      </div>
      {/* Quote of the Day */}
      <div>
        <h2 className="uppercase"><span>Quote of the Day</span><span className="blink">_</span></h2>
        <div className="italic text-[#5FE3B3]">
          {isLoadingQuote ? 'Loading...' : `"${quote}"`}
        </div>
      </div>
    </div>
  );
};

export default ContextSidebar; 