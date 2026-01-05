/**
 * MonthlyChart Component
 * 
 * Nivo line chart showing monthly actuals vs target.
 * Clean design matching Dashboard style.
 */

import React from 'react';
import { ResponsiveLine } from '@nivo/line';

interface MonthlyChartProps {
  monthlyActuals: number[];
  monthlyTarget: number;
  unit: string;
  currentMonth: number;
  accentColor?: string;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MonthlyChart: React.FC<MonthlyChartProps> = ({
  monthlyActuals,
  monthlyTarget,
  unit,
  currentMonth,
  accentColor = '#00F0FF',
}) => {
  // Build data for past months only (including current)
  const actualData = monthlyActuals
    .slice(0, currentMonth + 1)
    .map((value, index) => ({
      x: MONTH_LABELS[index],
      y: value || 0,
    }));

  const chartData = [
    {
      id: 'actual',
      data: actualData,
    },
  ];

  // Calculate max for y-axis
  const maxValue = Math.max(monthlyTarget * 1.3, ...monthlyActuals.filter(v => v > 0));

  // Custom theme matching design tokens
  const theme = {
    background: 'transparent',
    textColor: '#6B6B6B',
    fontSize: 10,
    axis: {
      domain: {
        line: {
          stroke: '#1F1F1F',
          strokeWidth: 1,
        },
      },
      ticks: {
        line: {
          stroke: '#1F1F1F',
          strokeWidth: 1,
        },
        text: {
          fill: '#6B6B6B',
          fontSize: 10,
        },
      },
    },
    grid: {
      line: {
        stroke: '#1F1F1F',
        strokeWidth: 1,
      },
    },
    crosshair: {
      line: {
        stroke: accentColor,
        strokeWidth: 1,
        strokeOpacity: 0.5,
      },
    },
    tooltip: {
      container: {
        background: '#0A0A0A',
        color: '#E8E8E8',
        fontSize: 11,
        borderRadius: 4,
        border: '1px solid #1F1F1F',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      },
    },
  };

  return (
    <div className="h-40 w-full">
      <ResponsiveLine
        data={chartData}
        theme={theme}
        margin={{ top: 10, right: 20, bottom: 30, left: 40 }}
        xScale={{ type: 'point' }}
        yScale={{ type: 'linear', min: 0, max: maxValue, stacked: false }}
        curve="monotoneX"
        colors={[accentColor]}
        lineWidth={2}
        enablePoints={true}
        pointSize={6}
        pointColor="#0A0A0A"
        pointBorderWidth={2}
        pointBorderColor={accentColor}
        enableArea={true}
        areaOpacity={0.1}
        areaBaselineValue={0}
        enableGridX={false}
        enableGridY={true}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 0,
          tickPadding: 8,
          tickRotation: 0,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
          tickRotation: 0,
          tickValues: 4,
          format: (value) => {
            if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
            return value;
          },
        }}
        enableSlices="x"
        sliceTooltip={({ slice }) => {
          const point = slice.points[0];
          return (
            <div className="bg-[#0A0A0A] border border-[#1F1F1F] px-3 py-2 rounded shadow-lg">
              <div className="text-xs font-mono" style={{ color: accentColor }}>
                {point.data.x}: {point.data.y} {unit}
              </div>
            </div>
          );
        }}
        markers={[
          {
            axis: 'y',
            value: monthlyTarget,
            lineStyle: {
              stroke: '#6B6B6B',
              strokeWidth: 1,
              strokeDasharray: '4,4',
            },
            legend: 'target',
            legendPosition: 'right',
            textStyle: {
              fill: '#6B6B6B',
              fontSize: 9,
            },
          },
        ]}
        animate={true}
        motionConfig="gentle"
      />
    </div>
  );
};

export default MonthlyChart;
