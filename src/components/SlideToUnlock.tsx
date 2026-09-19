import React, { useState, useRef } from 'react';
import { triggerHaptic } from '../utils/haptics';
import { IconChevronRight } from './Icons';

interface SlideToUnlockProps {
  onUnlock: () => void;
  label?: string;
}

export function SlideToUnlock({ onUnlock, label = 'Slide to open ledger' }: SlideToUnlockProps) {
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const sliderXRef = useRef(0);
  const lastHapticMilestone = useRef(0);

  const handleWidth = 54; // Matches CSS width of the handle (54px)
  const trackPadding = 10; // Left padding + right padding (5px + 5px)

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    startX.current = e.clientX - sliderXRef.current;
    lastHapticMilestone.current = 0;
    setIsDragging(true);
  };

  const writeSlider = (x: number, trackWidth: number) => {
    sliderXRef.current = x;
    const fillWidth = x + handleWidth + 5;
    if (handleRef.current) handleRef.current.style.transform = `translateX(${x}px)`;
    if (fillRef.current && trackWidth > 0) {
      fillRef.current.style.transform = `scaleX(${fillWidth / trackWidth})`;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !trackRef.current) return;
    const trackWidth = trackRef.current.clientWidth;
    const maxDistance = Math.max(0, trackWidth - handleWidth - trackPadding);
    const currentX = e.clientX - startX.current;
    const clampedX = Math.max(0, Math.min(maxDistance, currentX));
    writeSlider(clampedX, trackWidth);

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

    const sliderX = sliderXRef.current;
    if (sliderX >= maxDistance * 0.85) {
      writeSlider(maxDistance, trackWidth);
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
      writeSlider(0, trackWidth);
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

  return (
    <div
      ref={trackRef}
      className="unlock-slider-track"
    >
      <div
        ref={fillRef}
        className="unlock-slider-fill"
        style={{
          transform: 'scaleX(0.12)',
          transformOrigin: 'left center',
          transition: isDragging ? 'none' : 'transform 0.34s var(--ease-uber-spring)',
        }}
      />
      <div className="unlock-slider-label">
        {label}
      </div>
      <div
        ref={handleRef}
        className="unlock-slider-handle"
        role="button"
        tabIndex={0}
        aria-label={label}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={handleKeyDown}
        style={{
          transform: 'translateX(0px)',
          transition: isDragging ? 'none' : 'transform 0.34s var(--ease-uber-spring)',
        }}
      >
        <IconChevronRight size={20} />
      </div>
    </div>
  );
}
