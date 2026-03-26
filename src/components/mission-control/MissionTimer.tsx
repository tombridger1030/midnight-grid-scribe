"use client";

import { useEffect, useState } from "react";
import { mcTokens } from "@/styles/mission-control-tokens";

interface MissionTimerProps {
  lastSync: string | null;
  syncErrors: boolean;
  lastCommitDate: string | null;
}

function formatSyncAge(lastSync: string | null): {
  label: string;
  color: string;
  status: "ok" | "stale" | "error";
} {
  if (!lastSync) {
    return {
      label: "NO DATA",
      color: mcTokens.colors.text.secondary,
      status: "ok",
    };
  }
  const diffMs = Date.now() - new Date(lastSync).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMin / 60);

  if (diffMin >= 60) {
    return {
      label: `STALE ${diffHr}H AGO`,
      color: mcTokens.colors.status.amber,
      status: "stale",
    };
  }
  return {
    label: `SYNCED ${diffMin}M AGO`,
    color: mcTokens.colors.status.green,
    status: "ok",
  };
}

function formatCountdown(lastCommitDate: string | null): string {
  if (!lastCommitDate) return "T+ --:--:--";
  const diffMs = Date.now() - new Date(lastCommitDate).getTime();
  if (diffMs < 0) return "T+ 00:00:00";
  const totalSec = Math.floor(diffMs / 1000);
  const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  return `T+${h}:${m}:${s}`;
}

function formatClock(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
}

const sharedTextStyle: React.CSSProperties = {
  fontFamily: mcTokens.typography.fontFamily,
  fontSize: "9px",
  textTransform: "uppercase",
  letterSpacing: "2px",
  color: mcTokens.colors.text.primary,
};

export const MissionTimer: React.FC<MissionTimerProps> = ({
  lastSync,
  syncErrors,
  lastCommitDate,
}) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const sync = syncErrors
    ? {
        label: "SYNC ERROR",
        color: mcTokens.colors.status.red,
        status: "error" as const,
      }
    : formatSyncAge(lastSync);

  const dotColor =
    sync.status === "error"
      ? mcTokens.colors.status.red
      : sync.status === "stale"
        ? mcTokens.colors.status.amber
        : mcTokens.colors.status.green;

  return (
    <>
      <style>{`@keyframes mc-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: mcTokens.colors.bg.timer,
          borderBottom: `1px solid ${mcTokens.colors.accent.cyan}`,
          padding: "8px 12px",
          width: "100%",
        }}
      >
        {/* Left: NOCTISIUM */}
        <span
          style={{
            ...sharedTextStyle,
            color: mcTokens.colors.accent.cyan,
            fontWeight: "bold",
            fontSize: "12px",
          }}
        >
          NOCTISIUM
        </span>

        {/* Center-left: Sync status */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              backgroundColor: dotColor,
              display: "inline-block",
              animation: "mc-pulse 2s ease-in-out infinite",
              flexShrink: 0,
            }}
          />
          <span style={{ ...sharedTextStyle, color: sync.color }}>
            {sync.label}
          </span>
        </div>

        {/* Center-right: T+ countdown */}
        <span style={sharedTextStyle}>{formatCountdown(lastCommitDate)}</span>

        {/* Right: Live clock */}
        <span style={sharedTextStyle}>{formatClock()}</span>
      </div>
    </>
  );
};
