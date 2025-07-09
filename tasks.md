# Skill Progression Module - Tasks

## Overview
Create a new **Skill Progression** module for the Noctisium to track long-term personal and professional development goals with visual progress bars, checkpoints, and AI-powered progress updates.

---

## 1. Core Entities & Data Structure

### Task 1.1: Define Skill Types
- [ ] Create TypeScript types in `src/types/skills.ts`:
```ts
export type SkillId = 'netWorth' | 'jiuJitsu' | 'cortalBuild' | 'cortalMRR' | 'bodyComp' | 'career' | 'knowledge';
export type SkillUnit = '$' | '%' | 'belt' | 'bool' | '$/yr';

export type Checkpoint = {
  label: string;
  target: number;
  due: string; // ISO date
  completed?: boolean;
};

export type Skill = {
  id: SkillId;
  label: string;
  unit: SkillUnit;
  current: number;
  target: number;
  checkpoints: Checkpoint[];
  category: 'financial' | 'physical' | 'professional' | 'personal';
};

export function getSkillPercent(skill: Skill): number {
  return Math.min(1, Math.max(0, skill.current / skill.target));
}
```

### Task 1.2: Create Initial Skill Definitions
- [ ] Create `src/data/skillDefinitions.ts` with initial skills:
  - **netWorth**: $145,000 → $3,500,000 (checkpoints: $1M, $2M, $3M)
  - **jiuJitsu**: 1 (blue) → 3 (brown) (checkpoints: purple=2, brown=3)
  - **cortalBuild**: 0.25 → 1.0 (checkpoints: MVP=1.0 by 2025-09-29)
  - **cortalMRR**: $0 → $3,000,000 ARR (checkpoints: $24K, $100K, $1M, $3M ARR)
  - **bodyComp**: 18% → 9% (checkpoints: 15%, 12%, 9%)
  - **career**: 0 → 1 (checkpoints: exit job by 2026-06-30)
  - **knowledge**: 0.20 → 1.0 (checkpoints: 0.4, 0.6, 0.8)

---

## 2. State Management & Storage

### Task 2.1: Create Zustand Store
- [ ] Create `src/stores/useSkillStore.ts`:
```ts
interface SkillStore {
  skills: Record<SkillId, Skill>;
  isLoading: boolean;
  
  // Actions
  loadSkills: () => Promise<void>;
  updateSkill: (id: SkillId, updates: Partial<Skill>) => Promise<void>;
  updateSkillProgress: (id: SkillId, newCurrent: number) => Promise<void>;
  markCheckpointComplete: (skillId: SkillId, checkpointIndex: number) => Promise<void>;
}
```

### Task 2.2: Supabase Integration
- [ ] Create Supabase table `skills`:
```sql
CREATE TABLE skills (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  skill_data jsonb NOT NULL,
  updated_at timestamp DEFAULT now()
);
```
- [ ] Create `src/lib/skillStorage.ts` with CRUD operations
- [ ] Add localStorage fallback for offline usage

---

## 3. UI Components

### Task 3.1: Main Skill Progression Component
- [ ] Create `src/components/SkillProgressionSection.tsx`:
  - Grid layout showing all skills
  - Progress bars using existing terminal styling
  - Group by timeframe: "Short-term (< 3 years)" vs "Long-term (2030+)"

### Task 3.2: Individual Skill Card
- [ ] Create `src/components/SkillCard.tsx`:
  - Skill label and current/target values
  - Progress bar with percentage
  - Next checkpoint indicator with due date
  - Unit-specific formatting ($, %, belt names)

### Task 3.3: Skill Detail Modal
- [ ] Create `src/components/SkillDetailModal.tsx`:
  - Detailed view of single skill
  - All checkpoints with completion status
  - Manual progress update input
  - Progress history chart (optional)

### Task 3.4: Progress Update Interface
- [ ] Create `src/components/SkillUpdateBox.tsx`:
  - Text input for natural language updates
  - "Process Update" button
  - Loading state during AI processing
  - Success/error toast notifications

---

## 4. AI-Powered Updates

### Task 4.1: API Route for AI Processing
- [ ] Create `src/pages/api/skills/evaluate-update.ts`:
```ts
type UpdateRequest = {
  update: string; // Natural language
  skills: Record<SkillId, Skill>;
};

type UpdateResponse = {
  updates: Array<{
    skillId: SkillId;
    delta: number;
    reasoning: string;
  }>;
};
```

### Task 4.2: OpenAI Integration
- [ ] Create system prompt for skill evaluation:
  - Parse natural language updates
  - Map to specific skills and progress deltas
  - Return structured JSON response
- [ ] Handle edge cases (ambiguous updates, invalid skills)

### Task 4.3: Update Processing Logic
- [ ] Create `src/lib/skillUpdates.ts`:
  - Apply AI-suggested updates to store
  - Validate update ranges (0-100%)
  - Auto-mark checkpoints as complete
  - Generate summary messages

---

## 5. Weekly KPI to Skill Progression Mapping

### Task 5.1: Define KPI Contribution Weights
- [ ] Create `src/lib/skillContributions.ts` with realistic weekly KPI impact:

```ts
export type KPIContribution = {
  kpiId: string;
  skillId: SkillId;
  weight: number; // 0-1 multiplier
  formula: 'linear' | 'threshold' | 'exponential';
  description: string;
};

export const KPI_SKILL_CONTRIBUTIONS: KPIContribution[] = [
  // NET WORTH PROGRESSION ($145K → $3.5M)
  {
    kpiId: 'deepWorkBlocks',
    skillId: 'netWorth',
    weight: 0.4,
    formula: 'linear',
    description: 'Deep work directly drives business results and income'
  },
  {
    kpiId: 'gitCommits',
    skillId: 'netWorth',
    weight: 0.3,
    formula: 'linear',
    description: 'Shipping code creates business value'
  },
  {
    kpiId: 'twitterDMs',
    skillId: 'netWorth',
    weight: 0.15,
    formula: 'linear',
    description: 'Network building leads to opportunities'
  },
  {
    kpiId: 'linkedinMessages',
    skillId: 'netWorth',
    weight: 0.15,
    formula: 'linear',
    description: 'Professional networking for business development'
  },

  // JIU-JITSU PROGRESSION (Blue → Brown Belt)
  {
    kpiId: 'matHours',
    skillId: 'jiuJitsu',
    weight: 0.7,
    formula: 'linear',
    description: 'Direct training time is primary skill driver'
  },
  {
    kpiId: 'strengthSessions',
    skillId: 'jiuJitsu',
    weight: 0.3,
    formula: 'threshold',
    description: 'Supporting strength improves BJJ performance'
  },

  // CORTAL BUILD PROGRESSION (MVP Launch)
  {
    kpiId: 'deepWorkBlocks',
    skillId: 'cortalBuild',
    weight: 0.5,
    formula: 'linear',
    description: 'Focused development time builds the product'
  },
  {
    kpiId: 'gitCommits',
    skillId: 'cortalBuild',
    weight: 0.5,
    formula: 'linear',
    description: 'Code commits represent tangible progress'
  },

  // CORTAL MRR PROGRESSION ($0 → $3M ARR)
  {
    kpiId: 'deepWorkBlocks',
    skillId: 'cortalMRR',
    weight: 0.3,
    formula: 'linear',
    description: 'Product development drives revenue potential'
  },
  {
    kpiId: 'twitterDMs',
    skillId: 'cortalMRR',
    weight: 0.35,
    formula: 'exponential',
    description: 'Network effects and user acquisition'
  },
  {
    kpiId: 'linkedinMessages',
    skillId: 'cortalMRR',
    weight: 0.35,
    formula: 'exponential',
    description: 'B2B sales and partnership development'
  },

  // BODY COMPOSITION (18% → 9% BF)
  {
    kpiId: 'strengthSessions',
    skillId: 'bodyComp',
    weight: 0.5,
    formula: 'linear',
    description: 'Resistance training builds muscle, reduces fat'
  },
  {
    kpiId: 'matHours',
    skillId: 'bodyComp',
    weight: 0.2,
    formula: 'linear',
    description: 'Cardio and conditioning from BJJ'
  },
  {
    kpiId: 'coldPlunges',
    skillId: 'bodyComp',
    weight: 0.2,
    formula: 'threshold',
    description: 'Cold exposure boosts metabolism'
  },
  {
    kpiId: 'sleepAverage',
    skillId: 'bodyComp',
    weight: 0.1,
    formula: 'threshold',
    description: 'Recovery enables body composition changes'
  },

  // CAREER STATUS (Employee → Founder)
  {
    kpiId: 'deepWorkBlocks',
    skillId: 'career',
    weight: 0.4,
    formula: 'linear',
    description: 'Building skills and business for independence'
  },
  {
    kpiId: 'gitCommits',
    skillId: 'career',
    weight: 0.3,
    formula: 'linear',
    description: 'Technical execution demonstrates capability'
  },
  {
    kpiId: 'twitterDMs',
    skillId: 'career',
    weight: 0.15,
    formula: 'linear',
    description: 'Building personal brand and network'
  },
  {
    kpiId: 'linkedinMessages',
    skillId: 'career',
    weight: 0.15,
    formula: 'linear',
    description: 'Professional relationship building'
  },

  // KNOWLEDGE INDEX (Self-rated learning)
  {
    kpiId: 'readingPages',
    skillId: 'knowledge',
    weight: 0.6,
    formula: 'linear',
    description: 'Reading directly expands knowledge base'
  },
  {
    kpiId: 'deepWorkBlocks',
    skillId: 'knowledge',
    weight: 0.4,
    formula: 'linear',
    description: 'Learning time within deep work blocks'
  }
];
```

### Task 5.2: Weekly KPI Impact Calculation
- [ ] Create automatic skill progression from weekly KPIs:
```ts
export function calculateWeeklySkillImpact(
  weeklyKPIs: WeeklyKPIValues,
  currentSkills: Record<SkillId, Skill>
): Record<SkillId, number> {
  const impacts: Record<SkillId, number> = {};
  
  KPI_SKILL_CONTRIBUTIONS.forEach(contribution => {
    const kpiValue = weeklyKPIs[contribution.kpiId] || 0;
    const kpiDefinition = WEEKLY_KPI_DEFINITIONS.find(k => k.id === contribution.kpiId);
    
    if (!kpiDefinition) return;
    
    // Calculate normalized performance (0-1 scale)
    const performance = Math.min(1, kpiValue / kpiDefinition.target);
    
    // Apply formula-specific scaling
    let scaledImpact = performance * contribution.weight;
    
    switch (contribution.formula) {
      case 'exponential':
        scaledImpact = Math.pow(performance, 1.5) * contribution.weight;
        break;
      case 'threshold':
        scaledImpact = performance >= 0.8 ? contribution.weight : contribution.weight * 0.3;
        break;
      case 'linear':
      default:
        scaledImpact = performance * contribution.weight;
    }
    
    if (!impacts[contribution.skillId]) impacts[contribution.skillId] = 0;
    impacts[contribution.skillId] += scaledImpact;
  });
  
  return impacts;
}
```

### Task 5.3: Realistic Progression Rates
- [ ] Define realistic weekly progression rates per skill:
  - **Net Worth**: 0.1% per excellent week (slow, compound growth)
  - **Jiu-Jitsu**: 0.5% per excellent week (technique accumulation)
  - **Cortal Build**: 2% per excellent week (sprint-based development)
  - **Cortal MRR**: 0.2% per excellent week (sales cycles)
  - **Body Comp**: 0.3% per excellent week (body changes take time)
  - **Career**: 1% per excellent week (binary transition preparation)
  - **Knowledge**: 0.8% per excellent week (learning accumulation)

### Task 5.4: Integration with Dashboard
- [ ] Add weekly KPI impact indicators to skill cards
- [ ] Show "This week's contribution" on skill progression page
- [ ] Highlight which KPIs most impact each skill

---

## 6. Integration with Existing Systems

### Task 6.1: Dashboard Integration
- [ ] Add SkillProgressionSection to Dashboard page
- [ ] Create skill summary cards for dashboard overview
- [ ] Add "Skill Update" quick action to header

### Task 6.2: Historical Data Migration
- [ ] Create migration script to backfill skill progression from historical weekly KPIs
- [ ] Calculate cumulative skill progression based on past performance
- [ ] Set realistic baselines for each skill based on historical data

---

## 7. Utilities & Helpers

### Task 7.1: Formatting Utilities
- [ ] Create `src/lib/skillFormatters.ts`:
```ts
export function formatSkillValue(value: number, unit: SkillUnit): string;
export function formatBeltLevel(level: number): string; // "Blue Belt"
export function formatCareerStatus(status: number): string; // "Employee" / "Founder"
export function getNextCheckpoint(skill: Skill): Checkpoint | null;
export function getSkillProgress(skill: Skill): { percent: number; nextDue: string };
```

### Task 7.2: Date & Deadline Utilities
- [ ] Calculate days until checkpoint deadlines
- [ ] Highlight overdue checkpoints
- [ ] Progress velocity calculations

---

## 8. Styling & Terminal Theme

### Task 8.1: Terminal-Style Progress Bars
- [ ] Custom progress bar component matching terminal aesthetic
- [ ] Color coding: green (on-track), yellow (behind), red (overdue)
- [ ] ASCII-style progress indicators

### Task 8.2: Skill Categories
- [ ] Color-code skills by category:
  - Financial: `#FFD700` (gold)
  - Physical: `#53B4FF` (blue)
  - Professional: `#FF6B00` (orange)
  - Personal: `#5FE3B3` (green)

---

## 9. Testing & Polish

### Task 9.1: Component Testing
- [ ] Unit tests for skill calculation utilities
- [ ] Component tests for SkillCard and SkillProgressionSection
- [ ] Integration tests for store operations

### Task 9.2: AI Update Testing
- [ ] Test various natural language inputs
- [ ] Validate AI parsing accuracy
- [ ] Handle edge cases and errors gracefully

---

## 10. Future Enhancements

### Task 10.1: Advanced Features (Phase 2)
- [ ] Skill dependencies (e.g., cortalMRR depends on cortalBuild)
- [ ] Historical progress tracking and charts
- [ ] Achievement system with badges
- [ ] Weekly/monthly skill reports

### Task 10.2: Mobile Optimization
- [ ] Responsive skill cards for mobile
- [ ] Touch-friendly progress updates
- [ ] Mobile-optimized skill detail view

---

## Implementation Priority

1. **High Priority** (Core MVP):
   - Tasks 1.1-1.2: Type definitions and initial data
   - Tasks 2.1-2.2: Store and storage
   - Tasks 3.1-3.2: Basic UI components
   - Task 5.2: Dashboard integration

2. **Medium Priority** (Enhanced UX):
   - Tasks 3.3-3.4: Detail modal and update interface
   - Tasks 4.1-4.3: AI-powered updates
   - Task 5.1-5.4: Weekly KPI integration
   - Task 7.1: Formatting utilities

3. **Low Priority** (Polish):
   - Tasks 8.1-8.2: Advanced styling
   - Tasks 9.1-9.2: Testing
   - Tasks 10.1-10.2: Future enhancements

---

## Success Metrics

- [ ] All 7 core skills properly tracked and displayed
- [ ] Progress updates via natural language working with 80%+ accuracy
- [ ] Seamless integration with existing weekly KPI system
- [ ] Mobile-responsive design
- [ ] Sub-second load times for skill progression view 