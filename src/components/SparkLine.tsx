import React, { useEffect, useRef } from 'react';

interface SparkLineProps {
  data: number[];
}

const SparkLine: React.FC<SparkLineProps> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get accent-cyan color from CSS
    const rootStyles = getComputedStyle(document.documentElement);
    const accentCyan = rootStyles.getPropertyValue('--accent-cyan').trim() || '#00FFF0';

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = accentCyan;

    // If no data or all values are NaN, show a flat line
    if (data.length === 0 || data.every(isNaN)) {
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      return;
    }

    // Filter out NaN values
    const validData = data.filter(val => !isNaN(val));
    if (validData.length === 0) return;

    const min = Math.min(...validData);
    const max = Math.max(...validData);
    
    const points = data.map((value, i) => {
      let val = value;
      if (isNaN(val)) {
        // interpolation logic omitted for brevity
        val = 0;
      }
      const range = max - min;
      const padding = range * 0.1;
      const normalizedValue = (val - min + padding) / (range + padding * 2);
      const y = (1 - normalizedValue) * canvas.height;
      const x = (i / (data.length - 1)) * canvas.width;
      return { x, y };
    });

    // Draw line
    ctx.beginPath();
    ctx.lineWidth = 1;
    points.forEach((point, i) => {
      if (i === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
  }, [data]);

  return <canvas ref={canvasRef} width={80} height={20} className="spark-line" />;
};

export default SparkLine;
