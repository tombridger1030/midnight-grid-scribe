/**
 * ShipsFeed Component
 *
 * Main container for ships with state management
 */

import React, { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  loadNoctisiumData,
  logShip,
  ShipRecord,
  getTimeSinceLastShip,
  loadRecentContent,
  ContentListItem,
} from "@/lib/storage";
import {
  triggerManualSync,
  isGitHubConfigured,
  getGitHubSyncStatus,
} from "@/lib/github";
import { githubIntegration } from "@/lib/githubIntegration";
import { useXPActions } from "@/hooks/useProgression";
import { ShipCard, recordToCardData, contentToCardData } from "./ShipCard";
import { ShipHeader } from "./ShipHeader";
import { ShipInput, ShipInputTrigger } from "./ShipInput";
import { ShipEmptyState } from "./ShipEmptyState";

interface ShipsFeedProps {
  maxItems?: number;
  className?: string;
}

export const ShipsFeed: React.FC<ShipsFeedProps> = ({
  maxItems = 50,
  className,
}) => {
  // State
  const [ships, setShips] = useState<ShipRecord[]>([]);
  const [recentContent, setRecentContent] = useState<ContentListItem[]>([]);
  const [isAddingShip, setIsAddingShip] = useState(false);
  const [timeSinceLastShip, setTimeSinceLastShip] = useState(0);
  const [isGithubSyncing, setIsGithubSyncing] = useState(false);
  const [isGitHubConfigured, setIsGitHubConfigured] = useState(false);
  const [filter, setFilter] = useState<"all" | "manual" | "github" | "content">(
    "all",
  );
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const { onShip } = useXPActions();

  // Load data
  const loadData = useCallback(async () => {
    // Load local ship data
    const data = loadNoctisiumData();
    const sortedShips = data.ships
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, maxItems);
    setShips(sortedShips);

    const timeSince = getTimeSinceLastShip();
    setTimeSinceLastShip(timeSince);

    // Check if GitHub is configured for sync button
    try {
      githubIntegration.loadSettings();
      if (githubIntegration.isConfigured()) {
        setIsGitHubConfigured(true);
      }
    } catch (error) {
      console.error("Failed to check GitHub configuration:", error);
    }

    // Load recent content
    try {
      const content = await loadRecentContent(10);
      setRecentContent(content);
    } catch (error) {
      console.error("Failed to load recent content:", error);
    }
  }, [maxItems]);

  useEffect(() => {
    loadData();

    // Refresh every minute
    const interval = setInterval(loadData, 60000);

    // Listen for content updates
    const handleContentUpdate = () => {
      loadData();
    };
    window.addEventListener("contentUpdated", handleContentUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("contentUpdated", handleContentUpdate);
    };
  }, [loadData]);

  // Add ship handler
  const handleAddShip = async (description: string, url: string) => {
    const ship = logShip(description, url || undefined, "manual");

    setShips((prev) => [ship, ...prev.slice(0, maxItems - 1)]);
    setTimeSinceLastShip(0);

    // Award XP
    try {
      onShip();
      toast.success("Ship logged!");
    } catch (error) {
      console.error("Failed to award XP for ship:", error);
    }
  };

  // GitHub sync handler
  const handleGitHubSync = async () => {
    if (isGithubSyncing) return;

    setIsGithubSyncing(true);
    setSyncMessage(null);

    try {
      const result = await triggerManualSync();

      if (result.success) {
        // Reload ships
        await loadData();

        setSyncMessage(
          result.shipsCreated > 0
            ? `Synced ${result.shipsCreated} new ships from GitHub`
            : "Sync complete - no new ships",
        );

        if (result.shipsCreated > 0) {
          toast.success(`Synced ${result.shipsCreated} new ships from GitHub`);
        }
      } else {
        setSyncMessage(`Sync failed: ${result.error}`);
        toast.error(result.error || "GitHub sync failed");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setSyncMessage(`Sync error: ${message}`);
      toast.error("GitHub sync error");
    } finally {
      setIsGithubSyncing(false);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  // Combine and filter all items
  // Note: githubCommits are already logged as ships with source 'github_pr' during sync,
  // so we only include ships and content to avoid duplicates
  const allItems = [
    ...ships.map((s) => ({ ...recordToCardData(s), record: s })),
    ...recentContent.map((c) => ({ ...contentToCardData(c), content: c })),
  ]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, maxItems);

  const filteredItems =
    filter === "all"
      ? allItems
      : allItems.filter((item) => {
          if (filter === "manual") return item.source === "manual";
          if (filter === "github")
            return item.source === "github_pr" || item.type === "commit";
          if (filter === "content")
            return (
              item.source === "content_publish" ||
              item.source === "content_input" ||
              item.source === "social_media"
            );
          return true;
        });

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <ShipHeader
        timeSinceLastShip={timeSinceLastShip}
        streak={0} // TODO: calculate streak
        isGitHubConfigured={isGitHubConfigured}
        isGithubSyncing={isGithubSyncing}
        onSync={handleGitHubSync}
        filter={filter}
        onFilterChange={setFilter}
      />

      {/* Sync message */}
      <AnimatePresence>
        {syncMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm text-content-muted"
          >
            {syncMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add ship input */}
      <ShipInput
        isOpen={isAddingShip}
        onClose={() => setIsAddingShip(false)}
        onSubmit={handleAddShip}
      />

      {/* Ships list or empty state */}
      {filteredItems.length === 0 ? (
        <ShipEmptyState onAddShip={() => setIsAddingShip(true)} />
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item, index) => (
            <ShipCard
              key={`${item.type}-${item.id}`}
              ship={item}
              index={index}
            />
          ))}
        </div>
      )}

      {/* Footer with add button (when not empty) */}
      {filteredItems.length > 0 && !isAddingShip && (
        <div className="flex items-center justify-center pt-4">
          <ShipInputTrigger onClick={() => setIsAddingShip(true)} />
        </div>
      )}

      {/* Item count */}
      {filteredItems.length > 0 && (
        <div className="text-center text-xs text-content-muted">
          {filteredItems.length} items
        </div>
      )}
    </div>
  );
};

export default ShipsFeed;
