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
        backgroundColor: 'var(--surface, #0f172a)',
        border: '1px solid var(--border-subtle, #334155)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '460px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--border-subtle, #1e293b)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text, #f8fafc)' }}>
                KoshQ Cloud Vault
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                PostgreSQL RLS Protected • Zero Local Servers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted, #94a3b8)',
              cursor: 'pointer',
              padding: '6px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Cloud Config Warning (If keys not yet configured) */}
        {!hasCloudConfig && (
          <div style={{
            margin: '16px 24px 0',
            padding: '12px 14px',
            borderRadius: '8px',
            backgroundColor: 'rgba(234, 179, 8, 0.1)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            fontSize: '0.8rem',
            color: '#facc15',
            lineHeight: 1.4
          }}>
            <strong>Supabase Keys Pending:</strong> Set <code style={{ color: '#fff' }}>VITE_SUPABASE_URL</code> and <code style={{ color: '#fff' }}>VITE_SUPABASE_ANON_KEY</code> in your environment variables to enable live cloud authentication. Operating currently in sovereign local guest mode.
          </div>
        )}

        {/* Tab Switcher */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          padding: '4px',
          margin: '16px 24px 0',
          backgroundColor: 'var(--background, #020617)',
          borderRadius: '8px',
          gap: '4px'
        }}>
          <button
            type="button"
            onClick={() => { setTab('signin'); clearAuthError(); }}
            style={{
              padding: '8px 12px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: tab === 'signin' ? 'var(--surface-active, #1e293b)' : 'transparent',
              color: tab === 'signin' ? 'var(--text, #fff)' : 'var(--text-muted, #94a3b8)',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('signup'); clearAuthError(); }}
            style={{
              padding: '8px 12px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: tab === 'signup' ? 'var(--surface-active, #1e293b)' : 'transparent',
              color: tab === 'signup' ? 'var(--text, #fff)' : 'var(--text-muted, #94a3b8)',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            Register
          </button>
          <button
            type="button"
            onClick={() => { setTab('magic'); clearAuthError(); }}
            style={{
              padding: '8px 12px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: tab === 'magic' ? 'var(--surface-active, #1e293b)' : 'transparent',
              color: tab === 'magic' ? 'var(--text, #fff)' : 'var(--text-muted, #94a3b8)',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer'
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
              borderRadius: '6px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '0.8rem'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{authError}</span>
            </div>
          )}

          {magicSent ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <CheckCircle2 size={42} style={{ color: '#10b981', margin: '0 auto 12px' }} />
              <h4 style={{ margin: '0 0 8px', color: '#fff', fontSize: '1rem' }}>Magic Link Dispatched</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                We sent an instant sign-in link to <strong>{email}</strong>. Click the link in your email to access your vault.
              </p>
            </div>
          ) : signupSuccess ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <CheckCircle2 size={42} style={{ color: '#10b981', margin: '0 auto 12px' }} />
              <h4 style={{ margin: '0 0 8px', color: '#fff', fontSize: '1rem' }}>Account Created Successfully</h4>
              <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#94a3b8' }}>
                Your isolated multi-tenant profile is provisioned with Row-Level Security.
              </p>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '8px 20px',
                  backgroundColor: 'var(--primary, #0284c7)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Enter Dashboard
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {tab === 'signup' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)', marginBottom: '6px' }}>
                    Full Name
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }} />
                    <input
                      type="text"
                      placeholder="e.g. Kshitij Anand"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 38px',
                        backgroundColor: 'var(--background, #020617)',
                        border: '1px solid var(--border, #334155)',
                        borderRadius: '6px',
                        color: 'var(--text, #fff)',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)', marginBottom: '6px' }}>
                  Work / Personal Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }} />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 38px',
                      backgroundColor: 'var(--background, #020617)',
                      border: '1px solid var(--border, #334155)',
                      borderRadius: '6px',
                      color: 'var(--text, #fff)',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {tab !== 'magic' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)' }}>
                      Password
                    </label>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }} />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 38px',
                        backgroundColor: 'var(--background, #020617)',
                        border: '1px solid var(--border, #334155)',
                        borderRadius: '6px',
                        color: 'var(--text, #fff)',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
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
                  marginTop: '10px',
                  padding: '12px',
                  backgroundColor: hasCloudConfig ? 'var(--primary, #0284c7)' : '#475569',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: hasCloudConfig && !loading ? 'pointer' : 'not-allowed',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Authenticating...' : tab === 'signin' ? 'Sign In to Vault' : tab === 'signup' ? 'Create Multi-Tenant Account' : 'Send Passwordless Link'}
                <ArrowRight size={16} />
              </button>

              <div style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-subtle, #1e293b)',
                fontSize: '0.75rem',
                color: 'var(--text-muted, #64748b)',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}>
                <Sparkles size={12} style={{ color: '#0ea5e9' }} />
                <span>Encrypted at rest with AES-256 • Database Row-Level Security</span>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
