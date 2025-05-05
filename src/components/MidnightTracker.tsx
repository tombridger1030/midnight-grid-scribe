import React, { useState, useEffect } from 'react';
import { loadData, saveData } from '@/lib/storage';
import MetricGrid from './MetricGrid';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Calendar, GitBranch } from 'lucide-react';
import { useDate } from '@/contexts/DateContext';
import CalendarNavigator from './CalendarNavigator';

const MidnightTracker: React.FC = () => {
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [showRoadmap, setShowRoadmap] = useState<boolean>(false);
  const { toast } = useToast();
  const { currentDate, setCurrentDate } = useDate();

  // Register keyboard shortcuts (Ctrl+N adds entry for selected date)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return;
      switch (e.key.toLowerCase()) {
        case 'n': // Ctrl+N: New Day for selected date
          e.preventDefault();
          handleAddDay(currentDate);
          break;
        case 'g': // Ctrl+G: Toggle Roadmap
          e.preventDefault();
          setShowRoadmap(prev => !prev);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentDate]);

  // Add a Tracker entry for the given date (or selected date by default)
  const handleAddDay = (dateToAdd?: string) => {
    const data = loadData();
    const dateKey = dateToAdd ?? currentDate;
    setCurrentDate(dateKey);
    // Only add the specified date if it doesn't exist
    if (!data.dates.includes(dateKey)) {
      data.dates.push(dateKey);
      saveData(data);
      setRefreshTrigger(prev => prev + 1);
      toast({
        title: "New day added",
        description: `Date (${dateKey}) has been added to your tracker.`
      });
    } else {
      toast({
        title: "Already exists",
        description: `Date (${dateKey}) is already in your tracker.`
      });
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="mb-4 flex items-center gap-2">
        <button className="terminal-button flex items-center" onClick={() => handleAddDay(currentDate)}>
          <Calendar size={14} className="mr-1" />
          New Day
        </button>
        <CalendarNavigator />
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
          <div className="bg-panel p-1 h-full">
            {/* This key forces the component to re-render when data changes */}
            <MetricGrid key={refreshTrigger} onAddDay={() => handleAddDay(currentDate)} />
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
