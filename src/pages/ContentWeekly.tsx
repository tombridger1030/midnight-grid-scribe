import React, { useEffect, useState } from 'react';
import { loadRecentContent, ContentListItem } from '@/lib/storage';
import MonthlyProgression from '@/components/content/weekly/MonthlyProgression';
import ProgressionChart from '@/components/content/weekly/ProgressionChart';

const ContentWeekly: React.FC = () => {
  const [allContent, setAllContent] = useState<ContentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load comprehensive data for monthly progression analysis
  useEffect(() => {
    const loadContent = async () => {
      setLoading(true);
      setError(null);

      try {
        // Load last 6 months of content for deep analysis
        const data = await loadRecentContent(200);
        setAllContent(data);
      } catch (e) {
        console.error('Failed to load content:', e);
        setError(e instanceof Error ? e.message : 'Failed to load content for progression analysis');
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-64 bg-[#111] rounded-sm mb-6"></div>
          <div className="h-48 bg-[#111] rounded-sm mb-6"></div>
          <div className="h-32 bg-[#111] rounded-sm"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="p-4 border border-red-500/20 bg-red-500/10 rounded-sm">
          <div className="text-red-400 text-sm">Error loading progression analysis</div>
          <div className="text-red-300 text-xs mt-1">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-sm text-[#8A8D93]">
        Deep analysis of your content performance over time, tracking monthly progression toward your 2025 growth targets.
      </div>

      {/* Progression Charts */}
      <ProgressionChart items={allContent} />

      {/* Monthly Breakdown */}
      <MonthlyProgression items={allContent} />

      {/* Key Insights from VIDEO TRACKING.xlsx Analysis */}
      <div className="border border-[#333] bg-[#111] rounded-sm p-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🔍</span>
          <h3 className="text-lg font-medium text-white">Key Findings</h3>
          <div className="text-xs text-[#8A8D93]">Based on your tracking data</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Performance Patterns */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-terminal-accent">Performance Patterns</h4>
            <div className="space-y-2 text-xs">
              <div className="p-2 bg-[#0F0F0F] rounded-sm">
                <div className="text-white font-medium">TikTok outperforms Instagram</div>
                <div className="text-[#8A8D93]">27.9% avg retention vs 20.9% on Instagram</div>
              </div>
              <div className="p-2 bg-[#0F0F0F] rounded-sm">
                <div className="text-white font-medium">October 2024 was peak month</div>
                <div className="text-[#8A8D93]">1,038 avg views/post vs 648 in November</div>
              </div>
              <div className="p-2 bg-[#0F0F0F] rounded-sm">
                <div className="text-white font-medium">Consistency challenge</div>
                <div className="text-[#8A8D93]">Volume ↑ but individual performance ↓</div>
              </div>
            </div>
          </div>

          {/* Growth Trajectory */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-terminal-accent">2025 Growth Trajectory</h4>
            <div className="space-y-2 text-xs">
              <div className="p-2 bg-[#0F0F0F] rounded-sm">
                <div className="text-white font-medium">Q1 2025 Targets</div>
                <div className="text-[#8A8D93]">IG: 15K • TT: 10K • YT: 2K followers</div>
              </div>
              <div className="p-2 bg-[#0F0F0F] rounded-sm">
                <div className="text-white font-medium">End 2025 Goals</div>
                <div className="text-[#8A8D93]">IG: 100K • TT: 100K • YT: 10K followers</div>
              </div>
              <div className="p-2 bg-[#0F0F0F] rounded-sm">
                <div className="text-white font-medium">Posting Frequency</div>
                <div className="text-[#8A8D93]">Target: 3-4 posts/week across platforms</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {allContent.length === 0 && (
        <div className="text-center py-12 text-[#8A8D93] border border-[#333] bg-[#111] rounded-sm">
          <div className="text-lg mb-2">📊 No Progression Data</div>
          <div className="text-sm mb-4">No content available for analysis</div>
          <div className="text-xs opacity-70">
            Add content through the input page to see monthly progression analysis
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentWeekly;


