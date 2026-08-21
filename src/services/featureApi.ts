/**
 * Trip Tracker 2026 - Feature Additions Tracker API Service
 *
 * Parallel system to bugApi.ts / the Bug Ledger (see migration 0063):
 * backed by public.features, superadmin-only visibility, any authenticated
 * user can submit a request via the submit_feature_request RPC. Falls back
 * to per-browser localStorage only when no real Supabase project is
 * configured (isMissingSupabaseEnv), same trust level as the rest of the
 * app's dev fallbacks.
 */

import { supabase, isMissingSupabaseEnv } from './supabaseClient';
import type { Database } from '../types/database';

export interface FeatureRecord {
  id: string;
  title: string;
  description: string;
  category: 'ui-ux' | 'analytics' | 'admin' | 'sync' | 'notifications' | 'security' | 'performance' | 'native' | 'general';
  status: 'requested' | 'planned' | 'in_progress' | 'shipped' | 'wont_do';
  requestedBy: string;
  environment: {
    platform: 'web' | 'android' | 'ios';
    browser?: string;
    route?: string;
  };
  createdAt: string;
  updatedAt: string;
  shippedAt?: string;
  shippedBy?: string;
  shippedNote?: string;
  // Optional link to an existing FeatureFlagKey (utils/featureFlags.ts) so
  // the Ops Deck Features tab can show/flip the flag inline. Only ever
  // points at a flag key that already exists in code -- see migration 0063.
  linkedFlagKey?: string;
}

const STORAGE_KEY = 'trip-tracker-local-features';

type FeatureRow = Database['public']['Tables']['features']['Row'];

function mapRow(row: FeatureRow): FeatureRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    status: row.status,
    requestedBy: row.requested_by,
    environment: row.environment as FeatureRecord['environment'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    shippedAt: row.shipped_at ?? undefined,
    shippedBy: row.shipped_by ?? undefined,
    shippedNote: row.shipped_note ?? undefined,
    linkedFlagKey: row.linked_flag_key ?? undefined,
  };
}

function nextFeatureId(existingIds: string[]): string {
  let maxNum = 0;
  for (const id of existingIds) {
    const m = id.match(/^FEAT-(\d+)$/i);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  }
  return `FEAT-${String(maxNum + 1).padStart(3, '0')}`;
}

function readLocalFallback(): FeatureRecord[] {
  try {
    const local = localStorage.getItem(STORAGE_KEY);
    return local ? JSON.parse(local) : [];
  } catch {
    return [];
  }
}

function writeLocalFallback(features: FeatureRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(features));
}

export async function fetchFeatures(): Promise<FeatureRecord[]> {
  if (isMissingSupabaseEnv) return readLocalFallback();

  const { data, error } = await supabase.from('features').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function createFeatureRequest(feature: Partial<FeatureRecord>): Promise<FeatureRecord> {
  const environment = feature.environment || {
    platform: 'web' as const,
    route: typeof window !== 'undefined' ? window.location.hash : '#/',
  };

  if (isMissingSupabaseEnv) {
    const existing = readLocalFallback();
    const now = new Date().toISOString();
    const newFeature: FeatureRecord = {
      id: nextFeatureId(existing.map((f) => f.id)),
      title: feature.title || 'Untitled Feature',
      description: feature.description || '',
      category: feature.category || 'general',
      status: 'requested',
      requestedBy: feature.requestedBy || 'traveler',
      environment,
      createdAt: now,
      updatedAt: now,
    };
    writeLocalFallback([...existing, newFeature]);
    return newFeature;
  }

  // SECURITY DEFINER RPC, not a direct insert -- computing the next
  // FEAT-XXX id and reading the row back after insert both need SELECT on
  // features, which normal (non-superadmin) users don't have. Same
  // reasoning as report_bug (migration 0059).
  const { data, error } = await supabase.rpc('submit_feature_request', {
    p_title: feature.title || 'Untitled Feature',
    p_description: feature.description || '',
    p_category: feature.category || 'general',
    p_requested_by: feature.requestedBy || 'traveler',
    p_environment: environment,
  });
  if (error) throw error;
  return mapRow(data);
}

export async function updateFeature(id: string, updates: Partial<FeatureRecord>): Promise<FeatureRecord | null> {
  if (isMissingSupabaseEnv) {
    const existing = readLocalFallback();
    const feature = existing.find((f) => f.id.toUpperCase() === id.toUpperCase());
    if (!feature) return null;
    const now = new Date().toISOString();
    const updatedFeature: FeatureRecord = {
      ...feature,
      ...updates,
      updatedAt: now,
      ...(updates.status === 'shipped' && !feature.shippedAt ? { shippedAt: now } : {}),
    };
    writeLocalFallback(existing.map((f) => (f.id.toUpperCase() === id.toUpperCase() ? updatedFeature : f)));
    return updatedFeature;
  }

  const payload: Database['public']['Tables']['features']['Update'] = { updated_at: new Date().toISOString() };
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.category !== undefined) payload.category = updates.category;
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.shippedBy !== undefined) payload.shipped_by = updates.shippedBy;
  if (updates.shippedNote !== undefined) payload.shipped_note = updates.shippedNote;
  if (updates.shippedAt !== undefined) payload.shipped_at = updates.shippedAt;
  if (updates.status === 'shipped') payload.shipped_at = updates.shippedAt || new Date().toISOString();
  if (updates.linkedFlagKey !== undefined) payload.linked_flag_key = updates.linkedFlagKey || null;

  const { data, error } = await supabase
    .from('features')
    .update(payload)
    .eq('id', id.toUpperCase())
    .select()
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function deleteFeature(id: string): Promise<boolean> {
  if (isMissingSupabaseEnv) {
    const existing = readLocalFallback();
    writeLocalFallback(existing.filter((f) => f.id.toUpperCase() !== id.toUpperCase()));
    return true;
  }

  const { error } = await supabase.from('features').delete().eq('id', id.toUpperCase());
  if (error) throw error;
  return true;
}
