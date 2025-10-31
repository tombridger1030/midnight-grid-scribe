import React from 'react';
import {
  Card as TremorCard,
  Title,
  Text,
  LineChart as TremorLineChart,
  BarChart as TremorBarChart,
  PieChart as TremorPieChart,
  AreaChart as TremorAreaChart,
  DonutChart as TremorDonutChart
} from '@tremor/react';
import { ChartDataPoint, PieChartDataPoint, formatNumber } from '@/lib/chartUtils';

interface TremorLineChartProps {
  data: ChartDataPoint[];
  title?: string;
  color?: string;
  height?: number;
  yAxisLabel?: string;
  className?: string;
}

export const TremorLineChartComponent: React.FC<TremorLineChartProps> = ({
  data,
  title,
  color = '#5FE3B3',
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

  return (
    <TremorCard className={`bg-[#111] border-[#333] ${className}`}>
      {title && <Title className="text-white mb-4">{title}</Title>}
      {cleanData.length > 0 ? (
        <TremorLineChart
          data={cleanData}
          index="label"
          categories={["value"]}
          colors={[color]}
          valueFormatter={(value) => formatNumber(value as number)}
          yAxisWidth={60}
          showGrid={true}
          showLegend={false}
          curveType="monotone"
          animationDuration={1000}
        />
      ) : (
        <div className="h-48 flex items-center justify-center text-[#8A8D93]">
          No data available
        </div>
      )}
    </TremorCard>
  );
};

interface TremorPieChartProps {
  data: PieChartDataPoint[];
  title: string;
  size?: number;
  showPercentages?: boolean;
  className?: string;
}

export const TremorPieChartComponent: React.FC<TremorPieChartProps> = ({
  data,
  title,
  showPercentages = true,
  className = ''
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <TremorCard className={`bg-[#111] border-[#333] ${className}`}>
      <Title className="text-white mb-4">{title}</Title>
      <TremorDonutChart
        data={data.map(item => ({
          name: item.label,
          value: item.value,
          color: item.color
        }))}
        category="value"
        index="name"
        valueFormatter={(value) => formatNumber(value as number)}
        showLabel={showPercentages}
        colors={data.map(item => item.color)}
      />
      <div className="text-center mt-2">
        <Text className="text-[#8A8D93] text-sm">Total: {formatNumber(total)}</Text>
      </div>
    </TremorCard>
  );
};

interface TremorBarChartProps {
  data: any[];
  title: string;
  dataKey: string;
  color?: string;
  valueFormatter?: (value: number) => string;
  className?: string;
}

export const TremorBarChartComponent: React.FC<TremorBarChartProps> = ({
  data,
  title,
  dataKey,
  color = '#5FE3B3',
  valueFormatter = (value) => formatNumber(value),
  className = ''
}) => {
  return (
    <TremorCard className={`bg-[#111] border-[#333] ${className}`}>
      <Title className="text-white mb-4">{title}</Title>
      <TremorBarChart
        data={data}
        index="name"
        categories={[dataKey]}
        colors={[color]}
        valueFormatter={valueFormatter}
        yAxisWidth={60}
      />
    </TremorCard>
  );
};

interface TremorMetricGaugeProps {
  label: string;
  value: number;
  target: number;
  color?: string;
  unit?: string;
  format?: 'number' | 'percentage' | 'currency';
  className?: string;
}

export const TremorMetricGauge: React.FC<TremorMetricGaugeProps> = ({
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
    <TremorCard className={`bg-[#111] border-[#333] ${className}`}>
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
            <Title className={`text-2xl`} style={{ color }}>
              {formatValue(value)}
            </Title>
            <Text className="text-xs text-[#8A8D93]">{unit}</Text>
          </div>
        </div>
        <Text className="text-sm text-[#8A8D93]">{label}</Text>
        <Text className="text-xs text-[#666]">
          Target: {formatValue(target)}
        </Text>
      </div>
    </TremorCard>
  );
};

interface TremorMultiLineChartProps {
  data: any[];
  title: string;
  lines: {
    key: string;
    color: string;
    name: string;
  }[];
  className?: string;
}

export const TremorMultiLineChartComponent: React.FC<TremorMultiLineChartProps> = ({
  data,
  title,
  lines,
  className = ''
}) => {
  // Clean and validate the data
  const cleanData = data.map(item => {
    const cleanItem: any = { label: item.label };
    lines.forEach(line => {
      cleanItem[line.key] = Number(item[line.key] || 0);
    });
    return cleanItem;
  }).filter(item =>
    // Only keep items that have some non-zero data
    lines.some(line => item[line.key] > 0)
  );

  return (
    <TremorCard className={`bg-[#111] border-[#333] ${className}`}>
      <Title className="text-white mb-4">{title}</Title>
      {cleanData.length > 0 ? (
        <>
          <TremorLineChart
            data={cleanData}
            index="label"
            categories={lines.map(line => line.key)}
            colors={lines.map(line => line.color)}
            valueFormatter={(value) => formatNumber(value as number)}
            yAxisWidth={60}
            showGrid={true}
            showLegend={true}
            legendPosition="bottom"
            curveType="monotone"
            animationDuration={1000}
          />
          <div className="flex justify-center gap-6 mt-4">
            {lines.map((line, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: line.color }}
                ></div>
                <Text className="text-xs text-[#8A8D93]">{line.name}</Text>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="h-48 flex items-center justify-center text-[#8A8D93]">
          No data available
        </div>
      )}
    </TremorCard>
  );
};

interface TremorAreaChartProps {
  data: ChartDataPoint[];
  title: string;
  color?: string;
  className?: string;
}

export const TremorAreaChartComponent: React.FC<TremorAreaChartProps> = ({
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

  return (
    <TremorCard className={`bg-[#111] border-[#333] ${className}`}>
      <Title className="text-white mb-4">{title}</Title>
      {cleanData.length > 0 ? (
        <TremorAreaChart
          data={cleanData}
          index="label"
          categories={["value"]}
          colors={[color]}
          valueFormatter={(value) => formatNumber(value as number)}
          yAxisWidth={60}
          showGrid={true}
          showLegend={false}
          curveType="monotone"
          animationDuration={1000}
        />
      ) : (
        <div className="h-48 flex items-center justify-center text-[#8A8D93]">
          No data available
        </div>
      )}
    </TremorCard>
  );
};

interface TremorSparklineProps {
  data: ChartDataPoint[];
  color?: string;
  title?: string;
  value?: number;
  format?: 'number' | 'percentage';
  className?: string;
}

export const TremorSparkline: React.FC<TremorSparklineProps> = ({
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
          <Text className="text-sm text-[#8A8D93] mb-2">{title}</Text>
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
        <Text className="text-sm text-[#8A8D93] mb-2">{title}</Text>
      )}
      <div className="flex items-baseline justify-between">
        <Title className={`text-2xl`} style={{ color }}>
          {formatValue(currentValue)}
        </Title>
        <div className={`text-sm flex items-center gap-1`} style={{ color: trendColor }}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
          {trendPercentage.toFixed(1)}%
        </div>
      </div>
      <div className="h-12 mt-2">
        <TremorLineChart
          data={cleanData}
          index="label"
          categories={["value"]}
          colors={[color]}
          showGrid={false}
          showYAxis={false}
          showXAxis={false}
          showLegend={false}
          showTooltip={false}
          curveType="monotone"
          animationDuration={1000}
        />
      </div>
    </div>
  );
};