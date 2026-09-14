// supabase/functions/send-digest/index.ts
// Triggered once daily by the pg_cron job in migration 0087
// (trigger_notification_digest -> net.http_post, authenticated with a
// shared secret rather than the full service-role key -- see that
// migration's header comment for the one-time Vault setup step). Compiles
// each digest-opted-in user's pending_digest_events into a single push,
// then clears the queue. The individual notifications table rows were
// already written by send-push at event time, so the in-app panel is
// unaffected -- this only changes the FCM push cadence.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { GoogleAuth } from 'npm:google-auth-library@9';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FCM_SERVICE_ACCOUNT_JSON = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON')!;
const DIGEST_CRON_SECRET = Deno.env.get('DIGEST_CRON_SECRET');

interface PendingEvent {
  id: string;
  user_id: string;
  trip_name: string | null;
  type: string;
}

function summarizeEvents(events: PendingEvent[]): { title: string; body: string } {
  const tripNames = Array.from(new Set(events.map((e) => e.trip_name).filter(Boolean))) as string[];
  const title = tripNames.length === 1 ? tripNames[0] : 'Trip Tracker';

  const counts = new Map<string, number>();
  events.forEach((e) => counts.set(e.type, (counts.get(e.type) || 0) + 1));

  const parts: string[] = [];
  const expenseCount = (counts.get('expense_added') || 0) + (counts.get('expense_updated') || 0);
  if (expenseCount > 0) parts.push(`${expenseCount} expense${expenseCount === 1 ? '' : 's'}`);
  const chatCount = counts.get('chat_message') || 0;
  if (chatCount > 0) parts.push(`${chatCount} message${chatCount === 1 ? '' : 's'}`);
  const memberCount = (counts.get('member_added') || 0) + (counts.get('member_joined') || 0);
  if (memberCount > 0) parts.push(`${memberCount} member update${memberCount === 1 ? '' : 's'}`);
  const otherCount = events.length - expenseCount - chatCount - memberCount;
  if (otherCount > 0) parts.push(`${otherCount} other update${otherCount === 1 ? '' : 's'}`);

  const body = parts.length > 0 ? `Today: ${parts.join(', ')}` : `${events.length} update${events.length === 1 ? '' : 's'} today`;
  return { title, body };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const secretHeader = req.headers.get('x-digest-secret');
  if (!DIGEST_CRON_SECRET || secretHeader !== DIGEST_CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    return await handleSendDigest();
  } catch (err) {
    console.error('Unhandled error in send-digest', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }), { status: 500 });
  }
});

async function handleSendDigest(): Promise<Response> {
  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: events, error: eventsError } = await supabaseAdmin
    .from('pending_digest_events')
    .select('id, user_id, trip_name, type');
  if (eventsError) {
    return new Response(JSON.stringify({ error: eventsError.message }), { status: 500 });
  }
  if (!events || events.length === 0) {
    return new Response(JSON.stringify({ usersNotified: 0 }), { status: 200 });
  }

  const eventsByUser = new Map<string, PendingEvent[]>();
  events.forEach((e) => {
    const list = eventsByUser.get(e.user_id) || [];
    list.push(e);
    eventsByUser.set(e.user_id, list);
  });

  const userIds = Array.from(eventsByUser.keys());
  const { data: tokens, error: tokenError } = await supabaseAdmin
    .from('device_push_tokens')
    .select('id, user_id, fcm_token')
    .in('user_id', userIds);
  if (tokenError) {
    return new Response(JSON.stringify({ error: tokenError.message }), { status: 500 });
  }

  let usersNotified = 0;
  if (tokens && tokens.length > 0) {
    const serviceAccount = JSON.parse(FCM_SERVICE_ACCOUNT_JSON);
    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
    const accessToken = await auth.getAccessToken();

    for (const [userId, userEvents] of eventsByUser) {
      const userTokens = tokens.filter((t) => t.user_id === userId);
      if (userTokens.length === 0) continue;
      const { title, body } = summarizeEvents(userEvents);

      for (const { fcm_token } of userTokens) {
        await fetch(
          `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: { token: fcm_token, notification: { title, body }, data: { type: 'digest' } },
            }),
          }
        ).catch((err) => console.error('Digest FCM send failed for user', userId, err));
      }
      usersNotified++;
    }
  }

  const { error: clearError } = await supabaseAdmin
    .from('pending_digest_events')
    .delete()
    .in('id', events.map((e) => e.id));
  if (clearError) {
    console.error('Failed to clear sent digest events', clearError);
  }

  return new Response(JSON.stringify({ usersNotified, eventsProcessed: events.length }), { status: 200 });
}
