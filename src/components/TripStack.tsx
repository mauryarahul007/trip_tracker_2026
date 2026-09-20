import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Member, Trip } from '../types';
import { IconArchive, IconEdit, IconTrash } from './Icons';
import { formatTripStamp, tripDayNumber } from '../utils/dateRange';
import { initial } from '../utils/initials';
import { avatarColorForName } from '../utils/avatarColor';
import { fetchPlaceCoverImage, coverImageUrlAtWidth, PEEK_COVER_WIDTH, COVER_WIDTH } from '../services/placeImageService';
import { getImageLuminance, getImageDominantColor, photoTextTone } from '../utils/imageLuminance';
import { triggerHaptic } from '../utils/haptics';
import { getDestinationWeatherRealtime, type WeatherData } from '../services/weatherService';
import { useEscapeKey } from '../utils/useEscapeKey';
import { sortTrips, type TripSortMode } from '../utils/tripSort';
import { PassportStamp } from './common/PassportStamp';
import {
  EXIT_TRANSITION_MS,
  SWIPE_THRESHOLD,
  exitCardTransform,
  frontCardTransform,
  peekCardTransform,
  prevCardTransform,
  rubberBand,
  stackMotionMode,
} from '../utils/tripStackMotion';

const PEEK_DEPTH = 3;
const LONG_PRESS_MS = 450;
const JITTER = 10;
const MOTION_MODE = stackMotionMode();
const RING_RADIUS = 30;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// toISOString() reports the UTC calendar date, which drifts a day off the
// user's actual local date for roughly a third of the day depending on
// timezone (e.g. IST is UTC+5:30 -- after 6:30pm local, toISOString() is
// already on tomorrow's UTC date). That mismatch fed straight into the
// upcoming/ongoing/past classification below, so trips could misclassify
// depending on what time of day (and where) the viewer happened to load
// the card. en-CA formats as YYYY-MM-DD in the *local* timezone.
function localDateStr(d: Date = new Date()): string {
  return d.toLocaleDateString('en-CA');
}

function getItineraryProgress(startDate?: string, endDate?: string): number | null {
  if (!startDate || !endDate) return null;
  const todayStr = localDateStr();
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

// Compute contextual status badge (Ongoing / Upcoming / Closed / Archived) for card header
function getTripStatusBadge(trip: { startDate?: string; endDate?: string; closed?: boolean; archived?: boolean }): { label: string; kind: 'ongoing' | 'upcoming' | 'closed' | 'archived' } | null {
  if (trip.archived) {
    return { label: 'ARCHIVED', kind: 'archived' };
  }
  if (trip.closed) {
    return { label: 'CLOSED', kind: 'closed' };
  }
  const { startDate, endDate } = trip;
  if (!startDate || !endDate) return null;
  const todayStr = localDateStr();
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

function writePeekCard(el: HTMLElement | null, depth: 1 | 2 | 3, p: number, dragging: boolean) {
  if (!el) return;
  const transKey = dragging ? '1' : '0';
  if (el.dataset.stackDrag !== transKey) {
    el.dataset.stackDrag = transKey;
    el.style.transition = dragging || prefersReducedMotion
      ? 'none'
      : 'transform 0.34s var(--ease-decel), opacity 0.34s var(--ease-decel)';
  }
  const next = depth === 3 ? prevCardTransform(p) : peekCardTransform(depth, p, MOTION_MODE);
  el.style.transform = next.transform;
  if (next.opacity !== undefined) el.style.opacity = next.opacity;
  // Above the peeks while it rises (same z as depth-1, but later in the DOM).
  if (depth === 3) el.style.zIndex = p > 0 ? '2' : '';
}

type Props = {
  trips: Trip[]; // 2+ trips, any order -- this component sorts them itself
  sortMode?: TripSortMode;
  onSortModeChange?: (mode: TripSortMode) => void; // omit to hide the sort toggle
  members: Record<string, Member>;
  settledTripIds?: Record<string, boolean>;
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
export function useTripPhoto(destination?: string, coverImageUrl?: string, tripName?: string, width: number = COVER_WIDTH): string | null {
  const [url, setUrl] = useState<string | null>(() => coverImageUrlAtWidth(coverImageUrl || null, width));
  useEffect(() => {
    let cancelled = false;
    if (coverImageUrl) {
      setUrl(coverImageUrlAtWidth(coverImageUrl, width));
      return;
    }
    const query = destination || tripName;
    if (!query) {
      setUrl(null);
      return;
    }
    fetchPlaceCoverImage(query).then((result) => {
      if (!cancelled) setUrl(coverImageUrlAtWidth(result, width));
    });
    return () => { cancelled = true; };
  }, [destination, coverImageUrl, tripName, width]);
  return url;
}

// Text sits at the top of the card (stamp/destination/name/meta) -- only
// the avatar row lives at the bottom -- so the scrim darkens the top, and
// this reads the same top region to decide whether that scrim needs dark
// or light text on top of it. Shared with the home expeditions chip.
export function usePhotoTextTone(photoUrl: string | null): 'light' | 'dark' {
  const [tone, setTone] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    let cancelled = false;
    setTone('light');
    if (!photoUrl) return;
    getImageLuminance(photoUrl).then((luminance) => {
      if (!cancelled) setTone(photoTextTone(luminance));
    });
    return () => { cancelled = true; };
  }, [photoUrl]);
  return tone;
}

const CardContent = memo(function CardContent({
  trip,
  members,
  isSettled,
  isFront = false,
  onQuickAddExpense,
}: {
  trip: Trip;
  members: Record<string, Member>;
  isSettled?: boolean;
  isFront?: boolean;
  onQuickAddExpense?: (tripId: string) => void;
}) {
  const stamp = formatTripStamp(trip.startDate, trip.endDate);
  const tripMembers = trip.memberIds.map((id) => members[id]).filter(Boolean);
  const shown = tripMembers.slice(0, 3);
  const overflow = tripMembers.length - shown.length;
  const expenseCount = trip.expenseCount || 0;
  const photoUrl = useTripPhoto(trip.destination, trip.coverImageUrl, trip.name, isFront ? COVER_WIDTH : PEEK_COVER_WIDTH);
  const tone = usePhotoTextTone(photoUrl);
  const stopNames = useMemo(() => trip.stops?.map((s) => s.name).filter(Boolean), [trip.stops]);
  const { weather, isRefreshing, refresh: refreshWeather } = useDestinationWeather(trip.destination, trip.name, stopNames, isFront);

  const statusBadge = useMemo(
    () => getTripStatusBadge(trip),
    [trip.startDate, trip.endDate, trip.closed, trip.archived]
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
        {/* Authentic Passport Ink Stamp Watermark: floating mid-right on the card cover photo without displacing any text/controls */}
        <div
          style={{
            position: 'absolute',
            right: '18px',
            top: '70px',
            zIndex: 1,
            pointerEvents: 'none',
            opacity: 0.92,
          }}
          aria-hidden="true"
        >
          <PassportStamp
            destination={trip.destination || trip.name}
            tripName={trip.name}
            date={trip.startDate}
            variant={trip.closed ? 'settled' : isSettled ? 'settled' : 'entry'}
            color={trip.closed || isSettled ? 'teal' : 'auto'}
            size={54}
          />
        </div>

        <div className="stack-card-top-bar">
          <div className="pp-stamp">
            <span>{stamp.top}</span>
            <span>{stamp.bottom}</span>
          </div>

          <div className="stack-unified-header">
            {/* Own row: a multi-stop route ("Gangtok -> Lachung -> Pelling")
                needs real width, and sharing one pill with the countdown
                badge left it with almost none. Splitting into two stacked
                pills gives destination+weather nearly the full row instead
                of fighting the badge for space. */}
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
          <div className="pp-dest">
            Trip &middot; {trip.baseCurrency}
            {isSettled && (
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
                <img key={m.id} src={m.avatarUrl} alt={m.name} title={m.name} className="pp-avatar" referrerPolicy="no-referrer" loading="lazy" decoding="async" width={24} height={24} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
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
});

type CardItemProps = {
  trip: Trip;
  members: Record<string, Member>;
  isSettled?: boolean;
  idx: number;
  totalTrips: number;
  canDelete: boolean;
  onDragProgress?: (ratio: number, dragX: number) => void;
  bindCardEl?: (el: HTMLDivElement | null) => void;
  onPeekPreview?: () => void;
  onOpen: () => void;
  onQuickAddExpense?: (tripId: string) => void;
  onBrowse: (dir: 'left' | 'right') => void;
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
  isSettled,
  idx,
  totalTrips,
  canDelete,
  onDragProgress,
  bindCardEl,
  onPeekPreview,
  onOpen,
  onQuickAddExpense,
  onBrowse,
  onArchive,
  onEdit,
  onDelete,
}: CardItemProps) {
  const isFront = idx === 0;
  const [exit, setExit] = useState<'left' | 'right' | 'up' | null>(null);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  // Contextual menu: no useHistoryBack. Closing this overlay and opening
  // ConfirmDialog in the same tick would race history.back()'s popstate
  // against the dialog's new history entry and cancel the confirm immediately.
  useEscapeKey(quickActionsOpen, () => setQuickActionsOpen(false));
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
  const cardRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ x: 0, y: 0 });
  const moveRaf = useRef<number | null>(null);

  // Clean up any exit state and lingering transforms when card depth/front
  // changes. Layout effect so the browser never paints the exiting transform
  // on the card's new depth (that flash is what flushSync used to paper over).
  useLayoutEffect(() => {
    if (cardRef.current) cardRef.current.style.zIndex = '';
    if (!isFront) {
      setExit(null);
      const el = cardRef.current;
      if (el) {
        el.classList.remove('exiting', 'dragging');
        el.style.willChange = '';
        el.style.opacity = '';
        el.style.transform = '';
        el.style.transition = '';
      }
    }
  }, [isFront, idx]);

  const setCardEl = (el: HTMLDivElement | null) => {
    cardRef.current = el;
    bindCardEl?.(el);
  };

  const writeFrontCard = (x: number, y: number) => {
    const el = cardRef.current;
    if (el) el.style.transform = frontCardTransform(x, y, MOTION_MODE, totalTrips < 2);
    const badge = badgeRef.current;
    if (!badge) return;
    const badgeHoriz = Math.abs(x) > Math.abs(y);
    const badgeDist = badgeHoriz ? Math.abs(x) : Math.abs(y);
    const badgeArmed = badgeDist > SWIPE_THRESHOLD || Math.abs(velocity.current.vx) > 0.42;
    const badgeProgress = Math.min(1, badgeDist / SWIPE_THRESHOLD);
    const badgeKind: 'browse' | 'archive' | 'peek' | null =
      !active.current ? null :
      totalTrips >= 2 && badgeHoriz && Math.abs(x) > 6 ? 'browse' :
      y < -6 ? 'archive' :
      totalTrips >= 2 && y > 8 ? 'peek' : null;
    if (!badgeKind) {
      badge.style.opacity = '0';
      return;
    }
    badge.className = `stack-swipe-badge ${badgeKind}`;
    badge.textContent =
      badgeKind === 'browse' ? (x < 0 ? '← Browse' : 'Browse →') :
      badgeKind === 'archive' ? '↑ Archive' : '↓ Peek Next';
    badge.style.opacity = String(badgeProgress);
    badge.style.transform = `translate(-50%, ${(-6 + badgeProgress * 6).toFixed(1)}px) scale(${(0.85 + badgeProgress * (badgeArmed ? 0.2 : 0.1)).toFixed(2)})`;
  };

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
    if (!isFront || quickActionsOpen || exit) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
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

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Capture is best-effort; move/up still fire on this node without it.
    }

    active.current = true;
    moved.current = false;
    start.current = { x: e.clientX, y: e.clientY };
    lastPointer.current = { x: e.clientX, y: e.clientY, time: now };
    velocity.current = { vx: 0, vy: 0 };
    dragRef.current = { x: 0, y: 0 };
    const el = cardRef.current;
    if (el) {
      el.classList.add('dragging');
      el.style.transition = 'none';
      el.style.willChange = 'transform';
    }
    startHoldRing();
    longPressTimer.current = setTimeout(() => {
      if (!moved.current) {
        triggerHaptic('medium');
        gestureFired.current = true;
        stopHoldRing(true);
        setQuickActionsOpen(true);
        active.current = false;
        dragRef.current = { x: 0, y: 0 };
        writeFrontCard(0, 0);
        const cardEl = cardRef.current;
        if (cardEl) {
          cardEl.classList.remove('dragging');
          cardEl.style.willChange = '';
        }
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
    // Damp horizontal drag only if there's only 1 trip in the deck
    const effectiveDx = totalTrips < 2 ? rubberBand(dx, 60) : dx;
    dragRef.current = { x: effectiveDx, y: dy };
    if (moveRaf.current != null) return;
    moveRaf.current = requestAnimationFrame(() => {
      moveRaf.current = null;
      if (!active.current) return;
      const { x, y } = dragRef.current;
      writeFrontCard(x, y);
      const horizDist = Math.abs(x);
      const vertDist = Math.max(0, -y * 1.2);
      const progress = Math.min(1, Math.max(horizDist, vertDist) / SWIPE_THRESHOLD);
      onDragProgress?.(progress, x);
    });
  };

  const endDrag = () => {
    if (!active.current) return;
    active.current = false;
    if (moveRaf.current != null) {
      cancelAnimationFrame(moveRaf.current);
      moveRaf.current = null;
    }
    clearLongPress();
    stopHoldRing(false);
    if (badgeRef.current) badgeRef.current.style.opacity = '0';

    const { x, y } = dragRef.current;
    const { vx, vy } = velocity.current;
    const canSwipe = totalTrips >= 2;

    // Velocity-assisted flick (natural quick throw) or distance-based commit
    const isHorizFlick = canSwipe && Math.abs(vx) > 0.38 && Math.abs(x) > 20;
    const isHorizThreshold = canSwipe && Math.abs(x) > Math.abs(y) && Math.abs(x) > SWIPE_THRESHOLD;

    const commitExit = (dir: 'left' | 'right' | 'up', speed: number, onDone: () => void) => {
      const el = cardRef.current;
      if (el) {
        el.classList.remove('dragging');
        el.classList.add('exiting');
        el.style.willChange = 'transform, opacity';
        el.style.transition = prefersReducedMotion
          ? 'none'
          : `transform ${EXIT_TRANSITION_MS}ms cubic-bezier(0.2, 0.9, 0.3, 1), opacity ${Math.round(EXIT_TRANSITION_MS * 0.85)}ms ease`;
        el.style.transform = exitCardTransform(dir);
        el.style.opacity = '0';
      }
      setExit(dir);
      onDragProgress?.(1, dir === 'left' ? -SWIPE_THRESHOLD : SWIPE_THRESHOLD);

      const exitDuration = prefersReducedMotion
        ? 0
        : Math.max(220, Math.min(EXIT_TRANSITION_MS, Math.round(EXIT_TRANSITION_MS / Math.max(1, speed * 0.8))));

      window.setTimeout(() => {
        // Reorder first; useLayoutEffect on the new depth clears the exit
        // transform before paint, so we don't need flushSync or a forced reflow.
        onDone();
        setExit(null);
      }, exitDuration);
    };

    if (isHorizFlick || isHorizThreshold) {
      gestureFired.current = true;
      triggerHaptic('light');
      const dir = isHorizFlick ? (vx > 0 ? 'right' : 'left') : (x > 0 ? 'right' : 'left');
      commitExit(dir, Math.abs(vx), () => onBrowse(dir));
      return;
    }

    const isUpFlick = vy < -0.38 && y < -20;
    const isUpThreshold = y < -SWIPE_THRESHOLD && Math.abs(y) > Math.abs(x);

    if (isUpFlick || isUpThreshold) {
      gestureFired.current = true;
      triggerHaptic('success');
      commitExit('up', Math.abs(vy), onArchive);
      return;
    }

    dragRef.current = { x: 0, y: 0 };
    const el = cardRef.current;
    if (el) {
      el.classList.remove('dragging');
      el.style.willChange = '';
      el.style.transition = prefersReducedMotion
        ? 'none'
        : `transform ${EXIT_TRANSITION_MS}ms var(--ease-uber-spring), opacity 0.28s ease`;
    }
    writeFrontCard(0, 0);
    onDragProgress?.(0, 0);
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

  return (
    <div
      ref={setCardEl}
      className={`stack-card depth-${idx}${isFront && exit ? ' exiting' : ''}`}
      style={isFront ? { touchAction: 'none' } : undefined}
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
          isSettled={isSettled}
          isFront={isFront}
          onQuickAddExpense={isFront ? onQuickAddExpense : undefined}
        />
      </div>

      {isFront && (
        <div
          ref={badgeRef}
          className="stack-swipe-badge"
          style={{ opacity: 0 }}
        />
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
  sortMode = 'name',
  onSortModeChange,
  members,
  settledTripIds,
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
  const sortedIds = useMemo(() => sortTrips(trips, sortMode).map((t) => t.id), [trips, sortMode]);
  const idsKey = sortedIds.join(',');
  const tripsById = useMemo(() => Object.fromEntries(trips.map((t) => [t.id, t])), [trips]);

  // Cycling the stack (browse) reorders locally; any real change to the
  // trip set or its recency order resets back to the fresh sort.
  const [manualOrder, setManualOrder] = useState<string[] | null>(null);
  const peekElsRef = useRef<(HTMLDivElement | null)[]>([null, null, null]);
  const stageRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { setManualOrder(null); }, [idsKey]);

  const order = manualOrder ?? sortedIds;
  const visible = order.slice(0, PEEK_DEPTH).map((id) => tripsById[id]).filter(Boolean);
  // The trip a right swipe brings forward stays mounted (hidden, depth-3)
  // so it rises like a peek card instead of mounting blank with its photo
  // still loading.
  const prevTrip = order.length > PEEK_DEPTH ? tripsById[order[order.length - 1]] : undefined;
  const rendered = prevTrip ? [...visible, prevTrip] : visible;
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

  const isDraggingStageRef = useRef(false);
  // Dragging right heads to the previous trip: raise the hidden previous
  // card and keep the next-trip peeks still, so what rises behind the
  // front card is what actually ends up in front.
  const writePeeks = useCallback((p: number, dragging: boolean, toPrev = false) => {
    if (isDraggingStageRef.current !== dragging) {
      isDraggingStageRef.current = dragging;
      stageRef.current?.classList.toggle('is-dragging', dragging);
      document.documentElement.classList.toggle('stack-dragging', dragging);
    }
    writePeekCard(peekElsRef.current[0], 1, toPrev ? 0 : p, dragging);
    writePeekCard(peekElsRef.current[1], 2, toPrev ? 0 : p, dragging);
    writePeekCard(peekElsRef.current[2], 3, toPrev ? p : 0, dragging);
  }, []);

  // Ensure peeking cards rest at pristine depth positions after order changes
  useEffect(() => {
    writePeeks(0, false);
  }, [order, writePeeks]);

  useEffect(() => {
    return () => {
      document.documentElement.classList.remove('stack-dragging');
    };
  }, []);

  const handlePeekPreview = () => {
    writePeeks(0.85, false);
    window.setTimeout(() => writePeeks(0, false), 700);
  };

  // Swipe left = next in the ring (clockwise), right = previous (anticlockwise).
  const cycle = useCallback((dir: 'left' | 'right') => {
    setManualOrder((prev) => {
      const current = prev ?? sortedIds;
      return dir === 'left'
        ? [...current.slice(1), current[0]]
        : [current[current.length - 1], ...current.slice(0, -1)];
    });
  }, [sortedIds]);

  const frontPhotoUrl = useTripPhoto(front?.destination, front?.coverImageUrl, front?.name);
  const frontGlowColor = useAmbientGlowColor(frontPhotoUrl);

  if (!front) return null;

  const canDelete = (trip: Trip) =>
    !trip.ownerId || !userId || trip.ownerId === userId ||
    Boolean(trip.adminMemberIds && trip.memberIds.some((mid) => members[mid]?.linkedUserId === userId && trip.adminMemberIds?.includes(mid)));

  return (
    <div className="trip-stack">
      <div className="trip-stack-stage" ref={stageRef}>
        {frontGlowColor && (
          <div
            className="stack-ambient-glow"
            style={{
              background: `radial-gradient(ellipse 75% 55% at 50% 32%, ${frontGlowColor} 0%, transparent 75%)`,
            }}
            aria-hidden="true"
          />
        )}
        {rendered.map((trip, idx) => (
          <StackCardItem
            key={trip.id}
            trip={trip}
            members={members}
            isSettled={settledTripIds?.[trip.id]}
            idx={idx}
            totalTrips={trips.length}
            canDelete={canDelete(trip)}
            onDragProgress={idx === 0 ? (ratio, dx) => writePeeks(ratio, ratio > 0, dx > 6) : undefined}
            bindCardEl={idx >= 1 && idx <= 3 ? (el) => { peekElsRef.current[idx - 1] = el; } : undefined}
            onPeekPreview={handlePeekPreview}
            onOpen={() => onSelectTrip(trip.id)}
            onQuickAddExpense={onQuickAddExpense}
            onBrowse={cycle}
            onArchive={() => { onArchiveTrip(trip); cycle('left'); }}
            onEdit={() => onStartEditTrip(trip)}
            onDelete={() => onDeleteTrip(trip)}
          />
        ))}
      </div>
      {trips.length >= 2 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button type="button" className="trip-stack-viewall" style={{ margin: 0 }} onClick={onShowList}>
            View all trips
          </button>
          {onSortModeChange && (
            <button
              type="button"
              className="trip-stack-viewall"
              style={{ margin: 0 }}
              aria-label={`Sorted by ${sortMode === 'name' ? 'name' : 'date'}. Tap to change.`}
              onClick={() => onSortModeChange(sortMode === 'name' ? 'date' : 'name')}
            >
              Sort: {sortMode === 'name' ? 'A–Z' : 'Date'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
