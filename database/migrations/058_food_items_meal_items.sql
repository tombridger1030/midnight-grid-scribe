-- Food Items and Meal Items Migration
-- Creates tables for storing individual food items and meal instances

-- Food Items catalog (reusable across meals)
CREATE TABLE IF NOT EXISTS food_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT,
  description TEXT,
  serving_size TEXT, -- e.g., "1 cup", "100g", "1 bottle"
  calories_per_serving INT NOT NULL DEFAULT 0,
  protein_g DECIMAL(6,2) DEFAULT 0,
  carbs_g DECIMAL(6,2) DEFAULT 0,
  fat_g DECIMAL(6,2) DEFAULT 0,
  data_source TEXT DEFAULT 'manual', -- 'manual', 'ai', 'ai_with_search'
  external_id TEXT, -- For USDA or other database references
  search_query TEXT, -- What was searched to find this
  times_used INT DEFAULT 1, -- Track popularity
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meal Items (instances of food_items in a specific meal)
CREATE TABLE IF NOT EXISTS meal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snacks')),
  food_item_id UUID REFERENCES food_items(id) ON DELETE SET NULL,

  -- Snapshot of nutrition data at time of logging
  name TEXT NOT NULL,
  serving_size TEXT,
  calories INT NOT NULL DEFAULT 0,
  protein_g DECIMAL(6,2) DEFAULT 0,
  carbs_g DECIMAL(6,2) DEFAULT 0,
  fat_g DECIMAL(6,2) DEFAULT 0,

  quantity INT DEFAULT 1, -- Number of servings

  -- AI metadata
  ai_generated BOOLEAN DEFAULT FALSE,
  confidence_score DECIMAL(3,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_food_items_user ON food_items (user_id);
CREATE INDEX IF NOT EXISTS idx_food_items_name_search ON food_items USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_meal_items_user_date ON meal_items (user_id, date);
CREATE INDEX IF NOT EXISTS idx_meal_items_meal ON meal_items (user_id, date, meal_type);

-- RLS
ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_items ENABLE ROW LEVEL SECURITY;

-- Policies for food_items
DO $$ BEGIN
  CREATE POLICY "food_items_select" ON food_items FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "food_items_insert" ON food_items FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "food_items_update" ON food_items FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "food_items_delete" ON food_items FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Policies for meal_items
DO $$ BEGIN
  CREATE POLICY "meal_items_select" ON meal_items FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "meal_items_insert" ON meal_items FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "meal_items_update" ON meal_items FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "meal_items_delete" ON meal_items FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
