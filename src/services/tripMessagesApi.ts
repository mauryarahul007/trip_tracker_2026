import { supabase } from './supabaseClient';
import type {
  TripMessage,
  TripMessageExpenseLinkPayload,
  TripMessageExpensePayload,
  TripMessageKind,
  TripMessageMediaPayload,
  TripMessagePayload,
} from '../types';

interface TripMessageRow {
  id: string;
  trip_id: string;
  member_id: string;
  body: string;
  kind?: string | null;
  payload?: TripMessagePayload | Record<string, unknown> | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  reply_to_id?: string | null;
  reactions?: Record<string, string[]> | null;
  is_pinned?: boolean | null;
}

const MESSAGE_FETCH_LIMIT = 200;

const KNOWN_KINDS = new Set<TripMessageKind>([
  'text',
  'expense_added',
  'settlement_recorded',
  'expense_disputed',
  'expense_dispute_resolved',
  'image',
  'expense_link',
  'voice_note',
]);

const EVENT_KINDS = new Set<TripMessageKind>([
  'expense_added',
  'settlement_recorded',
  'expense_disputed',
  'expense_dispute_resolved',
]);

function mapKind(raw: string | null | undefined): TripMessageKind {
  if (raw && KNOWN_KINDS.has(raw as TripMessageKind)) return raw as TripMessageKind;
  return 'text';
}

function mapExpensePayload(raw: Record<string, unknown>): TripMessageExpensePayload | null {
  const expenseId = raw.expenseId;
  const title = raw.title;
  if (typeof expenseId !== 'string' || typeof title !== 'string') return null;
  const amount = typeof raw.amount === 'number' ? raw.amount : 0;
  const currency = typeof raw.currency === 'string' ? raw.currency : '';
  const payload: TripMessageExpensePayload = { expenseId, title, amount, currency };
  if (typeof raw.note === 'string') payload.note = raw.note;
  if (raw.source === 'tripbot') payload.source = 'tripbot';
  return payload;
}

function mapMediaPayload(raw: Record<string, unknown>): TripMessageMediaPayload | null {
  const storagePath = raw.storagePath;
  const mimeType = raw.mimeType;
  if (typeof storagePath !== 'string' || typeof mimeType !== 'string') return null;
  const payload: TripMessageMediaPayload = { storagePath, mimeType };
  if (typeof raw.durationMs === 'number') payload.durationMs = raw.durationMs;
  if (typeof raw.width === 'number') payload.width = raw.width;
  if (typeof raw.height === 'number') payload.height = raw.height;
  return payload;
}

function mapExpenseLinkPayload(raw: Record<string, unknown>): TripMessageExpenseLinkPayload | null {
  const expenseId = raw.expenseId;
  const title = raw.title;
  if (typeof expenseId !== 'string' || typeof title !== 'string') return null;
  const payload: TripMessageExpenseLinkPayload = { expenseId, title };
  if (typeof raw.amount === 'number') payload.amount = raw.amount;
  if (typeof raw.currency === 'string') payload.currency = raw.currency;
  return payload;
}

function mapPayload(kind: TripMessageKind, raw: TripMessageRow['payload']): TripMessagePayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (EVENT_KINDS.has(kind)) return mapExpensePayload(obj);
  if (kind === 'image' || kind === 'voice_note') return mapMediaPayload(obj);
  if (kind === 'expense_link') return mapExpenseLinkPayload(obj);
  return null;
}

function mapTripMessage(row: TripMessageRow): TripMessage {
  const kind = mapKind(row.kind);
  return {
    id: row.id,
    tripId: row.trip_id,
    memberId: row.member_id,
    body: row.body,
    kind,
    payload: mapPayload(kind, row.payload),
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

/** Generic structured chat event / media message. Fails soft when schema lags. */
export async function sendEventMessage(
  tripId: string,
  memberId: string,
  kind: TripMessageKind,
  body: string,
  payload: TripMessagePayload | null,
  options?: { id?: string }
): Promise<TripMessage | null> {
  const insertPayload: Record<string, unknown> = {
    trip_id: tripId,
    member_id: memberId,
    body,
    kind,
    payload,
  };
  if (options?.id) insertPayload.id = options.id;

  const { data, error } = await supabase
    .from('trip_messages')
    .insert(insertPayload as any)
    .select('*')
    .single();

  if (error) {
    console.warn('[tripMessagesApi] sendEventMessage skipped:', kind, error.message);
    return null;
  }
  return data ? mapTripMessage(data) : null;
}

export async function sendExpenseAddedEventMessage(
  tripId: string,
  memberId: string,
  expense: TripMessageExpensePayload
): Promise<TripMessage | null> {
  const body = `Added ${expense.title} · ${expense.currency} ${expense.amount.toFixed(2)}`;
  return sendEventMessage(tripId, memberId, 'expense_added', body, expense);
}

export async function sendSettlementRecordedEventMessage(
  tripId: string,
  memberId: string,
  expense: TripMessageExpensePayload
): Promise<TripMessage | null> {
  const body = `Settlement ${expense.title} · ${expense.currency} ${expense.amount.toFixed(2)}`;
  return sendEventMessage(tripId, memberId, 'settlement_recorded', body, expense);
}

export async function sendExpenseDisputedEventMessage(
  tripId: string,
  memberId: string,
  expense: TripMessageExpensePayload
): Promise<TripMessage | null> {
  const note = expense.note ? ` — ${expense.note}` : '';
  const body = `Disputed ${expense.title}${note}`;
  return sendEventMessage(tripId, memberId, 'expense_disputed', body, expense);
}

export async function sendExpenseDisputeResolvedEventMessage(
  tripId: string,
  memberId: string,
  expense: TripMessageExpensePayload
): Promise<TripMessage | null> {
  const body = `Dispute resolved: ${expense.title}`;
  return sendEventMessage(tripId, memberId, 'expense_dispute_resolved', body, expense);
}

export async function sendImageMessage(
  tripId: string,
  memberId: string,
  media: TripMessageMediaPayload,
  options?: { id?: string }
): Promise<TripMessage | null> {
  return sendEventMessage(tripId, memberId, 'image', '📷 Photo', media, options);
}

export async function sendVoiceNoteMessage(
  tripId: string,
  memberId: string,
  media: TripMessageMediaPayload,
  options?: { id?: string }
): Promise<TripMessage | null> {
  const secs = media.durationMs ? Math.round(media.durationMs / 1000) : 0;
  const body = secs > 0 ? `🎤 Voice note (${secs}s)` : '🎤 Voice note';
  return sendEventMessage(tripId, memberId, 'voice_note', body, media, options);
}

export async function sendExpenseLinkMessage(
  tripId: string,
  memberId: string,
  link: TripMessageExpenseLinkPayload
): Promise<TripMessage | null> {
  const amountLabel =
    typeof link.amount === 'number' && link.currency
      ? ` · ${link.currency} ${link.amount.toFixed(2)}`
      : '';
  const body = `Linked expense: ${link.title}${amountLabel}`;
  return sendEventMessage(tripId, memberId, 'expense_link', body, link);
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
