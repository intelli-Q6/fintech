// Sovereign Local Storage & Client-Side Privacy Manager for KoshQ

import { Holding, GoalItem, JournalEntry, MacroIndicatorConfig } from './types';
import { INITIAL_PORTFOLIO_HOLDINGS, DEMO_GOALS, DEMO_JOURNAL_ENTRIES, DEFAULT_MACRO_CATALOG } from './demoData';

const STORAGE_KEYS = {
  HOLDINGS: 'koshq_holdings_v1',
  GOALS: 'koshq_goals_v1',
  JOURNAL: 'koshq_journal_v1',
  THEME: 'koshq_theme_pref',
  MODE: 'koshq_mode_pref',
  DENSITY: 'koshq_density_pref',
  MACRO_PULSE: 'koshq_macro_pulse_v1',
  AI_API_KEY: 'koshq_ai_api_key_v1',
  AI_MODEL: 'koshq_ai_model_v1'
};

export class VaultStorage {
  static getHoldings(): Holding[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.HOLDINGS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse holdings from localStorage', e);
    }
    // Initialize with authentic demo vault
    this.saveHoldings(INITIAL_PORTFOLIO_HOLDINGS);
    return INITIAL_PORTFOLIO_HOLDINGS;
  }

  static saveHoldings(holdings: Holding[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.HOLDINGS, JSON.stringify(holdings));
    } catch (e) {
      console.error('Failed to save holdings to localStorage', e);
    }
  }

  static getGoals(): GoalItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.GOALS);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    this.saveGoals(DEMO_GOALS);
    return DEMO_GOALS;
  }

  static saveGoals(goals: GoalItem[]): void {
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
  }

  static getJournal(): JournalEntry[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.JOURNAL);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    this.saveJournal(DEMO_JOURNAL_ENTRIES);
    return DEMO_JOURNAL_ENTRIES;
  }

  static saveJournal(entries: JournalEntry[]): void {
    localStorage.setItem(STORAGE_KEYS.JOURNAL, JSON.stringify(entries));
  }

  static getTheme(): { theme: string; mode: string; density: string } {
    // Check if initialized to default light theme
    const hasInitLight = localStorage.getItem('koshq_init_light_default_v1');
    let mode = localStorage.getItem(STORAGE_KEYS.MODE);
    if (!hasInitLight) {
      mode = 'light';
      localStorage.setItem('koshq_init_light_default_v1', 'true');
      localStorage.setItem(STORAGE_KEYS.MODE, 'light');
    }
    return {
      theme: localStorage.getItem(STORAGE_KEYS.THEME) || 'slate',
      mode: mode || 'light',
      density: 'compact'
    };
  }

  static saveTheme(theme: string, mode: string, density: string = 'compact'): void {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    localStorage.setItem(STORAGE_KEYS.MODE, mode);
    localStorage.setItem(STORAGE_KEYS.DENSITY, 'compact');
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-mode', mode);
    document.documentElement.setAttribute('data-density', 'compact');
  }

  static getMacroPulseConfig(): MacroIndicatorConfig[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.MACRO_PULSE);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse macro pulse config', e);
    }
    this.saveMacroPulseConfig(DEFAULT_MACRO_CATALOG);
    return DEFAULT_MACRO_CATALOG;
  }

  static saveMacroPulseConfig(items: MacroIndicatorConfig[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.MACRO_PULSE, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save macro pulse config', e);
    }
  }

  // Sovereign Backup: Export full encrypted/plaintext JSON
  static exportVault(): void {
    const data = {
      app: 'KoshQ Sovereign Workstation',
      exportDate: new Date().toISOString(),
      holdings: this.getHoldings(),
      goals: this.getGoals(),
      journal: this.getJournal()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `koshq_vault_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Restore from JSON
  static importVault(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.holdings && Array.isArray(parsed.holdings)) {
        this.saveHoldings(parsed.holdings);
        if (parsed.goals) this.saveGoals(parsed.goals);
        if (parsed.journal) this.saveJournal(parsed.journal);
        return true;
      }
    } catch (e) {
      console.error('Import failed', e);
    }
    return false;
  }

  // Sovereign AI Credentials (Stored strictly in browser localStorage)
  static getAIApiKey(): string {
    const envKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) || '';
    if (envKey) return envKey;
    return localStorage.getItem(STORAGE_KEYS.AI_API_KEY) || '';
  }

  static saveAIApiKey(key: string): void {
    if (!key.trim()) {
      localStorage.removeItem(STORAGE_KEYS.AI_API_KEY);
    } else {
      localStorage.setItem(STORAGE_KEYS.AI_API_KEY, key.trim());
    }
  }

  static clearAIApiKey(): void {
    localStorage.removeItem(STORAGE_KEYS.AI_API_KEY);
  }

  static hasAIApiKey(): boolean {
    return Boolean(this.getAIApiKey());
  }

  // Simulated Client-Side CAS Parser
  // Emulates local extraction of CAMS/KFintech PDF/Excel data directly in the browser
  static parseCASStatement(fileName: string, panPassword: string): Holding[] {
    console.log(`[Local Client CAS Sandbox] Decrypting ${fileName} locally with key ${panPassword.substring(0, 2)}***. Zero data transmitted.`);
    
    // In actual production with pdfjs, it reads text streams in Web Worker.
    // Here we hydrate the diversified sample portfolio representing all Indian asset classes
    return INITIAL_PORTFOLIO_HOLDINGS;
  }
}
