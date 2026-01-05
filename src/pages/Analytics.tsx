/**
 * Analytics Page
 * 
 * Comprehensive analytics suite with 5 tabs:
 * - Overview: Quick snapshot of performance
 * - Trends: Historical analysis and trajectories
 * - Patterns: Day-of-week analysis, correlations
 * - Goals: Yearly goal progress and projections
 * - Insights: AI-powered observations and recommendations
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Grid3X3, 
  Target, 
  Lightbulb,
  RefreshCw 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAnalytics, AnalyticsPeriod } from '@/hooks/useAnalytics';

// Tab components
import { OverviewTab } from '@/components/analytics/overview';
import { TrendsTab } from '@/components/analytics/trends';
import { PatternsTab } from '@/components/analytics/patterns';
import { GoalsTab } from '@/components/analytics/goals';
import { InsightsTab } from '@/components/analytics/insights';

// Tab configuration
const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'trends', label: 'Trends', icon: TrendingUp },
  { id: 'patterns', label: 'Patterns', icon: Grid3X3 },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'insights', label: 'Insights', icon: Lightbulb },
] as const;

type TabId = typeof TABS[number]['id'];

const Analytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [period, setPeriod] = useState<AnalyticsPeriod>('all');
  
  const { data, isLoading, error, activeKPIs } = useAnalytics(period);

  if (error) {
    return (
      <div className="min-h-full flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-[#FF3366] text-lg mb-2">Failed to load analytics</div>
          <div className="text-terminal-accent/60 text-sm">{error.message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#0A0A0A]">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-terminal-accent">Analytics</h1>
            {isLoading && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <RefreshCw size={20} className="text-terminal-accent/40" />
              </motion.div>
            )}
          </div>
          <p className="text-terminal-accent/60 text-sm">
            Deep insights into your performance, patterns, and progress
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-1 mb-8 p-1.5 bg-surface-secondary rounded-xl border border-line w-fit"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200",
                  isActive
                    ? "bg-terminal-accent text-black font-medium shadow-lg"
                    : "text-terminal-accent/60 hover:text-terminal-accent hover:bg-surface-hover"
                )}
                style={isActive ? { boxShadow: '0 0 20px rgba(0, 240, 255, 0.3)' } : {}}
              >
                <Icon size={18} />
                <span className="text-sm">{tab.label}</span>
              </button>
            );
          })}
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {isLoading && !data ? (
              <LoadingSkeleton />
            ) : data ? (
              <>
                {activeTab === 'overview' && (
                  <OverviewTab data={data.overview} />
                )}
                {activeTab === 'trends' && (
                  <TrendsTab 
                    data={data.trends} 
                    period={period} 
                    onPeriodChange={setPeriod}
                    kpis={activeKPIs}
                  />
                )}
                {activeTab === 'patterns' && (
                  <PatternsTab data={data.patterns} kpis={activeKPIs} />
                )}
                {activeTab === 'goals' && (
                  <GoalsTab data={data.goals} />
                )}
                {activeTab === 'insights' && (
                  <InsightsTab data={data.insights} />
                )}
              </>
            ) : (
              <EmptyState />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

// Loading skeleton
const LoadingSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-32 rounded-xl bg-surface-secondary border border-line animate-pulse"
        />
      ))}
    </div>
    <div className="h-64 rounded-xl bg-surface-secondary border border-line animate-pulse" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-24 rounded-xl bg-surface-secondary border border-line animate-pulse"
        />
      ))}
    </div>
  </div>
);

// Empty state
const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-20">
    <div className="text-6xl mb-4">📊</div>
    <h3 className="text-xl font-semibold text-terminal-accent mb-2">No Data Yet</h3>
    <p className="text-terminal-accent/60 text-center max-w-md">
      Start tracking your weekly KPIs to see analytics here. 
      The more data you have, the better insights you'll get.
    </p>
  </div>
);

export default Analytics;
