import { useMemo } from "react";
import { mcTokens } from "@/styles/mission-control-tokens";
import { PanelHeader } from "./PanelHeader";
import { Sparkline } from "./Sparkline";

interface SleepAnalysisProps {
  sleepHours: number | null;
  sleepEfficiency: number | null;
  sleepSpark: number[];
  sleepLabels: string[];
}

export function SleepAnalysis({
  sleepHours,
  sleepEfficiency,
  sleepSpark,
  sleepLabels,
}: SleepAnalysisProps) {
  const fillPercent =
    sleepHours !== null ? Math.min((sleepHours / 8) * 100, 100) : 0;

  const avg = useMemo(() => {
    if (sleepSpark.length === 0) return null;
    const sum = sleepSpark.reduce((a, b) => a + b, 0);
    return (sum / sleepSpark.length).toFixed(1);
  }, [sleepSpark]);

  return (
    <div>
      <PanelHeader title="SLEEP ANALYSIS" />
      {/* Main stat */}
      <div
        style={{
          fontFamily: mcTokens.typography.fontFamily,
          marginBottom: mcTokens.spacing.row,
        }}
      >
        <span
          style={{
            color: mcTokens.colors.text.primary,
            fontSize: mcTokens.typography.hero.size,
            fontWeight: mcTokens.typography.hero.weight,
            lineHeight: mcTokens.typography.hero.lineHeight,
          }}
        >
          {sleepHours !== null ? sleepHours : "--"}
        </span>
        <span
          style={{
            color: mcTokens.colors.text.secondary,
            fontSize: "16px",
            marginLeft: "2px",
          }}
        >
          h
        </span>
      </div>
      {/* Efficiency */}
      <div
        style={{
          fontFamily: mcTokens.typography.fontFamily,
          fontSize: "11px",
          color: mcTokens.colors.text.secondary,
          marginBottom: mcTokens.spacing.section,
        }}
      >
        {sleepEfficiency !== null
          ? `${sleepEfficiency}% efficiency`
          : "-- efficiency"}
      </div>
      {/* Progress bar */}
      <div
        style={{ position: "relative", marginBottom: mcTokens.spacing.section }}
      >
        <div
          style={{
            textAlign: "right",
            fontSize: "9px",
            fontFamily: mcTokens.typography.fontFamily,
            color: mcTokens.colors.text.dim,
            marginBottom: "2px",
          }}
        >
          8h
        </div>
        <div
          style={{
            width: "100%",
            height: 8,
            backgroundColor: mcTokens.colors.border.default,
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${fillPercent}%`,
              height: "100%",
              backgroundColor: mcTokens.colors.accent.cyan,
              borderRadius: 4,
              transition: "width 0.5s ease",
            }}
          />
        </div>
      </div>
      {/* Sparkline */}
      {sleepSpark.length >= 2 && (
        <Sparkline data={sleepSpark} labels={sleepLabels} unit="h" />
      )}
      {/* 30-day avg */}
      <div
        style={{
          marginTop: mcTokens.spacing.row,
          fontFamily: mcTokens.typography.fontFamily,
          fontSize: "11px",
          color: mcTokens.colors.text.secondary,
        }}
      >
        30-DAY AVG:{" "}
        <span style={{ color: mcTokens.colors.text.primary }}>
          {avg !== null ? `${avg}h` : "--"}
        </span>
      </div>
    </div>
  );
}
