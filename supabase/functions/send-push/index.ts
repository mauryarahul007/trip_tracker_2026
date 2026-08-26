// supabase/functions/send-push/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2';
import { GoogleAuth } from 'npm:google-auth-library@9';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FCM_SERVICE_ACCOUNT_JSON = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON')!;

const SETTLEMENT_REMINDER_COOLDOWN_HOURS = 24;

interface SendPushRequest {
  userIds: string[];
  tripName: string;
  type: string;
  params?: Record<string, string>;
  tripId?: string;
}

// Mirrored in src/utils/notificationText.ts for the in-app panel — kept as
// two small, independent copies (Deno edge function vs. browser bundle)
// rather than a shared package, since duplicating one switch statement is
// far cheaper than a cross-runtime shared module for an app this size.
// Only this function's output is ever sent to FCM/stored as a push
// payload; the DB row itself stores type+params, not this rendered text.
function renderNotification(type: string, tripName: string, params: Record<string, string>): { title: string; body: string } {
  const title = tripName || 'Trip Tracker';
  switch (type) {
    case 'expense_added':
      return { title, body: `${params.expenseTitle} — ${params.currency} ${params.amount} added` };
    case 'expense_updated':
      return { title, body: `${params.expenseTitle} was updated` };
    case 'expense_deleted':
      return { title, body: `${params.expenseTitle} was deleted` };
    case 'expense_restored':
      return { title, body: `${params.expenseTitle} was restored` };
    case 'member_added':
      return { title, body: `You were added to ${tripName || 'a trip'}` };
    case 'member_added_notice':
      return { title, body: `${params.memberName} was added to the trip` };
    case 'member_joined':
      return { title, body: `${params.memberName} joined the trip` };
    case 'settlement_reminder':
      return { title, body: `You owe ${params.toLabel} ${params.currency}${params.amount} for this trip` };
    case 'trip_deleted':
      return { title, body: `${tripName || 'A trip'} was deleted` };
    default:
      return { title, body: 'You have a new notification' };
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // Anything that throws without being caught here falls through to
  // Deno.serve's own default error response, which has no CORS headers at
  // all — the browser then reports it as a CORS failure, hiding the real
  // server-side error (e.g. a missing/malformed FCM_SERVICE_ACCOUNT_JSON
  // secret throwing on JSON.parse).
  try {
    return await handleSendPush(req);
  } catch (err) {
    console.error('Unhandled error in send-push', err);
    return jsonResponse({ error: err instanceof Error ? err.message : 'Internal error' }, 500);
  }
});

async function handleSendPush(req: Request): Promise<Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401);
  }
  const jwt = authHeader.replace('Bearer ', '');

  let requestBody: SendPushRequest;
  try {
    requestBody = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }
  const { userIds, tripName, type, params, tripId } = requestBody;
  if (!Array.isArray(userIds) || userIds.length === 0 || !type) {
    return jsonResponse({ error: 'userIds and type are required' }, 400);
  }
  const notificationParams = params ?? {};

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: callerData, error: callerError } = await supabaseAdmin.auth.getUser(jwt);
  if (callerError || !callerData.user) {
    return jsonResponse({ error: 'Invalid session' }, 401);
  }
  const callerId = callerData.user.id;

  // Only allow notifying users who share at least one trip with the caller —
  // otherwise any authenticated user could push arbitrary text to any user ID.
  const { data: callerMemberships, error: membershipError } = await supabaseAdmin
    .from('members')
    .select('trip_id')
    .eq('linked_user_id', callerId);
  if (membershipError) {
    return jsonResponse({ error: membershipError.message }, 500);
  }
  const callerTripIds = (callerMemberships || []).map((m) => m.trip_id);
  if (callerTripIds.length === 0) {
    return jsonResponse({ error: 'Caller is not a participant in any trip' }, 403);
  }

  const { data: recipientMembers, error: recipientError } = await supabaseAdmin
    .from('members')
    .select('linked_user_id')
    .in('trip_id', callerTripIds)
    .in('linked_user_id', userIds);
  if (recipientError) {
    return jsonResponse({ error: recipientError.message }, 500);
  }
  const allowedUserIds = new Set((recipientMembers || []).map((m) => m.linked_user_id));
  const filteredUserIds = userIds.filter((id) => allowedUserIds.has(id));
  if (filteredUserIds.length === 0) {
    return jsonResponse({ sent: 0, total: 0 }, 200);
  }

  // Settlement reminders are the one notification type a user triggers
  // manually and repeatedly against the same target — everything else
  // (expense added, member added) fires at most once per real event, so
  // only this type needs throttling. Checked against the notifications
  // table itself rather than client-side state, since that can't be
  // bypassed by just reloading the page.
  if (type === 'settlement_reminder' && tripId) {
    const cooldownStart = new Date(Date.now() - SETTLEMENT_REMINDER_COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();
    const { data: recentReminders, error: recentError } = await supabaseAdmin
      .from('notifications')
      .select('id')
      .eq('trip_id', tripId)
      .in('user_id', filteredUserIds)
      .contains('data', { type: 'settlement_reminder', fromMemberId: notificationParams.fromMemberId, toMemberId: notificationParams.toMemberId })
      .gte('created_at', cooldownStart)
      .limit(1);
    if (recentError) {
      return jsonResponse({ error: recentError.message }, 500);
    }
    if (recentReminders && recentReminders.length > 0) {
      return jsonResponse(
        { error: `A reminder was already sent within the last ${SETTLEMENT_REMINDER_COOLDOWN_HOURS} hours`, rateLimited: true },
        429
      );
    }
  }

  // Persisted independently of whether the recipient has a registered
  // device — this is what backs the in-app notifications panel (web and
  // native both read from here), while the FCM send below is purely the
  // best-effort "also try to push it to a device right now" path.
  // title stores just the trip name (an affected value, not a message);
  // body is intentionally left null — the panel renders display text from
  // type+data client-side (src/utils/notificationText.ts) instead of
  // storing the same sentence twice.
  const { error: notificationInsertError } = await supabaseAdmin.from('notifications').insert(
    filteredUserIds.map((userId) => ({
      user_id: userId,
      trip_id: tripId ?? null,
      title: tripName || 'Trip Tracker',
      body: null,
      data: { type, ...notificationParams },
    }))
  );
  if (notificationInsertError) {
    console.error('Failed to insert notification rows', notificationInsertError);
  }

  // Trip mute (migration 0070) only suppresses the push -- the in-app
  // notification row above is written for every filteredUserIds regardless,
  // so a muted user still sees it in the panel, it just doesn't ping their
  // phone. Superadmin's `frozen` kill-switch and this are unrelated: mute
  // is a per-user preference, not a trip-wide toggle.
  let pushEligibleUserIds = filteredUserIds;
  if (tripId) {
    const { data: mutes, error: mutesError } = await supabaseAdmin
      .from('trip_mutes')
      .select('user_id')
      .eq('trip_id', tripId)
      .in('user_id', filteredUserIds);
    if (mutesError) {
      console.error('Failed to load trip mutes, sending push to all recipients', mutesError);
    } else {
      const mutedUserIds = new Set((mutes || []).map((m) => m.user_id));
      pushEligibleUserIds = filteredUserIds.filter((id) => !mutedUserIds.has(id));
    }
  }
  if (pushEligibleUserIds.length === 0) {
    return jsonResponse({ sent: 0, total: 0 }, 200);
  }

  const { data: tokens, error: tokenError } = await supabaseAdmin
    .from('device_push_tokens')
    .select('id, fcm_token')
    .in('user_id', pushEligibleUserIds);
  if (tokenError) {
    return jsonResponse({ error: tokenError.message }, 500);
  }
  if (!tokens || tokens.length === 0) {
    return jsonResponse({ sent: 0, total: 0 }, 200);
  }

  const serviceAccount = JSON.parse(FCM_SERVICE_ACCOUNT_JSON);
  const auth = new GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });
  const accessToken = await auth.getAccessToken();
  const { title: pushTitle, body: pushBody } = renderNotification(type, tripName, notificationParams);

  let sent = 0;
  for (const { id, fcm_token } of tokens) {
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: fcm_token,
            notification: { title: pushTitle, body: pushBody },
            data: { type, ...notificationParams },
          },
        }),
      }
    );
    if (res.ok) {
      sent++;
    } else {
      const errorBody = await res.json().catch(() => null);
      const fcmStatus = errorBody?.error?.status;
      // Only prune tokens FCM has confirmed are dead (uninstalled app,
      // rotated token, etc). Any other failure — misconfigured
      // credentials, quota, transient network errors — must NOT delete
      // the token, or a single bad send wipes out every device's
      // registration and notifications silently stop working for good.
      if (fcmStatus === 'UNREGISTERED' || fcmStatus === 'NOT_FOUND') {
        await supabaseAdmin.from('device_push_tokens').delete().eq('id', id);
      } else {
        console.error('FCM send failed for token', id, res.status, errorBody);
      }
    }
  }

  return jsonResponse({ sent, total: tokens.length }, 200);
}
