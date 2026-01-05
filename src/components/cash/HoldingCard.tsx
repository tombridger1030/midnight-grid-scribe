/**
 * HoldingCard Component
 * 
 * Displays a single holding with price, value, and daily change.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical, Edit3, Trash2, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Holding } from '@/lib/investmentQuotes';
import { isPriceStale, getPriceAge } from '@/lib/investmentQuotes';

interface HoldingCardProps {
  holding: Holding;
  hideBalances: boolean;
  onEdit: (holding: Holding) => void;
  onDelete: (id: string) => void;
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
  // Stock - use first letter or company emoji
  return '📈';
}

export const HoldingCard: React.FC<HoldingCardProps> = ({
  holding,
  hideBalances,
  onEdit,
  onDelete,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const formatCurrency = (value: number | undefined): string => {
    if (hideBalances) return '•••••';
    if (value === undefined) return '-';
    return `$${value.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatPrice = (value: number | undefined, currency: string): string => {
    if (hideBalances) return '•••';
    if (value === undefined) return '-';
    return `$${value.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  };

  const formatQuantity = (qty: number, type: string): string => {
    if (type === 'cash') return '';
    if (type === 'crypto') {
      // Show more decimals for crypto
      return qty < 1 ? qty.toFixed(6) : qty.toFixed(4);
    }
    return qty.toString();
  };

  const change = holding.change24h || 0;
  const isPositive = change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative p-4 rounded-lg bg-surface-secondary border border-line
                 hover:border-terminal-accent/30 transition-colors group"
    >
      <div className="flex items-start justify-between">
        {/* Left: Icon, Symbol, Name */}
        <div className="flex items-start gap-3">
          <div className="text-2xl mt-0.5">
            {getHoldingIcon(holding)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-terminal-accent">
                {holding.symbol}
              </span>
              {holding.exchange && holding.type !== 'cash' && holding.type !== 'crypto' && (
                <span className="text-xs text-terminal-accent/40 px-1.5 py-0.5 bg-terminal-accent/10 rounded">
                  {holding.exchange}
                </span>
              )}
            </div>
            <div className="text-sm text-terminal-accent/60 truncate max-w-[200px]">
              {holding.name}
            </div>
            {holding.type !== 'cash' && (
              <div className="text-xs text-terminal-accent/40 mt-1">
                {formatQuantity(holding.quantity, holding.type)} × {formatPrice(holding.currentPrice, holding.currency)}
              </div>
            )}
          </div>
        </div>

        {/* Right: Value and Change */}
        <div className="flex items-start gap-3">
          <div className="text-right">
            <div className="font-mono font-bold text-terminal-accent text-lg">
              {formatCurrency(holding.valueCAD)}
            </div>
            {holding.type !== 'cash' && (
              <div className={cn(
                "flex items-center justify-end gap-1 text-sm",
                isPositive ? "text-[#5FE3B3]" : "text-[#FF6B6B]"
              )}>
                {isPositive ? (
                  <TrendingUp size={14} />
                ) : (
                  <TrendingDown size={14} />
                )}
                <span>
                  {isPositive ? '+' : ''}{change.toFixed(2)}%
                </span>
              </div>
            )}
          </div>

          {/* Menu Button */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded hover:bg-terminal-accent/10 
                         text-terminal-accent/40 hover:text-terminal-accent
                         opacity-0 group-hover:opacity-100 transition-all"
            >
              <MoreVertical size={16} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {showMenu && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowMenu(false)} 
                  />
                  
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-0 top-8 z-20 min-w-[140px]
                               bg-surface-primary border border-line rounded-lg
                               shadow-lg overflow-hidden"
                  >
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onEdit(holding);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2
                                 text-sm text-terminal-accent/80
                                 hover:bg-terminal-accent/10 transition-colors"
                    >
                      <Edit3 size={14} />
                      Edit Quantity
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onDelete(holding.id);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2
                                 text-sm text-[#FF6B6B]
                                 hover:bg-[#FF6B6B]/10 transition-colors"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Last updated indicator with stale warning */}
      {holding.lastUpdated && holding.type !== 'cash' && (
        (() => {
          const timestamp = new Date(holding.lastUpdated).getTime();
          const isStale = isPriceStale(timestamp);
          const ageMs = getPriceAge(timestamp);
          const ageHours = Math.floor(ageMs / (60 * 60 * 1000));
          const ageMinutes = Math.floor((ageMs % (60 * 60 * 1000)) / (60 * 1000));
          
          // Format relative time
          let timeText = '';
          if (ageHours > 0) {
            timeText = `${ageHours}h ago`;
          } else if (ageMinutes > 1) {
            timeText = `${ageMinutes}m ago`;
          } else {
            timeText = 'just now';
          }

          return (
            <div className={cn(
              "absolute bottom-1 right-2 text-[10px] flex items-center gap-1",
              isStale ? "text-amber-500/70" : "text-terminal-accent/30"
            )}>
              {isStale && <Clock size={10} />}
              {timeText}
            </div>
          );
        })()
      )}
    </motion.div>
  );
};

export default HoldingCard;
