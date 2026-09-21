import { useEffect, useState } from 'react';
import { fetchReadCursors } from '../services/chatReadCursorApi';
import { fetchLatestTripMessageMeta } from '../services/tripMessagesApi';
import { supabase } from '../services/supabaseClient';

export function useTripChatUnread(options: {
  tripId: string | undefined;
  memberId: string | null;
  enabled: boolean;
  isViewingChat: boolean;
}): boolean {
  const { tripId, memberId, enabled, isViewingChat } = options;
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!enabled || !tripId || !memberId || isViewingChat) {
      setHasUnread(false);
      return;
    }

    let cancelled = false;

    const refresh = async () => {
      const [latest, cursors] = await Promise.all([
        fetchLatestTripMessageMeta(tripId),
        fetchReadCursors(tripId),
      ]);
      if (cancelled) return;
      if (!latest || latest.memberId === memberId) {
        setHasUnread(false);
        return;
      }
      const mine = cursors.find((c) => c.memberId === memberId);
      if (!mine) {
        setHasUnread(true);
        return;
      }
      setHasUnread(mine.lastMessageId !== latest.id && mine.lastReadAt < latest.createdAt);
    };

    void refresh();
    const channel = supabase
      .channel(`trip_chat_unread:${tripId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trip_messages', filter: `trip_id=eq.${tripId}` },
        () => {
          void refresh();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [enabled, tripId, memberId, isViewingChat]);

  return hasUnread;
}
