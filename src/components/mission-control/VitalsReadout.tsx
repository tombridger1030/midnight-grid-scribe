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

// Only show sparkline if there are at least 3 distinct non-zero values
function hasEnoughData(data: number[]): boolean {
  const nonZero = data.filter((v) => v > 0);
  return nonZero.length >= 3;
}

// Only show trend if it's a real comparison (not just the absolute value)
function isRealTrend(trend: TrendInfo): boolean {
  return trend.label !== "--" && !trend.label.startsWith("+0%");
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

  const rows: {
    label: string;
    value: number | null;
    unit?: string;
    trend?: TrendInfo;
    sparkData?: number[];
    sparkColor?: string;
    avg: number | null;
    avgUnit?: string;
  }[] = [
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

  return (
    <div style={{ height: "100%" }}>
      <PanelHeader title="VITALS READOUT" status={headerStatus} />
      {rows.map((row, i) => {
        const showSpark = row.sparkData && hasEnoughData(row.sparkData);
        const showTrend = row.trend && isRealTrend(row.trend);

        return (
          <div
            key={row.label}
            style={{
              borderBottom:
                i < rows.length - 1
                  ? `1px solid ${mcTokens.colors.border.subtle}`
                  : "none",
              fontFamily: mcTokens.typography.fontFamily,
              padding: "2px 0",
            }}
          >
            {/* Main row: label + value + avg */}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span
                  style={{
                    color: mcTokens.colors.accent.teal,
                    fontSize: mcTokens.typography.label.size,
                    fontWeight: mcTokens.typography.label.weight,
                    letterSpacing: mcTokens.typography.label.letterSpacing,
                    textTransform: mcTokens.typography.label.textTransform,
                    minWidth: 46,
                  }}
                >
                  {row.label}
                </span>
                <span
                  style={{
                    fontSize: "8px",
                    color: mcTokens.colors.text.dim,
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                  }}
                >
                  AVG {formatAvg(row.avg, row.avgUnit)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "4px",
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
                      fontSize: "10px",
                    }}
                  >
                    {row.unit}
                  </span>
                )}
                {showTrend && row.trend && (
                  <span style={{ color: row.trend.color, fontSize: "10px" }}>
                    {row.trend.label}
                  </span>
                )}
              </div>
            </div>
            {/* Mini sparkline — only if enough data points */}
            {showSpark && row.sparkData && (
              <div style={{ height: 24, marginTop: "-1px" }}>
                <Sparkline
                  data={row.sparkData}
                  unit={row.unit}
                  lineColor={row.sparkColor}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
