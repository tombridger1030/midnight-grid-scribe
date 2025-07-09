// Skill Progression System - Core Data Models & Types

export interface SkillCheckpoint {
  id: string;
  skillId: string;
  name: string;
  description: string;
  targetDate: string;
  isCompleted: boolean;
  completedDate?: string;
  progressPercentage: number;
  notes?: string;
}

export interface SkillData {
  id: string;
  name: string;
  category: 'financial' | 'fitness' | 'technical' | 'career' | 'knowledge';
  currentValue: number;
  targetValue: number;
  unit: string;
  startDate: string;
  targetDate: string;
  checkpoints: SkillCheckpoint[];
  progressPercentage: number;
  lastUpdated: string;
  color: string;
  icon: string;
}

export interface WeeklyKPIContribution {
  kpiId: string;
  weight: number; // 0-100% how much this KPI contributes to skill progression
  formula: 'linear' | 'threshold' | 'exponential';
}

export interface SkillProgressionData {
  skills: SkillData[];
  lastUpdated: string;
  kpiContributions: Record<string, WeeklyKPIContribution[]>; // skillId -> KPI contributions
}

// Predefined skill definitions
export const PREDEFINED_SKILLS: Omit<SkillData, 'checkpoints' | 'lastUpdated'>[] = [
  {
    id: 'netWorth',
    name: 'Net Worth',
    category: 'financial',
    currentValue: 145000,
    targetValue: 3500000,
    unit: 'USD',
    startDate: '2025-01-01',
    targetDate: '2027-07-08',
    progressPercentage: 0,
    color: '#FFD700',
    icon: '💰'
  },
  {
    id: 'jiuJitsu',
    name: 'Jiu Jitsu Belt',
    category: 'fitness',
    currentValue: 1, // 1=blue, 2=purple, 3=brown, 4=black
    targetValue: 3,
    unit: 'belt',
    startDate: '2025-01-01',
    targetDate: '2027-07-08',
    progressPercentage: 0,
    color: '#8B4513',
    icon: '🥋'
  },
  {
    id: 'cortalBuild',
    name: 'Cortal Build Progress',
    category: 'technical',
    currentValue: 25,
    targetValue: 100,
    unit: '%',
    startDate: '2025-01-01',
    targetDate: '2027-07-08',
    progressPercentage: 25,
    color: '#53B4FF',
    icon: '🏗️'
  },
  {
    id: 'cortalMRR',
    name: 'Cortal MRR',
    category: 'financial',
    currentValue: 0,
    targetValue: 3000000,
    unit: 'USD/year',
    startDate: '2025-01-01',
    targetDate: '2027-07-08',
    progressPercentage: 0,
    color: '#5FE3B3',
    icon: '📈'
  },
  {
    id: 'bodyComp',
    name: 'Body Composition',
    category: 'fitness',
    currentValue: 18,
    targetValue: 9,
    unit: '% BF',
    startDate: '2025-01-01',
    targetDate: '2027-07-08',
    progressPercentage: 0,
    color: '#FF6B6B',
    icon: '💪'
  },
  {
    id: 'career',
    name: 'Career Transition',
    category: 'career',
    currentValue: 0, // 0=employee, 100=founder
    targetValue: 100,
    unit: '%',
    startDate: '2025-01-01',
    targetDate: '2027-07-08',
    progressPercentage: 0,
    color: '#FF6B00',
    icon: '🚀'
  },
  {
    id: 'knowledge',
    name: 'Knowledge Base',
    category: 'knowledge',
    currentValue: 20,
    targetValue: 100,
    unit: '%',
    startDate: '2025-01-01',
    targetDate: '2027-07-08',
    progressPercentage: 20,
    color: '#9D4EDD',
    icon: '📚'
  }
];

// Weekly KPI to Skill mapping with contributions
export const WEEKLY_KPI_SKILL_MAPPING: Record<string, WeeklyKPIContribution[]> = {
  netWorth: [
    { kpiId: 'deepWorkBlocks', weight: 40, formula: 'linear' },
    { kpiId: 'gitCommits', weight: 30, formula: 'linear' },
    { kpiId: 'twitterDMs', weight: 15, formula: 'exponential' },
    { kpiId: 'linkedinMessages', weight: 15, formula: 'exponential' }
  ],
  jiuJitsu: [
    { kpiId: 'matHours', weight: 70, formula: 'linear' },
    { kpiId: 'strengthSessions', weight: 30, formula: 'linear' }
  ],
  cortalBuild: [
    { kpiId: 'deepWorkBlocks', weight: 60, formula: 'linear' },
    { kpiId: 'gitCommits', weight: 40, formula: 'linear' }
  ],
  cortalMRR: [
    { kpiId: 'deepWorkBlocks', weight: 30, formula: 'linear' },
    { kpiId: 'gitCommits', weight: 20, formula: 'linear' },
    { kpiId: 'twitterDMs', weight: 25, formula: 'exponential' },
    { kpiId: 'linkedinMessages', weight: 25, formula: 'exponential' }
  ],
  bodyComp: [
    { kpiId: 'strengthSessions', weight: 40, formula: 'threshold' },
    { kpiId: 'matHours', weight: 30, formula: 'threshold' },
    { kpiId: 'coldPlunges', weight: 20, formula: 'threshold' },
    { kpiId: 'sleepAverage', weight: 10, formula: 'threshold' }
  ],
  career: [
    { kpiId: 'deepWorkBlocks', weight: 35, formula: 'linear' },
    { kpiId: 'twitterDMs', weight: 30, formula: 'exponential' },
    { kpiId: 'linkedinMessages', weight: 25, formula: 'exponential' },
    { kpiId: 'gitCommits', weight: 10, formula: 'linear' }
  ],
  knowledge: [
    { kpiId: 'readingPages', weight: 50, formula: 'linear' },
    { kpiId: 'deepWorkBlocks', weight: 30, formula: 'linear' },
    { kpiId: 'gitCommits', weight: 20, formula: 'linear' }
  ]
};

// Weekly progression rates (percentage increase per week for each skill)
export const SKILL_PROGRESSION_RATES: Record<string, number> = {
  netWorth: 0.1,     // 0.1% per week
  jiuJitsu: 0.5,     // 0.5% per week
  cortalBuild: 2.0,  // 2.0% per week
  cortalMRR: 0.2,    // 0.2% per week
  bodyComp: 0.8,     // 0.8% per week (reverse progress - lower is better)
  career: 1.5,       // 1.5% per week
  knowledge: 1.0     // 1.0% per week
};

// Utility functions
export const formatSkillValue = (skill: SkillData, value: number): string => {
  switch (skill.id) {
    case 'netWorth':
    case 'cortalMRR':
      return `$${(value / 1000000).toFixed(1)}M`;
    case 'jiuJitsu': {
      const beltNames = ['', 'Blue', 'Purple', 'Brown', 'Black'];
      return beltNames[Math.floor(value)] || 'Unknown';
    }
    case 'bodyComp':
      return `${value.toFixed(1)}%`;
    default:
      return `${value.toFixed(1)}${skill.unit}`;
  }
};

export const calculateSkillProgress = (skill: SkillData): number => {
  const { currentValue, targetValue, id } = skill;
  
  if (id === 'bodyComp') {
    // Body composition is reverse progress (lower is better)
    const startValue = PREDEFINED_SKILLS.find(s => s.id === id)?.currentValue || 18;
    return Math.max(0, Math.min(100, ((startValue - currentValue) / (startValue - targetValue)) * 100));
  }
  
  return Math.max(0, Math.min(100, ((currentValue - (PREDEFINED_SKILLS.find(s => s.id === id)?.currentValue || 0)) / (targetValue - (PREDEFINED_SKILLS.find(s => s.id === id)?.currentValue || 0))) * 100));
};

export const getSkillCategory = (category: string): { name: string; color: string } => {
  const categories = {
    financial: { name: 'Financial', color: '#FFD700' },
    fitness: { name: 'Fitness', color: '#FF6B6B' },
    technical: { name: 'Technical', color: '#53B4FF' },
    career: { name: 'Career', color: '#FF6B00' },
    knowledge: { name: 'Knowledge', color: '#9D4EDD' }
  };
  return categories[category as keyof typeof categories] || { name: 'Unknown', color: '#8A8D93' };
};

// Date utilities
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const getDaysUntilDate = (dateString: string): number => {
  const targetDate = new Date(dateString);
  const today = new Date();
  const diffTime = targetDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const isDateOverdue = (dateString: string): boolean => {
  return getDaysUntilDate(dateString) < 0;
}; 