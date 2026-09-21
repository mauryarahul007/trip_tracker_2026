/**
 * Growth telemetry (flag: enableGrowthTelemetry, Ops pack). Sends four
 * content-free events to app_events: app_open (once per UTC day), and
 * sync_fail / queue_stuck / flush_ok (once per kind per session). Never
 * carries expense, member or search text. The DB also refuses inserts while
 * the flag is OFF (migration 0108), so a stale client cannot leak events.
 */
import { supabase } from '../services/supabaseClient';
import { WEB_APP_VERSION } from './appVersion';

export type GrowthEvent = 'app_open' | 'sync_fail' | 'queue_stuck' | 'flush_ok';

const OPEN_DAY_KEY = 'tt-growth-open-day';
const STUCK_AFTER_MS = 10 * 60 * 1000;
const STUCK_POLL_MS = 60 * 1000;

let enabled = false;
let currentUserId: string | null = null;
let stuckTimer: ReturnType<typeof setInterval> | null = null;
let stuckSince: number | null = null;
const sentThisSession = new Set<GrowthEvent>();

function platform(): 'web' | 'android' | 'ios' {
  const cap = typeof window !== 'undefined' ? (window as unknown as { Capacitor?: { getPlatform: () => string } }).Capacitor : undefined;
  const p = cap?.getPlatform();
  return p === 'android' || p === 'ios' ? p : 'web';
}

function send(event: GrowthEvent, extra?: Record<string, string>): void {
  if (!enabled || !currentUserId) return;
  void supabase
    .from('app_events' as never)
    .insert({
      user_id: currentUserId,
      event,
      props: { platform: platform(), appVersion: WEB_APP_VERSION, ...extra },
    } as never)
    .then(
      () => {},
      () => {}
    );
}

export function trackGrowthEvent(event: Exclude<GrowthEvent, 'app_open'>, extra?: Record<string, string>): void {
  if (sentThisSession.has(event)) return;
  sentThisSession.add(event);
  send(event, extra);
}

function trackAppOpenOncePerDay(): void {
  const today = new Date().toISOString().slice(0, 10);
  try {
    if (localStorage.getItem(OPEN_DAY_KEY) === today) return;
    localStorage.setItem(OPEN_DAY_KEY, today);
  } catch {
    /* storage blocked: the DB unique index still dedupes the day */
  }
  send('app_open');
}

/** Call whenever the flag or the signed-in user changes. Idempotent. */
export function configureGrowthTelemetry(on: boolean, userId: string | null, getQueueLength: () => number): void {
  const wasOn = enabled && currentUserId === userId;
  enabled = on && !!userId;
  currentUserId = userId;

  if (stuckTimer) {
    clearInterval(stuckTimer);
    stuckTimer = null;
  }
  stuckSince = null;
  if (!enabled) return;

  if (!wasOn) trackAppOpenOncePerDay();

  stuckTimer = setInterval(() => {
    if (!navigator.onLine || getQueueLength() === 0) {
      stuckSince = null;
      return;
    }
    stuckSince ??= Date.now();
    if (Date.now() - stuckSince >= STUCK_AFTER_MS) trackGrowthEvent('queue_stuck');
  }, STUCK_POLL_MS);
}
