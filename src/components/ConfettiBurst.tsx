import { useMemo } from 'react';

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const COLORS = ['#FF7A00', '#0F6F63', '#2F6FED', '#EAB308', '#EC4899'];
const PIECE_COUNT = 14;

type Props = {
  active: boolean;
};

// Hand-rolled CSS confetti burst -- matches the house style set by
// TripWrappedModal's hand-rolled canvas/CSS art rather than pulling in an
// animation library. Must be rendered inside a `position: relative`
// ancestor small enough to clip the burst (the .trip-sheet overflow:hidden
// rule elsewhere in the app means this can never be position: fixed).
export function ConfettiBurst({ active }: Props) {
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECE_COUNT }, (_, i) => ({
        id: i,
        left: 4 + Math.random() * 92,
        color: COLORS[i % COLORS.length],
        delay: Math.random() * 0.15,
        duration: 0.7 + Math.random() * 0.4,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- new randomized burst each time it's (re)triggered
    [active]
  );

  if (!active || prefersReducedMotion) return null;

  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            position: 'absolute',
            top: '-10%',
            left: `${p.left}%`,
            width: '6px',
            height: '10px',
            borderRadius: '1px',
            background: p.color,
            animation: `confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}
