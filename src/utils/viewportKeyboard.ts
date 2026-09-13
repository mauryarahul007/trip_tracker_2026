// Pure layout math for --app-vh / --keyboard-height.
//
// iOS Safari overlays the software keyboard (layout viewport stays tall,
// visualViewport.height shrinks, often with a pan via offsetTop). Android
// Chrome with interactive-widget=resizes-content shrinks the layout instead,
// so innerHeight already matches the visual height and no overlay padding
// is needed. Safari chrome show/hide is a small delta and must not be
// treated as a keyboard.

export const KEYBOARD_OVERLAY_THRESHOLD_PX = 80;

export type ViewportSnapshot = {
  innerHeight: number;
  visualHeight: number;
  offsetTop: number;
};

export type ViewportCssVars = {
  appVh: number;
  keyboardHeight: number;
  lastFullHeight: number;
};

function positive(n: number): number {
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function resolveViewportCssVars(
  snapshot: ViewportSnapshot,
  lastFullHeight: number,
): ViewportCssVars {
  const innerHeight = positive(snapshot.innerHeight);
  const visualHeight = positive(snapshot.visualHeight) || innerHeight;
  const offsetTop = positive(snapshot.offsetTop);
  const layoutHeight = visualHeight + offsetTop || innerHeight;
  const overlayAmount = innerHeight - visualHeight;
  const isOverlay = overlayAmount > KEYBOARD_OVERLAY_THRESHOLD_PX;

  if (isOverlay) {
    const frozen = lastFullHeight > 0
      ? lastFullHeight
      : Math.max(innerHeight, layoutHeight);
    return {
      appVh: frozen,
      keyboardHeight: Math.max(0, frozen - visualHeight),
      lastFullHeight: frozen,
    };
  }

  const nextFull = Math.max(innerHeight, layoutHeight, visualHeight);
  return {
    appVh: nextFull,
    keyboardHeight: 0,
    lastFullHeight: nextFull,
  };
}
