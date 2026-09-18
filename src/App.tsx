import React, { useState, useEffect } from 'react';
import { Sidebar, NavModule } from './components/Layout/Sidebar';
import { Navbar } from './components/Layout/Navbar';
import { DashboardView } from './modules/Dashboard/DashboardView';
import { PortfolioVaultView } from './modules/PortfolioVault/PortfolioVaultView';
import { ExploreView } from './modules/Explore/ExploreView';
import { WorkbenchView } from './modules/Workbench/WorkbenchView';
import { CalculatorsView } from './modules/Calculators/CalculatorsView';
import { ResearchStudioView } from './modules/ResearchStudio/ResearchStudioView';
import { AcademyView } from './modules/Academy/AcademyView';
import { SettingsView } from './modules/Settings/SettingsView';
import { AssetDetailDrawer } from './components/Modal/AssetDetailDrawer';
import { AIAssistantModal } from './modules/AIAssistant/AIAssistantModal';
import { PulseConfigModal } from './components/Modal/PulseConfigModal';
import { AuthModal } from './components/Modal/AuthModal';
import { AuthProvider, useAuth } from './core/auth/AuthContext';
import { SubscriptionProvider } from './core/auth/useSubscription';
import { ProGateModal } from './components/Modal/ProGateModal';
import { Holding, MacroIndicatorConfig } from './data/types';
import { VaultStorage } from './data/storage';
import { INITIAL_PORTFOLIO_HOLDINGS } from './data/demoData';
import {
  LayoutDashboard,
  WalletCards,
  Compass,
  SlidersHorizontal,
  Calculator,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';

const AppContent: React.FC = () => {
  const { authNotice, clearAuthNotice } = useAuth();
  const [activeModule, setActiveModule] = useState<NavModule>('dashboard');
  const [workbenchTab, setWorkbenchTab] = useState<'compare' | 'screener' | 'scenarios' | 'goals'>('compare');
  const [vaultTab, setVaultTab] = useState<string>('holdings');
  const [holdings, setHoldings] = useState<Holding[]>(() => VaultStorage.getHoldings());
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pulseItems, setPulseItems] = useState<MacroIndicatorConfig[]>(() => VaultStorage.getMacroPulseConfig());
  const [isPulseConfigOpen, setIsPulseConfigOpen] = useState(false);

  // Responsive Sidebar Collapse & Mobile Drawer States
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth < 1080;
  });
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Automatically adapt layout on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarCollapsed(true);
      }
      if (window.innerWidth >= 1024) {
        setIsMobileDrawerOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Theme & Mode state (Dense mode is permanent default)
  const initialPrefs = VaultStorage.getTheme();
  const [theme, setTheme] = useState(initialPrefs.theme);
  const [mode, setMode] = useState(initialPrefs.mode);

  useEffect(() => {
    VaultStorage.saveTheme(theme, mode, 'compact');
  }, [theme, mode]);

  const handleUpdateHoldings = (newHoldings: Holding[]) => {
    setHoldings(newHoldings);
    VaultStorage.saveHoldings(newHoldings);
  };

  const handleDataReset = () => {
    handleUpdateHoldings(INITIAL_PORTFOLIO_HOLDINGS);
    alert('Local vault reset to authentic initial demo state.');
  };

  const handleNavigate = (module: NavModule, tab?: string) => {
    setActiveModule(module);
    if (module === 'workbench' && tab) {
      setWorkbenchTab(tab as any);
    }
    if (module === 'vault' && tab) {
      setVaultTab(tab);
    }
  };

  const handleSelectModule = (mod: NavModule) => {
    setActiveModule(mod);
    if (mod === 'workbench') {
      setWorkbenchTab('compare');
    }
    if (mod === 'vault') {
      setVaultTab('holdings');
    }
  };

  return (
    <div className="app-shell">
      {/* Sovereign Left Sidebar Navigation Rail */}
      <Sidebar
        activeModule={activeModule}
        onSelectModule={handleSelectModule}
        portfolioCount={holdings.length}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileDrawerOpen}
        onCloseMobile={() => setIsMobileDrawerOpen(false)}
      />

      {/* Backdrop overlay for mobile drawer */}
      {isMobileDrawerOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsMobileDrawerOpen(false)}
          title="Dismiss Navigation Drawer"
        />
      )}

      {/* Main Content Area */}
      <div className="main-wrapper">
        <Navbar
          currentTheme={theme}
          currentMode={mode}
          onThemeChange={setTheme}
          onModeToggle={() => setMode(mode === 'dark' ? 'light' : 'dark')}
          onOpenAI={() => setIsAIOpen(true)}
          onToggleMobileSidebar={() => setIsMobileDrawerOpen(prev => !prev)}
          pulseItems={pulseItems}
          onOpenPulseConfig={() => setIsPulseConfigOpen(true)}
          onOpenAuth={() => setIsAuthModalOpen(true)}
        />

        {/* Global Auth Status / Confirmation Banner */}
        {authNotice && (
          <div style={{
            backgroundColor: authNotice.type === 'error' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
            borderBottom: `1px solid ${authNotice.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            color: authNotice.type === 'error' ? 'var(--color-loss, #f87171)' : 'var(--color-gain, #10b981)',
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.84rem',
            fontWeight: 500,
            zIndex: 100
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {authNotice.type === 'error' ? <AlertCircle size={17} style={{ flexShrink: 0 }} /> : <CheckCircle2 size={17} style={{ flexShrink: 0 }} />}
              <span>{authNotice.message}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {authNotice.type === 'error' && (
                <button
                  onClick={() => { setIsAuthModalOpen(true); clearAuthNotice(); }}
                  style={{
                    background: 'transparent',
                    border: '1px solid currentColor',
                    color: 'inherit',
                    borderRadius: 6,
                    padding: '3px 10px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Open Sign In
                </button>
              )}
              <button
                onClick={clearAuthNotice}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        <main className="content-area">
          {activeModule === 'dashboard' && (
            <DashboardView
              holdings={holdings}
              onSelectHolding={setSelectedHolding}
              onNavigate={handleNavigate}
              onOpenAI={() => setIsAIOpen(true)}
            />
          )}

          {activeModule === 'vault' && (
            <PortfolioVaultView
              holdings={holdings}
              onUpdateHoldings={handleUpdateHoldings}
              onSelectHolding={setSelectedHolding}
              initialTab={vaultTab}
            />
          )}

          {activeModule === 'explore' && (
            <ExploreView onSelectHolding={setSelectedHolding} />
          )}

          {activeModule === 'workbench' && (
            <WorkbenchView initialTab={workbenchTab} />
          )}

          {activeModule === 'calculators' && (
            <CalculatorsView />
          )}

          {activeModule === 'research' && (
            <ResearchStudioView />
          )}

          {activeModule === 'academy' && (
            <AcademyView />
          )}

          {activeModule === 'settings' && (
            <SettingsView
              currentTheme={theme}
              currentMode={mode}
              onThemeChange={setTheme}
              onModeChange={setMode}
              onDataReset={handleDataReset}
            />
          )}
        </main>
      </div>

      {/* Slide-out Factsheet Drawer */}
      <AssetDetailDrawer
        holding={selectedHolding}
        onClose={() => setSelectedHolding(null)}
      />

      {/* Pedagogical AI Assistant Modal */}
      <AIAssistantModal
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
        holdings={holdings}
      />

      {/* Pro Membership Paywall / Upgrade Modal */}
      <ProGateModal />

      {/* Macro Pulse Stream Configuration Modal */}
      <PulseConfigModal
        isOpen={isPulseConfigOpen}
        onClose={() => setIsPulseConfigOpen(false)}
        items={pulseItems}
        onSave={updated => {
          setPulseItems(updated);
          VaultStorage.saveMacroPulseConfig(updated);
        }}
      />

      {/* Mobile Native-Style Bottom Navigation Dock (Smartphones & Small Tablets) */}
      <nav className="mobile-bottom-nav">
        <button
          onClick={() => setActiveModule('dashboard')}
          className={`mobile-bottom-item ${activeModule === 'dashboard' ? 'active' : ''}`}
          title="Command Centre"
        >
          <LayoutDashboard />
          <span>Command</span>
        </button>
        <button
          onClick={() => setActiveModule('vault')}
          className={`mobile-bottom-item ${activeModule === 'vault' ? 'active' : ''}`}
          title="Portfolio Vault"
        >
          <WalletCards />
          <span>Vault</span>
        </button>
        <button
          onClick={() => setActiveModule('explore')}
          className={`mobile-bottom-item ${activeModule === 'explore' ? 'active' : ''}`}
          title="Asset Explorer"
        >
          <Compass />
          <span>Explore</span>
        </button>
        <button
          onClick={() => setActiveModule('workbench')}
          className={`mobile-bottom-item ${activeModule === 'workbench' ? 'active' : ''}`}
          title="Workbench & Lab"
        >
          <SlidersHorizontal />
          <span>Lab</span>
        </button>
        <button
          onClick={() => setActiveModule('calculators')}
          className={`mobile-bottom-item ${activeModule === 'calculators' ? 'active' : ''}`}
          title="15+ Calculators"
        >
          <Calculator />
          <span>Calcs</span>
        </button>
        <button
          onClick={() => setIsAIOpen(true)}
          className="mobile-bottom-item"
          title="KoshQ AI"
          style={{ color: 'var(--accent-primary)' }}
        >
          <Sparkles />
          <span>AI</span>
        </button>
      </nav>

      {/* Cloud Authentication & Multi-Tenant Access Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <AppContent />
      </SubscriptionProvider>
    </AuthProvider>
  );
};
