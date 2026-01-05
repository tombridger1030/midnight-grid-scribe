/**
 * EditHoldingModal Component
 * 
 * Modal for editing holding:
 * - Quantity tab: buy/sell/rebalance
 * - Details tab: change symbol, name, exchange
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, RefreshCw, Settings, Hash, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Holding } from '@/lib/investmentQuotes';
import { searchStocks, getStockQuote } from '@/lib/investmentQuotes';

interface EditHoldingModalProps {
  holding: Holding | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Holding>) => void;
}

// Get icon/emoji for holding type
function getHoldingIcon(holding: Holding): string {
  if (holding.type === 'cash') return '💵';
  if (holding.type === 'crypto') {
    if (holding.symbol === 'BTC') return '₿';
    if (holding.symbol === 'ETH') return 'Ξ';
    if (holding.symbol === 'SOL') return '◎';
    return '🪙';
  }
  if (holding.type === 'etf') return '📊';
  return '📈';
}

type TabType = 'quantity' | 'details';

export const EditHoldingModal: React.FC<EditHoldingModalProps> = ({
  holding,
  isOpen,
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('quantity');
  
  // Quantity tab state
  const [quantity, setQuantity] = useState('');
  const [action, setAction] = useState<'set' | 'add' | 'subtract'>('set');
  
  // Details tab state
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedPrice, setVerifiedPrice] = useState<number | null>(null);

  // Reset when modal opens with new holding
  useEffect(() => {
    if (holding && isOpen) {
      setQuantity(holding.quantity.toString());
      setAction('set');
      setSymbol(holding.symbol);
      setName(holding.name);
      setSearchQuery('');
      setSearchResults([]);
      setVerifiedPrice(null);
      setActiveTab('quantity');
    }
  }, [holding, isOpen]);

  // Search for stocks when query changes
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 1) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchStocks(searchQuery);
        setSearchResults(results);
      } catch (e) {
        console.error('Search failed:', e);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Verify new symbol
  const verifySymbol = async (newSymbol: string) => {
    setIsVerifying(true);
    setVerifiedPrice(null);
    try {
      const quote = await getStockQuote(newSymbol);
      if (quote) {
        setVerifiedPrice(quote.price);
        setName(quote.name);
      }
    } catch (e) {
      console.error('Verification failed:', e);
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen || !holding) return null;

  const currentQty = holding.quantity;
  const inputQty = parseFloat(quantity) || 0;
  
  // Calculate new quantity based on action
  const calculateNewQuantity = (): number => {
    switch (action) {
      case 'add':
        return currentQty + inputQty;
      case 'subtract':
        return Math.max(0, currentQty - inputQty);
      case 'set':
      default:
        return inputQty;
    }
  };

  const newQuantity = calculateNewQuantity();
  const quantityChange = newQuantity - currentQty;
  
  // Calculate value change
  const pricePerUnit = holding.currentPrice || 0;
  const fxRate = holding.currency === 'USD' || holding.type === 'crypto' ? 1.43 : 1;
  const currentValue = holding.valueCAD || 0;
  const newValue = pricePerUnit * newQuantity * fxRate;
  const valueChange = newValue - currentValue;

  const handleSaveQuantity = () => {
    if (newQuantity <= 0 && holding.type !== 'cash') {
      alert('Quantity must be greater than 0. Use delete to remove the holding.');
      return;
    }
    
    // Calculate new value
    const updatedFxRate = holding.currency === 'USD' || holding.type === 'crypto' ? 1.43 : 1;
    const newValueCAD = holding.currentPrice 
      ? holding.currentPrice * newQuantity * updatedFxRate
      : (holding.valueCAD || 0) / holding.quantity * newQuantity;
    
    onSave(holding.id, { 
      quantity: newQuantity,
      valueCAD: newValueCAD,
    });
    onClose();
  };

  const handleSaveDetails = () => {
    if (!symbol.trim()) {
      alert('Symbol is required');
      return;
    }

    const updates: Partial<Holding> = {
      symbol: symbol.trim().toUpperCase(),
      name: name.trim() || symbol.trim().toUpperCase(),
    };

    // If we verified a new price, include it
    if (verifiedPrice !== null && symbol !== holding.symbol) {
      updates.currentPrice = verifiedPrice;
      const newFxRate = symbol.endsWith('.TO') ? 1 : 1.43;
      updates.valueCAD = verifiedPrice * holding.quantity * newFxRate;
      updates.currency = symbol.endsWith('.TO') ? 'CAD' : 'USD';
    }

    onSave(holding.id, updates);
    onClose();
  };

  const formatCurrency = (value: number): string => {
    return `$${value.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatQuantity = (qty: number): string => {
    if (holding.type === 'crypto') {
      return qty < 1 ? qty.toFixed(6) : qty.toFixed(4);
    }
    return qty.toString();
  };

  const selectSearchResult = (result: any) => {
    setSymbol(result.symbol);
    setName(result.name);
    setSearchQuery('');
    setSearchResults([]);
    verifySymbol(result.symbol);
  };

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
          className="relative w-full max-w-md bg-surface-primary border border-line 
                     rounded-xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-line">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getHoldingIcon(holding)}</span>
              <div>
                <h2 className="text-lg font-semibold text-terminal-accent">
                  Edit {holding.symbol}
                </h2>
                <p className="text-sm text-terminal-accent/60">{holding.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-terminal-accent/10 
                         text-terminal-accent/60 hover:text-terminal-accent transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-line">
            <button
              onClick={() => setActiveTab('quantity')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
                activeTab === 'quantity'
                  ? "text-terminal-accent border-b-2 border-terminal-accent"
                  : "text-terminal-accent/50 hover:text-terminal-accent/70"
              )}
            >
              <Hash size={16} />
              Quantity
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
                activeTab === 'details'
                  ? "text-terminal-accent border-b-2 border-terminal-accent"
                  : "text-terminal-accent/50 hover:text-terminal-accent/70"
              )}
            >
              <Settings size={16} />
              Symbol / Exchange
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {activeTab === 'quantity' ? (
              <>
                {/* Current Position */}
                <div className="p-4 rounded-lg bg-surface-secondary">
                  <div className="text-sm text-terminal-accent/60 mb-2">Current Position</div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xl font-mono text-terminal-accent">
                      {formatQuantity(currentQty)} {holding.type === 'cash' ? 'CAD' : holding.type === 'crypto' ? 'coins' : 'shares'}
                    </span>
                    <span className="text-terminal-accent/70">
                      {formatCurrency(currentValue)} CAD
                    </span>
                  </div>
                </div>

                {/* Action Selection */}
                <div>
                  <div className="text-sm text-terminal-accent/60 mb-3">Action</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAction('set')}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border transition-all",
                        action === 'set'
                          ? "border-terminal-accent bg-terminal-accent/10 text-terminal-accent"
                          : "border-line text-terminal-accent/60 hover:border-terminal-accent/50"
                      )}
                    >
                      <RefreshCw size={16} />
                      Set Total
                    </button>
                    <button
                      onClick={() => {
                        setAction('add');
                        setQuantity('');
                      }}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border transition-all",
                        action === 'add'
                          ? "border-[#5FE3B3] bg-[#5FE3B3]/10 text-[#5FE3B3]"
                          : "border-line text-terminal-accent/60 hover:border-[#5FE3B3]/50"
                      )}
                    >
                      <Plus size={16} />
                      Buy More
                    </button>
                    <button
                      onClick={() => {
                        setAction('subtract');
                        setQuantity('');
                      }}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border transition-all",
                        action === 'subtract'
                          ? "border-[#FF6B6B] bg-[#FF6B6B]/10 text-[#FF6B6B]"
                          : "border-line text-terminal-accent/60 hover:border-[#FF6B6B]/50"
                      )}
                    >
                      <Minus size={16} />
                      Sell
                    </button>
                  </div>
                </div>

                {/* Quantity Input */}
                <div>
                  <div className="text-sm text-terminal-accent/60 mb-3">
                    {action === 'set' && 'New Total Quantity'}
                    {action === 'add' && 'Quantity to Add'}
                    {action === 'subtract' && 'Quantity to Sell'}
                  </div>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0"
                    step={holding.type === 'crypto' ? '0.0001' : '1'}
                    min="0"
                    className="w-full px-4 py-4 bg-surface-secondary border border-line 
                               rounded-lg text-terminal-accent text-xl font-mono text-center
                               focus:outline-none focus:border-terminal-accent"
                    autoFocus
                  />
                </div>

                {/* Preview */}
                {inputQty > 0 && (
                  <div className="p-4 rounded-lg bg-terminal-accent/5 border border-terminal-accent/20">
                    <div className="text-sm text-terminal-accent/60 mb-3">After Update</div>
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-xl font-mono text-terminal-accent">
                        {formatQuantity(newQuantity)} {holding.type === 'cash' ? 'CAD' : holding.type === 'crypto' ? 'coins' : 'shares'}
                      </span>
                      <span className="text-terminal-accent">
                        {formatCurrency(newValue)} CAD
                      </span>
                    </div>
                    <div className={cn(
                      "text-sm text-right",
                      quantityChange > 0 ? "text-[#5FE3B3]" : quantityChange < 0 ? "text-[#FF6B6B]" : "text-terminal-accent/60"
                    )}>
                      {quantityChange > 0 ? '+' : ''}{formatQuantity(quantityChange)} ({valueChange >= 0 ? '+' : ''}{formatCurrency(valueChange)})
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Symbol Search */}
                <div>
                  <div className="text-sm text-terminal-accent/60 mb-3">Search for ticker</div>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-terminal-accent/40" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search stocks... (e.g., VFV.TO, AAPL)"
                      className="w-full pl-10 pr-4 py-3 bg-surface-secondary border border-line 
                                 rounded-lg text-terminal-accent
                                 focus:outline-none focus:border-terminal-accent"
                    />
                    {isSearching && (
                      <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-terminal-accent/40 animate-spin" />
                    )}
                  </div>

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-line bg-surface-secondary">
                      {searchResults.map((result, i) => (
                        <button
                          key={i}
                          onClick={() => selectSearchResult(result)}
                          className="w-full flex items-center justify-between px-4 py-3 
                                     hover:bg-terminal-accent/10 transition-colors border-b border-line last:border-b-0"
                        >
                          <div className="text-left">
                            <div className="font-medium text-terminal-accent">{result.symbol}</div>
                            <div className="text-sm text-terminal-accent/60 truncate max-w-[200px]">
                              {result.name}
                            </div>
                          </div>
                          <div className="text-xs text-terminal-accent/40 px-2 py-1 bg-terminal-accent/10 rounded">
                            {result.exchange}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Current Symbol */}
                <div>
                  <div className="text-sm text-terminal-accent/60 mb-3">Symbol</div>
                  <input
                    type="text"
                    value={symbol}
                    onChange={(e) => {
                      setSymbol(e.target.value.toUpperCase());
                      setVerifiedPrice(null);
                    }}
                    placeholder="e.g., VFV.TO"
                    className="w-full px-4 py-3 bg-surface-secondary border border-line 
                               rounded-lg text-terminal-accent font-mono
                               focus:outline-none focus:border-terminal-accent"
                  />
                  <p className="text-xs text-terminal-accent/40 mt-2">
                    Tip: Canadian stocks need .TO suffix (e.g., VFV.TO, ATZ.TO)
                  </p>
                </div>

                {/* Name */}
                <div>
                  <div className="text-sm text-terminal-accent/60 mb-3">Name</div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Company name"
                    className="w-full px-4 py-3 bg-surface-secondary border border-line 
                               rounded-lg text-terminal-accent
                               focus:outline-none focus:border-terminal-accent"
                  />
                </div>

                {/* Verify Button */}
                {symbol !== holding.symbol && (
                  <div>
                    <button
                      onClick={() => verifySymbol(symbol)}
                      disabled={isVerifying || !symbol.trim()}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 
                                 rounded-lg border border-terminal-accent/30
                                 text-terminal-accent hover:bg-terminal-accent/10 
                                 transition-colors disabled:opacity-50"
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <Search size={16} />
                          Verify & Fetch Price
                        </>
                      )}
                    </button>

                    {verifiedPrice !== null && (
                      <div className="mt-3 p-3 rounded-lg bg-[#5FE3B3]/10 border border-[#5FE3B3]/30">
                        <div className="flex items-center gap-2 text-[#5FE3B3]">
                          <span className="text-sm">Verified!</span>
                          <span className="font-mono font-bold">
                            ${verifiedPrice.toFixed(2)} {symbol.endsWith('.TO') ? 'CAD' : 'USD'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-line bg-surface-secondary">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-terminal-accent/70 
                         hover:text-terminal-accent hover:bg-terminal-accent/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={activeTab === 'quantity' ? handleSaveQuantity : handleSaveDetails}
              disabled={
                activeTab === 'quantity' 
                  ? (!inputQty || inputQty <= 0 || (action !== 'set' && newQuantity < 0))
                  : (!symbol.trim())
              }
              className="px-6 py-2 rounded-lg bg-terminal-accent text-black font-medium
                         hover:bg-terminal-accent/90 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Changes
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EditHoldingModal;
