-- Nutrition AI Analysis Migration
-- Stores AI-analyzed food entries for history and re-use

-- ============================================
-- 1. NUTRITION AI ENTRIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS nutrition_ai_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snacks')),

  -- Input data (what the user provided)
  input_type TEXT NOT NULL CHECK (input_type IN ('product_name', 'weight_food', 'photo_ocr')),
  input_text TEXT,
  input_image_url TEXT,

  -- AI analysis results
  calories INT NOT NULL DEFAULT 0,
  protein INT NOT NULL DEFAULT 0,
  carbs INT,
  fat INT,

  -- AI metadata
  ai_provider TEXT NOT NULL, -- 'openai' or 'anthropic'
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  model_version TEXT,

  -- Raw AI response for debugging
  raw_response JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE nutrition_ai_entries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "nutrition_ai_entries_select" ON nutrition_ai_entries FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "nutrition_ai_entries_insert" ON nutrition_ai_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "nutrition_ai_entries_delete" ON nutrition_ai_entries FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_nutrition_ai_user_date ON nutrition_ai_entries (user_id, date);
CREATE INDEX IF NOT EXISTS idx_nutrition_ai_user_meal ON nutrition_ai_entries (user_id, meal_type);
CREATE INDEX IF NOT EXISTS idx_nutrition_ai_provider ON nutrition_ai_entries (ai_provider);

-- ============================================
-- 2. UPDATED_AT TRIGGER
-- ============================================
DROP TRIGGER IF EXISTS trg_nutrition_ai_entries_updated_at ON nutrition_ai_entries;
CREATE TRIGGER trg_nutrition_ai_entries_updated_at
  BEFORE UPDATE ON nutrition_ai_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================
-- 3. HELPER FUNCTION: Get Recent AI Entries
-- ============================================
CREATE OR REPLACE FUNCTION get_recent_nutrition_ai_entries(
  p_user_id UUID,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  date DATE,
  meal_type TEXT,
  input_type TEXT,
  input_text TEXT,
  calories INT,
  protein INT,
  carbs INT,
  fat INT,
  ai_provider TEXT,
  confidence_score DECIMAL,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    nae.id,
    nae.date,
    nae.meal_type,
    nae.input_type,
    nae.input_text,
    nae.calories,
    nae.protein,
    nae.carbs,
    nae.fat,
    nae.ai_provider,
    nae.confidence_score,
    nae.created_at
  FROM nutrition_ai_entries nae
  WHERE nae.user_id = p_user_id
  ORDER BY nae.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Done!
-- ============================================
