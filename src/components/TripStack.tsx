import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Member, Trip } from '../types';
import { IconArchive, IconEdit, IconTrash } from './Icons';
import { formatTripStamp, tripDayNumber } from '../utils/dateRange';
import { initial } from '../utils/initials';
import { avatarColorForName } from '../utils/avatarColor';
import { fetchPlaceCoverImage } from '../services/placeImageService';
import { getImageLuminance, getImageDominantColor } from '../utils/imageLuminance';
import { triggerHaptic } from '../utils/haptics';
import { calculateSettlements } from '../utils/settlement';
import { useTripStore } from '../store/tripStore';
import { getDestinationWeatherRealtime, type WeatherData } from '../services/weatherService';

const PEEK_DEPTH = 3;
const SWIPE_THRESHOLD = 90;
const LONG_PRESS_MS = 450;
const JITTER = 10;
const BRIGHT_LUMINANCE_THRESHOLD = 0.55;
// Front card's spring-back/exit transition duration -- EXIT_COMMIT_MS is
// derived from this instead of being a second hand-picked number, so the
// two can't drift out of sync the way a bare "260" and a bare "0.38s" in
// two different files could.
const EXIT_TRANSITION_MS = 380;
// Fires late enough into the exit spring (~68%) that the card is already
// most of the way off-canvas before the stack reorders underneath it.
const EXIT_COMMIT_MS = Math.round(EXIT_TRANSITION_MS * 0.68);
const RING_RADIUS = 30;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function getItineraryProgress(startDate?: string, endDate?: string): number | null {
  if (!startDate || !endDate) return null;
  const todayStr = new Date().toISOString().split('T')[0];
  if (todayStr < startDate || todayStr > endDate) return null;
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const end = new Date(`${endDate}T23:59:59`).getTime();
  const now = Date.now();
  if (now < start || now > end) return null;
  const progress = ((now - start) / (end - start)) * 100;
  return Math.min(100, Math.max(0, Math.round(progress)));
}

// Real-Time destination weather hook with SWR & tab-focus revalidation
export function useDestinationWeather(
  destination?: string,
  tripName?: string,
  stops?: string[],
  isFront: boolean = false
): {
  weather: WeatherData | null;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
} {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const candidates = useMemo(() => {
    return [
      ...(stops || []),
      destination || '',
      tripName || '',
    ].filter(Boolean);
  }, [stops, destination, tripName]);

  const candidatesKey = candidates.join('||');

  const fetchWeather = useCallback(async (force = false) => {
    if (candidates.length === 0) return;
    if (force) setIsRefreshing(true);
    try {
      const data = await getDestinationWeatherRealtime(
        candidates,
        (liveData) => {
          setWeather(liveData);
        },
        force
      );
      if (data) {
        setWeather(data);
      }
    } finally {
      if (force) {
        setTimeout(() => setIsRefreshing(false), 500);
      }
    }
  }, [candidatesKey]);

  useEffect(() => {
    if (!isFront || candidates.length === 0) return;
    let cancelled = false;
    fetchWeather(false);

    // Revalidate when user re-enters app / browser tab
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !cancelled) {
        fetchWeather(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [isFront, candidatesKey, fetchWeather]);

  const refresh = useCallback(async () => {
    triggerHaptic('light');
    await fetchWeather(true);
  }, [fetchWeather]);

  return { weather, isRefreshing, refresh };
}

// Samples dominant color from cover photo for ambient radial backlighting
function useAmbientGlowColor(photoUrl: string | null): string | null {
  const [glowColor, setGlowColor] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!photoUrl) {
      setGlowColor(null);
      return;
    }
    getImageDominantColor(photoUrl).then((color) => {
      if (!cancelled && color) {
        setGlowColor(color);
      }
    });
    return () => { cancelled = true; };
  }, [photoUrl]);
  return glowColor;
}

// Compute contextual status badge (Ongoing / Upcoming) for card header
function getTripStatusBadge(startDate?: string, endDate?: string): { label: string; kind: 'ongoing' | 'upcoming' } | null {
  if (!startDate || !endDate) return null;
  const todayStr = new Date().toISOString().split('T')[0];
  if (todayStr >= startDate && todayStr <= endDate) {
    const day = tripDayNumber(startDate, todayStr);
    return { label: day ? `ONGOING · DAY ${day}` : 'ONGOING', kind: 'ongoing' };
  }
  if (todayStr < startDate) {
    const s = new Date(`${startDate}T00:00:00`).getTime();
    const t = new Date(`${todayStr}T00:00:00`).getTime();
    const diffDays = Math.ceil((s - t) / 86400000);
    return { label: diffDays === 1 ? 'STARTS TOMORROW' : `IN ${diffDays} DAYS`, kind: 'upcoming' };
  }
  return null;
}

// Beyond `threshold`, extra drag distance is damped instead of following
// the finger 1:1 -- same elastic idea SwipeableRow already uses, so a
// stray drag doesn't send the card sailing off past the point a release
// would commit it anyway.
function rubberBand(d: number, threshold: number = SWIPE_THRESHOLD): number {
  if (Math.abs(d) <= threshold) return d;
  const sign = d < 0 ? -1 : 1;
  const overflow = Math.abs(d) - threshold;
  return sign * (threshold + overflow * 0.45);
}

type Props = {
  trips: Trip[]; // 2+ trips, any order -- this component sorts by recency itself
  members: Record<string, Member>;
  userId: string | null;
  onSelectTrip: (id: string) => void;
  onQuickAddExpense?: (tripId: string) => void;
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

function CardContent({
  trip,
  members,
  userId,
  isFront = false,
  onQuickAddExpense,
}: {
  trip: Trip;
  members: Record<string, Member>;
  userId: string | null;
  isFront?: boolean;
  onQuickAddExpense?: (tripId: string) => void;
}) {
  const stamp = formatTripStamp(trip.startDate, trip.endDate);
  const tripMembers = trip.memberIds.map((id) => members[id]).filter(Boolean);
  const shown = tripMembers.slice(0, 3);
  const overflow = tripMembers.length - shown.length;
  const expenseCount = trip.expenseCount || 0;
  const photoUrl = useTripPhoto(trip.destination, trip.coverImageUrl, trip.name);
  const tone = useCardTone(photoUrl);
  const expenses = useTripStore((s) => s.expenses);
  const userDisplayName = useTripStore((s) => s.userDisplayName);
  const stopNames = useMemo(() => trip.stops?.map((s) => s.name).filter(Boolean), [trip.stops]);
  const { weather, isRefreshing, refresh: refreshWeather } = useDestinationWeather(trip.destination, trip.name, stopNames, isFront);

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

  const statusBadge = useMemo(
    () => getTripStatusBadge(trip.startDate, trip.endDate),
    [trip.startDate, trip.endDate]
  );

  const itineraryProgress = useMemo(
    () => getItineraryProgress(trip.startDate, trip.endDate),
    [trip.startDate, trip.endDate]
  );

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
        <div className="stack-card-top-bar">
          <div className="pp-stamp">
            <span>{stamp.top}</span>
            <span>{stamp.bottom}</span>
          </div>

          <div className="stack-unified-header">
            {statusBadge && (
              <span className={`stack-status-dot-indicator ${statusBadge.kind}`} title={statusBadge.label}>
                <span className="stack-status-live-dot" />
                <span className="stack-status-label">{statusBadge.label}</span>
              </span>
            )}

            {(trip.destination || weather) && (
              <div
                className={`stack-header-caption${isRefreshing ? ' refreshing' : ''}`}
                onClick={(e) => {
                  if (weather) {
                    e.stopPropagation();
                    refreshWeather();
                  }
                }}
                role={weather ? 'button' : undefined}
                tabIndex={weather ? 0 : undefined}
                onKeyDown={(e) => {
                  if (weather && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    e.stopPropagation();
                    refreshWeather();
                  }
                }}
                title={weather ? `Live: ${weather.condition} in ${weather.city}. Tap to refresh.` : trip.destination}
              >
                {trip.destination && (
                  <span className="stack-caption-dest">{trip.destination}</span>
                )}
                {trip.destination && weather && <span className="stack-header-sep">&middot;</span>}
                {weather && (
                  <span className="stack-caption-weather">
                    <span className={`weather-emoji-icon${isRefreshing ? ' spin' : ''}`}>{weather.weatherEmoji}</span>
                    <span>{weather.tempC}&deg;C</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 'auto', marginBottom: '8px' }}>
          {balanceInfo && (balanceInfo.status === 'owed' || balanceInfo.status === 'owe') && (
            <div style={{ marginBottom: '6px' }}>
              {balanceInfo.status === 'owed' ? (
                <span className="stack-balance-chip owed">
                  <span>💰</span> YOU ARE OWED {trip.baseCurrency || 'INR'} {Math.round(balanceInfo.amount).toLocaleString()}
                </span>
              ) : (
                <span className="stack-balance-chip owe">
                  <span>💸</span> YOU OWE {trip.baseCurrency || 'INR'} {Math.round(balanceInfo.amount).toLocaleString()}
                </span>
              )}
            </div>
          )}

          <div className="pp-dest">
            Trip &middot; {trip.baseCurrency}
            {balanceInfo?.status === 'settled' && (
              <>
                <span className="stack-settled-dot"> &middot; </span>
                <span className="stack-settled-sub">✓ Settled</span>
              </>
            )}
          </div>
          <h3 className="pp-name">{trip.name}</h3>
          <div className="pp-meta">
            {tripMembers.length} member{tripMembers.length === 1 ? '' : 's'} &middot; {expenseCount} expense{expenseCount === 1 ? '' : 's'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 0 }}>
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

          {isFront && onQuickAddExpense && (
            <button
              type="button"
              className="stack-quick-add-chip"
              title="Add an expense directly to this trip"
              aria-label="Add expense"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic('medium');
                onQuickAddExpense(trip.id);
              }}
            >
              <span>+</span> Expense
            </button>
          )}
        </div>

        {/* Ambient Itinerary progress bar along bottom rim */}
        {itineraryProgress !== null && (
          <div className="stack-itinerary-progress-track" title={`Itinerary progress: ${itineraryProgress}%`}>
            <div className="stack-itinerary-progress-fill" style={{ width: `${itineraryProgress}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}

type CardItemProps = {
  trip: Trip;
  members: Record<string, Member>;
  userId: string | null;
  idx: number;
  totalTrips: number;
  canDelete: boolean;
  dragProgress?: number;
  onDragProgress?: (ratio: number, dragX: number) => void;
  onPeekPreview?: () => void;
  onOpen: () => void;
  onQuickAddExpense?: (tripId: string) => void;
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
function StackCardItem({
  trip,
  members,
  userId,
  idx,
  totalTrips,
  canDelete,
  dragProgress,
  onDragProgress,
  onPeekPreview,
  onOpen,
  onQuickAddExpense,
  onBrowse,
  onArchive,
  onEdit,
  onDelete,
}: CardItemProps) {
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
  const ringRef = useRef<HTMLDivElement>(null);
  const ringCircleRef = useRef<SVGCircleElement>(null);
  const holdRaf = useRef<number | null>(null);
  const holdStart = useRef(0);
  const lastPointer = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const velocity = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });
  const lastTapRef = useRef(0);

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Fills the long-press ring over LONG_PRESS_MS so the hold reads as
  // building toward something instead of a dead pause before the menu
  // appears. Written straight to the DOM node every frame rather than
  // through React state, so a ~450ms hold doesn't cost 25+ re-renders.
  const startHoldRing = () => {
    if (prefersReducedMotion || !ringRef.current || !ringCircleRef.current) return;
    ringRef.current.style.opacity = '1';
    holdStart.current = performance.now();
    const tick = () => {
      const t = Math.min(1, (performance.now() - holdStart.current) / LONG_PRESS_MS);
      if (ringCircleRef.current) ringCircleRef.current.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - t));
      if (t < 1) holdRaf.current = requestAnimationFrame(tick);
    };
    holdRaf.current = requestAnimationFrame(tick);
  };

  const stopHoldRing = (completed: boolean) => {
    if (holdRaf.current) {
      cancelAnimationFrame(holdRaf.current);
      holdRaf.current = null;
    }
    if (!ringRef.current || !ringCircleRef.current) return;
    if (!completed) {
      ringRef.current.style.opacity = '0';
      ringCircleRef.current.style.strokeDashoffset = String(RING_CIRCUMFERENCE);
    } else {
      setTimeout(() => { if (ringRef.current) ringRef.current.style.opacity = '0'; }, 150);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isFront || e.pointerType !== 'touch' || quickActionsOpen) return;
    const now = performance.now();

    // Double-tap peek micro-gesture: rapidly double-tapping peeks the next card
    if (totalTrips > 1 && now - lastTapRef.current < 280) {
      lastTapRef.current = 0;
      clearLongPress();
      stopHoldRing(false);
      triggerHaptic('light');
      gestureFired.current = true;
      onPeekPreview?.();
      return;
    }
    lastTapRef.current = now;

    active.current = true;
    moved.current = false;
    start.current = { x: e.clientX, y: e.clientY };
    lastPointer.current = { x: e.clientX, y: e.clientY, time: now };
    velocity.current = { vx: 0, vy: 0 };
    setDragging(true);
    startHoldRing();
    longPressTimer.current = setTimeout(() => {
      if (!moved.current) {
        triggerHaptic('medium');
        gestureFired.current = true;
        stopHoldRing(true);
        setQuickActionsOpen(true);
        active.current = false;
        setDrag({ x: 0, y: 0 });
        setDragging(false);
        onDragProgress?.(0, 0);
      }
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!active.current) return;
    const now = performance.now();
    const dt = now - lastPointer.current.time;
    if (dt > 8) {
      velocity.current = {
        vx: (e.clientX - lastPointer.current.x) / dt,
        vy: (e.clientY - lastPointer.current.y) / dt,
      };
      lastPointer.current = { x: e.clientX, y: e.clientY, time: now };
    }
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (Math.abs(dx) > JITTER || Math.abs(dy) > JITTER) {
      if (!moved.current) stopHoldRing(false);
      moved.current = true;
      clearLongPress();
    }
    // Damp horizontal drag if there's only 1 trip in the deck
    const effectiveDx = totalTrips < 2 ? dx * 0.25 : dx;
    setDrag({ x: effectiveDx, y: dy });
    onDragProgress?.(Math.min(1, Math.max(Math.abs(effectiveDx), Math.max(0, dy * 1.5)) / SWIPE_THRESHOLD), effectiveDx);
  };

  const endDrag = () => {
    if (!active.current) return;
    active.current = false;
    clearLongPress();
    stopHoldRing(false);
    setDragging(false);
    onDragProgress?.(0, 0);

    const { x, y } = drag;
    const { vx, vy } = velocity.current;
    const canSwipe = totalTrips >= 2;

    // Velocity-assisted flick (natural quick throw) or distance-based commit
    const isHorizFlick = canSwipe && Math.abs(vx) > 0.42 && Math.abs(x) > 24;
    const isHorizThreshold = canSwipe && Math.abs(x) > Math.abs(y) && Math.abs(x) > SWIPE_THRESHOLD;

    if (isHorizFlick || isHorizThreshold) {
      gestureFired.current = true;
      triggerHaptic('light');
      const dir = isHorizFlick ? (vx > 0 ? 'right' : 'left') : (x > 0 ? 'right' : 'left');
      setExit(dir);
      const flickSpeed = Math.max(1, Math.abs(vx));
      const dynamicCommitMs = Math.max(160, Math.min(EXIT_COMMIT_MS, Math.round(EXIT_COMMIT_MS / (flickSpeed * 0.9))));
      setTimeout(onBrowse, dynamicCommitMs);
      return;
    }

    const isUpFlick = vy < -0.42 && y < -24;
    const isUpThreshold = y < -SWIPE_THRESHOLD && Math.abs(y) > Math.abs(x);

    if (isUpFlick || isUpThreshold) {
      gestureFired.current = true;
      triggerHaptic('success');
      setExit('up');
      const flickSpeed = Math.max(1, Math.abs(vy));
      const dynamicCommitMs = Math.max(160, Math.min(EXIT_COMMIT_MS, Math.round(EXIT_COMMIT_MS / (flickSpeed * 0.9))));
      setTimeout(onArchive, dynamicCommitMs);
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

  // Visually damp beyond the swipe threshold (rubberBand) so the card
  // stays near the frame during an overlong drag; the raw drag.x/drag.y
  // (undamped) still drive the actual commit decision in endDrag above.
  const renderX = rubberBand(drag.x);
  const renderY = drag.y < 0 ? -rubberBand(-drag.y) : rubberBand(drag.y);
  const tiltDeg = (renderX * 0.055).toFixed(2);
  const rotateY = (renderX * 0.038).toFixed(2);
  const rotateX = (-renderY * 0.032).toFixed(2);

  const transform =
    exit === 'left' ? 'translateX(-160%) rotate(-18deg) scale(0.9)' :
    exit === 'right' ? 'translateX(160%) rotate(18deg) scale(0.9)' :
    exit === 'up' ? 'translateY(-140%) scale(0.9) rotate(2deg)' :
    `translate3d(${renderX}px, ${renderY}px, 0) rotate(${tiltDeg}deg) rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;

  // Directional commit-preview badge: tells the user what a release will
  // do before they let go, fading/arming in as the drag crosses threshold.
  const badgeHoriz = Math.abs(drag.x) > Math.abs(drag.y);
  const badgeDist = badgeHoriz ? Math.abs(drag.x) : Math.abs(drag.y);
  const badgeArmed = badgeDist > SWIPE_THRESHOLD || Math.abs(velocity.current.vx) > 0.45;
  const badgeProgress = Math.min(1, badgeDist / SWIPE_THRESHOLD);
  const badgeKind: 'browse' | 'archive' | 'peek' | null =
    !dragging || exit ? null :
    totalTrips >= 2 && badgeHoriz && Math.abs(drag.x) > 6 ? 'browse' :
    drag.y < -6 ? 'archive' :
    totalTrips >= 2 && drag.y > 8 ? 'peek' : null;

  // Real-time reactive escalation for cards at depth-1 and depth-2
  let peekStyle: React.CSSProperties | undefined = undefined;
  if (!isFront) {
    if (idx === 1) {
      const p = dragProgress || 0;
      const dy = 14 - p * 14;
      const s = 0.96 + p * 0.04;
      const r = -2.5 + p * 2.5;
      const blurVal = Math.max(0, 0.7 * (1 - p * 1.5));
      peekStyle = {
        transform: `translate3d(0, ${dy.toFixed(1)}px, 0) scale(${s.toFixed(3)}) rotate(${r.toFixed(2)}deg)`,
        filter: blurVal > 0.05 ? `blur(${blurVal.toFixed(1)}px)` : 'none',
        transition: p > 0 || prefersReducedMotion ? 'none' : 'transform 0.34s var(--ease-decel), filter 0.34s var(--ease-decel)',
        willChange: p > 0 ? 'transform, filter' : undefined,
      };
    } else if (idx === 2) {
      const p = dragProgress || 0;
      const dy = 26 - p * 12;
      const s = 0.92 + p * 0.04;
      const r = 2 - p * 4.5;
      const blurVal = Math.max(0, 1.4 - p * 0.7);
      const bright = 0.88 + p * 0.08;
      const op = 0.85 + p * 0.11;
      peekStyle = {
        transform: `translate3d(0, ${dy.toFixed(1)}px, 0) scale(${s.toFixed(3)}) rotate(${r.toFixed(2)}deg)`,
        filter: `blur(${blurVal.toFixed(1)}px) brightness(${bright.toFixed(2)})`,
        opacity: op,
        transition: p > 0 || prefersReducedMotion ? 'none' : 'transform 0.34s var(--ease-decel), opacity 0.34s var(--ease-decel), filter 0.34s var(--ease-decel)',
        willChange: p > 0 ? 'transform, opacity, filter' : undefined,
      };
    }
  }

  return (
    <div
      className={`stack-card depth-${idx}`}
      style={isFront ? {
        transform,
        opacity: exit ? 0 : 1,
        transition: dragging || prefersReducedMotion
          ? 'none'
          : `transform ${EXIT_TRANSITION_MS}ms var(--ease-uber-spring), opacity 0.28s ease`,
        touchAction: 'pan-y',
        boxShadow: dragging
          ? '0 28px 56px -10px rgba(0, 0, 0, 0.45), 0 16px 28px -6px rgba(0, 0, 0, 0.3)'
          : undefined,
        willChange: dragging ? 'transform' : undefined,
      } : peekStyle}
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
      {/* Idle sway (peek cards only, see CSS) sits on this wrapper, not
          .stack-card itself, so it layers on top of the depth-position
          transform instead of fighting it. */}
      <div className="stack-card-sway">
        <CardContent
          trip={trip}
          members={members}
          userId={userId}
          isFront={isFront}
          onQuickAddExpense={isFront ? onQuickAddExpense : undefined}
        />
      </div>

      {isFront && badgeKind && (
        <div
          className={`stack-swipe-badge ${badgeKind}`}
          style={{
            opacity: badgeProgress,
            transform: `translate(-50%, ${(-6 + badgeProgress * 6).toFixed(1)}px) scale(${(0.85 + badgeProgress * (badgeArmed ? 0.2 : 0.1)).toFixed(2)})`,
          }}
        >
          {badgeKind === 'browse' ? (drag.x < 0 ? '← Browse' : 'Browse →') :
           badgeKind === 'archive' ? '↑ Archive' : '↓ Peek Next'}
        </div>
      )}
      {isFront && (
        <div className="stack-hold-ring" ref={ringRef} aria-hidden="true">
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle className="track" cx={36} cy={36} r={RING_RADIUS} fill="none" strokeWidth={4} />
            <circle
              ref={ringCircleRef}
              className="fill"
              cx={36} cy={36} r={RING_RADIUS} fill="none" strokeWidth={4}
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={RING_CIRCUMFERENCE}
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}
      {isFront && quickActionsOpen && (
        <div
          className="stack-quick-actions"
          onClick={(e) => { e.stopPropagation(); setQuickActionsOpen(false); }}
        >
          {onQuickAddExpense && (
            <button
              type="button"
              className="stack-qa-btn primary"
              aria-label="Add expense"
              title="Add expense to this trip"
              onClick={(e) => { e.stopPropagation(); setQuickActionsOpen(false); onQuickAddExpense(trip.id); }}
            >
              <span style={{ fontSize: '18px', fontWeight: 800 }}>+</span>
            </button>
          )}
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

export function TripStack({
  trips,
  members,
  userId,
  onSelectTrip,
  onQuickAddExpense,
  onStartEditTrip,
  onDeleteTrip,
  onArchiveTrip,
  onShowList,
  onFrontChange,
  onIndexChange,
  targetTripId,
}: Props) {
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
  const [dragRatio, setDragRatio] = useState(0);
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

  const [peekPreview, setPeekPreview] = useState(false);
  const effectiveDragProgress = peekPreview ? 0.85 : dragRatio;

  const handlePeekPreview = () => {
    setPeekPreview(true);
    setTimeout(() => setPeekPreview(false), 700);
  };

  const frontPhotoUrl = useTripPhoto(front?.destination, front?.coverImageUrl, front?.name);
  const frontGlowColor = useAmbientGlowColor(frontPhotoUrl);

  if (!front) return null;

  const cycleToBack = () => setManualOrder([...order.slice(1), order[0]]);

  const canDelete = (trip: Trip) =>
    !trip.ownerId || !userId || trip.ownerId === userId ||
    Boolean(trip.adminMemberIds && trip.memberIds.some((mid) => members[mid]?.linkedUserId === userId && trip.adminMemberIds?.includes(mid)));

  return (
    <div className="trip-stack">
      <div className="trip-stack-stage">
        {frontGlowColor && (
          <div
            className="stack-ambient-glow"
            style={{
              background: `radial-gradient(ellipse 75% 55% at 50% 32%, ${frontGlowColor} 0%, transparent 75%)`,
            }}
            aria-hidden="true"
          />
        )}
        {visible.map((trip, idx) => (
          <StackCardItem
            key={trip.id}
            trip={trip}
            members={members}
            userId={userId}
            idx={idx}
            totalTrips={trips.length}
            canDelete={canDelete(trip)}
            dragProgress={effectiveDragProgress}
            onDragProgress={idx === 0 ? (ratio) => setDragRatio(ratio) : undefined}
            onPeekPreview={handlePeekPreview}
            onOpen={() => onSelectTrip(trip.id)}
            onQuickAddExpense={onQuickAddExpense}
            onBrowse={cycleToBack}
            onArchive={() => { onArchiveTrip(trip); cycleToBack(); }}
            onEdit={() => onStartEditTrip(trip)}
            onDelete={() => onDeleteTrip(trip)}
          />
        ))}
      </div>
      {trips.length >= 2 && (
        <button type="button" className="trip-stack-viewall" onClick={onShowList}>
          View all trips
        </button>
      )}
    </div>
  );
}
