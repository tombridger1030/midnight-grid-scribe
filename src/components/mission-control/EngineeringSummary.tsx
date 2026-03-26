"use client";

import { mcTokens } from "@/styles/mission-control-tokens";
import { PanelHeader } from "./PanelHeader";

interface EngSummaryProps {
  monthCommits: number;
  weekCommits: number;
  weekTrend: { label: string; color: string };
  totalPRsCreated: number;
  totalPRsMerged: number;
  shipDays: number;
  totalDaysThisMonth: number;
  monthLinesAdded: number;
  monthLinesDeleted: number;
}

const labelStyle: React.CSSProperties = {
  fontFamily: mcTokens.typography.fontFamily,
  fontSize: mcTokens.typography.label.size,
  fontWeight: mcTokens.typography.label.weight,
  letterSpacing: mcTokens.typography.label.letterSpacing,
  textTransform: mcTokens.typography.label.textTransform,
  color: mcTokens.colors.text.secondary,
};

const metricStyle: React.CSSProperties = {
  fontFamily: mcTokens.typography.fontFamily,
  fontSize: mcTokens.typography.metric.size,
  fontWeight: mcTokens.typography.metric.weight,
  color: mcTokens.colors.text.primary,
};

export const EngineeringSummary: React.FC<EngSummaryProps> = ({
  monthCommits,
  weekCommits,
  weekTrend,
  totalPRsCreated,
  totalPRsMerged,
  shipDays,
  totalDaysThisMonth,
  monthLinesAdded,
  monthLinesDeleted,
}) => {
  const shipPct =
    totalDaysThisMonth > 0
      ? Math.round((shipDays / totalDaysThisMonth) * 100)
      : 0;
  const prRate =
    totalPRsCreated > 0
      ? Math.round((totalPRsMerged / totalPRsCreated) * 100)
      : 0;

  const gridRows: {
    label: string;
    value: string;
    detail: string;
    detailColor?: string;
  }[] = [
    {
      label: "THIS WEEK",
      value: String(weekCommits),
      detail: weekTrend.label,
      detailColor: weekTrend.color,
    },
    {
      label: "SHIP DAYS",
      value: `${shipDays}/${totalDaysThisMonth}`,
      detail: `(${shipPct}%)`,
    },
    {
      label: "PRS",
      value: `${totalPRsCreated}/${totalPRsMerged}`,
      detail: `(${prRate}%)`,
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <PanelHeader title="ENGINEERING OUTPUT" status="nominal" />

      {/* Hero number */}
      <div
        style={{
          fontFamily: mcTokens.typography.fontFamily,
          fontSize: mcTokens.typography.hero.size,
          fontWeight: mcTokens.typography.hero.weight,
          lineHeight: mcTokens.typography.hero.lineHeight,
          color: mcTokens.colors.accent.cyan,
          marginBottom: "2px",
        }}
      >
        {monthCommits.toLocaleString()}
      </div>

      {/* Hero label */}
      <div style={{ ...labelStyle, marginBottom: mcTokens.spacing.row }}>
        COMMITS THIS MONTH
      </div>

      {/* Metric grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          rowGap: mcTokens.spacing.row,
          marginBottom: mcTokens.spacing.row,
        }}
      >
        {gridRows.map((row) => (
          <div key={row.label} style={{ display: "contents" }}>
            <div>
              <div style={labelStyle}>{row.label}</div>
              <span style={metricStyle}>{row.value}</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "flex-end",
              }}
            >
              <span
                style={{
                  ...labelStyle,
                  color: row.detailColor ?? mcTokens.colors.text.secondary,
                }}
              >
                {row.detail}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* LoC row */}
      <div
        style={{
          borderTop: `1px solid ${mcTokens.colors.border.subtle}`,
          paddingTop: mcTokens.spacing.row,
          fontFamily: mcTokens.typography.fontFamily,
          fontSize: mcTokens.typography.body.size,
        }}
      >
        <span style={{ color: mcTokens.colors.status.green }}>
          +{monthLinesAdded.toLocaleString()}
        </span>
        <span style={{ color: mcTokens.colors.text.secondary }}> / </span>
        <span style={{ color: mcTokens.colors.status.red }}>
          -{monthLinesDeleted.toLocaleString()}
        </span>
      </div>
    </div>
  );
};
