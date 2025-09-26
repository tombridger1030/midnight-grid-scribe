import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
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
        // Try to load from Supabase first, fall back to local
        try {
          const data = await loadWeeklyKPIsWithSync();
          console.log('Loaded weekly KPI data for Visualizer:', data);
          console.log('Number of records:', data.records.length);
          data.records.forEach((record, index) => {
            console.log(`Record ${index}:`, {
              weekKey: record.weekKey,
              values: record.values,
              hasDaily: !!record.daily,
              hasDailyByDate: !!record.dailyByDate
            });
          });
          setWeeklyData(data);
        } catch (syncError) {
          console.warn('Supabase sync failed, falling back to local data:', syncError);
          const localData = loadWeeklyKPIs();
          console.log('Loaded local weekly KPI data for Visualizer:', localData);
          setWeeklyData(localData);
        }
      } catch (error) {
        console.error('Failed to load weekly KPI data:', error);
        // Provide default empty data to prevent crashes
        setWeeklyData({ records: [] });
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
      const weekKey = getWeekKey(date);
      console.log('Generated week key:', weekKey, typeof weekKey);
      weeks.push(weekKey);
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
    try {
      const weeks = getWeekRange(selectedPeriod);
      console.log('Generated weeks for KPI progression:', weeks);

      if (!weeks || weeks.length === 0) {
        console.log('No weeks available for KPI progression');
        return [];
      }

      if (!weeklyData || !weeklyData.records) {
        console.log('No weekly data available for KPI progression');
        return [];
      }

      return weeks.map(weekKey => {
        const record = weeklyData.records.find(r => r.weekKey === weekKey);
        const dataPoint: WeeklyChartData = {
          week: weekKey,
          weekFormatted: formatWeekKey(weekKey)
        };

        // Add each KPI's value for this week
        WEEKLY_KPI_DEFINITIONS.forEach(kpi => {
          const value = record?.values?.[kpi.id] || 0;
          dataPoint[kpi.id] = value;
        });

        console.log('KPI progression data point:', dataPoint);

        // Log individual KPI values for debugging
        WEEKLY_KPI_DEFINITIONS.forEach(kpi => {
          const value = dataPoint[kpi.id];
          console.log(`  ${kpi.name} (${kpi.id}): ${value}`);
        });

        return dataPoint;
      });
    } catch (error) {
      console.error('Error preparing KPI progression data:', error);
      return [];
    }
  };

  // Prepare chart data for a specific KPI showing progress percentage
  const getKPIProgressChart = (kpiId: string): WeeklyChartData[] => {
    try {
      const weeks = getWeekRange(selectedPeriod);
      const kpi = WEEKLY_KPI_DEFINITIONS.find(k => k.id === kpiId);

      if (!kpi || !weeks || weeks.length === 0) return [];
      if (!weeklyData || !weeklyData.records) return [];

      return weeks.map(weekKey => {
        const record = weeklyData.records.find(r => r.weekKey === weekKey);
        const value = record?.values?.[kpiId] || 0;
        const progress = calculateKPIProgress(kpiId, value);

        return {
          week: weekKey,
          weekFormatted: formatWeekKey(weekKey),
          value,
          progress,
          target: kpi.target
        };
      });
    } catch (error) {
      console.error('Error preparing KPI progress chart data:', error);
      return [];
    }
  };

  // Render all KPIs progression chart (vertical layout)
  const renderAllKPIsChart = () => {
    const chartData = getKPIProgressionData();
    console.log('All KPIs chart data:', chartData);

    if (!chartData || chartData.length === 0) {
      console.log('No chart data available - showing empty state');
      console.log('Weekly data records:', weeklyData.records.length);
      console.log('Week range for current period:', getWeekRange(selectedPeriod));
      return (
        <div className="text-center py-12">
          <div className="text-terminal-accent/70 mb-2">No data available</div>
          <div className="text-sm text-terminal-accent/50">
            Start tracking your weekly KPIs to see progression charts here.
          </div>
        </div>
      );
    }

    return (
      <div>
        <h2 className="text-lg mb-2">All Weekly KPIs Progression</h2>
        <div className="text-sm text-terminal-accent/70 mb-4">{formatPeriodRange(selectedPeriod)}</div>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 40, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="weekFormatted"
                stroke="#8A8D93"
                fontSize={10}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                stroke="#8A8D93"
                fontSize={10}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #333',
                  color: '#8A8D93',
                  fontSize: '12px'
                }}
                labelFormatter={(label) => {
                  console.log('All KPIs tooltip labelFormatter received:', label, typeof label);
                  return String(label);
                }}
              />
              <Legend />

              {/* All KPIs as separate lines */}
              {WEEKLY_KPI_DEFINITIONS.map(kpi => {
                console.log(`Creating line for ${kpi.name} (${kpi.id}) with color ${kpi.color}`);
                return (
                  <Line
                    key={kpi.id}
                    type="monotone"
                    dataKey={kpi.id}
                    stroke={kpi.color}
                    strokeWidth={2}
                    dot={{ fill: kpi.color, strokeWidth: 2, r: 4 }}
                    name={kpi.name}
                    connectNulls={false}
                  />
                );
              })}
            </LineChart>
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
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 40, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="weekFormatted"
                stroke="#8A8D93"
                fontSize={10}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                stroke="#8A8D93"
                fontSize={10}
                domain={[0, kpi.target * 1.2]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #333',
                  color: '#8A8D93'
                }}
                labelFormatter={(label) => String(label)}
                formatter={(value: number, name: string) => [
                  `${value} ${kpi.unit}`,
                  name === 'value' ? 'Actual' : name === 'target' ? 'Target' : name
                ]}
              />
              <Legend />

              {/* Target reference line (dashed) */}
              <Line
                type="monotone"
                dataKey="target"
                stroke={kpi.color}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Target"
              />

              {/* Actual values line */}
              <Line
                type="monotone"
                dataKey="value"
                stroke={kpi.color}
                strokeWidth={3}
                dot={{ fill: kpi.color, strokeWidth: 2, r: 5 }}
                name="Actual"
                connectNulls={false}
              />
            </LineChart>
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
        <TypewriterText text="Weekly KPI Visualizer" className="text-xl mb-2 cyberpunk-header" />
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
