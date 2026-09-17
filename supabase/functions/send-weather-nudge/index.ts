// supabase/functions/send-weather-nudge/index.ts
// Triggered once daily by the pg_cron job in migration 0101
// (trigger_weather_nudges -> net.http_post, authenticated with a shared
// secret rather than the full service-role key -- same shape as
// send-digest). For each trip with enableWeatherItineraryNudges active and
// not already nudged today, checks tomorrow's forecast for its first
// coordinate-bearing stop (falling back to geocoding the destination text)
// and pushes a nudge to every linked participant if it looks bad.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { GoogleAuth } from 'npm:google-auth-library@9';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FCM_SERVICE_ACCOUNT_JSON = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON')!;
const WEATHER_NUDGE_CRON_SECRET = Deno.env.get('WEATHER_NUDGE_CRON_SECRET');

// Precipitation probability at/above this, or a stormy weather code,
// counts as "bad" -- deliberately coarse, this is a nudge not a forecast app.
const BAD_WEATHER_PRECIP_PROBABILITY = 60;
const STORMY_WEATHER_CODES = new Set([65, 82, 95, 96, 99]); // heavy rain, violent shower, thunderstorm variants

interface CandidateTrip {
  trip_id: string;
  trip_name: string;
  destination: string | null;
  stop_lat: number | null;
  stop_lng: number | null;
  participant_user_ids: string[];
}

async function geocodeDestination(destination: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=en&format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
    if (!res.ok) return null;
    const data = await res.json();
    const first = data?.results?.[0];
    if (!first) return null;
    return { lat: first.latitude, lng: first.longitude };
  } catch {
    return null;
  }
}

async function isTomorrowBadWeather(lat: number, lng: number): Promise<boolean> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=precipitation_probability_max,weather_code&timezone=auto&forecast_days=2`;
  const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
  if (!res.ok) return false;
  const data = await res.json();
  // Index 0 = today, index 1 = tomorrow.
  const precipProbability: number | undefined = data?.daily?.precipitation_probability_max?.[1];
  const weatherCode: number | undefined = data?.daily?.weather_code?.[1];
  return (
    (typeof precipProbability === 'number' && precipProbability >= BAD_WEATHER_PRECIP_PROBABILITY) ||
    (typeof weatherCode === 'number' && STORMY_WEATHER_CODES.has(weatherCode))
  );
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const secretHeader = req.headers.get('x-weather-nudge-secret');
  if (!WEATHER_NUDGE_CRON_SECRET || secretHeader !== WEATHER_NUDGE_CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    return await handleSendWeatherNudges();
  } catch (err) {
    console.error('Unhandled error in send-weather-nudge', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }), { status: 500 });
  }
});

async function handleSendWeatherNudges(): Promise<Response> {
  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: trips, error: tripsError } = await supabaseAdmin.rpc('get_weather_nudge_candidate_trips');
  if (tripsError) {
    return new Response(JSON.stringify({ error: tripsError.message }), { status: 500 });
  }
  const candidates = (trips || []) as CandidateTrip[];
  if (candidates.length === 0) {
    return new Response(JSON.stringify({ tripsNudged: 0 }), { status: 200 });
  }

  let accessToken: string | null = null;
  let serviceAccount: { project_id: string } | null = null;
  let tripsNudged = 0;

  for (const trip of candidates) {
    let lat = trip.stop_lat;
    let lng = trip.stop_lng;
    if ((lat == null || lng == null) && trip.destination) {
      const geocoded = await geocodeDestination(trip.destination);
      if (geocoded) {
        lat = geocoded.lat;
        lng = geocoded.lng;
      }
    }
    if (lat == null || lng == null) continue;

    const bad = await isTomorrowBadWeather(lat, lng).catch(() => false);
    if (!bad) continue;
    if (trip.participant_user_ids.length === 0) {
      await supabaseAdmin.rpc('log_weather_nudge_sent', { p_trip_id: trip.trip_id });
      continue;
    }

    if (!accessToken) {
      serviceAccount = JSON.parse(FCM_SERVICE_ACCOUNT_JSON);
      const auth = new GoogleAuth({
        credentials: serviceAccount,
        scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
      });
      accessToken = await auth.getAccessToken();
    }

    const { data: tokens } = await supabaseAdmin
      .from('device_push_tokens')
      .select('fcm_token')
      .in('user_id', trip.participant_user_ids);

    const title = trip.trip_name || 'Trip Tracker';
    const body = `Rain looks likely tomorrow near your next stop — plan an indoor backup.`;

    // Backs the in-app notifications panel, independent of whether a
    // device has a registered FCM token -- same split as send-push.
    const { error: notificationInsertError } = await supabaseAdmin.from('notifications').insert(
      trip.participant_user_ids.map((userId) => ({
        user_id: userId,
        trip_id: trip.trip_id,
        title,
        body: null,
        data: { type: 'weather_itinerary_nudge' },
      }))
    );
    if (notificationInsertError) {
      console.error('Failed to insert weather nudge notification rows', notificationInsertError);
    }

    for (const { fcm_token } of tokens || []) {
      await fetch(
        `https://fcm.googleapis.com/v1/projects/${serviceAccount!.project_id}/messages:send`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: { token: fcm_token, notification: { title, body }, data: { type: 'weather_itinerary_nudge', tripId: trip.trip_id } },
          }),
        }
      ).catch((err) => console.error('Weather nudge FCM send failed for trip', trip.trip_id, err));
    }

    await supabaseAdmin.rpc('log_weather_nudge_sent', { p_trip_id: trip.trip_id });
    tripsNudged++;
  }

  return new Response(JSON.stringify({ tripsNudged, tripsChecked: candidates.length }), { status: 200 });
}
