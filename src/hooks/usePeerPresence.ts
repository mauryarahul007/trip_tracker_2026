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

    const channelName = `trip_presence:${tripId}`;
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
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
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId,
            displayName: userDisplayName,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [tripId, userId, userDisplayName]);

  return peers;
}
