
import React, { useState, useEffect } from 'react';
import TypewriterText from '@/components/TypewriterText';
import { v4 as uuidv4 } from 'uuid';

interface Goal {
  id: string;
  name: string;
  description: string;
  targetDate: string;
  progress: number; // 0-100
  category: string;
  milestones: {
    id: string;
    name: string;
    completed: boolean;
  }[];
}

const Roadmap = () => {
  const [goals, setGoals] = useState<Goal[]>(() => {
    const stored = localStorage.getItem('midnight-goals');
    return stored ? JSON.parse(stored) : [];
  });
  
  const [newGoal, setNewGoal] = useState<Partial<Goal>>({
    name: '',
    description: '',
    targetDate: new Date().toISOString().split('T')[0],
    progress: 0,
    category: 'Echo',
    milestones: []
  });
  
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [newMilestone, setNewMilestone] = useState('');
  const [filter, setFilter] = useState<string>('all');
  
  // Save goals when changed
  useEffect(() => {
    localStorage.setItem('midnight-goals', JSON.stringify(goals));
  }, [goals]);
  
  // Add a new goal
  const handleAddGoal = () => {
    if (!newGoal.name) return;
    
    const goal: Goal = {
      id: uuidv4(),
      name: newGoal.name || '',
      description: newGoal.description || '',
      targetDate: newGoal.targetDate || new Date().toISOString().split('T')[0],
      progress: newGoal.progress || 0,
      category: newGoal.category || 'Echo',
      milestones: []
    };
    
    setGoals(prev => [...prev, goal]);
    setNewGoal({
      name: '',
      description: '',
      targetDate: new Date().toISOString().split('T')[0],
      progress: 0,
      category: 'Echo',
      milestones: []
    });
  };
  
  // Add milestone to a goal
  const handleAddMilestone = (goalId: string) => {
    if (!newMilestone) return;
    
    setGoals(prev => prev.map(goal => {
      if (goal.id === goalId) {
        return {
          ...goal,
          milestones: [
            ...goal.milestones,
            {
              id: uuidv4(),
              name: newMilestone,
              completed: false
            }
          ]
        };
      }
      return goal;
    }));
    
    setNewMilestone('');
  };
  
  // Toggle milestone completion
  const toggleMilestone = (goalId: string, milestoneId: string) => {
    setGoals(prev => prev.map(goal => {
      if (goal.id === goalId) {
        const updatedMilestones = goal.milestones.map(ms => {
          if (ms.id === milestoneId) {
            return { ...ms, completed: !ms.completed };
          }
          return ms;
        });
        
        // Update progress based on completed milestones
        const completed = updatedMilestones.filter(ms => ms.completed).length;
        const progress = updatedMilestones.length 
          ? Math.round((completed / updatedMilestones.length) * 100) 
          : 0;
        
        return {
          ...goal,
          milestones: updatedMilestones,
          progress
        };
      }
      return goal;
    }));
  };
  
  // Update goal progress directly
  const updateGoalProgress = (goalId: string, progress: number) => {
    setGoals(prev => prev.map(goal => {
      if (goal.id === goalId) {
        return { ...goal, progress: Math.min(100, Math.max(0, progress)) };
      }
      return goal;
    }));
  };
  
  // Delete a goal
  const deleteGoal = (goalId: string) => {
    setGoals(prev => prev.filter(goal => goal.id !== goalId));
    if (selectedGoal === goalId) {
      setSelectedGoal(null);
    }
  };
  
  // Filter goals by category
  const filteredGoals = filter === 'all' 
    ? goals 
    : goals.filter(goal => goal.category === filter);
  
  // Get unique categories for filter
  const categories = Array.from(new Set(goals.map(goal => goal.category)));
  
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
  
  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <TypewriterText text="Roadmap & Goals" className="text-xl mb-2" />
        <p className="text-terminal-accent/70 text-sm">Track Echo milestones and personal targets.</p>
        
        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mt-4 mb-4">
          <button
            className={`terminal-button ${filter === 'all' ? 'bg-terminal-accent text-terminal-bg' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          
          {categories.map(category => (
            <button
              key={category}
              className={`terminal-button ${filter === category ? 'bg-terminal-accent text-terminal-bg' : ''}`}
              onClick={() => setFilter(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Goals list */}
        <div className="border border-terminal-accent/30 p-4 h-[calc(100vh-240px)] overflow-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm text-terminal-accent">Goals & Milestones</h3>
            <span className="text-xs">{filteredGoals.length} goal{filteredGoals.length !== 1 ? 's' : ''}</span>
          </div>
          
          {/* Goal list */}
          {filteredGoals.length > 0 ? (
            <div className="space-y-4">
              {filteredGoals.map(goal => (
                <div 
                  key={goal.id}
                  className={`border border-terminal-accent/40 p-3 cursor-pointer transition-colors ${
                    selectedGoal === goal.id ? 'bg-terminal-accent/10' : ''
                  }`}
                  onClick={() => setSelectedGoal(goal.id === selectedGoal ? null : goal.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{goal.name}</div>
                      <div className="text-xs text-terminal-accent/70 flex items-center mt-1">
                        <span className="mr-2">{goal.category}</span>
                        <span className="text-xs px-1 border border-terminal-accent/30">
                          {goal.targetDate.split('-').slice(1).join('/')}/{goal.targetDate.split('-')[0].slice(2)}
                        </span>
                        <span className="ml-2 text-xs">
                          {getDaysUntil(goal.targetDate)}
                        </span>
                      </div>
                    </div>
                    <button 
                      className="text-terminal-accent/70 hover:text-terminal-accent px-1"
                      onClick={(e) => { e.stopPropagation(); deleteGoal(goal.id); }}
                    >
                      ×
                    </button>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="h-1 w-full bg-terminal-accent/20 mt-2 mb-1">
                    <div 
                      className="h-full bg-terminal-accent" 
                      style={{ width: `${goal.progress}%` }}
                    ></div>
                  </div>
                  <div className="text-right text-xs">{goal.progress}%</div>
                  
                  {/* Expanded view with milestones */}
                  {selectedGoal === goal.id && (
                    <div className="mt-3 border-t border-terminal-accent/30 pt-3">
                      {goal.description && (
                        <div className="text-xs mb-3 text-terminal-accent/90">
                          {goal.description}
                        </div>
                      )}
                      
                      <div className="text-xs mb-2 text-terminal-accent">Milestones:</div>
                      
                      {goal.milestones.length > 0 ? (
                        <ul className="space-y-2 mb-3">
                          {goal.milestones.map(milestone => (
                            <li key={milestone.id} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={milestone.completed}
                                onChange={() => toggleMilestone(goal.id, milestone.id)}
                                className="mr-2 cursor-pointer"
                              />
                              <span className={`text-xs ${milestone.completed ? 'line-through opacity-70' : ''}`}>
                                {milestone.name}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-xs text-terminal-accent/60 mb-3">No milestones yet</div>
                      )}
                      
                      {/* Manual progress adjust */}
                      <div className="mb-3">
                        <div className="text-xs mb-1">Update progress:</div>
                        <div className="flex items-center">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={goal.progress}
                            onChange={(e) => updateGoalProgress(goal.id, parseInt(e.target.value))}
                            className="flex-1 mr-2"
                          />
                          <span className="text-xs">{goal.progress}%</span>
                        </div>
                      </div>
                      
                      {/* Add milestone form */}
                      <div className="flex mt-2">
                        <input
                          type="text"
                          value={newMilestone}
                          onChange={(e) => setNewMilestone(e.target.value)}
                          placeholder="New milestone"
                          className="terminal-input flex-1 text-xs px-2 py-1 mr-2"
                        />
                        <button 
                          className="terminal-button text-xs py-1"
                          onClick={() => handleAddMilestone(goal.id)}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-terminal-accent/50">
              {filter === 'all' ? 'No goals yet' : `No goals in ${filter} category`}
            </div>
          )}
        </div>
        
        {/* Add new goal form */}
        <div className="border border-terminal-accent/30 p-4">
          <h3 className="text-sm text-terminal-accent mb-4">Add New Goal</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs mb-1">Name:</label>
              <input
                type="text"
                value={newGoal.name}
                onChange={(e) => setNewGoal(prev => ({ ...prev, name: e.target.value }))}
                className="terminal-input w-full px-2 py-1"
                placeholder="Goal name"
              />
            </div>
            
            <div>
              <label className="block text-xs mb-1">Category:</label>
              <div className="flex flex-wrap gap-2">
                {['Echo', 'Fitness', 'Finance', 'Personal'].map(cat => (
                  <button
                    key={cat}
                    className={`terminal-button text-xs py-1 ${newGoal.category === cat ? 'bg-terminal-accent text-terminal-bg' : ''}`}
                    onClick={() => setNewGoal(prev => ({ ...prev, category: cat }))}
                  >
                    {cat}
                  </button>
                ))}
                <input
                  type="text"
                  value={newGoal.category === 'Echo' || newGoal.category === 'Fitness' || 
                         newGoal.category === 'Finance' || newGoal.category === 'Personal' 
                         ? '' : (newGoal.category || '')}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, category: e.target.value }))}
                  className="terminal-input text-xs px-2 py-1 w-24"
                  placeholder="Custom"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs mb-1">Target Date:</label>
              <input
                type="date"
                value={newGoal.targetDate}
                onChange={(e) => setNewGoal(prev => ({ ...prev, targetDate: e.target.value }))}
                className="terminal-input w-full px-2 py-1"
              />
            </div>
            
            <div>
              <label className="block text-xs mb-1">Description:</label>
              <textarea
                value={newGoal.description}
                onChange={(e) => setNewGoal(prev => ({ ...prev, description: e.target.value }))}
                className="terminal-input w-full px-2 py-1 h-20 resize-none"
                placeholder="Brief description of the goal"
              />
            </div>
            
            <div>
              <button 
                className="terminal-button w-full" 
                onClick={handleAddGoal}
                disabled={!newGoal.name}
              >
                Add Goal
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Roadmap;
