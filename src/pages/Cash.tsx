import React, { useMemo, useState, useEffect } from 'react';
import TypewriterText from '@/components/TypewriterText';
import { Progress } from '@/components/ui/progress';
import { DollarSign, LineChart, CreditCard, Flame, CalendarClock, Eye, EyeOff } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, LineChart as ReLineChart, XAxis, YAxis, Tooltip, Line, CartesianGrid } from 'recharts';
import { loadCashConsoleData, saveCashConsoleData, defaultCashConsoleData, CashConsoleData, CashHolding, updateNetWorthFromInvestments } from '@/lib/storage';
import { fetchQuoteUSD, fetchQuoteAndPrevCloseUSD, fetchUsdToCad } from '@/lib/utils';
import { RunwayManager } from '@/components/RunwayManager';
import { preferencesManager, UserPreferences } from '@/lib/userPreferences';

const Cash: React.FC = () => {
  const [data, setData] = useState<CashConsoleData>(defaultCashConsoleData());
  const [investmentsView, setInvestmentsView] = useState<'add' | 'pie' | 'line'>('add');
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [hideBalances, setHideBalances] = useState<boolean>(false);

  useEffect(() => {
    const loadData = async () => {
      // Load preferences
      const userPrefs = await preferencesManager.getUserPreferences();
      setPreferences(userPrefs);

      // Load cash data (now async)
      const d = await loadCashConsoleData();
      console.log('[Cash] loadCashConsoleData:', d);
      setData(d);
    };

    // Auto-refresh prices on page load after loading data
    const autoRefresh = async () => {
      const d = await loadCashConsoleData();
      const today = new Date().toISOString().slice(0, 10);
      if (d.investments.holdings.some(h => h.type === 'equity')) {
        const next = { ...d };
        console.log('[Cash] auto-refresh start. holdings:', next.investments.holdings);
        for (const h of next.investments.holdings) {
          if (h.type === 'equity') {
            const qp = await fetchQuoteAndPrevCloseUSD(h.ticker);
            if (qp) {
              console.log('[Cash] auto-refresh quote:', h.ticker, qp);
              h.lastPriceUsd = qp.price;
              h.prevCloseUsd = qp.prevClose;
              h.currentValueUsd = Number((qp.price * h.quantity).toFixed(2));
            }
          }
        }
        next.investments.lastPricesUpdatedAt = today;
        // Append to history
        try {
          const totalUsd = next.investments.holdings.reduce((s, h) => s + (h.type === 'equity' ? (h.currentValueUsd || 0) : (h.amountUsd || 0)), 0);
          if (!next.investments.history) next.investments.history = [];
          const exists = next.investments.history.find(x => x.date === today);
          if (!exists) next.investments.history.push({ date: today, totalUsd: Number(totalUsd.toFixed(2)) });
        } catch {}
        console.log('[Cash] auto-refresh updated data:', next);
        handleSave(next);
      }
    };

    loadData().then(autoRefresh);
  }, []);

  const usdToCad = data.fx?.usdToCad || 1;
  const baseCurrency = data.baseCurrency || 'CAD';
  const totalInvestmentsUsd = useMemo(() => {
    return data.investments.holdings.reduce((sum, h) => {
      if (h.type === 'equity') return sum + (h.currentValueUsd || 0);
      if (h.type === 'cash') return sum + (h.amountUsd || 0);
      return sum;
    }, 0);
  }, [data]);
  const totalInvestmentsCad = useMemo(() => totalInvestmentsUsd * usdToCad, [totalInvestmentsUsd, usdToCad]);

  const growthPct = useMemo(() => {
    const start = data.investments.weekStartValueUsd || 0;
    const now = totalInvestmentsUsd;
    if (start <= 0) return 0;
    return ((now - start) / start) * 100;
  }, [data, totalInvestmentsUsd]);

  const [expenseMonth, setExpenseMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  });
  const monthlyIncome = data.expenses.monthlyIncomeUsd || 0;
  const totalExpenses = useMemo(() => {
    return data.expenses.items
      .filter(e => (e.date||'').startsWith(expenseMonth))
      .reduce((sum, e) => sum + (e.amountUsd || 0), 0);
  }, [data, expenseMonth]);

  const lifestylePct = useMemo(() => {
    if (monthlyIncome <= 0) return 0;
    return (totalExpenses / monthlyIncome) * 100;
  }, [monthlyIncome, totalExpenses]);

  // Calculate average daily spend and projection
  const dailySpendStats = useMemo(() => {
    const [year, month] = expenseMonth.split('-').map(Number);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // Only calculate for current or past months
    if (year > currentYear || (year === currentYear && month > currentMonth)) {
      return { avgDailySpend: 0, daysElapsed: 0, daysInMonth: 0, projectedTotal: 0, projectedPct: 0 };
    }
    
    const daysInMonth = new Date(year, month, 0).getDate();
    let daysElapsed = daysInMonth; // Default to full month for past months
    
    // If it's the current month, calculate days elapsed
    if (year === currentYear && month === currentMonth) {
      daysElapsed = now.getDate();
    }
    
    const avgDailySpend = daysElapsed > 0 ? totalExpenses / daysElapsed : 0;
    const projectedTotal = avgDailySpend * daysInMonth;
    const projectedPct = monthlyIncome > 0 ? (projectedTotal / monthlyIncome) * 100 : 0;
    
    return { avgDailySpend, daysElapsed, daysInMonth, projectedTotal, projectedPct };
  }, [expenseMonth, totalExpenses, monthlyIncome]);

  const burnRate = useMemo(() => {
    // Sum current month's cortal items
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const items = data.cortal.items || [];
    const sum = items.filter(i => (i.date||'').startsWith(ym)).reduce((s, i) => s + (i.amountUsd || 0), 0);
    return sum;
  }, [data]);
  const runwayMonths = useMemo(() => {
    const reserves = data.cortal.cashReservesUsd || 0;
    if (burnRate <= 0) return Infinity;
    return reserves / burnRate;
  }, [data, burnRate]);

  // Update net worth goal when investment total changes
  useEffect(() => {
    console.log('Cash useEffect triggered. totalInvestmentsCad:', totalInvestmentsCad);
    console.log('totalInvestmentsCad type:', typeof totalInvestmentsCad);
    console.log('totalInvestmentsCad > 0:', totalInvestmentsCad > 0);

    if (totalInvestmentsCad > 0) {
      try {
        // Round to whole dollars for goal tracking
        const roundedValue = Math.round(totalInvestmentsCad);
        console.log('Attempting to update net worth goal. Original value:', totalInvestmentsCad, 'Rounded value:', roundedValue);

        const updatedGoals = updateNetWorthFromInvestments(roundedValue);
        console.log('Net worth goal updated successfully. Updated goals:', updatedGoals);

        // Find the net worth goal to verify the update
        const netWorthGoal = updatedGoals.goals.find(g => g.id === 'net-worth');
        if (netWorthGoal) {
          console.log('Net worth goal details:', {
            id: netWorthGoal.id,
            currentTotal: netWorthGoal.currentTotal,
            progressPct: netWorthGoal.progressPct,
            monthly: netWorthGoal.monthly
          });
        } else {
          console.error('Net worth goal not found in updated goals!');
        }
      } catch (error) {
        console.error('Failed to update net worth goal:', error);
      }
    } else {
      console.log('totalInvestmentsCad is 0 or negative, skipping update');
    }
  }, [totalInvestmentsCad]);

  const handleSave = async (next: CashConsoleData) => {
    setData(next);
    await saveCashConsoleData(next);
  };

  // Utility function to format currency values based on hideBalances state
  const formatCurrency = (value: number, showPercentage?: boolean, percentageBase?: number): string => {
    if (hideBalances) {
      if (showPercentage && percentageBase && percentageBase > 0) {
        const percentage = (value / percentageBase) * 100;
        return `${percentage.toFixed(1)}%`;
      }
      return '•••••';
    }
    const currency = baseCurrency === 'CAD' ? 'C$' : '$';
    return `${currency}${value.toLocaleString()}`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <TypewriterText text="Cash Console" className="text-xl mb-2" />
            <p className="text-terminal-accent/70 text-sm">Batcomputer sub-panel meets runway dashboard.</p>
          </div>
          <button
            onClick={() => setHideBalances(!hideBalances)}
            className="terminal-button px-3 py-2 flex items-center gap-2"
            title={hideBalances ? 'Show balances' : 'Hide balances'}
          >
            {hideBalances ? <Eye size={16} /> : <EyeOff size={16} />}
            {hideBalances ? 'Show' : 'Hide'} Balance
          </button>
        </div>
      </div>

      {/* Runway Management */}
      <div className="mb-6">
        <RunwayManager totalBalance={totalInvestmentsUsd} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Investments */}
        <div className="border border-terminal-accent/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <LineChart size={16} className="text-[#5FE3B3]" />
            <h3 className="text-terminal-accent">Investments</h3>
          </div>
          <div className="text-2xl font-bold text-[#5FE3B3] mb-1">{formatCurrency(baseCurrency === 'CAD' ? totalInvestmentsCad : totalInvestmentsUsd)}</div>
          <div className="text-xs text-terminal-accent/70 mb-2">Weekly Growth: {growthPct.toFixed(2)}%</div>
          {/* Investments sub-view switcher */}
          <div className="flex items-center gap-2 mb-2 text-xs">
            <button
              className={`terminal-button px-2 py-0.5 ${investmentsView === 'add' ? 'bg-terminal-accent text-black' : ''}`}
              onClick={() => setInvestmentsView('add')}
            >
              Add
            </button>
            <button
              className={`terminal-button px-2 py-0.5 ${investmentsView === 'pie' ? 'bg-terminal-accent text-black' : ''}`}
              onClick={() => setInvestmentsView('pie')}
            >
              Allocation
            </button>
            <button
              className={`terminal-button px-2 py-0.5 ${investmentsView === 'line' ? 'bg-terminal-accent text-black' : ''}`}
              onClick={() => setInvestmentsView('line')}
            >
              Growth
            </button>
          </div>

          {investmentsView === 'add' && (
            <AddHoldingRow
              onAdd={(holding) => {
                const next: CashConsoleData = { ...data, investments: { ...data.investments, holdings: [...data.investments.holdings, holding] } };
                handleSave(next);
              }}
            />
          )}
          {investmentsView === 'pie' && (
            <div className="border border-terminal-accent/20 p-2 mb-2">
              <div className="text-xs text-terminal-accent/70 mb-1">Allocation</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={hideBalances ? data.investments.holdings.map((h, idx) => {
                      const label = h.type === 'equity' ? h.ticker : 'CASH';
                      return { name: label, value: 1 }; // Equal segments when hidden
                    }) : data.investments.holdings.map((h) => {
                      const label = h.type === 'equity' ? h.ticker : 'CASH';
                      const valUsd = h.type === 'equity' ? (h.currentValueUsd || 0) : (h.amountUsd || 0);
                      const val = baseCurrency === 'CAD' ? valUsd * usdToCad : valUsd;
                      return { name: label, value: Number(val.toFixed(2)) };
                    })}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={40}
                    outerRadius={70}
                  >
                    {data.investments.holdings.map((_, idx) => (
                      <Cell key={idx} fill={["#5FE3B3","#53B4FF","#FFD700","#FF6B6B","#9D4EDD"][idx % 5]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => hideBalances ? '•••••' : `${baseCurrency === 'CAD' ? 'C$' : '$'}${Number(v).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          {investmentsView === 'line' && (
            <div className="border border-terminal-accent/20 p-2 mb-2">
              <div className="text-xs text-terminal-accent/70 mb-1">Growth (7d)</div>
              <ResponsiveContainer width="100%" height={200}>
                <ReLineChart data={(() => {
                  const hist = data.investments.history || [];
                  const last = hist.slice(-7);
                  if (hideBalances) {
                    return last.map((d, idx) => ({
                      date: d.date.slice(5),
                      value: 100 + idx * 5 // Fake growth curve when hidden
                    }));
                  }
                  return last.map(d => ({
                    date: d.date.slice(5),
                    value: baseCurrency === 'CAD' ? d.totalUsd * usdToCad : d.totalUsd
                  }));
                })()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" stroke="#8A8D93" />
                  <YAxis stroke="#8A8D93" tickFormatter={(v) => hideBalances ? '•••' : `${baseCurrency === 'CAD' ? 'C$' : '$'}${Math.round((v as number)/1000)}k`} />
                  <Tooltip formatter={(v: any) => hideBalances ? '•••••' : `${baseCurrency === 'CAD' ? 'C$' : '$'}${Number(v).toLocaleString()}`} />
                  <Line type="monotone" dataKey="value" stroke="#5FE3B3" dot={false} strokeWidth={2} />
                </ReLineChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="border border-terminal-accent/20 p-2">
            {data.investments.holdings.length === 0 && (
              <div className="text-xs text-terminal-accent/60">Connect a brokerage API to populate holdings.</div>
            )}
            {data.investments.holdings.map((h, idx) => {
              const line = (() => {
                if (h.type === 'equity') {
                  const price = h.lastPriceUsd || 0;
                  const valueUsd = h.currentValueUsd || (price * h.quantity);
                  const value = baseCurrency === 'CAD' ? valueUsd * usdToCad : valueUsd;
                  const pc = h.prevCloseUsd || 0;
                  const pct = pc > 0 ? ((price - pc) / pc) * 100 : 0;
                  return (
                    <>
                      <span className="text-terminal-accent">{h.ticker} × {h.quantity}</span>
                      <span>
                        {formatCurrency(value, true, totalInvestmentsCad)} 
                        <span className={pct >= 0 ? 'text-[#5FE3B3]' : 'text-[#FF6B6B]'}>
                          ({pct >= 0 ? '+' : ''}{pct.toFixed(2)}%)
                        </span>
                      </span>
                    </>
                  );
                }
                if (h.type === 'cash') {
                  const value = baseCurrency === 'CAD' ? (h.amountUsd || 0) * usdToCad : (h.amountUsd || 0);
                  return (
                    <>
                      <span className="text-terminal-accent">Cash ({h.currency})</span>
                      <span>{formatCurrency(value, true, totalInvestmentsCad)}</span>
                    </>
                  );
                }
                return null;
              })();
              return (
                <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-terminal-accent/10 last:border-b-0 gap-2">
                  <div className="flex-1 flex items-center justify-between gap-2">{line}</div>
                  <button
                    className="px-2 py-0.5 text-[10px] border border-terminal-accent/30 hover:border-terminal-accent/60"
                    onClick={() => {
                      const next = { ...data };
                      next.investments.holdings = next.investments.holdings.filter((_, i) => i !== idx);
                      handleSave(next);
                    }}
                    title="Delete holding"
                  >
                    Delete
                  </button>
                </div>
              );
            })}
            {data.investments.holdings.some(h => h.type === 'equity') && (
              <div className="mt-2 text-right">
                <button
                  className="terminal-button px-2 py-1 text-xs"
                  onClick={async () => {
                    const next = { ...data };
                    console.log('[Cash] manual update start. holdings:', next.investments.holdings);
                    // Refresh FX rate too
                    try {
                      const fx = await fetchUsdToCad();
                      if (fx) {
                        next.fx = { usdToCad: fx, lastFxUpdatedAt: new Date().toISOString().slice(0, 10) };
                        console.log('[Cash] manual FX usdToCad:', fx);
                      }
                    } catch {}
                    for (const h of next.investments.holdings) {
                      if (h.type === 'equity') {
                        const qp = await fetchQuoteAndPrevCloseUSD(h.ticker);
                        if (qp) {
                          console.log('[Cash] manual update quote:', h.ticker, qp);
                          h.lastPriceUsd = qp.price;
                          h.prevCloseUsd = qp.prevClose;
                          h.currentValueUsd = Number((qp.price * h.quantity).toFixed(2));
                        }
                      }
                    }
                    next.investments.lastPricesUpdatedAt = new Date().toISOString().slice(0, 10);
                    console.log('[Cash] manual update updated data:', next);
                    handleSave(next);
                  }}
                >
                  Update Prices
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Expenditure */}
        <div className="border border-terminal-accent/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={16} className="text-[#FF6B6B]" />
            <h3 className="text-terminal-accent">Expenditure (Lifestyle)</h3>
          </div>

          {/* Monthly Income Input */}
          <div className="mb-3 p-3 border border-terminal-accent/20 bg-black/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-terminal-accent text-sm">Monthly Income</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-terminal-accent/70">{baseCurrency}</span>
                <input
                  className="terminal-input px-2 py-1 w-32 text-right"
                  type="number"
                  min="0"
                  step="100"
                  placeholder="0"
                  value={monthlyIncome > 0 ? (baseCurrency === 'CAD' ? (monthlyIncome * usdToCad).toFixed(0) : monthlyIncome.toFixed(0)) : ''}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (Number.isFinite(val) && val >= 0) {
                      const next = { ...data };
                      next.expenses.monthlyIncomeUsd = baseCurrency === 'CAD' ? val / usdToCad : val;
                      handleSave(next);
                    }
                  }}
                />
              </div>
            </div>
            <div className="text-xs text-terminal-accent/70">Target: ≤ {data.expenses.targetPctOfIncome || 40}% of income</div>
          </div>

          {/* Spending Stats */}
          <div className="mb-3 p-3 border border-terminal-accent/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-terminal-accent text-sm">Total Spent This Month</span>
              <span className="text-lg font-bold text-[#FF6B6B]">
                {formatCurrency(baseCurrency === 'CAD' ? totalExpenses * usdToCad : totalExpenses)}
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-terminal-accent/70 text-xs">% of Income</span>
              <span className={`text-sm font-bold ${lifestylePct > (data.expenses.targetPctOfIncome || 40) ? 'text-[#FF6B6B]' : 'text-[#5FE3B3]'}`}>
                {lifestylePct.toFixed(1)}% {lifestylePct > (data.expenses.targetPctOfIncome || 40) ? '⚠️' : '✓'}
              </span>
            </div>
            <Progress 
              value={Math.min(lifestylePct, 100)} 
              className="h-2 mb-2"
            />
            
            {dailySpendStats.daysElapsed > 0 && dailySpendStats.daysElapsed < dailySpendStats.daysInMonth && (
              <div className="mt-3 pt-3 border-t border-terminal-accent/20">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-terminal-accent/70">Avg Daily Spend ({dailySpendStats.daysElapsed}/{dailySpendStats.daysInMonth} days)</span>
                  <span className="font-mono">
                    {formatCurrency(baseCurrency === 'CAD' ? dailySpendStats.avgDailySpend * usdToCad : dailySpendStats.avgDailySpend)}/day
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-terminal-accent/70">Projected End of Month</span>
                  <span className={`font-mono ${dailySpendStats.projectedPct > (data.expenses.targetPctOfIncome || 40) ? 'text-[#FF6B6B]' : 'text-[#5FE3B3]'}`}>
                    {formatCurrency(baseCurrency === 'CAD' ? dailySpendStats.projectedTotal * usdToCad : dailySpendStats.projectedTotal)} ({dailySpendStats.projectedPct.toFixed(1)}%)
                  </span>
                </div>
                {dailySpendStats.projectedPct > (data.expenses.targetPctOfIncome || 40) && monthlyIncome > 0 && (
                  <div className="mt-2 text-xs text-[#FF6B6B] bg-[#FF6B6B]/10 p-2 border border-[#FF6B6B]/30">
                    ⚠️ On track to exceed target. Reduce daily spend to {formatCurrency(baseCurrency === 'CAD' ? ((monthlyIncome * (data.expenses.targetPctOfIncome || 40) / 100) / dailySpendStats.daysInMonth * usdToCad) : ((monthlyIncome * (data.expenses.targetPctOfIncome || 40) / 100) / dailySpendStats.daysInMonth))}/day
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Month selector */}
          <div className="flex items-center justify-between mb-2 text-xs">
            <span className="text-terminal-accent/70">Expense History</span>
            <div className="flex items-center gap-2">
              <span>Month</span>
              <input
                className="terminal-input px-2 py-1"
                type="month"
                value={expenseMonth}
                onChange={(e) => setExpenseMonth(e.target.value)}
              />
            </div>
          </div>
          {/* New expense row */}
          <ExpenseInputRow
            categories={data.expenses.categories || []}
            onAdd={(exp) => {
              const next = { ...data };
              next.expenses.items = [...next.expenses.items, exp];
              handleSave(next);
            }}
            onAddCategory={(name) => {
              const next = { ...data };
              const set = new Set([...(next.expenses.categories || [])]);
              set.add(name);
              next.expenses.categories = Array.from(set);
              handleSave(next);
            }}
            baseCurrency={baseCurrency}
            usdToCad={usdToCad}
          />

          {/* Expenses list */}
          <div className="mt-3 border border-terminal-accent/20 p-2">
            {data.expenses.items.filter(e => (e.date||'').startsWith(expenseMonth)).map((e) => (
              <div key={e.id} className="flex items-center justify-between text-xs py-1 border-b border-terminal-accent/10 last:border-b-0 gap-2">
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-terminal-accent">{e.item || 'Item'}</span>
                  <span className="opacity-70">• {e.category}</span>
                  {e.date && <span className="opacity-50">• {e.date}</span>}
                </div>
                <div>
                  {formatCurrency(baseCurrency === 'CAD' ? e.amountUsd * usdToCad : e.amountUsd)}
                </div>
                <button
                  className="px-2 py-0.5 text-[10px] border border-terminal-accent/30 hover:border-terminal-accent/60"
                  onClick={() => {
                    const next = { ...data };
                    next.expenses.items = next.expenses.items.filter((x) => x.id !== e.id);
                    handleSave(next);
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Burn Rate */}
        {preferences?.cash_layout.show_burn_rate && (
          <div className="border border-terminal-accent/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Flame size={16} className="text-[#FFD700]" />
              <h3 className="text-terminal-accent">Burn Rate (Cortal)</h3>
            </div>
          <BurnInputRow
            categories={data.cortal.categories || []}
            baseCurrency={baseCurrency}
            usdToCad={usdToCad}
            onAdd={(row) => {
              const next = { ...data };
              next.cortal.items = [...(next.cortal.items || []), row];
              handleSave(next);
            }}
            onAddCategory={(name) => {
              const next = { ...data };
              const set = new Set([...(next.cortal.categories || [])]);
              set.add(name);
              next.cortal.categories = Array.from(set);
              handleSave(next);
            }}
          />
          <div className="flex items-center justify-between mb-2 mt-2">
            <span>Monthly Burn</span>
            <span className="text-xl font-bold text-[#FFD700]">{formatCurrency(baseCurrency === 'CAD' ? burnRate*usdToCad : burnRate)}</span>
          </div>
          <div className="border border-terminal-accent/20 p-2 text-xs">
            {(data.cortal.items || []).map((i, idx) => (
              <div key={i.id} className="flex items-center justify-between py-1 border-b border-terminal-accent/10 last:border-b-0">
                <span className="text-terminal-accent">{i.category} • {i.date}</span>
                <span>{formatCurrency(baseCurrency==='CAD'? i.amountUsd*usdToCad : i.amountUsd)}</span>
              </div>
            ))}
          </div>
          </div>
        )}

        {/* Runway */}
        {preferences?.cash_layout.show_runway && (
          <div className="border border-terminal-accent/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarClock size={16} className="text-[#53B4FF]" />
              <h3 className="text-terminal-accent">Runway</h3>
            </div>
          <div className="flex items-center justify-between">
            <div className="text-terminal-accent">Cash Reserves</div>
            <div>{formatCurrency(data.cortal.cashReservesUsd || 0)}</div>
          </div>
          <div className="flex items-center justify-between mt-1">
            <div className="text-terminal-accent">Runway</div>
            <div className="text-2xl font-bold text-[#53B4FF]">{Number.isFinite(runwayMonths) ? runwayMonths.toFixed(1) : '∞'} months</div>
          </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cash;

// Inline component for adding holdings
const AddHoldingRow: React.FC<{ onAdd: (h: CashHolding) => void }> = ({ onAdd }) => {
  const [type, setType] = useState<'equity' | 'cash'>('equity');
  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState<string>('');
  const [cashAmount, setCashAmount] = useState<string>('');

  const reset = () => {
    setTicker('');
    setQuantity('');
    setCashAmount('');
  };

  const handleAdd = () => {
    if (type === 'equity') {
      const t = ticker.trim().toUpperCase();
      const q = Number(quantity);
      if (!t || !Number.isFinite(q) || q <= 0) return;
      onAdd({ type: 'equity', ticker: t, quantity: q });
      reset();
      return;
    }
    const amt = Number(cashAmount);
    if (!Number.isFinite(amt) || amt < 0) return;
    onAdd({ type: 'cash', currency: 'USD', amountUsd: amt });
    reset();
  };

  return (
    <div className="border border-terminal-accent/20 p-2 mb-2">
      <div className="flex flex-col sm:flex-row items-center gap-2 text-xs">
        <select
          className="terminal-input px-2 py-1"
          value={type}
          onChange={(e) => setType(e.target.value as 'equity' | 'cash')}
        >
          <option value="equity">Equity</option>
          <option value="cash">Cash</option>
        </select>
        {type === 'equity' ? (
          <>
            <input
              className="terminal-input px-2 py-1 uppercase"
              placeholder="Ticker (AAPL)"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
            />
            <input
              className="terminal-input px-2 py-1"
              type="number"
              min="0"
              step="1"
              placeholder="# Shares"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </>
        ) : (
          <>
            <input
              className="terminal-input px-2 py-1"
              type="number"
              min="0"
              step="0.01"
              placeholder="Cash (USD)"
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
            />
          </>
        )}
        <button className="terminal-button px-3 py-1" onClick={handleAdd}>Add</button>
      </div>
    </div>
  );
};

// Expense input row component
const ExpenseInputRow: React.FC<{
  categories: string[];
  onAdd: (e: { id: string; item?: string; category: string; date?: string; amountUsd: number }) => void;
  onAddCategory: (name: string) => void;
  baseCurrency: 'USD' | 'CAD';
  usdToCad: number;
}> = ({ categories, onAdd, onAddCategory, baseCurrency, usdToCad }) => {
  const [item, setItem] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState<string>('');
  const [amount, setAmount] = useState<string>('');

  const submit = () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 0) return;
    const cat = category.trim();
    if (!cat) return;
    if (!categories.includes(cat)) onAddCategory(cat);
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const amountUsd = baseCurrency === 'CAD' ? amt / (usdToCad || 1) : amt;
    onAdd({ id, item: item.trim() || undefined, category: cat, date: date || undefined, amountUsd: Number(amountUsd.toFixed(2)) });
    setItem('');
    setCategory('');
    setDate('');
    setAmount('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="border border-terminal-accent/20 p-2">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs items-center">
        <input
          className="terminal-input px-2 py-1"
          placeholder="Item"
          value={item}
          onChange={(e) => setItem(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <div className="flex items-center gap-2">
          <input
            className="terminal-input px-2 py-1"
            list="expense-categories"
            placeholder="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <datalist id="expense-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <input
          className="terminal-input px-2 py-1"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <input
          className="terminal-input px-2 py-1"
          type="number"
          min="0"
          step="0.01"
          placeholder={baseCurrency === 'CAD' ? 'Amount (CAD)' : 'Amount (USD)'}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button className="terminal-button px-2 py-0.5 text-[10px]" onClick={submit}>Add</button>
      </div>
    </div>
  );
};

// Burn input row component
const BurnInputRow: React.FC<{
  categories: string[];
  baseCurrency: 'USD' | 'CAD';
  usdToCad: number;
  onAdd: (row: { id: string; category: string; date: string; amountUsd: number }) => void;
  onAddCategory: (name: string) => void;
}> = ({ categories, baseCurrency, usdToCad, onAdd, onAddCategory }) => {
  const [category, setCategory] = useState('dev');
  const [date, setDate] = useState<string>('');
  const [amount, setAmount] = useState<string>('');

  const submit = () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 0) return;
    const cat = category.trim();
    if (!cat) return;
    if (!categories.includes(cat)) onAddCategory(cat);
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const amountUsd = baseCurrency === 'CAD' ? amt / (usdToCad || 1) : amt;
    onAdd({ id, category: cat, date: date || new Date().toISOString().slice(0,10), amountUsd: Number(amountUsd.toFixed(2)) });
    setAmount('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="border border-terminal-accent/20 p-2">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs items-center">
        <input
          className="terminal-input px-2 py-1"
          list="burn-categories"
          placeholder="Category (dev, designContent)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <datalist id="burn-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <input
          className="terminal-input px-2 py-1"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <input
          className="terminal-input px-2 py-1"
          type="number"
          min="0"
          step="0.01"
          placeholder={baseCurrency === 'CAD' ? 'Amount (CAD)' : 'Amount (USD)'}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button className="terminal-button px-2 py-0.5 text-[10px]" onClick={submit}>Add</button>
      </div>
    </div>
  );
};


