-- KoshQ Financial Engine — Complete Consolidated Schema
-- Generated from migrations 001, 002, and 003
-- Execute this script directly in the Supabase SQL Editor for instant project setup.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- SECTION 1: TABLES & ENTITIES
-- ====================================================================

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
  broker TEXT NOT NULL DEFAULT 'Manual',
  account_type TEXT NOT NULL DEFAULT 'demat',
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
  exchange TEXT NOT NULL DEFAULT 'NSE',
  name TEXT NOT NULL,
  asset_class TEXT NOT NULL CHECK (asset_class IN ('equity', 'mutual_fund', 'etf', 'bond', 'gold', 'govt_scheme', 'cash')),
  currency TEXT NOT NULL DEFAULT 'INR',
  sector TEXT NOT NULL DEFAULT 'General',
  market_cap_category TEXT,
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
  source TEXT NOT NULL DEFAULT 'MANUAL',
  external_id TEXT,
  migration_id TEXT,
  source_record_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

-- 7. PORTFOLIO SNAPSHOTS TABLE
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

-- 8. AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. AI USAGE DAILY TABLE
CREATE TABLE IF NOT EXISTS public.ai_usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  token_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_ai_usage_user_date UNIQUE (user_id, usage_date)
);

-- 10. GOALS TABLE
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

-- 12. CAS DOCUMENTS TABLE
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

-- Performance Indexes
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

-- Seed Canonical Benchmark Instruments
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

-- ====================================================================
-- SECTION 2: ROW LEVEL SECURITY & POLICIES
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cas_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "instruments_read_all" ON public.instruments FOR SELECT USING (true);
CREATE POLICY "instruments_insert_authenticated" ON public.instruments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "user_preferences_select_own" ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_preferences_insert_own" ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_preferences_update_own" ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "accounts_select_own" ON public.accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "accounts_insert_own" ON public.accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "accounts_update_own" ON public.accounts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "accounts_delete_own" ON public.accounts FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "transactions_select_own" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions_insert_own" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_deny_update" ON public.transactions FOR UPDATE USING (false);
CREATE POLICY "transactions_deny_delete" ON public.transactions FOR DELETE USING (false);

CREATE POLICY "positions_select_own" ON public.positions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "positions_insert_own" ON public.positions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "positions_update_own" ON public.positions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "positions_delete_own" ON public.positions FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "snapshots_select_own" ON public.portfolio_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "snapshots_insert_own" ON public.portfolio_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "snapshots_update_own" ON public.portfolio_snapshots FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "audit_log_select_own" ON public.audit_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "audit_log_insert_own" ON public.audit_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "audit_log_deny_update" ON public.audit_log FOR UPDATE USING (false);
CREATE POLICY "audit_log_deny_delete" ON public.audit_log FOR DELETE USING (false);

CREATE POLICY "ai_usage_select_own" ON public.ai_usage_daily FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ai_usage_insert_own" ON public.ai_usage_daily FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_usage_update_own" ON public.ai_usage_daily FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "goals_select_own" ON public.goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "goals_insert_own" ON public.goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goals_update_own" ON public.goals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goals_delete_own" ON public.goals FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "journal_select_own" ON public.investment_journal FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "journal_insert_own" ON public.investment_journal FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "journal_update_own" ON public.investment_journal FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "journal_delete_own" ON public.investment_journal FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "cas_docs_select_own" ON public.cas_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cas_docs_insert_own" ON public.cas_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cas_docs_update_own" ON public.cas_documents FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cas_docs_delete_own" ON public.cas_documents FOR DELETE USING (auth.uid() = user_id);

-- Profile provision trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, base_currency, tier)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'INR',
    'free'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.accounts (user_id, name, broker, account_type, base_currency)
  VALUES (
    NEW.id,
    'Primary Vault',
    'Manual',
    'demat',
    'INR'
  );

  INSERT INTO public.user_preferences (user_id, theme, mode, density)
  VALUES (
    NEW.id,
    'slate',
    'light',
    'compact'
  ) ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, metadata)
  VALUES (
    NEW.id,
    'USER_REGISTERED',
    'profiles',
    NEW.id::TEXT,
    jsonb_build_object('email', NEW.email, 'timestamp', now())
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- SECTION 3: FINANCIAL ACCOUNTING ENGINE & RPCS
-- ====================================================================

CREATE OR REPLACE FUNCTION public.create_transaction(
  p_account_id UUID,
  p_instrument_id UUID,
  p_type TEXT,
  p_quantity NUMERIC,
  p_price NUMERIC,
  p_fees NUMERIC DEFAULT 0,
  p_taxes NUMERIC DEFAULT 0,
  p_transaction_date TIMESTAMPTZ DEFAULT now(),
  p_source TEXT DEFAULT 'MANUAL',
  p_external_id TEXT DEFAULT NULL,
  p_migration_id TEXT DEFAULT NULL,
  p_source_record_id TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_account_owner UUID;
  v_txn_id UUID;
  v_existing_id UUID;
  v_gross_amount NUMERIC(18, 2);
  v_curr_qty NUMERIC(20, 6) := 0;
  v_curr_cost_basis NUMERIC(18, 2) := 0;
  v_curr_avg_cost NUMERIC(18, 2) := 0;
  v_curr_realized_pnl NUMERIC(18, 2) := 0;
  v_new_qty NUMERIC(20, 6);
  v_new_cost_basis NUMERIC(18, 2);
  v_new_avg_cost NUMERIC(18, 2);
  v_new_realized_pnl NUMERIC(18, 2);
  v_realized_trade_pnl NUMERIC(18, 2) := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User authentication required';
  END IF;

  SELECT user_id INTO v_account_owner 
  FROM public.accounts 
  WHERE id = p_account_id;

  IF v_account_owner IS NULL OR v_account_owner <> v_user_id THEN
    RAISE EXCEPTION 'Forbidden: Account does not belong to the authenticated user';
  END IF;

  IF p_migration_id IS NOT NULL AND p_source_record_id IS NOT NULL THEN
    SELECT id INTO v_existing_id 
    FROM public.transactions 
    WHERE user_id = v_user_id 
      AND migration_id = p_migration_id 
      AND source_record_id = p_source_record_id;

    IF v_existing_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'status', 'EXISTING',
        'message', 'Transaction already imported (idempotent)',
        'transaction_id', v_existing_id
      );
    END IF;
  END IF;

  IF p_external_id IS NOT NULL THEN
    SELECT id INTO v_existing_id 
    FROM public.transactions 
    WHERE user_id = v_user_id AND external_id = p_external_id;

    IF v_existing_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'status', 'EXISTING',
        'message', 'Transaction already exists with this external ID',
        'transaction_id', v_existing_id
      );
    END IF;
  END IF;

  IF p_type IN ('BUY', 'SELL') AND p_quantity <= 0 THEN
    RAISE EXCEPTION 'Invalid quantity: % must be strictly positive for BUY/SELL', p_quantity;
  END IF;

  IF p_price < 0 OR p_fees < 0 OR p_taxes < 0 THEN
    RAISE EXCEPTION 'Financial invariant violated: price, fees, and taxes must be non-negative';
  END IF;

  SELECT quantity, cost_basis, average_cost, realized_pnl 
  INTO v_curr_qty, v_curr_cost_basis, v_curr_avg_cost, v_curr_realized_pnl
  FROM public.positions
  WHERE user_id = v_user_id 
    AND account_id = p_account_id 
    AND instrument_id = p_instrument_id
  FOR UPDATE;

  v_curr_qty := COALESCE(v_curr_qty, 0);
  v_curr_cost_basis := COALESCE(v_curr_cost_basis, 0);
  v_curr_avg_cost := COALESCE(v_curr_avg_cost, 0);
  v_curr_realized_pnl := COALESCE(v_curr_realized_pnl, 0);

  IF p_type = 'SELL' AND v_curr_qty < p_quantity THEN
    RAISE EXCEPTION 'Oversell rejected: Available position (%) is less than sell quantity (%)', 
      v_curr_qty, p_quantity;
  END IF;

  v_gross_amount := ROUND((p_quantity * p_price), 2);

  INSERT INTO public.transactions (
    user_id, account_id, instrument_id, transaction_type,
    quantity, price, gross_amount, fees, taxes, currency,
    transaction_date, source, external_id, migration_id, 
    source_record_id, notes
  ) VALUES (
    v_user_id, p_account_id, p_instrument_id, p_type,
    p_quantity, p_price, v_gross_amount, p_fees, p_taxes, 'INR',
    COALESCE(p_transaction_date, now()), p_source, p_external_id, 
    p_migration_id, p_source_record_id, p_notes
  ) RETURNING id INTO v_txn_id;

  IF p_type = 'BUY' THEN
    v_new_qty := v_curr_qty + p_quantity;
    v_new_cost_basis := v_curr_cost_basis + v_gross_amount + p_fees;
    IF v_new_qty > 0 THEN
      v_new_avg_cost := ROUND((v_new_cost_basis / v_new_qty), 2);
    ELSE
      v_new_avg_cost := 0;
    END IF;
    v_new_realized_pnl := v_curr_realized_pnl;

  ELSIF p_type = 'SELL' THEN
    v_realized_trade_pnl := v_gross_amount - (p_quantity * v_curr_avg_cost) - p_fees - p_taxes;
    v_new_qty := v_curr_qty - p_quantity;
    IF v_new_qty > 0 THEN
      v_new_avg_cost := v_curr_avg_cost;
      v_new_cost_basis := ROUND((v_new_qty * v_curr_avg_cost), 2);
    ELSE
      v_new_qty := 0;
      v_new_avg_cost := 0;
      v_new_cost_basis := 0;
    END IF;
    v_new_realized_pnl := v_curr_realized_pnl + v_realized_trade_pnl;

  ELSIF p_type IN ('DIVIDEND', 'INTEREST') THEN
    v_new_qty := v_curr_qty;
    v_new_cost_basis := v_curr_cost_basis;
    v_new_avg_cost := v_curr_avg_cost;
    v_new_realized_pnl := v_curr_realized_pnl + v_gross_amount - p_fees - p_taxes;

  ELSE
    v_new_qty := v_curr_qty;
    v_new_cost_basis := v_curr_cost_basis;
    v_new_avg_cost := v_curr_avg_cost;
    v_new_realized_pnl := v_curr_realized_pnl - p_fees - p_taxes;
  END IF;

  INSERT INTO public.positions (
    user_id, account_id, instrument_id, quantity, cost_basis, 
    average_cost, realized_pnl, updated_at
  ) VALUES (
    v_user_id, p_account_id, p_instrument_id, v_new_qty, v_new_cost_basis, 
    v_new_avg_cost, v_new_realized_pnl, now()
  ) ON CONFLICT (user_id, account_id, instrument_id) 
  DO UPDATE SET 
    quantity = EXCLUDED.quantity,
    cost_basis = EXCLUDED.cost_basis,
    average_cost = EXCLUDED.average_cost,
    realized_pnl = EXCLUDED.realized_pnl,
    updated_at = now();

  INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, metadata)
  VALUES (
    v_user_id,
    'TRANSACTION_CREATED',
    'transactions',
    v_txn_id::TEXT,
    jsonb_build_object(
      'type', p_type,
      'quantity', p_quantity,
      'price', p_price,
      'source', p_source,
      'new_qty', v_new_qty,
      'new_avg_cost', v_new_avg_cost
    )
  );

  RETURN jsonb_build_object(
    'status', 'COMMITTED',
    'transaction_id', v_txn_id,
    'position', jsonb_build_object(
      'quantity', v_new_qty,
      'cost_basis', v_new_cost_basis,
      'average_cost', v_new_avg_cost,
      'realized_pnl', v_new_realized_pnl
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_transaction(
  p_transaction_id UUID,
  p_reason TEXT DEFAULT 'Correction reversal'
) RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_orig RECORD;
  v_compensating_type TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_orig 
  FROM public.transactions 
  WHERE id = p_transaction_id AND user_id = v_user_id;

  IF v_orig IS NULL THEN
    RAISE EXCEPTION 'Transaction not found or access denied';
  END IF;

  IF v_orig.transaction_type = 'REVERSAL' THEN
    RAISE EXCEPTION 'Cannot reverse a reversal transaction';
  END IF;

  PERFORM id FROM public.transactions 
  WHERE reversal_of_id = p_transaction_id;

  IF FOUND THEN
    RAISE EXCEPTION 'Transaction has already been reversed';
  END IF;

  IF v_orig.transaction_type = 'BUY' THEN
    v_compensating_type := 'SELL';
  ELSIF v_orig.transaction_type = 'SELL' THEN
    v_compensating_type := 'BUY';
  ELSE
    v_compensating_type := 'OTHER';
  END IF;

  RETURN public.create_transaction(
    p_account_id := v_orig.account_id,
    p_instrument_id := v_orig.instrument_id,
    p_type := v_compensating_type,
    p_quantity := v_orig.quantity,
    p_price := v_orig.price,
    p_fees := 0,
    p_taxes := 0,
    p_transaction_date := now(),
    p_source := 'REVERSAL',
    p_external_id := NULL,
    p_migration_id := NULL,
    p_source_record_id := NULL,
    p_notes := 'Reversal of ' || p_transaction_id::TEXT || ': ' || COALESCE(p_reason, '')
  );
END;
$$;
