import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { FIXED_USER_ID } from '@/lib/storage';
import {
  SkillData,
  SkillCheckpoint,
  SkillProgressionData,
  PREDEFINED_SKILLS,
  WEEKLY_KPI_SKILL_MAPPING,
  SKILL_PROGRESSION_RATES,
  calculateSkillProgress,
  WeeklyKPIContribution
} from '@/lib/skillProgression';
import {
  WEEKLY_KPI_DEFINITIONS,
  loadWeeklyKPIs,
  getWeeklyKPIRecord,
  getCurrentWeek,
  WeeklyKPIValues
} from '@/lib/weeklyKpi';

interface SkillProgressionStore {
  // State
  skills: SkillData[];
  isLoading: boolean;
  lastUpdated: string;
  
  // Actions
  initializeSkills: () => void;
  loadSkillsFromSupabase: () => Promise<void>;
  saveSkillsToSupabase: () => Promise<void>;
  updateSkillValue: (skillId: string, newValue: number) => Promise<void>;
  updateSkillCheckpoint: (skillId: string, checkpointId: string, updates: Partial<SkillCheckpoint>) => Promise<void>;
  addSkillCheckpoint: (skillId: string, checkpoint: Omit<SkillCheckpoint, 'id'>) => Promise<void>;
  deleteSkillCheckpoint: (skillId: string, checkpointId: string) => Promise<void>;
  calculateProgressFromKPIs: () => Promise<void>;
  updateSkillFromAI: (skillId: string, naturalLanguageUpdate: string) => Promise<void>;
  
  // Computed values
  getSkillById: (skillId: string) => SkillData | undefined;
  getSkillsByCategory: (category: string) => SkillData[];
  getOverallProgress: () => number;
  getUpcomingCheckpoints: () => SkillCheckpoint[];
  getOverdueCheckpoints: () => SkillCheckpoint[];
}

export const useSkillProgressionStore = create<SkillProgressionStore>()(
  persist(
    (set, get) => ({
      // Initial state
      skills: [],
      isLoading: false,
      lastUpdated: new Date().toISOString(),
      
      // Initialize skills with predefined data
      initializeSkills: () => {
        const initialSkills: SkillData[] = PREDEFINED_SKILLS.map(skill => ({
          ...skill,
          checkpoints: [],
          progressPercentage: calculateSkillProgress(skill as SkillData),
          lastUpdated: new Date().toISOString()
        }));
        
        set({ skills: initialSkills, lastUpdated: new Date().toISOString() });
      },
      
      // Load skills from Supabase
      loadSkillsFromSupabase: async () => {
        try {
          set({ isLoading: true });
          
          const { data, error } = await supabase
            .from('skill_progression')
            .select('*')
            .eq('user_id', FIXED_USER_ID)
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (error) {
            console.error('Error loading skills from Supabase:', error);
            return;
          }
          
          if (data && data.length > 0) {
            const skillData = data[0].data as SkillProgressionData;
            set({ 
              skills: skillData.skills,
              lastUpdated: skillData.lastUpdated
            });
          } else {
            // Initialize with default skills if no data exists
            get().initializeSkills();
            await get().saveSkillsToSupabase();
          }
        } catch (error) {
          console.error('Failed to load skills from Supabase:', error);
        } finally {
          set({ isLoading: false });
        }
      },
      
      // Save skills to Supabase
      saveSkillsToSupabase: async () => {
        try {
          const { skills, lastUpdated } = get();
          
          const progressionData: SkillProgressionData = {
            skills,
            lastUpdated,
            kpiContributions: WEEKLY_KPI_SKILL_MAPPING
          };
          
          const { error } = await supabase
            .from('skill_progression')
            .upsert({
              user_id: FIXED_USER_ID,
              data: progressionData,
              updated_at: new Date().toISOString()
            });
          
          if (error) {
            console.error('Error saving skills to Supabase:', error);
          }
        } catch (error) {
          console.error('Failed to save skills to Supabase:', error);
        }
      },
      
      // Update skill value
      updateSkillValue: async (skillId: string, newValue: number) => {
        const { skills } = get();
        const updatedSkills = skills.map(skill => {
          if (skill.id === skillId) {
            const updatedSkill = {
              ...skill,
              currentValue: newValue,
              lastUpdated: new Date().toISOString()
            };
            updatedSkill.progressPercentage = calculateSkillProgress(updatedSkill);
            return updatedSkill;
          }
          return skill;
        });
        
        set({ skills: updatedSkills, lastUpdated: new Date().toISOString() });
        await get().saveSkillsToSupabase();
      },
      
      // Update skill checkpoint
      updateSkillCheckpoint: async (skillId: string, checkpointId: string, updates: Partial<SkillCheckpoint>) => {
        const { skills } = get();
        const updatedSkills = skills.map(skill => {
          if (skill.id === skillId) {
            const updatedCheckpoints = skill.checkpoints.map(checkpoint => {
              if (checkpoint.id === checkpointId) {
                return { ...checkpoint, ...updates };
              }
              return checkpoint;
            });
            return {
              ...skill,
              checkpoints: updatedCheckpoints,
              lastUpdated: new Date().toISOString()
            };
          }
          return skill;
        });
        
        set({ skills: updatedSkills, lastUpdated: new Date().toISOString() });
        await get().saveSkillsToSupabase();
      },
      
      // Add skill checkpoint
      addSkillCheckpoint: async (skillId: string, checkpoint: Omit<SkillCheckpoint, 'id'>) => {
        const { skills } = get();
        const newCheckpoint: SkillCheckpoint = {
          ...checkpoint,
          id: `checkpoint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
        
        const updatedSkills = skills.map(skill => {
          if (skill.id === skillId) {
            return {
              ...skill,
              checkpoints: [...skill.checkpoints, newCheckpoint],
              lastUpdated: new Date().toISOString()
            };
          }
          return skill;
        });
        
        set({ skills: updatedSkills, lastUpdated: new Date().toISOString() });
        await get().saveSkillsToSupabase();
      },
      
      // Delete skill checkpoint
      deleteSkillCheckpoint: async (skillId: string, checkpointId: string) => {
        const { skills } = get();
        const updatedSkills = skills.map(skill => {
          if (skill.id === skillId) {
            return {
              ...skill,
              checkpoints: skill.checkpoints.filter(cp => cp.id !== checkpointId),
              lastUpdated: new Date().toISOString()
            };
          }
          return skill;
        });
        
        set({ skills: updatedSkills, lastUpdated: new Date().toISOString() });
        await get().saveSkillsToSupabase();
      },
      
      // Calculate progress from weekly KPIs
      calculateProgressFromKPIs: async () => {
        try {
          const { skills } = get();
          const weeklyKPIs = loadWeeklyKPIs();
          const currentWeek = getCurrentWeek();
          const currentWeekData = getWeeklyKPIRecord(currentWeek);
          
          if (!currentWeekData) {
            console.log('No current week KPI data found');
            return;
          }
          
          const updatedSkills = skills.map(skill => {
            const contributions = WEEKLY_KPI_SKILL_MAPPING[skill.id] || [];
            let weeklyProgressionRate = 0;
            
            // Calculate KPI-based progression
            contributions.forEach(({ kpiId, weight, formula }) => {
              const kpiDefinition = WEEKLY_KPI_DEFINITIONS.find(def => def.id === kpiId);
              if (!kpiDefinition) return;
              
              const kpiValue = currentWeekData.values[kpiId] || 0;
              const kpiTarget = kpiDefinition.target;
              const kpiProgress = Math.min(100, (kpiValue / kpiTarget) * 100);
              
              let contributionMultiplier = 0;
              
              switch (formula) {
                case 'linear':
                  contributionMultiplier = kpiProgress / 100;
                  break;
                case 'threshold':
                  contributionMultiplier = kpiProgress >= 80 ? 1 : 0;
                  break;
                case 'exponential':
                  contributionMultiplier = Math.pow(kpiProgress / 100, 2);
                  break;
              }
              
              weeklyProgressionRate += (weight / 100) * contributionMultiplier;
            });
            
            // Apply base progression rate modified by KPI performance
            const baseRate = SKILL_PROGRESSION_RATES[skill.id] || 0;
            const actualProgressionRate = baseRate * weeklyProgressionRate;
            
            // Calculate new value based on progression
            let newValue = skill.currentValue;
            const progressRange = skill.targetValue - (PREDEFINED_SKILLS.find(s => s.id === skill.id)?.currentValue || 0);
            
            if (skill.id === 'bodyComp') {
              // Body composition decreases (lower is better)
              const decreaseAmount = progressRange * (actualProgressionRate / 100);
              newValue = Math.max(skill.targetValue, skill.currentValue - decreaseAmount);
            } else {
              // Other skills increase
              const increaseAmount = progressRange * (actualProgressionRate / 100);
              newValue = Math.min(skill.targetValue, skill.currentValue + increaseAmount);
            }
            
            const updatedSkill = {
              ...skill,
              currentValue: newValue,
              lastUpdated: new Date().toISOString()
            };
            
            updatedSkill.progressPercentage = calculateSkillProgress(updatedSkill);
            
            return updatedSkill;
          });
          
          set({ skills: updatedSkills, lastUpdated: new Date().toISOString() });
          await get().saveSkillsToSupabase();
        } catch (error) {
          console.error('Error calculating progress from KPIs:', error);
        }
      },
      
      // Update skill from AI natural language
      updateSkillFromAI: async (skillId: string, naturalLanguageUpdate: string) => {
        // This would integrate with OpenAI API to parse natural language updates
        // For now, we'll implement a basic version
        console.log(`AI Update for ${skillId}: ${naturalLanguageUpdate}`);
        // TODO: Implement OpenAI integration
      },
      
      // Get skill by ID
      getSkillById: (skillId: string) => {
        const { skills } = get();
        return skills.find(skill => skill.id === skillId);
      },
      
      // Get skills by category
      getSkillsByCategory: (category: string) => {
        const { skills } = get();
        return skills.filter(skill => skill.category === category);
      },
      
      // Get overall progress
      getOverallProgress: () => {
        const { skills } = get();
        if (skills.length === 0) return 0;
        const totalProgress = skills.reduce((sum, skill) => sum + skill.progressPercentage, 0);
        return Math.round(totalProgress / skills.length);
      },
      
      // Get upcoming checkpoints
      getUpcomingCheckpoints: () => {
        const { skills } = get();
        const now = new Date();
        const checkpoints: SkillCheckpoint[] = [];
        
        skills.forEach(skill => {
          skill.checkpoints.forEach(checkpoint => {
            if (!checkpoint.isCompleted && new Date(checkpoint.targetDate) > now) {
              checkpoints.push(checkpoint);
            }
          });
        });
        
        return checkpoints.sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
      },
      
      // Get overdue checkpoints
      getOverdueCheckpoints: () => {
        const { skills } = get();
        const now = new Date();
        const checkpoints: SkillCheckpoint[] = [];
        
        skills.forEach(skill => {
          skill.checkpoints.forEach(checkpoint => {
            if (!checkpoint.isCompleted && new Date(checkpoint.targetDate) < now) {
              checkpoints.push(checkpoint);
            }
          });
        });
        
        return checkpoints.sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
      }
    }),
    {
      name: 'noctisium-skill-progression',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
); 