import { mcTokens } from "@/styles/mission-control-tokens";

interface TrajectoryBarProps {
  engPrediction: { text: string } | null;
  healthPrediction: { text: string } | null;
}

export function TrajectoryBar({
  engPrediction,
  healthPrediction,
}: TrajectoryBarProps) {
  const sectionLabelStyle: React.CSSProperties = {
    color: mcTokens.colors.accent.teal,
    fontSize: mcTokens.typography.label.size,
    fontWeight: mcTokens.typography.label.weight,
    letterSpacing: mcTokens.typography.label.letterSpacing,
    textTransform: mcTokens.typography.label.textTransform,
    fontFamily: mcTokens.typography.fontFamily,
    marginRight: "8px",
    flexShrink: 0,
  };

  const textStyle: React.CSSProperties = {
    color: mcTokens.colors.text.primary,
    fontSize: "11px",
    fontFamily: mcTokens.typography.fontFamily,
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        backgroundColor: mcTokens.colors.bg.timer,
        borderTop: `1px solid ${mcTokens.colors.border.default}`,
        padding: "8px 12px",
        fontFamily: mcTokens.typography.fontFamily,
        fontSize: "11px",
      }}
    >
      {/* Trajectory section */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flex: 1,
          minWidth: 0,
        }}
      >
        <span style={sectionLabelStyle}>TRAJECTORY</span>
        <span style={textStyle}>
          {engPrediction ? engPrediction.text : "Collecting data..."}
        </span>
      </div>
      {/* Divider */}
      <div
        style={{
          width: 1,
          alignSelf: "stretch",
          backgroundColor: mcTokens.colors.border.default,
          margin: "0 12px",
          flexShrink: 0,
        }}
      />
      {/* Health section */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flex: 1,
          minWidth: 0,
        }}
      >
        <span style={sectionLabelStyle}>HEALTH</span>
        <span style={textStyle}>
          {healthPrediction
            ? healthPrediction.text
            : "Connect Whoop for health predictions"}
        </span>
      </div>
    </div>
  );
}
