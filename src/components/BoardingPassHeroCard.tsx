import { useState, useEffect } from 'react';
import type { Trip, Member } from '../types';
import type { Transfer } from '../utils/settlement';
import { IconCheckCircle, IconTrophy, IconCopy } from './Icons';
import { formatAmount } from '../utils/currency';
import { triggerHaptic } from '../utils/haptics';
import { getDestinationWeather } from '../services/weatherService';
import type { WeatherData } from '../services/weatherService';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';

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
  const stopsList = trip.stops || [];
  const startStopName = stopsList.length > 0 ? stopsList[0].name : (trip.destination || 'Origin');
  const endStopName = stopsList.length > 1 ? stopsList[stopsList.length - 1].name : (trip.destination || 'Destination');
  const durationLabel = calculateTripDuration(trip.startDate, trip.endDate, stopsList.length);

  return (
    <div className="boarding-pass-flip-container" style={{ perspective: '1200px', marginBottom: '16px' }}>
      <div
        className={`boarding-pass-flipper ${isFlipped ? 'flipped' : ''}`}
        style={{
          position: 'relative',
          width: '100%',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* ===================== FRONT SIDE: Balance Summary Ticket ===================== */}
        <div
          className="boarding-pass bp-front-face"
          onClick={handleFlip}
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            cursor: 'pointer',
            margin: 0,
          }}
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
          <div className="bp-foot" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{balancesCount} members</span>
            <span>
              {transfers.length} transfer{transfers.length === 1 ? '' : 's'} left
            </span>
            <span
              style={{
                fontFamily: 'var(--font-family-mono)',
                fontSize: '11px',
                color: 'var(--primary-accent)',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              ↻ Itinerary
            </span>
          </div>
        </div>

        {/* ===================== BACK SIDE: Travel Itinerary & Telemetry Pass ===================== */}
        <div
          className="boarding-pass bp-back-face"
          onClick={handleFlip}
          style={{
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
          }}
        >
          {/* Top Itinerary Bar */}
          <div className="bp-top" style={{ paddingBottom: '8px' }}>
            <div>
              <div className="bp-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                🧭 TRIP ITINERARY & TELEMETRY
              </div>
              <div className="bp-title" style={{ fontSize: '15px' }}>
                {trip.name}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {onOpenSquadBadges && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic('medium');
                    onOpenSquadBadges();
                  }}
                  style={{
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
                  }}
                  title="View Unlocked Squad Achievements"
                >
                  <IconTrophy size={11} /> SQUAD BADGES
                </div>
              )}
            </div>
          </div>

          {/* Middle Route & Dates Grid */}
          <div
            style={{
              padding: '10px 18px',
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center',
              background: 'rgba(31, 27, 20, 0.03)',
              gap: '8px',
            }}
          >
            {/* Departure */}
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '9px', fontFamily: 'var(--font-family-mono)', color: 'rgba(31, 27, 20, 0.55)', textTransform: 'uppercase' }}>
                DEPARTURE
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#1F1B14', fontFamily: 'var(--font-family-mono)' }}>
                {trip.startDate ? formatBoardingDate(trip.startDate) : 'START'}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'rgba(31, 27, 20, 0.65)',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100px',
                }}
                title={startStopName}
              >
                {startStopName}
              </div>
            </div>

            {/* Duration Vector */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '0 8px' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-family-mono)',
                  color: 'var(--primary-accent)',
                  background: 'rgba(63, 203, 189, 0.15)',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  whiteSpace: 'nowrap',
                }}
              >
                {durationLabel}
              </span>
              <div style={{ width: '56px', height: '1.5px', borderTop: '1.5px dashed rgba(31, 27, 20, 0.3)', margin: '3px 0' }} />
              <span style={{ fontSize: '9px', color: 'rgba(31, 27, 20, 0.55)', fontFamily: 'var(--font-family-mono)' }}>
                {stopsList.length > 1 ? 'Multi-Stop' : 'Direct Route'}
              </span>
            </div>

            {/* Return / Destination */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '9px', fontFamily: 'var(--font-family-mono)', color: 'rgba(31, 27, 20, 0.55)', textTransform: 'uppercase' }}>
                RETURN
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#1F1B14', fontFamily: 'var(--font-family-mono)' }}>
                {trip.endDate ? formatBoardingDate(trip.endDate) : 'OPEN'}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'rgba(31, 27, 20, 0.65)',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100px',
                  marginLeft: 'auto',
                }}
                title={endStopName}
              >
                {endStopName}
              </div>
            </div>
          </div>

          {/* Perforated Separator */}
          <div className="bp-perf" />

          {/* Passenger & Live Telemetry Weather Strip */}
          <div style={{ padding: '8px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '9px', fontFamily: 'var(--font-family-mono)', color: 'rgba(31, 27, 20, 0.55)', textTransform: 'uppercase' }}>
                TRAVELER & ROLE
              </div>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1F1B14' }}>
                {passengerName} · <span style={{ color: 'var(--primary-accent)', fontWeight: 600 }}>{isSquadLeader ? 'Leader' : 'Traveler'}</span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '9px', fontFamily: 'var(--font-family-mono)', color: 'rgba(31, 27, 20, 0.55)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                <span>DESTINATION WEATHER</span>
                <button
                  type="button"
                  onClick={handleRefreshWeather}
                  aria-label="Refresh weather data"
                  title="Refresh weather data"
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '0 2px',
                    cursor: 'pointer',
                    color: 'var(--primary-accent)',
                    fontSize: '12px',
                    lineHeight: 1,
                  }}
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
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary-accent)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                <span>{weather ? weather.weatherEmoji : '🏔️'}</span>
                <span>{weather ? `${weather.tempC}°C · ${weather.condition}` : 'Loading weather...'}</span>
              </div>
            </div>
          </div>

          {/* Bottom Barcode, Join Code & Flip Toggle */}
          <div
            className="bp-foot"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#F7F0E1',
              borderTop: '1px solid #E6DAC4',
              padding: '10px 18px',
            }}
          >
            <div
              onClick={handleCopyJoinCode}
              className="bp-barcode-container"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              title="Click to copy Join Code"
            >
              <div className="bp-barcode-sweep" aria-hidden="true" />
              <span style={{ fontFamily: 'monospace', fontSize: '14px', letterSpacing: '2px', color: 'rgba(31, 27, 20, 0.7)' }}>
                ▌│█║▌║▌║
              </span>
              <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '10px', color: 'rgba(31, 27, 20, 0.8)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                {trip.joinCode ? (
                  <>
                    {trip.joinCode} {copied ? '✓ COPIED' : <IconCopy size={11} />}
                  </>
                ) : (
                  '2026-PASS'
                )}
              </span>
            </div>

            <span
              style={{
                fontFamily: 'var(--font-family-mono)',
                fontSize: '11px',
                color: 'var(--primary-accent)',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              ↻ Flip Balances
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
