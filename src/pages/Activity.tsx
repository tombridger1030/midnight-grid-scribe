/**
 * Activity Page
 *
 * Consolidated view replacing Analytics, Ships, and Roadmap pages.
 * Shows 4 GitHub-style heatmaps for yearly activity tracking.
 * Right sidebar shows recent GitHub commits.
 */

import { useState } from "react";
import { useActivityData } from "@/hooks/useActivityData";
import { YearHeatmap } from "@/components/activity/YearHeatmap";
import { DayModal } from "@/components/activity/DayModal";
import GitHubCommitsFeed from "@/components/GitHubCommitsFeed";
import { RefreshCw } from "lucide-react";

// Color scales for different metrics
const COMMIT_COLORS = [
  "bg-[#161b22]",
  "bg-[#0e4429]",
  "bg-[#006d32]",
  "bg-[#26a641]",
  "bg-[#39d353]",
];

const TRAINING_COLORS = [
  "bg-[#161b22]",
  "bg-[#3d1a5c]",
  "bg-[#5c2d91]",
  "bg-[#8b5cf6]",
  "bg-[#a78bfa]",
];

const SLEEP_COLORS = [
  "bg-[#161b22]",
  "bg-[#0c3547]",
  "bg-[#155e75]",
  "bg-[#0891b2]",
  "bg-[#22d3ee]",
];

const DEEPWORK_COLORS = [
  "bg-[#161b22]",
  "bg-[#5c3d0d]",
  "bg-[#854d0e]",
  "bg-[#ca8a04]",
  "bg-[#fbbf24]",
];

export default function Activity() {
  const currentYear = new Date().getFullYear();
  const { data, isLoading, error, refresh } = useActivityData(currentYear);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-mono text-[#8A8D93]">
          Activity {currentYear}
        </h1>
        <button
          onClick={handleRefresh}
          disabled={isLoading || isRefreshing}
          className="p-2 text-[#6e7681] hover:text-[#8A8D93] hover:bg-[#161616] rounded transition-colors disabled:opacity-50"
          title="Refresh data"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded p-3 text-red-400 text-sm mb-4">
          Failed to load activity data. Please try refreshing.
        </div>
      )}

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left column: Heatmaps */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="text-center text-[#6e7681] py-12">
              Loading activity data...
            </div>
          ) : (
            <div className="space-y-3">
              {/* Git Commits */}
              <YearHeatmap
                title="Git Commits"
                data={data.commits}
                year={currentYear}
                colorScale={COMMIT_COLORS}
                unit="commits"
                onDayClick={setSelectedDate}
              />

              {/* Training Sessions */}
              <YearHeatmap
                title="Training Sessions"
                data={data.training}
                year={currentYear}
                colorScale={TRAINING_COLORS}
                unit="sessions"
                onDayClick={setSelectedDate}
              />

              {/* Sleep Hours */}
              <YearHeatmap
                title="Sleep"
                data={data.sleep}
                year={currentYear}
                colorScale={SLEEP_COLORS}
                unit="hours"
                onDayClick={setSelectedDate}
              />

              {/* Deep Work Hours */}
              <YearHeatmap
                title="Deep Work"
                data={data.deepWork}
                year={currentYear}
                colorScale={DEEPWORK_COLORS}
                unit="hours"
                onDayClick={setSelectedDate}
              />
            </div>
          )}
        </div>

        {/* Right column: GitHub Commits Feed */}
        <div className="lg:w-80 lg:flex-shrink-0">
          <div className="lg:sticky lg:top-4">
            <GitHubCommitsFeed days={7} maxCommits={15} />
          </div>
        </div>
      </div>

      {/* Day detail modal */}
      <DayModal date={selectedDate} onClose={() => setSelectedDate(null)} />
    </div>
  );
}
