import React, { useState } from 'react';
import MidnightTracker from '@/components/MidnightTracker';
import MetricManager from '@/components/MetricManager';
import TypewriterText from '@/components/TypewriterText';
import { Edit3, X } from 'lucide-react';

const Index = () => {
  const [editMode, setEditMode] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 flex justify-between items-start">
        <div>
          <TypewriterText text="Metrics Input" className="text-xl mb-2" />
          <p className="text-terminal-accent/70 text-sm">Track your sprint metrics and habits.</p>
        </div>
        <button
          className="terminal-button flex items-center min-h-[44px] px-4"
          onClick={() => setEditMode(!editMode)}
        >
          {editMode ? <X size={16} className="mr-2" /> : <Edit3 size={16} className="mr-2" />}
          {editMode ? 'Exit Edit' : 'Edit Metrics'}
        </button>
      </div>

      {/* Conditional Metric Manager or Tracker */}
      {editMode ? (
        <div className="flex-1">
          <MetricManager />
        </div>
      ) : (
        <>
          {/* Section Divider */}
          <hr className="section-divider" />
          <div className="flex-1">
            <MidnightTracker />
          </div>
        </>
      )}
    </div>
  );
};

export default Index;
