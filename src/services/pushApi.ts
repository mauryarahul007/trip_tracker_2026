import { supabase } from './supabaseClient';

export async function sendPushNotification(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  if (userIds.length === 0) return;
  try {
    await supabase.functions.invoke('send-push', { body: { userIds, title, body, data } });
  } catch (err) {
    // Push delivery is best-effort — never block or fail the caller's primary action.
    console.error('Push notification failed:', err);
  }
}
