import React, { useState } from 'react';
import MultiPlatformContentWizard from '@/components/content/input/MultiPlatformContentWizard';
import ContentWizard from '@/components/content/input/ContentWizard';

const ContentInput: React.FC = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [inputMode, setInputMode] = useState<'multi' | 'single'>('multi');
  const [showWizard, setShowWizard] = useState(true);

  const handleComplete = () => {
    setRefreshTrigger(prev => prev + 1);
    setShowWizard(false);
    // Show success message briefly, then allow user to manually start a new entry
    setTimeout(() => {
      // Don't automatically show the wizard again
    }, 100);
  };

  const handleCancel = () => {
    setShowWizard(false);
    // Don't automatically show the wizard again - let user decide
  };

  const startNewEntry = () => {
    setRefreshTrigger(prev => prev + 1);
    setShowWizard(true);
  };

  return (
    <div className="space-y-6">
      {/* Header & Mode Selector */}
      <div className="text-center space-y-4">
        <div className="text-sm text-[#8A8D93]">
          Add your content performance data and metrics across platforms
        </div>

        <div className="flex justify-center">
          <div className="inline-flex bg-[#0F0F0F] border border-[#333] rounded-sm p-1">
            <button
              onClick={() => setInputMode('multi')}
              className={`px-4 py-2 text-sm font-medium rounded-sm transition-colors ${
                inputMode === 'multi'
                  ? 'bg-terminal-accent text-black'
                  : 'text-[#8A8D93] hover:text-white'
              }`}
            >
              🚀 Multi-Platform Post
            </button>
            <button
              onClick={() => setInputMode('single')}
              className={`px-4 py-2 text-sm font-medium rounded-sm transition-colors ${
                inputMode === 'single'
                  ? 'bg-terminal-accent text-black'
                  : 'text-[#8A8D93] hover:text-white'
              }`}
            >
              📱 Single Platform
            </button>
          </div>
        </div>

        <div className="text-xs text-[#8A8D93] max-w-md mx-auto">
          {inputMode === 'multi'
            ? 'Perfect for when you post the same video to multiple platforms. Add platform-specific metrics in one go.'
            : 'For content posted to just one platform or when you need separate entries.'
          }
        </div>
      </div>

      {/* Success Message */}
      {refreshTrigger > 0 && (
        <div className="max-w-2xl mx-auto p-3 bg-green-500/10 border border-green-500/30 rounded-sm text-center">
          <div className="text-green-400 text-sm font-medium mb-1">✅ Content Added Successfully!</div>
          <div className="text-green-300 text-xs">Your content has been saved and is now available in the dashboard and weekly views.</div>
        </div>
      )}

      {/* Content Input */}
      {showWizard ? (
        <>
          {inputMode === 'multi' ? (
            <MultiPlatformContentWizard
              key={`multi-${refreshTrigger}`}
              onComplete={handleComplete}
              onCancel={handleCancel}
            />
          ) : (
            <ContentWizard
              key={`single-${refreshTrigger}`}
              onComplete={handleComplete}
              onCancel={handleCancel}
            />
          )}
        </>
      ) : (
        <div className="text-center py-12 border border-[#333] bg-[#111] rounded-sm">
          <div className="space-y-4">
            <div className="text-[#8A8D93] text-sm">Ready to add more content?</div>
            <button
              onClick={startNewEntry}
              className="px-6 py-3 bg-terminal-accent text-black font-medium rounded-sm hover:bg-terminal-accent/90 transition-colors"
            >
              Start New Entry
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentInput;


