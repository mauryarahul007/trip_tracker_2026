import { useState, useEffect, useRef } from 'react';

/**
 * High-performance, zero-dependency number animation hook.
 * Uses requestAnimationFrame with a fast ease-out cubic curve (280ms)
 * to smoothly tween currency numbers and balances without layout thrashing.
 */
export function useAnimatedNumber(target: number, durationMs = 280): number {
  const [displayValue, setDisplayValue] = useState(target);
  const startValueRef = useRef(target);
  const targetValueRef = useRef(target);
  const startTimeRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    // If target didn't change or user requested reduced motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(target);
      targetValueRef.current = target;
      startValueRef.current = target;
      return;
    }

    if (target === targetValueRef.current) return;

    startValueRef.current = displayValue;
    targetValueRef.current = target;
    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const startTime = startTimeRef.current || now;
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);

      // Fast cubic ease-out: 1 - (1 - progress)^3
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentVal = startValueRef.current + (targetValueRef.current - startValueRef.current) * easeOut;

      setDisplayValue(currentVal);

      if (progress < 1) {
        rafIdRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(targetValueRef.current);
        rafIdRef.current = null;
      }
    };

    rafIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [target, durationMs]);

  return displayValue;
}
