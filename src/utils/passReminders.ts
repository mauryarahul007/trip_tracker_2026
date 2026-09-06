import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { TravelPass } from '../types';
import { showBrowserNotification } from './webNotifications';

const PREF_KEY = 'trip-tracker-pass-reminders-v1';
const WEB_SCHEDULE_KEY = 'trip-tracker-pass-reminder-schedule-v1';

type WebReminder = {
  id: string;
  passId: string;
  tripId: string;
  title: string;
  body: string;
  fireAt: number;
};

function hashNotificationId(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  // Capacitor requires positive 32-bit ints
  return (Math.abs(h) % 2_000_000_000) + 1;
}

export function isPassRemindersEnabled(): boolean {
  try {
    const v = localStorage.getItem(PREF_KEY);
    if (v === null) return true;
    return v !== '0' && v !== 'false';
  } catch {
    return true;
  }
}

export function setPassRemindersEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(PREF_KEY, enabled ? '1' : '0');
  } catch {
    // ignore
  }
}

function loadWebSchedule(): WebReminder[] {
  try {
    const raw = localStorage.getItem(WEB_SCHEDULE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveWebSchedule(items: WebReminder[]): void {
  try {
    localStorage.setItem(WEB_SCHEDULE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function reminderOffsetsMs(pass: TravelPass): number[] {
  if (pass.type === 'flight' || pass.type === 'train') {
    return [24 * 60 * 60 * 1000, 3 * 60 * 60 * 1000];
  }
  return [24 * 60 * 60 * 1000];
}

function reminderLabel(offsetMs: number): string {
  if (offsetMs >= 24 * 60 * 60 * 1000) return 'in 24 hours';
  if (offsetMs >= 3 * 60 * 60 * 1000) return 'in 3 hours';
  return 'soon';
}

export async function cancelPassReminders(passId: string): Promise<void> {
  // Cancel both possible slots (24h + 3h) regardless of pass type.
  const allIds = [0, 1].map((i) => hashNotificationId(`${passId}-${i}`));

  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.cancel({ notifications: allIds.map((id) => ({ id })) });
    } catch {
      // Plugin unavailable / permission denied
    }
  }

  saveWebSchedule(loadWebSchedule().filter((r) => r.passId !== passId));
}

export async function schedulePassReminders(pass: TravelPass, tripName: string): Promise<void> {
  if (!isPassRemindersEnabled()) return;
  if (!pass.startDateTime) return;

  const start = Date.parse(pass.startDateTime);
  if (!Number.isFinite(start)) return;

  await cancelPassReminders(pass.id);

  const now = Date.now();
  const offsets = reminderOffsetsMs(pass);
  const title = pass.title || 'Travel pass';
  const nativeNotifications: { id: number; title: string; body: string; schedule: { at: Date }; extra: Record<string, string> }[] = [];
  const webItems = loadWebSchedule().filter((r) => r.passId !== pass.id);

  offsets.forEach((offset, index) => {
    const fireAt = start - offset;
    if (fireAt <= now + 30_000) return; // skip past / imminent

    const body = `${tripName}: ${title} departs ${reminderLabel(offset)}`;
    const id = hashNotificationId(`${pass.id}-${index}`);

    if (Capacitor.isNativePlatform()) {
      nativeNotifications.push({
        id,
        title: 'Pass reminder',
        body,
        schedule: { at: new Date(fireAt) },
        extra: { passId: pass.id, tripId: pass.tripId, kind: 'pass-reminder' },
      });
    } else {
      webItems.push({
        id: `${pass.id}-${index}`,
        passId: pass.id,
        tripId: pass.tripId,
        title: 'Pass reminder',
        body,
        fireAt,
      });
    }
  });

  if (nativeNotifications.length > 0) {
    try {
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display === 'granted') {
        await LocalNotifications.schedule({ notifications: nativeNotifications });
      }
    } catch (e) {
      console.warn('Failed to schedule pass reminders:', e);
    }
  }

  saveWebSchedule(webItems);
}

export async function rescheduleTripPassReminders(
  passes: TravelPass[] | undefined,
  tripName: string
): Promise<void> {
  if (!passes?.length) return;
  for (const pass of passes) {
    await schedulePassReminders(pass, tripName);
  }
}

/** Fire any due web/PWA reminders (call on focus / interval). */
export function flushDueWebPassReminders(): void {
  if (Capacitor.isNativePlatform()) return;
  if (!isPassRemindersEnabled()) return;
  const now = Date.now();
  const items = loadWebSchedule();
  const due = items.filter((r) => r.fireAt <= now);
  if (due.length === 0) return;
  for (const r of due) {
    try {
      showBrowserNotification(r.title, r.body);
    } catch {
      // ignore
    }
  }
  saveWebSchedule(items.filter((r) => r.fireAt > now));
}

let webFlushBound = false;
export function bindWebPassReminderFlush(): void {
  if (webFlushBound || typeof window === 'undefined') return;
  webFlushBound = true;
  const tick = () => flushDueWebPassReminders();
  window.addEventListener('focus', tick);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') tick();
  });
  window.setInterval(tick, 60_000);
  tick();
}
