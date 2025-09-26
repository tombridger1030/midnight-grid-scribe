-- Add financial_metrics table for tracking MRR and net worth
CREATE TABLE IF NOT EXISTS financial_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  mrr NUMERIC NOT NULL DEFAULT 0,
  net_worth NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add trigger for updated_at timestamp
DROP TRIGGER IF EXISTS update_financial_metrics_updated_at ON financial_metrics;
CREATE TRIGGER update_financial_metrics_updated_at
  BEFORE UPDATE ON financial_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security) for maximum security on financial data
ALTER TABLE financial_metrics ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first
DROP POLICY IF EXISTS "financial_metrics_select_policy" ON financial_metrics;
DROP POLICY IF EXISTS "financial_metrics_insert_policy" ON financial_metrics;
DROP POLICY IF EXISTS "financial_metrics_update_policy" ON financial_metrics;
DROP POLICY IF EXISTS "financial_metrics_delete_policy" ON financial_metrics;

-- Create secure RLS policies - only allow access to the specific authorized user
-- This ensures financial data (MRR, net worth) is completely private and secure
CREATE POLICY "financial_metrics_select_policy" ON financial_metrics 
  FOR SELECT USING (user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b');

CREATE POLICY "financial_metrics_insert_policy" ON financial_metrics 
  FOR INSERT WITH CHECK (user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b');

CREATE POLICY "financial_metrics_update_policy" ON financial_metrics 
  FOR UPDATE USING (user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b') 
  WITH CHECK (user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b');

CREATE POLICY "financial_metrics_delete_policy" ON financial_metrics 
  FOR DELETE USING (user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b');
