import { supabase } from './supabaseClient';

export interface MyLocationShare {
  isSharing: boolean;
  shareToken: string | null;
  expiresAt: string | null;
}

export interface SharedLocation {
  memberName: string;
  tripName: string;
  lat: number;
  lng: number;
  updatedAt: string;
  expiresAt: string | null;
}

export interface TripActiveShare {
  memberId: string;
  lat: number;
  lng: number;
  updatedAt: string;
}

const SHARE_DURATION_MS = 12 * 60 * 60 * 1000; // 12h -- bounded window, not "forever"

// Owner-only upsert (RLS: user_id = auth.uid()) -- starts or refreshes a
// share window and generates a fresh token, so an old link a user forgot
// about stops resolving once they re-share.
export async function startLocationShare(tripId: string, memberId: string, userId: string, lat: number, lng: number): Promise<MyLocationShare> {
  const expiresAt = new Date(Date.now() + SHARE_DURATION_MS).toISOString();
  const { data, error } = await supabase
    .from('member_locations')
    .upsert(
      { trip_id: tripId, member_id: memberId, user_id: userId, lat, lng, is_sharing: true, expires_at: expiresAt, updated_at: new Date().toISOString() },
      { onConflict: 'trip_id,user_id' }
    )
    .select('share_token, is_sharing, expires_at')
    .single();
  if (error) throw error;
  return { isSharing: data.is_sharing, shareToken: data.share_token, expiresAt: data.expires_at };
}

// Heartbeat while sharing is active -- position only, doesn't touch expiry.
export async function updateLocationShare(tripId: string, lat: number, lng: number): Promise<void> {
  const { error } = await supabase
    .from('member_locations')
    .update({ lat, lng, updated_at: new Date().toISOString() })
    .eq('trip_id', tripId);
  if (error) throw error;
}

export async function stopLocationShare(tripId: string): Promise<void> {
  const { error } = await supabase.from('member_locations').update({ is_sharing: false }).eq('trip_id', tripId);
  if (error) throw error;
}

export async function getMyLocationShare(tripId: string): Promise<MyLocationShare | null> {
  const { data, error } = await supabase
    .from('member_locations')
    .select('share_token, is_sharing, expires_at')
    .eq('trip_id', tripId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { isSharing: data.is_sharing, shareToken: data.share_token, expiresAt: data.expires_at };
}

// Trip participants (migration 0089) -- separate from the public token RPC
// below, this is for viewing shares in-app without needing a link at all.
// Member names come from the trip's already-loaded members map client-side
// rather than a join, since the caller already has it.
export async function getActiveTripLocationShares(tripId: string): Promise<TripActiveShare[]> {
  const { data, error } = await supabase
    .from('member_locations')
    .select('member_id, lat, lng, updated_at')
    .eq('trip_id', tripId)
    .eq('is_sharing', true);
  if (error) throw error;
  return (data || []).map((row) => ({ memberId: row.member_id, lat: row.lat, lng: row.lng, updatedAt: row.updated_at }));
}

// Public, unauthenticated -- the only way to read another user's location,
// via the SECURITY DEFINER RPC keyed by the random share token.
export async function getSharedLocation(shareToken: string): Promise<SharedLocation | null> {
  const { data, error } = await supabase.rpc('get_shared_location', { p_token: shareToken });
  if (error) throw error;
  const row = data?.[0];
  if (!row) return null;
  return {
    memberName: row.member_name,
    tripName: row.trip_name,
    lat: row.lat,
    lng: row.lng,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
  };
}
