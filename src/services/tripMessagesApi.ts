import { supabase } from './supabaseClient';
import type { TripMessage } from '../types';

interface TripMessageRow {
  id: string;
  trip_id: string;
  member_id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
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
    editedAt: row.edited_at ? new Date(row.edited_at).getTime() : null,
    deletedAt: row.deleted_at ? new Date(row.deleted_at).getTime() : null,
  };
}

export async function fetchTripMessages(tripId: string): Promise<TripMessage[]> {
  const { data, error } = await supabase
    .from('trip_messages')
    .select('*')
    .eq('trip_id', tripId)
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

// Server-side enforces the 15-minute sender edit window (and blanket admin
// access) -- see edit_trip_message() in migration 0083. Direct table
// UPDATEs cannot change body (RLS WITH CHECK), so this RPC is the only path.
export async function editTripMessage(messageId: string, body: string): Promise<TripMessage> {
  const { data, error } = await supabase.rpc('edit_trip_message', { p_message_id: messageId, p_body: body });
  if (error) throw error;
  return mapTripMessage(data as TripMessageRow);
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
  handlers: {
    onInsert: (message: TripMessage) => void;
    // Fires for both edits and soft-deletes -- both are plain UPDATEs on
    // this table, the caller distinguishes via message.deletedAt/editedAt.
    onUpdate: (message: TripMessage) => void;
  }
): () => void {
  const channel = supabase
    .channel(`trip_messages:${tripId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'trip_messages', filter: `trip_id=eq.${tripId}` },
      (payload) => handlers.onInsert(mapTripMessage(payload.new as TripMessageRow))
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'trip_messages', filter: `trip_id=eq.${tripId}` },
      (payload) => handlers.onUpdate(mapTripMessage(payload.new as TripMessageRow))
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
