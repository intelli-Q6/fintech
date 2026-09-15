// KoshQ Idempotent Local-to-Cloud Migration Service
// Safely transfers client-side guest localStorage data to cloud PostgreSQL ledger (Section 8 & 26 mandate)

import { VaultStorage } from '../../data/storage';
import { TransactionService } from './transactionService';
import { getSupabase } from '../supabase/supabaseClient';

export interface MigrationReport {
  success: boolean;
  totalItems: number;
  migratedCount: number;
  alreadyExistedCount: number;
  failedCount: number;
  errors: string[];
}

export class MigrationService {
  /**
   * Idempotently migrates all local holdings and goals into the authenticated cloud account
   */
  static async migrateLocalVaultToCloud(migrationId = 'v1_initial_import'): Promise<MigrationReport> {
    const supabase = getSupabase();
    const report: MigrationReport = {
      success: false,
      totalItems: 0,
      migratedCount: 0,
      alreadyExistedCount: 0,
      failedCount: 0,
      errors: []
    };

    if (!supabase) {
      report.errors.push('Supabase is not configured or user is not authenticated.');
      return report;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      report.errors.push('No active cloud session found.');
      return report;
    }

    // 1. Fetch user's primary account
    const accounts = await TransactionService.getUserAccounts();
    const primaryAccount = accounts[0];
    if (!primaryAccount) {
      report.errors.push('No cloud depository account found for user.');
      return report;
    }

    // 2. Fetch local holdings from browser localStorage
    const localHoldings = VaultStorage.getHoldings();
    report.totalItems = localHoldings.length;

    if (localHoldings.length === 0) {
      report.success = true;
      return report;
    }

    console.log(`[MigrationService] Beginning idempotent migration of ${localHoldings.length} local items to account ${primaryAccount.id}...`);

    for (const h of localHoldings) {
      try {
        // Step A: Ensure canonical instrument exists in instruments table
        const instrumentId = await TransactionService.getOrCreateInstrument({
          symbol: h.symbol,
          name: h.name,
          isin: h.isin,
          assetClass: h.assetClass,
          sector: h.sector
        });

        if (!instrumentId) {
          report.failedCount++;
          report.errors.push(`Failed to register instrument ${h.symbol}`);
          continue;
        }

        // Step B: Atomically create transaction with unique migration keys
        const res = await TransactionService.createTransaction({
          accountId: primaryAccount.id,
          instrumentId: instrumentId,
          type: 'BUY',
          quantity: h.quantity,
          price: h.averageBuyPrice,
          fees: 0,
          taxes: 0,
          transactionDate: new Date().toISOString(),
          source: 'MIGRATION',
          migrationId: migrationId,
          sourceRecordId: h.id,
          notes: `Migrated from local vault (${h.name})`
        });

        if (res.success) {
          if (res.data?.status === 'EXISTING') {
            report.alreadyExistedCount++;
          } else {
            report.migratedCount++;
          }
        } else {
          report.failedCount++;
          report.errors.push(`Failed to migrate ${h.symbol}: ${res.error}`);
        }
      } catch (err: any) {
        report.failedCount++;
        report.errors.push(`Exception migrating ${h.symbol}: ${err?.message}`);
      }
    }

    // Step C: Also sync financial goals and journal entries if present
    try {
      const localGoals = VaultStorage.getGoals();
      if (localGoals.length > 0) {
        for (const g of localGoals) {
          await supabase.from('goals').upsert({
            id: g.id,
            user_id: userData.user.id,
            title: g.title,
            category: g.category,
            target_amount: g.targetAmount,
            current_saved: g.currentSaved,
            target_year: g.targetYear,
            monthly_required_sip: g.monthlyRequiredSIP
          }, { onConflict: 'id' });
        }
      }

      const localJournal = VaultStorage.getJournal();
      if (localJournal.length > 0) {
        for (const j of localJournal) {
          await supabase.from('investment_journal').upsert({
            id: j.id,
            user_id: userData.user.id,
            asset_symbol: j.assetSymbol,
            asset_name: j.assetName,
            title: j.title,
            thesis: j.thesis,
            expected_horizon: j.expectedHorizon,
            post_mortem_review: j.postMortemReview,
            tags: j.tags
          }, { onConflict: 'id' });
        }
      }
    } catch (metaErr) {
      console.warn('Non-fatal error migrating goals/journal:', metaErr);
    }

    // Mark audit log
    await supabase.from('audit_log').insert({
      user_id: userData.user.id,
      action: 'DATA_MIGRATED',
      entity_type: 'vault',
      entity_id: migrationId,
      metadata: {
        total: report.totalItems,
        migrated: report.migratedCount,
        existed: report.alreadyExistedCount,
        failed: report.failedCount
      }
    });

    report.success = report.failedCount === 0;
    return report;
  }
}
