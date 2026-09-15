-- KoshQ Financial Engine — Migration 003: Accounting Engine & Atomic RPCs
-- Provides atomic create_transaction(), reversal, invariant checks, and weighted-average position calculation

-- 1. ATOMIC TRANSACTION CREATION & POSITION RECALCULATION FUNCTION
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
  -- 1. Verify Authentication
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User authentication required';
  END IF;

  -- 2. Verify Account Ownership
  SELECT user_id INTO v_account_owner 
  FROM public.accounts 
  WHERE id = p_account_id;

  IF v_account_owner IS NULL OR v_account_owner <> v_user_id THEN
    RAISE EXCEPTION 'Forbidden: Account does not belong to the authenticated user';
  END IF;

  -- 3. Idempotency Verification
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

  -- 4. Financial Invariant Validation
  IF p_type IN ('BUY', 'SELL') AND p_quantity <= 0 THEN
    RAISE EXCEPTION 'Invalid quantity: % must be strictly positive for BUY/SELL', p_quantity;
  END IF;

  IF p_price < 0 OR p_fees < 0 OR p_taxes < 0 THEN
    RAISE EXCEPTION 'Financial invariant violated: price, fees, and taxes must be non-negative';
  END IF;

  -- 5. Lock and Retrieve Current Position
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

  -- 6. Long-Only Invariant: Prevent Overselling
  IF p_type = 'SELL' AND v_curr_qty < p_quantity THEN
    RAISE EXCEPTION 'Oversell rejected: Available position (%) is less than sell quantity (%)', 
      v_curr_qty, p_quantity;
  END IF;

  v_gross_amount := ROUND((p_quantity * p_price), 2);

  -- 7. Insert Immutable Transaction Row
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

  -- 8. Position Accounting Engine (Weighted-Average Cost Basis)
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
    -- Generic types (FEE, TAX, OTHER)
    v_new_qty := v_curr_qty;
    v_new_cost_basis := v_curr_cost_basis;
    v_new_avg_cost := v_curr_avg_cost;
    v_new_realized_pnl := v_curr_realized_pnl - p_fees - p_taxes;
  END IF;

  -- 9. Upsert Derived Position Row
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

  -- 10. Audit Log Entry
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

-- 2. REVERSAL TRANSACTION FUNCTION
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
  v_reversal_id UUID;
  v_compensating_type TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 1. Fetch Original Transaction
  SELECT * INTO v_orig 
  FROM public.transactions 
  WHERE id = p_transaction_id AND user_id = v_user_id;

  IF v_orig IS NULL THEN
    RAISE EXCEPTION 'Transaction not found or access denied';
  END IF;

  IF v_orig.transaction_type = 'REVERSAL' THEN
    RAISE EXCEPTION 'Cannot reverse a reversal transaction';
  END IF;

  -- 2. Check if already reversed
  PERFORM id FROM public.transactions 
  WHERE reversal_of_id = p_transaction_id;

  IF FOUND THEN
    RAISE EXCEPTION 'Transaction has already been reversed';
  END IF;

  -- 3. Determine Compensating Transaction
  IF v_orig.transaction_type = 'BUY' THEN
    v_compensating_type := 'SELL';
  ELSIF v_orig.transaction_type = 'SELL' THEN
    v_compensating_type := 'BUY';
  ELSE
    v_compensating_type := 'OTHER';
  END IF;

  -- 4. Create Reversal Transaction & Recalculate Position
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

-- 3. AUTOMATIC PORTFOLIO SNAPSHOT GENERATOR
CREATE OR REPLACE FUNCTION public.record_portfolio_snapshot(
  p_account_id UUID DEFAULT NULL
) RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_cost_basis NUMERIC(18, 2) := 0;
  v_realized_pnl NUMERIC(18, 2) := 0;
  v_snapshot_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT 
    COALESCE(SUM(cost_basis), 0),
    COALESCE(SUM(realized_pnl), 0)
  INTO v_cost_basis, v_realized_pnl
  FROM public.positions
  WHERE user_id = v_user_id 
    AND (p_account_id IS NULL OR account_id = p_account_id);

  INSERT INTO public.portfolio_snapshots (
    user_id, account_id, snapshot_date, market_value, 
    cost_basis, realized_pnl, unrealized_pnl, cash_value
  ) VALUES (
    v_user_id, p_account_id, CURRENT_DATE, v_cost_basis,
    v_cost_basis, v_realized_pnl, 0, 0
  ) ON CONFLICT (user_id, account_id, snapshot_date)
  DO UPDATE SET
    cost_basis = EXCLUDED.cost_basis,
    realized_pnl = EXCLUDED.realized_pnl
  RETURNING id INTO v_snapshot_id;

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'snapshot_id', v_snapshot_id,
    'cost_basis', v_cost_basis,
    'realized_pnl', v_realized_pnl
  );
END;
$$;
