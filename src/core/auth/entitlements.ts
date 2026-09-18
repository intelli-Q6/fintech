// KoshQ Centralized Entitlement & Membership Tier Architecture
// Single source of truth for feature gating, quotas, and permission matrices

export type MembershipTier = 'free' | 'pro' | 'pro_plus';

export type EntitlementFeature =
  // --- FREE TIER FEATURES ---
  | 'portfolio_overview'
  | 'basic_returns'
  | 'basic_xirr'
  | 'basic_allocation'
  | 'basic_asset_split'
  | 'holdings'
  | 'top_positions'
  | 'basic_mmi'
  | 'basic_benchmark'
  | 'basic_portfolio_structure'
  | 'basic_calculators'
  | 'basic_screener'
  | 'basic_capital_gains'
  | 'ai_daily_limit'
  | 'one_sample_stress_test'

  // --- PRO TIER FEATURES ---
  | 'comprehensive_portfolio_report'
  | 'advanced_risk'
  | 'concentration_analysis'
  | 'sector_analysis'
  | 'market_cap_analysis'
  | 'geographic_analysis'
  | 'fund_overlap'
  | 'performance_attribution'
  | 'historical_portfolio_analysis'
  | 'advanced_benchmark'
  | 'advanced_mmi'
  | 'advanced_stress_lab'
  | 'custom_scenarios'
  | 'advanced_ai'
  | 'advanced_tax_analytics'
  | 'itr_capital_gains_report'
  | 'advanced_screener'
  | 'csv_export'
  | 'cas_import'
  | 'unlimited_holdings'
  | 'portfolio_pdf_export'

  // --- PRO+ TIER FEATURES ---
  | 'multi_pan_family'
  | 'family_portfolios'
  | 'spouse_portfolio'
  | 'parent_portfolio'
  | 'huf_portfolio'
  | 'advanced_document_intelligence'
  | 'annual_report_intelligence'
  | 'priority_cloud_features';

export interface TierConfig {
  id: MembershipTier;
  name: string;
  badgeLabel: string;
  tagline: string;
  monthlyPriceINR: number;
  annualPriceINR: number;
  aiQueriesPerDay: number; // -1 for unlimited
  maxHoldings: number;     // -1 for unlimited
}

export const TIER_CONFIGS: Record<MembershipTier, TierConfig> = {
  free: {
    id: 'free',
    name: 'Community',
    badgeLabel: 'FREE',
    tagline: 'Track your portfolio.',
    monthlyPriceINR: 0,
    annualPriceINR: 0,
    aiQueriesPerDay: 3,
    maxHoldings: 15
  },
  pro: {
    id: 'pro',
    name: 'KoshQ Pro',
    badgeLabel: 'PRO',
    tagline: 'Understand your portfolio deeply.',
    monthlyPriceINR: 299,
    annualPriceINR: 2499,
    aiQueriesPerDay: -1, // Unlimited
    maxHoldings: -1      // Unlimited
  },
  pro_plus: {
    id: 'pro_plus',
    name: 'KoshQ Pro+',
    badgeLabel: 'PRO+',
    tagline: "Analyze your family's wealth.",
    monthlyPriceINR: 599,
    annualPriceINR: 4999,
    aiQueriesPerDay: -1, // Unlimited
    maxHoldings: -1      // Unlimited
  }
};

const FREE_FEATURES = new Set<EntitlementFeature>([
  'portfolio_overview',
  'basic_returns',
  'basic_xirr',
  'basic_allocation',
  'basic_asset_split',
  'holdings',
  'top_positions',
  'basic_mmi',
  'basic_benchmark',
  'basic_portfolio_structure',
  'basic_calculators',
  'basic_screener',
  'basic_capital_gains',
  'ai_daily_limit',
  'one_sample_stress_test'
]);

const PRO_FEATURES = new Set<EntitlementFeature>([
  ...FREE_FEATURES,
  'comprehensive_portfolio_report',
  'advanced_risk',
  'concentration_analysis',
  'sector_analysis',
  'market_cap_analysis',
  'geographic_analysis',
  'fund_overlap',
  'performance_attribution',
  'historical_portfolio_analysis',
  'advanced_benchmark',
  'advanced_mmi',
  'advanced_stress_lab',
  'custom_scenarios',
  'advanced_ai',
  'advanced_tax_analytics',
  'itr_capital_gains_report',
  'advanced_screener',
  'csv_export',
  'cas_import',
  'unlimited_holdings',
  'portfolio_pdf_export'
]);

const PRO_PLUS_FEATURES = new Set<EntitlementFeature>([
  ...PRO_FEATURES,
  'multi_pan_family',
  'family_portfolios',
  'spouse_portfolio',
  'parent_portfolio',
  'huf_portfolio',
  'advanced_document_intelligence',
  'annual_report_intelligence',
  'priority_cloud_features'
]);

/**
 * Centralized entitlement verification.
 * Checks whether a given tier has access to a specific feature.
 */
export function hasEntitlement(tier: MembershipTier, feature: EntitlementFeature): boolean {
  switch (tier) {
    case 'pro_plus':
      return PRO_PLUS_FEATURES.has(feature);
    case 'pro':
      return PRO_FEATURES.has(feature);
    case 'free':
    default:
      return FREE_FEATURES.has(feature);
  }
}
