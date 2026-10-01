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
import { buildPassStub, toneFor } from '../utils/passBackStub';
import { formatRelativeTime } from '../utils/relativeTime';
import { initial } from '../utils/initials';

export interface TravelerGroupInfo {
  id: string;
  name: string;
  balance: number;
  /** Names of the other people in this group, used on the inside-cell caption. */
  otherMemberNames: string[];
}

export interface TravelerWallet {
  paid: number;
  share: number;
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
  /** Cash laid out and own share, same expense set as the balance engine. */
  myWallet: TravelerWallet;
  /** Group information if the current traveler is part of a couple/group node */
  myGroup?: TravelerGroupInfo;
  /** How many of the trip's travelers are currently settled (balance ~0). */
  settledMemberCount: number;
  /** Other travelers' names, for the back-face avatar row (any order). */
  travelerNames: string[];
  /** Most recent write across this trip's expenses/settlements, epoch ms. */
  lastUpdatedAt: number;
}

// Style objects that don't depend on props/state -- hoisted to module scope
// so React doesn't reallocate them every render, including the six renders
// a single flip animation triggers (haptic tap -> state change -> 3D
// transition frames). Only styles that actually vary (settled/unsettled
// color, weather-refresh spin, etc.) stay inline below.
const S_FLIP_CONTAINER: React.CSSProperties = { perspective: '1200px', marginBottom: '16px' };
// Both faces share one grid cell, so the card takes the taller face's
// height -- the back face can never be clipped by the front face's box.
const S_FLIPPER: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  display: 'grid',
  transformStyle: 'preserve-3d',
  transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
};
const S_FRONT_FACE: React.CSSProperties = {
  gridArea: '1 / 1',
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
  cursor: 'pointer',
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
};
// The front stretches to the back's height; its body absorbs the extra
// space so the amount stays centered instead of leaving a gap at the foot.
const S_FRONT_BODY: React.CSSProperties = { flex: 1, justifyContent: 'center' };
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
  gridArea: '1 / 1',
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

// ===== Simplified back face: personal balance hero, no route/weather/status =====
const S_D3_DATES: React.CSSProperties = {
  fontFamily: 'var(--font-family-mono)',
  fontSize: '10.5px',
  color: 'var(--bp-ink-mid)',
  marginTop: '2px',
  letterSpacing: '0.02em',
};
const S_FLIP_HINT: React.CSSProperties = { ...S_LINK_HINT, flexShrink: 0, whiteSpace: 'nowrap' };
const S_HERO_BODY: React.CSSProperties = {
  padding: '18px 20px 16px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  gap: '4px',
  flex: 1,
  justifyContent: 'center',
};
const S_HERO_AMOUNT: React.CSSProperties = { fontSize: '32px' };
const S_PROGRESS_WRAP: React.CSSProperties = { width: '100%', maxWidth: '260px', marginTop: '12px' };
const S_PROGRESS_META: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '10.5px',
  color: 'var(--bp-ink-soft)',
  marginBottom: '6px',
};
const S_PROGRESS_TRACK: React.CSSProperties = {
  width: '100%',
  height: '4px',
  borderRadius: '9999px',
  background: 'var(--bp-line-strong)',
  overflow: 'hidden',
};
const S_PROGRESS_FILL: React.CSSProperties = {
  height: '100%',
  borderRadius: 'inherit',
  background: 'var(--color-success)',
  transition: 'width 0.4s ease',
};
const S_SETTLE_LINK: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  padding: '12px 20px',
  background: 'var(--bp-paper-soft)',
  border: 'none',
  borderTop: '1px solid var(--bp-line)',
  borderBottom: '1px solid var(--bp-line)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '11.5px',
  fontWeight: 700,
  color: 'var(--primary-accent)',
  cursor: 'pointer',
  textAlign: 'left',
};
const S_SIMPLE_FOOT: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '12px 20px 14px',
};
const S_FOOT_LEFT: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 };
const S_COPY_CHIP: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  alignSelf: 'flex-start',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.04em',
  color: 'var(--bp-ink)',
  background: 'transparent',
  border: '1px dashed var(--bp-line-strong)',
  borderRadius: '6px',
  padding: '4px 8px',
  cursor: 'pointer',
};
const S_SYNC_ROW: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '9.5px',
  color: 'var(--bp-ink-softer)',
  whiteSpace: 'nowrap',
};
const S_SYNC_DOT: React.CSSProperties = {
  width: '5px',
  height: '5px',
  borderRadius: '50%',
  background: 'var(--color-success)',
  flexShrink: 0,
};
const S_AVATAR_STACK: React.CSSProperties = { display: 'flex', alignItems: 'center', paddingLeft: '7px', flexShrink: 0 };
const S_AVATAR: React.CSSProperties = {
  width: '26px',
  height: '26px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '10px',
  fontWeight: 700,
  color: 'var(--bp-ink)',
  background: 'var(--bp-paper-soft)',
  border: '2px solid var(--bp-paper)',
  boxShadow: '0 0 0 1px var(--bp-line-strong)',
  marginLeft: '-7px',
};
const S_AVATAR_MORE: React.CSSProperties = { background: 'var(--bp-line)', color: 'var(--bp-ink-soft)' };

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

/** Destination used for the back face's weather lookup. */
function weatherDestination(trip: { name?: string; destination?: string; stops?: { name: string }[] }): string {
  const route = parseTripRoute(trip);
  return route.destination && route.destination !== 'Origin' ? route.destination : (trip.name || '');
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
  myWallet,
  myGroup,
  settledMemberCount,
  travelerNames,
  lastUpdatedAt,
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

  useEffect(() => {
    let active = true;
    const destination = weatherDestination(trip);
    if (destination) {
      getDestinationWeather(destination).then((data) => {
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
    try {
      const destination = weatherDestination(trip);
      if (destination) {
        const data = await getDestinationWeather(destination, true);
        if (data) setWeather(data);
      }
    } finally {
      setIsWeatherRefreshing(false);
    }
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
  const dateRangeLabel = trip.startDate && trip.endDate
    ? `${formatBoardingDate(trip.startDate)} – ${formatBoardingDate(trip.endDate)}`
    : trip.startDate
      ? `From ${formatBoardingDate(trip.startDate)}`
      : 'Flexible Dates';

  const passStub = buildPassStub({
    myNet: myNetBalance,
    group: myGroup
      ? { name: myGroup.name, balance: myGroup.balance, otherMemberNames: myGroup.otherMemberNames }
      : null,
    paid: myWallet.paid,
    share: myWallet.share,
  }, (amount) => formatAmount(amount, currencySymbol));

  // Back-face hero: named ("You owe Rohan") only when the whole story is one
  // counterparty -- a single other group member and nothing owed outside the
  // group. Otherwise fall back to the generic personal net so the hero never
  // names just one of several people you're settled up with.
  const heroOutside = myGroup ? Number((myNetBalance - passStub.left.amount).toFixed(2)) : 0;
  const heroIsSingleCounterparty = Boolean(
    myGroup && myGroup.otherMemberNames.length === 1 && Math.abs(heroOutside) < 0.01
  );
  const heroTone = heroIsSingleCounterparty ? passStub.left.tone : toneFor(myNetBalance);
  const heroAmount = Math.abs(heroIsSingleCounterparty ? passStub.left.amount : myNetBalance);
  const heroWho = heroIsSingleCounterparty
    ? passStub.left.caption
    : heroTone === 'pay' ? 'You owe' : heroTone === 'receive' ? "You're owed" : "You're square";
  const heroColor = heroTone === 'pay' ? 'var(--color-danger)' : heroTone === 'receive' ? 'var(--color-success)' : 'var(--bp-ink)';

  const settledPct = balancesCount > 0 ? Math.round((settledMemberCount / balancesCount) * 100) : 100;
  const avatarNames = travelerNames.slice(0, 3);
  const avatarOverflow = travelerNames.length - avatarNames.length;

  const handleScrollToSettlements = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    document.querySelector('.settlements-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
          <div className="bp-body" style={S_FRONT_BODY}>
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

          {/* Bottom Footer Stub */}
          <div className="bp-foot" style={S_FRONT_FOOT}>
            <span>{balancesCount} members</span>
            <span>
              {transfers.length} transfer{transfers.length === 1 ? '' : 's'} left
            </span>
            <span style={S_LINK_HINT}>
              ↻ Balance details
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
              <div className="bp-top">
                <div style={{ minWidth: 0 }}>
                  <div className="bp-eyebrow">{trip.name}</div>
                  <div className="bp-title">Balance details</div>
                  <div style={S_D3_DATES}>{dateRangeLabel}</div>
                </div>
                <span style={S_FLIP_HINT}>↺ Balance summary</span>
              </div>

              <div className="bp-perf" />

              <div style={S_HERO_BODY}>
                <div className="bp-who">{heroWho}</div>
                <div className="bp-amount" style={{ ...S_HERO_AMOUNT, color: heroColor }}>
                  {formatAmount(heroAmount, currencySymbol)}
                </div>
                <div style={S_PROGRESS_WRAP}>
                  <div style={S_PROGRESS_META}>
                    <span>{settledMemberCount} of {balancesCount} settled</span>
                    <span>{settledPct}%</span>
                  </div>
                  <div
                    style={S_PROGRESS_TRACK}
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={settledPct}
                    aria-label="Travelers settled"
                  >
                    <div style={{ ...S_PROGRESS_FILL, width: `${settledPct}%` }} />
                  </div>
                </div>
              </div>

              {/* Jumps to the existing "Who owes who" section -- no second settle flow here. */}
              <button type="button" style={S_SETTLE_LINK} onClick={handleScrollToSettlements}>
                <span>See who owes who</span>
                <span aria-hidden="true">↓</span>
              </button>

              <div style={S_SIMPLE_FOOT}>
                <div style={S_FOOT_LEFT}>
                  <button
                    type="button"
                    style={S_COPY_CHIP}
                    onClick={handleCopyJoinCode}
                    title="Copy join code"
                  >
                    {trip.joinCode || 'PASS-2026'} {copied ? '✓ Copied' : <IconCopy size={11} />}
                  </button>
                  {lastUpdatedAt > 0 ? (
                    <span style={S_SYNC_ROW}>
                      <span style={S_SYNC_DOT} aria-hidden="true" />
                      Updated {formatRelativeTime(new Date(lastUpdatedAt).toISOString())}
                    </span>
                  ) : null}
                </div>
                {travelerNames.length > 0 ? (
                  <div
                    style={S_AVATAR_STACK}
                    title={`${travelerNames.length} other traveler${travelerNames.length === 1 ? '' : 's'}`}
                  >
                    {avatarNames.map((name, i) => (
                      <span key={i} style={S_AVATAR}>{initial(name)}</span>
                    ))}
                    {avatarOverflow > 0 ? <span style={{ ...S_AVATAR, ...S_AVATAR_MORE }}>+{avatarOverflow}</span> : null}
                  </div>
                ) : null}
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
