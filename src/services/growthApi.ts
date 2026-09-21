/**
 * Growth API (migration 0108). Public flag read + join-preview counter for the
 * signed-out invite/share pages, and the superadmin aggregates behind the Ops
 * Deck Retention / Reliability cards.
 */
import { supabase, isMissingSupabaseEnv } from './supabaseClient';

export interface PublicGrowthFlags {
  enableInviteConversion: boolean;
  enableGrowthTelemetry: boolean;
}

// Fail closed: on any error the invite/share pages render their original UI.
const FLAGS_OFF: PublicGrowthFlags = { enableInviteConversion: false, enableGrowthTelemetry: false };

export async function fetchPublicGrowthFlags(): Promise<PublicGrowthFlags> {
  if (isMissingSupabaseEnv) return FLAGS_OFF;
  const { data, error } = await supabase.rpc('get_public_growth_flags');
  if (error || !data) return FLAGS_OFF;
  return { ...FLAGS_OFF, ...data };
}

/** Counts a signed-out invite preview. The server no-ops unless Growth Telemetry is ON. */
export async function recordJoinPreview(code: string): Promise<void> {
  if (isMissingSupabaseEnv) return;
  await supabase.rpc('record_join_preview', { p_code: code }).then(
    () => {},
    () => {}
  );
}

export interface RetentionCohortRow {
  cohortWeek: string;
  size: number;
  d1: { eligible: number; retained: number };
  d7: { eligible: number; retained: number };
  d30: { eligible: number; retained: number };
}

export async function fetchRetentionCohorts(weeks = 8): Promise<RetentionCohortRow[]> {
  const { data, error } = await supabase.rpc('admin_retention_cohorts', { p_weeks: weeks });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    cohortWeek: r.cohort_week,
    size: r.cohort_size,
    d1: { eligible: r.d1_eligible, retained: r.d1_retained },
    d7: { eligible: r.d7_eligible, retained: r.d7_retained },
    d30: { eligible: r.d30_eligible, retained: r.d30_retained },
  }));
}

export async function fetchRepeatCreatorRate(): Promise<{ eligible: number; repeat: number }> {
  const { data, error } = await supabase.rpc('admin_repeat_creator_rate');
  if (error) throw error;
  const row = data?.[0];
  return { eligible: row?.creators_eligible ?? 0, repeat: row?.repeat_creators ?? 0 };
}

export interface ReliabilityRow {
  platform: string;
  appVersion: string;
  event: string;
  events: number;
  users: number;
}

export async function fetchReliabilitySummary(days = 14): Promise<ReliabilityRow[]> {
  const { data, error } = await supabase.rpc('admin_reliability_summary', { p_days: days });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    platform: r.platform,
    appVersion: r.app_version,
    event: r.event,
    events: Number(r.events),
    users: Number(r.users),
  }));
}

export interface ReliabilityGroup {
  platform: string;
  appVersion: string;
  openUsers: number;
  stuckUsers: number;
  failUsers: number;
}

/** Folds the per-event rows into one line per platform + app version. */
export function groupReliability(rows: ReliabilityRow[]): ReliabilityGroup[] {
  const map = new Map<string, ReliabilityGroup>();
  for (const r of rows) {
    const key = `${r.platform}|${r.appVersion}`;
    const g = map.get(key) ?? { platform: r.platform, appVersion: r.appVersion, openUsers: 0, stuckUsers: 0, failUsers: 0 };
    if (r.event === 'app_open') g.openUsers = r.users;
    else if (r.event === 'queue_stuck') g.stuckUsers = r.users;
    else if (r.event === 'sync_fail') g.failUsers = r.users;
    map.set(key, g);
  }
  return [...map.values()];
}
