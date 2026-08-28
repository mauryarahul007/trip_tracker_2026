import React, { useState, useRef } from 'react';
import { triggerHaptic } from '../utils/haptics';
import { IconChevronRight } from './Icons';

interface SlideToUnlockProps {
  onUnlock: () => void;
  label?: string;
}

export function SlideToUnlock({ onUnlock, label = 'Slide to open ledger' }: SlideToUnlockProps) {
  const [sliderX, setSliderX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const lastHapticMilestone = useRef(0);

  const handleWidth = 54; // Matches CSS width of the handle (54px)
  const trackPadding = 10; // Left padding + right padding (5px + 5px)

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    startX.current = e.clientX - sliderX;
    lastHapticMilestone.current = 0;
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !trackRef.current) return;
    const trackWidth = trackRef.current.clientWidth;
    const maxDistance = Math.max(0, trackWidth - handleWidth - trackPadding);
    const currentX = e.clientX - startX.current;
    const clampedX = Math.max(0, Math.min(maxDistance, currentX));
    setSliderX(clampedX);

    // Multi-stage haptic feedback across slider travel (Ola / Rapido style)
    if (maxDistance > 0) {
      const progress = clampedX / maxDistance;
      const currentMilestone = Math.floor(progress * 4); // 0 (0%), 1 (25%), 2 (50%), 3 (75%), 4 (100%)
      if (currentMilestone > lastHapticMilestone.current) {
        lastHapticMilestone.current = currentMilestone;
        try {
          triggerHaptic('light');
        } catch {}
      } else if (currentMilestone < lastHapticMilestone.current) {
        lastHapticMilestone.current = currentMilestone;
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !trackRef.current) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    const trackWidth = trackRef.current.clientWidth;
    const maxDistance = Math.max(0, trackWidth - handleWidth - trackPadding);

    if (sliderX >= maxDistance * 0.85) {
      setSliderX(maxDistance);
      // Play decisive success haptic feedback
      try {
        triggerHaptic('success');
      } catch {}
      onUnlock();
    } else {
      // Spring back with tactile tick
      if (sliderX > 20) {
        try {
          triggerHaptic('warning');
        } catch {}
      }
      setSliderX(0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      try {
        triggerHaptic('success');
      } catch {}
      onUnlock();
    }
  };

  const fillWidth = sliderX + handleWidth + 5;

  return (
    <div
      ref={trackRef}
      className="unlock-slider-track"
    >
      <div
        className="unlock-slider-fill"
        style={{
          width: `${fillWidth}px`,
          transition: isDragging ? 'none' : 'width 0.34s var(--ease-uber-spring)',
        }}
      />
      <div className="unlock-slider-label">
        {label}
      </div>
      <div
        className="unlock-slider-handle"
        role="button"
        tabIndex={0}
        aria-label={label}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={handleKeyDown}
        style={{
          transform: `translateX(${sliderX}px)`,
          transition: isDragging ? 'none' : 'transform 0.34s var(--ease-uber-spring)',
        }}
      >
        <IconChevronRight size={20} />
      </div>
    </div>
  );
}
