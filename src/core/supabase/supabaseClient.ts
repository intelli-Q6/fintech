// KoshQ Supabase Client Initialization & Fallback Engine
// Connects to managed PostgreSQL, Auth, and Private Storage with zero local infrastructure

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve environment credentials securely
const envUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) || '';
const envAnonKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) || '';

export const isCloudConfigured = (): boolean => {
  return Boolean(envUrl && envAnonKey && envUrl.startsWith('https://'));
};

let clientInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  if (!isCloudConfigured()) {
    return null;
  }
  if (!clientInstance) {
    clientInstance = createClient(envUrl, envAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'koshq_cloud_session_v1'
      }
    });
  }
  return clientInstance;
};

// Export singleton
export const supabase = isCloudConfigured() ? getSupabase() : null;
