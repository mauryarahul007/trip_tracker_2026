import { supabase } from './supabaseClient';

export interface TripChatReadCursor {
  tripId: string;
  memberId: string;
  lastReadAt: number;
  lastMessageId: string | null;
}

interface ReadCursorRow {
  trip_id: string;
  member_id: string;
  last_read_at: string;
  last_message_id: string | null;
}

function mapCursor(row: ReadCursorRow): TripChatReadCursor {
  return {
    tripId: row.trip_id,
    memberId: row.member_id,
    lastReadAt: new Date(row.last_read_at).getTime(),
    lastMessageId: row.last_message_id,
  };
}

export async function upsertReadCursor(
  tripId: string,
  memberId: string,
  lastMessageId: string | null
): Promise<void> {
  const { error } = await supabase.from('trip_chat_read_cursors').upsert(
    {
      trip_id: tripId,
      member_id: memberId,
      last_read_at: new Date().toISOString(),
      last_message_id: lastMessageId,
    } as any,
    { onConflict: 'trip_id,member_id' }
  );
  if (error) {
    console.warn('[chatReadCursorApi] upsertReadCursor skipped:', error.message);
  }
}

export async function fetchReadCursors(tripId: string): Promise<TripChatReadCursor[]> {
  const { data, error } = await supabase
    .from('trip_chat_read_cursors')
    .select('*')
    .eq('trip_id', tripId);
  if (error) {
    console.warn('[chatReadCursorApi] fetchReadCursors skipped:', error.message);
    return [];
  }
  return (data ?? []).map((row) => mapCursor(row as ReadCursorRow));
}

export function subscribeToReadCursors(
  tripId: string,
  onChange: (cursors: TripChatReadCursor[]) => void
): () => void {
  const reload = () => {
    void fetchReadCursors(tripId).then(onChange);
  };

  const channel = supabase
    .channel(`trip_chat_read_cursors:${tripId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'trip_chat_read_cursors', filter: `trip_id=eq.${tripId}` },
      () => reload()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
