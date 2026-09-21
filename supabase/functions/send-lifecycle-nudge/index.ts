// supabase/functions/send-lifecycle-nudge/index.ts
// Triggered daily by the pg_cron job in migration 0108
// (trigger_lifecycle_nudges -> net.http_post, secret-authenticated, same
// shape as send-weather-nudge). get_lifecycle_nudge_candidates() only returns
// trips where the enableLifecycleNudges flag is ON (trip override > global
// override > OFF), so with the flag OFF this function selects nothing and
// sends nothing. Push only, to the trip owner, one nudge per user per run
// (and the SQL enforces one per user per 3 days). Quiet hours and digest-mode
// users get the in-app notification but no FCM push.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { GoogleAuth } from 'npm:google-auth-library@9';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FCM_SERVICE_ACCOUNT_JSON = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON')!;
const LIFECYCLE_NUDGE_CRON_SECRET = Deno.env.get('LIFECYCLE_NUDGE_CRON_SECRET');

type NudgeKind = 'invite' | 'packing' | 'next_trip';

interface Candidate {
  trip_id: string;
  trip_name: string;
  kind: NudgeKind;
  user_id: string;
  join_code: string;
}

function nudgeBody(c: Candidate): string {
  switch (c.kind) {
    case 'invite':
      return `Nobody has joined yet. Share code ${c.join_code} so friends can add their expenses.`;
    case 'packing':
      return 'Your trip starts in 2 days and the checklist is empty. Add your packing list now.';
    case 'next_trip':
      return 'A month since this trip wrapped. Start the next one with the same group in a tap.';
  }
}

// "HH:MM" (24h) in the given IANA timezone right now; UTC on a bad zone.
function currentTimeInZone(now: Date, timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
    const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
    const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
    return `${hour}:${minute}`;
  } catch {
    return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
  }
}

// Same window logic as send-push: start > end means the window wraps midnight.
function isWithinQuietHours(now: Date, startTime: string, endTime: string, timezone: string): boolean {
  const current = currentTimeInZone(now, timezone);
  if (startTime === endTime) return false;
  if (startTime < endTime) return current >= startTime && current < endTime;
  return current >= startTime || current < endTime;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }
  const secretHeader = req.headers.get('x-lifecycle-nudge-secret');
  if (!LIFECYCLE_NUDGE_CRON_SECRET || secretHeader !== LIFECYCLE_NUDGE_CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  try {
    return await handleSendLifecycleNudges();
  } catch (err) {
    console.error('Unhandled error in send-lifecycle-nudge', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }), { status: 500 });
  }
});

async function handleSendLifecycleNudges(): Promise<Response> {
  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data, error } = await supabaseAdmin.rpc('get_lifecycle_nudge_candidates');
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  // One nudge per user per run; anything left over is picked up tomorrow.
  const seenUsers = new Set<string>();
  const candidates = ((data || []) as Candidate[]).filter((c) => (seenUsers.has(c.user_id) ? false : (seenUsers.add(c.user_id), true)));
  if (candidates.length === 0) return new Response(JSON.stringify({ nudged: 0 }), { status: 200 });

  const userIds = candidates.map((c) => c.user_id);
  const now = new Date();

  const { data: quietPrefs } = await supabaseAdmin
    .from('quiet_hours_prefs')
    .select('user_id, start_time, end_time, timezone')
    .eq('enabled', true)
    .in('user_id', userIds);
  const quietUsers = new Set(
    (quietPrefs || []).filter((p) => isWithinQuietHours(now, p.start_time, p.end_time, p.timezone)).map((p) => p.user_id)
  );

  const { data: digestPrefs } = await supabaseAdmin.from('notification_digest_prefs').select('user_id').eq('enabled', true).in('user_id', userIds);
  const digestUsers = new Set((digestPrefs || []).map((p) => p.user_id));

  let accessToken: string | null = null;
  let projectId: string | null = null;
  let nudged = 0;

  for (const c of candidates) {
    const body = nudgeBody(c);

    const { error: insertError } = await supabaseAdmin.from('notifications').insert({
      user_id: c.user_id,
      trip_id: c.trip_id,
      title: c.trip_name || 'Trip Tracker',
      body,
      data: { type: 'lifecycle_nudge', kind: c.kind },
    });
    if (insertError) {
      console.error('Failed to insert lifecycle nudge notification', c.trip_id, insertError);
      continue; // not logged, so it is retried on the next run
    }

    if (!quietUsers.has(c.user_id) && !digestUsers.has(c.user_id)) {
      if (!accessToken) {
        const serviceAccount = JSON.parse(FCM_SERVICE_ACCOUNT_JSON);
        projectId = serviceAccount.project_id;
        accessToken = await new GoogleAuth({ credentials: serviceAccount, scopes: ['https://www.googleapis.com/auth/firebase.messaging'] }).getAccessToken();
      }
      const { data: tokens } = await supabaseAdmin.from('device_push_tokens').select('fcm_token').eq('user_id', c.user_id);
      for (const { fcm_token } of tokens || []) {
        await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: {
              token: fcm_token,
              notification: { title: c.trip_name || 'Trip Tracker', body },
              data: { type: 'lifecycle_nudge', kind: c.kind, tripId: c.trip_id },
            },
          }),
        }).catch((err) => console.error('Lifecycle nudge FCM send failed for trip', c.trip_id, err));
      }
    }

    await supabaseAdmin.rpc('log_lifecycle_nudge_sent', { p_trip_id: c.trip_id, p_kind: c.kind, p_user_id: c.user_id });
    nudged++;
  }

  return new Response(JSON.stringify({ nudged, candidates: candidates.length }), { status: 200 });
}
