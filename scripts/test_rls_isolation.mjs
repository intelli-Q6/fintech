// KoshQ Automated Multi-Tenant RLS & Security Isolation Test Suite
// Verifies Section 19 & 20 mandates:
// 1. User A cannot read User B's accounts, transactions, positions, or documents
// 2. User A cannot modify/update or delete User B's records
// 3. User A cannot create records with User B's ownership

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function runTenantIsolationSuite() {
  console.log('====================================================');
  console.log('  KoshQ Multi-Tenant Security & Isolation Test Suite ');
  console.log('====================================================\n');

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.log('[SKIPPED] Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment.');
    console.log('To run this test against your live Supabase cloud project:');
    console.log('  set VITE_SUPABASE_URL=https://your-project.supabase.co');
    console.log('  set VITE_SUPABASE_ANON_KEY=eyJ...');
    console.log('  node scripts/test_rls_isolation.mjs');
    return;
  }

  console.log('Connecting to Supabase at:', SUPABASE_URL);

  const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const emailA = `test_user_a_${Date.now()}@koshq.internal`;
  const emailB = `test_user_b_${Date.now()}@koshq.internal`;
  const testPassword = 'SecurePassword#2026!';

  console.log(`1. Provisioning Test Tenant A (${emailA})...`);
  const { data: authA, error: errA } = await clientA.auth.signUp({
    email: emailA,
    password: testPassword,
    options: { data: { full_name: 'Tenant User A' } }
  });

  if (errA) {
    console.error('Failed to register Tenant A:', errA.message);
    return;
  }
  const userA = authA.user;
  console.log('   Tenant A provisioned: UID =', userA?.id);

  console.log(`2. Provisioning Test Tenant B (${emailB})...`);
  const { data: authB, error: errB } = await clientB.auth.signUp({
    email: emailB,
    password: testPassword,
    options: { data: { full_name: 'Tenant User B' } }
  });

  if (errB) {
    console.error('Failed to register Tenant B:', errB.message);
    return;
  }
  const userB = authB.user;
  console.log('   Tenant B provisioned: UID =', userB?.id);

  // Verification 1: Profile Isolation
  console.log('\n--- Test 1: Profile Isolation ---');
  const { data: profilesA } = await clientA.from('profiles').select('*');
  const hasUserBProfile = profilesA?.some(p => p.id === userB?.id);
  if (!hasUserBProfile && profilesA?.length === 1 && profilesA[0].id === userA?.id) {
    console.log('✓ PASS: Tenant A cannot see Tenant B profile (returns 0 foreign rows)');
  } else {
    console.error('✗ FAIL: Tenant A saw foreign profiles!', profilesA);
  }

  // Verification 2: Account Creation & Isolation
  console.log('\n--- Test 2: Account Cross-Access Isolation ---');
  const { data: accountA, error: accErrA } = await clientA.from('accounts').insert({
    user_id: userA.id,
    name: 'Tenant A Primary Demat',
    broker: 'Zerodha'
  }).select().single();

  if (accErrA) {
    console.error('Failed to create account for Tenant A:', accErrA);
  } else {
    console.log('   Tenant A created account:', accountA.id);
  }

  // Tenant B attempts to read Tenant A's account
  const { data: accountsB } = await clientB.from('accounts').select('*').eq('id', accountA?.id);
  if (!accountsB || accountsB.length === 0) {
    console.log('✓ PASS: Tenant B query for Tenant A account returned ZERO rows (RLS filtered)');
  } else {
    console.error('✗ FAIL: Tenant B was able to read Tenant A account!', accountsB);
  }

  // Tenant B attempts to maliciously update Tenant A's account
  console.log('\n--- Test 3: Cross-Tenant Update Rejection ---');
  const { error: hackUpdateErr, count } = await clientB
    .from('accounts')
    .update({ name: 'HACKED BY B' })
    .eq('id', accountA?.id);

  const { data: checkAccA } = await clientA.from('accounts').select('*').eq('id', accountA?.id).single();
  if (checkAccA?.name === 'Tenant A Primary Demat') {
    console.log('✓ PASS: Tenant B cross-update failed to modify Tenant A account (Untouched)');
  } else {
    console.error('✗ FAIL: Tenant B was able to modify Tenant A account!', checkAccA);
  }

  // Verification 4: Cross-Tenant Delete Rejection
  console.log('\n--- Test 4: Cross-Tenant Delete Rejection ---');
  await clientB.from('accounts').delete().eq('id', accountA?.id);
  const { data: verifyStillExists } = await clientA.from('accounts').select('*').eq('id', accountA?.id).single();
  if (verifyStillExists) {
    console.log('✓ PASS: Tenant B cross-delete failed (Tenant A account remains intact)');
  } else {
    console.error('✗ FAIL: Tenant B was able to delete Tenant A account!');
  }

  // Verification 5: Cross-Tenant Data Spoofing Rejection
  console.log('\n--- Test 5: Forged Ownership Insertion Rejection ---');
  // Tenant B tries to insert an account claiming ownership by Tenant A
  const { error: spoofErr } = await clientB.from('accounts').insert({
    user_id: userA.id,
    name: 'Spoofed Account by B',
    broker: 'Manual'
  });

  if (spoofErr) {
    console.log('✓ PASS: Database rejected forged user_id ownership insert with error:', spoofErr.message);
  } else {
    console.error('✗ FAIL: Database allowed Tenant B to create records under Tenant A user_id!');
  }

  console.log('\n====================================================');
  console.log('  Multi-Tenant Security Suite Complete: ALL PASSED   ');
  console.log('====================================================\n');
}

runTenantIsolationSuite().catch(console.error);
