import React, { useState, useEffect } from 'react';
import { Ship, ExternalLink, Github, Twitter, Youtube, Instagram, Plus, Clock, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  loadNoctisiumData,
  logShip,
  ShipRecord,
  getTimeSinceLastShip
} from '@/lib/storage';
import {
  syncGitHubShips,
  getGitHubSyncStatus,
  triggerManualSync,
  isGitHubConfigured,
  testGitHubIntegration
} from '@/lib/github';

interface ShipFeedProps {
  className?: string;
  maxItems?: number;
}

export const ShipFeed: React.FC<ShipFeedProps> = ({ className, maxItems = 10 }) => {
  const [ships, setShips] = useState<ShipRecord[]>([]);
  const [newShipDescription, setNewShipDescription] = useState('');
  const [newShipUrl, setNewShipUrl] = useState('');
  const [isAddingShip, setIsAddingShip] = useState(false);
  const [timeSinceLastShip, setTimeSinceLastShip] = useState(0);
  const [githubSyncStatus, setGithubSyncStatus] = useState<any>(null);
  const [isGithubSyncing, setIsGithubSyncing] = useState(false);
  const [githubSyncResult, setGithubSyncResult] = useState<string | null>(null);

  useEffect(() => {
    const loadShips = async () => {
      // Load local ship data
      const data = loadNoctisiumData();
      const sortedShips = data.ships
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, maxItems);
      setShips(sortedShips);

      const timeSince = getTimeSinceLastShip();
      setTimeSinceLastShip(timeSince);

      // Update GitHub sync status
      const status = getGitHubSyncStatus();
      setGithubSyncStatus(status);

      // Auto-sync GitHub if configured and due for sync
      if (status.configured && !isGithubSyncing) {
        try {
          const result = await syncGitHubShips();
          if (result.success && result.shipsCreated > 0) {
            // Reload ships after successful GitHub sync
            const updatedData = loadNoctisiumData();
            const updatedShips = updatedData.ships
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .slice(0, maxItems);
            setShips(updatedShips);
            
            // Update result message
            if (result.shipsCreated > 0) {
              setGithubSyncResult(`✅ Synced ${result.shipsCreated} new ships from GitHub`);
              setTimeout(() => setGithubSyncResult(null), 5000);
            }
          } else if (!result.success && result.error !== 'Sync not needed yet') {
            setGithubSyncResult(`❌ GitHub sync failed: ${result.error}`);
            setTimeout(() => setGithubSyncResult(null), 10000);
          }
        } catch (error) {
          console.error('GitHub sync error:', error);
        }
      }
    };

    loadShips();

    // Refresh every minute (GitHub sync has its own 30-min interval)
    const interval = setInterval(loadShips, 60000);
    return () => clearInterval(interval);
  }, [maxItems, isGithubSyncing]);

  const handleAddShip = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newShipDescription.trim()) return;

    const ship = logShip(
      newShipDescription.trim(),
      newShipUrl.trim() || undefined,
      'manual'
    );

    setShips(prev => [ship, ...prev.slice(0, maxItems - 1)]);
    setNewShipDescription('');
    setNewShipUrl('');
    setIsAddingShip(false);
    setTimeSinceLastShip(0);
  };

  const handleManualGitHubSync = async () => {
    if (!isGitHubConfigured() || isGithubSyncing) return;
    
    setIsGithubSyncing(true);
    setGithubSyncResult(null);
    
    try {
      const result = await triggerManualSync();
      
      if (result.success) {
        // Reload ships after sync
        const data = loadNoctisiumData();
        const sortedShips = data.ships
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, maxItems);
        setShips(sortedShips);
        
        setGithubSyncResult(
          result.shipsCreated > 0 
            ? `✅ Synced ${result.shipsCreated} new ships from GitHub`
            : '✅ GitHub sync complete - no new ships'
        );
        
        // Update sync status
        const status = getGitHubSyncStatus();
        setGithubSyncStatus(status);
      } else {
        setGithubSyncResult(`❌ GitHub sync failed: ${result.error}`);
      }
    } catch (error) {
      setGithubSyncResult(`❌ GitHub sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGithubSyncing(false);
      setTimeout(() => setGithubSyncResult(null), 5000);
    }
  };

  const getSourceIcon = (source: ShipRecord['source']) => {
    switch (source) {
      case 'github_pr':
        return <Github size={14} className="text-[#333]" />;
      case 'social_media':
        return <Twitter size={14} className="text-[#1DA1F2]" />;
      case 'content_publish':
        return <Youtube size={14} className="text-[#FF0000]" />;
      case 'content_input':
        return <Youtube size={14} className="text-[#FF6B00]" />;
      default:
        return <Ship size={14} className="text-[#5FE3B3]" />;
    }
  };

  const getSourceLabel = (source: ShipRecord['source']) => {
    switch (source) {
      case 'github_pr':
        return 'GitHub PR';
      case 'social_media':
        return 'Social';
      case 'content_publish':
        return 'Content';
      case 'content_input':
        return 'Content Post';
      case 'manual':
        return 'Manual';
      default:
        return 'Ship';
    }
  };

  const formatCycleTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins}m ago`;
    }
    if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getCycleTimeColor = (cycleTimeMinutes?: number): string => {
    if (!cycleTimeMinutes) return 'text-terminal-accent/50';

    const hours = cycleTimeMinutes / 60;

    // Green under 24 hours
    if (hours < 24) return 'text-[#5FE3B3]';
    // Amber 24-48 hours
    if (hours < 48) return 'text-[#FFD700]';
    // Red over 48 hours
    return 'text-[#FF6B6B]';
  };

  const getUrgencyMessage = (): string => {
    if (timeSinceLastShip === 0) return "No ships yet";
    if (timeSinceLastShip < 24) return `Last ship ${Math.floor(timeSinceLastShip)}h ago`;
    if (timeSinceLastShip < 48) return `${Math.floor(timeSinceLastShip)}h since last ship`;
    if (timeSinceLastShip < 72) return "⚠️ Ship something soon";
    return "🚨 Overdue for shipping";
  };

  const getUrgencyColor = (): string => {
    if (timeSinceLastShip < 24) return 'text-[#5FE3B3]';
    if (timeSinceLastShip < 48) return 'text-terminal-accent';
    if (timeSinceLastShip < 72) return 'text-[#FFD700]';
    return 'text-[#FF6B6B]';
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with urgency indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Ship size={20} className="text-[#5FE3B3]" />
          <h2 className="text-lg text-terminal-accent">Ship Feed</h2>
          {githubSyncStatus?.configured && (
            <div className="flex items-center gap-1">
              {githubSyncStatus.configured ? (
                <Wifi size={14} className="text-[#5FE3B3]" title="GitHub connected" />
              ) : (
                <WifiOff size={14} className="text-terminal-accent/50" title="GitHub not configured" />
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className={cn("text-sm font-medium", getUrgencyColor())}>
            {getUrgencyMessage()}
          </div>
          
          {/* GitHub sync controls */}
          {githubSyncStatus?.configured && (
            <button
              onClick={handleManualGitHubSync}
              disabled={isGithubSyncing}
              className="p-1 hover:bg-[#333] transition-colors rounded disabled:opacity-50"
              title="Sync with GitHub now"
            >
              <RefreshCw size={16} className={cn(
                "text-[#5FE3B3]",
                isGithubSyncing && "animate-spin"
              )} />
            </button>
          )}
          
          <button
            onClick={() => setIsAddingShip(true)}
            className="p-1 hover:bg-[#333] transition-colors rounded"
            title="Log a new ship"
          >
            <Plus size={16} className="text-[#5FE3B3]" />
          </button>
        </div>
      </div>

      {/* GitHub sync status and result messages */}
      {githubSyncStatus?.configured && (
        <div className="flex items-center justify-between text-xs text-terminal-accent/70">
          <div>
            Repos: {githubSyncStatus.repositories.join(', ')} • 
            Next sync: {githubSyncStatus.nextSync ? 
              new Date(githubSyncStatus.nextSync).toLocaleTimeString() : 'Unknown'}
          </div>
          <button
            onClick={() => {
              console.log('🧪 Running GitHub integration test...');
              testGitHubIntegration();
            }}
            className="text-xs px-2 py-1 bg-terminal-accent/10 hover:bg-terminal-accent/20 border border-terminal-accent/30 rounded transition-colors"
            title="Run GitHub integration test (check console)"
          >
            Test GitHub
          </button>
        </div>
      )}
      
      {githubSyncResult && (
        <div className="text-xs px-2 py-1 bg-terminal-bg/20 border border-terminal-accent/30 rounded">
          {githubSyncResult}
        </div>
      )}

      {/* New ship input */}
      {isAddingShip && (
        <div className="border border-terminal-accent/30 p-3 bg-terminal-bg/20 rounded">
          <form onSubmit={handleAddShip} className="space-y-3">
            <input
              type="text"
              value={newShipDescription}
              onChange={(e) => setNewShipDescription(e.target.value)}
              placeholder="What did you ship? (e.g., 'Fixed user authentication bug')"
              className="w-full bg-transparent border-b border-terminal-accent/30 text-terminal-accent px-2 py-1 focus:outline-none focus:border-[#5FE3B3]"
              autoFocus
              maxLength={200}
            />
            <input
              type="url"
              value={newShipUrl}
              onChange={(e) => setNewShipUrl(e.target.value)}
              placeholder="Proof URL (optional - GitHub PR, tweet, etc.)"
              className="w-full bg-transparent border-b border-terminal-accent/30 text-terminal-accent px-2 py-1 focus:outline-none focus:border-[#5FE3B3] text-sm"
            />
            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsAddingShip(false);
                  setNewShipDescription('');
                  setNewShipUrl('');
                }}
                className="px-3 py-1 text-sm text-terminal-accent/70 hover:text-terminal-accent transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newShipDescription.trim()}
                className="px-3 py-1 text-sm bg-[#5FE3B3] text-black hover:bg-[#5FE3B3]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded"
              >
                Ship It
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Ships list */}
      <div className="space-y-3">
        {ships.length === 0 ? (
          <div className="text-center py-8 text-terminal-accent/70">
            <Ship size={32} className="mx-auto mb-2 opacity-50" />
            <p>No ships logged yet</p>
            <p className="text-sm mt-1">Start shipping user-visible value!</p>
          </div>
        ) : (
          ships.map((ship) => (
            <div
              key={ship.id}
              className="border border-terminal-accent/20 p-3 bg-terminal-bg/10 hover:bg-terminal-bg/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getSourceIcon(ship.source)}
                    <span className="text-xs text-terminal-accent/70 uppercase">
                      {getSourceLabel(ship.source)}
                    </span>
                    <span className="text-xs text-terminal-accent/50">
                      {formatTimestamp(ship.timestamp)}
                    </span>
                  </div>

                  <p className="text-terminal-accent text-sm mb-2 break-words">
                    {ship.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs">
                    {ship.cycleTimeMinutes && (
                      <div className="flex items-center gap-1">
                        <Clock size={12} className={getCycleTimeColor(ship.cycleTimeMinutes)} />
                        <span className={getCycleTimeColor(ship.cycleTimeMinutes)}>
                          {formatCycleTime(ship.cycleTimeMinutes)}
                        </span>
                        <span className="text-terminal-accent/50">cycle</span>
                      </div>
                    )}

                    {ship.proofUrl && (
                      <a
                        href={ship.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[#5FE3B3] hover:text-[#5FE3B3]/80 transition-colors"
                      >
                        <ExternalLink size={12} />
                        <span>proof</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {ships.length === maxItems && (
        <div className="text-center text-xs text-terminal-accent/50">
          Showing {maxItems} most recent ships
        </div>
      )}
    </div>
  );
};