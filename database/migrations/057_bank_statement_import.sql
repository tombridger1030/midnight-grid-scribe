-- Bank Statement Import Migration
-- Stores uploaded statements and parsed transactions

-- ============================================
-- 1. BANK STATEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bank_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'png', 'jpg', 'jpeg')),
  file_url TEXT, -- Supabase Storage URL
  statement_date DATE,
  account_name TEXT,
  total_transactions INT DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,

  -- AI processing metadata
  ai_provider TEXT DEFAULT 'anthropic',
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "bank_statements_select" ON bank_statements FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "bank_statements_insert" ON bank_statements FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "bank_statements_update" ON bank_statements FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "bank_statements_delete" ON bank_statements FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_bank_statements_user ON bank_statements (user_id);
CREATE INDEX IF NOT EXISTS idx_bank_statements_status ON bank_statements (processing_status);
CREATE INDEX IF NOT EXISTS idx_bank_statements_created ON bank_statements (created_at DESC);

-- ============================================
-- 2. BANK STATEMENT TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bank_statement_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id UUID REFERENCES bank_statements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Parsed transaction data
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,

  -- AI categorization
  category TEXT,
  confidence_score DECIMAL(3,2),

  -- Flag if imported to expenses
  imported_to_expenses BOOLEAN DEFAULT FALSE,
  expense_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bank_statement_transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "bank_statement_transactions_select" ON bank_statement_transactions FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "bank_statement_transactions_insert" ON bank_statement_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "bank_statement_transactions_update" ON bank_statement_transactions FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "bank_statement_transactions_delete" ON bank_statement_transactions FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_bank_transactions_user ON bank_statement_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_statement ON bank_statement_transactions (statement_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_statement_transactions (transaction_date);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_imported ON bank_statement_transactions (imported_to_expenses);

-- ============================================
-- 3. UPDATED_AT TRIGGER
-- ============================================
DROP TRIGGER IF EXISTS trg_bank_statements_updated_at ON bank_statements;
CREATE TRIGGER trg_bank_statements_updated_at
  BEFORE UPDATE ON bank_statements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================
-- 4. HELPER FUNCTION: Get Transactions by Statement
-- ============================================
CREATE OR REPLACE FUNCTION get_bank_statement_transactions(
  p_statement_id UUID
)
RETURNS TABLE (
  id UUID,
  transaction_date DATE,
  description TEXT,
  amount DECIMAL,
  category TEXT,
  confidence_score DECIMAL,
  imported_to_expenses BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bst.id,
    bst.transaction_date,
    bst.description,
    bst.amount,
    bst.category,
    bst.confidence_score,
    bst.imported_to_expenses
  FROM bank_statement_transactions bst
  WHERE bst.statement_id = p_statement_id
  ORDER BY bst.transaction_date DESC, bst.created_at;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. SPENDING CATEGORIES (for reference)
-- ============================================
-- These are the categories used for AI categorization:
-- Food & Dining, Shopping, Transportation, Bills & Utilities,
-- Entertainment, Health & Wellness, Travel, Education,
-- Personal Care, Home Improvement, Subscriptions, Income,
-- Transfer, Other

-- ============================================
-- Done!
-- ============================================
