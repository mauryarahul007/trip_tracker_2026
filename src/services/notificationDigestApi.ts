import { supabase } from './supabaseClient';

export async function getDigestPreference(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('notification_digest_prefs')
    .select('enabled')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.enabled ?? false;
}

export async function setDigestPreference(userId: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from('notification_digest_prefs')
    .upsert({ user_id: userId, enabled, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
}
