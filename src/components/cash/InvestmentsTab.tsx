/**
 * InvestmentsTab Component
 * 
 * Portfolio management with charts and holdings.
 * Full implementation with real-time quotes.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, RefreshCw, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  loadHoldings, 
  saveHoldings, 
  refreshAllHoldings,
  savePortfolioSnapshot,
  migrateOldHoldings,
  deleteHolding as deleteHoldingFromStorage,
  type Holding,
} from '@/lib/investmentQuotes';
import { HoldingCard } from './HoldingCard';
import { AddHoldingWizard } from './AddHoldingWizard';
import { EditHoldingModal } from './EditHoldingModal';
import { AllocationChart } from './AllocationChart';
import { PortfolioChart } from './PortfolioChart';

// Auto-refresh interval: 2 hours
const AUTO_REFRESH_INTERVAL = 2 * 60 * 60 * 1000;

interface InvestmentsTabProps {
  hideBalances: boolean;
}

export const InvestmentsTab: React.FC<InvestmentsTabProps> = ({
  hideBalances,
}) => {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddWizard, setShowAddWizard] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Load holdings on mount
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        let loaded = loadHoldings();
        
        // Check for migration from old format
        if (loaded.length === 0) {
          const migrated = migrateOldHoldings();
          if (migrated.length > 0) {
            loaded = migrated;
            saveHoldings(migrated);
          }
        }

        // Refresh prices if we have holdings
        if (loaded.length > 0) {
          setHoldings(loaded); // Show stale data first
          const refreshed = await refreshAllHoldings(loaded);
          setHoldings(refreshed);
          saveHoldings(refreshed);
          savePortfolioSnapshot(refreshed);
          setLastUpdated(new Date().toISOString());
        } else {
          setHoldings([]);
        }
      } catch (e) {
        console.error('Failed to load holdings:', e);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  // Auto-refresh timer (every 2 hours)
  const holdingsRef = useRef(holdings);
  holdingsRef.current = holdings;

  const doRefresh = useCallback(async () => {
    const currentHoldings = holdingsRef.current;
    if (currentHoldings.length === 0) return;
    
    console.log('[Auto-refresh] Refreshing prices...');
    try {
      const refreshed = await refreshAllHoldings(currentHoldings);
      setHoldings(refreshed);
      saveHoldings(refreshed);
      savePortfolioSnapshot(refreshed);
      setLastUpdated(new Date().toISOString());
      console.log('[Auto-refresh] Prices updated successfully');
    } catch (e) {
      console.error('[Auto-refresh] Failed:', e);
    }
  }, []);

  useEffect(() => {
    if (holdings.length === 0) return;

    // Set up auto-refresh interval
    const timer = setInterval(() => {
      doRefresh();
    }, AUTO_REFRESH_INTERVAL);

    // Calculate time until next refresh for logging
    const hoursUntilRefresh = AUTO_REFRESH_INTERVAL / (60 * 60 * 1000);
    console.log(`[Auto-refresh] Next refresh in ${hoursUntilRefresh} hours`);

    return () => clearInterval(timer);
  }, [holdings.length, doRefresh]);

  // Calculate totals
  const totalCAD = useMemo(() => 
    holdings.reduce((sum, h) => sum + (h.valueCAD || 0), 0),
    [holdings]
  );

  const totalChange = useMemo(() => {
    if (holdings.length === 0) return 0;
    
    // Weighted average of changes
    let totalValue = 0;
    let weightedChange = 0;
    
    holdings.forEach(h => {
      const value = h.valueCAD || 0;
      const change = h.change24h || 0;
      totalValue += value;
      weightedChange += value * change;
    });

    return totalValue > 0 ? weightedChange / totalValue : 0;
  }, [holdings]);

  // Format currency
  const formatCurrency = (value: number): string => {
    if (hideBalances) return '•••••';
    return `$${value.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Refresh all prices
  const handleRefresh = async () => {
    if (holdings.length === 0) return;
    
    setIsRefreshing(true);
    try {
      const refreshed = await refreshAllHoldings(holdings);
      setHoldings(refreshed);
      saveHoldings(refreshed);
      savePortfolioSnapshot(refreshed);
      setLastUpdated(new Date().toISOString());
    } catch (e) {
      console.error('Failed to refresh prices:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Add new holding
  const handleAddHolding = async (holding: Omit<Holding, 'id'>) => {
    const newHolding: Holding = {
      ...holding,
      id: `holding-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
    
    const updated = [...holdings, newHolding];
    setHoldings(updated);
    saveHoldings(updated);
    savePortfolioSnapshot(updated);
  };

  // Edit holding - open modal
  const handleEditHolding = (holding: Holding) => {
    setEditingHolding(holding);
    setShowEditModal(true);
  };

  // Save edited holding (quantity or details)
  const handleSaveEdit = (id: string, updates: Partial<Holding>) => {
    const updated = holdings.map(h => {
      if (h.id === id) {
        return { ...h, ...updates, lastUpdated: new Date().toISOString() };
      }
      return h;
    });

    setHoldings(updated);
    saveHoldings(updated);
    savePortfolioSnapshot(updated);
    setShowEditModal(false);
    setEditingHolding(null);
  };

  // Delete holding
  const handleDeleteHolding = (id: string) => {
    const holding = holdings.find(h => h.id === id);
    if (!holding) return;
    
    if (!confirm(`Delete ${holding.symbol} from your portfolio?`)) return;
    
    const updated = holdings.filter(h => h.id !== id);
    setHoldings(updated);
    saveHoldings(updated);
    deleteHoldingFromStorage(id);
  };

  const isPositiveChange = totalChange >= 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="text-terminal-accent animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-lg bg-surface-secondary border border-line"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-terminal-accent/60 uppercase tracking-wider mb-1">
              Portfolio
            </div>
            <div className="flex items-baseline gap-4">
              <span className="text-3xl font-bold font-mono text-terminal-accent">
                {formatCurrency(totalCAD)}
              </span>
              {holdings.length > 0 && (
                <span className={cn(
                  "flex items-center gap-1 text-lg font-medium",
                  isPositiveChange ? "text-[#5FE3B3]" : "text-[#FF6B6B]"
                )}>
                  {isPositiveChange ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                  {isPositiveChange ? '+' : ''}{totalChange.toFixed(2)}% today
                </span>
              )}
            </div>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || holdings.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-lg
                       text-terminal-accent/70 hover:text-terminal-accent
                       hover:bg-terminal-accent/10 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={16} className={cn(isRefreshing && "animate-spin")} />
            Refresh
          </button>
        </div>

        {lastUpdated && (
          (() => {
            const ageMs = Date.now() - new Date(lastUpdated).getTime();
            const ageMinutes = Math.floor(ageMs / (60 * 1000));
            const ageHours = Math.floor(ageMs / (60 * 60 * 1000));
            
            let timeText = '';
            if (ageHours > 0) {
              timeText = `${ageHours}h ${ageMinutes % 60}m ago`;
            } else if (ageMinutes > 0) {
              timeText = `${ageMinutes}m ago`;
            } else {
              timeText = 'just now';
            }

            return (
              <div className="text-xs text-terminal-accent/40 mt-3">
                Last updated: {timeText}
              </div>
            );
          })()
        )}
      </motion.div>

      {/* Charts Row */}
      {holdings.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Performance Chart - Takes 2 columns */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            <PortfolioChart
              currentTotal={totalCAD}
              hideBalances={hideBalances}
            />
          </motion.div>

          {/* Allocation Chart */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <AllocationChart
              holdings={holdings}
              hideBalances={hideBalances}
            />
          </motion.div>
        </div>
      )}

      {/* Holdings List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-terminal-accent/60 uppercase tracking-wider">
            Holdings ({holdings.length})
          </h3>
          <button
            onClick={() => setShowAddWizard(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg
                       bg-terminal-accent text-black font-medium
                       hover:bg-terminal-accent/90 transition-colors"
          >
            <Plus size={16} />
            Add Holding
          </button>
        </div>

        {holdings.length === 0 ? (
          <div className="p-12 rounded-lg bg-surface-secondary border border-line border-dashed text-center">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-terminal-accent mb-2">
              No holdings yet
            </h3>
            <p className="text-terminal-accent/60 max-w-sm mx-auto mb-4">
              Add your first investment to start tracking your portfolio.
            </p>
            <button
              onClick={() => setShowAddWizard(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg
                         bg-terminal-accent text-black font-medium
                         hover:bg-terminal-accent/90 transition-colors"
            >
              <Plus size={18} />
              Add Your First Holding
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {holdings
              .sort((a, b) => (b.valueCAD || 0) - (a.valueCAD || 0))
              .map((holding, index) => (
                <motion.div
                  key={holding.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                >
                  <HoldingCard
                    holding={holding}
                    hideBalances={hideBalances}
                    onEdit={handleEditHolding}
                    onDelete={handleDeleteHolding}
                  />
                </motion.div>
              ))}
          </div>
        )}
      </motion.div>

      {/* Add Holding Wizard */}
      <AddHoldingWizard
        isOpen={showAddWizard}
        onClose={() => setShowAddWizard(false)}
        onAdd={handleAddHolding}
      />

      {/* Edit Holding Modal */}
      <EditHoldingModal
        holding={editingHolding}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingHolding(null);
        }}
        onSave={handleSaveEdit}
      />
    </div>
  );
};

export default InvestmentsTab;
