# Database Schema Documentation

> **v3 (2026-04-27)** — Operator Terminal rewrite. Migration `066_operator_terminal.sql` adds 8 new tables and DROPs ~25 bloat tables (`deep_work_sessions`, `focus_sessions`, `content_items`, `content_metrics`, `weekly_kpi_entries`, `user_kpis`, `training_sessions`, `user_skills`, `skill_progression`, `user_ranks`, `rank_history`, `weekly_rank_assessments`, `sprints`, `kanban_*`, `daily_review_entries`, `daily_metrics`, `weekly_logs`, `activities`, `books`, `nutrition/weight/sleep_logs`).
>
> **v3 active tables** (per Wave 1):
>
> | Table                       | Purpose                                                            |
> | --------------------------- | ------------------------------------------------------------------ |
> | `daily_inputs`              | Sleep h, σ7, exercise Y/N, diet Y/N (1 row per user/day)           |
> | `schedule_blocks`           | Recurring weekly template (label, start/end time, days_of_week[])  |
> | `block_instances`           | Per-day instance of a block; results_text + AI-cleaned summary     |
> | `daily_flow`                | AI-emitted flow_score (0-100) + verdict (1 row per user/day)       |
> | `monthly_goals`             | Binary hit/missed at end-of-month, on_track/at_risk during         |
> | `accountability_recipients` | External accountability email config (one+ per user, daily/weekly) |
> | `accountability_sends`      | Audit log of digest sends                                          |
> | `blog_posts`                | 5 fields: title, body_md, word_count, created_at, updated_at       |
>
> **v3 preserved tables** (still used by Cash and Whoop pipeline): `mission_control_health` (Whoop recovery/sleep, feeds `daily_inputs.sleep_hours`), `subscriptions` and related `cash_*` schema, `profiles`, `auth.users`.
>
> **v3 SQL helpers**: `compute_sleep_sigma_7d(user, date)` (rolling 7d std-dev), `set_updated_at` trigger function (on `daily_inputs` and `blog_posts`).
>
> All v3 tables have RLS enabled with `auth.uid() = user_id` owner-only policies. Sections below describe the legacy v1/v2 schema for historical context — most of those tables are dropped in v3.

---

## Overview

Noctisium uses Supabase (PostgreSQL) as its database backend with a comprehensive schema designed for flexible personal metrics tracking. The database supports multi-user tenancy with Row Level Security (RLS) and provides both structured and flexible data storage options.

## Core Architecture

### Multi-Tenancy Design

- **User Isolation**: All tables include `user_id` field for data segregation
- **RLS Policies**: Row Level Security ensures users can only access their own data
- **Scalable Structure**: Schema supports multiple users with identical data structures

### Data Storage Patterns

- **Structured Data**: Traditional relational tables for well-defined entities
- **Semi-Structured**: JSONB columns for flexible metric storage
- **Soft Deletes**: Tasks marked as deleted rather than physically removed
- **Audit Trail**: Automatic timestamp management with triggers

## Main Schema Tables

### Flow Coach Tables (`deep_work_sessions`, `flow_coach_daily`)

`deep_work_sessions` is now the canonical focus/output session table. The legacy `focus_sessions` table is consolidated into it by migration `063_flow_coach.sql`, then dropped.

New coach fields on `deep_work_sessions`:

- `output_summary`: one-sentence end-of-session output note
- `flow_score`: 0-100 AI-scored output quality
- `flow_tag`: `deep_flow`, `solid`, `shallow`, `scattered`, or `wasted`
- `coach_feedback`: one-line feedback from the flow coach
- `coach_status`: `pending`, `scoring`, `scored`, `failed`, or `skipped`
- `coach_model`, `coach_input_hash`, `coach_scored_at`: scoring metadata and idempotency

`flow_coach_daily` stores one row per user/date with daily average flow score, total session count, total seconds, coach note, highlights, model, and generation timestamp. RLS restricts rows to the owner.

### Blog Posts (`blog_posts`)

`blog_posts` powers private drafts and public writing pages:

- Owner-only CRUD under `/blog`, `/blog/new`, and `/blog/:id/edit`
- Public read-only published posts under `/writing/:slug`
- `status` is `draft` or `published`; drafts are private by RLS
- `slug` is unique per user; public slug lookup only returns published rows
- `published_at` is managed when status changes

### 1. Goals Table (`goals`)

**Purpose**: Track yearly and monthly goals across different categories.

```sql
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  goal_id TEXT NOT NULL,
  name TEXT NOT NULL,
  yearly_target NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('professional', 'fitness', 'financial', 'personal')),
  is_numeric BOOLEAN NOT NULL DEFAULT true,
  monthly JSONB DEFAULT '{}'::jsonb,
  monthly_targets JSONB DEFAULT '{}'::jsonb,
  current_total NUMERIC NOT NULL DEFAULT 0,
  progress_pct NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, goal_id)
);
```

**Key Features**:

- **Progress Calculation**: Automatic progress percentage computation
- **Monthly Tracking**: JSONB storage for monthly values and targets
- **Category Classification**: Professional, fitness, financial, personal
- **Data Types**: Support for both numeric and non-numeric goals

**Triggers**:

- `recalculate_goal_progress_trigger`: Automatically updates `current_total` and `progress_pct`

### 2. Metrics Table (`metrics`)

**Purpose**: Store daily metric data with flexible structure.

```sql
CREATE TABLE metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);
```

**Key Features**:

- **Flexible Schema**: JSONB `data` column allows any metric structure
- **Daily Granularity**: One record per user per day
- **Date Format**: Text-based date storage for consistency
- **Extensible**: New metrics can be added without schema changes

### 3. Sprints Table (`sprints`)

**Purpose**: Manage sprint cycles for productivity tracking.

```sql
CREATE TABLE sprints (
  sprint_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  start_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Key Features**:

- **Sprint Tracking**: 21-day ON / 7-day OFF cycle management
- **Status Management**: Active, completed, planned states
- **Date-Based**: Text date storage for consistency with other tables

### 4. Financial Metrics Table (`financial_metrics`)

**Purpose**: Track financial performance indicators.

```sql
CREATE TABLE financial_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  mrr NUMERIC NOT NULL DEFAULT 0,
  net_worth NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);
```

**Key Features**:

- **Monthly Recurring Revenue**: MRR tracking
- **Net Worth**: Financial net worth monitoring
- **Single Record**: One record per user

### 5. Roadmaps Table (`roadmaps`)

**Purpose**: Store roadmap and milestone data.

```sql
CREATE TABLE roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  roadmap_id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, roadmap_id)
);
```

## Kanban Schema Tables

### 1. Kanban Boards (`kanban_boards`)

**Purpose**: Manage kanban boards for project tracking.

```sql
CREATE TABLE kanban_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  board_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, board_id)
);
```

### 2. Kanban Columns (`kanban_columns`)

**Purpose**: Define column structure for kanban boards.

```sql
CREATE TABLE kanban_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  board_id TEXT NOT NULL,
  column_id TEXT NOT NULL,
  title TEXT NOT NULL,
  color TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, board_id, column_id)
);
```

### 3. Kanban Tasks (`kanban_tasks`)

**Purpose**: Track individual tasks within kanban boards.

```sql
CREATE TABLE kanban_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  board_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  column_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assignee TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date DATE,
  labels JSONB DEFAULT '[]'::jsonb,
  time_spent NUMERIC NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, board_id, task_id)
);
```

## Extended Core Schema (Complete Database Setup)

### User Profiles (`user_profiles`)

**Purpose**: Enhanced user authentication and preferences with admin support.

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  user_preferences JSONB DEFAULT '{
    "show_content_tab": true,
    "enabled_modules": ["dashboard", "kpis", "visualizer", "roadmap", "cash", "content"],
    "default_view": "dashboard",
    "theme_settings": {
      "terminal_style": "cyberpunk",
      "animation_enabled": true,
      "sound_enabled": false
    }
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Key Features**:

- **Admin Support**: User role management for administrative functions
- **Module Configuration**: User can enable/disable specific modules
- **Theme Preferences**: Terminal style and animation settings
- **Auth Integration**: Direct reference to Supabase auth users

### User Configurations (`user_configs`)

**Purpose**: Store user-specific configuration settings for integrations.

```sql
CREATE TABLE user_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  config_key TEXT NOT NULL,
  config_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, config_key)
);
```

**Usage Examples**:

- GitHub API tokens and repository settings
- Third-party integration configurations
- Custom user preferences

### Enhanced User KPIs (`user_kpis`)

**Purpose**: Advanced user-defined KPI configurations with enhanced options.

```sql
CREATE TABLE user_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  kpi_id TEXT NOT NULL,
  name TEXT NOT NULL,
  target DECIMAL NOT NULL,
  min_target DECIMAL,
  unit TEXT NOT NULL,
  category TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#5FE3B3',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  is_average BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, kpi_id)
);
```

**Enhanced Features**:

- **Minimum Targets**: Support for target ranges
- **Sorting**: Custom order for KPI display
- **Average Calculation**: Option to calculate averages instead of totals
- **Active Status**: Enable/disable specific KPIs

### Weekly KPIs System

#### Weekly KPIs (`weekly_kpis`)

**Purpose**: Store aggregated weekly KPI data.

```sql
CREATE TABLE weekly_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  week_key TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, week_key)
);
```

#### Weekly KPI Entries (`weekly_kpi_entries`)

**Purpose**: Detailed weekly KPI entries with completion tracking.

```sql
CREATE TABLE weekly_kpi_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  week_key TEXT NOT NULL,
  kpi_id TEXT NOT NULL,
  name TEXT NOT NULL,
  current_value DECIMAL DEFAULT 0,
  target_value DECIMAL NOT NULL,
  min_target_value DECIMAL,
  unit TEXT NOT NULL,
  category TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#5FE3B3',
  is_completed BOOLEAN DEFAULT false,
  completion_rate DECIMAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, week_key, kpi_id)
);
```

**Key Features**:

- **Completion Tracking**: Automatic completion status calculation
- **Performance Rates**: Completion percentage tracking
- **Weekly Granularity**: Detailed week-by-week analysis

### Content Metrics (`content_metrics`)

**Purpose**: Platform-specific content performance tracking.

```sql
CREATE TABLE content_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  week_key TEXT NOT NULL,
  platform TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  metric_value DECIMAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, week_key, platform, metric_type)
);
```

### Platform Metrics (`platform_metrics`)

**Purpose**: General platform performance tracking.

```sql
CREATE TABLE platform_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value DECIMAL DEFAULT 0,
  week_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Extended Schema (Key Migrations)

### User KPIs Configuration

**Purpose**: Store user-configurable KPI definitions.

```sql
CREATE TABLE user_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  kpi_id TEXT NOT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#53B4FF',
  category TEXT NOT NULL,
  is_average BOOLEAN NOT NULL DEFAULT FALSE,
  is_reverse_scoring BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, kpi_id)
);
```

**Key Features**:

- **Configurable Metrics**: User-defined KPI configurations
- **Visual Customization**: Color coding for charts
- **Scoring Options**: Normal and reverse scoring support
- **Aggregation**: Average vs total calculation options

### Content Tracking Tables

#### Content Items (`content_items`)

**Purpose**: Track content creation across platforms.

```sql
CREATE TABLE content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  title TEXT NOT NULL,
  platform TEXT NOT NULL,
  content_type TEXT NOT NULL,
  published_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, content_id)
);
```

#### Content Metrics (`content_metrics`)

**Purpose**: Store performance metrics for content items.

```sql
CREATE TABLE content_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  metric_date DATE NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  subscribers INTEGER NOT NULL DEFAULT 0,
  revenue NUMERIC NOT NULL DEFAULT 0,
  swipe_rate NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Skill Progression System

**Purpose**: Track skill development and competency progression.

```sql
CREATE TABLE skill_progression (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  category TEXT NOT NULL,
  current_level NUMERIC NOT NULL DEFAULT 0,
  target_level NUMERIC NOT NULL DEFAULT 0,
  progress_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, skill_id)
);
```

## Mission Control Schema (`061_mission_control.sql`)

### Mission Control Commits (`mission_control_commits`)

**Purpose**: Track daily GitHub engineering output per repository.

```sql
CREATE TABLE mission_control_commits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  repo_name text NOT NULL,
  commit_count int NOT NULL DEFAULT 0,
  prs_created int NOT NULL DEFAULT 0,
  prs_merged int NOT NULL DEFAULT 0,
  last_commit_sha text,
  lines_added int NOT NULL DEFAULT 0,
  lines_deleted int NOT NULL DEFAULT 0,
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date, repo_name)
);
```

**Key Features**:

- **Per-Repo Granularity**: Separate rows per repo per day
- **PR Tracking**: Both created and merged PR counts
- **Lines of Code**: `lines_added` and `lines_deleted` for LoC telemetry (dual-line sparkline in UI)
- **Sync Metadata**: `last_commit_sha` and `synced_at` for incremental sync

### Mission Control Health (`mission_control_health`)

**Purpose**: Store daily Whoop health telemetry.

```sql
CREATE TABLE mission_control_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  recovery_score numeric,
  hrv_ms numeric,
  resting_hr numeric,
  sleep_hours numeric,
  sleep_efficiency numeric,
  strain numeric,
  calories numeric,
  whoop_cycle_id text,
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);
```

**Key Features**:

- **Daily Granularity**: One row per user per day
- **Comprehensive Metrics**: Recovery, HRV, resting HR, sleep hours/efficiency, strain, calories
- **Whoop Cycle Tracking**: `whoop_cycle_id` for deduplication

### Mission Control Sync (`mission_control_sync`)

**Purpose**: Track sync state and connection status for external integrations.

```sql
CREATE TABLE mission_control_sync (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  github_repos text[] DEFAULT '{}',
  whoop_connected boolean DEFAULT false,
  whoop_token_expires_at timestamptz,
  last_github_sync timestamptz,
  last_whoop_sync timestamptz,
  github_sync_errors jsonb DEFAULT '[]',
  whoop_sync_errors jsonb DEFAULT '[]'
);
```

**Key Features**:

- **Single Row Per User**: Primary key is `user_id`
- **Repo Configuration**: Array of tracked GitHub repo names
- **Connection State**: Whoop OAuth connection status and token expiry
- **Error Logging**: JSONB arrays for sync error history
- **No Secrets**: Tokens stored in Supabase Vault, not in this table

### Mission Control Automated Sync (`pg_cron`)

- **GitHub Sync**: Runs every 15 minutes via `pg_cron`, invokes `github-sync` edge function
- **Whoop Sync**: Runs every 30 minutes via `pg_cron`, invokes `whoop-sync` edge function

### Mission Control Security

- All three tables have RLS enabled
- Users can only read/write their own data via `auth.uid() = user_id` policies
- Vault helper functions (`get_vault_secret`, `update_vault_secret`, `create_vault_secret`) restricted to `service_role` only

### Mission Control Indexes

- `idx_mc_commits_user_date`: `(user_id, date DESC)` on `mission_control_commits`
- `idx_mc_health_user_date`: `(user_id, date DESC)` on `mission_control_health`

## Database Functions and Triggers

### 1. Timestamp Management

**Function**: `update_updated_at_column()`

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Purpose**: Automatically update `updated_at` timestamps on all table updates.

### 2. Goal Progress Calculation

**Function**: `recalculate_goal_progress()`

```sql
CREATE OR REPLACE FUNCTION recalculate_goal_progress()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_numeric THEN
    SELECT COALESCE(SUM(value::numeric), 0)
    INTO NEW.current_total
    FROM jsonb_each_text(NEW.monthly) AS month_data(month, value)
    WHERE value ~ '^[0-9]+(\.[0-9]+)?$';

    IF NEW.yearly_target > 0 THEN
      NEW.progress_pct = LEAST(1.0, NEW.current_total / NEW.yearly_target);
    ELSE
      NEW.progress_pct = 0;
    END IF;
  ELSE
    NEW.current_total = 0;
    NEW.progress_pct = 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Purpose**: Automatically calculate goal progress based on monthly values.

## Security and Access Control

### Row Level Security (RLS)

All tables implement RLS policies to ensure users can only access their own data:

```sql
-- Example RLS policy for goals table
CREATE POLICY "Users can view own goals" ON goals
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own goals" ON goals
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own goals" ON goals
  FOR UPDATE USING (auth.uid()::text = user_id);
```

## Migration Strategy

### Numbered Migrations

- Migrations are numbered sequentially (001, 002, etc.)
- Each migration handles specific schema additions or modifications
- Backward compatibility is maintained where possible

### Key Migration Categories

1. **Core Schema**: Initial table structure
2. **Feature Additions**: New functionality (content tracking, KPIs)
3. **Schema Fixes**: Bug corrections and optimizations
4. **Security Updates**: RLS policies and access controls

## Data Relationships

### Entity Relationship Overview

```
users (via auth.uid())
  ├── goals (1:many)
  ├── metrics (1:many - daily)
  ├── sprints (1:many)
  ├── financial_metrics (1:1)
  ├── roadmaps (1:many)
  ├── user_kpis (1:many)
  ├── kanban_boards (1:many)
  │   ├── kanban_columns (1:many)
  │   └── kanban_tasks (1:many)
  ├── content_items (1:many)
  │   └── content_metrics (1:many)
  ├── skill_progression (1:many)
  ├── mission_control_commits (1:many - per repo per day)
  ├── mission_control_health (1:many - daily)
  └── mission_control_sync (1:1)
```

## Performance Considerations

### Indexing Strategy

- **Composite Indexes**: `(user_id, date)` for time-series queries
- **Unique Constraints**: Enforce data integrity
- **JSONB Indexes**: GIN indexes on JSONB columns for efficient queries

### Query Optimization

- **User Filtering**: All queries include `user_id` filtering
- **Date Ranges**: Efficient date-based queries
- **JSON Operations**: Optimized JSONB query patterns

---

## Related Documentation

- [Project Architecture](./project_architecture.md)
- [Development SOP](../SOP/development_sop.md)
- [Tasks & Features](../tasks/)
