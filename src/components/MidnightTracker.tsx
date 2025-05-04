
import React, { useState, useEffect } from 'react';
import { loadData, saveData, exportData, exportDataCSV } from '@/lib/storage';
import MetricGrid from './MetricGrid';
import FileImport from './FileImport';
import { useToast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';

const MidnightTracker: React.FC = () => {
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
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
  }, [exportFormat]);

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
    if (exportFormat === 'json') {
      exportData();
    } else {
      exportDataCSV();
    }
    
    toast({
      title: "Export started",
      description: `Your data is being downloaded as a ${exportFormat.toUpperCase()} file.`
    });
  };

  const handleImportSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="mb-4 flex flex-wrap gap-2">
        <button className="terminal-button" onClick={handleAddMetric}>
          Add Metric
        </button>
        <button className="terminal-button" onClick={handleAddDay}>
          New Day
        </button>
        <div className="flex items-center">
          <div className="flex border border-terminal-accent mr-2">
            <button 
              className={`px-2 py-1 ${exportFormat === 'json' ? 'bg-terminal-accent text-terminal-bg' : ''}`}
              onClick={() => setExportFormat('json')}
            >
              JSON
            </button>
            <button 
              className={`px-2 py-1 ${exportFormat === 'csv' ? 'bg-terminal-accent text-terminal-bg' : ''}`}
              onClick={() => setExportFormat('csv')}
            >
              CSV
            </button>
          </div>
          <button className="terminal-button" onClick={handleExport}>
            Export {exportFormat.toUpperCase()}
          </button>
        </div>
        <div id="import-button">
          <FileImport onImportSuccess={handleImportSuccess} />
        </div>
      </div>

      <div className="flex-1">
        <div className="bg-terminal-highlight p-1 h-full">
          {/* This key forces the component to re-render when data changes */}
          <MetricGrid key={refreshTrigger} onAddMetric={handleAddMetric} onAddDay={handleAddDay} />
        </div>
      </div>
    </div>
  );
};

export default MidnightTracker;
