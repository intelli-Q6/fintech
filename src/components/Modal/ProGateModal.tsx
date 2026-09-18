import React, { useState } from 'react';
import { useSubscription } from '../../core/auth/useSubscription';
import { TIER_CONFIGS } from '../../core/auth/entitlements';
import {
  Sparkles,
  Check,
  X,
  ShieldCheck,
  Zap,
  Layers,
  FileText,
  Activity,
  ArrowRight,
  Lock
} from 'lucide-react';

export const ProGateModal: React.FC = () => {
  const {
    tier,
    setTier,
    isUpgradeModalOpen,
    upgradeModalFeature,
    closeUpgradeModal
  } = useSubscription();

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const proConfig = TIER_CONFIGS.pro;

  if (!isUpgradeModalOpen) return null;

  const handleSimulateUpgrade = () => {
    setTier('pro');
    closeUpgradeModal();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '16px'
      }}
      onClick={e => {
        if (e.target === e.currentTarget) closeUpgradeModal();
      }}
    >
      <div
        className="animate-fade-in"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--accent-border, rgba(124, 58, 237, 0.4))',
          borderRadius: 16,
          width: '100%',
          maxWidth: 540,
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
      >
        {/* Top Header Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.18) 0%, rgba(245, 158, 11, 0.12) 100%)',
            padding: '24px 24px 18px',
            borderBottom: '1px solid var(--border-subtle)',
            position: 'relative'
          }}
        >
          <button
            onClick={closeUpgradeModal}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Close"
          >
            <X size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 800,
                letterSpacing: '0.08em',
                padding: '3px 8px',
                borderRadius: 4,
                background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <Sparkles size={11} /> KOSHQ PRO
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Institutional Portfolio Intelligence
            </span>
          </div>

          <h2
            style={{
              fontSize: '20px',
              fontWeight: 800,
              color: 'var(--text-primary)',
              margin: '4px 0 6px',
              letterSpacing: '-0.02em'
            }}
          >
            {upgradeModalFeature ? `Unlock ${upgradeModalFeature}` : 'Understand Your Portfolio Deeply'}
          </h2>

          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
            Upgrade to KoshQ Pro for comprehensive audit reports, advanced risk math, mutual fund look-through overlap, and downloadable PDF reports.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {[
              { icon: <FileText size={14} />, text: 'Full 20-Section Portfolio Report & PDF Export' },
              { icon: <Activity size={14} />, text: 'Advanced Risk (Sharpe, Beta, Volatility, Sortino)' },
              { icon: <Layers size={14} />, text: 'Mutual Fund Look-Through Overlap Analysis' },
              { icon: <ShieldCheck size={14} />, text: 'Concentration Treemaps & Sector Exposure' },
              { icon: <Zap size={14} />, text: 'Unlimited KoshQ AI Copilot Portfolio Audits' },
              { icon: <Lock size={14} />, text: 'Historical GFC 2008 & 2022 Crisis Simulations' }
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.35
                }}
              >
                <span style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          {/* Billing Cycle Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: 'var(--bg-subtle)',
              padding: '4px',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              marginTop: 4
            }}
          >
            <button
              onClick={() => setBillingCycle('annual')}
              style={{
                flex: 1,
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                background: billingCycle === 'annual' ? 'var(--bg-surface)' : 'transparent',
                color: billingCycle === 'annual' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: billingCycle === 'annual' ? 700 : 500,
                fontSize: '11px',
                cursor: 'pointer',
                boxShadow: billingCycle === 'annual' ? 'var(--shadow-sm)' : 'none'
              }}
            >
              Annual Billing (Save 30%)
            </button>
            <button
              onClick={() => setBillingCycle('monthly')}
              style={{
                flex: 1,
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                background: billingCycle === 'monthly' ? 'var(--bg-surface)' : 'transparent',
                color: billingCycle === 'monthly' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: billingCycle === 'monthly' ? 700 : 500,
                fontSize: '11px',
                cursor: 'pointer',
                boxShadow: billingCycle === 'monthly' ? 'var(--shadow-sm)' : 'none'
              }}
            >
              Monthly Billing
            </button>
          </div>

          {/* Pricing Display */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: 'var(--bg-card)',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)'
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {billingCycle === 'annual' ? 'Billed annually at ₹2,499/yr' : 'Billed monthly'}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                  ₹{billingCycle === 'annual' ? '208' : '299'}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/ month</span>
              </div>
            </div>

            <button
              onClick={handleSimulateUpgrade}
              className="btn btn-primary"
              style={{
                padding: '9px 18px',
                fontSize: '12px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
                border: 'none',
                color: '#ffffff',
                boxShadow: '0 2px 10px rgba(245, 158, 11, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span>{tier === 'pro' ? 'Active Pro Member' : 'Simulate Pro Upgrade (Demo)'}</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div
            style={{
              fontSize: '10px',
              color: 'var(--text-muted)',
              textAlign: 'center',
              lineHeight: 1.4
            }}
          >
            🔒 Non-Intermediary Software Model. Pure analytical computation. Zero stock tips, zero distribution kickbacks.
          </div>
        </div>
      </div>
    </div>
  );
};
