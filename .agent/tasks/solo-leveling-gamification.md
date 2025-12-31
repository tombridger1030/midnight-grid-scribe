# Solo Leveling Gamification System

**Created:** 2025-01-11
**Status:** Proposed
**Priority:** High
**Implementation Time:** 8 weeks (4 sprints)

## Product Requirements

### User Stories
- **As a user**, I want my KPI tracking to feel like character progression so that productivity feels rewarding like in a game
- **As a user**, I want to see my character evolve visually as I improve my real-world habits
- **As a user**, I want exciting moments like level-ups and achievement unlocks that make progress feel meaningful
- **As a user**, I want training quests instead of boring metrics so that daily activities feel like adventures

### Acceptance Criteria
- [ ] Current KPI system is enhanced with RPG character progression mechanics
- [ ] Visual character representation changes with rank progression
- [ ] Weekly KPI tracking is reframed as "training quests" with game-like feedback
- [ ] Achievement system provides additional progression milestones
- [ ] Terminal aesthetic is maintained while adding gamification elements
- [ ] Existing functionality remains intact (backward compatibility)

### Success Metrics
- 30% increase in weekly KPI completion rates
- 50% increase in daily active sessions
- 25% improvement in user retention over 30 days
- User feedback scores on "gamification experience" averaging 4.5/5

## Technical Specifications

### Current System Integration
This enhancement leverages existing Noctisium infrastructure:

- **Database**: Supabase with existing user_ranks, weekly_kpis, and user_kpis tables
- **Frontend**: React 18 + TypeScript with shadcn/ui components
- **State Management**: Zustand stores + TanStack Query
- **Authentication**: Supabase Auth with existing user_profiles
- **Real-time**: Supabase subscriptions for live progression updates

### Database Schema Changes

#### New Tables (Migration: 019_gamification_system.sql)

```sql
-- Character stats for RPG-style progression
CREATE TABLE character_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stat_name VARCHAR(50) NOT NULL, -- strength, intelligence, wisdom, constitution, agility
  current_level INTEGER DEFAULT 1,
  current_xp INTEGER DEFAULT 0,
  xp_to_next_level INTEGER DEFAULT 100,
  total_xp INTEGER DEFAULT 0,
  stat_color VARCHAR(7) DEFAULT '#5FE3B3',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, stat_name)
);

-- Training quests system (replaces KPI tracking interface)
CREATE TABLE training_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_type VARCHAR(50) NOT NULL, -- daily, weekly, breakthrough, achievement
  kpi_mapping VARCHAR(50), -- links to original KPI system
  title VARCHAR(255) NOT NULL,
  description TEXT,
  target_value INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0,
  rr_reward INTEGER NOT NULL,
  stat_xp_reward JSONB DEFAULT '{}', -- {"strength": 10, "intelligence": 5}
  is_completed BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,
  rarity VARCHAR(20) DEFAULT 'common', -- common, rare, epic, legendary
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Achievements and milestones
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_key VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  icon_url VARCHAR(500),
  rarity VARCHAR(20) DEFAULT 'common',
  rr_reward INTEGER DEFAULT 0,
  stat_rewards JSONB DEFAULT '{}',
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_hidden BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0
);

-- Character progression events (for animations/notifications)
CREATE TABLE progression_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- level_up, rank_up, achievement_unlock, breakthrough
  event_data JSONB DEFAULT '{}',
  is_viewed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quest completion history
CREATE TABLE quest_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id UUID REFERENCES training_quests(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completion_bonus INTEGER DEFAULT 0, -- for critical hits
  streak_multiplier INTEGER DEFAULT 1
);

-- Character appearance customization
CREATE TABLE character_appearance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  current_rank VARCHAR(20) NOT NULL DEFAULT 'novice',
  aura_intensity INTEGER DEFAULT 0, -- 0-100
    selected_theme VARCHAR(50) DEFAULT 'default',
  unlocked_themes JSONB DEFAULT '["default"]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);
```

#### Enhanced Existing Tables

```sql
-- Add gamification fields to existing user_ranks table
ALTER TABLE user_ranks
ADD COLUMN character_level INTEGER DEFAULT 1,
ADD COLUMN total_stat_xp INTEGER DEFAULT 0,
ADD COLUMN current_streak_days INTEGER DEFAULT 0,
ADD COLUMN longest_streak_days INTEGER DEFAULT 0,
ADD COLUMN critical_hit_count INTEGER DEFAULT 0;

-- Add quest mapping to user_kpis
ALTER TABLE user_kpis
ADD COLUMN quest_mapping VARCHAR(50), -- links KPIs to quest types
ADD COLUMN stat_mapping VARCHAR(50), -- which stat this KPI trains
ADD COLUMN is_quest_active BOOLEAN DEFAULT TRUE;
```

### API Requirements

#### New Service Files

```typescript
// src/lib/characterSystem.ts
export interface CharacterStats {
  strength: number;
  intelligence: number;
  wisdom: number;
  constitution: number;
  agility: number;
}

export interface CharacterLevel {
  level: number;
  currentXP: number;
  xpToNext: number;
  totalXP: number;
}

export class CharacterService {
  async getCharacterStats(userId: string): Promise<CharacterStats>
  async addStatXP(statName: string, xp: number): Promise<void>
  async checkLevelUp(statName: string): Promise<boolean>
  async getCharacterLevel(): Promise<CharacterLevel>
  async updateCharacterAppearance(rankTier: string): Promise<void>
}

// src/lib/questSystem.ts
export interface TrainingQuest {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'breakthrough' | 'achievement';
  targetValue: number;
  currentValue: number;
  rewards: {
    rr: number;
    statXp: Record<string, number>;
  };
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  isCompleted: boolean;
  isHidden: boolean;
}

export class QuestService {
  async generateDailyQuests(): Promise<TrainingQuest[]>
  async updateQuestProgress(questId: string, value: number): Promise<void>
  async completeQuest(questId: string, isCriticalHit?: boolean): Promise<void>
  async getActiveQuests(): Promise<TrainingQuest[]>
  async getQuestHistory(): Promise<TrainingQuest[]>
}

// src/lib/achievementSystem.ts
export interface Achievement {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  isUnlocked: boolean;
  isHidden: boolean;
  progress?: number;
  rewards: {
    rr: number;
    stats: Record<string, number>;
  };
}

export class AchievementService {
  async checkAchievements(): Promise<Achievement[]>
  async unlockAchievement(achievementKey: string): Promise<void>
  async getAchievements(): Promise<Achievement[]>
  async calculateProgress(achievementKey: string): Promise<number>
}
```

#### Enhanced rankingSystem.ts

```typescript
// Add to existing RankingManager class
export class RankingManager {
  // ... existing methods ...

  // Enhanced RR calculation with gamification
  calculateRRChange(
    completionPercentage: number,
    currentRank: RankTier,
    isCriticalHit?: boolean,
    streakMultiplier?: number
  ): number {
    const baseChange = /* existing logic */;
    const criticalMultiplier = isCriticalHit ? 1.5 + Math.random() * 0.5 : 1;
    const streakBonus = (streakMultiplier || 1) * 0.1; // 10% per streak day

    const adjustedChange = baseChange * rankConfig.rr_multiplier * criticalMultiplier;
    const finalChange = adjustedChange * (1 + streakBonus);

    return Math.round(finalChange);
  }

  // Stat progression from KPI activities
  calculateStatXP(kpiCompletion: any): Record<string, number> {
    const statMapping = {
      'discipline': 'constitution',
      'engineering': 'intelligence',
      'learning': 'wisdom',
      'fitness': 'strength',
      'focus': 'agility'
    };

    const xpGains: Record<string, number> = {};
    const baseXP = Math.round(kpiCompletion.completion * 10);

    if (statMapping[kpiCompletion.category as keyof typeof statMapping]) {
      const stat = statMapping[kpiCompletion.category as keyof typeof statMapping];
      xpGains[stat] = baseXP;
    }

    return xpGains;
  }

  // Check for critical hit (15% chance for good performance)
  checkForCriticalHit(completionPercentage: number): boolean {
    return completionPercentage >= 80 && Math.random() < 0.15;
  }

  // Streak calculation
  calculateStreak(userId: string): Promise<number>
  checkStreakBonus(streakDays: number): number
}
```

### UI Components

#### New Component Structure

```
src/components/
├── character/
│   ├── CharacterStatsPanel.tsx        # Main character stats display
│   ├── CharacterAvatar.tsx            # Visual character representation
│   ├── StatProgress.tsx               # Individual stat progress bars
│   └── LevelUpModal.tsx               # Level-up celebration modal
├── quests/
│   ├── TrainingQuestLog.tsx           # Main quest interface
│   ├── QuestCard.tsx                  # Individual quest display
│   ├── QuestProgress.tsx              # Quest progress visualization
│   └── QuestCompleteModal.tsx         # Quest completion celebration
├── achievements/
│   ├── AchievementPanel.tsx           # Achievement gallery
│   ├── AchievementCard.tsx            # Individual achievement display
│   └── AchievementUnlock.tsx          # Achievement unlock notification
├── progression/
│   ├── ProgressCelebration.tsx        # Generic celebration component
│   ├── StreakDisplay.tsx              # Current streak indicator
│   └── CriticalHitEffect.tsx          # Critical hit visual feedback
└── gamification/
    ├── GameModeToggle.tsx             # Toggle between classic/game mode
    ├── TrainingGrounds.tsx            # Enhanced KPI input interface
    └── CharacterCustomization.tsx     # Appearance customization
```

#### Enhanced Existing Components

**Modified WeeklyKPIInput → TrainingGrounds.tsx**
```typescript
// Key changes to existing component:
1. Rename to TrainingGrounds
2. Add quest framing to KPI inputs
3. Include character stat progression preview
4. Add critical hit chance indicators
5. Implement streak tracking display
6. Maintain all existing functionality as fallback
```

**Enhanced RankingWidget.tsx**
```typescript
// Add to existing component:
1. Character avatar integration
2. Visual aura effects based on rank
3. Level-up previews
4. Achievement showcases
5. Progress celebration triggers
```

### Frontend Implementation Plan

#### Sprint 1: Foundation (Week 1-2)

**Backend Services**
```typescript
// src/lib/characterSystem.ts
export const characterService = new CharacterService();

// src/lib/questSystem.ts
export const questService = new QuestService();

// src/lib/achievementSystem.ts
export const achievementService = new AchievementService();
```

**Database Migration**
```sql
-- File: database/migrations/019_gamification_system.sql
-- Includes all new tables and existing table enhancements
-- RLS policies for new tables
-- Trigger functions for xp calculations
```

**Core Components**
```typescript
// src/components/character/CharacterStatsPanel.tsx
interface CharacterStatsPanelProps {
  className?: string;
  showDetails?: boolean;
}

// src/components/quests/TrainingQuestLog.tsx
interface TrainingQuestLogProps {
  questType?: 'daily' | 'weekly' | 'all';
  onQuestComplete?: (quest: TrainingQuest) => void;
}
```

#### Sprint 2: Quest System (Week 3-4)

**KPI Integration**
```typescript
// Enhanced src/lib/weeklyKpi.ts
export function calculateQuestProgress(kpiValues: WeeklyKPIValues, activeKPIs: ConfigurableKPI[]): {
  questProgress: Record<string, number>;
  statXPGains: Record<string, number>;
  criticalHit: boolean;
  completionPercentage: number;
}
```

**Quest Interface Components**
```typescript
// src/components/quests/QuestCard.tsx
interface QuestCardProps {
  quest: TrainingQuest;
  onUpdate: (questId: string, value: number) => void;
  onComplete: (questId: string) => void;
}

// src/components/quests/QuestCompleteModal.tsx
interface QuestCompleteModalProps {
  quest: TrainingQuest;
  rewards: QuestRewards;
  isCriticalHit: boolean;
  onClose: () => void;
}
```

#### Sprint 3: Visual Progression (Week 5-6)

**Character Visualization**
```typescript
// src/components/character/CharacterAvatar.tsx
interface CharacterAvatarProps {
  rank: RankTier;
  level: number;
  auraIntensity: number;
  theme: string;
  animated?: boolean;
}

// SVG-based character that changes appearance based on:
// - Rank tier (bronze, gold, platinum, diamond, grandmaster)
// - Character level (visual upgrades)
// - Aura intensity (glowing effects)
// - Selected theme
```

**Progress Celebrations**
```typescript
// src/components/progression/LevelUpModal.tsx
interface LevelUpModalProps {
  statName: string;
  oldLevel: number;
  newLevel: number;
  rewards: StatRewards;
  onClose: () => void;
}

// src/components/progression/CriticalHitEffect.tsx
interface CriticalHitEffectProps {
  trigger: boolean;
  onComplete: () => void;
}
```

#### Sprint 4: Polish & Integration (Week 7-8)

**Achievement System**
```typescript
// src/components/achievements/AchievementPanel.tsx
interface AchievementPanelProps {
  showHidden?: boolean;
  filterRarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

// Achievement definitions in src/lib/achievements/
export const ACHIEVEMENT_DEFINITIONS = {
  FIRST_QUEST: {
    key: 'first_quest',
    title: 'First Steps',
    description: 'Complete your first training quest',
    rarity: 'common' as const,
    rewards: { rr: 10, stats: { constitution: 5 } }
  },
  WEEK_WARRIOR: {
    key: 'week_warrior',
    title: 'Week Warrior',
    description: 'Complete all daily quests for 7 days straight',
    rarity: 'rare' as const,
    rewards: { rr: 50, stats: { constitution: 20, wisdom: 10 } }
  },
  // ... more achievements
};
```

**Game Mode Toggle**
```typescript
// src/components/gamification/GameModeToggle.tsx
// Allows users to switch between classic KPI view and gamified quest view
// Preserves all existing functionality for users who prefer simplicity
```

### State Management

#### New Zustand Stores

```typescript
// src/stores/characterStore.ts
interface CharacterState {
  stats: CharacterStats;
  level: CharacterLevel;
  appearance: CharacterAppearance;
  isLevelingUp: boolean;

  // Actions
  updateStat: (statName: string, value: number) => void;
  addXP: (statName: string, xp: number) => void;
  checkLevelUps: () => void;
  updateAppearance: (updates: Partial<CharacterAppearance>) => void;
}

// src/stores/questStore.ts
interface QuestState {
  activeQuests: TrainingQuest[];
  completedQuests: TrainingQuest[];
  currentStreak: number;
  criticalHitsAvailable: number;

  // Actions
  loadQuests: () => Promise<void>;
  updateQuestProgress: (questId: string, value: number) => void;
  completeQuest: (questId: string) => void;
  generateDailyQuests: () => void;
}

// src/stores/achievementStore.ts
interface AchievementState {
  achievements: Achievement[];
  unlockedCount: number;
  totalCount: number;
  newUnlocks: Achievement[];

  // Actions
  loadAchievements: () => Promise<void>;
  unlockAchievement: (key: string) => void;
  markAsViewed: (achievementIds: string[]) => void;
}
```

### Real-time Integration

#### Supabase Subscriptions

```typescript
// src/hooks/useRealTimeProgression.ts
export function useRealTimeProgression(userId: string) {
  useEffect(() => {
    const channel = supabase
      .channel('progression-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'character_stats',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        // Handle stat updates
        characterStore.getState().updateStat(payload.new.stat_name, payload.new.current_level);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'progression_events',
        filter: `user_id=eq.${userId} AND is_viewed=eq.false`
      }, (payload) => {
        // Trigger celebration animations
        triggerProgressionEvent(payload.new);
      })
      .subscribe();

    return () => channel.unsubscribe();
  }, [userId]);
}

// src/hooks/useProgressionEvents.ts
export function useProgressionEvents() {
  const [events, setEvents] = useState<ProgressionEvent[]>([]);

  const triggerProgressionEvent = useCallback((event: ProgressionEvent) => {
    setEvents(prev => [...prev, event]);

    // Trigger appropriate celebration based on event type
    switch (event.event_type) {
      case 'level_up':
        showLevelUpModal(event.event_data);
        break;
      case 'rank_up':
        showRankUpModal(event.event_data);
        break;
      case 'achievement_unlock':
        showAchievementUnlock(event.event_data);
        break;
      case 'critical_hit':
        showCriticalHitEffect(event.event_data);
        break;
    }
  }, []);

  return { events, triggerProgressionEvent };
}
```

## Implementation Plan

### Phase 1: Database & Services (Week 1-2)

**Database Migration**
1. Create migration file `019_gamification_system.sql`
2. Add all new tables with proper constraints and indexes
3. Implement RLS policies for new tables
4. Add triggers for automatic XP calculations
5. Update existing tables with gamification fields

**Core Services**
1. Implement `CharacterService` with stat management
2. Build `QuestService` with quest generation logic
3. Create `AchievementService` with unlock conditions
4. Add migration utilities to convert existing KPI data to quest format

**Testing Strategy**
- Unit tests for all service classes
- Database integration tests for new tables
- Migration testing with sample data

### Phase 2: Quest System Integration (Week 3-4)

**Frontend Components**
1. Build `TrainingQuestLog` as enhanced KPI interface
2. Create `QuestCard` components for individual quests
3. Implement quest completion celebrations
4. Add progress visualization components

**KPI System Integration**
1. Map existing KPIs to quest types and stat gains
2. Enhance KPI calculation to include stat XP rewards
3. Add critical hit mechanics to weekly assessments
4. Implement streak tracking and bonuses

**Real-time Features**
1. Add Supabase subscriptions for quest updates
2. Implement live progress synchronization
3. Build notification system for quest completions

### Phase 3: Visual Progression (Week 5-6)

**Character Visualization**
1. Design character avatar system with rank-based evolution
2. Implement skill tree visualization for stat progression
3. Add aura and effect systems for visual feedback
4. Create character customization options

**Celebration System**
1. Build `LevelUpModal` with animations
2. Implement `CriticalHitEffect` visual feedback
3. Create achievement unlock celebrations
4. Add rank-up ceremony sequences

**Performance Optimization**
1. Implement lazy loading for character assets
2. Optimize animation performance
3. Add caching for computed progression data

### Phase 4: Polish & Integration (Week 7-8)

**Achievement System**
1. Implement comprehensive achievement definitions
2. Build achievement gallery and progress tracking
3. Add hidden achievements with unlock conditions
4. Create achievement reward distribution

**User Experience**
1. Add game mode toggle for classic vs. gamified view
2. Implement comprehensive tutorial system
3. Add accessibility features for celebrations
4. Optimize mobile responsiveness

**Integration Testing**
1. End-to-end testing of complete progression flow
2. Performance testing with large datasets
3. User acceptance testing with beta group
4. Bug fixes and optimization

## Testing Strategy

### Unit Tests
```typescript
// src/lib/__tests__/characterSystem.test.ts
describe('CharacterService', () => {
  test('should add XP correctly', async () => {
    const service = new CharacterService();
    await service.addStatXP('strength', 50);
    // Verify XP was added and level up checked
  });

  test('should detect level up correctly', async () => {
    // Test level up logic and rewards
  });
});

// src/lib/__tests__/questSystem.test.ts
describe('QuestService', () => {
  test('should generate appropriate daily quests', async () => {
    const quests = await questService.generateDailyQuests();
    expect(quests.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests
```typescript
// src/components/__tests__/TrainingQuestLog.test.tsx
describe('TrainingQuestLog', () => {
  test('should display active quests correctly', async () => {
    render(<TrainingQuestLog />);
    // Test quest display and interactions
  });
});
```

### E2E Tests
```typescript
// cypress/e2e/gamification-flow.cy.ts
describe('Complete Gamification Flow', () => {
  it('should track character progression from start to level up', () => {
    // Test complete user journey
  });
});
```

## Performance Considerations

### Database Optimization
- Add indexes on frequently queried columns
- Implement materialized views for complex calculations
- Use JSONB efficiently for stat and reward storage
- Cache expensive operations like quest generation

### Frontend Optimization
- Lazy load character assets and animations
- Implement virtual scrolling for quest lists
- Use React.memo for expensive components
- Optimize re-renders with proper state management

### Real-time Performance
- Batch database updates to reduce subscription noise
- Implement debounce for rapid state changes
- Use efficient patterns for celebration animations

## Migration & Deployment

### Data Migration Strategy
```typescript
// src/lib/migration/gamificationMigration.ts
export class GamificationMigration {
  async migrateExistingUsers(): Promise<void> {
    // 1. Create initial character stats for existing users
    // 2. Convert existing KPI data to quest history
    // 3. Calculate initial stat XP from historical data
    // 4. Generate appropriate achievements from past performance
  }

  async rollbackMigration(): Promise<void> {
    // Safe rollback procedures if needed
  }
}
```

### Deployment Checklist
- [ ] Database migration tested and backed up
- [ ] All new components tested in staging
- [ ] Performance benchmarks met
- [ ] Accessibility compliance verified
- [ ] Documentation updated
- [ ] User communication prepared

## Rollback Plan

### Database Rollback
- Keep migration scripts reversible
- Maintain backup of pre-migration data
- Feature flags to disable gamification instantly

### Frontend Rollback
- Game mode toggle allows immediate reversion to classic view
- All existing functionality preserved in classic mode
- Client-side feature flags for rapid disabling

---

## Related Documentation
- [Project Architecture](../System/project_architecture.md)
- [Database Schema](../System/database_schema.md)
- [Development SOP](../SOP/development_sop.md)
- [Current KPI System](./metrics-input.md)
- [Ranking System](./weekly-ranking-system.md)