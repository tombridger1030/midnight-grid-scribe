import React, { useState, useEffect, useMemo } from "react";
import { githubIntegration, GitHubCommit } from "@/lib/githubIntegration";
import { Card } from "@/components/ui/card";
import {
  Github,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface GitHubCommitsFeedProps {
  days?: number;
  maxCommits?: number;
  onCommitsLoaded?: (commits: GitHubCommit[]) => void;
}

interface DayStats {
  date: string;
  dayLabel: string;
  total: number;
  hourly: number[];
  commits: GitHubCommit[];
}

const GitHubCommitsFeed: React.FC<GitHubCommitsFeedProps> = ({
  days = 7,
  maxCommits = 100,
  onCommitsLoaded,
}) => {
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const loadCommits = async () => {
    setLoading(true);
    setError(null);

    try {
      githubIntegration.loadSettings();

      if (!githubIntegration.isConfigured()) {
        setError("GitHub not configured. Go to Settings to set it up.");
        setLoading(false);
        return;
      }

      const recentCommits = await githubIntegration.getRecentCommits(days);
      const slicedCommits = recentCommits.slice(0, maxCommits);
      setCommits(slicedCommits);
      onCommitsLoaded?.(slicedCommits);
    } catch (err: any) {
      setError(err.message || "Failed to load commits");
      console.error("Failed to load GitHub commits:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommits();
  }, [days, maxCommits]);

  // Aggregate commits by day and hour, include actual commits per day
  const dayStats = useMemo(() => {
    const statsMap = new Map<string, DayStats>();

    // Initialize last N days
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split("T")[0];
      const dayLabel = date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      statsMap.set(dateKey, {
        date: dateKey,
        dayLabel,
        total: 0,
        hourly: Array(24).fill(0),
        commits: [],
      });
    }

    // Count commits per day and hour, store commits
    for (const commit of commits) {
      const commitDate = new Date(commit.date);
      const dateKey = commitDate.toISOString().split("T")[0];
      const hour = commitDate.getHours();

      const stats = statsMap.get(dateKey);
      if (stats) {
        stats.total++;
        stats.hourly[hour]++;
        stats.commits.push(commit);
      }
    }

    // Convert to array sorted by date (newest first)
    return Array.from(statsMap.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [commits, days]);

  const totalCommits = commits.length;
  const maxHourlyCount = Math.max(1, ...dayStats.flatMap((d) => d.hourly));

  // Calculate repo breakdown for pills
  const repoStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const commit of commits) {
      const repoName = commit.repo.split("/").pop() || commit.repo;
      counts.set(repoName, (counts.get(repoName) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4); // Top 4 repos for pills
  }, [commits]);

  // Color scale for hourly cells
  const getHourColor = (count: number) => {
    if (count === 0) return "bg-[#161b22]";
    const intensity = count / maxHourlyCount;
    if (intensity < 0.25) return "bg-[#0e4429]";
    if (intensity < 0.5) return "bg-[#006d32]";
    if (intensity < 0.75) return "bg-[#26a641]";
    return "bg-[#39d353]";
  };

  const toggleDay = (date: string) => {
    setExpandedDay(expandedDay === date ? null : date);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (loading) {
    return (
      <Card className="p-4 h-full">
        <div className="flex items-center justify-center text-terminal-accent/70 h-full">
          <RefreshCw className="animate-spin mr-2" size={16} />
          Loading...
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 h-full">
        <div className="flex items-center mb-2 text-red-400">
          <Github className="mr-2" size={18} />
          <h3 className="text-base">Commits</h3>
        </div>
        <p className="text-sm text-terminal-accent/70">{error}</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center">
          <Github className="mr-2 text-terminal-accent" size={18} />
          <h3 className="text-base text-terminal-accent">Commits</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadCommits}
          className="text-terminal-accent hover:text-terminal-accent/80 h-7 w-7 p-0"
        >
          <RefreshCw size={14} />
        </Button>
      </div>

      {/* Repo pills */}
      {repoStats.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3 flex-shrink-0">
          {repoStats.map(([repo, count]) => (
            <span
              key={repo}
              className="px-2 py-0.5 text-[10px] bg-[#161b22] text-terminal-accent/80 rounded-full border border-terminal-accent/20"
            >
              {repo}{" "}
              <span className="text-terminal-accent font-mono">{count}</span>
            </span>
          ))}
        </div>
      )}

      {totalCommits === 0 ? (
        <p className="text-sm text-terminal-accent/70">
          No commits in the last {days} days.
        </p>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
          {dayStats.map((day) => (
            <div key={day.date} className="space-y-1">
              {/* Day header - clickable */}
              <button
                onClick={() => day.total > 0 && toggleDay(day.date)}
                className={`w-full flex items-center justify-between p-1.5 rounded transition-colors ${
                  day.total > 0
                    ? "hover:bg-terminal-accent/10 cursor-pointer"
                    : "cursor-default"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {day.total > 0 ? (
                    expandedDay === day.date ? (
                      <ChevronDown size={12} className="text-terminal-accent" />
                    ) : (
                      <ChevronRight
                        size={12}
                        className="text-terminal-accent/50"
                      />
                    )
                  ) : (
                    <div className="w-3" />
                  )}
                  <span className="text-xs text-terminal-accent/70">
                    {day.dayLabel}
                  </span>
                </div>
                <span className="text-xs font-mono text-terminal-accent">
                  {day.total}
                </span>
              </button>

              {/* 24-hour bar */}
              <div className="ml-4">
                <div className="flex gap-px">
                  {day.hourly.map((count, hour) => (
                    <div
                      key={hour}
                      className={`flex-1 h-2 rounded-sm ${getHourColor(count)}`}
                      title={`${hour}:00 - ${count} commits`}
                    />
                  ))}
                </div>
                {/* Time labels - only show on first day */}
                {dayStats[0]?.date === day.date && (
                  <div className="flex justify-between text-[8px] text-terminal-accent/40 mt-0.5">
                    <span>12a</span>
                    <span>3a</span>
                    <span>6a</span>
                    <span>9a</span>
                    <span>12p</span>
                    <span>3p</span>
                    <span>6p</span>
                    <span>9p</span>
                    <span>12a</span>
                  </div>
                )}
              </div>

              {/* Expanded commits list */}
              {expandedDay === day.date && day.commits.length > 0 && (
                <div className="ml-4 mt-1 space-y-1 border-l border-terminal-accent/20 pl-2">
                  {day.commits.map((commit) => (
                    <a
                      key={commit.sha}
                      href={commit.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-2 p-1.5 rounded hover:bg-terminal-accent/10 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-terminal-accent/50">
                            {commit.sha.substring(0, 7)}
                          </span>
                          <span className="text-[10px] text-terminal-accent/40">
                            {formatTime(commit.date)}
                          </span>
                        </div>
                        <p className="text-xs text-terminal-accent truncate">
                          {commit.message.split("\n")[0]}
                        </p>
                      </div>
                      <ExternalLink
                        size={10}
                        className="text-terminal-accent/30 group-hover:text-terminal-accent/60 flex-shrink-0 mt-1"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalCommits > 0 && (
        <div className="mt-2 pt-2 border-t border-terminal-accent/20 flex-shrink-0">
          <div className="text-xs text-terminal-accent/70">
            <span className="text-terminal-accent font-bold">
              {totalCommits}
            </span>{" "}
            commits in {days} days
          </div>
        </div>
      )}
    </Card>
  );
};

export default GitHubCommitsFeed;
