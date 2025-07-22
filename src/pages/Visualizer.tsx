import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, Cell
} from 'recharts';
import TypewriterText from '@/components/TypewriterText';
import {
  WEEKLY_KPI_DEFINITIONS,
  loadWeeklyKPIs,
  loadWeeklyKPIsWithSync,
  getWeekKey,
  formatWeekKey,
  calculateKPIProgress,
  WeeklyKPIData
} from '@/lib/weeklyKpi';

// Period types for the selector
type PeriodType = 'month' | 'quarter' | 'year';

// Define chart data shape for weekly KPIs
type WeeklyChartData = { 
  week: string; 
  weekFormatted: string;
  [kpiId: string]: string | number; 
};

const Visualizer = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('month');
  const [selectedKPIId, setSelectedKPIId] = useState<string | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyKPIData>({ records: [] });
  const [isLoading, setIsLoading] = useState(true);

  // Load weekly KPI data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const data = await loadWeeklyKPIsWithSync();
        setWeeklyData(data);
      } catch (error) {
        console.error('Failed to load weekly KPI data:', error);
        setWeeklyData(loadWeeklyKPIs());
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Get week range based on selected period
  const getWeekRange = (period: PeriodType): string[] => {
    const currentDate = new Date();
    const weeks: string[] = [];
    
    let weeksToShow = 0;
    switch (period) {
      case 'month':
        weeksToShow = 4; // Last 4 weeks
        break;
      case 'quarter':
        weeksToShow = 13; // Last 13 weeks (quarter)
        break;
      case 'year':
        weeksToShow = 52; // Last 52 weeks (year)
        break;
    }
    
    for (let i = weeksToShow - 1; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setDate(currentDate.getDate() - (i * 7));
      weeks.push(getWeekKey(date));
    }
    
    return weeks;
  };

  // Format period range for display
  const formatPeriodRange = (period: PeriodType): string => {
    const weeks = getWeekRange(period);
    if (weeks.length === 0) return '';
    
    const firstWeek = weeks[0];
    const lastWeek = weeks[weeks.length - 1];
    
    return `${formatWeekKey(firstWeek)} → ${formatWeekKey(lastWeek)}`;
  };

  // Prepare chart data for all KPIs over the selected period
  const getKPIProgressionData = (): WeeklyChartData[] => {
    const weeks = getWeekRange(selectedPeriod);
    
    return weeks.map(weekKey => {
      const record = weeklyData.records.find(r => r.weekKey === weekKey);
      const dataPoint: WeeklyChartData = {
        week: weekKey,
        weekFormatted: formatWeekKey(weekKey)
      };
      
      // Add each KPI's value for this week
      WEEKLY_KPI_DEFINITIONS.forEach(kpi => {
        const value = record?.values[kpi.id] || 0;
        dataPoint[kpi.id] = value;
      });
      
      return dataPoint;
    });
  };

  // Prepare chart data for a specific KPI showing progress percentage
  const getKPIProgressChart = (kpiId: string): WeeklyChartData[] => {
    const weeks = getWeekRange(selectedPeriod);
    const kpi = WEEKLY_KPI_DEFINITIONS.find(k => k.id === kpiId);
    if (!kpi) return [];
    
    return weeks.map(weekKey => {
      const record = weeklyData.records.find(r => r.weekKey === weekKey);
      const value = record?.values[kpiId] || 0;
      const progress = calculateKPIProgress(kpiId, value);
      
      return {
        week: weekKey,
        weekFormatted: formatWeekKey(weekKey),
        value,
        progress,
        target: kpi.target
      };
    });
  };

  // Render all KPIs progression chart (vertical layout)
  const renderAllKPIsChart = () => {
    const chartData = getKPIProgressionData();
    
    return (
      <div>
        <h2 className="text-lg mb-2">All Weekly KPIs Progression</h2>
        <div className="text-sm text-terminal-accent/70 mb-4">{formatPeriodRange(selectedPeriod)}</div>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line-faint)" />
              <XAxis 
                type="number"
                stroke="var(--text-muted)"
                fontSize={10}
              />
              <YAxis 
                dataKey="week" 
                type="category"
                stroke="var(--text-muted)"
                fontSize={10}
                tickFormatter={(week) => {
                  const weekNum = week.split('-W')[1];
                  return `W${weekNum}`;
                }}
                interval={0}
                width={40}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--bg-panel)', 
                  border: '1px solid var(--line-faint)',
                  color: 'var(--text-main)',
                  fontSize: '12px'
                }}
                labelFormatter={(week) => formatWeekKey(week)}
              />
              <Legend />
              
              {/* All KPIs as separate bars */}
              {WEEKLY_KPI_DEFINITIONS.map(kpi => (
                <Bar
                  key={kpi.id}
                  dataKey={kpi.id}
                  fill={kpi.color}
                  name={kpi.name}
                  radius={[0, 2, 2, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  // Render individual KPI chart with target reference (vertical layout)
  const renderKPIChart = (kpiId: string) => {
    const kpi = WEEKLY_KPI_DEFINITIONS.find(k => k.id === kpiId);
    if (!kpi) {
      return <div className="text-center p-4">KPI not found</div>;
    }
    
    const chartData = getKPIProgressChart(kpiId);
    
    if (chartData.length === 0) {
      return <div className="text-center p-4">No data available for this KPI</div>;
    }
    
    return (
      <div>
        <h2 className="text-lg mb-1" style={{ color: kpi.color }}>{kpi.name}</h2>
        <div className="text-sm text-terminal-accent/70 mb-2">
          Target: {kpi.target} {kpi.unit} • {formatPeriodRange(selectedPeriod)}
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line-faint)" />
              <XAxis 
                type="number"
                stroke="var(--text-muted)"
                fontSize={10}
                domain={[0, kpi.target * 1.2]}
              />
              <YAxis 
                dataKey="week" 
                type="category"
                stroke="var(--text-muted)"
                fontSize={10}
                tickFormatter={(week) => {
                  const weekNum = week.split('-W')[1];
                  return `W${weekNum}`;
                }}
                interval={0}
                width={40}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--bg-panel)', 
                  border: '1px solid var(--line-faint)',
                  color: 'var(--text-main)'
                }}
                labelFormatter={(week) => formatWeekKey(week)}
                formatter={(value: number, name: string) => [
                  `${value} ${kpi.unit}`,
                  name === 'value' ? 'Actual' : name === 'target' ? 'Target' : name
                ]}
              />
              <Legend />
              
              {/* Target reference bar (transparent) */}
              <Bar 
                dataKey="target" 
                fill="transparent"
                stroke={kpi.color}
                strokeWidth={1}
                strokeDasharray="5 5"
                name="Target"
              />
              
              {/* Actual values bar */}
              <Bar 
                dataKey="value" 
                fill={kpi.color}
                name="Actual"
                radius={[0, 2, 2, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  // Calculate KPI summary for selected period
  const getKPISummary = (kpiId: string) => {
    const weeks = getWeekRange(selectedPeriod);
    const kpi = WEEKLY_KPI_DEFINITIONS.find(k => k.id === kpiId);
    if (!kpi) return null;
    
    const values = weeks.map(week => {
      const record = weeklyData.records.find(r => r.weekKey === week);
      return record?.values[kpiId] || 0;
    });
    
    if (values.length === 0) return null;
    
    const currentValue = values[values.length - 1];
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    const bestWeek = Math.max(...values);
    const completionRate = values.filter(v => v >= kpi.target).length / values.length * 100;
    
    return {
      current: currentValue,
      average: average.toFixed(1),
      best: bestWeek,
      completionRate: completionRate.toFixed(0)
    };
  };

  // Render the main visualization
  const renderVisualization = () => {
    if (selectedKPIId) {
      return renderKPIChart(selectedKPIId);
    } else {
      return renderAllKPIsChart();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-terminal-accent">Loading weekly KPI data...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header section */}
      <div className="mb-4">
        <TypewriterText text="Weekly KPI Visualizer" className="text-xl mb-2" />
        <p className="text-terminal-accent/70 text-sm mb-3">Analyze weekly KPI progression over time.</p>
        
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
          {/* Period selector */}
          <div className="flex items-center gap-2">
            <span className="text-terminal-accent/70">Period:</span>
            {(['month', 'quarter', 'year'] as PeriodType[]).map((period) => (
              <button
                key={period}
                className={`px-3 py-1 text-xs border border-terminal-accent/30 transition-colors ${
                  selectedPeriod === period 
                    ? 'bg-terminal-accent text-terminal-bg' 
                    : 'hover:border-terminal-accent/50'
                }`}
                onClick={() => setSelectedPeriod(period)}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
          
          {/* Clear selection */}
          {selectedKPIId && (
            <button
              className="px-2 py-1 text-xs border border-terminal-accent/30 hover:border-terminal-accent/50 transition-colors"
              onClick={() => setSelectedKPIId(null)}
            >
              View All KPIs
            </button>
          )}
          
          {/* Period range display */}
          <div className="text-terminal-accent/50 text-xs ml-auto">
            {formatPeriodRange(selectedPeriod)}
          </div>
        </div>
        
        {/* KPI selector */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
          {WEEKLY_KPI_DEFINITIONS.map(kpi => (
            <button 
              key={kpi.id}
              className={`px-3 py-2 text-xs border text-left transition-colors ${
                selectedKPIId === kpi.id 
                  ? 'text-white' 
                  : 'border-terminal-accent/30 hover:border-terminal-accent/50'
              }`}
              style={selectedKPIId === kpi.id 
                ? { backgroundColor: kpi.color, borderColor: kpi.color }
                : { borderColor: kpi.color + '40', color: kpi.color }
              }
              onClick={() => setSelectedKPIId(selectedKPIId === kpi.id ? null : kpi.id)}
              title={`${kpi.name} - Target: ${kpi.target} ${kpi.unit}`}
            >
              <div className="font-medium">{kpi.name}</div>
              <div className="text-xs opacity-70">{kpi.target} {kpi.unit}</div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Main visualization area */}
      <div className="flex-1 border border-terminal-accent/30 p-4 bg-terminal-bg/30 overflow-y-auto">
        {/* Chart area */}
        <div className="mb-4">
          {renderVisualization()}
        </div>
        
        {/* Summary table for selected KPI */}
        {selectedKPIId && getKPISummary(selectedKPIId) && (
          <div className="mb-4">
            <div className="text-sm mb-2 text-terminal-accent">Summary Statistics:</div>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="terminal-cell">Current</th>
                  <th className="terminal-cell">Average</th>
                  <th className="terminal-cell">Best Week</th>
                  <th className="terminal-cell">Success Rate</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="terminal-cell">{getKPISummary(selectedKPIId)?.current}</td>
                  <td className="terminal-cell">{getKPISummary(selectedKPIId)?.average}</td>
                  <td className="terminal-cell">{getKPISummary(selectedKPIId)?.best}</td>
                  <td className="terminal-cell">
                    <span className={
                      parseFloat(getKPISummary(selectedKPIId)?.completionRate || '0') >= 80 ? 'text-green-400' : 
                      parseFloat(getKPISummary(selectedKPIId)?.completionRate || '0') >= 50 ? 'text-yellow-400' : 'text-red-400'
                    }>
                      {getKPISummary(selectedKPIId)?.completionRate}%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Visualizer;
