"use client";

import { useMemo, useState } from "react";
import { mcTokens } from "@/styles/mission-control-tokens";
import { PanelHeader } from "./PanelHeader";

interface CommitRow {
  date: string;
  repo_name: string;
  commit_count: number;
}

interface CommitHeatmapProps {
  commits: CommitRow[];
}

function getCellColor(count: number): string {
  if (count === 0) return mcTokens.colors.heatmap.empty;
  if (count <= 3) return mcTokens.colors.heatmap.low;
  if (count <= 10) return mcTokens.colors.heatmap.medium;
  return mcTokens.colors.heatmap.high;
}

function formatDateLabel(date: Date): string {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SHOW_DAY_LABELS = new Set([1, 3, 5]); // Mon, Wed, Fri

export const CommitHeatmap: React.FC<CommitHeatmapProps> = ({ commits }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const { days, maxCount } = useMemo(() => {
    // Aggregate commits per date
    const dateMap = new Map<string, number>();
    for (const row of commits) {
      dateMap.set(row.date, (dateMap.get(row.date) ?? 0) + row.commit_count);
    }

    // Generate last 30 days
    const result: { date: Date; dateStr: string; count: number }[] = [];
    const now = new Date();
    let peak = 0;

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const count = dateMap.get(key) ?? 0;
      if (count > peak) peak = count;
      result.push({ date: d, dateStr: key, count });
    }

    return { days: result, maxCount: peak };
  }, [commits]);

  // Suppress unused variable lint — maxCount available for future threshold tuning
  void maxCount;

  return (
    <div
      style={{
        ...mcTokens.panel,
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <PanelHeader title="COMMIT ACTIVITY" status="nominal" />

      <div style={{ display: "flex", gap: "6px", flex: 1 }}>
        {/* Day labels column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "3px",
            justifyContent: "center",
          }}
        >
          {Array.from({ length: 7 }, (_, i) => (
            <div
              key={i}
              style={{
                height: 0,
                flex: 1,
                display: "flex",
                alignItems: "center",
                fontFamily: mcTokens.typography.fontFamily,
                fontSize: mcTokens.typography.tiny.size,
                letterSpacing: mcTokens.typography.tiny.letterSpacing,
                color: mcTokens.colors.text.secondary,
                width: "28px",
              }}
            >
              {SHOW_DAY_LABELS.has(i) ? DAY_LABELS[i] : ""}
            </div>
          ))}
        </div>

        {/* Heatmap grid */}
        <div style={{ position: "relative", flex: 1 }}>
          <div
            style={{
              display: "grid",
              gridTemplateRows: "repeat(7, 1fr)",
              gridAutoFlow: "column",
              gridAutoColumns: "1fr",
              gap: "3px",
              height: "100%",
            }}
          >
            {days.map((day, idx) => (
              <div
                key={day.dateStr}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{
                  borderRadius: 3,
                  aspectRatio: "1",
                  backgroundColor: getCellColor(day.count),
                  cursor: "pointer",
                  position: "relative",
                }}
              >
                {hoveredIdx === idx && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "100%",
                      left: "50%",
                      transform: "translateX(-50%)",
                      marginBottom: 4,
                      padding: "4px 8px",
                      background: mcTokens.colors.bg.elevated,
                      border: `1px solid ${mcTokens.colors.border.default}`,
                      borderRadius: 2,
                      fontFamily: mcTokens.typography.fontFamily,
                      fontSize: mcTokens.typography.tiny.size,
                      letterSpacing: mcTokens.typography.tiny.letterSpacing,
                      color: mcTokens.colors.text.primary,
                      whiteSpace: "nowrap",
                      zIndex: 10,
                      pointerEvents: "none",
                    }}
                  >
                    {formatDateLabel(day.date)}: {day.count} commit
                    {day.count !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
