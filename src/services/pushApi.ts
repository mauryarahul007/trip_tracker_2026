import { supabase } from './supabaseClient';

export async function sendPushNotification(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  if (userIds.length === 0) return;
  try {
    // supabase.functions.invoke resolves (doesn't throw) on a non-2xx
    // response — check `error` explicitly or a 403/500 from the Edge
    // Function goes unnoticed.
    const { error } = await supabase.functions.invoke('send-push', { body: { userIds, title, body, data } });
    if (error) {
      console.error('Push notification failed:', error);
    }
  } catch (err) {
    // Push delivery is best-effort — never block or fail the caller's primary action.
    console.error('Push notification failed:', err);
  }
}
