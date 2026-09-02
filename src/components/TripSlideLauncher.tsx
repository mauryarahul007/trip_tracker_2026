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
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const active = useRef(false);
  const startX = useRef(0);
  const halfWidth = useRef(0);
  const hapticFired = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    const track = trackRef.current;
    if (!track) return;
    active.current = true;
    startX.current = e.clientX;
    halfWidth.current = track.offsetWidth / 2 - 40;
    hapticFired.current = false;
    setDragging(true);
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
    setDragX(clamped);
  };

  const endDrag = () => {
    if (!active.current) return;
    active.current = false;
    setDragging(false);
    const threshold = halfWidth.current * THRESHOLD_RATIO;
    if (dragX > threshold) {
      triggerHaptic('success');
      onCreateTrip();
    } else if (dragX < -threshold) {
      triggerHaptic('success');
      onJoinTrip();
    }
    setDragX(0);
  };

  const fillRatio = halfWidth.current > 0 ? Math.min(1, Math.abs(dragX) / halfWidth.current) : 0;
  const planePitch = Math.max(-14, Math.min(14, dragX * 0.12));

  return (
    <div className="trip-launcher">
      <div className="launcher-track" ref={trackRef}>
        <div
          className="launcher-fill left"
          style={{ opacity: dragX < 0 ? fillRatio : 0, transform: `scaleX(${dragX < 0 ? fillRatio : 0})` }}
        />
        <div
          className="launcher-fill right"
          style={{ opacity: dragX > 0 ? fillRatio : 0, transform: `scaleX(${dragX > 0 ? fillRatio : 0})` }}
        />

        {/* Dynamic Jet Contrail / Vapor Stream */}
        {dragX !== 0 && (
          <div
            className={`launcher-vapor-trail ${dragX > 0 ? 'to-right' : 'to-left'}`}
            style={{
              width: `${Math.abs(dragX)}px`,
              transform: dragX > 0 ? 'translateX(0)' : `translateX(${dragX}px)`,
              opacity: Math.min(1, Math.abs(dragX) / (halfWidth.current * 0.45)),
            }}
          />
        )}

        <button type="button" className={`launcher-zone left${dragX < 0 ? ' active' : ''}`} onClick={onJoinTrip}>
          <span>🔑</span> Join
        </button>
        <button type="button" className={`launcher-zone right${dragX > 0 ? ' active' : ''}`} onClick={onCreateTrip}>
          Create <span>+</span>
        </button>
        <div
          className={`launcher-thumb${dragX < 0 ? ' left' : dragX > 0 ? ' right' : ''}`}
          aria-hidden="true"
          style={{
            transform: `translateX(${dragX}px) rotate(${planePitch}deg)`,
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
