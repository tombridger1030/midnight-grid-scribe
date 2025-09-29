import React, { useState, useEffect } from 'react';
import { githubIntegration, GitHubCommit } from '@/lib/githubIntegration';
import { Card } from '@/components/ui/card';
import { Github, GitCommit, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GitHubCommitsFeedProps {
  days?: number;
  maxCommits?: number;
}

const GitHubCommitsFeed: React.FC<GitHubCommitsFeedProps> = ({ days = 5, maxCommits = 20 }) => {
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCommits = async () => {
    setLoading(true);
    setError(null);

    try {
      // Reload settings in case they changed
      githubIntegration.loadSettings();

      if (!githubIntegration.isConfigured()) {
        setError('GitHub integration not configured. Go to Profile > Integrations to set it up.');
        setLoading(false);
        return;
      }

      const recentCommits = await githubIntegration.getRecentCommits(days);
      setCommits(recentCommits.slice(0, maxCommits));
    } catch (err: any) {
      setError(err.message || 'Failed to load commits');
      console.error('Failed to load GitHub commits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommits();
  }, [days, maxCommits]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getCommitTitle = (message: string) => {
    // Get first line of commit message
    return message.split('\n')[0].substring(0, 60) + (message.length > 60 ? '...' : '');
  };

  const getRepoShortName = (fullName: string) => {
    const parts = fullName.split('/');
    return parts[parts.length - 1];
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center text-terminal-accent/70">
          <RefreshCw className="animate-spin mr-2" size={16} />
          Loading commits...
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center mb-2 text-red-400">
          <Github className="mr-2" size={20} />
          <h3 className="text-lg">GitHub Commits</h3>
        </div>
        <p className="text-sm text-terminal-accent/70">{error}</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Github className="mr-2 text-terminal-accent" size={20} />
          <h3 className="text-lg text-terminal-accent">Recent Commits</h3>
          <span className="ml-2 text-xs text-terminal-accent/70">
            (Last {days} days)
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadCommits}
          className="text-terminal-accent hover:text-terminal-accent/80"
        >
          <RefreshCw size={14} />
        </Button>
      </div>

      {commits.length === 0 ? (
        <p className="text-sm text-terminal-accent/70">No commits found in the last {days} days.</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {commits.map((commit) => (
            <div
              key={commit.sha}
              className="border border-terminal-accent/20 p-3 rounded hover:border-terminal-accent/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <GitCommit size={14} className="text-terminal-accent flex-shrink-0" />
                    <span className="text-xs font-mono text-terminal-accent/70">
                      {commit.sha.substring(0, 7)}
                    </span>
                    <span className="text-xs text-terminal-accent/50">
                      {formatDate(commit.date)}
                    </span>
                  </div>
                  <p className="text-sm text-terminal-accent mb-1 break-words">
                    {getCommitTitle(commit.message)}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-terminal-accent/70 font-mono">
                      {getRepoShortName(commit.repo)}
                    </span>
                  </div>
                </div>
                <a
                  href={commit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-terminal-accent hover:text-terminal-accent/80 flex-shrink-0"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {commits.length > 0 && (
        <div className="mt-4 pt-4 border-t border-terminal-accent/20">
          <div className="text-xs text-terminal-accent/70">
            Total commits: <span className="text-terminal-accent font-bold">{commits.length}</span>
            {commits.length >= maxCommits && ' (showing first ' + maxCommits + ')'}
          </div>
        </div>
      )}
    </Card>
  );
};

export default GitHubCommitsFeed;