import { useEffect, useMemo, useRef, useState } from 'react';
import type { Member, Trip } from '../types';
import { IconArchive, IconEdit, IconTrash } from './Icons';
import { formatTripStamp } from '../utils/dateRange';
import { initial } from '../utils/initials';
import { avatarColorForName } from '../utils/avatarColor';
import { fetchPlaceCoverImage } from '../services/placeImageService';
import { getImageLuminance } from '../utils/imageLuminance';
import { triggerHaptic } from '../utils/haptics';

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
};

// Cover photo for a card's background. fetchPlaceCoverImage already
// dedupes/caches by place name at module scope, so mounting this once per
// peeking card (not just the front one) is effectively free after the
// first fetch, and doubles as prefetching for whichever card rises next.
export function useTripPhoto(destination?: string): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    if (!destination) return;
    fetchPlaceCoverImage(destination).then((result) => {
      if (!cancelled) setUrl(result);
    });
    return () => { cancelled = true; };
  }, [destination]);
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

function CardContent({ trip, members }: { trip: Trip; members: Record<string, Member> }) {
  const stamp = formatTripStamp(trip.startDate, trip.endDate);
  const tripMembers = trip.memberIds.map((id) => members[id]).filter(Boolean);
  const shown = tripMembers.slice(0, 3);
  const overflow = tripMembers.length - shown.length;
  const expenseCount = trip.expenseCount || 0;
  const photoUrl = useTripPhoto(trip.destination);
  const tone = useCardTone(photoUrl);

  return (
    <div className={`stack-card-face${photoUrl ? ` has-photo tone-${tone}` : ''}`}>
      {photoUrl && (
        <div
          key={photoUrl}
          className="stack-card-photo"
          style={{ backgroundImage: `linear-gradient(180deg, rgba(15,21,29,0.55) 0%, rgba(15,21,29,0.22) 30%, rgba(15,21,29,0) 55%), url("${photoUrl}")` }}
        />
      )}
      <div className="stack-card-content">
        <div className="pp-stamp">
          <span>{stamp.top}</span>
          <span>{stamp.bottom}</span>
        </div>
        <div className="pp-dest">Trip &middot; {trip.baseCurrency}</div>
        <h3 className="pp-name">{trip.name}</h3>
        <div className="pp-meta">
          {tripMembers.length} member{tripMembers.length === 1 ? '' : 's'} &middot; {expenseCount} expense{expenseCount === 1 ? '' : 's'}
        </div>
        <div className="pp-avatars stack-card-avatars">
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
function StackCardItem({ trip, members, idx, canDelete, onOpen, onBrowse, onArchive, onEdit, onDelete }: CardItemProps) {
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

  const transform =
    exit === 'left' ? 'translateX(-160%) rotate(-16deg)' :
    exit === 'right' ? 'translateX(160%) rotate(16deg)' :
    exit === 'up' ? 'translateY(-140%) scale(0.92)' :
    `translate(${drag.x}px, ${drag.y}px) rotate(${drag.x / 24}deg)`;

  return (
    <div
      className={`stack-card depth-${idx}`}
      style={isFront ? {
        transform,
        opacity: exit ? 0 : 1,
        transition: dragging ? 'none' : 'transform 0.32s cubic-bezier(0.16,1,0.3,1), opacity 0.32s cubic-bezier(0.16,1,0.3,1)',
        touchAction: 'pan-y',
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
      <CardContent trip={trip} members={members} />
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

export function TripStack({ trips, members, userId, onSelectTrip, onStartEditTrip, onDeleteTrip, onArchiveTrip, onShowList, onFrontChange }: Props) {
  const sortedIds = useMemo(() => [...trips].sort((a, b) => b.updatedAt - a.updatedAt).map((t) => t.id), [trips]);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [front?.id]);

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
