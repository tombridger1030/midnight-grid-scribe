# Migration 013: Ranking System

## Overview
This migration creates the complete database infrastructure for the user ranking system. Users can now earn and lose RR (Ranking Rating) points based on their weekly KPI performance, progressing through 5 rank tiers with exponential difficulty scaling.

## Changes Made

### 1. Database Tables Created

#### `user_ranks`
Stores current ranking information for each user:
- `user_id`: Foreign key to auth.users
- `current_rank`: bronze/gold/platinum/diamond/grandmaster
- `rr_points`: Current RR points (starts at 100)
- `total_weeks`: Total weeks user has been tracked
- `weeks_completed`: Weeks where user met minimum completion threshold
- `last_assessment`: Timestamp of last weekly assessment

#### `rank_history`
Historical record of all rank changes:
- `user_id`: Foreign key to auth.users
- `week_key`: Week identifier (e.g., "2025-W01")
- `old_rank` / `new_rank`: Rank before and after assessment
- `old_rr` / `new_rr`: RR points before and after assessment
- `completion_percentage`: Weekly KPI completion percentage
- `timestamp`: When the rank change occurred

#### `weekly_assessments`
Detailed weekly performance assessments:
- `user_id`: Foreign key to auth.users
- `week_key`: Week identifier
- `completion_percentage`: Overall KPI completion percentage
- `rr_change`: RR points gained or lost
- `rank_before` / `rank_after`: Rank changes during assessment
- `kpi_breakdown`: JSON array of individual KPI performance details
- `assessed_at`: When assessment was performed

#### `rank_configs` (Reference Table)
Configuration data for rank tiers:
- `rank_name`: Tier name (bronze, gold, etc.)
- `min_rr` / `max_rr`: RR point thresholds
- `color`: Display color for UI
- `icon`: Emoji icon for rank
- `multiplier`: RR gain/loss multiplier (1.0x to 5.0x)
- `description`: Rank description

### 2. Views Created

#### `rank_leaderboard`
Provides ranking data sorted by RR points for leaderboard features:
- User ranking information
- Success rate calculations
- Ordered by RR points descending

#### `user_rank_stats`
Comprehensive user ranking statistics:
- Current rank and points
- Recent performance averages (4-week window)
- Success rates and progression metrics

### 3. Security Features
- **Row Level Security (RLS)** enabled on all tables
- **User isolation**: Users can only access their own ranking data
- **Proper indexes** for performance optimization
- **Data validation** with CHECK constraints
- **Automatic timestamps** with trigger functions

## Ranking System Logic

### Rank Tiers
| Rank | RR Range | Multiplier | Icon | Color |
|------|----------|------------|------|--------|
| Bronze | 0-199 | 1.0x | 🥉 | #CD7F32 |
| Gold | 200-499 | 1.5x | 🥇 | #FFD700 |
| Platinum | 500-999 | 2.0x | 💎 | #E5E4E2 |
| Diamond | 1000-1999 | 3.0x | 💎 | #185ADB |
| Grandmaster | 2000+ | 5.0x | 👑 | #B026FF |

### RR Calculation
- **Base RR gain**: +50 for 100% completion, scaled down for partial completion
- **Base RR loss**: -30 for <50% completion
- **Multiplier effect**: RR changes are multiplied by rank multiplier (exponential difficulty)
- **Minimum RR**: Users cannot go below 0 RR points

## How to Apply

### Method 1: Supabase Dashboard (Recommended)
1. Log into your Supabase dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `013_ranking_system.sql`
4. Execute the query

### Method 2: Command Line (if using Supabase CLI)
```bash
supabase db reset
# or
supabase migration up
```

### Method 3: Manual Application
Run the migration file section by section:
1. Create tables
2. Create indexes
3. Enable RLS and create policies
4. Create views
5. Insert reference data

## Verification

After applying the migration, verify it worked:

```sql
-- Check that tables were created
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_ranks', 'rank_history', 'weekly_assessments', 'rank_configs')
ORDER BY table_name;

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('user_ranks', 'rank_history', 'weekly_assessments');

-- Check rank configurations
SELECT * FROM public.rank_configs ORDER BY min_rr;

-- Test views
SELECT COUNT(*) FROM public.rank_leaderboard;
SELECT COUNT(*) FROM public.user_rank_stats;
```

Expected results:
- 4 new tables created
- RLS enabled on all ranking tables
- 5 rank configurations inserted
- 2 utility views created

## Frontend Integration

The ranking system integrates with several new components:

### Components Created
- **RankingWidget**: Main dashboard display
- **RankBadge**: Visual rank indicators
- **RRProgressBar**: Progress within current rank
- **WeeklyRankAssessment**: Assessment interface
- **RankHistory**: Historical progression charts

### Usage Example
```typescript
import { rankingManager } from '@/lib/rankingSystem';

// Initialize new user
await rankingManager.initializeUserRank();

// Assess weekly performance
const assessment = await rankingManager.assessWeeklyPerformance('2025-W01');

// Get current rank
const userRank = await rankingManager.getUserRank();
```

## Impact

### Immediate Benefits
- **Gamification**: Users are motivated by ranking progression
- **Performance Tracking**: Detailed weekly performance history
- **Visual Progress**: Clear rank badges and progress indicators
- **Accountability**: Regular weekly assessments drive consistency

### Future Opportunities
- **Leaderboards**: Compare performance across users
- **Achievements**: Special rewards for rank milestones
- **Seasonal Resets**: Periodic rank resets for fresh competition
- **Team Rankings**: Group/organization ranking systems

## Rollback

If you need to rollback this migration:

```sql
-- Remove views
DROP VIEW IF EXISTS public.user_rank_stats;
DROP VIEW IF EXISTS public.rank_leaderboard;

-- Remove triggers
DROP TRIGGER IF EXISTS trg_user_ranks_set_updated_at ON public.user_ranks;
DROP FUNCTION IF EXISTS set_updated_at_user_ranks();

-- Remove tables
DROP TABLE IF EXISTS public.rank_configs;
DROP TABLE IF EXISTS public.weekly_assessments;
DROP TABLE IF EXISTS public.rank_history;
DROP TABLE IF EXISTS public.user_ranks;
```

**⚠️ Warning**: This rollback will permanently delete all ranking data.

## Related Files

- **Migration**: `013_ranking_system.sql`
- **Core Logic**: `src/lib/rankingSystem.ts`
- **Data Layer**: `src/lib/userStorage.ts` (updated with ranking methods)
- **Components**: `src/components/Ranking*.tsx`
- **Dashboard Integration**: `src/pages/Dashboard.tsx`

## Next Steps

1. **Apply the migration** to your Supabase instance
2. **Test the ranking widget** on the dashboard
3. **Perform a weekly assessment** to see RR changes
4. **Monitor performance** through the rank history
5. **Consider adding leaderboards** for competitive features

## Performance Notes

- All tables have appropriate indexes for common query patterns
- RLS policies are optimized for user-specific data access
- Views are efficient for read-heavy operations like leaderboards
- JSON fields are used for flexible KPI breakdown storage

## Data Privacy

- Each user only has access to their own ranking data
- RLS policies ensure complete data isolation
- Historical data is preserved for personal progress tracking
- No cross-user data leakage is possible

---

**Migration Status**: ✅ Ready to apply
**Estimated Runtime**: < 30 seconds
**Rollback Safety**: ⚠️ Will delete all ranking data
**Dependencies**: Requires existing `auth.users` table