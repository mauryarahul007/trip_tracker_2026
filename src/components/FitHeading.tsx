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
        let siblingsWidth = 0;
        for (const child of Array.from(parent.children)) {
          if (child !== el) {
            siblingsWidth += (child as HTMLElement).offsetWidth || 0;
          }
        }
        const parentStyles = window.getComputedStyle(parent);
        const gap = parseFloat(parentStyles.gap) || 0;
        const paddingLeft = parseFloat(parentStyles.paddingLeft) || 0;
        const paddingRight = parseFloat(parentStyles.paddingRight) || 0;

        // Container width: prefer parent.clientWidth (e.g. .app-title-row pill width)
        // or grandparent.clientWidth if parent has not yet finished layout.
        const grandparent = parent.parentElement;
        let containerWidth = parent.clientWidth > 0
          ? parent.clientWidth
          : (grandparent && grandparent.clientWidth > 0 ? grandparent.clientWidth : 0);

        // Only clamp by parentStyles.maxWidth if it is an explicit pixel value (e.g. '240px')
        // and NOT a percentage string (e.g. '100%') which parseFloat parses as 100.
        const rawMaxWidth = parentStyles.maxWidth;
        if (rawMaxWidth && rawMaxWidth.endsWith('px')) {
          const pxVal = parseFloat(rawMaxWidth);
          if (!isNaN(pxVal) && pxVal > 0 && pxVal < containerWidth) {
            containerWidth = pxVal;
          }
        }

        const availableWidth = Math.max(
          0,
          containerWidth - siblingsWidth - gap - paddingLeft - paddingRight
        );
        if (availableWidth <= 0) return;

        // Measure text width using an offscreen hidden span
        const tempSpan = document.createElement('span');
        tempSpan.style.visibility = 'hidden';
        tempSpan.style.position = 'absolute';
        tempSpan.style.whiteSpace = 'nowrap';
        const computed = window.getComputedStyle(el);
        tempSpan.style.fontFamily = computed.fontFamily;
        tempSpan.style.fontWeight = computed.fontWeight;
        tempSpan.style.letterSpacing = computed.letterSpacing;
        tempSpan.style.textTransform = computed.textTransform;
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
      if (parent.parentElement) {
        ro.observe(parent.parentElement);
      }
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
