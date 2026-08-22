import React, { useEffect, useRef, useState } from 'react';

type Props = {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  maxFontSize: number;
  minFontSize: number;
};

// Shrinks the heading's font size — rather than truncating it with an
// ellipsis — until the full text fits on one line, or minFontSize is hit.
// Observes the container parent to avoid ResizeObserver loops and layout thrashing.
export function FitHeading({ text, className, style, maxFontSize, minFontSize }: Props) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [fontSize, setFontSize] = useState(maxFontSize);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const parent = el.parentElement;

    let rafId: number;

    const fit = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!el || !parent) return;
        const availableWidth = parent.clientWidth;
        if (availableWidth <= 0) return;

        // Measure text width using an offscreen hidden span
        const tempSpan = document.createElement('span');
        tempSpan.style.visibility = 'hidden';
        tempSpan.style.position = 'absolute';
        tempSpan.style.whiteSpace = 'nowrap';
        tempSpan.style.font = window.getComputedStyle(el).font;
        tempSpan.textContent = text;
        document.body.appendChild(tempSpan);

        let size = maxFontSize;
        tempSpan.style.fontSize = `${size}px`;
        while (tempSpan.offsetWidth > availableWidth && size > minFontSize) {
          size -= 1;
          tempSpan.style.fontSize = `${size}px`;
        }
        document.body.removeChild(tempSpan);

        setFontSize((prev) => (prev !== size ? size : prev));
      });
    };

    fit();

    const ro = new ResizeObserver(() => {
      fit();
    });

    if (parent) {
      ro.observe(parent);
    }

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [text, maxFontSize, minFontSize]);

  return (
    <h2
      ref={ref}
      className={className}
      style={{
        ...style,
        fontSize: `${fontSize}px`,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </h2>
  );
}
