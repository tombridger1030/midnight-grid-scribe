// SpaceX / NASA mission control aesthetic — navy + cyan, operational, precise.
// Separate from the main cyberpunk design tokens.

export const mcTokens = {
  colors: {
    bg: {
      primary: "#0a1628", // deep navy — page background
      panel: "#0d1f3c", // darker navy — panel backgrounds
      elevated: "#132d5e", // mid navy — hover states, active panels
      timer: "#081428", // darkest — mission timer bar
    },
    accent: {
      cyan: "#00d4ff", // primary accent — key values, active states
      teal: "#00a3cc", // secondary — labels, panel headers
    },
    status: {
      green: "#00ff88", // GO, positive trends, active today
      amber: "#ffb800", // warning, active this week
      red: "#ff3366", // alert, errors, negative trends
    },
    text: {
      primary: "#c8d6e5", // main readable text
      secondary: "#5a7a9e", // labels, muted text
      dim: "#3d5a80", // very dim, grid lines
    },
    border: {
      default: "#1a3a6e", // panel borders, dividers
      subtle: "#122a52", // subtle internal lines
    },
    gauge: {
      track: "#1a3a6e", // ring gauge track
      green: "#00ff88", // recovery 67-100%
      amber: "#ffb800", // recovery 34-66%
      red: "#ff3366", // recovery 0-33%
    },
    trend: {
      positive: "#00ff88", // upward trends
      negative: "#ff3366", // downward trends
      neutral: "#5a7a9e", // no change / insufficient data
    },
    heatmap: {
      empty: "#0d1f3c", // 0 commits
      low: "#00a3cc", // 1-3 commits
      medium: "#00d4ff", // 4-10 commits
      high: "#c8d6e5", // 10+ commits
    },
  },
  typography: {
    fontFamily: "'JetBrains Mono', 'Fira Mono', monospace",
    hero: { size: "48px", weight: "300", lineHeight: "1" },
    metric: { size: "20px", weight: "300" },
    label: {
      size: "9px",
      weight: "400",
      letterSpacing: "2px",
      textTransform: "uppercase" as const,
    },
    body: { size: "12px", weight: "400" },
    tiny: {
      size: "8px",
      weight: "400",
      letterSpacing: "1.5px",
      textTransform: "uppercase" as const,
    },
  },
  spacing: {
    page: "12px", // tighter for dense layout
    panel: "14px", // panel internal padding
    section: "10px", // between sections within a panel
    row: "6px", // between metric rows
    gap: "1px", // grid gap between panels
  },
  panel: {
    background: "#0d1f3c",
    border: "1px solid #1a3a6e",
    borderRadius: "2px", // very subtle, almost square
    padding: "14px",
  },
  animation: {
    staggerDelay: 0.05,
    fadeIn: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as number[] },
  },
} as const;
