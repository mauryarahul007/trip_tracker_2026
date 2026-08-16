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

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 });
  }
  const jwt = authHeader.replace('Bearer ', '');

  let requestBody: SendPushRequest;
  try {
    requestBody = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }
  const { userIds, title, body, data } = requestBody;
  if (!Array.isArray(userIds) || userIds.length === 0 || !title || !body) {
    return new Response(JSON.stringify({ error: 'userIds, title, and body are required' }), { status: 400 });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: callerData, error: callerError } = await supabaseAdmin.auth.getUser(jwt);
  if (callerError || !callerData.user) {
    return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401 });
  }
  const callerId = callerData.user.id;

  // Only allow notifying users who share at least one trip with the caller —
  // otherwise any authenticated user could push arbitrary text to any user ID.
  const { data: callerMemberships, error: membershipError } = await supabaseAdmin
    .from('members')
    .select('trip_id')
    .eq('linked_user_id', callerId);
  if (membershipError) {
    return new Response(JSON.stringify({ error: membershipError.message }), { status: 500 });
  }
  const callerTripIds = (callerMemberships || []).map((m) => m.trip_id);
  if (callerTripIds.length === 0) {
    return new Response(JSON.stringify({ error: 'Caller is not a participant in any trip' }), { status: 403 });
  }

  const { data: recipientMembers, error: recipientError } = await supabaseAdmin
    .from('members')
    .select('linked_user_id')
    .in('trip_id', callerTripIds)
    .in('linked_user_id', userIds);
  if (recipientError) {
    return new Response(JSON.stringify({ error: recipientError.message }), { status: 500 });
  }
  const allowedUserIds = new Set((recipientMembers || []).map((m) => m.linked_user_id));
  const filteredUserIds = userIds.filter((id) => allowedUserIds.has(id));
  if (filteredUserIds.length === 0) {
    return new Response(JSON.stringify({ sent: 0, total: 0 }), { status: 200 });
  }

  const { data: tokens, error: tokenError } = await supabaseAdmin
    .from('device_push_tokens')
    .select('fcm_token')
    .in('user_id', filteredUserIds);
  if (tokenError) {
    return new Response(JSON.stringify({ error: tokenError.message }), { status: 500 });
  }
  if (!tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ sent: 0, total: 0 }), { status: 200 });
  }

  const serviceAccount = JSON.parse(FCM_SERVICE_ACCOUNT_JSON);
  const auth = new GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });
  const accessToken = await auth.getAccessToken();

  let sent = 0;
  for (const { fcm_token } of tokens) {
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
    if (res.ok) sent++;
  }

  return new Response(JSON.stringify({ sent, total: tokens.length }), { status: 200 });
});
