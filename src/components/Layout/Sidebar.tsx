import React from 'react';
import {
  LayoutDashboard,
  WalletCards,
  Compass,
  SlidersHorizontal,
  Calculator,
  GraduationCap,
  Settings,
  ShieldCheck,
  FileSpreadsheet,
  PanelLeftClose,
  PanelLeftOpen,
  X
} from 'lucide-react';
import { KoshQLogo } from '../Brand/KoshQLogo';

export type NavModule =
  | 'dashboard'
  | 'vault'
  | 'explore'
  | 'workbench'
  | 'calculators'
  | 'research'
  | 'academy'
  | 'settings';

interface SidebarProps {
  activeModule: NavModule;
  onSelectModule: (module: NavModule) => void;
  portfolioCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  portfolioCount,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile
}) => {
  const handleModuleClick = (mod: NavModule) => {
    onSelectModule(mod);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <div className="brand-logo" onClick={isCollapsed ? onToggleCollapse : undefined} style={{ cursor: isCollapsed ? 'pointer' : 'default' }}>
          <KoshQLogo size={32} glow={true} />
          {(!isCollapsed || isMobileOpen) && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="brand-name">KoshQ</span>
                <span className="brand-badge">SOVEREIGN</span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Financial Command Centre</div>
            </div>
          )}
        </div>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={onToggleCollapse}
          className="sidebar-collapse-btn"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar to Icon Rail'}
          aria-label="Toggle Sidebar"
        >
          {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>

        {/* Mobile Close Button */}
        <button
          onClick={onCloseMobile}
          className="sidebar-close-btn"
          title="Close Navigation Menu"
          aria-label="Close Navigation Menu"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="sidebar-nav">
        {/* Section: Overview */}
        <div>
          {!isCollapsed && <div className="nav-group-title">Executive Command</div>}
          <button
            onClick={() => handleModuleClick('dashboard')}
            className={`nav-item ${activeModule === 'dashboard' ? 'active' : ''}`}
            title="Command Centre"
          >
            <LayoutDashboard />
            <span>Command Centre</span>
          </button>
          <button
            onClick={() => handleModuleClick('vault')}
            className={`nav-item ${activeModule === 'vault' ? 'active' : ''}`}
            title="Portfolio Vault"
          >
            <WalletCards />
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span>Portfolio Vault</span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {portfolioCount}
              </span>
            </span>
          </button>
        </div>

        {/* Section: Discovery & Markets */}
        <div>
          {!isCollapsed && <div className="nav-group-title">Market Intelligence</div>}
          <button
            onClick={() => handleModuleClick('explore')}
            className={`nav-item ${activeModule === 'explore' ? 'active' : ''}`}
            title="Asset Explorer"
          >
            <Compass />
            <span>Asset Explorer</span>
          </button>
          <button
            onClick={() => handleModuleClick('workbench')}
            className={`nav-item ${activeModule === 'workbench' ? 'active' : ''}`}
            title="Workbench & Lab"
          >
            <SlidersHorizontal />
            <span>Workbench & Lab</span>
          </button>
        </div>

        {/* Section: Math & Utilities */}
        <div>
          {!isCollapsed && <div className="nav-group-title">Calculations & Research</div>}
          <button
            onClick={() => handleModuleClick('calculators')}
            className={`nav-item ${activeModule === 'calculators' ? 'active' : ''}`}
            title="15+ Calculators"
          >
            <Calculator />
            <span>15+ Calculators</span>
          </button>
          <button
            onClick={() => handleModuleClick('research')}
            className={`nav-item ${activeModule === 'research' ? 'active' : ''}`}
            title="Research Studio & Tax"
          >
            <FileSpreadsheet />
            <span>Research Studio & Tax</span>
          </button>
        </div>

        {/* Section: Knowledge & Workspace */}
        <div>
          {!isCollapsed && <div className="nav-group-title">Knowledge & System</div>}
          <button
            onClick={() => handleModuleClick('academy')}
            className={`nav-item ${activeModule === 'academy' ? 'active' : ''}`}
            title="Artha Academy"
          >
            <GraduationCap />
            <span>Artha Academy</span>
          </button>
          <button
            onClick={() => handleModuleClick('settings')}
            className={`nav-item ${activeModule === 'settings' ? 'active' : ''}`}
            title="Vault & Pricing"
          >
            <Settings />
            <span>Vault & Pricing</span>
          </button>
        </div>
      </nav>

      {!isCollapsed && (
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px', color: 'var(--text-muted)' }}>
            <ShieldCheck size={14} style={{ color: 'var(--accent-primary)' }} />
            <span>Non-Intermediary Software</span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', lineHeight: 1.4 }}>
            Private • Sovereign • Zero Commissions
          </div>
        </div>
      )}
    </aside>
  );
};
