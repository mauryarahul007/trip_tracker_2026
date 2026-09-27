import { useState, useEffect, useRef } from 'react';
import type { Trip, Member } from '../types';
import type { Transfer } from '../utils/settlement';
import { IconCheckCircle, IconCopy } from './Icons';
import { formatAmount } from '../utils/currency';
import { triggerHaptic } from '../utils/haptics';
import { getDestinationWeather } from '../services/weatherService';
import type { WeatherData } from '../services/weatherService';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';
import { parseTripRoute } from '../utils/routeHelper';
import { tripDayNumber } from '../utils/dateRange';
import { PassportStamp } from './common/PassportStamp';
import { ConfettiBurst } from './ConfettiBurst';
import { useTripStore } from '../store/tripStore';

export interface TravelerGroupInfo {
  id: string;
  name: string;
  balance: number;
}

interface BoardingPassHeroCardProps {
  trip: Trip;
  currencySymbol: string;
  totalOutstanding: number;
  isFullySettled: boolean;
  transfers: Transfer[];
  balancesCount: number;
  currentMember?: Member;
  onOpenSquadBadges?: () => void;
  /** The signed-in traveler's own net balance on this trip (positive = owed to them). */
  myNetBalance: number;
  /** Group information if the current traveler is part of a couple/group node */
  myGroup?: TravelerGroupInfo;
}

// Style objects that don't depend on props/state -- hoisted to module scope
// so React doesn't reallocate them every render, including the six renders
// a single flip animation triggers (haptic tap -> state change -> 3D
// transition frames). Only styles that actually vary (settled/unsettled
// color, weather-refresh spin, etc.) stay inline below.
const S_FLIP_CONTAINER: React.CSSProperties = { perspective: '1200px', marginBottom: '16px' };
const S_FLIPPER: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  transformStyle: 'preserve-3d',
  transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
};
const S_FRONT_FACE: React.CSSProperties = {
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
  cursor: 'pointer',
  margin: 0,
};
const S_FRONT_FOOT: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
// Shared by the front "Itinerary" hint and the back "Flip Balances" hint --
// same font, size, color, and layout on both faces.
const S_LINK_HINT: React.CSSProperties = {
  fontFamily: 'var(--font-family-mono)',
  fontSize: '11px',
  color: 'var(--primary-accent)',
  fontWeight: 600,
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
};
const S_BACK_FACE: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
  transform: 'rotateY(180deg)',
  cursor: 'pointer',
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
};
const S_BACK_TOP: React.CSSProperties = { paddingBottom: '8px' };
const S_BACK_EYEBROW: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '4px' };
const S_BACK_TITLE: React.CSSProperties = { fontSize: '15px' };
const S_ROUTE_GRID: React.CSSProperties = {
  padding: '10px 18px',
  display: 'grid',
  gridTemplateColumns: '1fr auto 1fr',
  alignItems: 'center',
  background: 'var(--bp-tint)',
  gap: '8px',
};
const S_ROUTE_SIDE_LEFT: React.CSSProperties = { textAlign: 'left', minWidth: 0 };
const S_ROUTE_SIDE_RIGHT: React.CSSProperties = { textAlign: 'right', minWidth: 0 };
// Reused by DEPARTURE, RETURN, and TRAVELER & ROLE labels -- identical style.
const S_MICRO_LABEL: React.CSSProperties = {
  fontSize: '9px',
  fontFamily: 'var(--font-family-mono)',
  color: 'var(--bp-ink-softer)',
  textTransform: 'uppercase',
};
// Reused by the departure and return date values -- identical style.
const S_DATE_VALUE: React.CSSProperties = { fontSize: '15px', fontWeight: 800, color: 'var(--bp-ink)', fontFamily: 'var(--font-family-mono)' };
const S_ORIGIN_TEXT: React.CSSProperties = {
  fontSize: '11.5px',
  color: 'var(--bp-ink-strong)',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};
const S_DEST_TEXT: React.CSSProperties = { ...S_ORIGIN_TEXT, marginLeft: 'auto' };
const S_DURATION_WRAP: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '0 6px', flexShrink: 0 };
const S_DURATION_PILL: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 700,
  fontFamily: 'var(--font-family-mono)',
  color: 'var(--primary-accent)',
  background: 'rgba(63, 203, 189, 0.15)',
  padding: '2px 8px',
  borderRadius: '9999px',
  whiteSpace: 'nowrap',
};
const S_DURATION_DASH: React.CSSProperties = { width: '50px', height: '1.5px', borderTop: '1.5px dashed var(--bp-ink-faint)', margin: '3px 0' };
const S_DURATION_SUBLABEL: React.CSSProperties = { fontSize: '9px', color: 'var(--bp-ink-softer)', fontFamily: 'var(--font-family-mono)', whiteSpace: 'nowrap' };
const S_PASSENGER_WEATHER_ROW: React.CSSProperties = { padding: '8px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const S_PASSENGER_NAME_ROW: React.CSSProperties = { fontSize: '12.5px', fontWeight: 700, color: 'var(--bp-ink)' };
const S_ROLE_HIGHLIGHT: React.CSSProperties = { color: 'var(--primary-accent)', fontWeight: 600 };
const S_WEATHER_COL: React.CSSProperties = { textAlign: 'right', minWidth: '150px' };
const S_WEATHER_LABEL_ROW: React.CSSProperties = { fontSize: '9px', fontFamily: 'var(--font-family-mono)', color: 'var(--bp-ink-softer)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' };
const S_WEATHER_REFRESH_BTN: React.CSSProperties = { background: 'none', border: 'none', padding: '0 2px', cursor: 'pointer', color: 'var(--primary-accent)', fontSize: '12px', lineHeight: 1 };
const S_WEATHER_VALUE_ROW: React.CSSProperties = { fontSize: '12px', fontWeight: 800, color: 'var(--primary-accent)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' };
const S_BACK_FOOT: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: 'var(--bp-paper-soft)',
  borderTop: '1px solid var(--bp-line-strong)',
  padding: '10px 18px',
};
const S_BARCODE_CONTAINER: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' };
const S_BARCODE_CHARS: React.CSSProperties = { fontFamily: 'monospace', fontSize: '14px', letterSpacing: '2px', color: 'var(--bp-ink-mid)' };
const S_JOINCODE_SPAN: React.CSSProperties = { fontFamily: 'var(--font-family-mono)', fontSize: '10px', color: 'var(--bp-ink-strong)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' };

// ===== Design 3 (Fix 1): Full-width route + Side-by-side finances =====
const S_D3_TOP: React.CSSProperties = {
  padding: '12px 18px 8px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '12px',
};
const S_D3_TITLE: React.CSSProperties = {
  fontFamily: 'var(--font-family-title)',
  fontSize: '15px',
  fontWeight: 700,
  color: 'var(--bp-ink)',
  lineHeight: 1.2,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: '220px',
};
const S_D3_DATES: React.CSSProperties = {
  fontFamily: 'var(--font-family-mono)',
  fontSize: '10.5px',
  color: 'var(--bp-ink-mid)',
  marginTop: '2px',
  letterSpacing: '0.02em',
};
const S_D3_STATUS_PILL: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  padding: '3px 8px',
  borderRadius: '9999px',
  background: 'var(--bp-paper-soft)',
  border: '1px solid var(--bp-line-strong)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '9.5px',
  fontWeight: 700,
  letterSpacing: '0.04em',
  color: 'var(--bp-ink)',
  whiteSpace: 'nowrap',
  flexShrink: 0,
};
const S_D3_STATUS_DOT: React.CSSProperties = {
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  flexShrink: 0,
};
const S_D3_BODY: React.CSSProperties = {
  padding: '8px 18px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-around',
  gap: '6px',
  flex: 1,
  minHeight: 0,
};
const S_D3_ROUTE_ROW: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
  width: '100%',
};
const S_D3_ROUTE_CITY_LEFT: React.CSSProperties = {
  textAlign: 'left',
  flex: 1,
  minWidth: 0,
};
const S_D3_ROUTE_CITY_RIGHT: React.CSSProperties = {
  textAlign: 'right',
  flex: 1,
  minWidth: 0,
};
const S_D3_ROUTE_SUB: React.CSSProperties = {
  fontFamily: 'var(--font-family-mono)',
  fontSize: '8.5px',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--bp-ink-softer)',
  fontWeight: 600,
};
const S_D3_ROUTE_CITY_NAME: React.CSSProperties = {
  fontFamily: 'var(--font-family-title)',
  fontSize: '13.5px',
  fontWeight: 800,
  color: 'var(--bp-ink)',
  lineHeight: 1.15,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  marginTop: '1px',
};
const S_D3_ROUTE_PLANE_WRAP: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  flexShrink: 0,
  padding: '0 4px',
  color: 'var(--bp-ink-softer)',
};
const S_D3_ROUTE_LINE: React.CSSProperties = {
  width: '26px',
  height: '1px',
  borderTop: '1.5px dashed var(--bp-ink-faint)',
};
const S_D3_PLANE_ICON: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--primary-accent)',
  display: 'inline-block',
  lineHeight: 1,
};
const S_D3_INNER_DIVIDER: React.CSSProperties = {
  width: '100%',
  height: '1px',
  borderTop: '1px dashed var(--bp-ink-faint)',
  margin: '2px 0',
  opacity: 0.6,
};
const S_D3_FINANCE_GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1px 1fr',
  alignItems: 'center',
  gap: '12px',
  width: '100%',
};
const S_D3_COL: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  minWidth: 0,
};
const S_D3_DIVIDER: React.CSSProperties = {
  width: '1px',
  height: '80%',
  borderLeft: '1px dashed var(--bp-ink-faint)',
  margin: 'auto 0',
};
const S_D3_SECTION_LABEL: React.CSSProperties = {
  fontSize: '9px',
  fontFamily: 'var(--font-family-mono)',
  color: 'var(--bp-ink-softer)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  fontWeight: 600,
};
const S_D3_AMOUNT: React.CSSProperties = {
  fontFamily: 'var(--font-family-mono)',
  fontSize: '16px',
  fontWeight: 800,
  letterSpacing: '-0.02em',
  lineHeight: 1.15,
  marginTop: '2px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};
const S_D3_SUB: React.CSSProperties = {
  fontSize: '10px',
  color: 'var(--bp-ink-mid)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  marginTop: '2px',
};
const S_D3_FOOT: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 18px',
  background: 'var(--bp-paper-soft)',
  borderTop: '1px solid var(--bp-line-strong)',
};
const S_D3_BARCODE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};
const S_D3_BARCODE_BARS: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  gap: '1.5px',
  height: '16px',
};
const BARCODE_HEIGHT_PATTERN = [50, 100, 40, 85, 60, 95, 30, 75, 100, 45, 70, 90, 55, 100, 65, 40];

function formatBoardingDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}

function calculateTripDuration(start?: string, end?: string, stopCount?: number): string {
  let daysText = '';
  if (start && end) {
    try {
      const s = new Date(start);
      const e = new Date(end);
      const diffMs = e.getTime() - s.getTime();
      const days = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
      if (days > 0) daysText = `${days} Days`;
    } catch {
      // fallback
    }
  }
  if (stopCount && stopCount > 0) {
    return daysText ? `${daysText} · ${stopCount} Stop${stopCount === 1 ? '' : 's'}` : `${stopCount} Stop${stopCount === 1 ? '' : 's'}`;
  }
  return daysText || 'Trip Route';
}

interface BoardingStatus {
  label: string;
  statusText: string;
  dotColor: string;
  glowColor: string;
}

function getBoardingStatus(startDate?: string, endDate?: string): BoardingStatus {
  const todayStr = new Date().toLocaleDateString('en-CA');
  if (!startDate) {
    return {
      label: 'TRIP STATUS',
      statusText: 'ACTIVE',
      dotColor: '#38BDF8',
      glowColor: 'rgba(56, 189, 248, 0.5)',
    };
  }
  if (endDate && todayStr > endDate) {
    return {
      label: 'ITINERARY',
      statusText: 'COMPLETED',
      dotColor: '#94A3B8',
      glowColor: 'rgba(148, 163, 184, 0.4)',
    };
  }
  if (todayStr >= startDate && (!endDate || todayStr <= endDate)) {
    const day = tripDayNumber(startDate, todayStr);
    return {
      label: 'FLIGHT STATUS',
      statusText: day ? `ONGOING · DAY ${day}` : 'ONGOING',
      dotColor: '#10B981',
      glowColor: 'rgba(16, 185, 129, 0.65)',
    };
  }
  if (todayStr < startDate) {
    const s = new Date(`${startDate}T00:00:00`).getTime();
    const t = new Date(`${todayStr}T00:00:00`).getTime();
    const diffDays = Math.ceil((s - t) / 86400000);
    return {
      label: 'DEPARTURE',
      statusText: diffDays === 1 ? 'STARTS TOMORROW' : `IN ${diffDays} DAYS`,
      dotColor: '#F59E0B',
      glowColor: 'rgba(245, 158, 11, 0.65)',
    };
  }
  return {
    label: 'TRIP STATUS',
    statusText: 'SCHEDULED',
    dotColor: '#38BDF8',
    glowColor: 'rgba(56, 189, 248, 0.5)',
  };
}

export function BoardingPassHeroCard({
  trip,
  currencySymbol,
  totalOutstanding,
  isFullySettled,
  transfers,
  balancesCount,
  currentMember,
  myNetBalance,
  myGroup,
}: BoardingPassHeroCardProps) {
  const isNewBack = useTripStore((s) => s.isFeatureEnabled('enableTravelerPassBack'));
  const [isFlipped, setIsFlipped] = useState(false);
  const [copied, setCopied] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isWeatherRefreshing, setIsWeatherRefreshing] = useState(false);

  const animatedTotalOutstanding = useAnimatedNumber(totalOutstanding, 280);

  // enableMotionPolish: the moment the last balance clears (not on first
  // render of an already-settled trip), the stamp slams down with confetti
  // and a success haptic.
  const motionPolish = useTripStore((s) => s.isFeatureEnabled('enableMotionPolish'));
  const [justSettled, setJustSettled] = useState(false);
  const wasSettledRef = useRef(isFullySettled);
  useEffect(() => {
    const was = wasSettledRef.current;
    wasSettledRef.current = isFullySettled;
    if (!motionPolish || was || !isFullySettled) return;
    triggerHaptic('success');
    setJustSettled(true);
    const t = window.setTimeout(() => setJustSettled(false), 1400);
    return () => window.clearTimeout(t);
  }, [isFullySettled, motionPolish]);

  const weatherCandidates = [
    ...(trip.stops?.map((s) => s.name) || []),
    trip.destination || '',
    trip.name || '',
  ].filter(Boolean);

  // Fetch weather for trip destination, stops, or trip name
  useEffect(() => {
    let active = true;
    if (weatherCandidates.length > 0) {
      getDestinationWeather(weatherCandidates).then((data) => {
        if (active && data) setWeather(data);
      });
    }
    return () => {
      active = false;
    };
  }, [trip.destination, trip.name, trip.stops]);

  const handleRefreshWeather = async (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    setIsWeatherRefreshing(true);
    if (weatherCandidates.length > 0) {
      const data = await getDestinationWeather(weatherCandidates, true);
      if (data) setWeather(data);
    }
    setTimeout(() => setIsWeatherRefreshing(false), 600);
  };

  const handleFlip = () => {
    triggerHaptic('light');
    setIsFlipped(!isFlipped);
  };

  const handleCopyJoinCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('success');
    if (trip.joinCode && navigator.clipboard) {
      navigator.clipboard.writeText(trip.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const passengerName = currentMember?.name || 'Squad Traveler';
  const isSquadLeader = currentMember?.id === trip.ownerId;
  const parsedRoute = parseTripRoute(trip);
  const durationLabel = calculateTripDuration(trip.startDate, trip.endDate, parsedRoute.allStops.length > 1 ? parsedRoute.allStops.length : undefined);
  const boardingStatus = getBoardingStatus(trip.startDate, trip.endDate);
  const hasGroup = !!myGroup;
  const effectiveBalance = hasGroup ? myGroup.balance : myNetBalance;
  const backIsSettled = isFullySettled || Math.abs(effectiveBalance) < 0.01;

  const dateRangeLabel = trip.startDate && trip.endDate
    ? `${formatBoardingDate(trip.startDate)} – ${formatBoardingDate(trip.endDate)}`
    : trip.startDate
      ? `From ${formatBoardingDate(trip.startDate)}`
      : 'Flexible Dates';

  const hasDistinctOrigin = Boolean(
    parsedRoute.origin &&
    parsedRoute.origin !== 'Origin' &&
    parsedRoute.origin !== parsedRoute.destination
  );

  const groupLabel = hasGroup ? ` · ${myGroup.name}` : '';
  const personalStakeSubtext = backIsSettled
    ? (isFullySettled
        ? `Trip fully settled${groupLabel}`
        : `Zero dues${groupLabel}`)
    : effectiveBalance > 0
      ? `To receive${groupLabel}`
      : `To pay${groupLabel}`;

  const soloSubtext = Math.abs(myNetBalance) < 0.01
    ? `Settled · ${passengerName}`
    : myNetBalance > 0
      ? `Fronted · ${passengerName}`
      : `Share due · ${passengerName}`;

  return (
    <div className="boarding-pass-flip-container" style={S_FLIP_CONTAINER}>
      <div
        className={`boarding-pass-flipper ${isFlipped ? 'flipped' : ''}`}
        style={S_FLIPPER}
      >
        {/* ===================== FRONT SIDE: Balance Summary Ticket ===================== */}
        <div
          className="boarding-pass bp-front-face"
          onClick={handleFlip}
          style={S_FRONT_FACE}
        >
          {/* Top Section */}
          <div className="bp-top">
            <div>
              <div className="bp-eyebrow">{trip.name}</div>
              <div className="bp-title">Balance summary</div>
            </div>
            <div className="bp-meta">{trip.baseCurrency}</div>
            <div className="bp-stamp-pos">
              <span
                key={isFullySettled ? 'settled' : 'unsettled'}
                className="stamp-badge"
                style={{
                  color: isFullySettled ? 'var(--color-success)' : 'var(--color-danger)',
                }}
              >
                {isFullySettled && <IconCheckCircle size={14} className="icon-sm" />}
                {isFullySettled ? 'Settled' : 'Unsettled'}
              </span>
            </div>
          </div>

          {/* Perforated Tear Line with Semicircular Notches */}
          <div className="bp-perf" />

          {/* Center Hero Metric */}
          <div className="bp-body">
            <div className="bp-who">{isFullySettled ? 'Outstanding' : 'Outstanding to settle'}</div>
            <div
              key={Math.round(totalOutstanding * 100)}
              className="bp-amount value-bump"
              style={{ color: isFullySettled ? 'var(--color-success)' : 'var(--color-danger)' }}
            >
              {formatAmount(animatedTotalOutstanding, currencySymbol)}
            </div>

            {/* Passport Ink Stamp Watermark: on the left side above the lower perforated line */}
            <div
              style={{
                position: 'absolute',
                bottom: '10px',
                left: '16px',
                zIndex: 2,
                pointerEvents: 'none',
              }}
              aria-hidden="true"
              className={justSettled ? 'stamp-settle-bounce' : undefined}
            >
              <PassportStamp
                destination={parsedRoute.destination || trip.name}
                tripName={trip.name}
                date={trip.startDate}
                variant={isFullySettled ? 'settled' : 'entry'}
                color={isFullySettled ? 'success' : 'danger'}
                transparent={true}
                tilt={8}
                size={52}
              />
            </div>
            <ConfettiBurst active={justSettled} />
          </div>

          {/* Perforated Lower Line */}
          <div className="bp-perf" />
          {/* Perforated Lower Line */}
          <div className="bp-perf" />

          {/* Bottom Footer Stub */}
          <div className="bp-foot" style={S_FRONT_FOOT}>
            <span>{balancesCount} members</span>
            <span>
              {transfers.length} transfer{transfers.length === 1 ? '' : 's'} left
            </span>
            <span style={S_LINK_HINT}>
              ↻ Itinerary
            </span>
          </div>
        </div>

        {/* ===================== BACK SIDE ===================== */}
        <div
          className="boarding-pass bp-back-face"
          onClick={handleFlip}
          style={S_BACK_FACE}
        >
          {isNewBack ? (
            <>
              {/* Top Section */}
              <div style={S_D3_TOP}>
                <div style={{ minWidth: 0 }}>
                  <div style={S_D3_TITLE} title={trip.name}>
                    {trip.name}
                  </div>
                  <div style={S_D3_DATES}>
                    {dateRangeLabel}
                  </div>
                </div>
                <div
                  style={S_D3_STATUS_PILL}
                  title={`Trip Status: ${boardingStatus.statusText}`}
                >
                  <span
                    style={{
                      ...S_D3_STATUS_DOT,
                      background: boardingStatus.dotColor,
                      boxShadow: `0 0 6px ${boardingStatus.glowColor}`,
                    }}
                  />
                  <span>{boardingStatus.statusText}</span>
                </div>
              </div>

              {/* Perforated Separator Line */}
              <div className="bp-perf" />

              {/* Center Fix 1 Body: Full-Width Route Vector Banner + Side-by-Side Financial Columns */}
              <div style={S_D3_BODY}>
                {/* Upper Row: Full-width Route Vector */}
                <div style={S_D3_ROUTE_ROW}>
                  {hasDistinctOrigin ? (
                    <>
                      <div style={S_D3_ROUTE_CITY_LEFT}>
                        <div style={S_D3_ROUTE_SUB}>DEPARTURE</div>
                        <div style={S_D3_ROUTE_CITY_NAME} title={parsedRoute.origin}>
                          {parsedRoute.origin}
                        </div>
                      </div>

                      <div style={S_D3_ROUTE_PLANE_WRAP}>
                        <div style={S_D3_ROUTE_LINE} />
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                          <span style={S_D3_PLANE_ICON} aria-hidden="true">✈</span>
                          <span style={{ fontSize: '8.5px', fontFamily: 'var(--font-family-mono)', color: 'var(--bp-ink-soft)', whiteSpace: 'nowrap' }}>
                            {durationLabel || 'Direct'}
                          </span>
                        </div>
                        <div style={S_D3_ROUTE_LINE} />
                      </div>

                      <div style={S_D3_ROUTE_CITY_RIGHT}>
                        <div style={S_D3_ROUTE_SUB}>DESTINATION</div>
                        <div style={S_D3_ROUTE_CITY_NAME} title={parsedRoute.destination}>
                          {parsedRoute.destination}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={S_D3_ROUTE_CITY_LEFT}>
                        <div style={S_D3_ROUTE_SUB}>DESTINATION</div>
                        <div style={S_D3_ROUTE_CITY_NAME} title={parsedRoute.destination || trip.name}>
                          {parsedRoute.destination || trip.name}
                        </div>
                      </div>

                      <div style={S_D3_ROUTE_PLANE_WRAP}>
                        <div style={S_D3_ROUTE_LINE} />
                        <span style={S_D3_PLANE_ICON} aria-hidden="true">✈</span>
                        <div style={S_D3_ROUTE_LINE} />
                      </div>

                      <div style={S_D3_ROUTE_CITY_RIGHT}>
                        <div style={S_D3_ROUTE_SUB}>DURATION & TRAVELERS</div>
                        <div style={S_D3_ROUTE_CITY_NAME}>
                          {durationLabel ? `${durationLabel} · ${balancesCount}P` : `${balancesCount} Traveler${balancesCount === 1 ? '' : 's'}`}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Inner Horizontal Divider */}
                <div style={S_D3_INNER_DIVIDER} aria-hidden="true" />

                {/* Lower Row: Financial Grid */}
                <div style={S_D3_FINANCE_GRID}>
                  {/* Left Column: Group Share / Your Share */}
                  <div style={S_D3_COL}>
                    <div style={S_D3_SECTION_LABEL}>
                      {hasGroup ? 'GROUP SHARE' : 'YOUR SHARE'}
                    </div>
                    <div
                      style={{
                        ...S_D3_AMOUNT,
                        color: backIsSettled || effectiveBalance > 0 ? 'var(--color-success)' : 'var(--color-danger)',
                      }}
                    >
                      {backIsSettled ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          All Square <IconCheckCircle size={14} />
                        </span>
                      ) : effectiveBalance > 0 ? (
                        `+${formatAmount(effectiveBalance, currencySymbol)}`
                      ) : (
                        `-${formatAmount(Math.abs(effectiveBalance), currencySymbol)}`
                      )}
                    </div>
                    <div style={S_D3_SUB} title={personalStakeSubtext}>
                      {personalStakeSubtext}
                    </div>
                  </div>

                  {/* Vertical Divider */}
                  <div style={S_D3_DIVIDER} aria-hidden="true" />

                  {/* Right Column: Solo Out-of-Pocket (if grouped) or Traveler Profile (if solo) */}
                  <div style={S_D3_COL}>
                    {hasGroup ? (
                      <>
                        <div style={S_D3_SECTION_LABEL}>SOLO OUT-OF-POCKET</div>
                        <div
                          style={{
                            ...S_D3_AMOUNT,
                            color: myNetBalance > 0 ? 'var(--color-success)' : myNetBalance < 0 ? 'var(--color-danger)' : 'var(--bp-ink-mid)',
                          }}
                        >
                          {Math.abs(myNetBalance) < 0.01
                            ? formatAmount(0, currencySymbol)
                            : myNetBalance > 0
                              ? `+${formatAmount(myNetBalance, currencySymbol)}`
                              : `-${formatAmount(Math.abs(myNetBalance), currencySymbol)}`}
                        </div>
                        <div style={S_D3_SUB} title={soloSubtext}>
                          {soloSubtext}
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={S_D3_SECTION_LABEL}>TRAVELER</div>
                        <div
                          style={{
                            fontFamily: 'var(--font-family-title)',
                            fontSize: '14.5px',
                            fontWeight: 700,
                            color: 'var(--bp-ink)',
                            lineHeight: 1.2,
                            marginTop: '2px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={passengerName}
                        >
                          {passengerName}
                        </div>
                        <div style={S_D3_SUB}>
                          {isSquadLeader ? 'Squad Leader' : 'Squad Traveler'}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Perforated Separator Line */}
              <div className="bp-perf" />

              {/* Bottom Footer Stub */}
              <div style={S_D3_FOOT}>
                <div style={S_D3_BARCODE} aria-hidden="true">
                  <div style={S_D3_BARCODE_BARS}>
                    {BARCODE_HEIGHT_PATTERN.map((h, i) => (
                      <span
                        key={i}
                        style={{
                          display: 'block',
                          width: '2px',
                          height: `${h}%`,
                          background: 'var(--bp-ink)',
                          opacity: 0.45,
                        }}
                      />
                    ))}
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--font-family-mono)',
                      fontSize: '10px',
                      color: 'var(--bp-ink-soft)',
                      letterSpacing: '1px',
                    }}
                  >
                    {trip.joinCode || 'PASS-2026'}
                  </span>
                </div>

                <span style={S_LINK_HINT}>
                  ↺ Group Summary
                </span>
              </div>
            </>
          ) : (
            <>
              {/* Top Itinerary Bar */}
              <div className="bp-top" style={S_BACK_TOP}>
                <div>
                  <div className="bp-eyebrow" style={S_BACK_EYEBROW}>
                    🧭 TRIP ITINERARY & TELEMETRY
                  </div>
                  <div className="bp-title" style={S_BACK_TITLE}>
                    {trip.name}
                  </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 0 }}>
                  <div style={S_MICRO_LABEL}>{boardingStatus.label}</div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginTop: '3px',
                      padding: '3px 9px',
                      borderRadius: '9999px',
                      background: 'var(--bp-paper-soft)',
                      border: '1px solid var(--bp-line-strong)',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
                    }}
                    title={`Trip Status: ${boardingStatus.statusText}`}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: boardingStatus.dotColor,
                        boxShadow: `0 0 7px ${boardingStatus.glowColor}`,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: 'var(--font-family-mono)',
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        color: 'var(--bp-ink)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {boardingStatus.statusText}
                    </span>
                  </div>
                </div>
              </div>

              {/* Middle Route & Dates Grid */}
              <div style={S_ROUTE_GRID}>
                {/* Departure */}
                <div style={S_ROUTE_SIDE_LEFT}>
                  <div style={S_MICRO_LABEL}>
                    DEPARTURE
                  </div>
                  <div style={S_DATE_VALUE}>
                    {trip.startDate ? formatBoardingDate(trip.startDate) : 'START'}
                  </div>
                  <div style={S_ORIGIN_TEXT} title={parsedRoute.origin}>
                    {parsedRoute.origin}
                  </div>
                </div>

                {/* Duration Vector */}
                <div style={S_DURATION_WRAP}>
                  <span style={S_DURATION_PILL}>
                    {durationLabel}
                  </span>
                  <div style={S_DURATION_DASH} />
                  <span style={S_DURATION_SUBLABEL}>
                    {parsedRoute.isMultiStop ? `${parsedRoute.allStops.length} Stops` : 'Direct Route'}
                  </span>
                </div>

                {/* Return / Destination */}
                <div style={S_ROUTE_SIDE_RIGHT}>
                  <div style={S_MICRO_LABEL}>
                    RETURN
                  </div>
                  <div style={S_DATE_VALUE}>
                    {trip.endDate ? formatBoardingDate(trip.endDate) : 'OPEN'}
                  </div>
                  <div style={S_DEST_TEXT} title={parsedRoute.destination}>
                    {parsedRoute.destination}
                  </div>
                </div>
              </div>

              {/* Perforated Separator */}
              <div className="bp-perf" />

              {/* Passenger & Live Telemetry Weather Strip */}
              <div style={S_PASSENGER_WEATHER_ROW}>
                <div>
                  <div style={S_MICRO_LABEL}>
                    TRAVELER & ROLE
                  </div>
                  <div style={S_PASSENGER_NAME_ROW}>
                    {passengerName} · <span style={S_ROLE_HIGHLIGHT}>{isSquadLeader ? 'Leader' : 'Traveler'}</span>
                  </div>
                </div>

                <div style={S_WEATHER_COL}>
                  <div style={S_WEATHER_LABEL_ROW}>
                    <span>DESTINATION WEATHER</span>
                    <button
                      type="button"
                      onClick={handleRefreshWeather}
                      aria-label="Refresh weather data"
                      title="Refresh weather data"
                      style={S_WEATHER_REFRESH_BTN}
                    >
                      <span
                        style={{
                          display: 'inline-block',
                          transition: 'transform 0.5s ease',
                          transform: isWeatherRefreshing ? 'rotate(360deg)' : 'none',
                        }}
                      >
                        ↻
                      </span>
                    </button>
                  </div>
                  <div key={weather ? 'loaded' : 'loading'} className="fade-in" style={S_WEATHER_VALUE_ROW}>
                    <span>{weather ? weather.weatherEmoji : '🏔️'}</span>
                    <span>{weather ? `${weather.tempC}°C · ${weather.condition}` : 'Loading weather...'}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Barcode, Join Code & Flip Toggle */}
              <div className="bp-foot" style={S_BACK_FOOT}>
                <div
                  onClick={handleCopyJoinCode}
                  className="bp-barcode-container"
                  style={S_BARCODE_CONTAINER}
                  title="Click to copy Join Code"
                >
                  <div className="bp-barcode-sweep" aria-hidden="true" />
                  <span style={S_BARCODE_CHARS}>
                    ▌│█║▌║▌║
                  </span>
                  <span style={S_JOINCODE_SPAN}>
                    {trip.joinCode ? (
                      <>
                        {trip.joinCode} {copied ? '✓ COPIED' : <IconCopy size={11} />}
                      </>
                    ) : (
                      '2026-PASS'
                    )}
                  </span>
                </div>

                <span style={S_LINK_HINT}>
                  ↻ Flip Balances
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
