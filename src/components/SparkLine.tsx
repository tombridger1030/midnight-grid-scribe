
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

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // If no data or all values are NaN, show a flat line
    if (data.length === 0 || data.every(isNaN)) {
      ctx.beginPath();
      ctx.strokeStyle = '#888888';
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      return;
    }

    // Filter out NaN values
    const validData = data.filter(val => !isNaN(val));
    
    if (validData.length === 0) return;

    // Calculate min and max
    const min = Math.min(...validData);
    const max = Math.max(...validData);
    
    // If min equals max, create a flat line at that value
    if (min === max) {
      ctx.beginPath();
      ctx.strokeStyle = '#CFCFCF';
      const y = canvas.height / 2;
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
      return;
    }

    // Calculate points
    const points = data.map((value, i) => {
      const x = (i / (data.length - 1)) * canvas.width;
      
      // Handle NaN values by using previous or next valid value
      let y;
      if (isNaN(value)) {
        // Find previous valid value
        let prevValue = null;
        for (let j = i - 1; j >= 0; j--) {
          if (!isNaN(data[j])) {
            prevValue = data[j];
            break;
          }
        }
        
        // Find next valid value
        let nextValue = null;
        for (let j = i + 1; j < data.length; j++) {
          if (!isNaN(data[j])) {
            nextValue = data[j];
            break;
          }
        }
        
        // Interpolate or use available value
        if (prevValue !== null && nextValue !== null) {
          value = (prevValue + nextValue) / 2;
        } else if (prevValue !== null) {
          value = prevValue;
        } else if (nextValue !== null) {
          value = nextValue;
        } else {
          value = 0; // Fallback
        }
      }
      
      // Calculate y position with 10% padding
      const range = max - min;
      const padding = range * 0.1;
      const normalizedValue = (value - min + padding) / (range + padding * 2);
      y = (1 - normalizedValue) * canvas.height;
      
      return { x, y };
    });

    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = '#CFCFCF';
    ctx.lineWidth = 1;
    
    points.forEach((point, i) => {
      if (i === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    
    ctx.stroke();
  }, [data]);

  return (
    <canvas ref={canvasRef} width={80} height={20} className="spark-line" />
  );
};

export default SparkLine;
