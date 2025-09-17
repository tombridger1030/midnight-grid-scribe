# Migration 012: KPI Definitions and Colors Update

## Overview
This migration addresses the updated KPI color scheme introduced for better chart visualization in the Visualizer component. Previously, all KPIs used the same orange color (`#FF6B00`), which caused overlapping and invisible lines in the charts.

## Changes Made

### 1. Database Schema
- Created `kpi_definitions` table to store KPI metadata
- Added trigger for `updated_at` field auto-update
- Created `kpi_definitions_by_category` view for easy querying
- Added appropriate indexes for performance

### 2. Color Updates
Each KPI now has a distinct color for better visualization:

| KPI | Old Color | New Color | Description |
|-----|-----------|-----------|-------------|
| Strength Sessions | `#FF6B00` | `#FF6B00` | Orange (unchanged as base) |
| BJJ Sessions | `#FF6B00` | `#53B4FF` | Blue for BJJ |
| Deep Work Hours | `#FF6B00` | `#5FE3B3` | Green for discipline |
| Recovery Sessions | `#FF6B00` | `#FFD700` | Gold for recovery |
| Sleep Average | `#FF6B00` | `#9D4EDD` | Purple for sleep |
| PR Requests | `#FF6B00` | `#4A90E2` | Blue for engineering |
| Bugs Closed | `#FF6B00` | `#FF6B6B` | Red for bug fixes |
| Content Shipped | `#FF6B00` | `#00CED1` | Turquoise for content |
| Pages Read | `#FF6B00` | `#FFA500` | Dark orange for reading |
| Audiobook % | `#FF6B00` | `#DA70D6` | Orchid for audiobooks |
| No Compromises | `#FF6B00` | `#32CD32` | Lime green for discipline |

## How to Apply

### Method 1: Supabase Dashboard (Recommended)
1. Log into your Supabase dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `012_kpi_definitions_and_colors.sql`
4. Execute the query

### Method 2: Command Line (if using Supabase CLI)
```bash
supabase db reset
# or
supabase migration up
```

### Method 3: Manual Application
If you prefer to run individual commands:

```sql
-- Run each section of the migration file step by step
-- 1. Create table
-- 2. Create trigger function
-- 3. Create trigger
-- 4. Insert data
-- 5. Create view
```

## Verification

After applying the migration, verify it worked:

```sql
-- Check that table was created
SELECT * FROM kpi_definitions ORDER BY category, name;

-- Check that all 11 KPIs are present
SELECT category, COUNT(*) as kpi_count
FROM kpi_definitions
GROUP BY category;

-- Verify the view works
SELECT * FROM kpi_definitions_by_category;
```

Expected results:
- 11 KPI definitions total
- 4 categories: fitness, discipline, engineering, learning
- Each KPI has a unique color value

## Frontend Integration (Optional)

The migration creates database storage for KPI definitions, but the frontend still uses the hardcoded definitions in `weeklyKpi.ts`. For future extensibility, you can use the new `kpiSync.ts` utility:

```typescript
import { autoSyncKPIDefinitions } from '@/lib/kpiSync';

// Call on app startup to ensure database is in sync
await autoSyncKPIDefinitions();
```

## Impact

### Immediate Benefits
- **Chart Visualization**: Line charts in Visualizer now show distinct colored lines for each KPI
- **Data Clarity**: Each KPI trend is clearly visible and distinguishable
- **Professional Appearance**: Color-coded KPIs provide better user experience

### Future Benefits
- **Database-Driven KPIs**: Foundation for making KPI definitions configurable
- **User Customization**: Potential for users to customize KPI colors and targets
- **Analytics**: Better tracking of KPI definition changes over time

## Rollback

If you need to rollback this migration:

```sql
-- Remove the table and related objects
DROP VIEW IF EXISTS kpi_definitions_by_category;
DROP TRIGGER IF EXISTS trg_kpi_definitions_set_updated_at ON kpi_definitions;
DROP FUNCTION IF EXISTS set_updated_at_kpi_definitions();
DROP TABLE IF EXISTS kpi_definitions;
```

Note: This rollback is safe as the frontend code still uses hardcoded definitions and doesn't depend on the database table yet.

## Related Files

- **Migration**: `012_kpi_definitions_and_colors.sql`
- **Frontend Definitions**: `src/lib/weeklyKpi.ts`
- **Sync Utility**: `src/lib/kpiSync.ts`
- **Visualizer Component**: `src/pages/Visualizer.tsx`

## Next Steps

1. Apply the migration to your Supabase instance
2. Test the Visualizer component to see the improved chart visualization
3. Consider integrating the `kpiSync` utility for future extensibility
4. Optionally add user customization features for KPI colors and targets