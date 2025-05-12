import React, { useEffect, useRef } from 'react';
import { HABIT_COLORS, HABIT_METRICS } from '@/lib/chartUtils';

interface StackedSparkLineProps {
  habitData: Record<string, number[]>;
  otherData?: {
    id: string;
    values: number[];
    rollingAvg: number[];
  };
}

const StackedSparkLine: React.FC<StackedSparkLineProps> = ({ habitData, otherData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get colors from CSS
    const rootStyles = getComputedStyle(document.documentElement);
    const accentCyan = rootStyles.getPropertyValue('--accent-cyan').trim() || '#00FFF0';

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 0.9;

    // Check if we have valid data
    const dataLength = Object.values(habitData)[0]?.length || 0;
    if (dataLength === 0) {
      // Draw a flat line if no data
      ctx.strokeStyle = accentCyan;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      return;
    }

    // Find max values for each metric to scale the lines
    const maxValues: Record<string, number> = {};
    HABIT_METRICS.forEach(metricId => {
      const metricData = habitData[metricId] || [];
      maxValues[metricId] = Math.max(...metricData, 1); // Prevent division by zero
    });

    // Draw cumulative lines for each habit metric
    HABIT_METRICS.forEach(metricId => {
      const metricData = habitData[metricId] || new Array(dataLength).fill(0);
      const color = HABIT_COLORS[metricId as keyof typeof HABIT_COLORS] || accentCyan;
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      
      metricData.forEach((value, i) => {
        const x = (i / (dataLength - 1)) * canvas.width;
        const y = canvas.height - (value / maxValues[metricId]) * canvas.height * 0.9;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      
      ctx.stroke();
    });

    // Draw the rolling average line if available
    if (otherData && otherData.rollingAvg && otherData.rollingAvg.length > 0) {
      const maxAvg = Math.max(...otherData.rollingAvg, 1);
      
      ctx.strokeStyle = accentCyan;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      
      otherData.rollingAvg.forEach((avg, i) => {
        const x = (i / (otherData.rollingAvg.length - 1)) * canvas.width;
        const y = canvas.height - (avg / maxAvg) * canvas.height * 0.6; // Scale to 60% of canvas height
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      
      ctx.stroke();
    }

  }, [habitData, otherData]);

  return <canvas ref={canvasRef} width={80} height={20} className="spark-line" />;
};

export default StackedSparkLine; 