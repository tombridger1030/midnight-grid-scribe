
import React, { useState, useEffect } from 'react';
import { loadData, saveData, exportData, exportDataCSV } from '@/lib/storage';
import MetricGrid from './MetricGrid';
import FileImport from './FileImport';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Calendar, Download, Upload, GitBranch } from 'lucide-react';

const MidnightTracker: React.FC = () => {
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [showRoadmap, setShowRoadmap] = useState<boolean>(false);
  const { toast } = useToast();

  // Register keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only respond to key combinations with Ctrl
      if (!e.ctrlKey) return;
      
      switch (e.key.toLowerCase()) {
        case 'n': // Ctrl+N: New Day
          e.preventDefault();
          handleAddDay();
          break;
        case 'e': // Ctrl+E: Export
          e.preventDefault();
          handleExport();
          break;
        case 'g': // Ctrl+G: Toggle Roadmap
          e.preventDefault();
          setShowRoadmap(prev => !prev);
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
        <button className="terminal-button flex items-center" onClick={handleAddDay}>
          <Calendar size={14} className="mr-1" />
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
          <button className="terminal-button flex items-center" onClick={handleExport}>
            <Download size={14} className="mr-1" />
            Export {exportFormat.toUpperCase()}
          </button>
        </div>
        <div id="import-button">
          <FileImport onImportSuccess={handleImportSuccess} />
        </div>
        <button 
          className={`terminal-button flex items-center ${showRoadmap ? 'bg-terminal-accent text-terminal-bg' : ''}`}
          onClick={() => setShowRoadmap(prev => !prev)}
        >
          <GitBranch size={14} className="mr-1" />
          Toggle Roadmap (Ctrl+G)
        </button>
      </div>

      <div className={`flex ${showRoadmap ? 'flex-col md:flex-row' : 'flex-col'}`}>
        <div className={`${showRoadmap ? 'flex-1' : 'flex-1'}`}>
          <div className="bg-terminal-highlight p-1 h-full">
            {/* This key forces the component to re-render when data changes */}
            <MetricGrid key={refreshTrigger} onAddDay={handleAddDay} />
          </div>
        </div>
        
        {showRoadmap && (
          <div className="w-full md:w-64 mt-4 md:mt-0 md:ml-4 border border-terminal-accent/30 p-3">
            <h3 className="text-sm border-b border-terminal-accent/30 pb-1 mb-3 text-terminal-accent">Roadmap Milestones</h3>
            
            <h4 className="text-xs text-terminal-accent/80 mb-2">Echo Roadmap</h4>
            <ul className="space-y-2 mb-4">
              <li className="text-xs flex items-center">
                <input type="checkbox" className="mr-2" />
                <span>Q2 2025 – Complete Knowledge Assessment Engine</span>
              </li>
              <li className="text-xs flex items-center">
                <input type="checkbox" className="mr-2" />
                <span>Q3 2025 – Implement RAG Retrieval Pipeline</span>
              </li>
              <li className="text-xs flex items-center">
                <input type="checkbox" className="mr-2" />
                <span>Q4 2025 – Deploy AI Tutor MVP</span>
              </li>
              <li className="text-xs flex items-center">
                <input type="checkbox" className="mr-2" />
                <span>Q1 2026 – UI Polishing & Beta Launch</span>
              </li>
            </ul>
            
            <h4 className="text-xs text-terminal-accent/80 mb-2">Jiu-Jitsu Roadmap</h4>
            <ul className="space-y-2">
              <li className="text-xs flex items-center">
                <input type="checkbox" className="mr-2" />
                <span>Month 1 – Master Fundamental Drills</span>
              </li>
              <li className="text-xs flex items-center">
                <input type="checkbox" className="mr-2" />
                <span>Month 2 – Begin Competition-Style Sparring</span>
              </li>
              <li className="text-xs flex items-center">
                <input type="checkbox" className="mr-2" />
                <span>Month 3 – Belt Exam Preparation & Testing</span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default MidnightTracker;
