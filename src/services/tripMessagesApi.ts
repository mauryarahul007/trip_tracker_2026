import { supabase } from './supabaseClient';
import type { TripMessage } from '../types';

interface TripMessageRow {
  id: string;
  trip_id: string;
  member_id: string;
  body: string;
  created_at: string;
  deleted_at: string | null;
}

const MESSAGE_FETCH_LIMIT = 200;

function mapTripMessage(row: TripMessageRow): TripMessage {
  return {
    id: row.id,
    tripId: row.trip_id,
    memberId: row.member_id,
    body: row.body,
    createdAt: new Date(row.created_at).getTime(),
    deletedAt: row.deleted_at ? new Date(row.deleted_at).getTime() : null,
  };
}

export async function fetchTripMessages(tripId: string): Promise<TripMessage[]> {
  const { data, error } = await supabase
    .from('trip_messages')
    .select('*')
    .eq('trip_id', tripId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(MESSAGE_FETCH_LIMIT);
  if (error) throw error;
  return (data ?? []).map(mapTripMessage).reverse();
}

export async function sendTripMessage(tripId: string, memberId: string, body: string): Promise<TripMessage> {
  const { data, error } = await supabase
    .from('trip_messages')
    .insert({ trip_id: tripId, member_id: memberId, body })
    .select('*')
    .single();
  if (error) throw error;
  return mapTripMessage(data);
}

export async function deleteTripMessage(messageId: string): Promise<void> {
  const { error } = await supabase
    .from('trip_messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', messageId);
  if (error) throw error;
}

export function subscribeToTripMessages(
  tripId: string,
  onInsert: (message: TripMessage) => void
): () => void {
  const channel = supabase
    .channel(`trip_messages:${tripId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'trip_messages', filter: `trip_id=eq.${tripId}` },
      (payload) => onInsert(mapTripMessage(payload.new as TripMessageRow))
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
