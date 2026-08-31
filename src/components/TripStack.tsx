import { useEffect, useMemo, useRef, useState } from 'react';
import type { Member, Trip } from '../types';
import { IconArchive, IconEdit, IconTrash } from './Icons';
import { formatTripStamp } from '../utils/dateRange';
import { initial } from '../utils/initials';
import { avatarColorForName } from '../utils/avatarColor';
import { fetchPlaceCoverImage } from '../services/placeImageService';
import { getImageLuminance } from '../utils/imageLuminance';
import { triggerHaptic } from '../utils/haptics';
import { calculateSettlements } from '../utils/settlement';
import { useTripStore } from '../store/tripStore';

const PEEK_DEPTH = 3;
const SWIPE_THRESHOLD = 90;
const LONG_PRESS_MS = 450;
const JITTER = 10;
const BRIGHT_LUMINANCE_THRESHOLD = 0.55;

type Props = {
  trips: Trip[]; // 2+ trips, any order -- this component sorts by recency itself
  members: Record<string, Member>;
  userId: string | null;
  onSelectTrip: (id: string) => void;
  onStartEditTrip: (trip: Trip) => void;
  onDeleteTrip: (trip: Trip) => void;
  onArchiveTrip: (trip: Trip) => void;
  onShowList: () => void;
  onFrontChange?: (trip: Trip | null) => void;
  onIndexChange?: (index: number) => void;
  targetTripId?: string | null;
};

// Cover photo for a card's background. fetchPlaceCoverImage already
// dedupes/caches by place name at module scope, so mounting this once per
// peeking card (not just the front one) is effectively free after the
// first fetch, and doubles as prefetching for whichever card rises next.
export function useTripPhoto(destination?: string, coverImageUrl?: string, tripName?: string): string | null {
  const [url, setUrl] = useState<string | null>(coverImageUrl || null);
  useEffect(() => {
    let cancelled = false;
    if (coverImageUrl) {
      setUrl(coverImageUrl);
      return;
    }
    const query = destination || tripName;
    if (!query) {
      setUrl(null);
      return;
    }
    fetchPlaceCoverImage(query).then((result) => {
      if (!cancelled) setUrl(result);
    });
    return () => { cancelled = true; };
  }, [destination, coverImageUrl, tripName]);
  return url;
}

// Text sits at the top of the card (stamp/destination/name/meta) -- only
// the avatar row lives at the bottom -- so the scrim darkens the top, and
// this reads the same top region to decide whether that scrim needs dark
// or light text on top of it.
function useCardTone(photoUrl: string | null): 'light' | 'dark' {
  const [tone, setTone] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    let cancelled = false;
    setTone('light');
    if (!photoUrl) return;
    getImageLuminance(photoUrl).then((luminance) => {
      if (!cancelled && luminance !== null) {
        setTone(luminance > BRIGHT_LUMINANCE_THRESHOLD ? 'dark' : 'light');
      }
    });
    return () => { cancelled = true; };
  }, [photoUrl]);
  return tone;
}

function CardContent({ trip, members, userId }: { trip: Trip; members: Record<string, Member>; userId: string | null }) {
  const stamp = formatTripStamp(trip.startDate, trip.endDate);
  const tripMembers = trip.memberIds.map((id) => members[id]).filter(Boolean);
  const shown = tripMembers.slice(0, 3);
  const overflow = tripMembers.length - shown.length;
  const expenseCount = trip.expenseCount || 0;
  const photoUrl = useTripPhoto(trip.destination, trip.coverImageUrl, trip.name);
  const tone = useCardTone(photoUrl);
  const expenses = useTripStore((s) => s.expenses);
  const userDisplayName = useTripStore((s) => s.userDisplayName);

  // Robustly identify current user's member object in this trip
  const myMember = useMemo(() => {
    if (!trip.memberIds || trip.memberIds.length === 0) return null;
    const tripMemberList = trip.memberIds.map((id) => members[id]).filter(Boolean);
    if (userId) {
      const byLinked = tripMemberList.find((m) => m.linkedUserId === userId);
      if (byLinked) return byLinked;
      if (trip.ownerId === userId) {
        const ownerM = tripMemberList.find((m) => m.linkedUserId === trip.ownerId);
        if (ownerM) return ownerM;
      }
    }
    if (userDisplayName) {
      const nameLower = userDisplayName.trim().toLowerCase();
      const byName = tripMemberList.find((m) => m.name && m.name.trim().toLowerCase() === nameLower);
      if (byName) return byName;
    }
    return tripMemberList[0] || null;
  }, [trip, members, userId, userDisplayName]);

  // Compute live user settlement balance for this trip on real-time basis
  const balanceInfo = useMemo(() => {
    const activeExpenses = expenses.filter((e) => e.tripId === trip.id && !e.deletedAt);
    if (activeExpenses.length === 0) {
      return null;
    }
    if (!myMember) {
      return { amount: 0, status: 'settled' as const };
    }
    try {
      const { balances } = calculateSettlements(trip, members, activeExpenses);
      const myBal = balances.find((b) => b.memberId === myMember.id);
      const amount = myBal ? myBal.balance : 0;
      if (amount > 0.01) return { amount, status: 'owed' as const };
      if (amount < -0.01) return { amount: Math.abs(amount), status: 'owe' as const };
      return { amount: 0, status: 'settled' as const };
    } catch {
      return null;
    }
  }, [trip, expenses, members, myMember]);

  return (
    <div className={`stack-card-face${photoUrl ? ` has-photo tone-${tone}` : ''}`}>
      {photoUrl && (
        <div
          key={photoUrl}
          className="stack-card-photo"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(7,11,18,0.45) 0%, rgba(7,11,18,0.12) 30%, rgba(7,11,18,0.92) 85%, rgba(7,11,18,0.98) 100%), url("${photoUrl}")`
          }}
        />
      )}
      <div className="stack-card-content">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
          <div className="pp-stamp">
            <span>{stamp.top}</span>
            <span>{stamp.bottom}</span>
          </div>
          {trip.destination && (
            <div className="stack-destination-pill">
              <span>📍</span> {trip.destination}
            </div>
          )}
        </div>

        <div style={{ marginTop: 'auto', marginBottom: '8px' }}>
          {balanceInfo && (
            <div style={{ marginBottom: '6px' }}>
              {balanceInfo.status === 'owed' ? (
                <span className="stack-balance-chip owed">
                  <span>💰</span> YOU ARE OWED {trip.baseCurrency || 'INR'} {Math.round(balanceInfo.amount).toLocaleString()}
                </span>
              ) : balanceInfo.status === 'owe' ? (
                <span className="stack-balance-chip owe">
                  <span>💸</span> YOU OWE {trip.baseCurrency || 'INR'} {Math.round(balanceInfo.amount).toLocaleString()}
                </span>
              ) : (
                <span className="stack-balance-chip settled">
                  <span>✓</span> ALL SETTLED UP
                </span>
              )}
            </div>
          )}

          <div className="pp-dest">Trip &middot; {trip.baseCurrency}</div>
          <h3 className="pp-name">{trip.name}</h3>
          <div className="pp-meta">
            {tripMembers.length} member{tripMembers.length === 1 ? '' : 's'} &middot; {expenseCount} expense{expenseCount === 1 ? '' : 's'}
          </div>
        </div>

        <div className="pp-avatars stack-card-avatars" style={{ marginTop: 0 }}>
          {shown.map((m) =>
            m.avatarUrl ? (
              <img key={m.id} src={m.avatarUrl} alt={m.name} title={m.name} className="pp-avatar" referrerPolicy="no-referrer" loading="lazy" decoding="async" width={24} height={24} />
            ) : (
              <span key={m.id} className="pp-avatar" style={{ background: avatarColorForName(m.name) }} title={m.name}>{initial(m.name)}</span>
            )
          )}
          {overflow > 0 && <span className="pp-avatar pp-avatar-more">+{overflow}</span>}
        </div>
      </div>
    </div>
  );
}

type CardItemProps = {
  trip: Trip;
  members: Record<string, Member>;
  userId: string | null;
  idx: number;
  canDelete: boolean;
  onOpen: () => void;
  onBrowse: () => void;
  onArchive: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

// Same component for every depth (front and peeking) so React keeps the
// DOM node when a card rises from depth-1/2 to depth-0 instead of
// unmounting one component type and mounting another -- that swap was
// what made the swipe transition look choppy, since a freshly-mounted
// element can't animate in from nothing. Only the front card (idx 0) is
// interactive: left/right swipe browses (non-destructive -- the card
// just rejoins the back of the stack), swipe up archives (reuses the
// existing, reversible archive action), and a long-press reveals
// Edit/Delete as explicit targets rather than putting a destructive
// action on a gesture that's easy to fire by accident while browsing.
function StackCardItem({ trip, members, userId, idx, canDelete, onOpen, onBrowse, onArchive, onEdit, onDelete }: CardItemProps) {
  const isFront = idx === 0;
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [exit, setExit] = useState<'left' | 'right' | 'up' | null>(null);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const active = useRef(false);
  const start = useRef({ x: 0, y: 0 });
  const moved = useRef(false);
  const gestureFired = useRef(false); // suppresses the click that follows a drag or long-press
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isFront || e.pointerType !== 'touch' || quickActionsOpen) return;
    active.current = true;
    moved.current = false;
    start.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
    longPressTimer.current = setTimeout(() => {
      if (!moved.current) {
        triggerHaptic('medium');
        gestureFired.current = true;
        setQuickActionsOpen(true);
        active.current = false;
        setDrag({ x: 0, y: 0 });
        setDragging(false);
      }
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!active.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (Math.abs(dx) > JITTER || Math.abs(dy) > JITTER) {
      moved.current = true;
      clearLongPress();
    }
    setDrag({ x: dx, y: dy });
  };

  const endDrag = () => {
    if (!active.current) return;
    active.current = false;
    clearLongPress();
    setDragging(false);

    const { x, y } = drag;
    if (Math.abs(x) > Math.abs(y) && Math.abs(x) > SWIPE_THRESHOLD) {
      gestureFired.current = true;
      triggerHaptic('light');
      setExit(x > 0 ? 'right' : 'left');
      setTimeout(onBrowse, 260);
      return;
    }
    if (y < -SWIPE_THRESHOLD && Math.abs(y) > Math.abs(x)) {
      gestureFired.current = true;
      triggerHaptic('success');
      setExit('up');
      setTimeout(onArchive, 260);
      return;
    }
    setDrag({ x: 0, y: 0 });
  };

  const handleClick = () => {
    if (gestureFired.current) {
      gestureFired.current = false;
      return;
    }
    onOpen();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen();
    }
  };

  const dragDistance = Math.sqrt(drag.x * drag.x + drag.y * drag.y);
  const dragScale = Math.max(0.95, 1 - dragDistance / 2400);
  const tiltDeg = (drag.x * 0.055).toFixed(2);

  const transform =
    exit === 'left' ? 'translateX(-160%) rotate(-18deg) scale(0.9)' :
    exit === 'right' ? 'translateX(160%) rotate(18deg) scale(0.9)' :
    exit === 'up' ? 'translateY(-140%) scale(0.9) rotate(2deg)' :
    `translate(${drag.x}px, ${drag.y}px) rotate(${tiltDeg}deg) scale(${dragScale})`;

  return (
    <div
      className={`stack-card depth-${idx}`}
      style={isFront ? {
        transform,
        opacity: exit ? 0 : 1,
        transition: dragging ? 'none' : 'transform 0.38s var(--ease-uber-spring), opacity 0.28s ease',
        touchAction: 'pan-y',
        boxShadow: dragging
          ? '0 24px 48px -8px rgba(0, 0, 0, 0.38), 0 12px 24px -4px rgba(0, 0, 0, 0.24)'
          : undefined,
        willChange: dragging ? 'transform' : undefined,
      } : undefined}
      onPointerDown={isFront ? handlePointerDown : undefined}
      onPointerMove={isFront ? handlePointerMove : undefined}
      onPointerUp={isFront ? endDrag : undefined}
      onPointerCancel={isFront ? endDrag : undefined}
      onClick={isFront ? handleClick : undefined}
      onKeyDown={isFront ? handleKeyDown : undefined}
      role={isFront ? 'button' : undefined}
      tabIndex={isFront ? 0 : -1}
      aria-label={isFront ? `Open trip ${trip.name}` : undefined}
      aria-hidden={isFront ? undefined : true}
    >
      <CardContent trip={trip} members={members} userId={userId} />
      {isFront && quickActionsOpen && (
        <div
          className="stack-quick-actions"
          onClick={(e) => { e.stopPropagation(); setQuickActionsOpen(false); }}
        >
          <button
            type="button"
            className="stack-qa-btn"
            aria-label="Edit trip"
            title="Edit trip"
            onClick={(e) => { e.stopPropagation(); setQuickActionsOpen(false); onEdit(); }}
          >
            <IconEdit size={18} />
          </button>
          <button
            type="button"
            className="stack-qa-btn"
            aria-label="Archive trip"
            title="Archive trip"
            onClick={(e) => { e.stopPropagation(); setQuickActionsOpen(false); onArchive(); }}
          >
            <IconArchive size={18} />
          </button>
          {canDelete && (
            <button
              type="button"
              className="stack-qa-btn danger"
              aria-label="Delete trip"
              title="Delete trip"
              onClick={(e) => { e.stopPropagation(); setQuickActionsOpen(false); onDelete(); }}
            >
              <IconTrash size={18} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function TripStack({ trips, members, userId, onSelectTrip, onStartEditTrip, onDeleteTrip, onArchiveTrip, onShowList, onFrontChange, onIndexChange, targetTripId }: Props) {
  const sortedIds = useMemo(
    () =>
      [...trips]
        .sort((a, b) => {
          const dateA = a.startDate || '';
          const dateB = b.startDate || '';
          if (dateA && dateB && dateA !== dateB) return dateB.localeCompare(dateA);
          return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
        })
        .map((t) => t.id),
    [trips]
  );
  const idsKey = sortedIds.join(',');
  const tripsById = useMemo(() => Object.fromEntries(trips.map((t) => [t.id, t])), [trips]);

  // Cycling the stack (browse) reorders locally; any real change to the
  // trip set or its recency order resets back to the fresh sort.
  const [manualOrder, setManualOrder] = useState<string[] | null>(null);
  useEffect(() => { setManualOrder(null); }, [idsKey]);

  const order = manualOrder ?? sortedIds;
  const visible = order.slice(0, PEEK_DEPTH).map((id) => tripsById[id]).filter(Boolean);
  const front = visible[0];

  useEffect(() => {
    onFrontChange?.(front ?? null);
    if (front) {
      const origIdx = sortedIds.indexOf(front.id);
      if (origIdx >= 0) onIndexChange?.(origIdx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [front?.id]);

  // Jump to targeted trip if requested from pagination stepper dots
  useEffect(() => {
    if (targetTripId && tripsById[targetTripId]) {
      const idx = order.indexOf(targetTripId);
      if (idx > 0) {
        setManualOrder([...order.slice(idx), ...order.slice(0, idx)]);
      }
    }
  }, [targetTripId, order, tripsById]);

  if (!front) return null;

  const cycleToBack = () => setManualOrder([...order.slice(1), order[0]]);

  const canDelete = (trip: Trip) =>
    !trip.ownerId || !userId || trip.ownerId === userId ||
    Boolean(trip.adminMemberIds && trip.memberIds.some((mid) => members[mid]?.linkedUserId === userId && trip.adminMemberIds?.includes(mid)));

  return (
    <div className="trip-stack">
      <div className="trip-stack-stage">
        {visible.map((trip, idx) => (
          <StackCardItem
            key={trip.id}
            trip={trip}
            members={members}
            userId={userId}
            idx={idx}
            canDelete={canDelete(trip)}
            onOpen={() => onSelectTrip(trip.id)}
            onBrowse={cycleToBack}
            onArchive={() => { onArchiveTrip(trip); cycleToBack(); }}
            onEdit={() => onStartEditTrip(trip)}
            onDelete={() => onDeleteTrip(trip)}
          />
        ))}
      </div>
      <button type="button" className="trip-stack-viewall" onClick={onShowList}>
        View all trips
      </button>
    </div>
  );
}
