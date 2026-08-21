/**
 * Trip Tracker 2026 - Feature Flag Overrides API Service
 *
 * Backend for the Flags tab's global toggle + Per-Trip Override + Per-
 * Member Override (see migration 0064). Every client resolves its own
 * flags via get_resolved_feature_flags(); only a superadmin can see every
 * trip's/user's overrides (get_all_feature_flag_overrides, for the Ops
 * Deck's override panels) or write one (set_feature_flag_override).
 */

import { supabase, isMissingSupabaseEnv } from './supabaseClient';
import type { FeatureFlagKey } from '../types/admin';

export interface ResolvedFeatureFlags {
  global: Partial<Record<FeatureFlagKey, boolean>>;
  trip: Partial<Record<FeatureFlagKey, boolean>>;
  user: Partial<Record<FeatureFlagKey, boolean>>;
}

export async function fetchResolvedFeatureFlags(tripId: string | null): Promise<ResolvedFeatureFlags | null> {
  if (isMissingSupabaseEnv) return null;
  const { data, error } = await supabase.rpc('get_resolved_feature_flags', { p_trip_id: tripId });
  if (error) throw error;
  return (data as ResolvedFeatureFlags) ?? { global: {}, trip: {}, user: {} };
}

export interface FlagOverrideRow {
  scope: 'global' | 'trip' | 'user';
  scopeId: string;
  flagKey: FeatureFlagKey;
  value: boolean;
}

export async function fetchAllFeatureFlagOverrides(): Promise<FlagOverrideRow[]> {
  if (isMissingSupabaseEnv) return [];
  const { data, error } = await supabase.rpc('get_all_feature_flag_overrides');
  if (error) throw error;
  return (data ?? []).map((r) => ({
    scope: r.scope,
    scopeId: r.scope_id,
    flagKey: r.flag_key as FeatureFlagKey,
    value: r.value,
  }));
}

export async function setFeatureFlagOverride(
  scope: 'global' | 'trip' | 'user',
  scopeId: string,
  flagKey: FeatureFlagKey,
  value: boolean | null
): Promise<void> {
  if (isMissingSupabaseEnv) return;
  const { error } = await supabase.rpc('set_feature_flag_override', {
    p_scope: scope,
    p_scope_id: scopeId,
    p_flag_key: flagKey,
    p_value: value,
  });
  if (error) throw error;
}
