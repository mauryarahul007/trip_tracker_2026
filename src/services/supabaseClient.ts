import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isMissingSupabaseEnv = !supabaseUrl || !supabaseAnonKey;

// Use dummy client values if variables are missing to prevent import evaluation crash
const activeUrl = isMissingSupabaseEnv ? 'https://dummy-project.supabase.co' : supabaseUrl;
const activeKey = isMissingSupabaseEnv ? 'dummy-anon-key' : supabaseAnonKey;

export const supabase = createClient<Database>(activeUrl, activeKey);
