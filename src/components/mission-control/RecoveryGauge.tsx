import { mcTokens } from "@/styles/mission-control-tokens";
import { PanelHeader } from "./PanelHeader";

interface RecoveryGaugeProps {
  recovery: number | null;
  hrv: number | null;
  strain: number | null;
  sleepHours: number | null;
  whoopConnected: boolean;
}

function getRecoveryColor(recovery: number | null): string {
  if (recovery === null) return mcTokens.colors.text.secondary;
  if (recovery >= 67) return mcTokens.colors.gauge.green;
  if (recovery >= 34) return mcTokens.colors.gauge.amber;
  return mcTokens.colors.gauge.red;
}

function getHeaderStatus(
  recovery: number | null,
): "nominal" | "warning" | "error" | "inactive" {
  if (recovery === null) return "inactive";
  if (recovery >= 67) return "nominal";
  if (recovery >= 34) return "warning";
  return "error";
}

const CIRCUMFERENCE = 2 * Math.PI * 75;

export function RecoveryGauge({
  recovery,
  hrv,
  strain,
  sleepHours,
  whoopConnected,
}: RecoveryGaugeProps) {
  const offset =
    recovery !== null ? CIRCUMFERENCE * (1 - recovery / 100) : CIRCUMFERENCE;

  const ringColor = getRecoveryColor(recovery);

  const miniStatStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    flex: 1,
  };

  const miniLabelStyle: React.CSSProperties = {
    fontSize: "10px",
    fontFamily: mcTokens.typography.fontFamily,
    color: mcTokens.colors.text.secondary,
    letterSpacing: "1px",
    textTransform: "uppercase",
  };

  const miniValueStyle: React.CSSProperties = {
    fontSize: "10px",
    fontFamily: mcTokens.typography.fontFamily,
    color: mcTokens.colors.text.primary,
  };

  const separatorStyle: React.CSSProperties = {
    width: 1,
    backgroundColor: mcTokens.colors.border.subtle,
    alignSelf: "stretch",
  };

  if (!whoopConnected) {
    return (
      <div style={{ height: "100%" }}>
        <PanelHeader title="RECOVERY" status="inactive" />
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "4px 0",
          }}
        >
          <svg viewBox="0 0 200 200" style={{ width: 110, height: 110 }}>
            <circle
              cx={100}
              cy={100}
              r={75}
              stroke={mcTokens.colors.gauge.track}
              strokeWidth={8}
              fill="none"
              strokeDasharray="8 4"
            />
            <text
              x={100}
              y={100}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={mcTokens.colors.text.secondary}
              fontSize="12"
              fontFamily={mcTokens.typography.fontFamily}
            >
              CONNECT WHOOP
            </text>
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%" }}>
      <PanelHeader title="RECOVERY" status={getHeaderStatus(recovery)} />
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "2px 0",
        }}
      >
        <svg viewBox="0 0 200 200" style={{ width: 110, height: 110 }}>
          {/* Track */}
          <circle
            cx={100}
            cy={100}
            r={75}
            stroke={mcTokens.colors.gauge.track}
            strokeWidth={8}
            fill="none"
          />
          {/* Fill */}
          <circle
            cx={100}
            cy={100}
            r={75}
            stroke={ringColor}
            strokeWidth={8}
            fill="none"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 100 100)"
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
          {/* Center text */}
          {recovery !== null ? (
            <>
              <text
                x={100}
                y={95}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={mcTokens.colors.accent.cyan}
                fontSize="36"
                fontFamily={mcTokens.typography.fontFamily}
                fontWeight="300"
              >
                {Math.round(recovery)}
              </text>
              <text
                x={100}
                y={120}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={mcTokens.colors.text.secondary}
                fontSize="16"
                fontFamily={mcTokens.typography.fontFamily}
              >
                %
              </text>
            </>
          ) : (
            <text
              x={100}
              y={100}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={mcTokens.colors.text.secondary}
              fontSize="36"
              fontFamily={mcTokens.typography.fontFamily}
              fontWeight="300"
            >
              -- %
            </text>
          )}
        </svg>
      </div>
      {/* Mini stats row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 0,
          marginTop: "2px",
        }}
      >
        <div style={miniStatStyle}>
          <span style={miniLabelStyle}>HRV</span>
          <span style={miniValueStyle}>
            {hrv !== null ? Math.round(hrv) : "--"}
            <span style={{ color: mcTokens.colors.text.secondary }}> ms</span>
          </span>
        </div>
        <div style={separatorStyle} />
        <div style={miniStatStyle}>
          <span style={miniLabelStyle}>STRAIN</span>
          <span style={miniValueStyle}>
            {strain !== null ? strain.toFixed(1) : "--"}
          </span>
        </div>
        <div style={separatorStyle} />
        <div style={miniStatStyle}>
          <span style={miniLabelStyle}>SLEEP</span>
          <span style={miniValueStyle}>
            {sleepHours !== null ? sleepHours.toFixed(1) : "--"}
            <span style={{ color: mcTokens.colors.text.secondary }}> h</span>
          </span>
        </div>
      </div>
    </div>
  );
}
