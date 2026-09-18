import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Send,
  ShieldCheck,
  AlertTriangle,
  Key,
  ExternalLink,
  RotateCcw,
  Check,
  CheckCircle2,
  Lock,
  Cpu,
  HelpCircle,
  TrendingUp,
  SlidersHorizontal
} from 'lucide-react';
import { Holding } from '../../data/types';
import { VaultStorage } from '../../data/storage';
import { aiService, AIMessage } from '../../core/api/aiService';
import { formatINR } from '../../core/math/xirr';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  holdings: Holding[];
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  holdings
}) => {
  if (!isOpen) return null;

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState(() => VaultStorage.getAIApiKey());
  const [tempKeyInput, setTempKeyInput] = useState('');
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [keySavedToast, setKeySavedToast] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'msg-init',
      sender: 'assistant',
      text: `Hello. I am **KoshQ AI**, your portfolio intelligence and financial analytics copilot.\n\nI have active context of your **${holdings.length} portfolio positions** totaling **${formatINR(holdings.reduce((s, h) => s + h.currentValue, 0))}**. I can analyze your asset allocation, calculate risk concentration, evaluate corporate fundamentals, and model tax scenarios.\n\n*Note: Operating strictly under SEBI non-intermediary guidelines. I do not provide speculative buy/sell calls, target prices, or trading tips.*`
    }
  ]);

  // Direct vertical scroll without shifting iOS Safari viewport or parent containers
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    VaultStorage.saveAIApiKey(tempKeyInput.trim());
    setApiKey(tempKeyInput.trim());
    setKeySavedToast(true);
    setTimeout(() => setKeySavedToast(false), 2500);
    setShowKeyConfig(false);
  };

  const handleClearKey = () => {
    VaultStorage.clearAIApiKey();
    setApiKey('');
    setTempKeyInput('');
  };

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || isLoading) return;

    const userMsg: AIMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: Date.now()
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputQuery('');
    setIsLoading(true);

    try {
      const response = await aiService.generateResponse(newHistory, holdings, apiKey);

      const assistantMsg: AIMessage = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: response.text,
        isInterception: response.isInterception,
        source: response.source,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ **Processing Notice**: ${err.message || 'Unable to complete request. Falling back to local intelligence.'}`,
          timestamp: Date.now()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `msg-reset-${Date.now()}`,
        sender: 'assistant',
        text: `Conversation restarted. Active context initialized for **${holdings.length} positions**.\n\nHow can I help you analyze your portfolio today?`
      }
    ]);
  };

  const totalNetWorth = holdings.reduce((s, h) => s + h.currentValue, 0);

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div
        className="drawer-panel ai-drawer-panel"
        style={{ maxWidth: 'min(580px, 100%)', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="drawer-header" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--accent-surface)',
                border: '1px solid var(--accent-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-primary)',
                flexShrink: 0
              }}
            >
              <Sparkles size={16} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', letterSpacing: '-0.02em', margin: 0, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                  KoshQ AI
                </h3>
                <span
                  className="ai-active-badge"
                  style={{
                    fontSize: '9.5px',
                    fontWeight: '700',
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#10b981',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    letterSpacing: '0.02em',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                  <span className="ai-badge-text">{apiKey ? 'GEMINI 1.5' : 'AI ACTIVE'}</span>
                </span>
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Institutional Portfolio &amp; Financial Copilot
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <button
              onClick={() => setShowKeyConfig(!showKeyConfig)}
              className="btn btn-ghost btn-sm ai-key-btn"
              style={{
                fontSize: '11px',
                padding: '4px 8px',
                gap: 4,
                height: 28,
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: apiKey ? 'var(--color-gain)' : 'var(--text-secondary)'
              }}
              title="Configure Google Gemini API Key (Optional)"
            >
              <Key size={12} style={{ color: apiKey ? 'var(--color-gain)' : 'var(--text-muted)' }} />
              <span className="ai-key-btn-text">{apiKey ? 'Key' : 'API Key'}</span>
            </button>
            <button
              onClick={handleResetChat}
              className="btn btn-ghost btn-sm"
              style={{ padding: 5, height: 28, width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Reset Conversation"
            >
              <RotateCcw size={13} />
            </button>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm"
              style={{ padding: 5, height: 28, width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* API Key Configuration Dropdown Panel */}
        {showKeyConfig && (
          <div
            className="animate-fade-in"
            style={{
              background: 'var(--bg-subtle)',
              borderBottom: '1px solid var(--border-subtle)',
              padding: '12px 18px',
              fontSize: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Lock size={13} style={{ color: 'var(--accent-primary)' }} />
                Google Gemini API Key (Optional Personal Quota)
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '11px', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 3 }}
              >
                <span>Get Free Key (Google AI Studio)</span>
                <ExternalLink size={10} />
              </a>
            </div>

            <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: 10 }}>
              KoshQ AI is active and powered by default. You can optionally connect a personal Google Gemini API key if you wish to run extended analytical prompts using your personal developer quota. Keys are stored strictly on your device.
            </p>

            <form onSubmit={handleSaveKey} style={{ display: 'flex', gap: 8 }}>
              <input
                type="password"
                placeholder={apiKey ? 'AIzaSy... (API Key Active)' : 'Paste Gemini API Key (AIzaSy...)'}
                value={tempKeyInput}
                onChange={e => setTempKeyInput(e.target.value)}
                className="input-field"
                style={{ flex: 1, fontSize: '11px', height: 30 }}
              />
              <button type="submit" className="btn btn-primary btn-sm" style={{ height: 30, padding: '0 12px', fontSize: '11px' }}>
                Save Key
              </button>
              {apiKey && (
                <button
                  type="button"
                  onClick={handleClearKey}
                  className="btn btn-secondary btn-sm"
                  style={{ height: 30, padding: '0 10px', fontSize: '11px' }}
                  title="Remove Key"
                >
                  Clear
                </button>
              )}
            </form>

            {keySavedToast && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-gain)', fontSize: '11px', marginTop: 6, fontWeight: 600 }}>
                <Check size={12} />
                <span>API Key saved locally. Custom Gemini Live connection active!</span>
              </div>
            )}
          </div>
        )}

        {/* Active Context Banner */}
        <div
          style={{
            padding: '6px 16px',
            background: 'var(--bg-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '4px 8px',
            fontSize: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-gain)', flexShrink: 0 }} />
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
              Active Ledger Context:
            </span>
            <span style={{ color: 'var(--text-muted)' }}>
              {holdings.length} Positions • {formatINR(totalNetWorth, { compact: true })} Net Worth
            </span>
          </div>

          <span style={{ color: 'var(--text-muted)', fontSize: '9.5px', whiteSpace: 'nowrap' }}>
            SEBI Non-Intermediary
          </span>
        </div>

        {/* Message Stream */}
        <div
          ref={chatContainerRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            padding: '12px 16px',
            minHeight: 0
          }}
        >
          {messages.map(m => (
            <div
              key={m.id}
              style={{
                alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '92%',
                background: m.sender === 'user'
                  ? 'var(--accent-primary)'
                  : m.isInterception
                  ? 'rgba(217, 119, 6, 0.08)'
                  : 'var(--bg-surface)',
                border: m.sender === 'user'
                  ? 'none'
                  : m.isInterception
                  ? '1px solid rgba(217, 119, 6, 0.3)'
                  : '1px solid var(--border-subtle)',
                color: m.sender === 'user' ? '#ffffff' : 'var(--text-primary)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm, 8px)',
                fontSize: '12px',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                boxSizing: 'border-box',
                boxShadow: m.sender === 'assistant' ? 'var(--shadow-sm)' : 'none'
              }}
            >
              {m.isInterception && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: 'var(--color-warning)',
                    fontWeight: 700,
                    marginBottom: 6,
                    fontSize: '10px',
                    letterSpacing: '0.04em'
                  }}
                >
                  <AlertTriangle size={12} />
                  <span>REGULATORY INTENT REDIRECTION (SEBI RULE)</span>
                </div>
              )}

              {/* Render message text with simple bullet and bold formatting */}
              <div>{m.text}</div>

              {m.source && (
                <div style={{ fontSize: '9px', color: m.sender === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
                  {m.source === 'GEMINI_LIVE' ? 'KoshQ AI (Gemini 1.5 Live)' : 'KoshQ Portfolio Intelligence'}
                </div>
              )}
            </div>
          ))}

          {/* Thinking / Loading Indicator */}
          {isLoading && (
            <div
              style={{
                alignSelf: 'flex-start',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm, 8px)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '12px',
                color: 'var(--text-muted)'
              }}
            >
              <div className="pulse-live" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-primary)' }} />
              <span>Analyzing portfolio context & synthesizing answer...</span>
            </div>
          )}
        </div>

        {/* Suggested Quick Questions (Horizontally scrolling rail on mobile) */}
        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
          <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Portfolio Analytical Prompts
          </div>
          <div className="ai-prompts-rail">
            <button
              onClick={() => handleSend('Analyze concentration risk in my portfolio')}
              className="preset-chip"
              style={{ fontSize: '11px', whiteSpace: 'nowrap' }}
              disabled={isLoading}
            >
              Concentration Risk Diagnosis
            </button>
            <button
              onClick={() => handleSend('How do Budget 2024 LTCG and STCG tax rules impact my holdings?')}
              className="preset-chip"
              style={{ fontSize: '11px', whiteSpace: 'nowrap' }}
              disabled={isLoading}
            >
              Budget 2024 Tax Impact
            </button>
            <button
              onClick={() => handleSend('Provide a comprehensive analytical breakdown of my asset allocation and risk spread')}
              className="preset-chip"
              style={{ fontSize: '11px', whiteSpace: 'nowrap' }}
              disabled={isLoading}
            >
              Asset Allocation Breakdown
            </button>
            <button
              onClick={() => handleSend('Should I buy Reliance right now?')}
              className="preset-chip"
              style={{ fontSize: '11px', whiteSpace: 'nowrap', color: 'var(--color-warning)' }}
              disabled={isLoading}
              title="Tests the SEBI regulatory guardrail interception"
            >
              "Should I buy Reliance?" (Guardrail Test)
            </button>
          </div>
        </div>

        {/* Input Bar */}
        <div style={{ padding: '10px 16px max(12px, env(safe-area-inset-bottom, 0px)) 16px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
          <form onSubmit={e => { e.preventDefault(); handleSend(); }} style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Ask an analytical or conceptual question about your portfolio..."
              value={inputQuery}
              onChange={e => setInputQuery(e.target.value)}
              className="input-field"
              style={{ flex: 1, fontSize: '12px', height: 34 }}
              disabled={isLoading}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '0 14px', height: 34 }}
              disabled={!inputQuery.trim() || isLoading}
            >
              <Send size={14} />
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '9.5px', color: 'var(--text-muted)' }}>
              <ShieldCheck size={11} style={{ color: 'var(--accent-primary)' }} />
              <span>Zero-Egress: In-memory analytical processing. Zero external storage.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
