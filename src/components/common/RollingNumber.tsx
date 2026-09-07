import React, { useEffect, useRef, useState } from 'react';

interface RollingNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Rolling Number Counter ("Odometer")
 * Animates numbers smoothly using tabular digits and vertical sliding columns
 */
export const RollingNumber: React.FC<RollingNumberProps> = ({
  value,
  prefix = '',
  suffix = '',
  decimals = 2,
  className = '',
  style = {},
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    const startVal = prevValueRef.current;
    const endVal = value;
    if (startVal === endVal) return;

    const startTime = performance.now();
    const duration = 450; // ms

    let animFrame: number;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * ease;
      setDisplayValue(current);

      if (progress < 1) {
        animFrame = requestAnimationFrame(step);
      } else {
        setDisplayValue(endVal);
        prevValueRef.current = endVal;
      }
    };

    animFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animFrame);
  }, [value]);

  const formatted = displayValue.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span
      className={`rolling-number ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.01em',
        ...style,
      }}
    >
      {prefix && <span className="rolling-prefix">{prefix}</span>}
      <span className="rolling-digits">{formatted}</span>
      {suffix && <span className="rolling-suffix">{suffix}</span>}
    </span>
  );
};
