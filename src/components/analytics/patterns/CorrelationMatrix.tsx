/**
 * CorrelationMatrix Component
 * 
 * Shows correlations between KPIs as a color-coded matrix.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { CorrelationResult } from '@/lib/analyticsCalculations';

interface CorrelationMatrixProps {
  correlations: CorrelationResult[];
  kpiNames: Record<string, string>;
}

export const CorrelationMatrix: React.FC<CorrelationMatrixProps> = ({
  correlations,
  kpiNames,
}) => {
  // Get unique KPI IDs from correlations
  const kpiIds = useMemo(() => {
    const ids = new Set<string>();
    correlations.forEach(c => {
      ids.add(c.kpiA);
      ids.add(c.kpiB);
    });
    return Array.from(ids);
  }, [correlations]);

  // Build correlation lookup map
  const correlationMap = useMemo(() => {
    const map = new Map<string, number>();
    correlations.forEach(c => {
      map.set(`${c.kpiA}-${c.kpiB}`, c.coefficient);
      map.set(`${c.kpiB}-${c.kpiA}`, c.coefficient);
    });
    return map;
  }, [correlations]);

  const getCorrelation = (a: string, b: string): number | null => {
    if (a === b) return 1;
    return correlationMap.get(`${a}-${b}`) ?? null;
  };

  const getCorrelationColor = (coef: number | null): string => {
    if (coef === null) return 'transparent';
    if (coef >= 0.7) return '#00FF88';
    if (coef >= 0.4) return '#00F0FF';
    if (coef >= 0.2) return '#00F0FF80';
    if (coef <= -0.7) return '#FF3366';
    if (coef <= -0.4) return '#FF336680';
    if (coef <= -0.2) return '#FF336640';
    return '#1F1F1F';
  };

  // Find top correlations for insights
  const topCorrelations = useMemo(() => {
    return [...correlations]
      .filter(c => c.strength === 'strong' || c.strength === 'moderate')
      .sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient))
      .slice(0, 5);
  }, [correlations]);

  if (kpiIds.length < 2) {
    return (
      <div className="rounded-xl bg-surface-secondary border border-line p-8 text-center">
        <div className="text-terminal-accent/60">
          Need at least 2 KPIs with data to show correlations
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-surface-secondary border border-line p-6">
      <h3 className="text-sm font-semibold text-terminal-accent mb-4 uppercase tracking-wider">
        KPI Correlations
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Matrix Grid */}
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Header row */}
            <div className="flex">
              <div className="w-24 shrink-0" />
              {kpiIds.map(id => (
                <div
                  key={id}
                  className="w-12 h-24 flex items-end justify-center pb-2"
                >
                  <span
                    className="text-xs text-terminal-accent/60 transform -rotate-45 origin-bottom-left whitespace-nowrap truncate max-w-[80px]"
                    title={kpiNames[id] || id}
                  >
                    {(kpiNames[id] || id).slice(0, 8)}
                  </span>
                </div>
              ))}
            </div>

            {/* Data rows */}
            {kpiIds.map((rowId, rowIndex) => (
              <div key={rowId} className="flex">
                <div className="w-24 shrink-0 flex items-center text-xs text-terminal-accent/60 truncate pr-2">
                  {(kpiNames[rowId] || rowId).slice(0, 12)}
                </div>
                {kpiIds.map((colId, colIndex) => {
                  const coef = getCorrelation(rowId, colId);
                  const color = getCorrelationColor(coef);
                  
                  return (
                    <motion.div
                      key={colId}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: (rowIndex + colIndex) * 0.02 }}
                      className="w-12 h-12 flex items-center justify-center border border-line/50 text-xs font-mono cursor-default"
                      style={{ backgroundColor: color }}
                      title={coef !== null ? `${kpiNames[rowId] || rowId} ↔ ${kpiNames[colId] || colId}: ${coef.toFixed(2)}` : ''}
                    >
                      {coef !== null && rowId !== colId && (
                        <span className={coef > 0.3 || coef < -0.3 ? 'text-black' : 'text-terminal-accent/60'}>
                          {coef.toFixed(1)}
                        </span>
                      )}
                      {rowId === colId && (
                        <span className="text-terminal-accent/30">-</span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Top Correlations List */}
        <div>
          <h4 className="text-xs text-terminal-accent/60 uppercase tracking-wider mb-3">
            Strongest Connections
          </h4>
          {topCorrelations.length > 0 ? (
            <div className="space-y-2">
              {topCorrelations.map((corr, index) => (
                <motion.div
                  key={`${corr.kpiA}-${corr.kpiB}`}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-surface-primary/50 border border-line"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-terminal-accent">
                      {kpiNames[corr.kpiA] || corr.kpiA}
                    </span>
                    <span className="text-terminal-accent/40">↔</span>
                    <span className="text-terminal-accent">
                      {kpiNames[corr.kpiB] || corr.kpiB}
                    </span>
                  </div>
                  <span
                    className="font-mono font-semibold text-sm"
                    style={{
                      color: corr.coefficient > 0 ? '#00FF88' : '#FF3366',
                    }}
                  >
                    {corr.coefficient > 0 ? '+' : ''}
                    {(corr.coefficient * 100).toFixed(0)}%
                  </span>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-terminal-accent/40 p-4 text-center">
              No strong correlations found yet.
              <br />
              More data will reveal patterns.
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-line">
            <div className="text-xs text-terminal-accent/40 mb-2">Legend</div>
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-[#00FF88]" />
                <span className="text-terminal-accent/60">Strong +</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-[#00F0FF]" />
                <span className="text-terminal-accent/60">Moderate +</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-[#FF336680]" />
                <span className="text-terminal-accent/60">Negative</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CorrelationMatrix;
