/**
 * AddHoldingWizard Component
 * 
 * 3-step wizard for adding new holdings:
 * 1. Select type and search
 * 2. Confirm selection
 * 3. Enter quantity
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, ChevronRight, ChevronLeft, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  searchStocks, 
  searchCrypto, 
  getStockQuote, 
  getCryptoQuote,
  getUSDToCAD,
  type TickerResult,
  type Holding,
} from '@/lib/investmentQuotes';

interface AddHoldingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (holding: Omit<Holding, 'id'>) => void;
}

type HoldingType = 'stock' | 'crypto' | 'cash';
type Step = 1 | 2 | 3;

export const AddHoldingWizard: React.FC<AddHoldingWizardProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  // Wizard state
  const [step, setStep] = useState<Step>(1);
  const [holdingType, setHoldingType] = useState<HoldingType>('stock');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TickerResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Selection state
  const [selectedTicker, setSelectedTicker] = useState<TickerResult | null>(null);
  const [tickerPrice, setTickerPrice] = useState<number | null>(null);
  const [tickerChange, setTickerChange] = useState<number>(0);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [fxRate, setFxRate] = useState(1.43);
  
  // Quantity state
  const [quantity, setQuantity] = useState('');
  const [cashAmount, setCashAmount] = useState('');

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setHoldingType('stock');
      setSearchQuery('');
      setSearchResults([]);
      setSelectedTicker(null);
      setTickerPrice(null);
      setQuantity('');
      setCashAmount('');
    }
  }, [isOpen]);

  // Fetch FX rate on mount
  useEffect(() => {
    if (isOpen) {
      getUSDToCAD().then(setFxRate);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 1) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = holdingType === 'crypto' 
          ? await searchCrypto(searchQuery)
          : await searchStocks(searchQuery);
        setSearchResults(results);
      } catch (e) {
        console.error('Search failed:', e);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, holdingType]);

  // Fetch price when ticker selected
  useEffect(() => {
    if (!selectedTicker) return;

    const fetchPrice = async () => {
      setIsLoadingPrice(true);
      try {
        if (selectedTicker.type === 'crypto') {
          const quote = await getCryptoQuote(selectedTicker.symbol);
          if (quote) {
            setTickerPrice(quote.price);
            setTickerChange(quote.change);
          }
        } else {
          const quote = await getStockQuote(selectedTicker.symbol);
          if (quote) {
            setTickerPrice(quote.price);
            setTickerChange(quote.change);
          }
        }
      } catch (e) {
        console.error('Failed to fetch price:', e);
      } finally {
        setIsLoadingPrice(false);
      }
    };

    fetchPrice();
  }, [selectedTicker]);

  // Handle ticker selection
  const handleSelectTicker = (ticker: TickerResult) => {
    setSelectedTicker(ticker);
    setStep(2);
  };

  // Handle type change
  const handleTypeChange = (type: HoldingType) => {
    setHoldingType(type);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedTicker(null);
    
    if (type === 'cash') {
      setStep(3);
    }
  };

  // Calculate total value
  const calculateTotalCAD = (): number => {
    if (holdingType === 'cash') {
      return parseFloat(cashAmount) || 0;
    }
    
    if (!tickerPrice || !quantity) return 0;
    
    const qty = parseFloat(quantity);
    const value = tickerPrice * qty;
    
    // Convert USD to CAD if needed
    if (selectedTicker?.currency === 'USD' || selectedTicker?.type === 'crypto') {
      return value * fxRate;
    }
    
    return value;
  };

  // Handle final submission
  const handleSubmit = () => {
    if (holdingType === 'cash') {
      const amount = parseFloat(cashAmount);
      if (!amount || amount <= 0) return;
      
      onAdd({
        type: 'cash',
        symbol: 'CAD',
        name: 'Cash (CAD)',
        quantity: amount,
        currency: 'CAD',
        currentPrice: 1,
        valueCAD: amount,
        change24h: 0,
      });
    } else if (selectedTicker && tickerPrice) {
      const qty = parseFloat(quantity);
      if (!qty || qty <= 0) return;
      
      const valueCAD = calculateTotalCAD();
      
      onAdd({
        type: selectedTicker.type === 'crypto' ? 'crypto' : selectedTicker.type,
        symbol: selectedTicker.symbol,
        name: selectedTicker.name,
        exchange: selectedTicker.exchange,
        quantity: qty,
        currency: selectedTicker.currency,
        currentPrice: tickerPrice,
        change24h: tickerChange,
        valueCAD,
      });
    }
    
    onClose();
  };

  // Format currency
  const formatCurrency = (value: number, currency: string = 'CAD'): string => {
    return `$${value.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-surface-primary border border-line 
                     rounded-xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-line">
            <h2 className="text-lg font-semibold text-terminal-accent">
              Add Investment
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-terminal-accent/10 
                         text-terminal-accent/60 hover:text-terminal-accent transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 min-h-[400px]">
            {/* Step 1: Type & Search */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Type Selection */}
                <div>
                  <label className="block text-sm text-terminal-accent/60 mb-3">
                    What type of investment?
                  </label>
                  <div className="flex gap-2">
                    {(['stock', 'crypto', 'cash'] as HoldingType[]).map(type => (
                      <button
                        key={type}
                        onClick={() => handleTypeChange(type)}
                        className={cn(
                          "flex-1 py-3 px-4 rounded-lg border transition-all",
                          holdingType === type
                            ? "border-terminal-accent bg-terminal-accent/10 text-terminal-accent"
                            : "border-line text-terminal-accent/60 hover:border-terminal-accent/50"
                        )}
                      >
                        {type === 'stock' && '📈 Stock/ETF'}
                        {type === 'crypto' && '🪙 Crypto'}
                        {type === 'cash' && '💵 Cash'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search (not for cash) */}
                {holdingType !== 'cash' && (
                  <div>
                    <label className="block text-sm text-terminal-accent/60 mb-3">
                      Search by name or symbol
                    </label>
                    <div className="relative">
                      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-terminal-accent/40" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={holdingType === 'crypto' ? "BTC, Solana, Bitcoin..." : "AAPL, Apple, VOO..."}
                        className="w-full pl-10 pr-4 py-3 bg-surface-secondary border border-line 
                                   rounded-lg text-terminal-accent placeholder:text-terminal-accent/30
                                   focus:outline-none focus:border-terminal-accent"
                        autoFocus
                      />
                      {isSearching && (
                        <Loader2 size={18} className="absolute right-3 top-1/2 -translate-y-1/2 
                                                       text-terminal-accent/40 animate-spin" />
                      )}
                    </div>

                    {/* Search Results */}
                    {searchResults.length > 0 && (
                      <div className="mt-3 max-h-[200px] overflow-y-auto border border-line rounded-lg">
                        {searchResults.map((result, i) => (
                          <button
                            key={`${result.symbol}-${i}`}
                            onClick={() => handleSelectTicker(result)}
                            className="w-full flex items-center justify-between px-4 py-3
                                       hover:bg-terminal-accent/10 transition-colors
                                       border-b border-line last:border-b-0"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-bold text-terminal-accent">
                                {result.symbol}
                              </span>
                              <span className="text-sm text-terminal-accent/60 truncate max-w-[200px]">
                                {result.name}
                              </span>
                            </div>
                            <span className="text-xs text-terminal-accent/40">
                              {result.exchange}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchQuery && !isSearching && searchResults.length === 0 && (
                      <div className="mt-3 text-center py-6 text-terminal-accent/40">
                        No results found for "{searchQuery}"
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 2: Confirm Selection */}
            {step === 2 && selectedTicker && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="text-center py-4">
                  <div className="text-4xl mb-3">
                    {selectedTicker.type === 'crypto' ? '🪙' : '📈'}
                  </div>
                  <h3 className="text-xl font-bold text-terminal-accent">
                    {selectedTicker.symbol}
                  </h3>
                  <p className="text-terminal-accent/60 mt-1">
                    {selectedTicker.name}
                  </p>
                </div>

                <div className="space-y-3 p-4 bg-surface-secondary rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-terminal-accent/60">Exchange</span>
                    <span className="text-terminal-accent">{selectedTicker.exchange}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-terminal-accent/60">Type</span>
                    <span className="text-terminal-accent capitalize">{selectedTicker.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-terminal-accent/60">Currency</span>
                    <span className="text-terminal-accent">{selectedTicker.currency}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-line">
                    <span className="text-terminal-accent/60">Current Price</span>
                    {isLoadingPrice ? (
                      <Loader2 size={16} className="text-terminal-accent animate-spin" />
                    ) : tickerPrice ? (
                      <div className="text-right">
                        <span className="text-terminal-accent font-mono">
                          {formatCurrency(tickerPrice, selectedTicker.currency)}
                        </span>
                        {selectedTicker.currency === 'USD' && (
                          <span className="block text-xs text-terminal-accent/40">
                            ≈ {formatCurrency(tickerPrice * fxRate, 'CAD')}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-terminal-accent/40">-</span>
                    )}
                  </div>
                </div>

                <p className="text-center text-terminal-accent/60">
                  Is this the correct investment?
                </p>
              </motion.div>
            )}

            {/* Step 3: Quantity */}
            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {holdingType === 'cash' ? (
                  <>
                    <div className="text-center py-4">
                      <div className="text-4xl mb-3">💵</div>
                      <h3 className="text-xl font-bold text-terminal-accent">
                        Cash (CAD)
                      </h3>
                    </div>

                    <div>
                      <label className="block text-sm text-terminal-accent/60 mb-3">
                        How much cash?
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-terminal-accent/60 text-xl">
                          $
                        </span>
                        <input
                          type="number"
                          value={cashAmount}
                          onChange={(e) => setCashAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-10 pr-16 py-4 bg-surface-secondary border border-line 
                                     rounded-lg text-terminal-accent text-xl font-mono text-right
                                     focus:outline-none focus:border-terminal-accent"
                          autoFocus
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-terminal-accent/60">
                          CAD
                        </span>
                      </div>
                    </div>
                  </>
                ) : selectedTicker && (
                  <>
                    <div className="text-center py-2">
                      <h3 className="text-lg font-bold text-terminal-accent">
                        {selectedTicker.symbol} - {selectedTicker.name}
                      </h3>
                      {tickerPrice && (
                        <p className="text-terminal-accent/60 mt-1">
                          {formatCurrency(tickerPrice, selectedTicker.currency)} per {selectedTicker.type === 'crypto' ? 'coin' : 'share'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm text-terminal-accent/60 mb-3">
                        How many {selectedTicker.type === 'crypto' ? 'coins' : 'shares'}?
                      </label>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="0"
                        step={selectedTicker.type === 'crypto' ? '0.0001' : '1'}
                        className="w-full px-4 py-4 bg-surface-secondary border border-line 
                                   rounded-lg text-terminal-accent text-xl font-mono text-center
                                   focus:outline-none focus:border-terminal-accent"
                        autoFocus
                      />
                    </div>

                    {quantity && parseFloat(quantity) > 0 && (
                      <div className="p-4 bg-terminal-accent/10 rounded-lg text-center">
                        <span className="text-sm text-terminal-accent/60">Total Value</span>
                        <div className="text-2xl font-bold font-mono text-terminal-accent mt-1">
                          {formatCurrency(calculateTotalCAD(), 'CAD')}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-line bg-surface-secondary">
            {/* Back button */}
            {step > 1 && (
              <button
                onClick={() => {
                  if (step === 3 && holdingType === 'cash') {
                    setStep(1);
                  } else {
                    setStep((step - 1) as Step);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg
                           text-terminal-accent/70 hover:text-terminal-accent
                           hover:bg-terminal-accent/10 transition-colors"
              >
                <ChevronLeft size={18} />
                Back
              </button>
            )}
            {step === 1 && <div />}

            {/* Next/Submit button */}
            {step === 2 && (
              <button
                onClick={() => setStep(3)}
                disabled={!tickerPrice}
                className="flex items-center gap-2 px-6 py-2 rounded-lg
                           bg-terminal-accent text-black font-medium
                           hover:bg-terminal-accent/90 transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Yes, Add This
                <ChevronRight size={18} />
              </button>
            )}
            
            {step === 3 && (
              <button
                onClick={handleSubmit}
                disabled={
                  holdingType === 'cash' 
                    ? !cashAmount || parseFloat(cashAmount) <= 0
                    : !quantity || parseFloat(quantity) <= 0
                }
                className="flex items-center gap-2 px-6 py-2 rounded-lg
                           bg-terminal-accent text-black font-medium
                           hover:bg-terminal-accent/90 transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check size={18} />
                Add Holding
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AddHoldingWizard;
