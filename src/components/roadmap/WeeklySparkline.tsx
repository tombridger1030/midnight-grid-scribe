/**
 * WeeklySparkline Component
 * 
 * Mini sparkline chart showing last 4 weeks of data.
 * Uses accent color passed from parent for consistency.
 */

import React from 'react';
import { ResponsiveLine } from '@nivo/line';

interface WeeklySparklineProps {
  weeklyData: number[];
  target: number;
  accentColor?: string;
}

const WeeklySparkline: React.FC<WeeklySparklineProps> = ({ 
  weeklyData, 
  target,
  accentColor = '#00F0FF'
}) => {
  // Ensure we have 4 data points
  const data = [...weeklyData].slice(-4);
  while (data.length < 4) {
    data.unshift(0);
  }

  // Use accent color for line, or red if trending down
  const isUpward = data.length >= 2 && data[data.length - 1] >= data[data.length - 2];
  const lineColor = isUpward ? accentColor : '#FF6B6B';

  const chartData = [
    {
      id: 'weekly',
      data: data.map((value, index) => ({
        x: index,
        y: value,
      })),
    },
  ];

  return (
    <div className="w-20 h-6">
      <ResponsiveLine
        data={chartData}
        margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
        xScale={{ type: 'linear', min: 0, max: 3 }}
        yScale={{ type: 'linear', min: 0, max: Math.max(target * 1.2, ...data) }}
        curve="monotoneX"
        enableArea={false}
        enablePoints={false}
        enableGridX={false}
        enableGridY={false}
        axisTop={null}
        axisRight={null}
        axisBottom={null}
        axisLeft={null}
        colors={[lineColor]}
        lineWidth={1.5}
        isInteractive={false}
        animate={true}
        motionConfig="gentle"
        markers={[
          {
            axis: 'y',
            value: target,
            lineStyle: {
              stroke: accentColor,
              strokeWidth: 1,
              strokeDasharray: '2,2',
              strokeOpacity: 0.3,
            },
          },
        ]}
      />
    </div>
  );
};

export default WeeklySparkline;
