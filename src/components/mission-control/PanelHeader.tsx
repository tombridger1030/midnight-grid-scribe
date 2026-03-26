import { mcTokens } from "@/styles/mission-control-tokens";

interface PanelHeaderProps {
  title: string;
  status?: "nominal" | "warning" | "error" | "inactive";
  detail?: string;
}

const statusColors: Record<string, string> = {
  nominal: "#00ff88",
  warning: "#ffb800",
  error: "#ff3366",
  inactive: "#5a7a9e",
};

export function PanelHeader({ title, status, detail }: PanelHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: `1px solid ${mcTokens.colors.border.subtle}`,
        marginBottom: mcTokens.spacing.section,
        paddingBottom: mcTokens.spacing.row,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {status && (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: statusColors[status],
              display: "inline-block",
              flexShrink: 0,
            }}
          />
        )}
        <span
          style={{
            color: mcTokens.colors.accent.teal,
            fontSize: mcTokens.typography.label.size,
            fontWeight: mcTokens.typography.label.weight,
            letterSpacing: mcTokens.typography.label.letterSpacing,
            textTransform: mcTokens.typography.label.textTransform,
            fontFamily: mcTokens.typography.fontFamily,
          }}
        >
          {title}
        </span>
      </div>
      {detail && (
        <span
          style={{
            color: mcTokens.colors.text.secondary,
            fontSize: mcTokens.typography.label.size,
            fontFamily: mcTokens.typography.fontFamily,
            textAlign: "right",
          }}
        >
          {detail}
        </span>
      )}
    </div>
  );
}
