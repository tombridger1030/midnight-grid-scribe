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
    const valid = sleepSpark.filter((v) => v > 0);
    if (valid.length === 0) return null;
    const sum = valid.reduce((a, b) => a + b, 0);
    return (sum / valid.length).toFixed(1);
  }, [sleepSpark]);

  const hasData = sleepHours !== null;

  return (
    <div style={{ height: "100%" }}>
      <PanelHeader title="SLEEP ANALYSIS" />
      {/* Main stat */}
      <div
        style={{
          fontFamily: mcTokens.typography.fontFamily,
          marginBottom: "2px",
        }}
      >
        {hasData ? (
          <>
            <span
              style={{
                color: mcTokens.colors.text.primary,
                fontSize: mcTokens.typography.hero.size,
                fontWeight: mcTokens.typography.hero.weight,
                lineHeight: mcTokens.typography.hero.lineHeight,
              }}
            >
              {sleepHours !== null ? sleepHours.toFixed(1) : "--"}
            </span>
            <span
              style={{
                color: mcTokens.colors.text.secondary,
                fontSize: "14px",
                marginLeft: "2px",
              }}
            >
              h
            </span>
          </>
        ) : (
          <span
            style={{
              color: mcTokens.colors.text.secondary,
              fontSize: mcTokens.typography.metric.size,
              fontWeight: mcTokens.typography.metric.weight,
              letterSpacing: "2px",
            }}
          >
            NO DATA
          </span>
        )}
      </div>
      {/* Efficiency */}
      <div
        style={{
          fontFamily: mcTokens.typography.fontFamily,
          fontSize: "11px",
          color: mcTokens.colors.text.secondary,
          marginBottom: mcTokens.spacing.row,
        }}
      >
        {sleepEfficiency !== null
          ? `${Math.round(sleepEfficiency)}% efficiency`
          : "-- efficiency"}
      </div>
      {/* Progress bar */}
      <div style={{ position: "relative", marginBottom: mcTokens.spacing.row }}>
        <div
          style={{
            textAlign: "right",
            fontSize: "9px",
            fontFamily: mcTokens.typography.fontFamily,
            color: mcTokens.colors.text.dim,
            marginBottom: "1px",
          }}
        >
          8h
        </div>
        <div
          style={{
            width: "100%",
            height: 6,
            backgroundColor: mcTokens.colors.border.default,
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${fillPercent}%`,
              height: "100%",
              backgroundColor: mcTokens.colors.accent.cyan,
              borderRadius: 3,
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
