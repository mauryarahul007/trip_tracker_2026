import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Trip, Member, TripStop } from '../types';
import { IconArchive, IconMapPin, IconSearch, IconMoreVertical, IconPlus, IconEdit, IconTrash, IconCopy, IconRefresh, IconLayers, IconList } from './Icons';
import { ActionSheet } from './common/ActionSheet';
import { DateRangePicker } from './DateRangePicker';
import { formatDateRange } from '../utils/dateRange';
import { initial } from '../utils/initials';
import { avatarColorForName } from '../utils/avatarColor';
import { newId } from '../utils/uuid';
import { useTripStore } from '../store/tripStore';
import { TripStack, useTripPhoto, useDestinationWeather, getFallbackTravelPhoto, PEEK_COVER_WIDTH } from './TripStack';
import { sortTrips, type TripSortMode } from '../utils/tripSort';
import { TripSlideLauncher } from './TripSlideLauncher';
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
import { isWebKitCompositor } from '../utils/tripStackMotion';
import { readStackChrome } from '../utils/stackChrome';

function LuxuryGridTripCard({
  trip,
  members,
  onSelectTrip,
  onOpenActionSheet,
}: {
  trip: Trip;
  members: Record<string, Member>;
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
  const { weather } = useDestinationWeather(trip.destination, trip.name, stopNames, false);
  const tripMembers = trip.memberIds.map((id) => members[id]).filter(Boolean);
  const shown = tripMembers.slice(0, 3);
  const overflow = tripMembers.length - shown.length;
  const dateRangeStr = formatDateRange(trip.startDate, trip.endDate) || 'Dates pending';

  return (
    <div
      className="concept2-grid-card"
      onClick={() => {
        triggerHaptic('light');
        onSelectTrip(trip.id);
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open trip ${trip.name}`}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectTrip(trip.id);
        }
      }}
    >
      <div
        className="concept2-card-bg"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(8,12,20,0.2) 0%, rgba(8,12,20,0.1) 35%, rgba(8,12,20,0.85) 75%, rgba(8,12,20,0.98) 100%), url("${effectivePhotoUrl}")`,
        }}
      />
      <div className="concept2-card-content">
        <div className="concept2-card-top">
          {weather ? (
            <div className="concept2-weather-capsule">
              <span>{weather.weatherEmoji}</span>
              <span>{weather.tempC}&deg;</span>
            </div>
          ) : trip.closed ? (
            <span className="concept2-status-pill closed">CLOSED</span>
          ) : trip.archived ? (
            <span className="concept2-status-pill archived">ARCHIVED</span>
          ) : (
            <span className="concept2-status-pill active">ACTIVE</span>
          )}
          <button
            type="button"
            className="concept2-card-more-btn"
            aria-label="Trip options"
            title="Trip options"
            onClick={(e) => {
              e.stopPropagation();
              onOpenActionSheet(trip);
            }}
          >
            <IconMoreVertical size={14} />
          </button>
        </div>

        <div className="concept2-card-bottom">
          <span className="concept2-card-date">{dateRangeStr.toUpperCase()}</span>
          <h3 className="concept2-card-name" title={trip.name}>{trip.name}</h3>
          <div className="concept2-card-meta">
            <div className="concept2-avatars-pile">
              {shown.map((m) =>
                m.avatarUrl ? (
                  <img key={m.id} src={m.avatarUrl} alt={m.name} className="concept2-avatar-circle" width={22} height={22} referrerPolicy="no-referrer" loading="lazy" />
                ) : (
                  <span key={m.id} className="concept2-avatar-circle" style={{ background: avatarColorForName(m.name) }}>{initial(m.name)}</span>
                )
              )}
              {overflow > 0 && <span className="concept2-avatar-circle concept2-avatar-more">+{overflow}</span>}
            </div>
            <span className="concept2-card-stat">
              {trip.expenseCount || 0} exp
            </span>
          </div>
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
    !showAddTrip &&
    !showJoinTrip;

  useEffect(() => {
    if (!stackActive || !isWebKitCompositor()) return;
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
    for (const sel of ['.home-unified-header', '.concept1-header', '.concept2-header', '.trips-screen-header', '.trips-section-header', '.trip-stepper-dots', '.trip-launcher']) {
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
      <HomeAmbientBackdrop trip={focusedTrip || trips[0] || null} />
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
                <IconSearch size={18} />
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
          </div>
        </div>

        {/* Row 2: Controls Bar - Filter Capsule & View Switcher at IDENTICAL Positions */}
        <div className="home-header-row2">
          <div className="concept2-filter-capsule" role="tablist" aria-label="Filter trips">
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'all'}
              className={`concept2-filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => { triggerHaptic('light'); setStatusFilter('all'); }}
            >
              All
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'active'}
              className={`concept2-filter-btn ${statusFilter === 'active' ? 'active' : ''}`}
              onClick={() => { triggerHaptic('light'); setStatusFilter('active'); }}
            >
              Active
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
            {categorizedCounts.archived > 0 && (
              <button
                type="button"
                role="tab"
                aria-selected={statusFilter === 'archived'}
                className={`concept2-filter-btn ${statusFilter === 'archived' ? 'active' : ''}`}
                onClick={() => { triggerHaptic('light'); setStatusFilter('archived'); }}
              >
                Archived
              </button>
            )}
          </div>

          <div className="concept-view-mode-pill" role="group" aria-label="View mode">
            <button
              type="button"
              className={`concept-view-mode-btn ${viewMode === 'stack' ? 'active' : ''}`}
              onClick={() => handleToggleViewMode('stack')}
              aria-label="Stacked cards view"
              title="Stacked cards view"
            >
              <IconLayers size={17} />
            </button>
            <button
              type="button"
              className={`concept-view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => handleToggleViewMode('grid')}
              aria-label="All trips view"
              title="All trips view"
            >
              <IconList size={17} />
            </button>
          </div>
        </div>
      </header>

      <main className={`trips-screen-main${stackActive ? ' stack-main' : ''}`}>

        {/* Join by code collapsible form */}
        {showJoinTrip && (
          <form onSubmit={handleJoinByCode} className="glass-card" style={{ marginBottom: '24px', padding: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>Join a Trip with Code</h3>
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
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Enter 6-digit trip code (e.g. 123456)"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                style={{ flex: 1 }}
                autoFocus
              />
              <button type="submit" className="gradient-btn" disabled={!joinCode.trim()}>
                Join
              </button>
              <button type="button" className="secondary-btn" onClick={() => setShowJoinTrip(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}

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
          <div className="glass-card ledger-empty" style={{ borderStyle: 'dashed', position: 'relative' }}>
            <div className="ledger-rule" />
            <div className="ledger-empty-prompt">
              <span className="ledger-badge ledger-badge-tilt-right" aria-hidden="true">
                <IconMapPin size={14} className="icon-sm" />
              </span>
              {isFirstRun ? (
                <p>Welcome aboard. A trip holds your <strong>members</strong>, the <strong>expenses</strong> they log, and the <strong>splits</strong> between them — start one to see it come together.</p>
              ) : (
                <p>{emptyTripBlurb}</p>
              )}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '12px' }}>
                <button className="gradient-btn" onClick={() => setShowAddTrip(true)}>
                  Create Your First Trip
                </button>
                {onLoadDemoTrip && isFeatureEnabled('enableDemoSeeding') && (
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={onLoadDemoTrip}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span>✨</span> Load Demo Trip
                  </button>
                )}
              </div>
            </div>
            <div className="ledger-rule" />
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
                <TripSlideLauncher
                  onCreateTrip={() => setShowAddTrip(true)}
                  onJoinTrip={() => setShowJoinTrip(true)}
                />
              </>
            ) : (
              <>
                <div className="concept2-grid-container">
                  <div className="concept2-grid">
                    {displayedTrips.map((trip: Trip) => (
                      <LuxuryGridTripCard
                        key={trip.id}
                        trip={trip}
                        members={members}
                        onSelectTrip={onSelectTrip}
                        onOpenActionSheet={setActionSheetTrip}
                      />
                    ))}
                  </div>
                </div>

                {!showAddTrip && !showJoinTrip && (
                  <div className="concept2-bottom-dock">
                    <button
                      type="button"
                      className="concept2-new-trip-pill"
                      onClick={() => {
                        triggerHaptic('medium');
                        setShowAddTrip(true);
                      }}
                    >
                      <IconPlus size={16} />
                      <span>New Trip</span>
                    </button>
                    <button
                      type="button"
                      className="concept2-join-trip-btn"
                      onClick={() => {
                        triggerHaptic('light');
                        setShowJoinTrip(true);
                      }}
                    >
                      <span>Join</span>
                    </button>
                  </div>
                )}
              </>
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
    </div>
  );
}
