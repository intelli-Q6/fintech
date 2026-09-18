import React, { useRef, useState } from 'react';
import { VaultStorage } from '../../data/storage';
import { useSubscription } from '../../core/auth/useSubscription';
import { Download, Upload, Trash2, CheckCircle, ShieldCheck, Sparkles, Check, Key, Lock, ExternalLink } from 'lucide-react';

interface SettingsViewProps {
  currentTheme?: string;
  currentMode?: string;
  onThemeChange?: (theme: string) => void;
  onModeChange?: (mode: string) => void;
  onDataReset: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onDataReset
}) => {
  const { tier, setTier } = useSubscription();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [aiKey, setAiKey] = useState(() => VaultStorage.getAIApiKey());
  const [keyInput, setKeyInput] = useState('');
  const [keyToast, setKeyToast] = useState(false);

  const handleSaveAIKey = (e: React.FormEvent) => {
    e.preventDefault();
    VaultStorage.saveAIApiKey(keyInput.trim());
    setAiKey(keyInput.trim());
    setKeyInput('');
    setKeyToast(true);
    setTimeout(() => setKeyToast(false), 2500);
  };

  const handleClearAIKey = () => {
    VaultStorage.clearAIApiKey();
    setAiKey('');
    setKeyInput('');
  };

  const handleExport = () => {
    VaultStorage.exportVault();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      const success = VaultStorage.importVault(content);
      if (success) {
        alert('Sovereign Vault restored successfully.');
        window.location.reload();
      } else {
        alert('Invalid backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Vault & Membership Settings</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Local-First Vault Backups, KoshQ AI Intelligence & Membership Tiers
        </p>
      </div>

      {/* 1. KoshQ AI Intelligence Settings */}
      <div className="terminal-card" style={{ padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={16} style={{ color: 'var(--accent-primary)' }} />
            KoshQ AI Intelligence (Optional Custom Key)
          </h3>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: 4,
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
            {aiKey ? 'CUSTOM GEMINI KEY ACTIVE' : 'AI COPILOT ACTIVE'}
          </span>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 14 }}>
          KoshQ AI is active and available by default. You can optionally connect your personal Google Gemini API key to run extended queries using your own cloud developer quota. Keys are stored strictly on your local device.
        </p>

        <div style={{ maxWidth: 580 }}>
          <form onSubmit={handleSaveAIKey} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              type="password"
              placeholder={aiKey ? '•••••••••••••••••••••••• (Active)' : 'Enter Gemini API Key (AIzaSy...)'}
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              className="input-field"
              style={{ flex: 1, fontSize: '12px' }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0 16px' }} disabled={!keyInput.trim()}>
              Save Key
            </button>
            {aiKey && (
              <button
                type="button"
                onClick={handleClearAIKey}
                className="btn btn-secondary"
                style={{ padding: '0 12px' }}
              >
                Clear Key
              </button>
            )}
          </form>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '11px', color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <span>Get a free Gemini API Key from Google AI Studio</span>
              <ExternalLink size={11} />
            </a>

            {keyToast && (
              <span style={{ fontSize: '11px', color: 'var(--color-gain)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Check size={12} /> Key saved locally!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Sovereign Local-First Vault Management */}
      <div className="terminal-card" style={{ padding: 22 }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: 6 }}>
          Sovereign Vault Data Storage
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 16 }}>
          All your holdings, CAS imports, and journal theses remain 100% on your local computer.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button onClick={handleExport} className="btn btn-secondary">
            <Download size={14} /> Export Vault Backup (JSON)
          </button>

          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={handleImportFile}
            style={{ display: 'none' }}
          />

          <button onClick={() => fileInputRef.current?.click()} className="btn btn-secondary">
            <Upload size={14} /> Restore Vault from JSON
          </button>

          <button
            onClick={() => {
              if (confirm('Are you sure you want to reset all local data to factory state?')) {
                onDataReset();
              }
            }}
            className="btn btn-ghost"
            style={{ color: 'var(--color-loss)', marginLeft: 'auto' }}
          >
            <Trash2 size={14} /> Reset Local Vault
          </button>
        </div>
      </div>

      {/* 3. The Business Model: Software SaaS Tiers */}
      <div>
        <div style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700' }}>SaaS Membership Tiers</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Monetized purely as software convenience and analytical computing power. Zero stock tips, zero distribution kickbacks.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {/* Free Tier */}
          <div className="terminal-card" style={{ padding: 20 }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              COMMUNITY
            </span>
            <div style={{ fontSize: '24px', fontWeight: '800', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
              ₹0 <span style={{ fontSize: '12px', fontWeight: '400', color: 'var(--text-muted)' }}>/ forever</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '8px 0 16px', lineHeight: 1.5 }}>
              Essential multi-asset tracking and basic fundamental screening for retail DIY investors.
            </p>

            <ul style={{ listStyle: 'none', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text-secondary)' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={13} style={{ color: 'var(--color-gain)' }} /> Up to 2 Local Portfolios
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={13} style={{ color: 'var(--color-gain)' }} /> Full 15+ Financial Calculators
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={13} style={{ color: 'var(--color-gain)' }} /> Standard Equity & MF Explorers
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={13} style={{ color: 'var(--color-gain)' }} /> Artha Academy & Lexicon
              </li>
            </ul>

            <button
              onClick={() => setTier('free')}
              className={`btn ${tier === 'free' ? 'btn-secondary' : 'btn-ghost'}`}
              style={{ width: '100%', marginTop: 20, fontWeight: 700 }}
            >
              {tier === 'free' ? '✓ Active Free Plan' : 'Switch to Free Tier'}
            </button>
          </div>

          {/* Pro Tier */}
          <div className="terminal-card" style={{ padding: 20, borderColor: tier === 'pro' ? 'var(--accent-primary)' : undefined, position: 'relative' }}>
            <span style={{
              position: 'absolute',
              top: 12,
              right: 12,
              fontSize: '9px',
              fontWeight: '700',
              padding: '2px 6px',
              borderRadius: 3,
              background: 'var(--accent-primary)',
              color: '#ffffff'
            }}>
              RECOMMENDED
            </span>

            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
              KOSHQ PRO
            </span>
            <div style={{ fontSize: '24px', fontWeight: '800', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
              ₹299 <span style={{ fontSize: '12px', fontWeight: '400', color: 'var(--text-muted)' }}>/ month</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '8px 0 16px', lineHeight: 1.5 }}>
              Institutional depth for serious fundamental equity analysts and wealth builders.
            </p>

            <ul style={{ listStyle: 'none', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text-secondary)' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={13} style={{ color: 'var(--color-gain)' }} /> Flagship 20-Section Portfolio Report
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={13} style={{ color: 'var(--color-gain)' }} /> Full Portfolio X-Ray (HHI, Overlap)
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={13} style={{ color: 'var(--color-gain)' }} /> Institutional Risk (Beta, Sharpe, Sortino, VaR)
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={13} style={{ color: 'var(--color-gain)' }} /> Historical Crisis Stress Testing
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={13} style={{ color: 'var(--color-gain)' }} /> FY Capital Gains Tax Reports (ITR Ready)
              </li>
            </ul>

            <button
              onClick={() => setTier('pro')}
              className={`btn ${tier === 'pro' ? 'btn-secondary' : 'btn-primary'}`}
              style={{ width: '100%', marginTop: 20, fontWeight: 700 }}
            >
              {tier === 'pro' ? '✓ Active Pro Member' : 'Activate KoshQ Pro (Demo)'}
            </button>
          </div>

          {/* Pro+ Tier */}
          <div className="terminal-card" style={{ padding: 20, borderColor: tier === 'pro_plus' ? '#d97706' : undefined }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-warning)', textTransform: 'uppercase' }}>
              KOSHQ PRO+
            </span>
            <div style={{ fontSize: '24px', fontWeight: '800', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
              ₹599 <span style={{ fontSize: '12px', fontWeight: '400', color: 'var(--text-muted)' }}>/ month</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '8px 0 16px', lineHeight: 1.5 }}>
              For family offices, multi-entity portfolios, and high-frequency document intelligence.
            </p>

            <ul style={{ listStyle: 'none', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text-secondary)' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={13} style={{ color: 'var(--color-gain)' }} /> Everything in Pro
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={13} style={{ color: 'var(--color-gain)' }} /> Multi-PAN Family Account Tagging
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={13} style={{ color: 'var(--color-gain)' }} /> Unlimited Annual Report Extraction & OCR
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={13} style={{ color: 'var(--color-gain)' }} /> Historical Back-Simulation of Models
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={13} style={{ color: 'var(--color-gain)' }} /> Early B2B Calculation API Access
              </li>
            </ul>

            <button
              onClick={() => setTier('pro_plus')}
              className={`btn ${tier === 'pro_plus' ? 'btn-secondary' : 'btn-primary'}`}
              style={{
                width: '100%',
                marginTop: 20,
                fontWeight: 700,
                background: tier === 'pro_plus' ? undefined : 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                color: '#ffffff'
              }}
            >
              {tier === 'pro_plus' ? '✓ Active Pro+ Member' : 'Activate KoshQ Pro+ (Demo)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
