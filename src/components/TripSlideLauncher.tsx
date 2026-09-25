import React, { useRef, useState, useCallback } from 'react';
import { triggerHaptic } from '../utils/haptics';
import { IconPlus, IconQrCode } from './Icons';

const THRESHOLD_RATIO = 0.35;

type Props = {
  onCreateTrip: () => void;
  onJoinTrip: () => void;
  className?: string;
};

// Frosted-glass luxury slide-to-launch control for Join / Create Journey.
// Supports both touch swipe and desktop mouse drag with pointer capture,
// as well as direct one-tap activation on the respective action zone.
export function TripSlideLauncher({ onCreateTrip, onJoinTrip, className = '' }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const fillLeftRef = useRef<HTMLDivElement>(null);
  const fillRightRef = useRef<HTMLDivElement>(null);
  const zoneLeftRef = useRef<HTMLButtonElement>(null);
  const zoneRightRef = useRef<HTMLButtonElement>(null);
  const [dragging, setDragging] = useState(false);
  const active = useRef(false);
  const startX = useRef(0);
  const halfWidth = useRef(0);
  const dragXRef = useRef(0);
  const hapticFired = useRef(false);

  const writeLauncher = useCallback((x: number) => {
    dragXRef.current = x;
    const fillRatio = halfWidth.current > 0 ? Math.min(1, Math.abs(x) / halfWidth.current) : 0;
    const planePitch = Math.max(-14, Math.min(14, x * 0.12));
    if (thumbRef.current) {
      thumbRef.current.style.transform = `translateX(${x}px) rotate(${planePitch}deg)`;
      thumbRef.current.className = `launcher-thumb${x < -8 ? ' left' : x > 8 ? ' right' : ''}`;
    }
    if (fillLeftRef.current) {
      fillLeftRef.current.style.opacity = x < 0 ? String(fillRatio * 1.2) : '0';
      fillLeftRef.current.style.transform = `scaleX(${x < 0 ? fillRatio : 0})`;
    }
    if (fillRightRef.current) {
      fillRightRef.current.style.opacity = x > 0 ? String(fillRatio * 1.2) : '0';
      fillRightRef.current.style.transform = `scaleX(${x > 0 ? fillRatio : 0})`;
    }
    zoneLeftRef.current?.classList.toggle('active', x < -15);
    zoneRightRef.current?.classList.toggle('active', x > 15);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    const track = trackRef.current;
    if (!track) return;
    active.current = true;
    startX.current = e.clientX;
    halfWidth.current = Math.max(40, track.offsetWidth / 2 - 28);
    hapticFired.current = false;
    setDragging(true);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // safe fallback
    }
    writeLauncher(0);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!active.current) return;
    const delta = e.clientX - startX.current;
    const threshold = halfWidth.current * THRESHOLD_RATIO;
    let clamped = Math.max(-halfWidth.current, Math.min(halfWidth.current, delta));

    // Magnetic notch feel: subtle tactile ramp as thumb enters threshold commitment zone
    if (Math.abs(clamped) >= threshold - 8 && Math.abs(clamped) <= threshold + 12) {
      const sign = clamped > 0 ? 1 : -1;
      const distFromThreshold = Math.abs(clamped) - threshold;
      clamped = sign * (threshold + distFromThreshold * 0.5);
    }

    if (Math.abs(clamped) > threshold && !hapticFired.current) {
      triggerHaptic('medium');
      hapticFired.current = true;
    } else if (Math.abs(clamped) <= threshold && hapticFired.current) {
      hapticFired.current = false;
    }
    writeLauncher(clamped);
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!active.current) return;
    active.current = false;
    setDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // safe fallback
    }
    const threshold = halfWidth.current * THRESHOLD_RATIO;
    const x = dragXRef.current;
    if (x > threshold) {
      triggerHaptic('success');
      onCreateTrip();
    } else if (x < -threshold) {
      triggerHaptic('success');
      onJoinTrip();
    }
    writeLauncher(0);
  };

  return (
    <div className={`trip-launcher ${className}`} role="toolbar" aria-label="Trip launcher">
      <div className="launcher-track" ref={trackRef}>
        <div
          ref={fillLeftRef}
          className="launcher-fill left"
          style={{ opacity: 0, transform: 'scaleX(0)' }}
          aria-hidden="true"
        />
        <div
          ref={fillRightRef}
          className="launcher-fill right"
          style={{ opacity: 0, transform: 'scaleX(0)' }}
          aria-hidden="true"
        />

        <button
          ref={zoneLeftRef}
          type="button"
          className="launcher-zone left"
          onClick={() => {
            triggerHaptic('light');
            onJoinTrip();
          }}
          aria-label="Join an existing trip"
        >
          <span className="launcher-zone-cue" aria-hidden="true">‹</span>
          <IconQrCode size={15} />
          <span>Join</span>
        </button>

        <button
          ref={zoneRightRef}
          type="button"
          className="launcher-zone right"
          onClick={() => {
            triggerHaptic('medium');
            onCreateTrip();
          }}
          aria-label="Create a new trip"
        >
          <span>Create</span>
          <IconPlus size={15} />
          <span className="launcher-zone-cue" aria-hidden="true">›</span>
        </button>

        <div
          ref={thumbRef}
          className="launcher-thumb"
          aria-hidden="true"
          style={{
            transform: 'translateX(0px) rotate(0deg)',
            transition: dragging ? 'none' : 'transform 0.32s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s ease',
            touchAction: 'none',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="launcher-thumb-icon"
          >
            <polygon points="3 11 22 2 13 21 11 13 3 11" fill="currentColor" fillOpacity="0.22" />
          </svg>
        </div>
      </div>
    </div>
  );
}

