// KoshQ Cloud Access & Multi-Tenant Authentication Modal
// Executive UI for Sign In, Account Creation, and Passwordless Magic Links

import React, { useState } from 'react';
import { useAuth } from '../../core/auth/AuthContext';
import { isCloudConfigured } from '../../core/supabase/supabaseClient';
import { ShieldCheck, Mail, Lock, User, ArrowRight, CheckCircle2, AlertCircle, Sparkles, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { signInWithEmail, signUpWithEmail, signInWithOtp, authError, clearAuthError } = useAuth();
  
  const [tab, setTab] = useState<'signin' | 'signup' | 'magic'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    clearAuthError();

    if (tab === 'signin') {
      const res = await signInWithEmail(email, password);
      setLoading(false);
      if (res.success) {
        onSuccess?.();
        onClose();
      }
    } else if (tab === 'signup') {
      const res = await signUpWithEmail(email, password, fullName);
      setLoading(false);
      if (res.success) {
        setSignupSuccess(true);
        onSuccess?.();
      }
    } else if (tab === 'magic') {
      const res = await signInWithOtp(email);
      setLoading(false);
      if (res.success) {
        setMagicSent(true);
      }
    }
  };

  const hasCloudConfig = isCloudConfigured();

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '450px',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
        color: 'var(--text-primary)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--accent-surface)',
              border: '1px solid var(--accent-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)'
            }}>
              <User size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                Log In / Register
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Secure Cloud Sync • Multi-Device Portfolio Access
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background var(--transition-fast), color var(--transition-fast)'
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-subtle)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cloud Config Notice (If keys not yet configured) */}
        {!hasCloudConfig && (
          <div style={{
            margin: '16px 24px 0',
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: 'var(--color-warning-bg)',
            border: '1px solid var(--color-warning-border)',
            fontSize: '0.78rem',
            color: 'var(--color-warning)',
            lineHeight: 1.45
          }}>
            <strong>Supabase Setup Pending:</strong> Cloud authentication requires <code style={{ background: 'rgba(0,0,0,0.06)', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>VITE_SUPABASE_URL</code> and <code style={{ background: 'rgba(0,0,0,0.06)', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>VITE_SUPABASE_ANON_KEY</code>. You are currently operating in local ledger mode.
          </div>
        )}

        {/* Tab Switcher */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          padding: '4px',
          margin: '16px 24px 0',
          backgroundColor: 'var(--bg-subtle)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          gap: '4px'
        }}>
          <button
            type="button"
            onClick={() => { setTab('signin'); clearAuthError(); }}
            style={{
              padding: '8px 12px',
              border: tab === 'signin' ? '1px solid var(--border-subtle)' : '1px solid transparent',
              borderRadius: '6px',
              backgroundColor: tab === 'signin' ? 'var(--bg-surface)' : 'transparent',
              color: tab === 'signin' ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: tab === 'signin' ? 700 : 500,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              boxShadow: tab === 'signin' ? 'var(--shadow-sm)' : 'none',
              transition: 'all var(--transition-fast)'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('signup'); clearAuthError(); }}
            style={{
              padding: '8px 12px',
              border: tab === 'signup' ? '1px solid var(--border-subtle)' : '1px solid transparent',
              borderRadius: '6px',
              backgroundColor: tab === 'signup' ? 'var(--bg-surface)' : 'transparent',
              color: tab === 'signup' ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: tab === 'signup' ? 700 : 500,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              boxShadow: tab === 'signup' ? 'var(--shadow-sm)' : 'none',
              transition: 'all var(--transition-fast)'
            }}
          >
            Register
          </button>
          <button
            type="button"
            onClick={() => { setTab('magic'); clearAuthError(); }}
            style={{
              padding: '8px 12px',
              border: tab === 'magic' ? '1px solid var(--border-subtle)' : '1px solid transparent',
              borderRadius: '6px',
              backgroundColor: tab === 'magic' ? 'var(--bg-surface)' : 'transparent',
              color: tab === 'magic' ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: tab === 'magic' ? 700 : 500,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              boxShadow: tab === 'magic' ? 'var(--shadow-sm)' : 'none',
              transition: 'all var(--transition-fast)'
            }}
          >
            Magic Link
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px' }}>
          {authError && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              padding: '10px 12px',
              marginBottom: '16px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-loss-bg)',
              border: '1px solid var(--color-loss-border)',
              color: 'var(--color-loss)',
              fontSize: '0.8rem'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{authError}</span>
            </div>
          )}

          {magicSent ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <CheckCircle2 size={42} style={{ color: 'var(--color-gain)', margin: '0 auto 12px' }} />
              <h4 style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 700 }}>Magic Link Dispatched</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                We sent an instant sign-in link to <strong>{email}</strong>. Click the link in your email to access your portfolio.
              </p>
            </div>
          ) : signupSuccess ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <CheckCircle2 size={42} style={{ color: 'var(--color-gain)', margin: '0 auto 12px' }} />
              <h4 style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 700 }}>Account Created Successfully</h4>
              <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Your isolated portfolio profile is provisioned with Row-Level Security.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-primary"
                style={{
                  padding: '9px 22px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Enter Dashboard
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {tab === 'signup' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Full Name
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="e.g. Kshitij Anand"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 38px',
                        backgroundColor: 'var(--bg-subtle)',
                        border: '1px solid var(--border-default)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)'
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 1px var(--accent-primary)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Work / Personal Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 38px',
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border-default)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)'
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 1px var(--accent-primary)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              {tab !== 'magic' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Password
                    </label>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 38px',
                        backgroundColor: 'var(--bg-subtle)',
                        border: '1px solid var(--border-default)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)'
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 1px var(--accent-primary)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !hasCloudConfig}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '8px',
                  padding: '11px',
                  backgroundColor: hasCloudConfig ? 'var(--accent-primary)' : 'var(--bg-subtle)',
                  color: hasCloudConfig ? '#ffffff' : 'var(--text-muted)',
                  border: hasCloudConfig ? 'none' : '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: hasCloudConfig && !loading ? 'pointer' : 'not-allowed',
                  opacity: loading ? 0.7 : 1,
                  boxShadow: hasCloudConfig ? '0 2px 6px var(--accent-glow)' : 'none',
                  transition: 'all var(--transition-fast)'
                }}
              >
                {loading ? 'Authenticating...' : tab === 'signin' ? 'Sign In to KoshQ' : tab === 'signup' ? 'Create KoshQ Account' : 'Send Magic Link'}
                <ArrowRight size={16} />
              </button>

              <div style={{
                marginTop: '10px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-subtle)',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}>
                <ShieldCheck size={13} style={{ color: 'var(--accent-primary)' }} />
                <span>Encrypted at rest with AES-256 • Database Row-Level Security</span>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
