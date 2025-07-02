import React from 'react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { 
  loadWeeklyKPIs, 
  getRecentWeeks, 
  calculateWeekCompletion,
  formatWeekKey
} from '@/lib/weeklyKpi';

interface WeekStreakChartProps {
  weekCount?: number;
  showTitle?: boolean;
  height?: number;
}

const WeekStreakChart: React.FC<WeekStreakChartProps> = ({ 
  weekCount = 6, 
  showTitle = true,
  height = 120
}) => {
  // Get recent weeks data
  const getWeeklyTrendData = () => {
    const data = loadWeeklyKPIs();
    const recentWeeks = getRecentWeeks(weekCount);
    
    return recentWeeks.map(weekKey => {
      const record = data.records.find(r => r.weekKey === weekKey);
      const completion = record ? calculateWeekCompletion(record.values) : 0;
      
      return {
        week: weekKey,
        completion,
        formattedWeek: formatWeekKey(weekKey)
      };
    });
  };

  const trendData = getWeeklyTrendData();
  const currentCompletion = trendData[trendData.length - 1]?.completion || 0;
  const previousCompletion = trendData[trendData.length - 2]?.completion || 0;
  const trend = currentCompletion - previousCompletion;

  // Calculate average completion
  const averageCompletion = trendData.length > 0 
    ? Math.round(trendData.reduce((sum, item) => sum + item.completion, 0) / trendData.length)
    : 0;

  return (
    <div className="space-y-3">
      {showTitle && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-terminal-accent">
            Weekly Performance Trend
          </h3>
          <div className="flex items-center gap-4 text-xs">
            <div className="text-terminal-accent/70">
              Avg: {averageCompletion}%
            </div>
            <div className={`flex items-center gap-1 ${
              trend > 0 ? 'text-[#5FE3B3]' : trend < 0 ? 'text-[#FF6B6B]' : 'text-terminal-accent'
            }`}>
              <span>{trend > 0 ? '↗' : trend < 0 ? '↘' : '→'}</span>
              <span>{Math.abs(trend)}%</span>
            </div>
          </div>
        </div>
      )}
      
      <div className="border border-terminal-accent/30 p-3 bg-terminal-bg/20">
        <div style={{ height: `${height}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <XAxis 
                dataKey="week" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                tickFormatter={(week) => {
                  const weekNum = week.split('-W')[1];
                  return `W${weekNum}`;
                }}
              />
              <YAxis 
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--bg-panel)', 
                  border: '1px solid var(--line-faint)',
                  fontSize: '11px',
                  borderRadius: '4px'
                }}
                labelFormatter={(week) => formatWeekKey(week)}
                formatter={(value: number) => [`${value}%`, 'Completion']}
              />
              <Line 
                type="monotone" 
                dataKey="completion" 
                stroke="#5FE3B3" 
                strokeWidth={2}
                dot={{ r: 3, fill: '#5FE3B3', strokeWidth: 0 }}
                activeDot={{ r: 4, fill: '#5FE3B3' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-3 grid grid-cols-3 gap-4 text-center text-xs">
          <div>
            <div className="text-lg font-bold text-terminal-accent">
              {currentCompletion}%
            </div>
            <div className="text-terminal-accent/70">This Week</div>
          </div>
          <div>
            <div className="text-lg font-bold text-terminal-accent">
              {averageCompletion}%
            </div>
            <div className="text-terminal-accent/70">{weekCount}W Avg</div>
          </div>
          <div>
            <div className={`text-lg font-bold ${
              trend > 0 ? 'text-[#5FE3B3]' : trend < 0 ? 'text-[#FF6B6B]' : 'text-terminal-accent'
            }`}>
              {trend > 0 ? '+' : ''}{trend}%
            </div>
            <div className="text-terminal-accent/70">Trend</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeekStreakChart; 