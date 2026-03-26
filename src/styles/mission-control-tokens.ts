// SpaceX mission control aesthetic — monochrome, operational, understated.
// Separate from the main cyberpunk design tokens.

export const mcTokens = {
  colors: {
    bg: {
      primary: "#080808",
      panel: "#0f0f0f",
      elevated: "#141414",
    },
    text: {
      primary: "#e8e8e8",
      secondary: "#555555",
      muted: "#333333",
      dim: "#222222",
    },
    border: {
      default: "#151515",
      subtle: "#111111",
    },
    trend: {
      positive: "#4a4",
      negative: "#a44",
      neutral: "#555555",
    },
    status: {
      synced: "#4a4",
      error: "#a44",
      stale: "#a84",
    },
  },
  typography: {
    fontFamily: "'JetBrains Mono', 'Fira Mono', monospace",
    hero: { size: "72px", weight: "200", lineHeight: "1" },
    metric: { size: "22px", weight: "300" },
    label: {
      size: "10px",
      weight: "400",
      letterSpacing: "2px",
      textTransform: "uppercase" as const,
    },
    body: { size: "13px", weight: "400" },
    tiny: {
      size: "9px",
      weight: "400",
      letterSpacing: "2px",
      textTransform: "uppercase" as const,
    },
  },
  spacing: {
    page: "32px",
    section: "24px",
    row: "20px",
    inner: "14px",
  },
  animation: {
    staggerDelay: 0.08,
    fadeIn: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
} as const;
