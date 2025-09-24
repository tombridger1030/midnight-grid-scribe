import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import ContentWizard from '@/components/content/input/ContentWizard';
import QuickEntry from '@/components/content/input/QuickEntry';
import ContentImporter from '@/components/ContentImporter';

type InputMode = 'wizard' | 'quick';

const ContentInput: React.FC = () => {
  const [mode, setMode] = useState<InputMode>('wizard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const ModeSelector: React.FC = () => (
    <div className="flex items-center gap-2 mb-6">
      <div className="text-sm text-[#8A8D93] mr-4">Input Method:</div>
      {[
        { id: 'wizard', label: 'Step-by-Step', emoji: '🧙‍♂️', description: 'Guided form with all fields' },
        { id: 'quick', label: 'Quick Entry', emoji: '⚡', description: 'Rapid data entry' }
      ].map((option) => (
        <button
          key={option.id}
          onClick={() => setMode(option.id as InputMode)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-sm border transition-colors text-sm',
            mode === option.id
              ? 'bg-[#5FE3B3] text-black border-[#5FE3B3]'
              : 'bg-[#1D1D1D] text-[#8A8D93] border-[#333] hover:bg-[#2A2A2A]'
          )}
        >
          <span>{option.emoji}</span>
          <div className="text-left">
            <div className="font-medium">{option.label}</div>
            <div className={cn(
              'text-xs opacity-70',
              mode === option.id ? 'text-black/70' : 'text-[#666]'
            )}>
              {option.description}
            </div>
          </div>
        </button>
      ))}
    </div>
  );

  const renderContent = () => {
    switch (mode) {
      case 'wizard':
        return (
          <ContentWizard
            key={refreshTrigger}
            onComplete={handleComplete}
          />
        );

      case 'quick':
        return (
          <div className="max-w-lg mx-auto">
            <QuickEntry
              key={refreshTrigger}
              onComplete={handleComplete}
            />
          </div>
        );


      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <ModeSelector />

      {/* Success Message */}
      {refreshTrigger > 0 && (
        <div className="max-w-2xl mx-auto p-3 bg-green-500/10 border border-green-500/30 rounded-sm text-center">
          <div className="text-green-400 text-sm font-medium mb-1">✅ Content Added Successfully!</div>
          <div className="text-green-300 text-xs">Your content has been saved and is now available in the dashboard and weekly views.</div>
        </div>
      )}

      {renderContent()}
    </div>
  );
};

export default ContentInput;


