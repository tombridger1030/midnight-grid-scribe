import { mcTokens } from "@/styles/mission-control-tokens";
import { PanelHeader } from "./PanelHeader";
import { Sparkline } from "./Sparkline";

interface TrendInfo {
  label: string;
  color: string;
}

interface VitalsReadoutProps {
  hrv: number | null;
  restingHR: number | null;
  strain: number | null;
  calories: number | null;
  hrvTrend: TrendInfo;
  hrTrend: TrendInfo;
  hrvSpark: number[];
  rhrSpark: number[];
  hrvAvg: number | null;
  rhrAvg: number | null;
  strainAvg: number | null;
  calAvg: number | null;
}

interface VitalRow {
  label: string;
  value: number | null;
  unit?: string;
  trend?: TrendInfo;
}

function formatValue(v: number | null): string {
  if (v === null) return "--";
  if (v >= 1000) return Math.round(v).toLocaleString();
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(1);
}

function formatAvg(v: number | null, unit?: string): string {
  if (v === null) return "--";
  const rounded = v >= 1000 ? Math.round(v).toLocaleString() : Math.round(v);
  return unit ? `${rounded}${unit}` : String(rounded);
}

export function VitalsReadout({
  hrv,
  restingHR,
  strain,
  calories,
  hrvTrend,
  hrTrend,
  hrvSpark,
  rhrSpark,
  hrvAvg,
  rhrAvg,
  strainAvg,
  calAvg,
}: VitalsReadoutProps) {
  const allNull =
    hrv === null && restingHR === null && strain === null && calories === null;
  const headerStatus = allNull ? "inactive" : "nominal";

  const rows: (VitalRow & {
    sparkData?: number[];
    sparkColor?: string;
    avg?: number | null;
    avgUnit?: string;
  })[] = [
    {
      label: "HRV",
      value: hrv,
      unit: "ms",
      trend: hrvTrend,
      sparkData: hrvSpark,
      sparkColor: mcTokens.colors.accent.cyan,
      avg: hrvAvg,
      avgUnit: "ms",
    },
    {
      label: "RHR",
      value: restingHR,
      unit: "bpm",
      trend: hrTrend,
      sparkData: rhrSpark,
      sparkColor: mcTokens.colors.accent.teal,
      avg: rhrAvg,
      avgUnit: "bpm",
    },
    {
      label: "STRAIN",
      value: strain,
      avg: strainAvg,
    },
    {
      label: "CAL",
      value: calories,
      avg: calAvg,
    },
  ];

  const avgLabelStyle: React.CSSProperties = {
    fontSize: "9px",
    fontFamily: mcTokens.typography.fontFamily,
    color: mcTokens.colors.text.dim,
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    textAlign: "right",
    paddingBottom: "2px",
  };

  return (
    <div style={{ height: "100%" }}>
      <PanelHeader title="VITALS READOUT" status={headerStatus} />
      {rows.map((row, i) => (
        <div
          key={row.label}
          style={{
            borderBottom:
              i < rows.length - 1
                ? `1px solid ${mcTokens.colors.border.subtle}`
                : "none",
            fontFamily: mcTokens.typography.fontFamily,
            paddingBottom: row.sparkData ? "2px" : "0",
          }}
        >
          {/* Main row: label + value */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              padding: "3px 0",
            }}
          >
            {/* Label */}
            <span
              style={{
                color: mcTokens.colors.accent.teal,
                fontSize: mcTokens.typography.label.size,
                fontWeight: mcTokens.typography.label.weight,
                letterSpacing: mcTokens.typography.label.letterSpacing,
                textTransform: mcTokens.typography.label.textTransform,
                minWidth: 50,
              }}
            >
              {row.label}
            </span>
            {/* Value + Unit + Trend */}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "4px",
                minWidth: 80,
                justifyContent: "flex-end",
              }}
            >
              <span
                style={{
                  color: mcTokens.colors.text.primary,
                  fontSize: mcTokens.typography.metric.size,
                  fontWeight: mcTokens.typography.metric.weight,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatValue(row.value)}
              </span>
              {row.unit && (
                <span
                  style={{
                    color: mcTokens.colors.text.secondary,
                    fontSize: "11px",
                  }}
                >
                  {row.unit}
                </span>
              )}
              {row.trend && (
                <span
                  style={{
                    color: row.trend.color,
                    fontSize: "11px",
                  }}
                >
                  {row.trend.label}
                </span>
              )}
            </div>
          </div>
          {/* Mini sparkline for HRV and RHR */}
          {row.sparkData && row.sparkData.length >= 2 && (
            <div style={{ height: 30, marginTop: "-2px" }}>
              <Sparkline
                data={row.sparkData}
                unit={row.unit}
                lineColor={row.sparkColor}
              />
            </div>
          )}
          {/* 30-day average */}
          <div style={avgLabelStyle}>
            30D AVG: {formatAvg(row.avg, row.avgUnit)}
          </div>
        </div>
      ))}
    </div>
  );
}
