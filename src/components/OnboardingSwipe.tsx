import React, { useState, useRef, useEffect, useCallback } from 'react';

const STORAGE_KEY_SUFFIX = '-tt-onboarded-v1';

const STEPS = [
  {
    id: 'welcome',
    icon: '🧳',
    title: 'Welcome to Trip Tracker',
    body: 'Plan trips, track shared expenses, and settle up — all offline-first.',
  },
  {
    id: 'trip',
    icon: '🗺️',
    title: 'Create Your First Trip',
    body: 'Add a destination, dates, and members. Everyone can log expenses in real time.',
  },
  {
    id: 'expense',
    icon: '🧾',
    title: 'Log & Split Expenses',
    body: 'Snap receipts, auto-suggest categories, and split bills equally or by exact amounts.',
  },
];

type Props = {
  userId: string | null;
  onDismiss: () => void;
};

export function OnboardingSwipe({ userId, onDismiss }: Props) {
  const [index, setIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const startX = useRef(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const completeRef = useRef(false);

  const markDone = useCallback(() => {
    if (completeRef.current) return;
    completeRef.current = true;
    const key = userId ? `tt-${userId}${STORAGE_KEY_SUFFIX}` : null;
    if (key) localStorage.setItem(key, '1');
    onDismiss();
  }, [userId, onDismiss]);

  const goNext = useCallback(() => {
    if (index < STEPS.length - 1) {
      setIndex((i) => i + 1);
      setDragX(0);
    } else {
      markDone();
    }
  }, [index, markDone]);

  const goPrev = useCallback(() => {
    if (index > 0) {
      setIndex((i) => i - 1);
      setDragX(0);
    }
  }, [index]);

  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    setDragging(true);
    setDragX(0);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - startX.current;
    setDragX(dx);
  };

  const onPointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    const threshold = 60;
    if (dragX < -threshold) goNext();
    else if (dragX > threshold) goPrev();
    else setDragX(0);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'Escape') markDone();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, markDone]);

  const trackStyle: React.CSSProperties = {
    display: 'flex',
    transition: dragging ? 'none' : 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: `translateX(calc(-${index * 100}% + ${dragX}px))`,
    willChange: 'transform',
  };

  return (
    <div
      className="onboarding-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(10px) saturate(1.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) markDone();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--bg-surface, #0f172a)',
          borderRadius: 24,
          border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
          boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            touchAction: 'pan-y',
            cursor: dragging ? 'grabbing' : 'grab',
          }}
          ref={trackRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={dragging ? onPointerUp : undefined}
        >
          <div style={trackStyle}>
            {STEPS.map((step) => (
              <div
                key={step.id}
                style={{
                  minWidth: '100%',
                  padding: '32px 28px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: 14,
                  userSelect: 'none',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    fontSize: 48,
                    lineHeight: 1,
                    filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.35))',
                  }}
                >
                  {step.icon}
                </span>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 22,
                    fontWeight: 700,
                    color: 'var(--text-primary, #f8fafc)',
                    letterSpacing: '-0.2px',
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 15,
                    lineHeight: 1.55,
                    color: 'var(--text-secondary, rgba(248,250,252,0.72))',
                  }}
                >
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 24px 20px',
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={markDone}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted, rgba(248,250,252,0.55))',
              fontSize: 13,
              cursor: 'pointer',
              padding: '8px 4px',
            }}
          >
            Skip
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            {STEPS.map((_, i) => (
              <span
                key={i}
                aria-hidden="true"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: i === index ? 'var(--primary-accent, #2f6fef)' : 'var(--border-color, rgba(255,255,255,0.18))',
                  transition: 'background 0.25s ease, transform 0.25s ease',
                  transform: i === index ? 'scale(1.15)' : 'scale(1)',
                }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={goNext}
            className="gradient-btn"
            style={{
              padding: '10px 18px',
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 12,
              border: 'none',
              color: '#fff',
              background: 'linear-gradient(135deg, #2f6fef, #1e40af)',
              boxShadow: '0 8px 18px -4px rgba(47,111,239,0.45)',
              cursor: 'pointer',
            }}
          >
            {index === STEPS.length - 1 ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
