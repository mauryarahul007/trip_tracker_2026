import { useState, useEffect } from 'react';
import type { Trip, Member } from '../types';
import type { Transfer } from '../utils/settlement';
import { IconCheckCircle, IconCatTravel, IconTrophy, IconEdit, IconCopy } from './Icons';
import { formatAmount } from '../utils/currency';
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
  currentMember?: Member;
  onOpenSquadBadges?: () => void;
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

  // Editable Route Codes with local persistence
  const [originCode, setOriginCode] = useState(() => {
    return localStorage.getItem(`tt_origin_code_${trip.id}`) || 'DEL';
  });
  const [destCode, setDestCode] = useState(() => {
    return (
      localStorage.getItem(`tt_dest_code_${trip.id}`) ||
      (trip.destination ? trip.destination.slice(0, 3).toUpperCase() : 'IXB')
    );
  });
  const [editingCode, setEditingCode] = useState<'origin' | 'dest' | null>(null);
  const [codeInputVal, setCodeInputVal] = useState('');

  // Fetch weather for trip destination or trip name
  useEffect(() => {
    let active = true;
    const locationQuery = trip.destination || trip.name;
    if (locationQuery) {
      getDestinationWeather(locationQuery).then((data) => {
        if (active && data) setWeather(data);
      });
    }
    return () => {
      active = false;
    };
  }, [trip.destination, trip.name]);

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

  const startEditCode = (type: 'origin' | 'dest', e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    setEditingCode(type);
    setCodeInputVal(type === 'origin' ? originCode : destCode);
  };

  const saveCode = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic('success');
    const cleaned = codeInputVal.trim().toUpperCase().slice(0, 4) || (editingCode === 'origin' ? 'DEL' : 'ARR');
    if (editingCode === 'origin') {
      setOriginCode(cleaned);
      localStorage.setItem(`tt_origin_code_${trip.id}`, cleaned);
    } else {
      setDestCode(cleaned);
      localStorage.setItem(`tt_dest_code_${trip.id}`, cleaned);
    }
    setEditingCode(null);
  };

  const passengerName = currentMember?.name || 'Squad Traveler';
  const seatNumber = '01A';

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
              {formatAmount(totalOutstanding, currencySymbol)}
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
          <div className="bp-top" style={{ paddingBottom: '8px' }}>
            <div>
              <div className="bp-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <IconCatTravel size={11} /> TRIP TRACKER AIRWAYS · FLIGHT 2026
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

          {/* Middle Route Display with 1-Tap Inline Code Editing */}
          <div
            style={{
              padding: '10px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(31, 27, 20, 0.03)',
            }}
          >
            {/* Origin Airport */}
            <div style={{ textAlign: 'left', position: 'relative' }}>
              {editingCode === 'origin' ? (
                <form onSubmit={saveCode} onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '4px' }}>
                  <input
                    type="text"
                    maxLength={4}
                    value={codeInputVal}
                    onChange={(e) => setCodeInputVal(e.target.value)}
                    autoFocus
                    style={{
                      width: '60px',
                      fontSize: '16px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      textAlign: 'center',
                      padding: '2px',
                      borderRadius: '4px',
                      border: '2px solid var(--primary-accent)',
                    }}
                  />
                  <button type="submit" style={{ padding: '2px 6px', fontSize: '11px', background: 'var(--primary-accent)', color: '#fff', border: 'none', borderRadius: '4px' }}>✓</button>
                </form>
              ) : (
                <div onClick={(e) => startEditCode('origin', e)} style={{ cursor: 'pointer' }} title="Click to edit Origin Code (e.g. DEL, BOM, NYC)">
                  <div style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'var(--font-family-title)', color: '#1F1B14', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {originCode} <IconEdit size={11} style={{ opacity: 0.4 }} />
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'rgba(31, 27, 20, 0.6)', fontFamily: 'var(--font-family-mono)' }}>
                    {trip.startDate || 'DEPART'}
                  </div>
                </div>
              )}
            </div>

            {/* Flight Dash Route Vector */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flex: 1, padding: '0 12px' }}>
              <span style={{ fontSize: '14px' }}>✈</span>
              <div style={{ width: '100%', height: '1.5px', borderTop: '1.5px dashed rgba(31, 27, 20, 0.3)' }} />
              <span style={{ fontSize: '9px', color: 'rgba(31, 27, 20, 0.55)', fontFamily: 'var(--font-family-mono)' }}>NON-STOP VOYAGE</span>
            </div>

            {/* Destination Airport */}
            <div style={{ textAlign: 'right', position: 'relative' }}>
              {editingCode === 'dest' ? (
                <form onSubmit={saveCode} onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '4px' }}>
                  <input
                    type="text"
                    maxLength={4}
                    value={codeInputVal}
                    onChange={(e) => setCodeInputVal(e.target.value)}
                    autoFocus
                    style={{
                      width: '60px',
                      fontSize: '16px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      textAlign: 'center',
                      padding: '2px',
                      borderRadius: '4px',
                      border: '2px solid var(--primary-accent)',
                    }}
                  />
                  <button type="submit" style={{ padding: '2px 6px', fontSize: '11px', background: 'var(--primary-accent)', color: '#fff', border: 'none', borderRadius: '4px' }}>✓</button>
                </form>
              ) : (
                <div onClick={(e) => startEditCode('dest', e)} style={{ cursor: 'pointer' }} title="Click to edit Destination Code (e.g. IXB, GOI, DPS)">
                  <div style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'var(--font-family-title)', color: '#1F1B14', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                    {destCode} <IconEdit size={11} style={{ opacity: 0.4 }} />
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'rgba(31, 27, 20, 0.6)', fontFamily: 'var(--font-family-mono)' }}>
                    {trip.endDate || 'RETURN'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Perforated Separator */}
          <div className="bp-perf" />

          {/* Passenger & Live Telemetry Weather Strip */}
          <div style={{ padding: '8px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '9px', fontFamily: 'var(--font-family-mono)', color: 'rgba(31, 27, 20, 0.55)', textTransform: 'uppercase' }}>
                PASSENGER · SEAT
              </div>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1F1B14' }}>
                {passengerName} · {seatNumber}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '9px', fontFamily: 'var(--font-family-mono)', color: 'rgba(31, 27, 20, 0.55)', textTransform: 'uppercase' }}>
                DESTINATION WEATHER
              </div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary-accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
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
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              title="Click to copy Join Code"
            >
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
