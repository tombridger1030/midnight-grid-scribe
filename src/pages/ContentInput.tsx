import React, { useState } from 'react';
import MultiPlatformContentWizard from '@/components/content/input/MultiPlatformContentWizard';
import ContentWizard from '@/components/content/input/ContentWizard';
import StreamlinedContentInput from '@/components/content/input/StreamlinedContentInput';

const ContentInput: React.FC = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [useOldWizard, setUseOldWizard] = useState(false);

  const handleComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="text-sm text-[#8A8D93]">
          Add your content performance data and metrics across platforms
        </div>

        <div className="flex justify-center gap-2">
          <button
            onClick={() => setUseOldWizard(false)}
            className={`px-4 py-2 text-sm font-medium rounded-sm transition-colors ${
              !useOldWizard
                ? 'bg-terminal-accent text-black'
                : 'text-[#8A8D93] hover:text-white'
            }`}
          >
            🚀 New Streamlined Input
          </button>
          <button
            onClick={() => setUseOldWizard(true)}
            className={`px-4 py-2 text-sm font-medium rounded-sm transition-colors ${
              useOldWizard
                ? 'bg-terminal-accent text-black'
                : 'text-[#8A8D93] hover:text-white'
            }`}
          >
            📋 Classic Wizard
          </button>
        </div>

        <div className="text-xs text-[#8A8D93] max-w-md mx-auto">
          {!useOldWizard
            ? 'New streamlined experience with auto-save and better UX. Works directly on the page without modals.'
            : 'Original wizard experience with step-by-step modals.'
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
      {!useOldWizard ? (
        <StreamlinedContentInput onComplete={handleComplete} />
      ) : (
        <div className="space-y-6">
          {/* Mode Selector for Classic Wizard */}
          <div className="flex justify-center">
            <div className="inline-flex bg-[#0F0F0F] border border-[#333] rounded-sm p-1">
              <button
                onClick={() => setUseOldWizard(true)}
                className="px-4 py-2 text-sm font-medium rounded-sm transition-colors text-[#8A8D93] hover:text-white"
              >
                🚀 Multi-Platform Post
              </button>
              <button
                onClick={() => setUseOldWizard(true)}
                className="px-4 py-2 text-sm font-medium rounded-sm transition-colors text-[#8A8D93] hover:text-white"
              >
                📱 Single Platform
              </button>
            </div>
          </div>

          <div className="text-center py-12 border border-[#333] bg-[#111] rounded-sm">
            <div className="space-y-4">
              <div className="text-[#8A8D93] text-sm">Click the buttons above to use the classic wizard experience</div>
              <div className="text-xs text-[#8A8D93] opacity-70">
                Or try the new streamlined input above for a better experience
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentInput;


