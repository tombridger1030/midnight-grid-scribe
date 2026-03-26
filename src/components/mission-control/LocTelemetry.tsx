import { useMemo, useState } from "react";
import { mcTokens } from "@/styles/mission-control-tokens";
import { PanelHeader } from "./PanelHeader";

interface CommitRow {
  date: string;
  repo_name: string;
  commit_count: number;
  lines_added: number;
  lines_deleted: number;
}

interface LocTelemetryProps {
  commits: CommitRow[];
}

interface DayData {
  date: string;
  added: number;
  deleted: number;
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function LocTelemetry({ commits }: LocTelemetryProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const days = useMemo(() => {
    const now = new Date();
    const result: DayData[] = [];
    const map = new Map<string, { added: number; deleted: number }>();

    for (const row of commits) {
      let entry = map.get(row.date);
      if (!entry) {
        entry = { added: 0, deleted: 0 };
        map.set(row.date, entry);
      }
      entry.added += row.lines_added;
      entry.deleted += row.lines_deleted;
    }

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const entry = map.get(dateStr);
      result.push({
        date: dateStr,
        added: entry?.added ?? 0,
        deleted: entry?.deleted ?? 0,
      });
    }

    return result;
  }, [commits]);

  const netTotal = useMemo(() => {
    return days.reduce((sum, d) => sum + d.added - d.deleted, 0);
  }, [days]);

  const w = 400;
  const h = 60;

  const allValues = days.flatMap((d) => [d.added, d.deleted]);
  const max = Math.max(...allValues, 1);
  const step = w / (days.length - 1);

  const toY = (v: number) => h - (v / max) * (h - 4) - 2;

  const addedLine = days.map((d, i) => `${i * step},${toY(d.added)}`).join(" ");
  const deletedLine = days
    .map((d, i) => `${i * step},${toY(d.deleted)}`)
    .join(" ");

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) / rect.width;
    const idx = Math.round(relativeX * (days.length - 1));
    const clamped = Math.max(0, Math.min(days.length - 1, idx));
    setHoverIndex(clamped);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const hoverX = hoverIndex !== null ? hoverIndex * step : 0;
  const tooltipFlip = hoverIndex !== null && hoverIndex > days.length * 0.75;

  return (
    <div>
      <PanelHeader title="LoC TELEMETRY" />
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
          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1={0}
              y1={h * f}
              x2={w}
              y2={h * f}
              stroke={mcTokens.colors.border.subtle}
              strokeWidth={0.5}
            />
          ))}
          {/* Lines added */}
          <polyline
            points={addedLine}
            fill="none"
            stroke="#00ff88"
            strokeWidth={1.5}
          />
          {/* Lines deleted */}
          <polyline
            points={deletedLine}
            fill="none"
            stroke="#ff3366"
            strokeWidth={1.5}
          />
          {/* Hover crosshair */}
          {hoverIndex !== null && (
            <>
              <line
                x1={hoverX}
                y1={0}
                x2={hoverX}
                y2={h}
                stroke={mcTokens.colors.text.dim}
                strokeWidth={1}
                strokeDasharray="2,2"
              />
              <circle
                cx={hoverX}
                cy={toY(days[hoverIndex].added)}
                r={3}
                fill="#00ff88"
                stroke={mcTokens.colors.bg.primary}
                strokeWidth={1}
              />
              <circle
                cx={hoverX}
                cy={toY(days[hoverIndex].deleted)}
                r={3}
                fill="#ff3366"
                stroke={mcTokens.colors.bg.primary}
                strokeWidth={1}
              />
            </>
          )}
        </svg>
        {/* Tooltip */}
        {hoverIndex !== null && (
          <div
            style={{
              position: "absolute",
              top: -8,
              left: tooltipFlip
                ? `calc(${(hoverX / w) * 100}% - 140px)`
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
            {formatDate(days[hoverIndex].date)}:{" "}
            <span style={{ color: "#00ff88" }}>
              +{formatNumber(days[hoverIndex].added)}
            </span>
            {" / "}
            <span style={{ color: "#ff3366" }}>
              -{formatNumber(days[hoverIndex].deleted)}
            </span>
          </div>
        )}
      </div>
      {/* Net summary */}
      <div
        style={{
          marginTop: "4px",
          fontSize: "11px",
          fontFamily: mcTokens.typography.fontFamily,
          color: mcTokens.colors.text.secondary,
        }}
      >
        NET:{" "}
        <span
          style={{
            color:
              netTotal >= 0
                ? mcTokens.colors.status.green
                : mcTokens.colors.status.red,
          }}
        >
          {netTotal >= 0 ? "+" : ""}
          {formatNumber(netTotal)}
        </span>
      </div>
    </div>
  );
}
