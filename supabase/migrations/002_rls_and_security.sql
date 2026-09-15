-- KoshQ Financial Engine — Migration 002: Security & Row-Level Security (RLS) Policies
-- Enforces database-level tenant isolation, append-only ledger restrictions, and user profile auto-provisioning

-- 1. ENABLE ROW LEVEL SECURITY ON ALL USER-OWNED TABLES
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

-- 2. INSTRUMENTS POLICIES (Global Canonical Catalog)
-- Anyone authenticated (or anon client) can view instruments
CREATE POLICY "instruments_read_all" 
ON public.instruments FOR SELECT 
USING (true);

-- Authenticated users can insert new instruments if not present (on-demand catalog)
CREATE POLICY "instruments_insert_authenticated" 
ON public.instruments FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 3. PROFILES POLICIES
CREATE POLICY "profiles_select_own" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_insert_own" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 4. USER PREFERENCES POLICIES
CREATE POLICY "user_preferences_select_own" 
ON public.user_preferences FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "user_preferences_insert_own" 
ON public.user_preferences FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_preferences_update_own" 
ON public.user_preferences FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 5. ACCOUNTS POLICIES
CREATE POLICY "accounts_select_own" 
ON public.accounts FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "accounts_insert_own" 
ON public.accounts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "accounts_update_own" 
ON public.accounts FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "accounts_delete_own" 
ON public.accounts FOR DELETE 
USING (auth.uid() = user_id);

-- 6. TRANSACTIONS POLICIES (Append-Only Ledger)
CREATE POLICY "transactions_select_own" 
ON public.transactions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "transactions_insert_own" 
ON public.transactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Explicitly DISALLOW normal update/delete to preserve immutable audit trail
-- Corrections must be executed through reversal transactions
CREATE POLICY "transactions_deny_update" 
ON public.transactions FOR UPDATE 
USING (false);

CREATE POLICY "transactions_deny_delete" 
ON public.transactions FOR DELETE 
USING (false);

-- 7. POSITIONS POLICIES (Derived State)
CREATE POLICY "positions_select_own" 
ON public.positions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "positions_insert_own" 
ON public.positions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "positions_update_own" 
ON public.positions FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "positions_delete_own" 
ON public.positions FOR DELETE 
USING (auth.uid() = user_id);

-- 8. PORTFOLIO SNAPSHOTS POLICIES
CREATE POLICY "snapshots_select_own" 
ON public.portfolio_snapshots FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "snapshots_insert_own" 
ON public.portfolio_snapshots FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "snapshots_update_own" 
ON public.portfolio_snapshots FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 9. AUDIT LOG POLICIES (Append-Only)
CREATE POLICY "audit_log_select_own" 
ON public.audit_log FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "audit_log_insert_own" 
ON public.audit_log FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Audit entries can never be altered or deleted by users
CREATE POLICY "audit_log_deny_update" 
ON public.audit_log FOR UPDATE 
USING (false);

CREATE POLICY "audit_log_deny_delete" 
ON public.audit_log FOR DELETE 
USING (false);

-- 10. AI USAGE DAILY POLICIES
CREATE POLICY "ai_usage_select_own" 
ON public.ai_usage_daily FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "ai_usage_insert_own" 
ON public.ai_usage_daily FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_usage_update_own" 
ON public.ai_usage_daily FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 11. GOALS POLICIES
CREATE POLICY "goals_select_own" 
ON public.goals FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "goals_insert_own" 
ON public.goals FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "goals_update_own" 
ON public.goals FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "goals_delete_own" 
ON public.goals FOR DELETE 
USING (auth.uid() = user_id);

-- 12. INVESTMENT JOURNAL POLICIES
CREATE POLICY "journal_select_own" 
ON public.investment_journal FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "journal_insert_own" 
ON public.investment_journal FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "journal_update_own" 
ON public.investment_journal FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "journal_delete_own" 
ON public.investment_journal FOR DELETE 
USING (auth.uid() = user_id);

-- 13. CAS DOCUMENTS POLICIES
CREATE POLICY "cas_docs_select_own" 
ON public.cas_documents FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "cas_docs_insert_own" 
ON public.cas_documents FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cas_docs_update_own" 
ON public.cas_documents FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cas_docs_delete_own" 
ON public.cas_documents FOR DELETE 
USING (auth.uid() = user_id);

-- 14. AUTH HOOK TRIGGER: AUTOMATIC USER INITIALIZATION
-- Automatically provisions profile, default account, and preferences when user registers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- 1. Create Profile
  INSERT INTO public.profiles (id, email, full_name, base_currency, tier)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'INR',
    'free'
  ) ON CONFLICT (id) DO NOTHING;

  -- 2. Create Default Primary Demat Account
  INSERT INTO public.accounts (user_id, name, broker, account_type, base_currency)
  VALUES (
    NEW.id,
    'Primary Vault',
    'Manual',
    'demat',
    'INR'
  );

  -- 3. Create Default User Preferences
  INSERT INTO public.user_preferences (user_id, theme, mode, density)
  VALUES (
    NEW.id,
    'slate',
    'light',
    'compact'
  ) ON CONFLICT (user_id) DO NOTHING;

  -- 4. Log User Registration to Audit Log
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

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 15. STORAGE BUCKET POLICIES FOR PRIVATE CAS VAULT
-- Note: Requires bucket 'cas-vault' created in Supabase Storage with public = false
INSERT INTO storage.buckets (id, name, public) 
VALUES ('cas-vault', 'cas-vault', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Policy: Users can only upload into their own folder (auth.uid())
CREATE POLICY "cas_storage_insert_own" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'cas-vault' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can only read documents from their own folder
CREATE POLICY "cas_storage_select_own" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'cas-vault' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can only delete their own documents
CREATE POLICY "cas_storage_delete_own" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'cas-vault' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);
