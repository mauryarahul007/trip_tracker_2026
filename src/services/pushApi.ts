import { supabase } from './supabaseClient';

export type SendPushResult = { ok: true } | { ok: false; rateLimited: boolean; error: string };

export async function sendPushNotification(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
  tripId?: string
): Promise<SendPushResult> {
  if (userIds.length === 0) return { ok: false, rateLimited: false, error: 'No recipients' };
  try {
    // supabase.functions.invoke resolves (doesn't throw) on a non-2xx
    // response — check `error` explicitly or a 403/500 from the Edge
    // Function goes unnoticed.
    const { error } = await supabase.functions.invoke('send-push', { body: { userIds, title, body, data, tripId } });
    if (error) {
      // FunctionsHttpError carries the raw Response on `.context` — the
      // actual {error, rateLimited} JSON body isn't parsed automatically.
      const context = (error as { context?: Response }).context;
      const parsed = context ? await context.json().catch(() => null) : null;
      console.error('Push notification failed:', parsed?.error || error);
      return { ok: false, rateLimited: Boolean(parsed?.rateLimited), error: parsed?.error || error.message };
    }
    return { ok: true };
  } catch (err) {
    // Push delivery is best-effort — never block or fail the caller's primary action.
    console.error('Push notification failed:', err);
    return { ok: false, rateLimited: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
