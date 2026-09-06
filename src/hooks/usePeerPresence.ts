import { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuthStore } from '../store/authStore';

export interface PeerUser {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  onlineAt: string;
}

export function usePeerPresence(tripId: string | null | undefined): PeerUser[] {
  const [peers, setPeers] = useState<PeerUser[]>([]);
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;
  const userEmail = session?.user?.email;
  const userDisplayName = session?.user?.user_metadata?.full_name || userEmail?.split('@')[0] || 'Traveler';

  useEffect(() => {
    if (!tripId || !userId || !supabase) {
      setPeers([]);
      return;
    }

    let alive = true;
    const channelName = `trip_presence:${tripId}`;

    // Supabase reuses channels by topic name. Remount (Strict Mode / error
    // boundary) would otherwise call .on('presence') on an already-subscribed
    // channel and crash (BUG-146). Tear down any prior channel first.
    for (const existing of supabase.getChannels()) {
      // Topics are typically `realtime:<name>`; match either form.
      if (existing.topic === channelName || existing.topic.endsWith(`:${channelName}`)) {
        void supabase.removeChannel(existing);
      }
    }

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        if (!alive) return;
        const state = channel.presenceState();
        const activeUsers: PeerUser[] = [];
        Object.values(state).forEach((presences) => {
          (presences as any[]).forEach((p) => {
            if (p.userId && p.userId !== userId) {
              activeUsers.push({
                userId: p.userId,
                displayName: p.displayName || 'Traveler',
                avatarUrl: p.avatarUrl,
                onlineAt: p.onlineAt || new Date().toISOString(),
              });
            }
          });
        });
        setPeers(activeUsers);
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED' && alive) {
          await channel.track({
            userId,
            displayName: userDisplayName,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      alive = false;
      void (async () => {
        try {
          await channel.untrack();
        } catch {
          // Channel may already be torn down.
        }
        if (supabase) {
          void supabase.removeChannel(channel);
        }
      })();
    };
  }, [tripId, userId, userDisplayName]);

  return peers;
}
