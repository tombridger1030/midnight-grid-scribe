import React, { useState, useEffect } from 'react';
import { Ship, ExternalLink, Github, Twitter, Youtube, Instagram, Plus, Clock, RefreshCw, Wifi, WifiOff, Video, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  loadNoctisiumData,
  logShip,
  ShipRecord,
  getTimeSinceLastShip,
  loadRecentContent,
  ContentListItem
} from '@/lib/storage';
import {
  syncGitHubShips,
  getGitHubSyncStatus,
  triggerManualSync,
  isGitHubConfigured,
  testGitHubIntegration
} from '@/lib/github';
import { githubIntegration, GitHubCommit } from '@/lib/githubIntegration';
import { useXPActions } from '@/hooks/useProgression';
import { XP_REWARDS } from '@/lib/progression';

interface ShipFeedProps {
  className?: string;
  maxItems?: number;
}

export const ShipFeed: React.FC<ShipFeedProps> = ({ className, maxItems = 10 }) => {
  const [ships, setShips] = useState<ShipRecord[]>([]);
  const [githubCommits, setGithubCommits] = useState<GitHubCommit[]>([]);
  const [recentContent, setRecentContent] = useState<ContentListItem[]>([]);
  const [newShipDescription, setNewShipDescription] = useState('');
  const [xpGained, setXpGained] = useState<number | null>(null);
  const { onShip } = useXPActions();
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

      // Load GitHub commits (past 5 days)
      try {
        githubIntegration.loadSettings();
        if (githubIntegration.isConfigured()) {
          const commits = await githubIntegration.getRecentCommits(5);
          setGithubCommits(commits.slice(0, 10)); // Max 10 commits
        }
      } catch (error) {
        console.error('Failed to load GitHub commits:', error);
      }

      // Load recent content (past 7 days) - this queries the database
      // so deleted content will automatically not appear
      try {
        const content = await loadRecentContent(10);
        console.log('🔄 ShipFeed: Loaded', content.length, 'recent content items');
        setRecentContent(content);
      } catch (error) {
        console.error('Failed to load recent content:', error);
      }

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

    // Listen for content updates (when content is deleted/edited)
    const handleContentUpdate = () => {
      console.log('🔄 ShipFeed: Content updated, reloading...');
      loadShips();
    };

    window.addEventListener('contentUpdated', handleContentUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('contentUpdated', handleContentUpdate);
    };
  }, [maxItems, isGithubSyncing]);

  const handleAddShip = async (e: React.FormEvent) => {
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

    // Award XP for shipping
    try {
      const result = await onShip();
      if (result.xpGained > 0) {
        setXpGained(result.xpGained);
        setTimeout(() => setXpGained(null), 3000); // Clear after 3s
      }
    } catch (error) {
      console.error('Failed to award XP for ship:', error);
    }
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
      {/* XP Gain Notification */}
      {xpGained !== null && (
        <div className="flex items-center justify-center gap-2 py-2 px-4 bg-green-500/20 border border-green-500/30 rounded text-green-400 text-sm animate-pulse">
          <Sparkles size={16} />
          <span>+{xpGained} XP for shipping!</span>
        </div>
      )}

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

      {/* Combined feed: Ships, GitHub Commits, and Content */}
      <div className="space-y-3">
        {ships.length === 0 && githubCommits.length === 0 && recentContent.length === 0 ? (
          <div className="text-center py-8 text-terminal-accent/70">
            <Ship size={32} className="mx-auto mb-2 opacity-50" />
            <p>No ships logged yet</p>
            <p className="text-sm mt-1">Start shipping user-visible value!</p>
          </div>
        ) : (
          <>
            {/* Manual Ships */}
            {ships.map((ship) => (
              <div
                key={`ship-${ship.id}`}
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
            ))}

            {/* GitHub Commits */}
            {githubCommits.map((commit) => (
              <div
                key={`github-${commit.sha}`}
                className="border border-[#333]/40 p-3 bg-terminal-bg/10 hover:bg-terminal-bg/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Github size={14} className="text-[#333]" />
                      <span className="text-xs text-terminal-accent/70 uppercase">GitHub Commit</span>
                      <span className="text-xs text-terminal-accent/50">
                        {formatTimestamp(commit.date)}
                      </span>
                    </div>

                    <p className="text-terminal-accent text-sm mb-2 break-words">
                      {commit.message.split('\n')[0]}
                    </p>

                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-terminal-accent/70 font-mono">
                        {commit.repo.split('/').pop()}
                      </span>
                      <a
                        href={commit.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[#5FE3B3] hover:text-[#5FE3B3]/80 transition-colors"
                      >
                        <ExternalLink size={12} />
                        <span>view</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Recent Content */}
            {recentContent.map((content) => (
              <div
                key={`content-${content.id}`}
                className="border border-[#FF0000]/40 p-3 bg-terminal-bg/10 hover:bg-terminal-bg/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Video size={14} className="text-[#FF0000]" />
                      <span className="text-xs text-terminal-accent/70 uppercase">
                        {content.platform} {content.format}
                      </span>
                      <span className="text-xs text-terminal-accent/50">
                        {formatTimestamp(content.published_at)}
                      </span>
                    </div>

                    <p className="text-terminal-accent text-sm mb-2 break-words">
                      {content.title}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-terminal-accent/70">
                      {content.views !== undefined && content.views !== null && (
                        <span>{content.views.toLocaleString()} views</span>
                      )}
                      {content.follows !== undefined && content.follows !== null && content.follows > 0 && (
                        <span className="text-[#5FE3B3]">+{content.follows} follows</span>
                      )}
                      {content.url && (
                        <a
                          href={content.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[#5FE3B3] hover:text-[#5FE3B3]/80 transition-colors"
                        >
                          <ExternalLink size={12} />
                          <span>watch</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {(ships.length + githubCommits.length + recentContent.length > 0) && (
        <div className="text-center text-xs text-terminal-accent/50">
          Showing {ships.length} ships • {githubCommits.length} commits • {recentContent.length} content
        </div>
      )}
    </div>
  );
};