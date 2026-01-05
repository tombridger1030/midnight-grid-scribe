# Weekly KPIs Revamp

## Overview

Complete revamp of the weekly KPI tracking system following Elon's 5-step process:
1. **Question requirements** - Identified core 5 KPIs
2. **Delete steps** - Removed 1,800+ lines of unused code
3. **Simplify & optimize** - New streamlined architecture
4. **Reduce cycle time** - Faster input with better UX
5. **Automate** - Auto-sync from GitHub and Deep Work timer

## Core KPIs

| KPI | Type | Auto-sync | Description |
|-----|------|-----------|-------------|
| PRs Created | Counter | GitHub API | Pull requests created this week |
| Deep Work Hours | Hours | Timer | Deep work session aggregation |
| Content Posted | Counter | Manual (future: YT/IG/X) | Content pieces shipped |
| Training | Multi-type | Manual | Training sessions by type |
| Reading | Multi-book | Manual | Book progress tracking |

## New Architecture

### Database Tables

```
training_types     - User-defined training categories
training_sessions  - Individual training entries
books              - Reading list with progress
book_progress      - Daily reading log
```

### Components

```
src/components/weekly/
├── WeeklyKPIs.tsx         - Main container (~220 lines)
├── KPIRow.tsx             - Simple counter/hours KPI (~150 lines)
├── TrainingKPI.tsx        - Multi-type training (~130 lines)
├── ReadingKPI.tsx         - Multi-book tracking (~200 lines)
├── WeeklyHistory.tsx      - 5-week history chart (~100 lines)
├── AddSessionDropdown.tsx - Training type selector (~150 lines)
├── AddBookModal.tsx       - New book modal (~160 lines)
└── index.ts               - Exports
```

### Hooks

```
src/hooks/
├── useWeeklyKPIs.ts  - Main data hook (~200 lines)
├── useTraining.ts    - Training sessions (~200 lines)
├── useBooks.ts       - Book management (~250 lines)
└── useAutoSync.ts    - GitHub/Timer sync (~130 lines)
```

## Deleted Code

| File | Lines | Reason |
|------|-------|--------|
| WeeklyKPIInput.tsx | 1,587 | Replaced by new system |
| SimpleWeeklyKPIInput.tsx | 282 | Duplicate/unused |
| Week-specific target overrides | ~200 | Unused complexity |
| Week-specific name overrides | ~150 | Unused |
| Fiscal year migration | ~100 | One-time migration done |
| Daily guidance calculations | ~150 | Overengineered |

**Total deleted: ~2,500 lines**
**New code: ~1,500 lines**
**Net reduction: ~1,000 lines** with more features

## Features

### Training System
- Multiple training types (Strength, BJJ, Cardio, Recovery, Yoga)
- User can add custom training types
- Sessions tracked by date
- Recovery doesn't count toward target by default
- Visual session list with remove functionality

### Reading System
- Multiple books tracked simultaneously
- Support for physical, ebook, and audiobook
- Page-based progress for physical/ebook
- Percent-based progress for audiobook
- Weekly pages read aggregation
- Yearly completed books counter
- Pause/resume/complete/delete functionality

### Auto-Sync
- GitHub PRs auto-fetched when token configured
- Deep Work hours aggregated from timer sessions
- Manual override always available
- Sync indicator shows which KPIs are auto-synced

### History
- 5-week history bar chart
- Current week highlighted
- Color-coded by performance level

## Migration

Run the migration file:
```
database/migrations/033_weekly_kpis_revamp.sql
```

This will:
1. Create `training_types`, `training_sessions`, `books`, `book_progress` tables
2. Add `auto_sync_source` and `kpi_type` columns to `user_kpis`
3. Initialize default training types for existing users
4. Drop unused `weekly_kpi_targets` table

## Future Enhancements

### Phase 2: Social API Integrations
- YouTube Data API (videos published, views)
- Instagram Graph API (posts, reels, stories)
- Twitter/X API (tweets, engagement)

### Phase 3: Advanced Analytics
- Week-over-week trends
- Personal records tracking
- Goal prediction based on pace

## Integration Points

### Dashboard
The new system writes to the same `weekly_kpis` table, so:
- Dashboard progress calculation unchanged
- Rank/XP system works as before
- Year streak visualization works as before

### Profile Page
KPI configuration (targets, enable/disable) should be managed in Profile page.
The weekly view is for input only.
