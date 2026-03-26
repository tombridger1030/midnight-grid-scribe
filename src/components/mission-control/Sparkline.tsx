import { useState } from "react";
import { mcTokens } from "@/styles/mission-control-tokens";

interface SparklineProps {
  data: number[];
  labels?: string[];
  unit?: string;
  lineColor?: string;
  gridColor?: string;
}

export function Sparkline({
  data,
  labels,
  unit,
  lineColor = mcTokens.colors.accent.cyan,
  gridColor = mcTokens.colors.border.subtle,
}: SparklineProps) {
  const points = data.slice(-30);
  const pointLabels = labels ? labels.slice(-30) : undefined;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (points.length < 2) return null;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const w = 400;
  const h = 60;
  const step = w / (points.length - 1);

  const polyline = points
    .map((v, i) => `${i * step},${h - ((v - min) / range) * (h - 4) - 2}`)
    .join(" ");

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) / rect.width;
    const idx = Math.round(relativeX * (points.length - 1));
    const clamped = Math.max(0, Math.min(points.length - 1, idx));
    setHoverIndex(clamped);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const hoverX = hoverIndex !== null ? hoverIndex * step : 0;
  const hoverY =
    hoverIndex !== null
      ? h - ((points[hoverIndex] - min) / range) * (h - 4) - 2
      : 0;
  const hoverValue = hoverIndex !== null ? points[hoverIndex] : 0;
  const hoverLabel =
    hoverIndex !== null && pointLabels ? pointLabels[hoverIndex] : null;

  // Tooltip positioning: flip to left side if near right edge
  const tooltipFlip = hoverIndex !== null && hoverIndex > points.length * 0.75;

  return (
    <div style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        style={{
          width: "100%",
          height: 60,
          display: "block",
          cursor: "crosshair",
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={0}
            y1={h * f}
            x2={w}
            y2={h * f}
            stroke={gridColor}
            strokeWidth={0.5}
          />
        ))}
        <polyline
          points={polyline}
          fill="none"
          stroke={lineColor}
          strokeWidth={1.5}
        />
        {hoverIndex !== null && (
          <>
            {/* Crosshair vertical line */}
            <line
              x1={hoverX}
              y1={0}
              x2={hoverX}
              y2={h}
              stroke={mcTokens.colors.text.dim}
              strokeWidth={1}
              strokeDasharray="2,2"
            />
            {/* Dot marker */}
            <circle
              cx={hoverX}
              cy={hoverY}
              r={3}
              fill={lineColor}
              stroke={mcTokens.colors.bg.primary}
              strokeWidth={1}
            />
          </>
        )}
      </svg>
      {/* Tooltip rendered outside SVG for proper text rendering */}
      {hoverIndex !== null && (
        <div
          style={{
            position: "absolute",
            top: -8,
            left: tooltipFlip
              ? `calc(${(hoverX / w) * 100}% - 120px)`
              : `calc(${(hoverX / w) * 100}% + 8px)`,
            background: mcTokens.colors.bg.panel,
            border: `1px solid ${mcTokens.colors.border.default}`,
            padding: "4px 8px",
            fontSize: "10px",
            fontFamily: mcTokens.typography.fontFamily,
            color: mcTokens.colors.text.primary,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          {hoverLabel ? `${hoverLabel}: ` : ""}
          {hoverValue}
          {unit ? ` ${unit}` : ""}
        </div>
      )}
    </div>
  );
}
