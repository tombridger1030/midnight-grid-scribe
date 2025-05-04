
# Midnight Terminal Tracker

Terminal-inspired minimalist personal metrics tracking system. Built for "Midnight," an extreme-performance persona running 21-day on / 7-day off sprints tracking various metrics (deep-work, workouts, calories, sleep, finance, habits, etc.).

## Features

- **Multi-page Terminal Interface**
  - Metrics Input: Inline-editable grid for data entry
  - Visualizer: Charts and statistics for performance analysis
  - Schedule: Sprint cycle calendar with 21-on/7-off visualization
  - Roadmap: Goals and milestones tracking

- **Data Management**
  - localStorage persistence with abstraction layer for future backend integration
  - Import/Export functionality via JSON and CSV
  - Keyboard shortcuts for power users

- **Terminal Aesthetics**
  - Minimal, terminal-inspired UI with monospace fonts
  - System stat indicators like CPU, RAM usage (simulated)
  - Blinking cursors and typewriter text effects

## Keyboard Shortcuts

- `Ctrl+M` - Add a new metric
- `Ctrl+N` - Add today as a new day
- `Ctrl+E` - Export data to JSON/CSV
- `Ctrl+I` - Import data from JSON/CSV
- `Ctrl+G` - Toggle roadmap panel (planned)

## Pages

### 1. Metrics Input

The primary data entry interface with an editable grid:
- Rows represent metrics
- Columns represent dates
- Add/remove metrics and dates
- Edit values directly in cells
- Mini spark-line charts show trends

### 2. Visualizer

Data visualization page with charts and statistics:
- Period selector (Week/Month/Quarter/Year)
- Line charts with raw values and rolling averages
- Summary statistics showing values, changes, and percentages
- Boolean metric visualization for habit tracking
- Sprint phase highlighting

### 3. Schedule

Sprint cycle calendar showing the 21-day on / 7-day off pattern:
- Year view calendar with sprint phase highlighting
- Deep work session scheduling via clicking days
- Sprint cycle configuration
- Current sprint status indicators

### 4. Roadmap & Goals

Goal and milestone tracking page:
- Add and track goals with target dates
- Break down goals into milestones
- Categorize goals (Echo, Fitness, Finance, Personal)
- Track progress with visual indicators
- Filter goals by category

## Data Model

```typescript
interface MetricData {
  id: string;
  name: string;
  values: Record<string, string | number>;
}

interface TrackerData {
  metrics: MetricData[];
  dates: string[];
}

interface Goal {
  id: string;
  name: string;
  description: string;
  targetDate: string;
  progress: number; // 0-100
  category: string;
  milestones: {
    id: string;
    name: string;
    completed: boolean;
  }[];
}
```

## Storage Abstraction

The app uses a storage abstraction layer defined in `src/lib/storage.ts` that currently uses localStorage but can be extended to use Supabase or any other backend storage.

### Core Functions

- `loadData()` - Loads data from storage
- `saveData(data)` - Saves data to storage
- `exportData()` - Exports data to JSON file
- `importData(fileContent)` - Imports data from JSON file
- `exportDataCSV()` - Exports data to CSV file
- `importDataCSV(fileContent)` - Imports data from CSV file

## Sprint Cycle Logic

The sprint cycle is configured with these constants:

```typescript
const SPRINT_ON_DAYS = 21;
const SPRINT_OFF_DAYS = 7;
const SPRINT_CYCLE = SPRINT_ON_DAYS + SPRINT_OFF_DAYS;
```

The system calculates which phase (ON or OFF) a given date falls in based on the distance from the sprint start date:

```typescript
const isSprintOnDay = (date: Date) => {
  const diffTime = Math.abs(date.getTime() - sprintStartDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const cyclePosition = diffDays % SPRINT_CYCLE;
  
  return cyclePosition < SPRINT_ON_DAYS;
};
```

The sprint start date is stored in localStorage and can be configured in the Schedule page.

## CSV/JSON Template Format

### JSON Format

```json
{
  "metrics": [
    {
      "id": "metric-1",
      "name": "Deep Work Hours",
      "values": {
        "2023-01-01": 4,
        "2023-01-02": 6
      }
    }
  ],
  "dates": ["2023-01-01", "2023-01-02"]
}
```

### CSV Format

```csv
Metric Name,2023-01-01,2023-01-02
Deep Work Hours,4,6
Calories,2100,2300
```

## Extending to Supabase

To extend the storage to use Supabase instead of localStorage:

1. Create a Supabase project and database table structure:

```sql
-- Create a table for metrics
CREATE TABLE metrics (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id)
);

-- Create a table for metric values
CREATE TABLE metric_values (
  metric_id UUID REFERENCES metrics(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (metric_id, date)
);

-- Create a table for user dates
CREATE TABLE user_dates (
  user_id UUID REFERENCES auth.users(id),
  date DATE NOT NULL,
  PRIMARY KEY (user_id, date)
);

-- Create a goals table
CREATE TABLE goals (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  progress INTEGER DEFAULT 0,
  category TEXT
);

-- Create a milestones table
CREATE TABLE milestones (
  id UUID PRIMARY KEY,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  completed BOOLEAN DEFAULT false
);

-- Create a sprint_config table
CREATE TABLE sprint_config (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  sprint_start_date DATE NOT NULL,
  on_days INTEGER DEFAULT 21,
  off_days INTEGER DEFAULT 7
);

-- Create a deep_work_blocks table
CREATE TABLE deep_work_blocks (
  user_id UUID REFERENCES auth.users(id),
  block_date DATE NOT NULL,
  PRIMARY KEY (user_id, block_date)
);
```

2. Install the Supabase client in your project:
```
npm install @supabase/supabase-js
```

3. Create a Supabase client in the storage module:

```typescript
// Add to storage.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

// Replace loadData implementation
export const loadData = async (): Promise<TrackerData> => {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return initialData;
  
  // Get user's metrics
  const { data: metrics } = await supabase
    .from('metrics')
    .select('*')
    .eq('user_id', user.id);
  
  // Get user's dates
  const { data: dates } = await supabase
    .from('user_dates')
    .select('date')
    .eq('user_id', user.id)
    .order('date', { ascending: true });
  
  // Get all metric values
  const { data: values } = await supabase
    .from('metric_values')
    .select('*')
    .in('metric_id', metrics.map(m => m.id));
  
  // Format the data
  const metricsData: MetricData[] = metrics.map(m => {
    const metricValues = values
      .filter(v => v.metric_id === m.id)
      .reduce((acc, v) => {
        acc[v.date] = v.value;
        return acc;
      }, {} as Record<string, string>);
    
    return {
      id: m.id,
      name: m.name,
      values: metricValues
    };
  });
  
  return {
    metrics: metricsData,
    dates: dates.map(d => d.date)
  };
};

// Replace saveData implementation
export const saveData = async (data: TrackerData): Promise<void> => {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  // Start a transaction
  const { error } = await supabase.rpc('save_tracker_data', {
    p_user_id: user.id,
    p_metrics: data.metrics,
    p_dates: data.dates
  });
  
  if (error) console.error('Error saving data:', error);
};
```

4. Create a stored procedure in Supabase to handle the transaction:

```sql
CREATE OR REPLACE FUNCTION save_tracker_data(
  p_user_id UUID,
  p_metrics JSONB,
  p_dates TEXT[]
) RETURNS void AS $$
BEGIN
  -- Delete existing data for this user
  DELETE FROM metric_values
  WHERE metric_id IN (
    SELECT id FROM metrics WHERE user_id = p_user_id
  );
  
  DELETE FROM metrics
  WHERE user_id = p_user_id;
  
  DELETE FROM user_dates
  WHERE user_id = p_user_id;
  
  -- Insert new metrics
  INSERT INTO metrics (id, name, user_id)
  SELECT 
    (m->>'id')::UUID,
    m->>'name',
    p_user_id
  FROM jsonb_array_elements(p_metrics) AS m;
  
  -- Insert metric values
  WITH values_to_insert AS (
    SELECT
      (m->>'id')::UUID AS metric_id,
      key AS date,
      value
    FROM jsonb_array_elements(p_metrics) AS m,
    jsonb_each_text(m->'values') AS vals(key, value)
  )
  INSERT INTO metric_values (metric_id, date, value)
  SELECT metric_id, date::DATE, value
  FROM values_to_insert;
  
  -- Insert dates
  INSERT INTO user_dates (user_id, date)
  SELECT p_user_id, date::DATE
  FROM unnest(p_dates) AS date;
END;
$$ LANGUAGE plpgsql;
```

5. Update the React components to handle asynchronous operations:

   - Make data loading and saving functions async
   - Add loading states and error handling
   - Use React Query for data fetching and caching

## License

MIT
