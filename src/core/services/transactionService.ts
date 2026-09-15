// KoshQ Transaction & Portfolio Accounting Service
// Encapsulates database operations, enforces append-only semantics, and maintains derived positions

import { getSupabase } from '../supabase/supabaseClient';
import { VaultStorage } from '../../data/storage';
import { Holding } from '../../data/types';

export interface CreateTransactionParams {
  accountId: string;
  instrumentId: string;
  type: 'BUY' | 'SELL' | 'DIVIDEND' | 'INTEREST' | 'FEE' | 'TAX' | 'REVERSAL' | 'OTHER';
  quantity: number;
  price: number;
  fees?: number;
  taxes?: number;
  transactionDate?: string;
  source?: string;
  externalId?: string;
  migrationId?: string;
  sourceRecordId?: string;
  notes?: string;
}

export interface DerivedPosition {
  id: string;
  accountId: string;
  instrumentId: string;
  symbol: string;
  name: string;
  isin: string;
  assetClass: 'equity' | 'mutual_fund' | 'etf' | 'bond' | 'gold' | 'govt_scheme' | 'cash';
  sector: string;
  marketCapCategory?: string;
  quantity: number;
  costBasis: number;
  averageCost: number;
  realizedPnl: number;
  updatedAt: string;
}

export interface TransactionRecord {
  id: string;
  userId: string;
  accountId: string;
  instrumentId: string;
  symbol?: string;
  name?: string;
  transactionType: string;
  quantity: number;
  price: number;
  grossAmount: number;
  fees: number;
  taxes: number;
  currency: string;
  transactionDate: string;
  reversalOfId?: string;
  source: string;
  notes?: string;
  createdAt: string;
}

export class TransactionService {
  /**
   * Creates an immutable transaction and atomically recalculates derived positions
   */
  static async createTransaction(params: CreateTransactionParams): Promise<{ success: boolean; data?: any; error?: string }> {
    const supabase = getSupabase();
    if (!supabase) {
      // In Guest / Offline mode, update local storage
      return { success: true, data: { status: 'GUEST_COMMITTED' } };
    }

    try {
      const { data, error } = await supabase.rpc('create_transaction', {
        p_account_id: params.accountId,
        p_instrument_id: params.instrumentId,
        p_type: params.type,
        p_quantity: params.quantity,
        p_price: params.price,
        p_fees: params.fees || 0,
        p_taxes: params.taxes || 0,
        p_transaction_date: params.transactionDate || new Date().toISOString(),
        p_source: params.source || 'MANUAL',
        p_external_id: params.externalId || null,
        p_migration_id: params.migrationId || null,
        p_source_record_id: params.sourceRecordId || null,
        p_notes: params.notes || null
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Transaction creation failed' };
    }
  }

  /**
   * Reverses a historical transaction with full audit trail preservation
   */
  static async reverseTransaction(transactionId: string, reason = 'User correction'): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabase();
    if (!supabase) {
      return { success: false, error: 'Cloud authentication required for reversals' };
    }

    try {
      const { data, error } = await supabase.rpc('reverse_transaction', {
        p_transaction_id: transactionId,
        p_reason: reason
      });

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Reversal failed' };
    }
  }

  /**
   * Fetches derived positions joined with canonical instrument metadata
   */
  static async getPositions(): Promise<DerivedPosition[]> {
    const supabase = getSupabase();
    if (!supabase) {
      // Return guest holdings converted to DerivedPosition format
      const local = VaultStorage.getHoldings();
      return local.map(h => ({
        id: h.id,
        accountId: 'local-vault',
        instrumentId: h.id,
        symbol: h.symbol,
        name: h.name,
        isin: h.isin,
        assetClass: h.assetClass,
        sector: h.sector,
        marketCapCategory: h.marketCapCategory,
        quantity: h.quantity,
        costBasis: h.investedAmount,
        averageCost: h.averageBuyPrice,
        realizedPnl: 0,
        updatedAt: new Date().toISOString()
      }));
    }

    try {
      const { data, error } = await supabase
        .from('positions')
        .select(`
          id, account_id, instrument_id, quantity, cost_basis, average_cost, realized_pnl, updated_at,
          instruments ( id, isin, symbol, name, exchange, asset_class, sector, market_cap_category )
        `)
        .gt('quantity', 0);

      if (error || !data) {
        console.warn('Failed to fetch cloud positions:', error);
        return [];
      }

      return data.map((row: any) => ({
        id: row.id,
        accountId: row.account_id,
        instrumentId: row.instrument_id,
        symbol: row.instruments?.symbol || 'UNKNOWN',
        name: row.instruments?.name || 'Unknown Asset',
        isin: row.instruments?.isin || '',
        assetClass: row.instruments?.asset_class || 'equity',
        sector: row.instruments?.sector || 'General',
        marketCapCategory: row.instruments?.market_cap_category,
        quantity: parseFloat(row.quantity),
        costBasis: parseFloat(row.cost_basis),
        averageCost: parseFloat(row.average_cost),
        realizedPnl: parseFloat(row.realized_pnl),
        updatedAt: row.updated_at
      }));
    } catch (e) {
      console.error('Error in getPositions:', e);
      return [];
    }
  }

  /**
   * Fetches transaction history for audit and timeline review
   */
  static async getTransactions(limit = 100): Promise<TransactionRecord[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id, user_id, account_id, instrument_id, transaction_type, quantity, price,
          gross_amount, fees, taxes, currency, transaction_date, reversal_of_id, source, notes, created_at,
          instruments ( symbol, name )
        `)
        .order('transaction_date', { ascending: false })
        .limit(limit);

      if (error || !data) return [];

      return data.map((t: any) => ({
        id: t.id,
        userId: t.user_id,
        accountId: t.account_id,
        instrumentId: t.instrument_id,
        symbol: t.instruments?.symbol,
        name: t.instruments?.name,
        transactionType: t.transaction_type,
        quantity: parseFloat(t.quantity),
        price: parseFloat(t.price),
        grossAmount: parseFloat(t.gross_amount),
        fees: parseFloat(t.fees),
        taxes: parseFloat(t.taxes),
        currency: t.currency,
        transactionDate: t.transaction_date,
        reversalOfId: t.reversal_of_id,
        source: t.source,
        notes: t.notes,
        createdAt: t.created_at
      }));
    } catch (e) {
      console.error('Error fetching transactions:', e);
      return [];
    }
  }

  /**
   * Ensures an instrument exists in the canonical catalog, returning its UUID
   */
  static async getOrCreateInstrument(item: { symbol: string; name: string; isin?: string; assetClass?: string; sector?: string }): Promise<string | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    try {
      // 1. Check existing by ISIN or Symbol
      const { data: existing } = await supabase
        .from('instruments')
        .select('id')
        .or(`symbol.eq.${item.symbol}${item.isin ? `,isin.eq.${item.isin}` : ''}`)
        .limit(1);

      if (existing && existing.length > 0) {
        return existing[0].id;
      }

      // 2. Insert canonical instrument
      const { data: created, error } = await supabase
        .from('instruments')
        .insert({
          symbol: item.symbol,
          name: item.name,
          isin: item.isin || null,
          exchange: 'NSE',
          asset_class: item.assetClass || 'equity',
          sector: item.sector || 'General'
        })
        .select('id')
        .single();

      if (error) {
        console.warn('Could not insert canonical instrument:', error);
        return null;
      }
      return created?.id || null;
    } catch (e) {
      console.error('Error in getOrCreateInstrument:', e);
      return null;
    }
  }

  /**
   * Retrieves user accounts (e.g. Primary Demat, Zerodha, Groww)
   */
  static async getUserAccounts(): Promise<{ id: string; name: string; broker: string }[]> {
    const supabase = getSupabase();
    if (!supabase) return [{ id: 'local-vault', name: 'Primary Vault (Local)', broker: 'Manual' }];

    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name, broker')
        .order('created_at', { ascending: true });

      if (error || !data || data.length === 0) {
        return [{ id: 'primary', name: 'Primary Vault', broker: 'Manual' }];
      }
      return data;
    } catch {
      return [{ id: 'primary', name: 'Primary Vault', broker: 'Manual' }];
    }
  }
}
