// KoshQ Cloud Authentication & Session Context
// Coordinates Supabase Auth, Multi-Device Cloud Sync, and Local Sovereign Fallback

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSupabase, isCloudConfigured } from '../supabase/supabaseClient';
import { MigrationService, MigrationReport } from '../services/migrationService';

export interface AuthNotice {
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isCloudActive: boolean;
  isLoading: boolean;
  authError: string | null;
  authNotice: AuthNotice | null;
  signInWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (email: string, pass: string, fullName?: string) => Promise<{ success: boolean; needsConfirmation?: boolean; userAlreadyExists?: boolean; error?: string }>;
  signInWithOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  resendConfirmationEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
  clearAuthNotice: () => void;
  migrateToCloud: () => Promise<MigrationReport>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<AuthNotice | null>(null);

  const supabase = getSupabase();
  const isCloudActive = Boolean(isCloudConfigured() && user);

  useEffect(() => {
    // 0. Inspect incoming URL hash / query parameters (e.g. from Supabase email verification callbacks or expired links)
    if (typeof window !== 'undefined') {
      try {
        const hash = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : '';
        const search = window.location.search.startsWith('?') ? window.location.search.substring(1) : '';
        const hashParams = new URLSearchParams(hash);
        const searchParams = new URLSearchParams(search);

        const errorCode = hashParams.get('error_code') || searchParams.get('error_code');
        const errorDesc = hashParams.get('error_description') || searchParams.get('error_description') || hashParams.get('error') || searchParams.get('error');

        if (errorCode || errorDesc) {
          const raw = errorDesc ? decodeURIComponent(errorDesc).replace(/\+/g, ' ') : '';
          let msg = raw || 'Authentication link failed or is invalid.';
          if (errorCode === 'otp_expired' || raw.toLowerCase().includes('expired')) {
            msg = 'Your email confirmation link has expired or has already been used. Please sign in or request a fresh confirmation link.';
          } else if (errorCode === 'access_denied' || raw.toLowerCase().includes('denied')) {
            msg = 'Authentication request was denied. Please verify your credentials and try again.';
          }
          setAuthNotice({ type: 'error', message: msg });

          // Clean URL hash so the user doesn't see raw #error=...
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState(null, '', cleanUrl);
        } else if (hash.includes('access_token=') && hash.includes('type=signup')) {
          setAuthNotice({
            type: 'success',
            message: 'Email confirmed successfully! Your cloud account is now active.'
          });
          setTimeout(() => {
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState(null, '', cleanUrl);
          }, 2000);
        }
      } catch (err) {
        console.warn('[AuthContext] URL auth param parsing error:', err);
      }
    }

    if (!supabase) {
      setIsLoading(false);
      return;
    }

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session: initSession } }) => {
      setSession(initSession);
      setUser(initSession?.user ?? null);
      setIsLoading(false);
    }).catch(err => {
      console.warn('[AuthContext] Session retrieval error:', err);
      setIsLoading(false);
    });

    // 2. Listen to real-time auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsLoading(false);
      if (event === 'SIGNED_IN') {
        setAuthError(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signInWithEmail = async (email: string, pass: string) => {
    setAuthError(null);
    if (!supabase) {
      return { success: false, error: 'Cloud database is not configured in this environment.' };
    }
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass
      });
      if (error) {
        setAuthError(error.message);
        return { success: false, error: error.message };
      }
      setUser(data.user);
      setSession(data.session);
      return { success: true };
    } catch (e: any) {
      const msg = e?.message || 'Authentication error';
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  const signUpWithEmail = async (email: string, pass: string, fullName?: string) => {
    setAuthError(null);
    if (!supabase) {
      return { success: false, error: 'Cloud database is not configured in this environment.' };
    }
    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}` : undefined;
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: pass,
        options: {
          data: { full_name: fullName?.trim() || email.split('@')[0] },
          emailRedirectTo: redirectUrl
        }
      });
      if (error) {
        setAuthError(error.message);
        return { success: false, error: error.message };
      }

      // Check if user already exists (Supabase returns empty identities array when user enumeration protection is enabled)
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        const msg = 'An account with this email address already exists. Please Sign In instead.';
        setAuthError(msg);
        return { success: false, userAlreadyExists: true, error: msg };
      }

      setUser(data.user);
      setSession(data.session);

      const needsConfirmation = Boolean(data.user && !data.session);
      return { success: true, needsConfirmation };
    } catch (e: any) {
      const msg = e?.message || 'Sign up error';
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  const signInWithOtp = async (email: string) => {
    setAuthError(null);
    if (!supabase) {
      return { success: false, error: 'Cloud database is not configured.' };
    }
    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}` : undefined;
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectUrl }
      });
      if (error) {
        setAuthError(error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Magic link error' };
    }
  };

  const resendConfirmationEmail = async (email: string) => {
    setAuthError(null);
    if (!supabase) {
      return { success: false, error: 'Cloud database is not configured.' };
    }
    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}` : undefined;
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: { emailRedirectTo: redirectUrl }
      });
      if (error) {
        setAuthError(error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (e: any) {
      const msg = e?.message || 'Failed to resend confirmation email';
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
  };

  const clearAuthError = () => setAuthError(null);
  const clearAuthNotice = () => setAuthNotice(null);

  const migrateToCloud = async (): Promise<MigrationReport> => {
    return MigrationService.migrateLocalVaultToCloud();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isCloudActive,
        isLoading,
        authError,
        authNotice,
        signInWithEmail,
        signUpWithEmail,
        signInWithOtp,
        resendConfirmationEmail,
        signOut,
        clearAuthError,
        clearAuthNotice,
        migrateToCloud
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
