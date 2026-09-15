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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'msg-init',
      sender: 'assistant',
      text: `Hello. I am the **KoshQ Sovereign AI Analyst**.\n\nI have active context of your **${holdings.length} portfolio positions** totaling **${formatINR(holdings.reduce((s, h) => s + h.currentValue, 0))}**. I can analyze your asset allocation, calculate risk concentration, explain corporate financial statements, and model tax scenarios.\n\n*Note: Operating strictly under SEBI non-intermediary guidelines. I do not provide speculative buy/sell calls, target prices, or trading tips.*`
    }
  ]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
          text: `⚠️ **Processing Error**: ${err.message || 'Unable to generate response. Please verify your connection or Gemini API key.'}`,
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
        className="drawer-panel"
        style={{ maxWidth: 'min(580px, 100%)', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="drawer-header" style={{ padding: '12px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                color: 'var(--accent-primary)'
              }}
            >
              <Sparkles size={16} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', letterSpacing: '-0.02em', margin: 0 }}>
                  KoshQ Sovereign AI
                </h3>
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: '700',
                    padding: '1px 5px',
                    borderRadius: 3,
                    background: apiKey ? 'rgba(5, 150, 105, 0.12)' : 'var(--bg-subtle)',
                    color: apiKey ? 'var(--color-gain)' : 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  {apiKey ? 'GEMINI 1.5 LIVE' : 'OFFLINE HEURISTIC'}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 1 }}>
                Client-Side Sovereign Financial Analyst
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setShowKeyConfig(!showKeyConfig)}
              className={`btn btn-sm ${apiKey ? 'btn-secondary' : 'btn-primary'}`}
              style={{ fontSize: '11px', padding: '3px 8px', gap: 4, height: 26 }}
              title="Configure Google Gemini API Key"
            >
              <Key size={12} />
              <span>{apiKey ? 'API Key' : 'Connect Key'}</span>
            </button>
            <button
              onClick={handleResetChat}
              className="btn btn-ghost btn-sm"
              style={{ padding: 5, height: 26 }}
              title="Reset Conversation"
            >
              <RotateCcw size={13} />
            </button>
            <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: 5, height: 26 }}>
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
                Google Gemini API Key (Client-Side Storage)
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '11px', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 3 }}
              >
                <span>Get Free Key (30s)</span>
                <ExternalLink size={10} />
              </a>
            </div>

            <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: 10 }}>
              Your API key is stored <strong>exclusively in your browser's localStorage</strong>. Requests call Google Gemini directly from your device with zero data stored on any KoshQ server.
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
                  title="Remove Key and return to offline heuristic mode"
                >
                  Clear
                </button>
              )}
            </form>

            {keySavedToast && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-gain)', fontSize: '11px', marginTop: 6, fontWeight: 600 }}>
                <Check size={12} />
                <span>API Key saved locally. Gemini Live connection active!</span>
              </div>
            )}
          </div>
        )}

        {/* Active Context Banner */}
        <div
          style={{
            padding: '6px 18px',
            background: 'var(--bg-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-gain)' }} />
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
              Active Ledger Context:
            </span>
            <span style={{ color: 'var(--text-muted)' }}>
              {holdings.length} Positions • {formatINR(totalNetWorth, { compact: true })} Net Worth
            </span>
          </div>

          <span style={{ color: 'var(--text-muted)' }}>
            SEBI Non-Intermediary
          </span>
        </div>

        {/* Message Stream */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            padding: '14px 18px'
          }}
        >
          {messages.map(m => (
            <div
              key={m.id}
              style={{
                alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '88%',
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
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
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
                  {m.source === 'GEMINI_LIVE' ? 'Generated by Gemini 1.5 Flash' : 'Generated by Client Heuristic'}
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
                borderRadius: 'var(--radius-sm)',
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

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Questions */}
        <div style={{ padding: '8px 18px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' }}>
            Portfolio Analytical Prompts
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              onClick={() => handleSend('Analyze concentration risk in my portfolio')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '10px', padding: '3px 8px', borderRadius: 4 }}
              disabled={isLoading}
            >
              Concentration Risk Diagnosis
            </button>
            <button
              onClick={() => handleSend('How do Budget 2024 LTCG and STCG tax rules impact my holdings?')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '10px', padding: '3px 8px', borderRadius: 4 }}
              disabled={isLoading}
            >
              Budget 2024 Tax Impact
            </button>
            <button
              onClick={() => handleSend('What is my equity vs debt allocation and how can I rebalance with SIPs?')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '10px', padding: '3px 8px', borderRadius: 4 }}
              disabled={isLoading}
            >
              Tax-Smart SIP Rebalancing
            </button>
            <button
              onClick={() => handleSend('Should I buy Reliance right now?')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '10px', padding: '3px 8px', borderRadius: 4, color: 'var(--color-warning)' }}
              disabled={isLoading}
              title="Tests the SEBI regulatory guardrail interception"
            >
              "Should I buy Reliance?" (Guardrail Test)
            </button>
          </div>
        </div>

        {/* Input Bar */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
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

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '10px', color: 'var(--text-muted)' }}>
              <ShieldCheck size={11} style={{ color: 'var(--accent-primary)' }} />
              <span>Zero-Egress: Financial data is processed in-memory. Zero storage on external servers.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
