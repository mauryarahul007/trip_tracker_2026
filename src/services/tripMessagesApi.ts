import { supabase } from './supabaseClient';
import type { TripMessage, TripMessageExpensePayload, TripMessageKind } from '../types';

interface TripMessageRow {
  id: string;
  trip_id: string;
  member_id: string;
  body: string;
  kind?: string | null;
  payload?: TripMessageExpensePayload | Record<string, unknown> | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  reply_to_id?: string | null;
  reactions?: Record<string, string[]> | null;
  is_pinned?: boolean | null;
}

const MESSAGE_FETCH_LIMIT = 200;

function mapPayload(raw: TripMessageRow['payload']): TripMessageExpensePayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const expenseId = (raw as TripMessageExpensePayload).expenseId;
  const title = (raw as TripMessageExpensePayload).title;
  const amount = (raw as TripMessageExpensePayload).amount;
  const currency = (raw as TripMessageExpensePayload).currency;
  if (typeof expenseId !== 'string' || typeof title !== 'string') return null;
  if (typeof amount !== 'number' || typeof currency !== 'string') return null;
  return { expenseId, title, amount, currency };
}

function mapTripMessage(row: TripMessageRow): TripMessage {
  const kind = (row.kind === 'expense_added' ? 'expense_added' : 'text') as TripMessageKind;
  return {
    id: row.id,
    tripId: row.trip_id,
    memberId: row.member_id,
    body: row.body,
    kind,
    payload: kind === 'expense_added' ? mapPayload(row.payload) : null,
    createdAt: new Date(row.created_at).getTime(),
    editedAt: row.edited_at ? new Date(row.edited_at).getTime() : null,
    deletedAt: row.deleted_at ? new Date(row.deleted_at).getTime() : null,
    replyToId: row.reply_to_id ?? null,
    reactions: (row.reactions && typeof row.reactions === 'object') ? row.reactions : {},
    isPinned: Boolean(row.is_pinned),
    status: 'delivered',
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

export async function sendTripMessage(
  tripId: string,
  memberId: string,
  body: string,
  options?: { replyToId?: string | null }
): Promise<TripMessage> {
  const payload: Record<string, unknown> = { trip_id: tripId, member_id: memberId, body, kind: 'text' };
  if (options?.replyToId) {
    payload.reply_to_id = options.replyToId;
  }
  let { data, error } = await supabase
    .from('trip_messages')
    .insert(payload as any)
    .select('*')
    .single();

  if (error) {
    // Strip newer columns if remote schema lags
    const stripped: Record<string, unknown> = { trip_id: tripId, member_id: memberId, body };
    if (options?.replyToId) stripped.reply_to_id = options.replyToId;
    let retry = await supabase.from('trip_messages').insert(stripped as any).select('*').single();
    if (retry.error && options?.replyToId) {
      retry = await supabase.from('trip_messages').insert({ trip_id: tripId, member_id: memberId, body } as any).select('*').single();
    }
    data = retry.data;
    error = retry.error;
  }

  if (error || !data) throw error || new Error('Failed to send trip message');
  return mapTripMessage(data);
}

/** Posts a structured expense card into trip chat. Fails soft if schema/flag path unavailable. */
export async function sendExpenseAddedEventMessage(
  tripId: string,
  memberId: string,
  expense: TripMessageExpensePayload
): Promise<TripMessage | null> {
  const body = `Added ${expense.title} · ${expense.currency} ${expense.amount.toFixed(2)}`;
  const insertPayload: Record<string, unknown> = {
    trip_id: tripId,
    member_id: memberId,
    body,
    kind: 'expense_added',
    payload: expense,
  };
  let { data, error } = await supabase
    .from('trip_messages')
    .insert(insertPayload as any)
    .select('*')
    .single();

  if (error) {
    // Schema not migrated yet -- skip rather than break expense save
    console.warn('[tripMessagesApi] sendExpenseAddedEventMessage skipped:', error.message);
    return null;
  }
  return data ? mapTripMessage(data) : null;
}

export async function updateMessageReactions(
  messageId: string,
  reactions: Record<string, string[]>
): Promise<void> {
  const { error } = await supabase
    .from('trip_messages')
    .update({ reactions } as any)
    .eq('id', messageId);
  if (error) {
    console.warn('[tripMessagesApi] updateMessageReactions warning:', error.message);
  }
}

export async function updateMessagePin(
  messageId: string,
  isPinned: boolean
): Promise<void> {
  const { error } = await supabase
    .from('trip_messages')
    .update({ is_pinned: isPinned } as any)
    .eq('id', messageId);
  if (error) {
    console.warn('[tripMessagesApi] updateMessagePin warning:', error.message);
  }
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
