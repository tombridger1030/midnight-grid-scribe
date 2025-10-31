# Database Schema Documentation

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
  └── skill_progression (1:many)
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