import { supabase } from './supabaseClient';

export interface QuietHoursPreference {
  enabled: boolean;
  startTime: string; // "HH:MM", local time
  endTime: string; // "HH:MM", local time
  timezone: string; // IANA, e.g. "Asia/Kolkata"
}

const DEFAULTS: QuietHoursPreference = { enabled: false, startTime: '22:00', endTime: '07:00', timezone: 'UTC' };

export async function getQuietHoursPreference(userId: string): Promise<QuietHoursPreference> {
  const { data, error } = await supabase
    .from('quiet_hours_prefs')
    .select('enabled, start_time, end_time, timezone')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULTS;
  return { enabled: data.enabled, startTime: data.start_time, endTime: data.end_time, timezone: data.timezone };
}

export async function setQuietHoursPreference(userId: string, pref: QuietHoursPreference): Promise<void> {
  const { error } = await supabase.from('quiet_hours_prefs').upsert(
    {
      user_id: userId,
      enabled: pref.enabled,
      start_time: pref.startTime,
      end_time: pref.endTime,
      timezone: pref.timezone,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (error) throw error;
}
