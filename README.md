
# Midnight Tracker

Terminal-inspired minimalist personal metrics tracking system. Built for "Midnight," an extreme-performance persona tracking various metrics (deep-work, workouts, calories, sleep, finance, habits, etc.).

## Features

- Inline-editable grid where rows = metrics and columns = dates
- localStorage persistence with abstraction layer for future backend integration
- Import/Export functionality via JSON
- Keyboard shortcuts for power users
- Minimal, terminal-inspired UI

## Keyboard Shortcuts

- `Ctrl+M` - Add a new metric
- `Ctrl+N` - Add today as a new day
- `Ctrl+E` - Export data to JSON
- `Ctrl+I` - Import data from JSON

## Storage Abstraction

The app uses a storage abstraction layer defined in `src/lib/storage.ts` that currently uses localStorage but can be extended to use Supabase or any other backend storage.

### Data Model

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
```

### Core Functions

- `loadData()` - Loads data from storage
- `saveData(data)` - Saves data to storage
- `exportData()` - Exports data to JSON file
- `importData(fileContent)` - Imports data from JSON file

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

5. Update the React components to handle asynchronous operations.

## License

MIT
