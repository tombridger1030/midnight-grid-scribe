/**
 * ShipCard Component
 *
 * Individual ship entry card with modern design
 */

import React from "react";
import { motion } from "framer-motion";
import {
  Ship,
  Github,
  Youtube,
  Twitter,
  ExternalLink,
  Clock,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ShipRecord } from "@/lib/storage";
import { GitHubCommit } from "@/lib/githubIntegration";
import { ContentListItem } from "@/lib/storage";

// Source type configuration for consistent styling
export const SOURCE_CONFIG = {
  manual: {
    icon: Ship,
    label: "Manual",
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/20",
  },
  github_pr: {
    icon: Github,
    label: "GitHub",
    color: "text-white",
    bg: "bg-white/10",
    border: "border-white/20",
  },
  content_publish: {
    icon: Youtube,
    label: "Video",
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/20",
  },
  content_input: {
    icon: Video,
    label: "Content",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/20",
  },
  social_media: {
    icon: Twitter,
    label: "Social",
    color: "text-sky-400",
    bg: "bg-sky-400/10",
    border: "border-sky-400/20",
  },
} as const;

export type ShipSource = keyof typeof SOURCE_CONFIG;

export interface ShipCardData {
  id: string;
  type: "ship" | "commit" | "content";
  description: string;
  source: ShipSource;
  timestamp: string;
  cycleTimeMinutes?: number;
  proofUrl?: string;
  metadata?: {
    sha?: string;
    repo?: string;
    views?: number;
    follows?: number;
    platform?: string;
    format?: string;
  };
}

interface ShipCardProps {
  ship: ShipCardData;
  index?: number;
}

export const ShipCard: React.FC<ShipCardProps> = ({ ship, index = 0 }) => {
  const config = SOURCE_CONFIG[ship.source] || SOURCE_CONFIG.manual;
  const Icon = config.icon;

  // Format timestamp
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins < 1 ? "Just now" : `${diffMins}m ago`;
    }
    if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Format cycle time
  const formatCycleTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Get cycle time color
  const getCycleTimeColor = (minutes: number): string => {
    const hours = minutes / 60;
    if (hours < 24) return "text-success";
    if (hours < 48) return "text-warning";
    return "text-danger";
  };

  const cycleTimeColor = ship.cycleTimeMinutes
    ? getCycleTimeColor(ship.cycleTimeMinutes)
    : "text-content-muted";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ scale: 1.01 }}
      className={cn(
        "p-4 rounded-xl border",
        "bg-surface-secondary hover:bg-surface-tertiary",
        "transition-all duration-200",
        config.border,
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
            config.bg,
          )}
        >
          <Icon size={18} className={config.color} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header: Badge + Time */}
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={cn(
                "px-2 py-0.5 rounded text-xs font-medium",
                config.bg,
                config.color,
              )}
            >
              {config.label}
            </span>
            <span className="text-xs text-content-muted font-mono">
              {formatTimestamp(ship.timestamp)}
            </span>
          </div>

          {/* Description */}
          <p className="text-content-primary text-sm mb-3 break-words leading-relaxed">
            {ship.description}
          </p>

          {/* Footer */}
          <div className="flex items-center gap-4 text-xs flex-wrap">
            {/* Cycle time */}
            {ship.cycleTimeMinutes && (
              <div className="flex items-center gap-1.5">
                <Clock size={12} className={cycleTimeColor} />
                <span className={cn("font-mono", cycleTimeColor)}>
                  {formatCycleTime(ship.cycleTimeMinutes)}
                </span>
                <span className="text-content-muted">cycle</span>
              </div>
            )}

            {/* Repo for GitHub */}
            {ship.metadata?.repo && (
              <span className="text-content-muted font-mono">
                {ship.metadata.repo}
              </span>
            )}

            {/* Views for content */}
            {ship.metadata?.views !== undefined &&
              ship.metadata.views !== null && (
                <span className="text-content-muted">
                  {ship.metadata.views.toLocaleString()} views
                </span>
              )}

            {/* Follows for content */}
            {ship.metadata?.follows && ship.metadata.follows > 0 && (
              <span className="text-success font-medium">
                +{ship.metadata.follows} follows
              </span>
            )}

            {/* Proof link */}
            {ship.proofUrl && (
              <a
                href={ship.proofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-terminal-accent hover:text-terminal-accent/80 transition-colors"
              >
                <ExternalLink size={12} />
                <span>{ship.type === "content" ? "watch" : "proof"}</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Convert ShipRecord to ShipCardData
export const recordToCardData = (
  record: ShipRecord,
  type: "ship" | "commit" | "content" = "ship",
): ShipCardData => ({
  id: record.id,
  type,
  description: record.description,
  source: record.source as ShipSource,
  timestamp: record.timestamp,
  cycleTimeMinutes: record.cycleTimeMinutes,
  proofUrl: record.proofUrl,
});

// Convert GitHubCommit to ShipCardData
export const commitToCardData = (commit: GitHubCommit): ShipCardData => ({
  id: commit.sha,
  type: "commit",
  description: commit.message.split("\n")[0],
  source: "github_pr",
  timestamp: commit.date,
  proofUrl: commit.url,
  metadata: {
    sha: commit.sha,
    repo: commit.repo,
  },
});

// Convert ContentListItem to ShipCardData
export const contentToCardData = (content: ContentListItem): ShipCardData => ({
  id: content.id,
  type: "content",
  description: content.title,
  source: "content_publish",
  timestamp: content.published_at,
  proofUrl: content.url,
  metadata: {
    views: content.views,
    follows: content.follows,
    platform: content.platform,
    format: content.format,
  },
});

export default ShipCard;
