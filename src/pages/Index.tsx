import React from 'react';
import { Link } from 'react-router-dom';
import { Settings2 } from 'lucide-react';
import { WeeklyKPIs } from '@/components/weekly';
import TypewriterText from '@/components/TypewriterText';
import { cn } from '@/lib/utils';

const Index = () => {
  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <TypewriterText text="Weekly KPIs" className="text-xl mb-2" />
          <p className="text-terminal-accent/70 text-sm">
            Track your weekly key performance indicators and targets.
          </p>
        </div>
        <Link
          to="/kpis/manage"
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm',
            'text-content-secondary hover:text-terminal-accent',
            'border border-line hover:border-terminal-accent/50',
            'transition-all duration-200'
          )}
        >
          <Settings2 size={16} />
          Manage KPIs
        </Link>
      </div>

      {/* Weekly KPI Interface */}
      <div className="flex-1 overflow-y-auto pb-8">
        <WeeklyKPIs />
      </div>
    </div>
  );
};

export default Index;
