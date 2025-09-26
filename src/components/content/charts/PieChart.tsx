import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { PieChartDataPoint, formatNumber } from '@/lib/chartUtils';

interface PieChartProps {
  data: PieChartDataPoint[];
  title: string;
  size?: number;
  showLabels?: boolean;
  showPercentages?: boolean;
  className?: string;
}

const PieChart: React.FC<PieChartProps> = ({
  data,
  title,
  size = 200,
  showLabels = true,
  showPercentages = true,
  className = ''
}) => {
  const [hoveredSegment, setHoveredSegment] = useState<PieChartDataPoint | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);

  const chartData = useMemo(() => {
    if (data.length === 0) return null;

    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = -Math.PI / 2; // Start at top

    const segments = data.map((item) => {
      const percentage = total > 0 ? (item.value / total) * 100 : 0;
      const angle = (percentage / 100) * 2 * Math.PI;

      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;

      const centerX = size / 2;
      const centerY = size / 2;
      const radius = size * 0.35;
      const innerRadius = size * 0.15; // For donut effect

      const startX = centerX + Math.cos(startAngle) * radius;
      const startY = centerY + Math.sin(startAngle) * radius;
      const endX = centerX + Math.cos(endAngle) * radius;
      const endY = centerY + Math.sin(endAngle) * radius;

      const innerStartX = centerX + Math.cos(startAngle) * innerRadius;
      const innerStartY = centerY + Math.sin(startAngle) * innerRadius;
      const innerEndX = centerX + Math.cos(endAngle) * innerRadius;
      const innerEndY = centerY + Math.sin(endAngle) * innerRadius;

      const largeArcFlag = angle > Math.PI ? 1 : 0;

      // Create donut path
      const path = [
        `M ${innerStartX} ${innerStartY}`,
        `L ${startX} ${startY}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
        `L ${innerEndX} ${innerEndY}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStartX} ${innerStartY}`,
        'Z'
      ].join(' ');

      // Calculate label position
      const labelAngle = startAngle + angle / 2;
      const labelRadius = radius + 15;
      const labelX = centerX + Math.cos(labelAngle) * labelRadius;
      const labelY = centerY + Math.sin(labelAngle) * labelRadius;

      currentAngle = endAngle;

      return {
        ...item,
        path,
        percentage,
        labelX,
        labelY,
        midAngle: labelAngle
      };
    });

    return { segments, total };
  }, [data, size]);

  if (!chartData || data.length === 0) {
    return (
      <div className={cn('border border-[#333] bg-[#111] rounded-sm p-4', className)}>
        <h3 className="text-sm font-medium text-white mb-4">{title}</h3>
        <div className="flex items-center justify-center text-[#8A8D93] text-sm" style={{ height: size }}>
          No data available
        </div>
      </div>
    );
  }

  const handleMouseMove = (event: React.MouseEvent<SVGElement>, segment: PieChartDataPoint) => {
    setHoveredSegment(segment);
    setMousePosition({ x: event.clientX, y: event.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredSegment(null);
    setMousePosition(null);
  };

  return (
    <div className={cn('border border-[#333] bg-[#111] rounded-sm p-4 relative', className)}>
      <h3 className="text-sm font-medium text-white mb-4">{title}</h3>

      <div className="flex items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible"
        >
          {chartData.segments.map((segment, index) => (
            <path
              key={index}
              d={segment.path}
              fill={segment.color}
              stroke="#111"
              strokeWidth="1"
              className="transition-all duration-200 cursor-pointer"
              style={{
                filter: hoveredSegment === segment ? 'brightness(1.2) drop-shadow(0 0 8px rgba(255,255,255,0.3))' : 'none',
                transform: hoveredSegment === segment ? 'scale(1.02)' : 'scale(1)',
                transformOrigin: `${size/2}px ${size/2}px`
              }}
              onMouseMove={(e) => handleMouseMove(e, segment)}
              onMouseLeave={handleMouseLeave}
            />
          ))}

          {/* Center text - total value */}
          <text
            x={size / 2}
            y={size / 2 - 5}
            textAnchor="middle"
            className="text-white text-sm font-medium"
            fill="currentColor"
          >
            {formatNumber(chartData.total)}
          </text>
          <text
            x={size / 2}
            y={size / 2 + 12}
            textAnchor="middle"
            className="text-[#8A8D93] text-xs"
            fill="currentColor"
          >
            Total
          </text>
        </svg>
      </div>

      {/* Legend */}
      {showLabels && (
        <div className="mt-4 space-y-2">
          {chartData.segments.map((segment, index) => (
            <div
              key={index}
              className={cn(
                'flex items-center justify-between p-2 rounded-sm transition-all duration-200',
                hoveredSegment === segment ? 'bg-[#222]' : 'bg-[#0F0F0F]'
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: segment.color }}
                ></div>
                <div className="text-xs text-white">{segment.label}</div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="text-white">{formatNumber(segment.value)}</div>
                {showPercentages && (
                  <div className="text-[#8A8D93]">({segment.percentage.toFixed(1)}%)</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tooltip */}
      {hoveredSegment && mousePosition && (
        <div
          className="fixed z-50 bg-[#111] border border-[#333] rounded-sm p-2 shadow-lg pointer-events-none"
          style={{
            left: mousePosition.x + 10,
            top: mousePosition.y - 60,
            transform: mousePosition.x > window.innerWidth - 200 ? 'translateX(-100%)' : 'none'
          }}
        >
          <div className="text-xs text-white font-medium">
            {hoveredSegment.label}
          </div>
          <div className="text-xs text-[#8A8D93]">
            {formatNumber(hoveredSegment.value)} ({hoveredSegment.percentage.toFixed(1)}%)
          </div>
        </div>
      )}
    </div>
  );
};

export default PieChart;