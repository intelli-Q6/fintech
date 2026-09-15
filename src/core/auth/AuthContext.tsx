// KoshQ Cloud Authentication & Session Context
// Coordinates Supabase Auth, Multi-Device Cloud Sync, and Local Sovereign Fallback

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSupabase, isCloudConfigured } from '../supabase/supabaseClient';
import { MigrationService, MigrationReport } from '../services/migrationService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isCloudActive: boolean;
  isLoading: boolean;
  authError: string | null;
  signInWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (email: string, pass: string, fullName?: string) => Promise<{ success: boolean; error?: string }>;
  signInWithOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
  migrateToCloud: () => Promise<MigrationReport>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const supabase = getSupabase();
  const isCloudActive = Boolean(isCloudConfigured() && user);

  useEffect(() => {
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsLoading(false);
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
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: pass,
        options: {
          data: { full_name: fullName?.trim() || email.split('@')[0] }
        }
      });
      if (error) {
        setAuthError(error.message);
        return { success: false, error: error.message };
      }
      setUser(data.user);
      setSession(data.session);
      return { success: true };
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
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: window.location.origin }
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

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
  };

  const clearAuthError = () => setAuthError(null);

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
        signInWithEmail,
        signUpWithEmail,
        signInWithOtp,
        signOut,
        clearAuthError,
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
