# Midnight Terminal Tracker

Terminal-inspired minimalist personal metrics tracking system. Built for "Midnight," an extreme-performance persona running 21-day on / 7-day off sprints tracking various metrics (deep-work, workouts, calories, sleep, finance, habits, etc.).

## Features

- **Multi-page Terminal Interface**
  - Metrics Input: Inline-editable grid for data entry
  - Visualizer: Charts and statistics for performance analysis
  - Schedule: Sprint cycle calendar with 21-on/7-off visualization
  - Roadmap: Goals and milestones tracking

- **Data Management**
  - Supabase backend with localStorage fallback
  - Import/Export functionality via JSON and CSV
  - Keyboard shortcuts for power users

- **Terminal Aesthetics**
  - Minimal, terminal-inspired UI with monospace fonts
  - System stat indicators like CPU, RAM usage (simulated)
  - Blinking cursors and typewriter text effects

## Project Structure

```
noctisium/
├── src/                    # React application source
├── database/               # Database schemas, migrations, and policies
│   ├── schemas/           # Complete database schemas
│   ├── migrations/        # Database migrations (numbered)
│   ├── policies/          # Row Level Security policies
│   ├── functions/         # Database functions
│   └── legacy/           # Old/deprecated SQL files
├── scripts/               # Build and deployment scripts
└── public/               # Static assets
```

## Database Setup

See `database/README.md` for detailed database setup instructions. Quick start:

1. **Initial Setup:**
   ```sql
   -- Run in Supabase SQL Editor
   \i database/schemas/main_schema.sql
   \i database/schemas/kanban_schema.sql
   \i database/policies/sprints_update_policy.sql
   ```

2. **If you encounter issues with sprints:**
   ```sql
   \i database/migrations/001_fix_sprints_table.sql
   ```

## Keyboard Shortcuts

- `Ctrl+M` - Add a new metric
- `Ctrl+N` - Add today as a new day
- `Ctrl+E` - Export data to JSON/CSV
- `Ctrl+I` - Import data from JSON/CSV

## Pages

### 1. Metrics Input
The primary data entry interface with an editable grid for tracking daily metrics.

### 2. Visualizer
Data visualization with charts, statistics, and trend analysis.

### 3. Schedule
Sprint cycle calendar with visual indicators for ON/OFF periods and habit compliance.

### 4. Roadmap & Goals
Goal tracking with monthly targets and progress visualization.

## Sprint System

The application uses a sophisticated sprint management system:

- **Customizable cycles**: Configure ON/OFF day periods per sprint
- **Auto-status updates**: Sprints automatically transition from planned → active → completed
- **Visual calendar**: Color-coded borders show sprint phases and habit compliance
- **Historical tracking**: Full sprint history with editable periods

### Border Color System
- **Green border**: Sprint ON days (high-intensity work)
- **Red border**: Sprint OFF days (recovery/maintenance)
- **Bright green border**: Habit-compliant days (overrides sprint colors)
- **No border**: Non-sprint days

## Data Model

```typescript
interface Sprint {
  sprint_id: string;
  user_id: string;
  start_date: string;
  end_date?: string;
  status: 'active' | 'completed' | 'planned';
  name?: string;
  on_days?: number;
  off_days?: number;
}

interface MetricData {
  id: string;
  name: string;
  values: Record<string, string | number>;
}

interface Goal {
  id: string;
  name: string;
  yearly_target: number;
  monthly: Record<string, number>;
  progress_pct: number;
}
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## License

MIT
