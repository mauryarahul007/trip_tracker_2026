import { useEffect, useRef, useState } from 'react';

type Props = {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  maxFontSize: number;
  minFontSize: number;
};

// Shrinks the heading's font size — rather than truncating it with an
// ellipsis — until the full text fits on one line, or minFontSize is hit.
// Re-measures whenever the text or the surrounding layout's available width
// changes (e.g. the header's title column getting squeezed by its sibling
// buttons on a narrow screen).
export function FitHeading({ text, className, style, maxFontSize, minFontSize }: Props) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [fontSize, setFontSize] = useState(maxFontSize);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = () => {
      el.style.fontSize = `${maxFontSize}px`;
      let size = maxFontSize;
      while (el.scrollWidth > el.clientWidth && size > minFontSize) {
        size -= 1;
        el.style.fontSize = `${size}px`;
      }
      setFontSize(size);
    };

    fit();

    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, maxFontSize, minFontSize]);

  return (
    <h2 ref={ref} className={className} style={{ ...style, fontSize: `${fontSize}px` }}>
      {text}
    </h2>
  );
}
