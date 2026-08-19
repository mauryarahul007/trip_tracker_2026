// supabase/functions/send-push/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2';
import { GoogleAuth } from 'npm:google-auth-library@9';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FCM_SERVICE_ACCOUNT_JSON = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON')!;

interface SendPushRequest {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
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
  const { userIds, title, body, data } = requestBody;
  if (!Array.isArray(userIds) || userIds.length === 0 || !title || !body) {
    return jsonResponse({ error: 'userIds, title, and body are required' }, 400);
  }

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

  const { data: tokens, error: tokenError } = await supabaseAdmin
    .from('device_push_tokens')
    .select('id, fcm_token')
    .in('user_id', filteredUserIds);
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
            notification: { title, body },
            data: data || {},
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
