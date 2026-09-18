import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { MembershipTier, EntitlementFeature, hasEntitlement, TIER_CONFIGS, TierConfig } from './entitlements';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'koshq_membership_tier';

interface SubscriptionContextType {
  tier: MembershipTier;
  config: TierConfig;
  isPro: boolean;
  isProPlus: boolean;
  hasAccess: (feature: EntitlementFeature) => boolean;
  setTier: (newTier: MembershipTier) => void;
  // Upgrade modal controls
  isUpgradeModalOpen: boolean;
  upgradeModalFeature: string | null;
  openUpgradeModal: (featureName?: string) => void;
  closeUpgradeModal: () => void;
}

export const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [tier, setTierState] = useState<MembershipTier>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY) as MembershipTier;
      if (saved && (saved === 'free' || saved === 'pro' || saved === 'pro_plus')) {
        return saved;
      }
    }
    return 'free';
  });

  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeModalFeature, setUpgradeModalFeature] = useState<string | null>(null);

  // Sync with Supabase user metadata if present
  useEffect(() => {
    if (user?.user_metadata?.membership_tier) {
      const cloudTier = user.user_metadata.membership_tier as MembershipTier;
      if (cloudTier && ['free', 'pro', 'pro_plus'].includes(cloudTier)) {
        setTierState(cloudTier);
        localStorage.setItem(STORAGE_KEY, cloudTier);
      }
    }
  }, [user]);

  const setTier = useCallback((newTier: MembershipTier) => {
    setTierState(newTier);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newTier);
    }
  }, []);

  const hasAccess = useCallback((feature: EntitlementFeature) => {
    return hasEntitlement(tier, feature);
  }, [tier]);

  const openUpgradeModal = useCallback((featureName?: string) => {
    setUpgradeModalFeature(featureName || null);
    setIsUpgradeModalOpen(true);
  }, []);

  const closeUpgradeModal = useCallback(() => {
    setIsUpgradeModalOpen(false);
    setUpgradeModalFeature(null);
  }, []);

  const isPro = tier === 'pro' || tier === 'pro_plus';
  const isProPlus = tier === 'pro_plus';
  const config = TIER_CONFIGS[tier];

  return (
    <SubscriptionContext.Provider
      value={{
        tier,
        config,
        isPro,
        isProPlus,
        hasAccess,
        setTier,
        isUpgradeModalOpen,
        upgradeModalFeature,
        openUpgradeModal,
        closeUpgradeModal
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    // Fallback if rendered outside provider
    const fallbackTier: MembershipTier = 'free';
    return {
      tier: fallbackTier,
      config: TIER_CONFIGS[fallbackTier],
      isPro: false,
      isProPlus: false,
      hasAccess: (f: EntitlementFeature) => hasEntitlement(fallbackTier, f),
      setTier: () => {},
      isUpgradeModalOpen: false,
      upgradeModalFeature: null,
      openUpgradeModal: () => {},
      closeUpgradeModal: () => {}
    };
  }
  return context;
};
