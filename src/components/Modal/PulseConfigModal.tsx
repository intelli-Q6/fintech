import React, { useState } from 'react';
import { MacroIndicatorConfig, MacroCategory } from '../../data/types';
import { DEFAULT_MACRO_CATALOG } from '../../data/demoData';
import { X, Plus, RotateCcw, Check, Trash2, Search, SlidersHorizontal } from 'lucide-react';

interface PulseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: MacroIndicatorConfig[];
  onSave: (items: MacroIndicatorConfig[]) => void;
}

const CATEGORIES: ('All' | MacroCategory)[] = [
  'All',
  'Index',
  'Commodity',
  'Currency',
  'Fixed Income',
  'Crypto',
  'Custom'
];

export const PulseConfigModal: React.FC<PulseConfigModalProps> = ({
  isOpen,
  onClose,
  items,
  onSave
}) => {
  const [activeCategory, setActiveCategory] = useState<'All' | MacroCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [localItems, setLocalItems] = useState<MacroIndicatorConfig[]>(items);
  const [showAddForm, setShowAddForm] = useState(false);

  // New custom ticker form state
  const [newSymbol, setNewSymbol] = useState('');
  const [newName, setNewName] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newChange, setNewChange] = useState('');
  const [newIsPositive, setNewIsPositive] = useState(true);

  if (!isOpen) return null;

  const handleToggle = (id: string) => {
    const updated = localItems.map(item => {
      if (item.id === id) {
        return { ...item, enabled: !item.enabled };
      }
      return item;
    });
    setLocalItems(updated);
  };

  const handleRemoveCustom = (id: string) => {
    const updated = localItems.filter(item => item.id !== id);
    setLocalItems(updated);
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim() || !newValue.trim()) return;

    const newItem: MacroIndicatorConfig = {
      id: `custom-${Date.now()}`,
      symbol: newSymbol.trim().toUpperCase(),
      name: newName.trim() || newSymbol.trim().toUpperCase(),
      value: newValue.trim(),
      change: newChange.trim() || (newIsPositive ? '+0.50%' : '-0.50%'),
      isPositive: newIsPositive,
      category: 'Custom',
      enabled: true,
      isCustom: true
    };

    const updated = [...localItems, newItem];
    setLocalItems(updated);
    setNewSymbol('');
    setNewName('');
    setNewValue('');
    setNewChange('');
    setShowAddForm(false);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset the Macro Pulse stream to factory sovereign defaults?')) {
      setLocalItems(DEFAULT_MACRO_CATALOG);
    }
  };

  const handleSaveAndClose = () => {
    onSave(localItems);
    onClose();
  };

  const filteredItems = localItems.filter(item => {
    const matchesCat = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch =
      item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const activeCount = localItems.filter(i => i.enabled).length;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 620, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SlidersHorizontal size={18} style={{ color: 'var(--accent-primary)' }} />
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Configure Macro Pulse Stream</h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Customize indices, currencies, commodities & personal tickers ({activeCount} active in marquee)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        {/* Search & Categories */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search Indian indices, yields, commodities, currencies..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="terminal-input"
              style={{ paddingLeft: 30, fontSize: '12px', width: '100%' }}
            />
          </div>

          {/* Category Pills */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`btn btn-xs ${activeCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '11px', padding: '3px 9px', whiteSpace: 'nowrap' }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Ticker List */}
        <div style={{ overflowY: 'auto', padding: '14px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredItems.map(item => (
            <div
              key={item.id}
              onClick={() => handleToggle(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 'var(--radius-xs)',
                background: item.enabled ? 'var(--bg-surface)' : 'var(--bg-subtle)',
                border: item.enabled ? '1px solid var(--accent-border)' : '1px solid var(--border-subtle)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={() => handleToggle(item.id)}
                  style={{ cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: '700', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                      {item.symbol}
                    </span>
                    <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: 3, background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                      {item.category}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.name}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', fontFamily: 'var(--font-mono)' }}>{item.value}</div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: item.isPositive ? 'var(--color-gain)' : 'var(--color-loss)' }}>
                    {item.change}
                  </div>
                </div>

                {item.isCustom && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleRemoveCustom(item.id);
                    }}
                    className="btn btn-ghost btn-xs"
                    title="Delete Custom Ticker"
                    style={{ color: 'var(--color-loss)', padding: 4 }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)', fontSize: '12px' }}>
              No tickers found matching "{searchQuery}".
            </div>
          )}

          {/* Add Custom Symbol Form */}
          {showAddForm ? (
            <form onSubmit={handleAddCustom} style={{ background: 'var(--bg-subtle)', border: '1px dashed var(--accent-border)', borderRadius: 'var(--radius-sm)', padding: 12, marginTop: 8 }}>
              <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: 8, color: 'var(--accent-primary)' }}>
                Add Custom Ticker Symbol
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <input
                  type="text"
                  placeholder="Symbol (e.g. TATAMOTORS)"
                  value={newSymbol}
                  onChange={e => setNewSymbol(e.target.value)}
                  className="terminal-input"
                  style={{ fontSize: '11px' }}
                  required
                />
                <input
                  type="text"
                  placeholder="Name (e.g. Tata Motors Ltd)"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="terminal-input"
                  style={{ fontSize: '11px' }}
                />
                <input
                  type="text"
                  placeholder="Current Value (e.g. ₹968.40)"
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  className="terminal-input"
                  style={{ fontSize: '11px' }}
                  required
                />
                <input
                  type="text"
                  placeholder="Change (e.g. +14.20 (+1.49%))"
                  value={newChange}
                  onChange={e => setNewChange(e.target.value)}
                  className="terminal-input"
                  style={{ fontSize: '11px' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newIsPositive}
                    onChange={e => setNewIsPositive(e.target.checked)}
                    style={{ accentColor: 'var(--color-gain)' }}
                  />
                  <span>Positive trend (Green)</span>
                </label>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="btn btn-secondary btn-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-xs"
                  >
                    Add Symbol
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="btn btn-secondary btn-sm"
              style={{ borderStyle: 'dashed', justifyContent: 'center', gap: 6, marginTop: 6 }}
            >
              <Plus size={13} />
              <span>Add Custom Ticker Symbol</span>
            </button>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
          <button
            onClick={handleResetDefaults}
            className="btn btn-ghost btn-sm"
            style={{ gap: 5, fontSize: '11px', color: 'var(--text-muted)' }}
            title="Reset to Factory Defaults"
          >
            <RotateCcw size={12} />
            <span>Reset Defaults</span>
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} className="btn btn-secondary btn-sm">
              Cancel
            </button>
            <button onClick={handleSaveAndClose} className="btn btn-primary btn-sm" style={{ gap: 6 }}>
              <Check size={13} />
              <span>Apply to Marquee</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
