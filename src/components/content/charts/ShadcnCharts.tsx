import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ChartDataPoint, PieChartDataPoint, formatNumber } from '@/lib/chartUtils';

interface ShadcnBarChartProps {
  data: ChartDataPoint[];
  title?: string;
  color?: string;
  height?: number;
  yAxisLabel?: string;
  className?: string;
}

export const ShadcnBarChartComponent: React.FC<ShadcnBarChartProps> = ({
  data,
  title,
  color = '#5FE3B3',
  height = 300,
  yAxisLabel = '',
  className = ''
}) => {
  // Clean and validate the data
  const cleanData = data.filter(item =>
    item.value !== null &&
    item.value !== undefined &&
    !isNaN(item.value) &&
    isFinite(item.value) &&
    item.value >= 0
  ).map(item => ({
    ...item,
    value: Number(item.value)
  }));

  const chartConfig = {
    value: {
      label: yAxisLabel || 'Value',
      color: color,
    },
  };

  return (
    <div className={`bg-[#111] border-[#333] rounded-lg p-4 ${className}`}>
      {title && <h3 className="text-white mb-4 text-lg font-semibold">{title}</h3>}
      {cleanData.length > 0 ? (
        <ChartContainer config={chartConfig} className="h-[300px]">
          <BarChart data={cleanData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis
              dataKey="label"
              stroke="#ffffff"
              tick={{ fill: '#ffffff', fontSize: 12 }}
            />
            <YAxis
              stroke="#ffffff"
              tick={{ fill: '#ffffff', fontSize: 12 }}
            />
            <ChartTooltip
              content={<ChartTooltipContent />}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Bar
              dataKey="value"
              fill={color}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      ) : (
        <div className="h-48 flex items-center justify-center text-[#8A8D93]">
          No data available
        </div>
      )}
    </div>
  );
};

interface ShadcnLineChartProps {
  data: ChartDataPoint[];
  title?: string;
  color?: string;
  height?: number;
  yAxisLabel?: string;
  className?: string;
}

export const ShadcnLineChartComponent: React.FC<ShadcnLineChartProps> = ({
  data,
  title,
  color = '#5FE3B3',
  height = 300,
  yAxisLabel = '',
  className = ''
}) => {
  // Clean and validate the data
  const cleanData = data.filter(item =>
    item.value !== null &&
    item.value !== undefined &&
    !isNaN(item.value) &&
    isFinite(item.value) &&
    item.value >= 0
  ).map(item => ({
    ...item,
    value: Number(item.value)
  }));

  const chartConfig = {
    value: {
      label: yAxisLabel || 'Value',
      color: color,
    },
  };

  return (
    <div className={`bg-[#111] border-[#333] rounded-lg p-4 ${className}`}>
      {title && <h3 className="text-white mb-4 text-lg font-semibold">{title}</h3>}
      {cleanData.length > 0 ? (
        <ChartContainer config={chartConfig} className="h-[300px]">
          <LineChart data={cleanData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis
              dataKey="label"
              stroke="#ffffff"
              tick={{ fill: '#ffffff', fontSize: 12 }}
            />
            <YAxis
              stroke="#ffffff"
              tick={{ fill: '#ffffff', fontSize: 12 }}
            />
            <ChartTooltip
              content={<ChartTooltipContent />}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ChartContainer>
      ) : (
        <div className="h-48 flex items-center justify-center text-[#8A8D93]">
          No data available
        </div>
      )}
    </div>
  );
};

interface ShadcnPieChartProps {
  data: PieChartDataPoint[];
  title: string;
  size?: number;
  showPercentages?: boolean;
  className?: string;
}

export const ShadcnPieChartComponent: React.FC<ShadcnPieChartProps> = ({
  data,
  title,
  showPercentages = true,
  className = ''
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const chartConfig = data.reduce((config, item) => {
    config[item.label] = {
      label: item.label,
      color: item.color,
    };
    return config;
  }, {} as Record<string, { label: string; color: string }>);

  return (
    <div className={`bg-[#111] border-[#333] rounded-lg p-4 ${className}`}>
      <h3 className="text-white mb-4 text-lg font-semibold">{title}</h3>
      <div className="flex flex-col items-center">
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry) => showPercentages ? `${entry.label}: ${((entry.value / total) * 100).toFixed(1)}%` : entry.label}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
          </PieChart>
        </ChartContainer>
        <div className="text-center mt-2">
          <p className="text-[#8A8D93] text-sm">Total: {formatNumber(total)}</p>
        </div>
      </div>
    </div>
  );
};

interface ShadcnStackedBarChartProps {
  data: any[];
  title: string;
  bars: {
    key: string;
    color: string;
    name: string;
  }[];
  className?: string;
}

export const ShadcnStackedBarChartComponent: React.FC<ShadcnStackedBarChartProps> = ({
  data,
  title,
  bars,
  className = ''
}) => {
  const chartConfig = bars.reduce((config, bar) => {
    config[bar.key] = {
      label: bar.name,
      color: bar.color,
    };
    return config;
  }, {} as Record<string, { label: string; color: string }>);

  return (
    <div className={`bg-[#111] border-[#333] rounded-lg p-4 ${className}`}>
      <h3 className="text-white mb-4 text-lg font-semibold">{title}</h3>
      <ChartContainer config={chartConfig} className="h-[300px]">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="date"
            stroke="#ffffff"
            tick={{ fill: '#ffffff', fontSize: 12 }}
          />
          <YAxis
            stroke="#ffffff"
            tick={{ fill: '#ffffff', fontSize: 12 }}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Legend
            wrapperStyle={{ color: '#ffffff' }}
            iconType="rect"
          />
          {bars.map((bar) => (
            <Bar
              key={bar.key}
              dataKey={bar.key}
              stackId="a"
              fill={bar.color}
            />
          ))}
        </BarChart>
      </ChartContainer>
    </div>
  );
};

interface ShadcnAreaChartProps {
  data: ChartDataPoint[];
  title: string;
  color?: string;
  className?: string;
}

export const ShadcnAreaChartComponent: React.FC<ShadcnAreaChartProps> = ({
  data,
  title,
  color = '#5FE3B3',
  className = ''
}) => {
  // Clean and validate the data
  const cleanData = data.filter(item =>
    item.value !== null &&
    item.value !== undefined &&
    !isNaN(item.value) &&
    isFinite(item.value) &&
    item.value >= 0
  ).map(item => ({
    ...item,
    value: Number(item.value)
  }));

  const chartConfig = {
    value: {
      label: 'Value',
      color: color,
    },
  };

  return (
    <div className={`bg-[#111] border-[#333] rounded-lg p-4 ${className}`}>
      <h3 className="text-white mb-4 text-lg font-semibold">{title}</h3>
      {cleanData.length > 0 ? (
        <ChartContainer config={chartConfig} className="h-[300px]">
          <AreaChart data={cleanData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis
              dataKey="label"
              stroke="#ffffff"
              tick={{ fill: '#ffffff', fontSize: 12 }}
            />
            <YAxis
              stroke="#ffffff"
              tick={{ fill: '#ffffff', fontSize: 12 }}
            />
            <ChartTooltip
              content={<ChartTooltipContent />}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              fill={color}
              fillOpacity={0.3}
            />
          </AreaChart>
        </ChartContainer>
      ) : (
        <div className="h-48 flex items-center justify-center text-[#8A8D93]">
          No data available
        </div>
      )}
    </div>
  );
};

interface ShadcnSparklineProps {
  data: ChartDataPoint[];
  color?: string;
  title?: string;
  value?: number;
  format?: 'number' | 'percentage';
  className?: string;
}

export const ShadcnSparkline: React.FC<ShadcnSparklineProps> = ({
  data,
  color = '#5FE3B3',
  title,
  value,
  format = 'number',
  className = ''
}) => {
  const formatValue = (val: number) => {
    switch (format) {
      case 'percentage':
        return `${val.toFixed(1)}%`;
      default:
        return formatNumber(val);
    }
  };

  // Clean and validate the data
  const cleanData = data.filter(item =>
    item.value !== null &&
    item.value !== undefined &&
    !isNaN(item.value) &&
    isFinite(item.value) &&
    item.value >= 0
  ).map(item => ({
    ...item,
    value: Number(item.value)
  }));

  if (cleanData.length === 0) {
    return (
      <div className={`bg-[#111] border-[#333] rounded-sm p-4 ${className}`}>
        {title && (
          <p className="text-sm text-[#8A8D93] mb-2">{title}</p>
        )}
        <div className="flex items-center justify-center h-12 text-[#8A8D93]">
          No data
        </div>
      </div>
    );
  }

  const currentValue = value || cleanData[cleanData.length - 1]?.value || 0;
  const previousValue = cleanData[0]?.value || 0;
  const trend = currentValue > previousValue ? 'up' : currentValue < previousValue ? 'down' : 'neutral';
  const trendColor = trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : '#6B7280';

  const trendPercentage = previousValue > 0
    ? Math.abs(((currentValue - previousValue) / previousValue) * 100)
    : 0;

  return (
    <div className={`bg-[#111] border-[#333] rounded-sm p-4 ${className}`}>
      {title && (
        <p className="text-sm text-[#8A8D93] mb-2">{title}</p>
      )}
      <div className="flex items-baseline justify-between">
        <h3 className={`text-2xl font-semibold`} style={{ color }}>
          {formatValue(currentValue)}
        </h3>
        <div className={`text-sm flex items-center gap-1`} style={{ color: trendColor }}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
          {trendPercentage.toFixed(1)}%
        </div>
      </div>
      <div className="h-12 mt-2">
        <ChartContainer config={{ value: { color } }} className="h-12">
          <LineChart data={cleanData}>
            <XAxis dataKey="label" hide={true} />
            <YAxis hide={true} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </div>
    </div>
  );
};

interface ShadcnMetricGaugeProps {
  label: string;
  value: number;
  target: number;
  color?: string;
  unit?: string;
  format?: 'number' | 'percentage' | 'currency';
  className?: string;
}

export const ShadcnMetricGauge: React.FC<ShadcnMetricGaugeProps> = ({
  label,
  value,
  target,
  color = '#5FE3B3',
  unit = '',
  format = 'number',
  className = ''
}) => {
  const percentage = Math.min((value / target) * 100, 100);

  const formatValue = (val: number) => {
    switch (format) {
      case 'percentage':
        return `${val.toFixed(1)}%`;
      case 'currency':
        return `$${formatNumber(val)}`;
      default:
        return formatNumber(val);
    }
  };

  return (
    <div className={`bg-[#111] border-[#333] rounded-lg p-4 ${className}`}>
      <div className="text-center">
        <div className="relative w-32 h-32 mx-auto mb-4">
          <svg className="transform -rotate-90 w-32 h-32">
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="#333"
              strokeWidth="12"
              fill="none"
            />
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke={color}
              strokeWidth="12"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 56}`}
              strokeDashoffset={`${2 * Math.PI * 56 * (1 - percentage / 100)}`}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <h3 className={`text-2xl font-semibold`} style={{ color }}>
              {formatValue(value)}
            </h3>
            <p className="text-xs text-[#8A8D93]">{unit}</p>
          </div>
        </div>
        <p className="text-sm text-[#8A8D93]">{label}</p>
        <p className="text-xs text-[#666]">
          Target: {formatValue(target)}
        </p>
      </div>
    </div>
  );
};