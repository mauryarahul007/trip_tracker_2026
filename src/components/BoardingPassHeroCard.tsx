import { useState, useEffect } from 'react';
import type { Trip, Member } from '../types';
import type { Transfer } from '../utils/settlement';
import { IconCheckCircle, IconTrophy, IconCopy } from './Icons';
import { formatAmount } from '../utils/currency';
import { triggerHaptic } from '../utils/haptics';
import { getDestinationWeather } from '../services/weatherService';
import type { WeatherData } from '../services/weatherService';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';
import { parseTripRoute } from '../utils/routeHelper';

interface BoardingPassHeroCardProps {
  trip: Trip;
  currencySymbol: string;
  totalOutstanding: number;
  isFullySettled: boolean;
  transfers: Transfer[];
  balancesCount: number;
  currentMember?: Member;
  onOpenSquadBadges?: () => void;
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
const S_BADGE_WRAP: React.CSSProperties = { display: 'flex', gap: '6px' };
const S_SQUAD_BADGE: React.CSSProperties = {
  background: 'rgba(217, 119, 6, 0.12)',
  color: 'var(--color-warning)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '10px',
  fontWeight: 700,
  padding: '4px 8px',
  borderRadius: '8px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  border: '1px solid rgba(217, 119, 6, 0.22)',
};
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

export function BoardingPassHeroCard({
  trip,
  currencySymbol,
  totalOutstanding,
  isFullySettled,
  transfers,
  balancesCount,
  currentMember,
  onOpenSquadBadges,
}: BoardingPassHeroCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [copied, setCopied] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isWeatherRefreshing, setIsWeatherRefreshing] = useState(false);

  const animatedTotalOutstanding = useAnimatedNumber(totalOutstanding, 280);

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
              className="bp-amount"
              style={{ color: isFullySettled ? 'var(--color-success)' : 'var(--color-danger)' }}
            >
              {formatAmount(animatedTotalOutstanding, currencySymbol)}
            </div>
          </div>

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

        {/* ===================== BACK SIDE: Travel Itinerary & Telemetry Pass ===================== */}
        <div
          className="boarding-pass bp-back-face"
          onClick={handleFlip}
          style={S_BACK_FACE}
        >
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
            <div style={S_BADGE_WRAP}>
              {onOpenSquadBadges && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic('medium');
                    onOpenSquadBadges();
                  }}
                  style={S_SQUAD_BADGE}
                  title="View Unlocked Squad Achievements"
                >
                  <IconTrophy size={11} /> SQUAD BADGES
                </div>
              )}
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
        </div>
      </div>
    </div>
  );
}
