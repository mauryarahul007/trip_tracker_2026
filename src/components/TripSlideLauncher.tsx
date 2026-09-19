import { useRef, useState } from 'react';
import { triggerHaptic } from '../utils/haptics';

const THRESHOLD_RATIO = 0.35;

type Props = {
  onCreateTrip: () => void;
  onJoinTrip: () => void;
};

// Phone-only replacement for the "Join a Trip" / "+ New Trip" header
// buttons, sitting below the stack. The left/right thirds of the track are
// real buttons -- tapping either does exactly what the header buttons did.
// Dragging the thumb is a delight layer on top for touch, not the only way
// to reach either action.
export function TripSlideLauncher({ onCreateTrip, onJoinTrip }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const vaporRef = useRef<HTMLDivElement>(null);
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

  const writeLauncher = (x: number) => {
    dragXRef.current = x;
    const fillRatio = halfWidth.current > 0 ? Math.min(1, Math.abs(x) / halfWidth.current) : 0;
    const planePitch = Math.max(-14, Math.min(14, x * 0.12));
    if (thumbRef.current) {
      thumbRef.current.style.transform = `translateX(${x}px) rotate(${planePitch}deg)`;
      thumbRef.current.className = `launcher-thumb${x < 0 ? ' left' : x > 0 ? ' right' : ''}`;
    }
    if (fillLeftRef.current) {
      fillLeftRef.current.style.opacity = x < 0 ? String(fillRatio) : '0';
      fillLeftRef.current.style.transform = `scaleX(${x < 0 ? fillRatio : 0})`;
    }
    if (fillRightRef.current) {
      fillRightRef.current.style.opacity = x > 0 ? String(fillRatio) : '0';
      fillRightRef.current.style.transform = `scaleX(${x > 0 ? fillRatio : 0})`;
    }
    if (vaporRef.current) {
      vaporRef.current.className = `launcher-vapor-trail ${x >= 0 ? 'to-right' : 'to-left'}`;
      vaporRef.current.style.opacity = String(Math.min(1, Math.abs(x) / Math.max(1, halfWidth.current * 0.45)));
      vaporRef.current.style.transformOrigin = x >= 0 ? 'left center' : 'right center';
      vaporRef.current.style.transform = `scaleX(${Math.abs(x)})`;
    }
    zoneLeftRef.current?.classList.toggle('active', x < 0);
    zoneRightRef.current?.classList.toggle('active', x > 0);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    const track = trackRef.current;
    if (!track) return;
    active.current = true;
    startX.current = e.clientX;
    halfWidth.current = track.offsetWidth / 2 - 40;
    hapticFired.current = false;
    setDragging(true);
    writeLauncher(0);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!active.current) return;
    const delta = e.clientX - startX.current;
    const threshold = halfWidth.current * THRESHOLD_RATIO;
    let clamped = Math.max(-halfWidth.current, Math.min(halfWidth.current, delta));

    // Magnetic notch feel: gentle pull as thumb enters threshold commitment zone
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

  const endDrag = () => {
    if (!active.current) return;
    active.current = false;
    setDragging(false);
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
    <div className="trip-launcher">
      <div className="launcher-track" ref={trackRef}>
        <div
          ref={fillLeftRef}
          className="launcher-fill left"
          style={{ opacity: 0, transform: 'scaleX(0)' }}
        />
        <div
          ref={fillRightRef}
          className="launcher-fill right"
          style={{ opacity: 0, transform: 'scaleX(0)' }}
        />

        <div
          ref={vaporRef}
          className="launcher-vapor-trail to-right"
          style={{
            width: '1px',
            left: '50%',
            opacity: 0,
            transformOrigin: 'left center',
            transform: 'scaleX(0)',
          }}
        />

        <button ref={zoneLeftRef} type="button" className="launcher-zone left" onClick={onJoinTrip}>
          <span>🔑</span> Join
        </button>
        <button ref={zoneRightRef} type="button" className="launcher-zone right" onClick={onCreateTrip}>
          Create <span>+</span>
        </button>
        <div
          ref={thumbRef}
          className="launcher-thumb"
          aria-hidden="true"
          style={{
            transform: 'translateX(0px) rotate(0deg)',
            transition: dragging ? 'none' : 'transform 0.32s cubic-bezier(0.16,1,0.3,1), background 0.2s ease',
            touchAction: 'pan-y',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <span>✈️</span>
        </div>
      </div>
      <div className="launcher-caption">← Slide left to Join · Slide right to Create →</div>
    </div>
  );
}
