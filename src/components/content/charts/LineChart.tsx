import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ChartDataPoint, generateSmoothPath, formatNumber } from '@/lib/chartUtils';

interface LineChartProps {
  data: ChartDataPoint[];
  title?: string;
  color?: string;
  height?: number;
  showDots?: boolean;
  showGrid?: boolean;
  className?: string;
  yAxisLabel?: string;
  formatValue?: (value: number) => string;
  additionalLines?: {
    data: ChartDataPoint[];
    color: string;
  }[];
}

const LineChart: React.FC<LineChartProps> = ({
  data,
  title,
  color = '#5FE3B3',
  height = 200,
  showDots = true,
  showGrid = true,
  className = '',
  yAxisLabel = '',
  formatValue = formatNumber,
  additionalLines = []
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<ChartDataPoint | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);

  const chartData = useMemo(() => {
    if (data.length === 0) return null;

    // Filter out any invalid data points
    const validData = data.filter(d => d.value != null && !isNaN(d.value) && isFinite(d.value));
    if (validData.length === 0) return null;

    // Combine all data to get global min/max
    const allValues = [...validData.map(d => d.value)];
    additionalLines.forEach(line => {
      const validLineData = line.data.filter(d => d.value != null && !isNaN(d.value) && isFinite(d.value));
      allValues.push(...validLineData.map(d => d.value));
    });

    const maxValue = Math.max(...allValues);
    const minValue = Math.min(...allValues);
    const valueRange = maxValue - minValue || 1;

    const padding = 40;
    const chartWidth = 100; // percentage
    const chartHeight = height - padding * 2;

    const points = validData.map((point, index) => {
      const x = validData.length === 1 ? chartWidth / 2 : (index / (validData.length - 1)) * chartWidth;
      const y = chartHeight - ((point.value - minValue) / valueRange) * chartHeight;

      // Ensure y coordinate is valid
      const safeY = isNaN(y) || !isFinite(y) ? chartHeight / 2 : y;

      return { x, y: safeY, data: point };
    });

    const pathData = generateSmoothPath(points.map(p => ({ x: p.x, y: p.y })));

    // Calculate additional lines
    const additionalLinesData = additionalLines.map(line => {
      const validLineData = line.data.filter(d => d.value != null && !isNaN(d.value) && isFinite(d.value));
      const linePoints = validLineData.map((point, index) => {
        const x = validLineData.length === 1 ? chartWidth / 2 : (index / (validLineData.length - 1)) * chartWidth;
        const y = chartHeight - ((point.value - minValue) / valueRange) * chartHeight;
        const safeY = isNaN(y) || !isFinite(y) ? chartHeight / 2 : y;
        return { x, y: safeY, data: point };
      });
      return {
        points: linePoints,
        pathData: generateSmoothPath(linePoints.map(p => ({ x: p.x, y: p.y }))),
        color: line.color
      };
    });

    return {
      points,
      pathData,
      maxValue,
      minValue,
      padding,
      additionalLines: additionalLinesData
    };
  }, [data, height, additionalLines]);

  if (!chartData || data.length === 0) {
    return (
      <div className={cn('border border-[#333] bg-[#111] rounded-sm p-4', className)}>
        {title && <h3 className="text-sm font-medium text-white mb-4">{title}</h3>}
        <div className="flex items-center justify-center text-[#8A8D93] text-sm" style={{ height: height }}>
          No data available
        </div>
      </div>
    );
  }

  const handleMouseMove = (event: React.MouseEvent<SVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const closestPoint = chartData.points.reduce((closest, point) =>
      Math.abs(point.x - x) < Math.abs(closest.x - x) ? point : closest
    );

    setHoveredPoint(closestPoint.data);
    setMousePosition({ x: event.clientX, y: event.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
    setMousePosition(null);
  };

  // Generate Y-axis labels
  const yAxisTicks = useMemo(() => {
    if (!chartData || !isFinite(chartData.minValue) || !isFinite(chartData.maxValue)) {
      return [];
    }

    const ticks = [];
    const tickCount = 4;
    const valueRange = chartData.maxValue - chartData.minValue || 1; // Prevent division by zero

    for (let i = 0; i <= tickCount; i++) {
      const value = chartData.minValue + valueRange * (i / tickCount);
      const y = height - chartData.padding - ((value - chartData.minValue) / valueRange) * (height - chartData.padding * 2);

      // Only add ticks with valid y coordinates
      if (isFinite(y) && !isNaN(y)) {
        ticks.push({ value, y });
      }
    }
    return ticks.reverse();
  }, [chartData, height]);

  return (
    <div className={cn('relative', !title && 'border-0 bg-transparent p-0', title && 'border border-[#333] bg-[#111] rounded-sm p-4', className)}>
      {title && <h3 className="text-sm font-medium text-white mb-4">{title}</h3>}

      <div className="relative">
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 100 ${height}`}
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="overflow-visible"
        >
          {/* Grid lines */}
          {showGrid && (
            <g>
              {yAxisTicks.map((tick, i) => (
                <line
                  key={i}
                  x1={0}
                  y1={tick.y}
                  x2={100}
                  y2={tick.y}
                  stroke="#333"
                  strokeWidth="0.1"
                  opacity="0.5"
                />
              ))}
            </g>
          )}

          {/* Area under curve */}
          <defs>
            <linearGradient id={`gradient-${title}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color} stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {chartData.pathData && (
            <path
              d={`${chartData.pathData} L ${chartData.points[chartData.points.length - 1].x} ${height - chartData.padding} L ${chartData.points[0].x} ${height - chartData.padding} Z`}
              fill={`url(#gradient-${title})`}
            />
          )}

          {/* Additional lines */}
          {chartData.additionalLines?.map((line, lineIndex) => (
            <g key={lineIndex}>
              {line.pathData && (
                <path
                  d={line.pathData}
                  fill="none"
                  stroke={line.color}
                  strokeWidth="0.3"
                  className="transition-all duration-300"
                />
              )}
              {showDots && line.points.map((point, index) => (
                <circle
                  key={`${lineIndex}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={hoveredPoint === point.data ? "0.9" : "0.5"}
                  fill={line.color}
                  stroke="#ffffff"
                  strokeWidth="0.25"
                  className="transition-all duration-200"
                />
              ))}
            </g>
          ))}

          {/* Main line */}
          {chartData.pathData && (
            <path
              d={chartData.pathData}
              fill="none"
              stroke={color}
              strokeWidth="0.3"
              className="transition-all duration-300"
            />
          )}

          {/* Data points */}
          {showDots && chartData.points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={hoveredPoint === point.data ? "0.9" : "0.5"}
              fill={color}
              stroke="#ffffff"
              strokeWidth="0.25"
              className="transition-all duration-200"
              style={{
                filter: hoveredPoint === point.data ? 'drop-shadow(0 0 3px rgba(95, 227, 179, 0.8))' : 'none'
              }}
            />
          ))}

          {/* Hover line */}
          {hoveredPoint && (
            <line
              x1={chartData.points.find(p => p.data === hoveredPoint)?.x || 0}
              y1={chartData.padding}
              x2={chartData.points.find(p => p.data === hoveredPoint)?.x || 0}
              y2={height - chartData.padding}
              stroke={color}
              strokeWidth="0.1"
              strokeDasharray="2,2"
              opacity="0.6"
            />
          )}
        </svg>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between py-10 -ml-12">
          {yAxisTicks.map((tick, i) => (
            <div key={i} className="text-xs text-[#8A8D93] text-right">
              {formatValue(tick.value)}
            </div>
          ))}
        </div>

        {/* X-axis labels */}
        <div className="flex justify-between mt-2 px-2">
          <div className="text-xs text-[#8A8D93]">
            {data[0]?.label}
          </div>
          <div className="text-xs text-[#8A8D93]">
            {data[data.length - 1]?.label}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredPoint && mousePosition && (
        <div
          className="fixed z-50 bg-[#111] border border-[#333] rounded-sm p-2 shadow-lg pointer-events-none"
          style={{
            left: mousePosition.x + 10,
            top: mousePosition.y - 60,
            transform: typeof window !== 'undefined' && mousePosition.x > window.innerWidth - 200 ? 'translateX(-100%)' : 'none'
          }}
        >
          <div className="text-xs text-white font-medium">
            {hoveredPoint.label}
          </div>
          <div className="text-xs text-[#8A8D93]">
            {yAxisLabel}: {formatValue(hoveredPoint.value)}
          </div>
        </div>
      )}
    </div>
  );
};

export default LineChart;