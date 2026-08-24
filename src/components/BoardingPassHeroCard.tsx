import { useState, useEffect } from 'react';
import type { Trip, Member } from '../types';
import type { Transfer } from '../utils/settlement';
import { IconCheckCircle } from './Icons';
import { formatMaskedAmount, usePrivacyStore } from '../store/privacyStore';
import { triggerHaptic } from '../utils/haptics';
import { getDestinationWeather } from '../services/weatherService';
import type { WeatherData } from '../services/weatherService';

interface BoardingPassHeroCardProps {
  trip: Trip;
  currencySymbol: string;
  totalOutstanding: number;
  isFullySettled: boolean;
  transfers: Transfer[];
  balancesCount: number;
  topTransfer: Transfer | null;
  transferIsDominant: boolean;
  categoryIsDominant: boolean;
  topCategoryName?: string;
  topCategoryPercentage?: number;
  currentMember?: Member;
  onOpenSquadView?: () => void;
  onOpenSquadBadges?: () => void;
}

export function BoardingPassHeroCard({
  trip,
  currencySymbol,
  totalOutstanding,
  isFullySettled,
  transfers,
  balancesCount,
  topTransfer,
  transferIsDominant,
  categoryIsDominant,
  topCategoryName,
  currentMember,
  onOpenSquadBadges,
}: BoardingPassHeroCardProps) {
  const isBlindMode = usePrivacyStore((s) => s.isBlindMode);
  const [isFlipped, setIsFlipped] = useState(false);
  const [copied, setCopied] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  // Fetch weather for trip destination
  useEffect(() => {
    let active = true;
    if (trip.destination) {
      getDestinationWeather(trip.destination).then((data) => {
        if (active && data) setWeather(data);
      });
    }
    return () => {
      active = false;
    };
  }, [trip.destination]);

  const categoryClause = categoryIsDominant && topCategoryName ? `, driven by ${topCategoryName} spend` : '';

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
  const seatNumber = '01A';

  // Origin -> Destination abbreviations
  const originCode = 'DEP';
  const destCode = trip.destination ? trip.destination.slice(0, 3).toUpperCase() : 'ARR';

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
              className="bp-amount privacy-blur"
              style={{ color: isFullySettled ? 'var(--color-success)' : 'var(--color-danger)' }}
            >
              {formatMaskedAmount(totalOutstanding.toFixed(2), currencySymbol, isBlindMode)}
            </div>
            <div className="bp-sub">
              {isFullySettled
                ? 'Every balance is settled — nothing left to pay.'
                : topTransfer && transferIsDominant
                ? `${transfers.length > 1 ? 'Mostly ' : ''}${topTransfer.fromLabel} owes ${topTransfer.toLabel}${categoryClause}.`
                : categoryIsDominant
                ? `${transfers.length} transfers to settle, driven mostly by ${topCategoryName} spend.`
                : `${transfers.length} transfer${transfers.length === 1 ? '' : 's'} will clear every balance.`}
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
              ↻ Flight Pass
            </span>
          </div>
        </div>

        {/* ===================== BACK SIDE: Flight Boarding Pass ===================== */}
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
          {/* Top Airline Bar */}
          <div className="bp-top" style={{ paddingBottom: '10px' }}>
            <div>
              <div className="bp-eyebrow">✈ TRIP TRACKER AIRWAYS · FLIGHT 2026</div>
              <div className="bp-title" style={{ fontSize: '15px' }}>
                {trip.name}
              </div>
            </div>
            <div
              onClick={(e) => {
                if (onOpenSquadBadges) {
                  e.stopPropagation();
                  triggerHaptic('medium');
                  onOpenSquadBadges();
                }
              }}
              style={{
                background: 'rgba(15, 111, 99, 0.1)',
                color: 'var(--primary-accent)',
                fontFamily: 'var(--font-family-mono)',
                fontSize: '9.5px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                cursor: onOpenSquadBadges ? 'pointer' : 'default',
              }}
            >
              🏆 SQUAD BADGES
            </div>
          </div>

          {/* Middle Route Display */}
          <div
            style={{
              padding: '12px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(31, 27, 20, 0.02)',
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'var(--font-family-title)', color: '#1F1B14' }}>
                {originCode}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(31, 27, 20, 0.6)', fontFamily: 'var(--font-family-mono)' }}>
                {trip.startDate || 'START'}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flex: 1, padding: '0 16px' }}>
              <span style={{ fontSize: '14px' }}>✈</span>
              <div style={{ width: '100%', height: '1.5px', borderTop: '1.5px dashed rgba(31, 27, 20, 0.3)' }} />
              <span style={{ fontSize: '9.5px', color: 'rgba(31, 27, 20, 0.55)', fontFamily: 'var(--font-family-mono)' }}>NON-STOP VOYAGE</span>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'var(--font-family-title)', color: '#1F1B14' }}>
                {destCode}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(31, 27, 20, 0.6)', fontFamily: 'var(--font-family-mono)' }}>
                {trip.endDate || 'FINISH'}
              </div>
            </div>
          </div>

          {/* Perforated Separator */}
          <div className="bp-perf" />

          {/* Passenger & Live Telemetry Strip */}
          <div style={{ padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '9.5px', fontFamily: 'var(--font-family-mono)', color: 'rgba(31, 27, 20, 0.55)', textTransform: 'uppercase' }}>
                PASSENGER · SEAT
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1F1B14' }}>
                {passengerName} · {seatNumber}
              </div>
            </div>

            {weather ? (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '9.5px', fontFamily: 'var(--font-family-mono)', color: 'rgba(31, 27, 20, 0.55)', textTransform: 'uppercase' }}>
                  DESTINATION WEATHER
                </div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--primary-accent)' }}>
                  {weather.weatherEmoji} {weather.tempC}°C · {weather.condition}
                </div>
              </div>
            ) : trip.joinCode ? (
              <div
                onClick={handleCopyJoinCode}
                style={{
                  textAlign: 'right',
                  cursor: 'pointer',
                  background: 'rgba(15, 111, 99, 0.08)',
                  padding: '4px 10px',
                  borderRadius: '8px',
                }}
              >
                <div style={{ fontSize: '9px', fontFamily: 'var(--font-family-mono)', color: 'var(--primary-accent)', fontWeight: 700 }}>
                  JOIN CODE {copied ? '✓ COPIED' : '📋 COPY'}
                </div>
                <div style={{ fontSize: '12.5px', fontWeight: 800, fontFamily: 'var(--font-family-mono)', color: '#1F1B14' }}>
                  {trip.joinCode}
                </div>
              </div>
            ) : null}
          </div>

          {/* Bottom Barcode & Flip Toggle */}
          <div
            className="bp-foot"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#F7F0E1',
              borderTop: '1px solid #E6DAC4',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '15px', letterSpacing: '2px', color: 'rgba(31, 27, 20, 0.7)' }}>
                ▌│█║▌║▌║
              </span>
              <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '10px', color: 'rgba(31, 27, 20, 0.6)' }}>
                {trip.joinCode || '2026-PASS'}
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
