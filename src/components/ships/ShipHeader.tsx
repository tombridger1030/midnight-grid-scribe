/**
 * ShipHeader Component
 *
 * Header with stats, sync controls, and filter dropdown
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  Wifi,
  Flame,
  Filter,
  ChevronDown,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

type FilterType = "all" | "manual" | "github" | "content";

const FILTER_OPTIONS: Record<FilterType, string> = {
  all: "All",
  manual: "Manual",
  github: "GitHub",
  content: "Content",
};

interface ShipHeaderProps {
  timeSinceLastShip: number;
  streak: number;
  isGitHubConfigured: boolean;
  isGithubSyncing: boolean;
  onSync: () => void;
  filter?: FilterType;
  onFilterChange?: (filter: FilterType) => void;
  className?: string;
}

export const ShipHeader: React.FC<ShipHeaderProps> = ({
  timeSinceLastShip,
  streak,
  isGitHubConfigured,
  isGithubSyncing,
  onSync,
  filter = "all",
  onFilterChange,
  className,
}) => {
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Format time since last ship
  const formatTimeSince = (hours: number): string => {
    if (!isFinite(hours) || hours === 0) return "Never";
    if (hours < 1) return "<1h ago";
    if (hours < 24) return `${Math.floor(hours)}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Get urgency color
  const getUrgencyColor = (): string => {
    if (timeSinceLastShip === 0 || !isFinite(timeSinceLastShip))
      return "text-content-muted";
    if (timeSinceLastShip < 24) return "text-success";
    if (timeSinceLastShip < 48) return "text-terminal-accent";
    return "text-warning";
  };

  // Get urgency message
  const getUrgencyMessage = (): string => {
    if (timeSinceLastShip === 0) return "First ship pending";
    if (timeSinceLastShip < 1) return "Shipping now!";
    if (timeSinceLastShip < 24)
      return `Last ship ${formatTimeSince(timeSinceLastShip)}`;
    if (timeSinceLastShip < 48) return "Ship soon";
    return "Overdue";
  };

  const urgencyColor = getUrgencyColor();

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main stats row */}
      <div className="flex items-center justify-between">
        {/* Left: Time since last ship */}
        <div className="flex items-center gap-3">
          <motion.div
            animate={
              timeSinceLastShip > 48 && isFinite(timeSinceLastShip)
                ? { opacity: [1, 0.5, 1] }
                : false
            }
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                "bg-surface-tertiary border border-line",
              )}
            >
              <Flame size={18} className={urgencyColor} />
            </div>
          </motion.div>
          <div>
            <div className={cn("text-sm font-medium", urgencyColor)}>
              {getUrgencyMessage()}
            </div>
            {streak > 0 && (
              <div className="flex items-center gap-1 text-xs text-content-muted">
                <Flame size={12} className="text-warning" />
                <span>{streak} day streak</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Filter button with dropdown */}
          {onFilterChange && (
            <div className="relative">
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-tertiary border border-line hover:bg-surface-hover transition-colors"
              >
                <Filter size={16} className="text-content-muted" />
                <span className="text-sm text-content-primary">
                  {FILTER_OPTIONS[filter]}
                </span>
                <ChevronDown
                  size={14}
                  className={cn(
                    "text-content-muted transition-transform",
                    showFilterMenu && "rotate-180",
                  )}
                />
              </button>

              {/* Dropdown menu */}
              <AnimatePresence>
                {showFilterMenu && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowFilterMenu(false)}
                    />

                    {/* Menu */}
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 z-20 min-w-[140px] p-1 rounded-xl bg-surface-secondary border border-line shadow-lg"
                    >
                      {(Object.keys(FILTER_OPTIONS) as FilterType[]).map(
                        (f) => (
                          <button
                            key={f}
                            onClick={() => {
                              onFilterChange(f);
                              setShowFilterMenu(false);
                            }}
                            className={cn(
                              "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                              filter === f
                                ? "bg-terminal-accent/10 text-terminal-accent"
                                : "text-content-primary hover:bg-surface-hover",
                            )}
                          >
                            <span>{FILTER_OPTIONS[f]}</span>
                            {filter === f && (
                              <Check
                                size={14}
                                className="text-terminal-accent"
                              />
                            )}
                          </button>
                        ),
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* GitHub sync */}
          {isGitHubConfigured && (
            <button
              onClick={onSync}
              disabled={isGithubSyncing}
              className={cn(
                "p-2 rounded-lg transition-colors",
                "bg-surface-tertiary border border-line",
                "hover:bg-surface-hover",
                isGithubSyncing && "opacity-70",
              )}
              title="Sync with GitHub"
            >
              <Wifi
                size={16}
                className={cn(
                  isGithubSyncing ? "text-content-muted" : "text-success",
                )}
              />
            </button>
          )}

          {/* Sync spinner */}
          {isGithubSyncing && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <RefreshCw size={16} className="text-terminal-accent" />
            </motion.div>
          )}
        </div>
      </div>

      {/* GitHub status indicator */}
      {isGitHubConfigured && !isGithubSyncing && (
        <div className="flex items-center gap-2 text-xs text-content-muted">
          <Wifi size={12} className="text-success" />
          <span>GitHub connected</span>
        </div>
      )}
    </div>
  );
};

export default ShipHeader;
