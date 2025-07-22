import React, { useState, useEffect } from 'react';
import TypewriterText from '@/components/TypewriterText';
import { Progress } from "@/components/ui/progress";
import { useSkillProgressionStore } from '@/stores/skillProgressionStore';
import VerticalProgressBar from '@/components/VerticalProgressBar';
import { 
  SkillData, 
  SkillCheckpoint,
  formatSkillValue,
  formatDate,
  getDaysUntilDate,
  isDateOverdue,
  getSkillCategory
} from '@/lib/skillProgression';
import { 
  Target, 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp,
  Edit3,
  Trash2,
  Save,
  X,
  Filter
} from 'lucide-react';

const SkillProgression = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const {
    skills,
    isLoading,
    lastUpdated,
    initializeSkills,
    loadSkillsFromSupabase,
    calculateProgressFromKPIs,
    getSkillsByCategory,
    getOverallProgress,
    getUpcomingCheckpoints,
    getOverdueCheckpoints
  } = useSkillProgressionStore();

  // Initialize on mount
  useEffect(() => {
    if (skills.length === 0) {
      initializeSkills();
    }
    loadSkillsFromSupabase();
  }, []);

  // Auto-calculate progress from KPIs every minute
  useEffect(() => {
    const interval = setInterval(() => {
      calculateProgressFromKPIs();
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Get filtered skills
  const filteredSkills = selectedCategory === 'all' 
    ? skills 
    : getSkillsByCategory(selectedCategory);

  // Get unique categories
  const categories = ['all', ...new Set(skills.map(skill => skill.category))];



  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-terminal-accent">Loading skill progression data...</div>
      </div>
    );
  }

  const overallProgress = getOverallProgress();
  const upcomingCheckpoints = getUpcomingCheckpoints();
  const overdueCheckpoints = getOverdueCheckpoints();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-4">
        <TypewriterText text="Skill Progression" className="text-xl mb-2" />
        <p className="text-terminal-accent/70 text-sm">
          Track your journey from current state to target mastery across 7 key skills
        </p>
      </div>

      {/* Overall Progress */}
      <div className="mb-6 p-4 border border-terminal-accent/30 bg-terminal-bg/20">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg text-terminal-accent">Overall Progress</h2>
          <div className="text-right">
            <div className="text-2xl font-bold text-terminal-accent">{overallProgress}%</div>
            <div className="text-xs text-terminal-accent/70">Complete</div>
          </div>
        </div>
        
        <Progress 
          value={overallProgress} 
          className="h-3 mb-3"
          style={{ '--progress-background': '#5FE3B3' } as React.CSSProperties}
        />
        
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="text-terminal-accent font-medium">{skills.length}</div>
            <div className="text-terminal-accent/70 text-xs">Skills Tracking</div>
          </div>
          <div className="text-center">
            <div className="text-green-400 font-medium">{upcomingCheckpoints.length}</div>
            <div className="text-terminal-accent/70 text-xs">Upcoming</div>
          </div>
          <div className="text-center">
            <div className="text-red-400 font-medium">{overdueCheckpoints.length}</div>
            <div className="text-terminal-accent/70 text-xs">Overdue</div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-4 flex gap-2 flex-wrap">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1 text-xs border transition-colors ${
              selectedCategory === category
                ? 'border-terminal-accent bg-terminal-accent text-terminal-bg'
                : 'border-terminal-accent/30 hover:border-terminal-accent/50'
            }`}
          >
            {category === 'all' ? 'All Skills' : getSkillCategory(category).name}
          </button>
        ))}
      </div>

      {/* Skills Timeline - Vertical Progress Bars */}
      <div className="flex-1 overflow-hidden">
        {/* Mobile: Horizontal scroll */}
                 <div className="md:hidden">
           <div className="flex gap-6 overflow-x-auto pb-4 px-4">
             {filteredSkills.map(skill => (
               <div key={skill.id} className="flex-shrink-0">
                 <VerticalProgressBar skill={skill} />
               </div>
             ))}
           </div>
         </div>

         {/* Desktop: Grid layout */}
         <div className="hidden md:block overflow-y-auto h-full">
           <div className="flex flex-wrap justify-center gap-8 p-8">
             {filteredSkills.map(skill => (
               <div key={skill.id} className="flex-shrink-0">
                 <VerticalProgressBar skill={skill} />
               </div>
             ))}
           </div>
         </div>
        
        {filteredSkills.length === 0 && (
          <div className="text-center py-8 text-terminal-accent/70">
            <Filter size={24} className="mx-auto mb-2 opacity-50" />
            No skills found for the selected category.
          </div>
        )}
      </div>
      

    </div>
  );
};

export default SkillProgression; 