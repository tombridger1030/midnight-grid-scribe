/**
 * InvestmentsTab Component
 * 
 * Portfolio management with charts and holdings.
 * Phase 2 - Currently a placeholder.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { LineChart, PieChart, TrendingUp, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InvestmentsTabProps {
  totalCAD: number;
  hideBalances: boolean;
}

export const InvestmentsTab: React.FC<InvestmentsTabProps> = ({
  totalCAD,
  hideBalances,
}) => {
  const formatCurrency = (value: number): string => {
    if (hideBalances) return '•••••';
    return `$${value.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-lg bg-surface-secondary border border-line"
      >
        <div className="text-sm text-terminal-accent/60 uppercase tracking-wider mb-1">
          Portfolio
        </div>
        <div className="text-3xl font-bold font-mono text-terminal-accent">
          {formatCurrency(totalCAD)}
        </div>
      </motion.div>

      {/* Coming Soon Placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-12 rounded-lg bg-surface-secondary border border-line border-dashed text-center"
      >
        <div className="flex justify-center gap-6 mb-6 text-terminal-accent/30">
          <LineChart size={48} />
          <PieChart size={48} />
          <TrendingUp size={48} />
        </div>
        <h3 className="text-lg font-medium text-terminal-accent mb-2">
          Investments Tab Coming Soon
        </h3>
        <p className="text-terminal-accent/60 max-w-md mx-auto mb-4">
          Beautiful portfolio charts, ticker search with validation, 
          S&P 500 benchmark comparison, and more.
        </p>
        <div className="text-sm text-terminal-accent/40">
          Phase 2 of Cash Page Overhaul
        </div>
      </motion.div>

      {/* Temporary: Simple Holdings List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-4 rounded-lg bg-surface-secondary border border-line"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-terminal-accent">Holdings</h3>
          <button 
            disabled
            className="flex items-center gap-2 px-3 py-1.5 text-sm
                       bg-terminal-accent/10 text-terminal-accent/50 rounded
                       cursor-not-allowed"
          >
            <Plus size={14} />
            Add Holding
          </button>
        </div>
        <p className="text-sm text-terminal-accent/40">
          Use the old investments section for now. Full redesign coming in Phase 2.
        </p>
      </motion.div>
    </div>
  );
};

export default InvestmentsTab;
