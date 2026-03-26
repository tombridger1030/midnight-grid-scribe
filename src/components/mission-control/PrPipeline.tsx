import { mcTokens } from "@/styles/mission-control-tokens";
import { PanelHeader } from "./PanelHeader";

interface PrPipelineProps {
  totalPRsCreated: number;
  totalPRsMerged: number;
}

export function PrPipeline({
  totalPRsCreated,
  totalPRsMerged,
}: PrPipelineProps) {
  const mergeRate =
    totalPRsCreated > 0
      ? Math.round((totalPRsMerged / totalPRsCreated) * 100)
      : 0;
  const fillWidth =
    totalPRsCreated > 0
      ? Math.min((totalPRsMerged / totalPRsCreated) * 100, 100)
      : 0;

  const rowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: `${mcTokens.spacing.row} 0`,
    borderBottom: `1px solid ${mcTokens.colors.border.subtle}`,
    fontFamily: mcTokens.typography.fontFamily,
  };

  const labelStyle: React.CSSProperties = {
    color: mcTokens.colors.accent.teal,
    fontSize: mcTokens.typography.label.size,
    fontWeight: mcTokens.typography.label.weight,
    letterSpacing: mcTokens.typography.label.letterSpacing,
    textTransform: mcTokens.typography.label.textTransform,
  };

  const valueStyle: React.CSSProperties = {
    color: mcTokens.colors.text.primary,
    fontSize: mcTokens.typography.metric.size,
    fontWeight: mcTokens.typography.metric.weight,
  };

  return (
    <div>
      <PanelHeader title="PR PIPELINE" />
      <div style={rowStyle}>
        <span style={labelStyle}>CREATED</span>
        <span style={valueStyle}>{totalPRsCreated}</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>MERGED</span>
        <span style={valueStyle}>{totalPRsMerged}</span>
      </div>
      <div style={{ ...rowStyle, borderBottom: "none" }}>
        <span style={labelStyle}>MERGE RATE</span>
        <span style={valueStyle}>{mergeRate}%</span>
      </div>
      {/* Ratio bar */}
      <div
        style={{
          marginTop: mcTokens.spacing.row,
          height: 6,
          backgroundColor: mcTokens.colors.border.default,
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${fillWidth}%`,
            height: "100%",
            backgroundColor: mcTokens.colors.accent.cyan,
            borderRadius: 3,
            transition: "width 0.5s ease",
          }}
        />
      </div>
    </div>
  );
}
