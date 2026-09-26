import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Trip, Member, TripStop } from '../types';
import { IconArchive, IconMapPin, IconSearch, IconPlus, IconEdit, IconTrash, IconCopy, IconRefresh, IconLayers, IconList, IconQrCode, IconX } from './Icons';
import { ActionSheet } from './common/ActionSheet';
import { DateRangePicker } from './DateRangePicker';
import { getCurrencySymbol } from '../utils/currency';
import { initial } from '../utils/initials';
import { avatarColorForName } from '../utils/avatarColor';
import { newId } from '../utils/uuid';
import { useTripStore } from '../store/tripStore';
import { TripStack, useTripPhoto, useDestinationWeather, getFallbackTravelPhoto, PEEK_COVER_WIDTH } from './TripStack';
import { sortTrips, type TripSortMode } from '../utils/tripSort';
import { HomeAmbientBackdrop } from './HomeAmbientBackdrop';
import { OnboardingSwipe } from './OnboardingSwipe';
import { usePullToRefresh } from '../utils/usePullToRefresh';
import { PullToRefreshIndicator } from './PullToRefreshIndicator';
import { triggerHaptic } from '../utils/haptics';
import { preloadModule } from '../utils/modulePreload';
import { useHistoryBack } from '../utils/useHistoryBack';
import { useEscapeKey } from '../utils/useEscapeKey';
import { fetchAppFlag } from '../services/tripApi';
import { asCopyString, DEFAULT_EMPTY_TRIP_BLURB } from '../utils/landingCopy';
import { readStackChrome } from '../utils/stackChrome';
import { TripSlideLauncher } from './TripSlideLauncher';

import { usePhotoTextTone } from '../utils/imageLuminance';
import { extractPrimaryCity } from '../utils/tripDestination';


function formatTripCardDate(startDate?: string, endDate?: string): string {
  if (!startDate) return 'Dates pending';
  const s = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(s.getTime())) return 'Dates pending';

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const sMonth = monthNames[s.getMonth()] || s.toLocaleDateString('en-US', { month: 'short' });
  const sDay = s.getDate();
  const sYear = s.getFullYear();

  if (!endDate) {
    return `${sMonth} ${sDay}`;
  }

  const e = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(e.getTime())) {
    return `${sMonth} ${sDay}`;
  }

  const eMonth = monthNames[e.getMonth()] || e.toLocaleDateString('en-US', { month: 'short' });
  const eDay = e.getDate();
  const eYear = e.getFullYear();

  if (sYear !== eYear) {
    return `${sMonth} ${sDay} – ${eMonth} ${eDay}, '${String(eYear).slice(2)}`;
  }
  if (sMonth === eMonth) {
    return `${sMonth} ${sDay}–${eDay}`;
  }
  return `${sMonth} ${sDay} – ${eMonth} ${eDay}`;
}

function LuxuryGridTripCard({
  trip,
  tripSpending,
  onSelectTrip,
  onOpenActionSheet,
}: {
  trip: Trip;
  members?: Record<string, Member>;
  tripSpending?: Record<string, number>;
  onSelectTrip: (id: string) => void;
  onOpenActionSheet: (trip: Trip) => void;
}) {
  const stopNames = useMemo(() => trip.stops?.map((s) => s.name).filter(Boolean), [trip.stops]);
  const photoUrl = useTripPhoto(trip.destination, trip.coverImageUrl, trip.name, PEEK_COVER_WIDTH, stopNames);
  const fallbackPhoto = useMemo(
    () => getFallbackTravelPhoto(trip.destination || (stopNames && stopNames[0]) || trip.name || trip.id, PEEK_COVER_WIDTH),
    [trip.destination, stopNames, trip.name, trip.id]
  );
  const effectivePhotoUrl = photoUrl || fallbackPhoto;
  const tone = usePhotoTextTone(effectivePhotoUrl);
  const { weather } = useDestinationWeather(trip.destination, trip.name, stopNames, true);

  const tripExpenses = useTripStore((s) => s.expenses);
  const totalSpent = useMemo(() => {
    if (tripSpending && typeof tripSpending[trip.id] === 'number') {
      return tripSpending[trip.id];
    }
    return tripExpenses
      .filter((e) => e.tripId === trip.id && !e.deletedAt && !e.isSettlement)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [tripSpending, tripExpenses, trip.id]);

  const currencySymbol = getCurrencySymbol(trip.baseCurrency || 'USD') || '$';

  const tripBudget = (trip as unknown as { budget?: number }).budget;
  const isBudgetSet = typeof tripBudget === 'number' && tripBudget > 0;

  const dateRangeStr = useMemo(() => {
    return formatTripCardDate(trip.startDate, trip.endDate);
  }, [trip.startDate, trip.endDate]);

  const statusLabel = useMemo(() => {
    if (trip.closed || trip.archived) {
      return 'Past';
    }
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (trip.endDate && trip.endDate < todayStr) {
      return 'Past';
    }
    if (trip.startDate && trip.startDate > todayStr) {
      return 'Upcoming';
    }
    if (trip.startDate && trip.endDate && trip.startDate <= todayStr && trip.endDate >= todayStr) {
      return 'Active';
    }
    return 'Upcoming';
  }, [trip.closed, trip.archived, trip.startDate, trip.endDate]);

  const { primary: primaryCity, full: fullDestination } = useMemo(
    () => extractPrimaryCity(trip.destination, trip.stops),
    [trip.destination, trip.stops]
  );
  const displayCity = primaryCity || trip.name;

  // Long press for mobile touch & right click for desktop
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  const clearTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    touchStartPos.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    longPressFired.current = false;
    touchStartPos.current = { x: e.clientX, y: e.clientY };
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      triggerHaptic('medium');
      onOpenActionSheet(trip);
    }, 450);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!touchStartPos.current || !longPressTimer.current) return;
    const dist = Math.hypot(e.clientX - touchStartPos.current.x, e.clientY - touchStartPos.current.y);
    if (dist > 10) {
      clearTimer();
    }
  };

  const handlePointerUp = () => {
    clearTimer();
  };

  const handlePointerCancel = () => {
    clearTimer();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearTimer();
    triggerHaptic('medium');
    onOpenActionSheet(trip);
  };

  const handleClick = () => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    triggerHaptic('light');
    onSelectTrip(trip.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectTrip(trip.id);
    } else if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
      e.preventDefault();
      triggerHaptic('medium');
      onOpenActionSheet(trip);
    }
  };

  return (
    <div
      className={`concept2-grid-card tone-${tone}`}
      role="button"
      tabIndex={0}
      aria-label={`Open trip ${trip.name}. Long press or right-click for options.`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onContextMenu={handleContextMenu}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className="concept2-card-image-wrap">
        <div
          className="concept2-card-image"
          style={{
            backgroundImage: `url("${effectivePhotoUrl}")`,
          }}
        />
        <div className="concept2-card-image-overlay" />
        <div className="concept2-card-image-content">
          <div className="concept2-card-top-row">
            <span className={`concept2-card-date date-tone-${tone}`}>{dateRangeStr}</span>
            {weather && (
              <div className="concept2-weather-capsule" title={`${weather.city || displayCity}: ${weather.condition || ''}`}>
                <span>{weather.weatherEmoji || '☀️'}</span>
                <span>{weather.tempC}&deg;</span>
              </div>
            )}
          </div>
          <h3 className="concept2-card-name" title={trip.name}>{trip.name}</h3>
        </div>

        {displayCity && (
          <div className="concept2-card-city-pill" title={fullDestination || displayCity}>
            <IconMapPin size={9} className="concept2-city-pin-icon" />
            <span>{displayCity}</span>
          </div>
        )}
      </div>

      <div className="concept2-card-footer">
        <div className={`concept2-card-status-label status-${statusLabel.toLowerCase()}`}>
          <span className="concept2-status-dot" aria-hidden="true" />
          <span>{statusLabel}</span>
        </div>
        <div
          className="concept2-card-spend-text"
          title={isBudgetSet ? `Budget: ${currencySymbol}${Math.round(tripBudget).toLocaleString()}` : `Total logged expenses: ${currencySymbol}${Math.round(totalSpent).toLocaleString()}`}
        >
          <span className="concept2-spend-label">{isBudgetSet ? 'Budget: ' : 'Spent: '}</span>
          <span className="concept2-spend-amount">{currencySymbol}{Math.round(isBudgetSet ? tripBudget : totalSpent).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

export type TripStatusFilter = 'all' | 'active' | 'past' | 'ongoing' | 'upcoming' | 'completed' | 'archived';

type Props = {
  trips: Trip[];
  archivedTrips?: Trip[];
  onRestoreTrip?: (trip: Trip) => void;
  members: Record<string, Member>;
  settledTripIds?: Record<string, boolean>;
  tripSpending?: Record<string, number>;
  showAddTrip: boolean;
  setShowAddTrip: (show: boolean) => void;
  newTripName: string;
  setNewTripName: (v: string) => void;
  newTripDestination: string;
  setNewTripDestination: (v: string) => void;
  newTripStops: TripStop[];
  setNewTripStops: React.Dispatch<React.SetStateAction<TripStop[]>>;
  newTripStart: string;
  setNewTripStart: (v: string) => void;
  newTripEnd: string;
  setNewTripEnd: (v: string) => void;
  newTripCurrency: string;
  setNewTripCurrency: (v: string) => void;
  editingTripId: string | null;
  onCreateTrip: (e: React.FormEvent) => void | Promise<void>;
  onCancelTripForm: () => void;
  onStartEditTrip: (trip: Trip) => void;
  onSelectTrip: (id: string) => void;
  onQuickAddExpense?: (trip: Trip) => void;
  onDeleteTrip: (trip: Trip) => void;
  onArchiveTrip: (trip: Trip) => void;
  onDuplicateTrip: (trip: Trip) => void;
  onOpenSettings: () => void;
  onOpenBugTracker?: () => void;
  onOpenCommandPalette?: () => void;
  onLoadDemoTrip?: () => void;
  userAvatarUrl?: string;
  userDisplayName?: string | null;
};

export function TripsListScreen({
  trips,
  archivedTrips = [],
  onRestoreTrip,
  members,
  settledTripIds,
  tripSpending,
  showAddTrip,
  setShowAddTrip,
  newTripName,
  setNewTripName,
  newTripDestination,
  setNewTripDestination,
  newTripStops,
  setNewTripStops,
  newTripStart,
  setNewTripStart,
  newTripEnd,
  setNewTripEnd,
  newTripCurrency,
  setNewTripCurrency,
  editingTripId,
  onCreateTrip,
  onCancelTripForm,
  onStartEditTrip,
  onSelectTrip,
  onQuickAddExpense,
  onDeleteTrip,
  onArchiveTrip,
  onDuplicateTrip,
  onOpenSettings,
  onOpenBugTracker,
  onOpenCommandPalette,
  onLoadDemoTrip,
  userAvatarUrl,
  userDisplayName,
}: Props) {
  const navigate = useNavigate();
  const userId = useTripStore((s) => s.userId);
  const refreshTrips = useTripStore((s) => s.refreshTrips);
  const isFeatureEnabled = useTripStore((s) => s.isFeatureEnabled);
  const enableCrossTripSearch = isFeatureEnabled('enableCrossTripSearch', { userId: userId || undefined });
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const ptrIndicatorRef = useRef<HTMLDivElement>(null);
  const stepperTrackRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [showJoinTrip, setShowJoinTrip] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [emptyTripBlurb, setEmptyTripBlurb] = useState(DEFAULT_EMPTY_TRIP_BLURB);
  const [honeypotVal, setHoneypotVal] = useState('');
  const [showList, setShowList] = useState(false);
  const [viewMode, setViewMode] = useState<'stack' | 'grid'>(() => {
    try {
      const saved = localStorage.getItem('tt-home-view-mode');
      return saved === 'grid' || saved === 'stack' ? saved : 'stack';
    } catch {
      return 'stack';
    }
  });

  const handleToggleViewMode = (mode: 'stack' | 'grid') => {
    triggerHaptic('light');
    setViewMode(mode);
    try {
      localStorage.setItem('tt-home-view-mode', mode);
    } catch {}
  };

  const [statusFilter, setStatusFilter] = useState<TripStatusFilter>('all');

  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('en-CA');
  }, []);

  const categorizedCounts = useMemo(() => {
    let active = 0;
    let past = 0;
    let ongoing = 0;
    let upcoming = 0;
    let completed = 0;
    trips.forEach((t: Trip) => {
      const isPast = t.closed || (t.endDate && todayStr > t.endDate);
      if (isPast) past++;
      else active++;

      if (!t.startDate || !t.endDate) return;
      if (todayStr >= t.startDate && todayStr <= t.endDate) ongoing++;
      else if (todayStr < t.startDate) upcoming++;
      else completed++;
    });
    return {
      all: trips.length,
      active,
      past,
      ongoing,
      upcoming,
      completed,
      archived: archivedTrips.length,
    };
  }, [trips, archivedTrips, todayStr]);

  const displayedTrips = useMemo(() => {
    if (statusFilter === 'archived') {
      return archivedTrips;
    }
    if (statusFilter === 'all') {
      return trips;
    }
    if (statusFilter === 'active') {
      return trips.filter((t: Trip) => !t.archived && !t.closed && (!t.endDate || todayStr <= t.endDate));
    }
    if (statusFilter === 'past') {
      return trips.filter((t: Trip) => !t.archived && (t.closed || (t.endDate && todayStr > t.endDate)));
    }
    return trips.filter((t: Trip) => {
      if (!t.startDate || !t.endDate) return false;
      if (statusFilter === 'ongoing') {
        return todayStr >= t.startDate && todayStr <= t.endDate;
      }
      if (statusFilter === 'upcoming') {
        return todayStr < t.startDate;
      }
      if (statusFilter === 'completed') {
        return todayStr > t.endDate;
      }
      return true;
    });
  }, [statusFilter, trips, archivedTrips, todayStr]);

  const sortToggleOn = isFeatureEnabled('enableTripStackSort', { userId: userId || undefined });
  const [storedSort, setStoredSort] = useState<TripSortMode>(() => {
    try { return localStorage.getItem('tt-trip-stack-sort') === 'date' ? 'date' : 'name'; } catch { return 'name'; }
  });
  const sortMode: TripSortMode = sortToggleOn ? storedSort : 'name';
  const changeSortMode = (m: TripSortMode) => {
    setStoredSort(m);
    try { localStorage.setItem('tt-trip-stack-sort', m); } catch { /* ignore */ }
  };
  // Same order the stack uses, so the pagination dots line up with it.
  const orderedTrips = useMemo(() => sortTrips(displayedTrips, sortMode), [displayedTrips, sortMode]);
  const [focusedTrip, setFocusedTrip] = useState<Trip | null>(() => displayedTrips[0] || trips[0] || null);
  const [frontTripIndex, setFrontTripIndex] = useState(0);
  const [targetTripId, setTargetTripId] = useState<string | null>(null);
  const [isSavingTrip, setIsSavingTrip] = useState(false);
  const [dateError, setDateError] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<'weekend' | 'roadtrip' | 'flatmates' | 'vacation' | null>(null);
  const [actionSheetTrip, setActionSheetTrip] = useState<Trip | null>(null);

  useHistoryBack(showJoinTrip, () => setShowJoinTrip(false));
  useEscapeKey(showJoinTrip, () => setShowJoinTrip(false));
  useHistoryBack(showList, () => setShowList(false));
  useEscapeKey(showList, () => setShowList(false));

  // Enables full luxury hero spotlight when stack view mode is chosen and not archived
  const stackActive =
    viewMode === 'stack' &&
    statusFilter !== 'archived' &&
    displayedTrips.length >= 1 &&
    !showList &&
    !showAddTrip;

  useEffect(() => {
    if (!stackActive) return;
    const root = scrollContainerRef.current;
    if (!root) return;

    let frame = 0;
    const write = () => {
      frame = 0;
      root.style.setProperty('--stack-chrome', `${readStackChrome(root)}px`);
    };
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(write);
    };

    schedule();
    const observer = new ResizeObserver(schedule);
    for (const sel of ['.home-unified-header', '.concept1-header', '.concept2-header', '.trips-screen-header', '.trips-section-header', '.trip-stepper-dots', '.floating-action-dock', '.concept2-bottom-dock', '.trip-launcher']) {
      const el = root.querySelector(sel);
      if (el) observer.observe(el);
    }
    const vv = window.visualViewport;
    vv?.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      vv?.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', schedule);
      root.style.removeProperty('--stack-chrome');
    };
  }, [stackActive, trips.length]);

  useEffect(() => {
    preloadModule(() => import('./ExpenseForm'));
    preloadModule(() => import('./TripMapHero'));
  }, []);

  useEffect(() => {
    fetchAppFlag('empty_trip_blurb')
      .then((v) => setEmptyTripBlurb(asCopyString(v, DEFAULT_EMPTY_TRIP_BLURB)))
      .catch(() => {});
  }, []);

  const handleStepperScrub = (clientX: number) => {
    const track = stepperTrackRef.current;
    if (!track || orderedTrips.length < 2) return;
    const rect = track.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const ratio = x / rect.width;
    const newIndex = Math.min(orderedTrips.length - 1, Math.floor(ratio * orderedTrips.length));
    if (newIndex !== frontTripIndex) {
      triggerHaptic('light');
      setFrontTripIndex(newIndex);
      setTargetTripId(orderedTrips[newIndex].id);
    }
  };

  const handleStepperPointerDown = (e: React.PointerEvent) => {
    setIsScrubbing(true);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    handleStepperScrub(e.clientX);
  };

  const handleStepperPointerMove = (e: React.PointerEvent) => {
    if (!isScrubbing) return;
    handleStepperScrub(e.clientX);
  };

  const handleStepperPointerUp = (e: React.PointerEvent) => {
    if (!isScrubbing) return;
    setIsScrubbing(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!focusedTrip && trips.length > 0) {
      setFocusedTrip(trips[0]);
    }
  }, [trips, focusedTrip]);

  const pullToRefresh = usePullToRefresh(
    scrollContainerRef,
    ptrIndicatorRef,
    () => refreshTrips(true),
    !stackActive
  );


  // First-run vs. "deleted my last trip" both hit trips.length === 0 — flag
  // per-account once they've ever had a trip so the two states get different
  // copy instead of onboarding repeating itself forever.
  const onboardKey = userId ? `tt-onboarded-${userId}` : null;
  const isFirstRun = trips.length === 0 && !!onboardKey && !localStorage.getItem(onboardKey);
  const ONBOARD_STORAGE_SUFFIX = '-tt-onboarded-v1';
  useEffect(() => {
    if (trips.length > 0 && onboardKey) localStorage.setItem(onboardKey, '1');
  }, [trips.length, onboardKey]);

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypotVal) return;
    const code = joinCode.trim();
    if (!code) return;
    navigate(`/join/${encodeURIComponent(code)}`);
  };

  const handleCreateTripSafe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingTrip || honeypotVal) return;
    // Dates are required server-side (the trips table's start_date/end_date
    // columns aren't nullable) -- the form used to label them "Optional"
    // while silently failing to create the trip if left blank. Block it
    // here with a clear reason instead of a confusing no-op submit.
    if (!newTripStart || !newTripEnd) {
      setDateError('Please choose a start and end date for the trip.');
      return;
    }
    setDateError('');
    setIsSavingTrip(true);
    try {
      await onCreateTrip(e);
    } finally {
      setIsSavingTrip(false);
    }
  };

  const handleApplyTemplate = (tpl: 'weekend' | 'roadtrip' | 'flatmates' | 'vacation') => {
    triggerHaptic('light');
    setSelectedTemplate(tpl);
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const formatYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (tpl === 'weekend') {
      const start = new Date(today);
      const day = start.getDay();
      const diffToFriday = (5 - day + 7) % 7 || 7;
      start.setDate(start.getDate() + diffToFriday);
      const end = new Date(start);
      end.setDate(end.getDate() + 2);

      setNewTripName('Weekend Getaway');
      setNewTripDestination('Goa or Coorg');
      setNewTripStart(formatYMD(start));
      setNewTripEnd(formatYMD(end));
      setDateError('');
    } else if (tpl === 'roadtrip') {
      const start = new Date(today);
      start.setDate(start.getDate() + 1);
      const end = new Date(start);
      end.setDate(end.getDate() + 8);

      setNewTripName('Mountain Road Trip');
      setNewTripDestination('Manali, Himachal');
      setNewTripStart(formatYMD(start));
      setNewTripEnd(formatYMD(end));
      setDateError('');
    } else if (tpl === 'flatmates') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      setNewTripName(`Apartment · ${today.toLocaleString('en-US', { month: 'short' })}`);
      setNewTripDestination('Home Apartment');
      setNewTripStart(formatYMD(start));
      setNewTripEnd(formatYMD(end));
      setDateError('');
    } else if (tpl === 'vacation') {
      const start = new Date(today);
      start.setDate(start.getDate() + 14);
      const end = new Date(start);
      end.setDate(end.getDate() + 10);

      setNewTripName('International Holiday');
      setNewTripDestination('Kyoto, Japan');
      setNewTripStart(formatYMD(start));
      setNewTripEnd(formatYMD(end));
      if (!editingTripId) setNewTripCurrency('USD');
      setDateError('');
    }
  };

  return (
    <div
      id="main-content"
      tabIndex={-1}
      ref={scrollContainerRef}
      className={`fade-in trips-screen-scroll${stackActive ? ' stack-viewport-lock' : ''}`}
    >
      {!stackActive && (
        <PullToRefreshIndicator ref={ptrIndicatorRef} state={pullToRefresh} />
      )}
      {stackActive && (
        <HomeAmbientBackdrop trip={focusedTrip || trips[0] || null} />
      )}
      <header className="home-unified-header">
        {/* Row 1: Top Navigation Bar */}
        <div className="home-header-row1">
          <div className="home-header-left">
            <button
              type="button"
              className="profile-avatar-btn"
              onPointerDown={() => { void import('./GlobalSettingsModal'); }}
              onMouseEnter={() => { void import('./GlobalSettingsModal'); }}
              onClick={onOpenSettings}
              aria-label="Profile & Settings"
              title="Profile & Settings"
            >
              {userAvatarUrl ? (
                <img src={userAvatarUrl} alt="" referrerPolicy="no-referrer" width={40} height={40} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              ) : (
                <span style={{ background: avatarColorForName(userDisplayName || 'Me') }}>
                  {initial(userDisplayName || 'Me')}
                </span>
              )}
            </button>
          </div>

          <div className="home-header-center">
            <h1 className="home-header-title">Journeys</h1>
          </div>

          <div className="home-header-right">
            {onOpenCommandPalette && (
              <button
                type="button"
                className="concept1-icon-btn"
                onClick={onOpenCommandPalette}
                aria-label={enableCrossTripSearch ? 'Search all journeys (Cmd+K)' : 'Search (Cmd+K)'}
                title={enableCrossTripSearch ? 'Search all journeys (Cmd+K)' : 'Search (Cmd+K)'}
              >
                <IconSearch size={17} />
              </button>
            )}
            {onOpenBugTracker && (
              <button
                type="button"
                className="concept1-icon-btn bug"
                onClick={onOpenBugTracker}
                aria-label="Superadmin Bug Tracker"
                title="Superadmin Bug Tracker"
              >
                <span>🛡️</span>
              </button>
            )}
            <button
              type="button"
              className="concept1-icon-btn view-toggle"
              onClick={() => handleToggleViewMode(viewMode === 'stack' ? 'grid' : 'stack')}
              aria-label={viewMode === 'stack' ? 'Switch to grid view' : 'Switch to stack view'}
              title={viewMode === 'stack' ? 'Switch to grid view' : 'Switch to stack view'}
            >
              {viewMode === 'stack' ? <IconList size={17} /> : <IconLayers size={17} />}
            </button>
          </div>
        </div>

        {/* Row 2: Status Filter Capsule */}
        <div className="home-header-row2">
          <div className="concept2-filter-capsule" role="tablist" aria-label="Filter trips">
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'all'}
              className={`concept2-filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => { triggerHaptic('light'); setStatusFilter('all'); }}
            >
              All {categorizedCounts.all > 0 && <span className="filter-count-badge">{categorizedCounts.all}</span>}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'active'}
              className={`concept2-filter-btn ${statusFilter === 'active' ? 'active' : ''}`}
              onClick={() => { triggerHaptic('light'); setStatusFilter('active'); }}
            >
              Active {categorizedCounts.active > 0 && <span className="filter-count-badge">{categorizedCounts.active}</span>}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'past'}
              className={`concept2-filter-btn ${statusFilter === 'past' ? 'active' : ''}`}
              onClick={() => { triggerHaptic('light'); setStatusFilter('past'); }}
            >
              Past
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'archived'}
              className={`concept2-filter-btn ${statusFilter === 'archived' ? 'active' : ''}`}
              onClick={() => { triggerHaptic('light'); setStatusFilter('archived'); }}
            >
              Archived {categorizedCounts.archived > 0 && <span className="filter-count-badge">{categorizedCounts.archived}</span>}
            </button>
          </div>
        </div>
      </header>

      <main className={`trips-screen-main${stackActive ? ' stack-main' : ''}`}>



        {/* Add/Edit trip form */}
        {showAddTrip && (
          <form onSubmit={handleCreateTripSafe} className="glass-card" style={{ marginBottom: '24px', padding: '16px' }}>
            <div className="trip-form-header">
              <div>
                <div className="trip-form-eyebrow">TRIP TRACKER · 2026</div>
                <div className="trip-form-title">{editingTripId ? 'Edit Trip' : 'Create New Trip'}</div>
              </div>
              <span className="trip-form-stamp">{editingTripId ? '✎ EDIT' : '✈ NEW'}</span>
            </div>
            {/* Honeypot field - visually hidden to trap bots */}
            <div style={{ display: 'none' }} aria-hidden="true">
              <label htmlFor="add_trip_name_hp">Leave this empty</label>
              <input
                id="add_trip_name_hp"
                type="text"
                name="add_trip_name_hp"
                value={honeypotVal}
                onChange={(e) => setHoneypotVal(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>
            {/* Quick Templates for Fast Creation */}
            {!editingTripId && (
              <div style={{ marginBottom: '18px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  ⚡ Quick Start Templates
                </div>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                  <button
                    type="button"
                    className={`quick-template-chip ${selectedTemplate === 'weekend' ? 'active' : ''}`}
                    onClick={() => handleApplyTemplate('weekend')}
                  >
                    🏖️ Weekend Getaway
                  </button>
                  <button
                    type="button"
                    className={`quick-template-chip ${selectedTemplate === 'roadtrip' ? 'active' : ''}`}
                    onClick={() => handleApplyTemplate('roadtrip')}
                  >
                    🚗 Road Trip
                  </button>
                  <button
                    type="button"
                    className={`quick-template-chip ${selectedTemplate === 'flatmates' ? 'active' : ''}`}
                    onClick={() => handleApplyTemplate('flatmates')}
                  >
                    🏠 Shared Flat
                  </button>
                  <button
                    type="button"
                    className={`quick-template-chip ${selectedTemplate === 'vacation' ? 'active' : ''}`}
                    onClick={() => handleApplyTemplate('vacation')}
                  >
                    ✈️ International
                  </button>
                </div>
              </div>
            )}
            <div className="input-group">
              <label className="form-label" htmlFor="new_trip_name">Trip Name *</label>
              <input
                id="new_trip_name"
                type="text"
                className="input-field"
                placeholder="e.g. Goa Trip 2026"
                value={newTripName}
                onChange={(e) => {
                  setNewTripName(e.target.value);
                  setSelectedTemplate(null);
                }}
                autoFocus
              />
            </div>

            <div className="trip-form-perf" aria-hidden="true" />

            {/* Route Stops / Waypoints Builder */}
            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <label className="form-label" htmlFor="new_trip_destination" style={{ marginBottom: 0 }}>
                  {isFeatureEnabled('enableRouteStops') ? 'Destinations & Stops (Optional)' : 'Destination (Optional)'}
                </label>
                {isFeatureEnabled('enableRouteStops') && (
                  <button
                    type="button"
                    onClick={() => {
                      const nextId = newId();
                      if (newTripStops.length === 0) {
                        const firstVal = newTripDestination.trim();
                        setNewTripStops([
                          { id: newId(), name: firstVal || '' },
                          { id: nextId, name: '' },
                        ]);
                        setNewTripDestination('');
                      } else {
                        setNewTripStops([...newTripStops, { id: nextId, name: '' }]);
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary-accent)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>+ Add Stop</span>
                  </button>
                )}
              </div>

              {newTripStops.length === 0 || !isFeatureEnabled('enableRouteStops') ? (
                <div>
                  <input
                    id="new_trip_destination"
                    type="text"
                    className="input-field"
                    placeholder="e.g. Manali, Himachal or Kyoto, Japan"
                    value={newTripDestination}
                    onChange={(e) => {
                      setNewTripDestination(e.target.value);
                      setSelectedTemplate(null);
                    }}
                  />
                  <div style={{ marginTop: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Auto-fetches tourism photography & route maps
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {newTripStops.map((stop: TripStop, sIdx: number) => {
                    const isStart = sIdx === 0;
                    const isLast = sIdx === newTripStops.length - 1;
                    return (
                      <div key={stop.id || sIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 800,
                            color: '#FFFFFF',
                            background: isStart ? '#0284C7' : isLast ? '#FF7A00' : '#0D5C9E',
                            flexShrink: 0,
                          }}
                        >
                          {sIdx + 1}
                        </span>
                        <input
                          type="text"
                          className="input-field"
                          placeholder={isStart ? 'Start place (e.g. Delhi)' : isLast ? 'Final destination (e.g. Kasol)' : `Stop ${sIdx + 1} (e.g. Manali)`}
                          value={stop.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewTripStops(newTripStops.map((s: TripStop, idx: number) => (idx === sIdx ? { ...s, name: val } : s)));
                          }}
                          style={{ flex: 1, padding: '10px 12px' }}
                        />
                        {newTripStops.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setNewTripStops(newTripStops.filter((_: TripStop, idx: number) => idx !== sIdx));
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '6px',
                              fontSize: '14px',
                              lineHeight: 1,
                            }}
                            title="Remove stop"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Connects stops into a route map on the trip dashboard
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const nextId = newId();
                        setNewTripStops([...newTripStops, { id: nextId, name: '' }]);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary-accent)',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      + Add another stop
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="trip-form-perf" aria-hidden="true" />

            <div className="input-group">
              <label className="form-label">Dates *</label>
              <DateRangePicker
                startDate={newTripStart}
                endDate={newTripEnd}
                onSelectStart={(d) => { setDateError(''); setNewTripStart(d); }}
                onSelectEnd={(d) => { setDateError(''); setNewTripEnd(d); }}
              />
              {dateError && (
                <div role="alert" style={{ marginTop: '6px', fontSize: '12px', color: 'var(--color-danger, #DC2626)' }}>
                  {dateError}
                </div>
              )}
            </div>

            {!editingTripId && (
              <div className="form-group">
                <label className="form-label" htmlFor="new-trip-currency">Base Currency</label>
                <select
                  id="new-trip-currency"
                  className="input-field select-field"
                  value={newTripCurrency}
                  onChange={(e) => setNewTripCurrency(e.target.value)}
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button type="submit" className="gradient-btn" style={{ flex: 1 }} disabled={isSavingTrip}>
                {isSavingTrip ? 'Saving…' : editingTripId ? 'Update Trip' : 'Save Trip'}
              </button>
              <button type="button" className="secondary-btn" style={{ flex: 1 }} onClick={onCancelTripForm} disabled={isSavingTrip}>Cancel</button>
            </div>
          </form>
        )}

        {/* Trips List Grid */}
        {trips.length === 0 ? (
          <div className="luxury-boarding-empty">
            <div className="luxury-boarding-glow" aria-hidden="true" />
            <div className="luxury-boarding-badge">
              <span>✈️</span> READY FOR DEPARTURE
            </div>
            <h2 className="luxury-boarding-title">Where will your next journey begin?</h2>
            <p className="luxury-boarding-subtitle">
              {isFirstRun
                ? 'Coordinate travelers, log shared expenses in real-time, and settle balances effortlessly on your next expedition.'
                : emptyTripBlurb}
            </p>

            <div className="luxury-boarding-chips-section">
              <span className="luxury-boarding-chips-label">QUICK INSPIRATION</span>
              <div className="luxury-boarding-chips-row">
                <button
                  type="button"
                  className="luxury-inspiration-chip"
                  onClick={() => {
                    handleApplyTemplate('weekend');
                    setShowAddTrip(true);
                  }}
                >
                  🏖️ Weekend Getaway
                </button>
                <button
                  type="button"
                  className="luxury-inspiration-chip"
                  onClick={() => {
                    handleApplyTemplate('roadtrip');
                    setShowAddTrip(true);
                  }}
                >
                  🚗 Mountain Road Trip
                </button>
                <button
                  type="button"
                  className="luxury-inspiration-chip"
                  onClick={() => {
                    handleApplyTemplate('vacation');
                    setShowAddTrip(true);
                  }}
                >
                  ✈️ International Vacation
                </button>
              </div>
            </div>

            <div className="luxury-boarding-actions">
              <button
                type="button"
                className="luxury-boarding-cta-btn"
                onClick={() => setShowAddTrip(true)}
              >
                <IconPlus size={16} />
                <span>Create Your First Journey</span>
              </button>
              {onLoadDemoTrip && isFeatureEnabled('enableDemoSeeding') && (
                <button
                  type="button"
                  className="luxury-boarding-demo-btn"
                  onClick={onLoadDemoTrip}
                >
                  <span>✨</span>
                  <span>Explore Demo Trip</span>
                </button>
              )}
            </div>

            {isFirstRun && (
              <OnboardingSwipe
                userId={userId}
                onDismiss={() => {
                  const key = userId ? `tt-${userId}${ONBOARD_STORAGE_SUFFIX}` : null;
                  if (key) localStorage.setItem(key, '1');
                }}
              />
            )}
          </div>
        ) : displayedTrips.length === 0 ? (
          <div className="glass-card ledger-empty" style={{ borderStyle: 'dashed', padding: '32px 16px', textAlign: 'center', marginTop: '16px' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
              No journeys match the "<strong>{statusFilter}</strong>" filter.
            </p>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setStatusFilter('all')}
              style={{ fontSize: '13px', padding: '6px 14px' }}
            >
              Show All Journeys
            </button>
          </div>
        ) : (
          <>
            {stackActive ? (
              <>
                <TripStack
                  trips={displayedTrips}
                  sortMode={sortMode}
                  onSortModeChange={sortToggleOn ? changeSortMode : undefined}
                  members={members}
                  settledTripIds={settledTripIds}
                  tripSpending={tripSpending}
                  userId={userId}
                  onSelectTrip={onSelectTrip}
                  onQuickAddExpense={onQuickAddExpense ? (tripId) => {
                    const t = trips.find((x: Trip) => x.id === tripId);
                    if (t) onQuickAddExpense(t);
                  } : undefined}
                  onStartEditTrip={onStartEditTrip}
                  onDeleteTrip={onDeleteTrip}
                  onArchiveTrip={onArchiveTrip}
                  onShowList={() => { handleToggleViewMode('grid'); }}
                  onFrontChange={setFocusedTrip}
                  onIndexChange={setFrontTripIndex}
                  targetTripId={targetTripId}
                />
                {displayedTrips.length >= 2 && (
                  <div
                    ref={stepperTrackRef}
                    className={`trip-stepper-dots trip-stepper-track${isScrubbing ? ' scrubbing' : ''}`}
                    role="tablist"
                    aria-label="Trip pagination"
                    onPointerDown={handleStepperPointerDown}
                    onPointerMove={handleStepperPointerMove}
                    onPointerUp={handleStepperPointerUp}
                    onPointerCancel={handleStepperPointerUp}
                  >
                    {orderedTrips.map((t: Trip, idx: number) => (
                      <button
                        key={t.id}
                        type="button"
                        role="tab"
                        aria-selected={idx === frontTripIndex}
                        className={`trip-stepper-dot trip-stepper-pill${idx === frontTripIndex ? ' active' : ''}`}
                        onClick={() => {
                          triggerHaptic('light');
                          setFrontTripIndex(idx);
                          setTargetTripId(t.id);
                        }}
                        title={`View ${t.name}`}
                        aria-label={`View ${t.name}`}
                      />
                    ))}
                  </div>
                )}

                {!showAddTrip && !showJoinTrip && (
                  <TripSlideLauncher
                    onCreateTrip={() => {
                      triggerHaptic('medium');
                      setShowAddTrip(true);
                    }}
                    onJoinTrip={() => {
                      triggerHaptic('light');
                      setShowJoinTrip(true);
                    }}
                  />
                )}
              </>
            ) : (
              <div className="concept2-grid-container">
                <div className="concept2-grid">
                  {displayedTrips.map((trip: Trip) => (
                    <LuxuryGridTripCard
                      key={trip.id}
                      trip={trip}
                      members={members}
                      tripSpending={tripSpending}
                      onSelectTrip={onSelectTrip}
                      onOpenActionSheet={setActionSheetTrip}
                    />
                  ))}
                </div>

                {!showAddTrip && !showJoinTrip && (
                  <div className="grid-floating-launcher">
                    <TripSlideLauncher
                      onCreateTrip={() => {
                        triggerHaptic('medium');
                        setShowAddTrip(true);
                      }}
                      onJoinTrip={() => {
                        triggerHaptic('light');
                        setShowJoinTrip(true);
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {actionSheetTrip && (
        <ActionSheet
          isOpen={Boolean(actionSheetTrip)}
          onClose={() => setActionSheetTrip(null)}
          title={actionSheetTrip.name}
          description={`${actionSheetTrip.destination || 'Expedition'} · ${actionSheetTrip.baseCurrency} · ${actionSheetTrip.archived ? 'Archived' : actionSheetTrip.closed ? 'Closed 🔒' : 'Active'}`}
          items={[
            {
              id: 'open',
              label: 'Open Expedition',
              subtitle: 'View dashboard, balances & expenses',
              onClick: () => onSelectTrip(actionSheetTrip.id),
            },
            ...(onQuickAddExpense
              ? [
                  {
                    id: 'quick-add',
                    label: 'Add Expense',
                    icon: <IconPlus size={18} />,
                    onClick: () => onQuickAddExpense(actionSheetTrip),
                  },
                ]
              : []),
            {
              id: 'edit',
              label: 'Edit Trip Details',
              icon: <IconEdit size={18} />,
              onClick: () => onStartEditTrip(actionSheetTrip),
            },
            {
              id: 'duplicate',
              label: isFeatureEnabled('enableCloneTripSquad') ? 'New trip with this group' : 'Duplicate Trip',
              subtitle: isFeatureEnabled('enableCloneTripSquad')
                ? 'Copies people, packing, and notes. Not expenses.'
                : undefined,
              icon: <IconCopy size={18} />,
              onClick: () => onDuplicateTrip(actionSheetTrip),
            },
            ...(actionSheetTrip.archived && onRestoreTrip
              ? [
                  {
                    id: 'restore',
                    label: 'Restore Expedition',
                    icon: <IconRefresh size={18} />,
                    onClick: () => onRestoreTrip(actionSheetTrip),
                  },
                ]
              : [
                  {
                    id: 'archive',
                    label: 'Archive Trip',
                    icon: <IconArchive size={18} />,
                    onClick: () => onArchiveTrip(actionSheetTrip),
                  },
                ]),
            ...(userId && actionSheetTrip.ownerId === userId
              ? [
                  {
                    id: 'delete',
                    label: 'Delete Trip',
                    icon: <IconTrash size={18} />,
                    destructive: true,
                    onClick: () => onDeleteTrip(actionSheetTrip),
                  },
                ]
              : []),
          ]}
        />
      )}

      {/* Floating Transparent Modal for Joining a Trip by Code */}
      {showJoinTrip && (
        <div
          className="join-trip-modal-overlay"
          onClick={() => setShowJoinTrip(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="join-journey-modal-title"
        >
          <div
            className="join-trip-glass-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="join-trip-close-btn"
              onClick={() => setShowJoinTrip(false)}
              aria-label="Close"
              title="Close"
            >
              <IconX size={15} />
            </button>

            <div className="join-trip-glow-accent" aria-hidden="true" />

            <div className="join-trip-badge">
              <IconQrCode size={20} />
            </div>

            <div className="join-trip-eyebrow">EXPEDITION PASS</div>
            <h3 id="join-journey-modal-title" className="join-trip-title">Join a Journey</h3>
            <p className="join-trip-desc">Enter the 6-digit trip pass or invite code shared by your coordinator.</p>

            <form onSubmit={handleJoinByCode}>
              {/* Honeypot field - visually hidden to trap bots */}
              <div style={{ display: 'none' }} aria-hidden="true">
                <label htmlFor="join_trip_code_hp">Leave this empty</label>
                <input
                  id="join_trip_code_hp"
                  type="text"
                  name="join_trip_code_hp"
                  value={honeypotVal}
                  onChange={(e) => setHoneypotVal(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <div className="join-trip-input-wrap">
                <input
                  type="text"
                  className="join-trip-input"
                  placeholder="000000"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  maxLength={10}
                  autoFocus
                />
              </div>

              <div className="join-trip-actions">
                <button
                  type="button"
                  className="join-trip-cancel-btn"
                  onClick={() => setShowJoinTrip(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="join-trip-submit-btn"
                  disabled={!joinCode.trim()}
                >
                  Join Journey
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
