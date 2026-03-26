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
}

interface VitalRow {
  label: string;
  value: number | null;
  unit?: string;
  trend?: TrendInfo;
}

function formatValue(v: number | null): string {
  if (v === null) return "--";
  if (v >= 1000) return v.toLocaleString();
  return String(v);
}

export function VitalsReadout({
  hrv,
  restingHR,
  strain,
  calories,
  hrvTrend,
  hrTrend,
}: VitalsReadoutProps) {
  const allNull =
    hrv === null && restingHR === null && strain === null && calories === null;
  const headerStatus = allNull ? "inactive" : "nominal";

  const rows: VitalRow[] = [
    { label: "HRV", value: hrv, unit: "ms", trend: hrvTrend },
    { label: "RHR", value: restingHR, unit: "bpm", trend: hrTrend },
    { label: "STRAIN", value: strain },
    { label: "CAL", value: calories },
  ];

  return (
    <div style={{ height: "100%" }}>
      <PanelHeader title="VITALS READOUT" status={headerStatus} />
      {rows.map((row, i) => (
        <div
          key={row.label}
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            padding: `3px 0`,
            borderBottom:
              i < rows.length - 1
                ? `1px solid ${mcTokens.colors.border.subtle}`
                : "none",
            fontFamily: mcTokens.typography.fontFamily,
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
      ))}
    </div>
  );
}
