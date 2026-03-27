import { mcTokens } from "@/styles/mission-control-tokens";
import { PanelHeader } from "./PanelHeader";

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

function formatAvg(v: number | null): string {
  if (v === null) return "--";
  return v >= 1000 ? Math.round(v).toLocaleString() : String(Math.round(v));
}

/** Tiny inline sparkline — no interactivity, just a visual hint */
function MiniSpark({ data, color }: { data: number[]; color: string }) {
  const pts = data.slice(-30).filter((v) => v > 0);
  if (pts.length < 3) return null;

  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const range = max - min || 1;
  const w = 80;
  const h = 20;
  const step = w / (pts.length - 1);

  const polyline = pts
    .map((v, i) => `${i * step},${h - ((v - min) / range) * (h - 2) - 1}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ width: 64, height: 20, display: "block", opacity: 0.7 }}
    >
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
      />
    </svg>
  );
}

// Only show trend if it's a real comparison
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
  }[] = [
    {
      label: "HRV",
      value: hrv,
      unit: "ms",
      trend: hrvTrend,
      sparkData: hrvSpark,
      sparkColor: mcTokens.colors.accent.cyan,
      avg: hrvAvg,
    },
    {
      label: "RHR",
      value: restingHR,
      unit: "bpm",
      trend: hrTrend,
      sparkData: rhrSpark,
      sparkColor: mcTokens.colors.accent.teal,
      avg: rhrAvg,
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "50px 1fr auto",
          rowGap: 0,
          alignItems: "center",
          fontFamily: mcTokens.typography.fontFamily,
        }}
      >
        {rows.map((row, i) => {
          const showTrend = row.trend && isRealTrend(row.trend);
          const borderStyle =
            i < rows.length - 1
              ? `1px solid ${mcTokens.colors.border.subtle}`
              : "none";

          return (
            <div
              key={row.label}
              style={{
                display: "contents",
              }}
            >
              {/* Column 1: Label + avg */}
              <div
                style={{
                  borderBottom: borderStyle,
                  padding: "8px 0",
                }}
              >
                <div
                  style={{
                    color: mcTokens.colors.accent.teal,
                    fontSize: mcTokens.typography.label.size,
                    fontWeight: mcTokens.typography.label.weight,
                    letterSpacing: mcTokens.typography.label.letterSpacing,
                    textTransform: mcTokens.typography.label.textTransform,
                    lineHeight: 1.2,
                  }}
                >
                  {row.label}
                </div>
                <div
                  style={{
                    fontSize: "8px",
                    color: mcTokens.colors.text.dim,
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                    marginTop: 1,
                  }}
                >
                  AVG {formatAvg(row.avg)}
                </div>
              </div>

              {/* Column 2: Mini sparkline */}
              <div
                style={{
                  borderBottom: borderStyle,
                  padding: "8px 8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {row.sparkData && row.sparkColor ? (
                  <MiniSpark data={row.sparkData} color={row.sparkColor} />
                ) : (
                  <div style={{ width: 64, height: 20 }} />
                )}
              </div>

              {/* Column 3: Value + unit + trend */}
              <div
                style={{
                  borderBottom: borderStyle,
                  padding: "8px 0",
                  textAlign: "right",
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "flex-end",
                  gap: 4,
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
                  <span
                    style={{
                      color: row.trend.color,
                      fontSize: "10px",
                      minWidth: 32,
                      textAlign: "right",
                    }}
                  >
                    {row.trend.label}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
