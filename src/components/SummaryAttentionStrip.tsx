import { useEffect, useMemo, useState } from 'react';
import { useTripStore } from '../store/tripStore';
import { triggerHaptic } from '../utils/haptics';
import type { MemberBalance } from '../utils/settlement';
import type { Expense, Member, Trip } from '../types';

interface NeedsChip {
  id: string;
  label: string;
  onClick: () => void;
}

interface Props {
  trip: Trip;
  myMemberId: string | null;
  balances: MemberBalance[];
  expenses: Expense[];
  members: Member[];
  onOpenCloseout?: () => void;
  onGoToLedger?: () => void;
  onGoToMembers?: () => void;
  onGoToBalances?: () => void;
}

/** Compact Summary strip: pending sync + actionable “needs you” chips. */
export function SummaryAttentionStrip({
  trip,
  myMemberId,
  balances,
  expenses,
  members,
  onOpenCloseout,
  onGoToLedger,
  onGoToMembers,
  onGoToBalances,
}: Props) {
  const syncQueue = useTripStore((s) => s.syncQueue);
  const processQueue = useTripStore((s) => s.processQueue);
  const isFeatureEnabled = useTripStore((s) => s.isFeatureEnabled);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const chips = useMemo(() => {
    const next: NeedsChip[] = [];
    if (myMemberId) {
      const mine = balances.find((b) => b.memberId === myMemberId);
      if (mine && mine.balance < -0.009) {
        next.push({
          id: 'owe',
          label: 'You owe · settle up',
          onClick: () => onGoToBalances?.(),
        });
      } else if (mine && mine.balance > 0.009) {
        next.push({
          id: 'owed',
          label: "You're owed · remind",
          onClick: () => onGoToBalances?.(),
        });
      }
    }

    if (isFeatureEnabled('enableExpenseDisputes', { tripId: trip.id })) {
      const openDisputes = expenses.filter((e) => e.tripId === trip.id && Boolean(e.disputedAt)).length;
      if (openDisputes > 0) {
        next.push({
          id: 'disputes',
          label: `${openDisputes} dispute${openDisputes === 1 ? '' : 's'}`,
          onClick: () => onGoToLedger?.(),
        });
      }
    }

    const memberById = new Map(members.map((m) => [m.id, m]));
    const unlinked = trip.memberIds
      .map((id) => memberById.get(id))
      .filter((m): m is Member => Boolean(m) && !m.archived && !m.linkedUserId).length;
    if (unlinked > 0) {
      next.push({
        id: 'invites',
        label: `${unlinked} invite${unlinked === 1 ? '' : 's'} pending`,
        onClick: () => onGoToMembers?.(),
      });
    }

    if (
      onOpenCloseout
      && !trip.closed
      && trip.endDate
      && isFeatureEnabled('enableTripCloseout', { tripId: trip.id })
      && trip.endDate < new Date().toISOString().slice(0, 10)
    ) {
      next.push({
        id: 'closeout',
        label: 'Close out trip',
        onClick: () => onOpenCloseout(),
      });
    }

    return next;
  }, [
    myMemberId,
    balances,
    expenses,
    trip,
    members,
    isFeatureEnabled,
    onOpenCloseout,
    onGoToLedger,
    onGoToMembers,
    onGoToBalances,
  ]);

  const pendingCount = syncQueue.length;
  if (pendingCount === 0 && chips.length === 0) return null;

  return (
    <div className="summary-attention-strip" role="region" aria-label="Things that need your attention">
      {pendingCount > 0 && (
        <button
          type="button"
          className="summary-sync-ready"
          onClick={async () => {
            triggerHaptic('light');
            if (!isOnline) return;
            setIsSyncing(true);
            try {
              await processQueue();
            } finally {
              setIsSyncing(false);
            }
          }}
        >
          {isOnline
            ? (isSyncing ? 'Syncing…' : `${pendingCount} change${pendingCount === 1 ? '' : 's'} ready to sync`)
            : `${pendingCount} change${pendingCount === 1 ? '' : 's'} queued · will sync when online`}
        </button>
      )}
      {chips.length > 0 && (
        <div className="summary-needs-you-chips">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className="summary-needs-chip"
              onClick={() => {
                triggerHaptic('light');
                chip.onClick();
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
