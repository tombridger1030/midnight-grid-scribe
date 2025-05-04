
import React, { useState, useEffect } from 'react';
import TypewriterText from '@/components/TypewriterText';
import { Progress } from "@/components/ui/progress";
import { GitBranch, Calendar, CheckCircle, Flag, MapPin, Timer } from 'lucide-react';

interface Milestone {
  id: string;
  name: string;
  targetDate: string;
  completed: boolean;
}

interface RoadmapCategory {
  id: string;
  name: string;
  description?: string;
  milestones: Milestone[];
}

const Roadmap = () => {
  const [selectedMilestone, setSelectedMilestone] = useState<string | null>(null);
  const [roadmaps, setRoadmaps] = useState<RoadmapCategory[]>(() => {
    const stored = localStorage.getItem('midnight-roadmaps');
    if (stored) return JSON.parse(stored);
    
    // Default roadmaps
    return [
      {
        id: 'echo',
        name: 'Echo Roadmap',
        description: 'Product development and feature implementation timeline',
        milestones: [
          {
            id: 'echo-q2-2025',
            name: 'Q2 2025 – Complete Knowledge Assessment Engine',
            targetDate: '2025-06-30',
            completed: false
          },
          {
            id: 'echo-q3-2025',
            name: 'Q3 2025 – Implement RAG Retrieval Pipeline',
            targetDate: '2025-09-30',
            completed: false
          },
          {
            id: 'echo-q4-2025',
            name: 'Q4 2025 – Deploy AI Tutor MVP',
            targetDate: '2025-12-31',
            completed: false
          },
          {
            id: 'echo-q1-2026',
            name: 'Q1 2026 – UI Polishing & Beta Launch',
            targetDate: '2026-03-31',
            completed: false
          }
        ]
      },
      {
        id: 'jiujitsu',
        name: 'Jiu-Jitsu Roadmap',
        description: 'Training progression and belt advancement timeline',
        milestones: [
          {
            id: 'jj-month1',
            name: 'Month 1 – Master Fundamental Drills',
            targetDate: '2025-06-01',
            completed: false
          },
          {
            id: 'jj-month2',
            name: 'Month 2 – Begin Competition-Style Sparring',
            targetDate: '2025-07-01',
            completed: false
          },
          {
            id: 'jj-month3',
            name: 'Month 3 – Belt Exam Preparation & Testing',
            targetDate: '2025-08-01',
            completed: false
          }
        ]
      }
    ];
  });
  
  // Save milestones when changed
  useEffect(() => {
    localStorage.setItem('midnight-roadmaps', JSON.stringify(roadmaps));
  }, [roadmaps]);
  
  // Toggle milestone completion
  const toggleMilestone = (categoryId: string, milestoneId: string) => {
    setRoadmaps(prev => prev.map(category => {
      if (category.id === categoryId) {
        return {
          ...category,
          milestones: category.milestones.map(milestone => {
            if (milestone.id === milestoneId) {
              return { ...milestone, completed: !milestone.completed };
            }
            return milestone;
          })
        };
      }
      return category;
    }));
  };
  
  // Calculate roadmap completion percentage
  const calculateProgress = (category: RoadmapCategory) => {
    if (category.milestones.length === 0) return 0;
    const completed = category.milestones.filter(m => m.completed).length;
    return Math.round((completed / category.milestones.length) * 100);
  };
  
  // Days until target date
  const getDaysUntil = (dateString: string) => {
    const target = new Date(dateString);
    const today = new Date();
    
    // Clear time part for accurate day calculation
    target.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days overdue`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else {
      return `${diffDays} days left`;
    }
  };

  // Get an icon for a milestone based on its status
  const getMilestoneIcon = (milestone: Milestone) => {
    const target = new Date(milestone.targetDate);
    const today = new Date();
    
    if (milestone.completed) {
      return <CheckCircle size={14} className="text-[#5FE3B3]" />;
    }
    
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return <Flag size={14} className="text-terminal-accent" />;
    } else if (diffDays <= 30) {
      return <Timer size={14} className="text-[#53B4FF]" />;
    } else {
      return <MapPin size={14} className="text-terminal-text/70" />;
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <TypewriterText text="Roadmap & Goals" className="text-xl mb-2" />
        <p className="text-terminal-accent/70 text-sm">Track Echo milestones and personal targets.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
        {/* Echo Roadmap */}
        {roadmaps.map(category => (
          <div key={category.id} className="border border-terminal-accent/30 p-4">
            <div className="flex items-center mb-3">
              <GitBranch size={16} className="mr-2 text-terminal-accent" />
              <h3 className="text-sm text-terminal-accent">{category.name}</h3>
            </div>
            
            {category.description && (
              <p className="text-xs text-terminal-accent/70 mb-4">{category.description}</p>
            )}
            
            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between items-center text-xs mb-1">
                <span>Completion</span>
                <span>{calculateProgress(category)}%</span>
              </div>
              <Progress 
                value={calculateProgress(category)} 
                className="h-1 bg-terminal-accent/20"
              />
            </div>
            
            {/* Milestones */}
            <div className="space-y-3 h-[calc(100%-100px)] overflow-auto">
              {category.milestones.map(milestone => (
                <div
                  key={milestone.id}
                  className={`border border-terminal-accent/40 p-3 cursor-pointer transition-colors ${
                    selectedMilestone === milestone.id ? 'bg-terminal-accent/10' : ''
                  }`}
                  onClick={() => setSelectedMilestone(milestone.id === selectedMilestone ? null : milestone.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div className="mr-2">{getMilestoneIcon(milestone)}</div>
                      <h4 className={`text-sm ${milestone.completed ? 'line-through text-terminal-text/50' : ''}`}>
                        {milestone.name}
                      </h4>
                    </div>
                    <input
                      type="checkbox"
                      checked={milestone.completed}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleMilestone(category.id, milestone.id);
                      }}
                      className="cursor-pointer"
                    />
                  </div>
                  
                  <div className="flex items-center text-xs text-terminal-text/70">
                    <Calendar size={12} className="mr-1" />
                    <span className="mr-2">Target: {new Date(milestone.targetDate).toLocaleDateString()}</span>
                    <span>{getDaysUntil(milestone.targetDate)}</span>
                  </div>
                  
                  {selectedMilestone === milestone.id && (
                    <div className="mt-2 pt-2 border-t border-terminal-accent/20">
                      <div className="text-xs text-terminal-accent">Notes</div>
                      <textarea
                        className="w-full h-20 bg-terminal-bg border border-terminal-accent/30 p-2 text-xs mt-1 resize-none"
                        placeholder="Add notes about your progress on this milestone..."
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Roadmap;
