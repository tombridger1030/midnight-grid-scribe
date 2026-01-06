-- Migration: Unified KPI Target Editing
--
-- Adds special KPIs (Nutrition, Sleep, Weight) to user_kpis table
-- so targets can be edited through the KPI Management UI instead of localStorage.

-- Nutrition Calories KPI
INSERT INTO user_kpis (user_id, kpi_id, name, target, unit, category, color, is_active, sort_order, kpi_type, auto_sync_source)
SELECT
  id,
  'avg_calories',
  'Avg Calories',
  1900,
  'calories',
  'health',
  '#FF6B6B',
  true,
  10,
  'counter',
  null
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM user_kpis WHERE kpi_id = 'avg_calories' AND user_id = auth.users.id
);

-- Nutrition Protein KPI
INSERT INTO user_kpis (user_id, kpi_id, name, target, unit, category, color, is_active, sort_order, kpi_type, auto_sync_source)
SELECT
  id,
  'avg_protein',
  'Avg Protein',
  150,
  'grams',
  'health',
  '#4ECDC4',
  true,
  11,
  'counter',
  null
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM user_kpis WHERE kpi_id = 'avg_protein' AND user_id = auth.users.id
);

-- Sleep Target KPI
INSERT INTO user_kpis (user_id, kpi_id, name, target, unit, category, color, is_active, sort_order, kpi_type, auto_sync_source)
SELECT
  id,
  'sleepTarget',
  'Sleep Target',
  7,
  'hours',
  'discipline',
  '#9D4EDD',
  true,
  12,
  'hours',
  null
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM user_kpis WHERE kpi_id = 'sleepTarget' AND user_id = auth.users.id
);

-- Weight Target KPI
INSERT INTO user_kpis (user_id, kpi_id, name, target, unit, category, color, is_active, sort_order, kpi_type, auto_sync_source)
SELECT
  id,
  'weightTarget',
  'Weight Target',
  180,
  'lbs',
  'health',
  '#00CED1',
  true,
  13,
  'counter',
  null
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM user_kpis WHERE kpi_id = 'weightTarget' AND user_id = auth.users.id
);
