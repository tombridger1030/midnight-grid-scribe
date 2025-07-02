import React, { useState } from 'react';
import WeeklyKPIInput from '@/components/WeeklyKPIInput';
import MidnightTracker from '@/components/MidnightTracker';
import MetricManager from '@/components/MetricManager';
import TypewriterText from '@/components/TypewriterText';
import { BarChart3, Calendar, Edit3, ChevronDown, ChevronUp } from 'lucide-react';

const Index = () => {
  const [showDailyMetrics, setShowDailyMetrics] = useState(false);
  const [editMode, setEditMode] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 flex justify-between items-start">
        <div>
          <TypewriterText text="Weekly KPIs" className="text-xl mb-2" />
          <p className="text-terminal-accent/70 text-sm">Track your weekly key performance indicators and targets.</p>
        </div>
        <div className="flex gap-2">
          <button
            className="terminal-button flex items-center min-h-[44px] px-4"
            onClick={() => setShowDailyMetrics(!showDailyMetrics)}
          >
            <Calendar size={16} className="mr-2" />
            {showDailyMetrics ? 'Hide' : 'Show'} Daily Detail
            {showDailyMetrics ? <ChevronUp size={16} className="ml-2" /> : <ChevronDown size={16} className="ml-2" />}
          </button>
        </div>
      </div>

      {/* Primary Weekly KPI Interface */}
      <div className="flex-1 overflow-y-auto">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={20} className="text-terminal-accent" />
            <h2 className="text-lg text-terminal-accent">Weekly Performance</h2>
          </div>
          <WeeklyKPIInput />
        </div>

        {/* Optional Daily Metrics Section */}
        {showDailyMetrics && (
          <div className="mt-8 pt-6 border-t border-terminal-accent/30">
            <div className="mb-4 flex justify-between items-start">
              <div>
                <h2 className="text-lg text-terminal-accent mb-2">Daily Metrics (Advanced)</h2>
                <p className="text-terminal-accent/70 text-sm">
                  Optional daily granular tracking for detailed analysis.
                </p>
              </div>
              <button
                className="terminal-button flex items-center min-h-[44px] px-4"
                onClick={() => setEditMode(!editMode)}
              >
                <Edit3 size={16} className="mr-2" />
                {editMode ? 'View Mode' : 'Edit Metrics'}
              </button>
            </div>

            {/* Daily Metrics Content */}
            {editMode ? (
              <div className="border border-terminal-accent/30 p-4 bg-terminal-bg/20">
                <MetricManager />
              </div>
            ) : (
              <div className="border border-terminal-accent/30 p-4 bg-terminal-bg/20">
                <MidnightTracker />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
