import React, { useState, useRef, useEffect } from 'react';
import { DEMO_MACRO_PULSE } from '../../data/demoData';
import { MacroIndicatorConfig } from '../../data/types';
import {
  Sun,
  Moon,
  Sparkles,
  Menu,
  SlidersHorizontal,
  Activity,
  Play,
  Pause,
  RefreshCw,
  Clock,
  ShieldCheck,
  Check,
  X,
  Cloud,
  CloudOff,
  UploadCloud,
  LogOut,
  User
} from 'lucide-react';
import { KoshQLogo } from '../Brand/KoshQLogo';
import { useMarketQuotes } from '../../core/market/useMarketQuotes';
import { useAuth } from '../../core/auth/AuthContext';

interface NavbarProps {
  currentTheme: string;
  currentMode: string;
  onThemeChange: (theme: string) => void;
  onModeToggle: () => void;
  onOpenAI: () => void;
  onToggleMobileSidebar: () => void;
  pulseItems?: MacroIndicatorConfig[];
  onOpenPulseConfig?: () => void;
  onOpenAuth?: () => void;
}

const THEME_SYMBOLS = [
  { id: 'slate', name: 'Slate Titanium', color: '#60a5fa' },
  { id: 'arctic-blue', name: 'Arctic Blue', color: '#38bdf8' },
  { id: 'emerald', name: 'Emerald Jade', color: '#10b981' },
  { id: 'violet', name: 'Midnight Violet', color: '#a855f7' },
  { id: 'amber', name: 'Amber Sovereign', color: '#f59e0b' }
];

export const Navbar: React.FC<NavbarProps> = ({
  currentTheme,
  currentMode,
  onThemeChange,
  onModeToggle,
  onOpenAI,
  onToggleMobileSidebar,
  pulseItems,
  onOpenPulseConfig,
  onOpenAuth
}) => {
  const { quotes, sessionInfo, tickerState, togglePause, setTickSpeed, syncAMFI } = useMarketQuotes();
  const { user, signOut, migrateToCloud } = useAuth();
  const [showFeedPopover, setShowFeedPopover] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close popovers on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowFeedPopover(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Seamless loop: duplicate active pulse items for infinite marquee
  const activeItems = pulseItems ? pulseItems.filter(p => p.enabled) : DEMO_MACRO_PULSE;
  const tickerSource = activeItems.length > 0 ? activeItems : DEMO_MACRO_PULSE;
  const tickerItems = [...tickerSource, ...tickerSource];

  return (
    <header className="command-bar">
      {/* Mobile/Tablet Menu Button & Brand Emblem */}
      <div className="command-brand-group">
        <button
          onClick={onToggleMobileSidebar}
          className="mobile-menu-btn"
          title="Open Sovereign Menu"
          aria-label="Toggle Navigation Menu"
        >
          <Menu size={18} />
          <span>Menu</span>
        </button>
        <div className="mobile-brand">
          <KoshQLogo size={22} glow={true} />
          <span className="mobile-brand-name">KoshQ</span>
        </div>
      </div>

      {/* Live Moving Macro Pulse Ticker (Continuous Infinite Marquee with Real-Time Quotes) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, marginRight: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, paddingRight: 4, position: 'relative' }} ref={popoverRef}>
          {/* Live Feed Beacon & Controller Button */}
          <button
            onClick={() => setShowFeedPopover(!showFeedPopover)}
            className="market-feed-btn"
            title="Market Feed Status & Ticker Controls"
          >
            <span
              className={`live-beacon ${sessionInfo.isMarketOpen ? '' : 'replay'} ${tickerState.isPaused ? 'paused' : ''}`}
            />
            <span style={{ fontSize: '10px', letterSpacing: '0.04em' }}>
              {tickerState.isPaused ? 'PAUSED' : sessionInfo.isMarketOpen ? 'LIVE' : 'SIM'}
            </span>
          </button>

          <span style={{ color: 'var(--accent-primary)', fontWeight: '800', fontSize: '11px', letterSpacing: '0.05em' }}>
            PULSE
          </span>

          {onOpenPulseConfig && (
            <button
              onClick={onOpenPulseConfig}
              className="pulse-config-trigger-btn"
              title="Configure & Add Ticker Symbols"
              aria-label="Configure Macro Pulse"
            >
              <SlidersHorizontal size={10} />
            </button>
          )}

          {/* Market Feed Controls Popover */}
          {showFeedPopover && (
            <div className="market-feed-popover">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
                <span style={{ fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Activity size={14} style={{ color: 'var(--accent-primary)' }} />
                  Market Data Controller
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    IST {sessionInfo.istTime}
                  </span>
                  <button
                    onClick={() => setShowFeedPopover(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '2px',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: 'var(--radius-xs)'
                    }}
                    title="Close"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Market Phase Card */}
              <div style={{ background: 'var(--bg-subtle)', padding: 10, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                  Market Session
                </div>
                <div style={{ fontSize: '12px', fontWeight: '600', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className={`live-beacon ${sessionInfo.isMarketOpen ? '' : 'replay'} ${tickerState.isPaused ? 'paused' : ''}`} />
                  {sessionInfo.phaseLabel}
                </div>
              </div>

              {/* Ticker Simulation Controls */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Ticker Stream Speed</span>
                  <button
                    onClick={togglePause}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '10px', padding: '2px 8px', gap: 4 }}
                  >
                    {tickerState.isPaused ? <><Play size={10} /> Resume</> : <><Pause size={10} /> Pause</>}
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setTickSpeed(2000)}
                    className={`btn btn-sm ${tickerState.tickIntervalMs === 2000 ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ flex: 1, fontSize: '10px', padding: '3px 0' }}
                  >
                    Fast (2s)
                  </button>
                  <button
                    onClick={() => setTickSpeed(3500)}
                    className={`btn btn-sm ${tickerState.tickIntervalMs === 3500 ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ flex: 1, fontSize: '10px', padding: '3px 0' }}
                  >
                    Normal (3.5s)
                  </button>
                  <button
                    onClick={() => setTickSpeed(7000)}
                    className={`btn btn-sm ${tickerState.tickIntervalMs === 7000 ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ flex: 1, fontSize: '10px', padding: '3px 0' }}
                  >
                    Slow (7s)
                  </button>
                </div>
              </div>

              {/* AMFI Official NAV Sync */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '11px', fontWeight: '600' }}>Official AMFI NAV Feeds</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {tickerState.lastAmfiSyncTime
                        ? `Last Synced: ${new Date(tickerState.lastAmfiSyncTime).toLocaleTimeString('en-IN')}`
                        : 'Official AMFI Daily NAVs'}
                    </span>
                  </div>
                  <button
                    onClick={() => syncAMFI(true)}
                    disabled={tickerState.isAmfiSyncing}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '10px', padding: '4px 8px', gap: 4 }}
                  >
                    <RefreshCw size={11} className={tickerState.isAmfiSyncing ? 'animate-spin' : ''} />
                    {tickerState.isAmfiSyncing ? 'Syncing...' : 'Sync AMFI'}
                  </button>
                </div>
              </div>

              {/* Security & Multi-Device Sync Guarantee */}
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5, background: 'var(--bg-subtle)', padding: 6, borderRadius: 'var(--radius-xs)' }}>
                <ShieldCheck size={12} style={{ color: user ? 'var(--color-gain)' : 'var(--accent-primary)', flexShrink: 0 }} />
                <span>
                  {user
                    ? 'Cloud Synced: Protected by PostgreSQL Row-Level Security.'
                    : 'Local Mode: Operating on this device. Sign in to sync across devices.'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Marquee Track with Live Updating Quotes */}
        <div className="macro-ticker-wrapper" title="Live Continuous Indian Macro Stream (Hover to Pause)">
          <div className="macro-ticker-track">
            {tickerItems.map((item, idx) => {
              const liveQuote = quotes[item.symbol];
              const displayVal = liveQuote ? liveQuote.currentPrice.toLocaleString('en-IN') : item.value;
              const displayChg = liveQuote
                ? `${liveQuote.dayChange >= 0 ? '+' : ''}${liveQuote.dayChange.toFixed(2)} (${liveQuote.dayChangePercent >= 0 ? '+' : ''}${liveQuote.dayChangePercent.toFixed(2)}%)`
                : item.change;
              const isPositive = liveQuote ? liveQuote.dayChange >= 0 : item.isPositive;
              const tickClass = liveQuote?.lastTick ? `tick-${liveQuote.lastTick}` : '';

              return (
                <div key={idx} className={`macro-item ${tickClass}`}>
                  <span className="macro-name">{item.symbol}:</span>
                  <span className="macro-val">{displayVal}</span>
                  <span style={{ fontSize: '11px', color: isPositive ? 'var(--color-gain)' : 'var(--color-loss)', fontWeight: '600' }}>
                    {displayChg}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Global Command Actions & Toggles */}
      <div className="command-actions">
        {/* Symbol-Only Theme Switcher (Zero Text) */}
        <div className="theme-symbols-bar" title="Select Theme Palette (Symbol Only)">
          {THEME_SYMBOLS.map(t => (
            <button
              key={t.id}
              onClick={() => onThemeChange(t.id)}
              className={`theme-symbol-btn ${currentTheme === t.id ? 'active' : ''}`}
              style={{ background: t.color }}
              title={t.name}
              aria-label={t.name}
            />
          ))}
        </div>

        {/* Dark / Light Toggle */}
        <button
          onClick={onModeToggle}
          className="btn btn-secondary btn-sm"
          style={{ padding: '5px 8px' }}
          title="Toggle Dark / Light Mode"
        >
          {currentMode === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
        </button>

        {/* Cloud Vault Auth / Sync Button */}
        {user ? (
          <div style={{ position: 'relative' }} ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 9px', fontSize: '11px' }}
              title="Cloud Vault Status"
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
              <span style={{ maxWidth: 85, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email?.split('@')[0]}
              </span>
            </button>
            {showUserMenu && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 6px)',
                backgroundColor: 'var(--surface, #0f172a)',
                border: '1px solid var(--border-subtle, #334155)',
                borderRadius: 8,
                padding: 12,
                minWidth: 230,
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                zIndex: 999
              }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                  {user.email}
                </div>
                <div style={{ fontSize: '10px', color: '#10b981', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Cloud size={11} /> Cloud Synced • RLS Active
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: 10 }}>
                  Quota: Free Tier (10 AI queries/day)
                </div>
                <div style={{ borderTop: '1px solid var(--border-subtle, #1e293b)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button
                    onClick={async () => {
                      setMigrating(true);
                      const rep = await migrateToCloud();
                      setMigrating(false);
                      alert(rep.success ? `Migrated ${rep.migratedCount} local items to cloud ledger!` : `Migration: ${rep.errors.join(', ')}`);
                      setShowUserMenu(false);
                    }}
                    disabled={migrating}
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%', justifyContent: 'flex-start', fontSize: '11px', gap: 6 }}
                  >
                    <UploadCloud size={13} />
                    {migrating ? 'Migrating...' : 'Sync Local Vault to Cloud'}
                  </button>
                  <button
                    onClick={() => { signOut(); setShowUserMenu(false); }}
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%', justifyContent: 'flex-start', fontSize: '11px', gap: 6, color: '#f87171' }}
                  >
                    <LogOut size={13} /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="btn-auth-signature"
            title="Log In / Register"
          >
            <User size={12} />
            <span>Log In/Register</span>
          </button>
        )}
      </div>
    </header>
  );
};
