import React, { useState, useEffect } from 'react';
import { getRandomQuote, getDynamicQuote } from '@/lib/quotes';

const ContextSidebar: React.FC = () => {
  const [quote, setQuote] = useState<string>(getRandomQuote());
  const [isLoadingQuote, setIsLoadingQuote] = useState<boolean>(false);

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
    <>
      {/* Quote of the Day */}
      <div className="p-2 border border-accent-red mb-4">
        <h2 className="uppercase"><span>Quote of the Day</span><span className="blink">_</span></h2>
        <div className="italic text-[#5FE3B3]">
          {isLoadingQuote ? 'Loading...' : `"${quote}"`}
        </div>
      </div>
    </>
  );
};

export default ContextSidebar; 