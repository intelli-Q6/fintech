-- KoshQ Financial Engine — Migration 001: Initial Schema
-- Enforces canonical data modeling, append-only transactions, derived positions, and fixed-point precision

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Associated with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  base_currency TEXT NOT NULL DEFAULT 'INR',
  tier TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. USER PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'slate',
  mode TEXT NOT NULL DEFAULT 'light',
  density TEXT NOT NULL DEFAULT 'compact',
  macro_pulse_config JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. ACCOUNTS TABLE (User's Broker / Depository / Holding Enclave)
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  broker TEXT NOT NULL DEFAULT 'Manual', -- Zerodha, Groww, Upstox, ICICI Direct, Manual, CAS Import, Other
  account_type TEXT NOT NULL DEFAULT 'demat', -- demat, mutual_fund, bank, sovereign
  base_currency TEXT NOT NULL DEFAULT 'INR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. INSTRUMENTS TABLE (Canonical Global / Indian Securities Catalog)
CREATE TABLE IF NOT EXISTS public.instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  isin TEXT UNIQUE,
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL DEFAULT 'NSE', -- NSE, BSE, US, MCX, AMFI
  name TEXT NOT NULL,
  asset_class TEXT NOT NULL CHECK (asset_class IN ('equity', 'mutual_fund', 'etf', 'bond', 'gold', 'govt_scheme', 'cash')),
  currency TEXT NOT NULL DEFAULT 'INR',
  sector TEXT NOT NULL DEFAULT 'General',
  market_cap_category TEXT, -- Large Cap, Mid Cap, Small Cap, Sovereign, Debt
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_instrument_symbol_exchange UNIQUE (symbol, exchange)
);

-- 5. TRANSACTIONS TABLE (Authoritative Immutable Financial Ledger)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  instrument_id UUID NOT NULL REFERENCES public.instruments(id) ON DELETE RESTRICT,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'BUY', 'SELL', 'DIVIDEND', 'INTEREST', 'FEE', 'TAX', 
    'DEPOSIT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT', 
    'BONUS', 'SPLIT', 'MERGER', 'REVERSAL', 'OTHER'
  )),
  quantity NUMERIC(20, 6) NOT NULL CHECK (quantity >= 0),
  price NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  gross_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  fees NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (fees >= 0),
  taxes NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (taxes >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  settlement_date TIMESTAMPTZ,
  reversal_of_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'MANUAL', -- MANUAL, CAS_IMPORT, BROKER_CSV, MIGRATION
  external_id TEXT,
  migration_id TEXT,
  source_record_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partial Unique Constraints for Idempotency
CREATE UNIQUE INDEX IF NOT EXISTS uq_txn_user_migration_record 
ON public.transactions (user_id, migration_id, source_record_id) 
WHERE migration_id IS NOT NULL AND source_record_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_txn_user_external 
ON public.transactions (user_id, external_id) 
WHERE external_id IS NOT NULL;

-- 6. POSITIONS TABLE (Derived State from Transactions Ledger)
CREATE TABLE IF NOT EXISTS public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  instrument_id UUID NOT NULL REFERENCES public.instruments(id) ON DELETE RESTRICT,
  quantity NUMERIC(20, 6) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  cost_basis NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (cost_basis >= 0),
  average_cost NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (average_cost >= 0),
  realized_pnl NUMERIC(18, 2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_account_instrument UNIQUE (user_id, account_id, instrument_id)
);

-- 7. PORTFOLIO SNAPSHOTS TABLE (Fast Historical Charting & Net Worth History)
CREATE TABLE IF NOT EXISTS public.portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  market_value NUMERIC(18, 2) NOT NULL DEFAULT 0,
  cost_basis NUMERIC(18, 2) NOT NULL DEFAULT 0,
  realized_pnl NUMERIC(18, 2) NOT NULL DEFAULT 0,
  unrealized_pnl NUMERIC(18, 2) NOT NULL DEFAULT 0,
  cash_value NUMERIC(18, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_snapshot_user_account_date UNIQUE (user_id, account_id, snapshot_date)
);

-- 8. AUDIT LOG TABLE (Security & Financial Audit Trail, Zero Secrets)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- LOGIN, LOGOUT, TRANSACTION_CREATED, TRANSACTION_REVERSED, CAS_UPLOADED, DATA_MIGRATED, AI_REQUEST, SETTINGS_CHANGED
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. AI USAGE DAILY TABLE (Rate Limiting & Daily Quota Accounting)
CREATE TABLE IF NOT EXISTS public.ai_usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  token_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_ai_usage_user_date UNIQUE (user_id, usage_date)
);

-- 10. FINANCIAL GOALS TABLE
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Retirement', 'FIRE', 'Home', 'Education', 'Emergency', 'Custom')),
  target_amount NUMERIC(14, 2) NOT NULL CHECK (target_amount >= 0),
  current_saved NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (current_saved >= 0),
  target_year INTEGER NOT NULL,
  monthly_required_sip NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. INVESTMENT JOURNAL TABLE
CREATE TABLE IF NOT EXISTS public.investment_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  asset_symbol TEXT,
  asset_name TEXT,
  title TEXT NOT NULL,
  thesis TEXT NOT NULL,
  expected_horizon TEXT,
  post_mortem_review TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. CAS DOCUMENTS STAGING TABLE
CREATE TABLE IF NOT EXISTS public.cas_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  investor_name TEXT,
  pan_masked TEXT,
  statement_period TEXT,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN (
    'uploaded', 'processing', 'parsed', 'validation_failed', 
    'awaiting_review', 'committed', 'failed'
  )),
  parsed_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_accounts_user ON public.accounts (user_id);
CREATE INDEX IF NOT EXISTS idx_instruments_isin ON public.instruments (isin);
CREATE INDEX IF NOT EXISTS idx_instruments_symbol ON public.instruments (symbol, exchange);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions (user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON public.transactions (account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_instrument ON public.transactions (instrument_id);
CREATE INDEX IF NOT EXISTS idx_positions_user ON public.positions (user_id);
CREATE INDEX IF NOT EXISTS idx_positions_account ON public.positions (account_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_user ON public.portfolio_snapshots (user_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_goals_user ON public.goals (user_id);
CREATE INDEX IF NOT EXISTS idx_journal_user ON public.investment_journal (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cas_docs_user ON public.cas_documents (user_id, created_at DESC);

-- 14. SEED CANONICAL BENCHMARK INSTRUMENTS
INSERT INTO public.instruments (symbol, exchange, name, asset_class, sector, market_cap_category, isin)
VALUES 
  ('NIFTY 50', 'NSE', 'NIFTY 50 Benchmark Index', 'etf', 'Broad Market', 'Large Cap', 'INF204KB14I2'),
  ('SENSEX', 'BSE', 'S&P BSE SENSEX Index', 'etf', 'Broad Market', 'Large Cap', 'INF204KB14J0'),
  ('BANKNIFTY', 'NSE', 'Nifty Bank Index', 'etf', 'Banking', 'Large Cap', 'INF204KB14K8'),
  ('GOLDBEES', 'NSE', 'Nippon India ETF Gold BeES', 'gold', 'Commodities', 'Commodity', 'INF204KB17I5'),
  ('RELIANCE.NS', 'NSE', 'Reliance Industries Ltd.', 'equity', 'Energy & Conglomerate', 'Large Cap', 'INE002A01018'),
  ('TCS.NS', 'NSE', 'Tata Consultancy Services Ltd.', 'equity', 'Information Technology', 'Large Cap', 'INE467B01029'),
  ('HDFCBANK.NS', 'NSE', 'HDFC Bank Ltd.', 'equity', 'Banking & Finance', 'Large Cap', 'INE040A01034'),
  ('INFY.NS', 'NSE', 'Infosys Ltd.', 'equity', 'Information Technology', 'Large Cap', 'INE009A01021'),
  ('ICICIBANK.NS', 'NSE', 'ICICI Bank Ltd.', 'equity', 'Banking & Finance', 'Large Cap', 'INE090A01021'),
  ('ITC.NS', 'NSE', 'ITC Ltd.', 'equity', 'FMCG', 'Large Cap', 'INE154A01025')
ON CONFLICT (symbol, exchange) DO NOTHING;
