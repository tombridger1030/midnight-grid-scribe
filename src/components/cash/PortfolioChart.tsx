/**
 * PortfolioChart Component
 * 
 * Premium performance chart with cyberpunk aesthetics.
 * Features gradient area fills, glow effects, and performance stats.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Loader2, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  getPortfolioHistoryForRange,
  getSP500History,
  type HistoryPoint,
} from '@/lib/investmentQuotes';

interface PortfolioChartProps {
  currentTotal: number;
  hideBalances: boolean;
}

type TimeRange = '1W' | '1M' | '3M' | '1Y' | 'ALL';

interface ChartDataPoint {
  date: string;
  rawDate: string;
  portfolio: number;
  benchmark?: number;
}

export const PortfolioChart: React.FC<PortfolioChartProps> = ({
  currentTotal,
  hideBalances,
}) => {
  const [range, setRange] = useState<TimeRange>('3M');
  const [portfolioHistory, setPortfolioHistory] = useState<HistoryPoint[]>([]);
  const [benchmarkHistory, setBenchmarkHistory] = useState<HistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showBenchmark, setShowBenchmark] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Load data when range changes
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const portfolio = getPortfolioHistoryForRange(range);
        setPortfolioHistory(portfolio);

        if (showBenchmark) {
          const benchmark = await getSP500History(range);
          setBenchmarkHistory(benchmark);
        }
      } catch (e) {
        console.error('Failed to load chart data:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [range, showBenchmark]);

  // Process chart data
  const chartData = useMemo((): ChartDataPoint[] => {
    const today = new Date().toISOString().split('T')[0];
    
    if (portfolioHistory.length === 0) {
      const daysAgo: Record<TimeRange, number> = {
        '1W': 7, '1M': 30, '3M': 90, '1Y': 365, 'ALL': 365,
      };
      
      // If we have benchmark, show it with flat portfolio line
      if (benchmarkHistory.length > 0 && showBenchmark) {
        const benchmarkStart = benchmarkHistory[0]?.value || 1;
        const scaleFactor = currentTotal / benchmarkStart;
        
        return benchmarkHistory.map(b => ({
          date: formatDate(b.date),
          rawDate: b.date,
          portfolio: currentTotal,
          benchmark: Math.round(b.value * scaleFactor),
        }));
      }
      
      // Generate synthetic data points for visual appeal
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo[range]);
      const points: ChartDataPoint[] = [];
      const numPoints = Math.min(daysAgo[range], 30);
      
      for (let i = 0; i <= numPoints; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + (i * daysAgo[range] / numPoints));
        points.push({
          date: formatDate(d.toISOString().split('T')[0]),
          rawDate: d.toISOString().split('T')[0],
          portfolio: currentTotal,
        });
      }
      
      return points;
    }

    const dateMap = new Map<string, { portfolio?: number; benchmark?: number }>();

    portfolioHistory.forEach(p => {
      dateMap.set(p.date, { portfolio: p.value });
    });

    const existingToday = dateMap.get(today);
    dateMap.set(today, { ...existingToday, portfolio: currentTotal });

    if (benchmarkHistory.length > 0 && showBenchmark) {
      const portfolioStart = portfolioHistory[0]?.value || currentTotal;
      const benchmarkStart = benchmarkHistory[0]?.value || 1;
      const scaleFactor = portfolioStart / benchmarkStart;

      benchmarkHistory.forEach(b => {
        const existing = dateMap.get(b.date) || {};
        dateMap.set(b.date, {
          ...existing,
          benchmark: Math.round(b.value * scaleFactor),
        });
      });
    }

    return Array.from(dateMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, values]) => ({
        date: formatDate(date),
        rawDate: date,
        portfolio: values.portfolio || 0,
        benchmark: values.benchmark,
      }));
  }, [portfolioHistory, benchmarkHistory, currentTotal, range, showBenchmark]);

  // Calculate performance stats
  const stats = useMemo(() => {
    if (chartData.length < 2) {
      return { change: 0, changePercent: 0, isPositive: true };
    }
    
    const startValue = chartData[0].portfolio;
    const endValue = chartData[chartData.length - 1].portfolio;
    const change = endValue - startValue;
    const changePercent = startValue > 0 ? (change / startValue) * 100 : 0;
    
    return {
      change,
      changePercent,
      isPositive: change >= 0,
      startValue,
      endValue,
    };
  }, [chartData]);

  // Calculate SVG path and area
  const svgData = useMemo(() => {
    if (chartData.length === 0) return { path: '', areaPath: '', benchmarkPath: '' };
    
    const width = 600;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 30, left: 20 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    const values = chartData.map(d => d.portfolio);
    const benchmarkValues = chartData.map(d => d.benchmark).filter(Boolean) as number[];
    const allValues = [...values, ...benchmarkValues];
    
    const minValue = Math.min(...allValues) * 0.98;
    const maxValue = Math.max(...allValues) * 1.02;
    const valueRange = maxValue - minValue || 1;
    
    const xScale = (i: number) => padding.left + (i / (chartData.length - 1)) * chartWidth;
    const yScale = (v: number) => padding.top + chartHeight - ((v - minValue) / valueRange) * chartHeight;
    
    // Portfolio line path
    const linePath = chartData.map((d, i) => {
      const x = xScale(i);
      const y = yScale(d.portfolio);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
    
    // Portfolio area path
    const areaPath = linePath + 
      ` L ${xScale(chartData.length - 1)} ${height - padding.bottom}` +
      ` L ${padding.left} ${height - padding.bottom} Z`;
    
    // Benchmark line path
    let benchmarkPath = '';
    if (showBenchmark && benchmarkValues.length > 0) {
      benchmarkPath = chartData.map((d, i) => {
        if (d.benchmark === undefined) return '';
        const x = xScale(i);
        const y = yScale(d.benchmark);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ');
    }
    
    // Generate data points for hover
    const points = chartData.map((d, i) => ({
      x: xScale(i),
      y: yScale(d.portfolio),
      benchmarkY: d.benchmark ? yScale(d.benchmark) : null,
      data: d,
      index: i,
    }));
    
    return { 
      path: linePath, 
      areaPath, 
      benchmarkPath, 
      points,
      width,
      height,
      padding,
      yScale,
      minValue,
      maxValue,
    };
  }, [chartData, showBenchmark]);

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
  }

  function formatValue(value: number): string {
    if (hideBalances) return '***';
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  }

  const hasPortfolioHistory = portfolioHistory.length > 1;

  return (
    <div className="p-6 rounded-lg bg-surface-secondary border border-line">
      {/* Header with Stats */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-sm font-medium text-terminal-accent/60 uppercase tracking-wider mb-2">
            Performance
          </h3>
          
          {/* Performance Stats */}
          <div className="flex items-baseline gap-4">
            <motion.div 
              className={cn(
                "flex items-center gap-2 text-2xl font-bold font-mono",
                stats.isPositive ? "text-[#00FF88]" : "text-[#FF3366]"
              )}
              style={{
                textShadow: stats.isPositive 
                  ? '0 0 20px rgba(0, 255, 136, 0.5)' 
                  : '0 0 20px rgba(255, 51, 102, 0.5)',
              }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {stats.isPositive ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
              {hideBalances ? '***' : (
                <>
                  {stats.isPositive ? '+' : ''}{stats.changePercent.toFixed(2)}%
                </>
              )}
            </motion.div>
            
            {!hideBalances && stats.change !== 0 && (
              <span className={cn(
                "text-sm font-mono",
                stats.isPositive ? "text-[#00FF88]/70" : "text-[#FF3366]/70"
              )}>
                ({stats.isPositive ? '+' : ''}{formatValue(stats.change)})
              </span>
            )}
          </div>
          
          {!hasPortfolioHistory && (
            <p className="text-xs text-terminal-accent/40 mt-2 flex items-center gap-1">
              <Activity size={12} />
              History builds over time
            </p>
          )}
        </div>
        
        {/* Time Range Toggles */}
        <div className="flex gap-1 bg-surface-tertiary rounded-lg p-1">
          {(['1W', '1M', '3M', '1Y', 'ALL'] as TimeRange[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200",
                range === r
                  ? "bg-terminal-accent text-black shadow-[0_0_10px_rgba(0,240,255,0.3)]"
                  : "text-terminal-accent/60 hover:text-terminal-accent hover:bg-terminal-accent/10"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-[220px]">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="text-terminal-accent animate-spin" size={32} />
          </div>
        ) : (
          <svg 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${svgData.width} ${svgData.height}`}
            preserveAspectRatio="none"
            className="overflow-visible"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <defs>
              {/* Gradient for area fill */}
              <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={stats.isPositive ? "#00F0FF" : "#FF3366"} stopOpacity="0.3" />
                <stop offset="50%" stopColor={stats.isPositive ? "#00FF88" : "#FF3366"} stopOpacity="0.1" />
                <stop offset="100%" stopColor={stats.isPositive ? "#00FF88" : "#FF3366"} stopOpacity="0" />
              </linearGradient>
              
              {/* Gradient for line */}
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00F0FF" />
                <stop offset="100%" stopColor={stats.isPositive ? "#00FF88" : "#FF3366"} />
              </linearGradient>
              
              {/* Glow filter */}
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Grid lines */}
            {[0.25, 0.5, 0.75].map((ratio) => (
              <line
                key={`grid-${ratio}`}
                x1={svgData.padding?.left || 20}
                y1={(svgData.padding?.top || 20) + ratio * (svgData.height - (svgData.padding?.top || 20) - (svgData.padding?.bottom || 30))}
                x2={svgData.width - (svgData.padding?.right || 20)}
                y2={(svgData.padding?.top || 20) + ratio * (svgData.height - (svgData.padding?.top || 20) - (svgData.padding?.bottom || 30))}
                stroke="rgba(0, 240, 255, 0.07)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            ))}
            
            {/* Area fill */}
            <motion.path
              d={svgData.areaPath}
              fill="url(#areaGradient)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            />
            
            {/* Benchmark line (dashed) */}
            {showBenchmark && svgData.benchmarkPath && (
              <motion.path
                d={svgData.benchmarkPath}
                fill="none"
                stroke="rgba(100, 116, 139, 0.5)"
                strokeWidth="2"
                strokeDasharray="6 4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1 }}
              />
            )}
            
            {/* Main line */}
            <motion.path
              d={svgData.path}
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
            
            {/* Interactive hover areas */}
            {svgData.points?.map((point, i) => (
              <g key={i}>
                {/* Invisible hover area */}
                <rect
                  x={point.x - 15}
                  y={0}
                  width={30}
                  height={svgData.height}
                  fill="transparent"
                  onMouseEnter={() => setHoveredIndex(i)}
                />
                
                {/* Hover indicator */}
                {hoveredIndex === i && (
                  <>
                    {/* Vertical line */}
                    <line
                      x1={point.x}
                      y1={svgData.padding?.top || 20}
                      x2={point.x}
                      y2={svgData.height - (svgData.padding?.bottom || 30)}
                      stroke="rgba(0, 240, 255, 0.3)"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    
                    {/* Data point */}
                    <motion.circle
                      cx={point.x}
                      cy={point.y}
                      r={6}
                      fill={stats.isPositive ? "#00FF88" : "#FF3366"}
                      stroke="#000"
                      strokeWidth="2"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      style={{ filter: 'url(#glow)' }}
                    />
                    
                    {/* Benchmark point */}
                    {point.benchmarkY && (
                      <circle
                        cx={point.x}
                        cy={point.benchmarkY}
                        r={4}
                        fill="#64748B"
                        stroke="#000"
                        strokeWidth="2"
                      />
                    )}
                  </>
                )}
              </g>
            ))}
            
            {/* X-axis labels */}
            {chartData.length > 0 && [...new Set([0, Math.floor(chartData.length / 2), chartData.length - 1])].map((i) => {
              if (!svgData.points?.[i]) return null;
              return (
                <text
                  key={`x-label-${i}`}
                  x={svgData.points[i].x}
                  y={svgData.height - 8}
                  textAnchor="middle"
                  fill="rgba(0, 240, 255, 0.4)"
                  fontSize="11"
                  fontFamily="monospace"
                >
                  {chartData[i]?.date}
                </text>
              );
            })}
          </svg>
        )}
        
        {/* Hover tooltip */}
        {hoveredIndex !== null && svgData.points?.[hoveredIndex] && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 bg-surface-primary border border-terminal-accent/30 
                       rounded-lg px-4 py-2 shadow-lg pointer-events-none"
            style={{ 
              boxShadow: '0 0 20px rgba(0, 240, 255, 0.2)',
            }}
          >
            <div className="text-xs text-terminal-accent/60 mb-1">
              {chartData[hoveredIndex]?.date}
            </div>
            <div className="flex items-center gap-4">
              <div>
                <div className="text-xs text-terminal-accent/40">Portfolio</div>
                <div className="text-lg font-bold font-mono text-terminal-accent">
                  {formatValue(chartData[hoveredIndex]?.portfolio || 0)}
                </div>
              </div>
              {chartData[hoveredIndex]?.benchmark && showBenchmark && (
                <div>
                  <div className="text-xs text-terminal-accent/40">S&P 500</div>
                  <div className="text-lg font-mono text-slate-400">
                    {formatValue(chartData[hoveredIndex]?.benchmark || 0)}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Footer with benchmark toggle */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 rounded bg-gradient-to-r from-[#00F0FF] to-[#00FF88]" />
            <span className="text-terminal-accent/60">Portfolio</span>
          </div>
          {showBenchmark && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 rounded bg-slate-500 border-dashed" style={{ borderTop: '2px dashed #64748B', height: 0 }} />
              <span className="text-terminal-accent/40">S&P 500</span>
            </div>
          )}
        </div>
        
        <label className="flex items-center gap-2 text-sm text-terminal-accent/60 cursor-pointer hover:text-terminal-accent/80 transition-colors">
          <input
            type="checkbox"
            checked={showBenchmark}
            onChange={(e) => setShowBenchmark(e.target.checked)}
            className="w-4 h-4 rounded border-terminal-accent/30 bg-surface-tertiary 
                       text-terminal-accent focus:ring-terminal-accent/50 accent-[#00F0FF]"
          />
          Compare to S&P 500
        </label>
      </div>
    </div>
  );
};

export default PortfolioChart;
