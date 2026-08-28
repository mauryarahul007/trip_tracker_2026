import React, { useState, useRef } from 'react';
import { triggerHaptic } from '../utils/haptics';
import { IconChevronRight } from './Icons';

interface SlideToUnlockProps {
  onUnlock: () => void;
}

export function SlideToUnlock({ onUnlock }: SlideToUnlockProps) {
  const [sliderX, setSliderX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);

  const handleWidth = 54; // Matches CSS width of the handle (54px)
  const trackPadding = 10; // Left padding + right padding (5px + 5px)

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    startX.current = e.clientX - sliderX;
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !trackRef.current) return;
    const trackWidth = trackRef.current.clientWidth;
    const maxDistance = Math.max(0, trackWidth - handleWidth - trackPadding);
    const currentX = e.clientX - startX.current;
    const clampedX = Math.max(0, Math.min(maxDistance, currentX));
    setSliderX(clampedX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !trackRef.current) return;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);

    const trackWidth = trackRef.current.clientWidth;
    const maxDistance = Math.max(0, trackWidth - handleWidth - trackPadding);

    if (sliderX >= maxDistance * 0.85) {
      setSliderX(maxDistance);
      // Play haptic feedback
      try {
        triggerHaptic('medium');
      } catch {
        // Safe fallback
      }
      onUnlock();
    } else {
      setSliderX(0); // Spring back
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      try {
        triggerHaptic('medium');
      } catch {
        // Safe fallback
      }
      onUnlock();
    }
  };

  return (
    <div
      ref={trackRef}
      className="unlock-slider-track"
    >
      <div className="unlock-slider-label">
        Slide to open ledger
      </div>
      <div
        className="unlock-slider-handle"
        role="button"
        tabIndex={0}
        aria-label="Open ledger"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={handleKeyDown}
        style={{
          transform: `translateX(${sliderX}px)`,
          transition: isDragging ? 'none' : 'transform 0.28s var(--ease-decel)',
        }}
      >
        <IconChevronRight size={20} />
      </div>
    </div>
  );
}
