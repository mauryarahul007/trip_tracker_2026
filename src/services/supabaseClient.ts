import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isMissingSupabaseEnv =
  !supabaseUrl ||
  !supabaseAnonKey ||
  supabaseUrl.includes('dummy-project') ||
  supabaseUrl.includes('your-project-ref') ||
  supabaseUrl.includes('your-project.supabase.co') ||
  supabaseAnonKey === 'dummy-anon-key' ||
  supabaseAnonKey === 'your-anon-key' ||
  supabaseAnonKey === 'your-anon-public-key';

// Use dummy client values if variables are missing to prevent import evaluation crash
const activeUrl = isMissingSupabaseEnv ? 'https://dummy-project.supabase.co' : supabaseUrl;
const activeKey = isMissingSupabaseEnv ? 'dummy-anon-key' : supabaseAnonKey;

export const supabase = createClient<Database>(activeUrl, activeKey, {
  auth: {
    // PKCE is required on native (the custom URL scheme callback can't
    // use the implicit flow) but must stay scoped to native only — web
    // keeps Supabase's default implicit flow, unchanged.
    flowType: Capacitor.isNativePlatform() ? 'pkce' : 'implicit',
    detectSessionInUrl: !Capacitor.isNativePlatform(),
  },
});
