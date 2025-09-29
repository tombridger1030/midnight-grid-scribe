import React from 'react';
import WeeklyKPIInput from '@/components/WeeklyKPIInput';
import TypewriterText from '@/components/TypewriterText';
import { BarChart3 } from 'lucide-react';

const Index = () => {

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <div>
          <TypewriterText text="Weekly KPIs" className="text-xl mb-2" />
          <p className="text-terminal-accent/70 text-sm">Track your weekly key performance indicators and targets.</p>
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

      </div>
    </div>
  );
};

export default Index;
