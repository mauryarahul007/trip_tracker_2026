/**
 * Trip Tracker 2026 - Bug Tracker API Service
 *
 * Backed by the public.bugs Supabase table (see migration 0055) so every
 * superadmin, on every device, sees the same ledger. Falls back to
 * per-browser localStorage only when no real Supabase project is
 * configured (isMissingSupabaseEnv) -- offline/local demo convenience,
 * same trust level as the rest of the app's dev fallbacks.
 */

import { supabase, isMissingSupabaseEnv } from './supabaseClient';
import type { Database } from '../types/database';

export interface BugRecord {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category:
    | 'offline-sync'
    | 'splits-math'
    | 'ui-ux'
    | 'navigation'
    | 'auth'
    | 'receipts-camera'
    | 'p2p-sync'
    | 'performance'
    | 'general';
  status: 'open' | 'in_progress' | 'resolved' | 'wont_fix';
  foundBy: string;
  environment: {
    platform: 'web' | 'android' | 'ios';
    browser?: string;
    isOnline: boolean;
    appVersion: string;
    route?: string;
  };
  reproSteps: string[];
  expectedBehavior: string;
  actualBehavior: string;
  diagnostics?: {
    stackTrace?: string;
    consoleLogs?: string[];
    syncQueueLength?: number;
    activeTripId?: string;
  };
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
}

const STORAGE_KEY = 'trip-tracker-local-bugs';

interface BugRow {
  id: string;
  title: string;
  description: string;
  severity: BugRecord['severity'];
  category: BugRecord['category'];
  status: BugRecord['status'];
  found_by: string;
  environment: BugRecord['environment'];
  repro_steps: string[];
  expected_behavior: string;
  actual_behavior: string;
  diagnostics: BugRecord['diagnostics'] | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
}

function mapRow(row: BugRow): BugRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    severity: row.severity,
    category: row.category,
    status: row.status,
    foundBy: row.found_by,
    environment: row.environment,
    reproSteps: row.repro_steps,
    expectedBehavior: row.expected_behavior,
    actualBehavior: row.actual_behavior,
    diagnostics: row.diagnostics ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at ?? undefined,
    resolvedBy: row.resolved_by ?? undefined,
    resolutionNote: row.resolution_note ?? undefined,
  };
}

function nextBugId(existingIds: string[]): string {
  let maxNum = 0;
  for (const id of existingIds) {
    const m = id.match(/^BUG-(\d+)$/i);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  }
  return `BUG-${String(maxNum + 1).padStart(3, '0')}`;
}

function readLocalFallback(): BugRecord[] {
  try {
    const local = localStorage.getItem(STORAGE_KEY);
    return local ? JSON.parse(local) : [];
  } catch {
    return [];
  }
}

function writeLocalFallback(bugs: BugRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bugs));
}

export async function fetchBugs(): Promise<BugRecord[]> {
  if (isMissingSupabaseEnv) return readLocalFallback();

  const { data, error } = await supabase.from('bugs').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function createBug(bug: Partial<BugRecord>): Promise<BugRecord> {
  const environment = bug.environment || {
    platform: 'web' as const,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    appVersion: '1.0.0',
    route: typeof window !== 'undefined' ? window.location.hash : '#/',
  };

  if (isMissingSupabaseEnv) {
    const existing = readLocalFallback();
    const now = new Date().toISOString();
    const newBug: BugRecord = {
      id: nextBugId(existing.map((b) => b.id)),
      title: bug.title || 'Untitled Bug',
      description: bug.description || '',
      severity: bug.severity || 'medium',
      category: bug.category || 'general',
      status: bug.status || 'open',
      foundBy: bug.foundBy || 'superadmin-ui',
      environment,
      reproSteps: bug.reproSteps || [],
      expectedBehavior: bug.expectedBehavior || '',
      actualBehavior: bug.actualBehavior || '',
      diagnostics: bug.diagnostics || {},
      createdAt: now,
      updatedAt: now,
    };
    writeLocalFallback([...existing, newBug]);
    return newBug;
  }

  // A SECURITY DEFINER RPC, not a direct insert: computing the next BUG-XXX
  // id and reading the row back after insert both need SELECT on bugs,
  // which normal (non-superadmin) users don't have -- see migration 0059.
  // Superadmins go through the same call too; the RPC works for both.
  const { data, error } = await supabase.rpc('report_bug', {
    p_title: bug.title || 'Untitled Bug',
    p_description: bug.description || '',
    p_severity: bug.severity || 'medium',
    p_category: bug.category || 'general',
    p_found_by: bug.foundBy || 'superadmin-ui',
    p_environment: environment,
    p_repro_steps: bug.reproSteps || [],
    p_expected_behavior: bug.expectedBehavior || '',
    p_actual_behavior: bug.actualBehavior || '',
    p_diagnostics: bug.diagnostics || {},
  });
  if (error) throw error;
  return mapRow(data);
}

export async function updateBug(id: string, updates: Partial<BugRecord>): Promise<BugRecord | null> {
  if (isMissingSupabaseEnv) {
    const existing = readLocalFallback();
    const bug = existing.find((b) => b.id.toUpperCase() === id.toUpperCase());
    if (!bug) return null;
    const now = new Date().toISOString();
    const updatedBug: BugRecord = {
      ...bug,
      ...updates,
      updatedAt: now,
      ...(updates.status === 'resolved' && !bug.resolvedAt ? { resolvedAt: now } : {}),
    };
    writeLocalFallback(existing.map((b) => (b.id.toUpperCase() === id.toUpperCase() ? updatedBug : b)));
    return updatedBug;
  }

  const payload: Database['public']['Tables']['bugs']['Update'] = { updated_at: new Date().toISOString() };
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.severity !== undefined) payload.severity = updates.severity;
  if (updates.category !== undefined) payload.category = updates.category;
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.resolvedBy !== undefined) payload.resolved_by = updates.resolvedBy;
  if (updates.resolutionNote !== undefined) payload.resolution_note = updates.resolutionNote;
  if (updates.resolvedAt !== undefined) payload.resolved_at = updates.resolvedAt;
  if (updates.status === 'resolved') payload.resolved_at = updates.resolvedAt || new Date().toISOString();

  const { data, error } = await supabase
    .from('bugs')
    .update(payload)
    .eq('id', id.toUpperCase())
    .select()
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function deleteBug(id: string): Promise<boolean> {
  if (isMissingSupabaseEnv) {
    const existing = readLocalFallback();
    writeLocalFallback(existing.filter((b) => b.id.toUpperCase() !== id.toUpperCase()));
    return true;
  }

  const { error } = await supabase.from('bugs').delete().eq('id', id.toUpperCase());
  if (error) throw error;
  return true;
}
