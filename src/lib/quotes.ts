export const quotes = [
  "Discipline is the bridge between goals and accomplishment.",
  "Your future is created by what you do today, not tomorrow.",
  "Success is the sum of small efforts repeated day in and day out.",
  "The only way to do great work is to love what you do.",
  "Strive not to be a success, but rather to be of value."
];

export const getRandomQuote = (): string =>
  quotes[Math.floor(Math.random() * quotes.length)];

interface QuoteCache {
  quote: string;
  timestamp: number;
}

interface HeadlineCache {
  headline: string;
  timestamp: number;
}

export const getDynamicQuote = async (): Promise<string> => {
  // Check if we have a cached quote that's less than 24 hours old
  const cachedQuote = localStorage.getItem('noctisium-daily-quote');
  
  if (cachedQuote) {
    try {
      const quoteData: QuoteCache = JSON.parse(cachedQuote);
      const now = Date.now();
      const hoursSinceCached = (now - quoteData.timestamp) / (1000 * 60 * 60);
      
      // If less than 24 hours old, return the cached quote
      if (hoursSinceCached < 24) {
        return quoteData.quote;
      }
    } catch (error) {
      console.error('Error parsing cached quote:', error);
    }
  }
  
  // If no valid cached quote, try to get a new one from OpenAI
  try {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key not found');
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: "system",
            content: "You are Midnight, an elite cyber-punk strategist and relentless self-optimizer who pilots his midnight command center in a dimly-lit terminal at 3 AM. You thrive on 21-day sprints of intense focus, daily deep-work rituals, and a minimalist hacker's discipline. As you gaze at cascading metrics, network stats, and your Echo roadmap, you channel an unwavering drive to push beyond limits."
          },
          {
            role: "user",
            content: "In a single, punchy sentence, deliver a motivational quote that speaks directly to Midnight's code-fueled grind: terse, vivid, and sharp as neon in the dark. Return only the quote itself."
          }
        ],
        max_tokens: 100,
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    const quote = data.choices[0].message.content.trim();
    
    // Cache the new quote with timestamp
    const quoteCache: QuoteCache = {
      quote,
      timestamp: Date.now()
    };
    
    localStorage.setItem('noctisium-daily-quote', JSON.stringify(quoteCache));
    return quote;
    
  } catch (error) {
    console.error('Error fetching quote from OpenAI:', error);
    // Fall back to a random static quote
    return getRandomQuote();
  }
};

export const getDailyHeadline = async (): Promise<string> => {
  // Check if we have a cached headline that's less than 24 hours old
  const cachedHeadline = localStorage.getItem('noctisium-daily-headline');
  
  if (cachedHeadline) {
    try {
      const headlineData: HeadlineCache = JSON.parse(cachedHeadline);
      const now = Date.now();
      const hoursSinceCached = (now - headlineData.timestamp) / (1000 * 60 * 60);
      
      // If less than 24 hours old, return the cached headline
      if (hoursSinceCached < 24) {
        return headlineData.headline;
      }
    } catch (error) {
      console.error('Error parsing cached headline:', error);
    }
  }
  
  // If no valid cached headline, try to get a new one from OpenAI
  try {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key not found');
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: "system",
            content: "You are a cyber-punk news terminal in the year 2045. You deliver concise, thought-provoking headlines about technology, productivity, and human potential."
          },
          {
            role: "user",
            content: "Generate a single short headline (10-15 words max) that would inspire a productivity-focused tech minimalist. Make it cyberpunk-themed, provocative, and forward-looking. Return only the headline text."
          }
        ],
        max_tokens: 60,
        temperature: 0.8
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    const headline = data.choices[0].message.content.trim();
    
    // Cache the new headline with timestamp
    const headlineCache: HeadlineCache = {
      headline,
      timestamp: Date.now()
    };
    
    localStorage.setItem('noctisium-daily-headline', JSON.stringify(headlineCache));
    return headline;
    
  } catch (error) {
    console.error('Error fetching headline from OpenAI:', error);
    // Fall back to a default headline
    return "Neural Networks Outperform Humans in Deep Work Efficiency";
  }
}; 