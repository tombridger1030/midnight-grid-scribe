/**
 * Cash Page
 * 
 * Simplified financial tracking with two tabs:
 * - Expenses: Fast daily expense logging + runway display
 * - Investments: Portfolio management (Phase 2)
 * 
 * All values in CAD.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Receipt, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExpensesTab, InvestmentsTab } from '@/components/cash';
import type { Expense } from '@/components/cash';
import { 
  loadCashConsoleData, 
  saveCashConsoleData, 
  defaultCashConsoleData,
  CashConsoleData 
} from '@/lib/storage';

// Default accounts to pre-seed
const DEFAULT_ACCOUNTS = ['BMO', 'Wealthsimple', 'Cash'];

// Default cash reserve for runway calculation
const DEFAULT_CASH_RESERVE = 12000; // CAD

// Migration function: Convert old data format to new simplified format
function migrateOldExpenses(oldData: CashConsoleData): Expense[] {
  const expenses: Expense[] = [];
  const fxRate = oldData.fx?.usdToCad || 1.35;
  
  // Migrate old lifestyle expenses
  if (oldData.expenses?.items) {
    oldData.expenses.items.forEach(item => {
      expenses.push({
        id: item.id,
        amount: Math.round(item.amountUsd * fxRate * 100) / 100, // Convert to CAD
        account: 'Imported', // Default account for migrated items
        item: item.item || item.category || 'Unknown',
        category: item.category,
        date: item.date || new Date().toISOString().slice(0, 10),
      });
    });
  }
  
  // Migrate old cortal/burn expenses
  if (oldData.cortal?.items) {
    oldData.cortal.items.forEach(item => {
      expenses.push({
        id: item.id,
        amount: Math.round(item.amountUsd * fxRate * 100) / 100, // Convert to CAD
        account: 'Business',
        item: item.category,
        category: item.category,
        date: item.date,
      });
    });
  }
  
  return expenses;
}

// Calculate total investments in CAD
function calculateTotalInvestmentsCAD(data: CashConsoleData): number {
  const fxRate = data.fx?.usdToCad || 1.35;
  
  return data.investments.holdings.reduce((sum, h) => {
    if (h.type === 'equity') {
      const valueUsd = h.currentValueUsd || (h.lastPriceUsd || 0) * h.quantity;
      return sum + (valueUsd * fxRate);
    }
    if (h.type === 'cash') {
      return sum + ((h.amountUsd || 0) * fxRate);
    }
    return sum;
  }, 0);
}

type TabType = 'expenses' | 'investments';

const Cash: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('expenses');
  const [data, setData] = useState<CashConsoleData>(defaultCashConsoleData());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [accounts, setAccounts] = useState<string[]>(DEFAULT_ACCOUNTS);
  const [cashReserve, setCashReserve] = useState<number>(DEFAULT_CASH_RESERVE);
  const [hideBalances, setHideBalances] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const loaded = await loadCashConsoleData();
        setData(loaded);
        
        // Check if we have new-format expenses stored
        const storedExpenses = localStorage.getItem('noctisium-expenses');
        const storedAccounts = localStorage.getItem('noctisium-accounts');
        
        if (storedExpenses) {
          // Use new format
          setExpenses(JSON.parse(storedExpenses));
        } else {
          // Migrate from old format
          const migrated = migrateOldExpenses(loaded);
          setExpenses(migrated);
          // Save migrated data
          localStorage.setItem('noctisium-expenses', JSON.stringify(migrated));
        }
        
        if (storedAccounts) {
          setAccounts(JSON.parse(storedAccounts));
        } else {
          // Include 'Imported' and 'Business' if we migrated data
          const migratedAccounts = new Set([...DEFAULT_ACCOUNTS]);
          const migrated = migrateOldExpenses(loaded);
          migrated.forEach(e => migratedAccounts.add(e.account));
          const accountList = Array.from(migratedAccounts);
          setAccounts(accountList);
          localStorage.setItem('noctisium-accounts', JSON.stringify(accountList));
        }
        
        // Load cash reserve
        const storedCashReserve = localStorage.getItem('noctisium-cash-reserve');
        if (storedCashReserve) {
          setCashReserve(parseFloat(storedCashReserve));
        }
      } catch (error) {
        console.error('Failed to load cash data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Calculate total investments
  const totalInvestmentsCAD = useMemo(() => calculateTotalInvestmentsCAD(data), [data]);

  // Save expenses
  const saveExpenses = (newExpenses: Expense[]) => {
    setExpenses(newExpenses);
    localStorage.setItem('noctisium-expenses', JSON.stringify(newExpenses));
  };

  // Save accounts
  const saveAccounts = (newAccounts: string[]) => {
    setAccounts(newAccounts);
    localStorage.setItem('noctisium-accounts', JSON.stringify(newAccounts));
  };

  // Add expense
  const handleAddExpense = (expense: Omit<Expense, 'id'>) => {
    const newExpense: Expense = {
      ...expense,
      id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
    saveExpenses([newExpense, ...expenses]);
  };

  // Delete expense
  const handleDeleteExpense = (id: string) => {
    saveExpenses(expenses.filter(e => e.id !== id));
  };

  // Add account
  const handleAddAccount = (account: string) => {
    if (!accounts.includes(account)) {
      saveAccounts([...accounts, account]);
    }
  };

  // Update cash reserve
  const handleUpdateCashReserve = (amount: number) => {
    setCashReserve(amount);
    localStorage.setItem('noctisium-cash-reserve', amount.toString());
  };

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-terminal-accent/60">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-terminal-accent mb-1">Cash</h1>
          <p className="text-terminal-accent/60 text-sm">
            Track expenses and monitor runway
          </p>
        </div>
        <button
          onClick={() => setHideBalances(!hideBalances)}
          className="flex items-center gap-2 px-3 py-2 
                     bg-surface-secondary border border-line rounded
                     text-terminal-accent/70 hover:text-terminal-accent
                     transition-colors"
        >
          {hideBalances ? <Eye size={16} /> : <EyeOff size={16} />}
          <span className="text-sm">{hideBalances ? 'Show' : 'Hide'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-surface-secondary rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('expenses')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md transition-all",
            activeTab === 'expenses'
              ? "bg-terminal-accent text-black font-medium"
              : "text-terminal-accent/70 hover:text-terminal-accent hover:bg-surface-hover"
          )}
        >
          <Receipt size={16} />
          Expenses
        </button>
        <button
          onClick={() => setActiveTab('investments')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md transition-all",
            activeTab === 'investments'
              ? "bg-terminal-accent text-black font-medium"
              : "text-terminal-accent/70 hover:text-terminal-accent hover:bg-surface-hover"
          )}
        >
          <TrendingUp size={16} />
          Investments
        </button>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: activeTab === 'expenses' ? -20 : 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'expenses' ? (
          <ExpensesTab
            expenses={expenses}
            accounts={accounts}
            cashReserveCAD={cashReserve}
            hideBalances={hideBalances}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
            onAddAccount={handleAddAccount}
            onUpdateCashReserve={handleUpdateCashReserve}
          />
        ) : (
          <InvestmentsTab
            hideBalances={hideBalances}
          />
        )}
      </motion.div>
    </div>
  );
};

export default Cash;
