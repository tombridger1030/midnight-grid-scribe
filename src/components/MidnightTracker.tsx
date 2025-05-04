
import React, { useState, useEffect } from 'react';
import { loadData, saveData, exportData } from '@/lib/storage';
import MetricGrid from './MetricGrid';
import FileImport from './FileImport';
import { useToast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';

const MidnightTracker: React.FC = () => {
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const { toast } = useToast();

  // Register keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only respond to key combinations with Ctrl
      if (!e.ctrlKey) return;
      
      switch (e.key.toLowerCase()) {
        case 'm': // Ctrl+M: Add Metric
          e.preventDefault();
          handleAddMetric();
          break;
        case 'n': // Ctrl+N: New Day
          e.preventDefault();
          handleAddDay();
          break;
        case 'e': // Ctrl+E: Export
          e.preventDefault();
          handleExport();
          break;
        case 'i': // Ctrl+I: Import (shows file dialog)
          e.preventDefault();
          document.getElementById('import-button')?.click();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAddMetric = () => {
    const data = loadData();
    const newMetric = {
      id: uuidv4(),
      name: 'New Metric',
      values: {}
    };
    
    data.metrics.push(newMetric);
    saveData(data);
    setRefreshTrigger(prev => prev + 1);
    
    toast({
      title: "Metric added",
      description: "A new metric has been added to your tracker."
    });
  };

  const handleAddDay = () => {
    const data = loadData();
    const today = new Date().toISOString().split('T')[0];
    
    // Only add today if it doesn't exist
    if (!data.dates.includes(today)) {
      data.dates.push(today);
      saveData(data);
      setRefreshTrigger(prev => prev + 1);
      
      toast({
        title: "New day added",
        description: `Today (${today}) has been added to your tracker.`
      });
    } else {
      toast({
        title: "Already exists",
        description: "Today's date is already in your tracker."
      });
    }
  };

  const handleExport = () => {
    exportData();
    toast({
      title: "Export started",
      description: "Your data is being downloaded as a JSON file."
    });
  };

  const handleImportSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="py-4 px-6 border-b border-terminal-accent">
        <div className="flex items-center justify-between">
          <h1 className="text-terminal-text text-2xl font-mono font-bold">Midnight Tracker</h1>
          <div className="text-sm text-terminal-accent">
            <div className="animate-pulse-subtle">Personal metric tracking system</div>
            <div className="mt-1 text-xs">
              Keyboard shortcuts: Ctrl+M (New Metric), Ctrl+N (New Day), Ctrl+E (Export), Ctrl+I (Import)
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="mb-4 flex flex-wrap gap-2">
          <button className="terminal-button" onClick={handleAddMetric}>
            Add Metric
          </button>
          <button className="terminal-button" onClick={handleAddDay}>
            New Day
          </button>
          <button className="terminal-button" onClick={handleExport}>
            Export JSON
          </button>
          <div id="import-button">
            <FileImport onImportSuccess={handleImportSuccess} />
          </div>
        </div>

        <div className="bg-terminal-highlight p-1">
          {/* This key forces the component to re-render when data changes */}
          <MetricGrid key={refreshTrigger} onAddMetric={handleAddMetric} onAddDay={handleAddDay} />
        </div>
      </main>

      <footer className="py-3 px-6 border-t border-terminal-accent text-sm text-terminal-accent/70 text-center">
        <p>Midnight Tracker • Terminal-based personal metrics • Data stored locally</p>
      </footer>
    </div>
  );
};

export default MidnightTracker;
