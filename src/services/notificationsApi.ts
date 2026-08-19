import { supabase } from './supabaseClient';
import type { AppNotification } from '../types';
import type { Database } from '../types/database';

type NotificationRow = Database['public']['Tables']['notifications']['Row'];

function mapNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    tripId: row.trip_id,
    title: row.title,
    body: row.body,
    data: row.data,
    read: row.read,
    createdAt: row.created_at,
  };
}

export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data || []).map(mapNotification);
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
  if (error) throw error;
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) throw error;
}

// Live inserts while a tab is open — historical notifications (and
// anything that arrived while offline) are covered separately by
// fetchNotifications on load.
export function subscribeToNotifications(userId: string, onInsert: (notification: AppNotification) => void) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      (payload) => {
        console.log('[notifications] realtime INSERT received', payload);
        onInsert(mapNotification(payload.new as NotificationRow));
      }
    )
    .subscribe((status, err) => {
      console.log('[notifications] realtime channel status:', status, err ?? '');
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
