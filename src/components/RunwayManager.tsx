import React, { useState, useEffect } from 'react';
import { TrendingDown, Edit2, Check, X, AlertTriangle, Calendar, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  updateRunwayData,
  loadNoctisiumData,
  RunwayData
} from '@/lib/storage';

interface RunwayManagerProps {
  className?: string;
  totalBalance?: number;
  onRunwayUpdate?: (runway: RunwayData) => void;
}

export const RunwayManager: React.FC<RunwayManagerProps> = ({
  className,
  totalBalance: propTotalBalance,
  onRunwayUpdate
}) => {
  const [runwayData, setRunwayData] = useState<RunwayData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editBalance, setEditBalance] = useState('');
  const [editBurn, setEditBurn] = useState('');

  useEffect(() => {
    const loadRunway = () => {
      const data = loadNoctisiumData();
      const latestRunway = data.runwayData.sort(
        (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      )[0];

      setRunwayData(latestRunway || null);

      // If we have a totalBalance prop but no runway data, auto-populate
      if (!latestRunway && propTotalBalance) {
        setEditBalance(propTotalBalance.toString());
        setIsEditing(true);
      }
    };

    loadRunway();
  }, [propTotalBalance]);

  const handleStartEdit = () => {
    setEditBalance(runwayData?.totalBalance.toString() || propTotalBalance?.toString() || '');
    setEditBurn(runwayData?.monthlyBurn.toString() || '');
    setIsEditing(true);
  };

  const handleSave = () => {
    const balance = parseFloat(editBalance) || 0;
    const burn = parseFloat(editBurn) || 0;

    if (balance <= 0 || burn <= 0) {
      alert('Please enter valid positive numbers for both balance and monthly burn');
      return;
    }

    const runway = updateRunwayData(balance, burn);
    setRunwayData(runway);
    setIsEditing(false);
    setEditBalance('');
    setEditBurn('');

    if (onRunwayUpdate) {
      onRunwayUpdate(runway);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditBalance('');
    setEditBurn('');
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getRunwayColor = (months: number): string => {
    if (months >= 18) return 'text-[#5FE3B3]';
    if (months >= 12) return 'text-[#FFD700]';
    return 'text-[#FF6B6B]';
  };

  const getRunwayStatus = (months: number): string => {
    if (months >= 18) return 'Healthy';
    if (months >= 12) return 'Moderate';
    if (months >= 6) return 'Low';
    return 'Critical';
  };

  const getRunwayAdvice = (months: number): string[] => {
    if (months >= 18) return ['Continue current trajectory', 'Consider growth investments'];
    if (months >= 12) return ['Monitor spending closely', 'Plan for revenue growth'];
    if (months >= 6) return ['Reduce non-essential expenses', 'Accelerate revenue efforts'];
    return ['Emergency cost cutting required', 'Immediate revenue action needed'];
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingDown size={20} className="text-[#5FE3B3]" />
          <h3 className="text-lg text-terminal-accent font-medium">Runway Analysis</h3>
        </div>
        {!isEditing && (
          <button
            onClick={handleStartEdit}
            className="p-1 hover:bg-[#333] transition-colors rounded"
            title="Update runway data"
          >
            <Edit2 size={16} className="text-terminal-accent/70" />
          </button>
        )}
      </div>

      <div className="border border-terminal-accent/30 p-4 bg-terminal-bg/20 rounded">
        {isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-terminal-accent/70">
                  Total Balance ($)
                </label>
                <input
                  type="number"
                  value={editBalance}
                  onChange={(e) => setEditBalance(e.target.value)}
                  placeholder="e.g., 50000"
                  className="w-full bg-transparent border border-terminal-accent/30 text-terminal-accent px-3 py-2 focus:outline-none focus:border-[#5FE3B3] rounded"
                  min="0"
                  step="100"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-terminal-accent/70">
                  Monthly Burn Rate ($)
                </label>
                <input
                  type="number"
                  value={editBurn}
                  onChange={(e) => setEditBurn(e.target.value)}
                  placeholder="e.g., 3500"
                  className="w-full bg-transparent border border-terminal-accent/30 text-terminal-accent px-3 py-2 focus:outline-none focus:border-[#5FE3B3] rounded"
                  min="0"
                  step="100"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-terminal-accent/50">
                {editBalance && editBurn && parseFloat(editBurn) > 0 && (
                  <span>
                    Runway: ~{Math.floor(parseFloat(editBalance) / parseFloat(editBurn))} months
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 text-sm text-terminal-accent/70 hover:text-terminal-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!editBalance || !editBurn}
                  className="px-3 py-1 text-sm bg-[#5FE3B3] text-black hover:bg-[#5FE3B3]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded"
                >
                  Update Runway
                </button>
              </div>
            </div>
          </div>
        ) : runwayData ? (
          <div className="space-y-4">
            {/* Runway Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-terminal-accent">
                  {formatCurrency(runwayData.totalBalance)}
                </div>
                <div className="text-xs text-terminal-accent/70">Total Balance</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-terminal-accent">
                  {formatCurrency(runwayData.monthlyBurn)}/mo
                </div>
                <div className="text-xs text-terminal-accent/70">Monthly Burn</div>
              </div>

              <div className="text-center">
                <div className={cn("text-3xl font-bold", getRunwayColor(runwayData.monthsRemaining))}>
                  {runwayData.monthsRemaining}
                </div>
                <div className="text-xs text-terminal-accent/70">Months Remaining</div>
              </div>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center justify-center gap-2 py-2">
              {runwayData.monthsRemaining < 12 && (
                <AlertTriangle size={16} className="text-[#FF6B6B]" />
              )}
              <span className={cn("font-medium", getRunwayColor(runwayData.monthsRemaining))}>
                Status: {getRunwayStatus(runwayData.monthsRemaining)}
              </span>
            </div>

            {/* Advice */}
            <div className="space-y-2">
              <div className="text-sm text-terminal-accent/70 font-medium">
                Recommendations:
              </div>
              <div className="space-y-1">
                {getRunwayAdvice(runwayData.monthsRemaining).map((advice, index) => (
                  <div key={index} className="text-sm text-terminal-accent flex items-center gap-2">
                    <span className="text-[#5FE3B3]">•</span>
                    {advice}
                  </div>
                ))}
              </div>
            </div>

            {/* Suggested Actions for Low Runway */}
            {runwayData.monthsRemaining < 12 && (runwayData.suggestedCuts || runwayData.suggestedIncomeTargets) && (
              <div className="mt-4 p-3 border border-[#FF6B6B]/30 bg-[#FF6B6B]/10 rounded">
                <div className="text-sm font-medium text-[#FF6B6B] mb-2">
                  Immediate Actions Required
                </div>
                <div className="space-y-2">
                  {runwayData.suggestedCuts && runwayData.suggestedCuts.length > 0 && (
                    <div>
                      <div className="text-xs text-terminal-accent/70 font-medium mb-1">
                        Consider cutting:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {runwayData.suggestedCuts.map((cut, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs bg-[#FF6B6B]/20 text-terminal-accent rounded"
                          >
                            {cut}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {runwayData.suggestedIncomeTargets && runwayData.suggestedIncomeTargets.length > 0 && (
                    <div>
                      <div className="text-xs text-terminal-accent/70 font-medium mb-1">
                        Income opportunities:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {runwayData.suggestedIncomeTargets.map((target, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs bg-[#5FE3B3]/20 text-terminal-accent rounded"
                          >
                            {target}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Last Updated */}
            <div className="text-xs text-terminal-accent/50 text-center flex items-center justify-center gap-1">
              <Calendar size={12} />
              Updated: {new Date(runwayData.lastUpdated).toLocaleDateString()}
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <DollarSign size={32} className="mx-auto mb-2 text-terminal-accent/50" />
            <p className="text-terminal-accent/70 mb-2">No runway data</p>
            <p className="text-sm text-terminal-accent/50">
              Set your balance and monthly burn to track runway
            </p>
          </div>
        )}
      </div>
    </div>
  );
};