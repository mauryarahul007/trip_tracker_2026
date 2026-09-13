import { describe, it, expect } from 'vitest';
import {
  KEYBOARD_OVERLAY_THRESHOLD_PX,
  resolveViewportCssVars,
} from './viewportKeyboard';

describe('resolveViewportCssVars', () => {
  it('follows innerHeight when the layout resizes with the visual viewport (Android resizes-content)', () => {
    const closed = resolveViewportCssVars(
      { innerHeight: 800, visualHeight: 800, offsetTop: 0 },
      0,
    );
    expect(closed.appVh).toBe(800);
    expect(closed.keyboardHeight).toBe(0);
    expect(closed.lastFullHeight).toBe(800);

    const resized = resolveViewportCssVars(
      { innerHeight: 450, visualHeight: 450, offsetTop: 0 },
      closed.lastFullHeight,
    );
    expect(resized.appVh).toBe(450);
    expect(resized.keyboardHeight).toBe(0);
    expect(resized.lastFullHeight).toBe(450);
  });

  it('freezes --app-vh and reports keyboard height when the keyboard overlays (iOS Safari)', () => {
    const closed = resolveViewportCssVars(
      { innerHeight: 800, visualHeight: 800, offsetTop: 0 },
      0,
    );

    const overlay = resolveViewportCssVars(
      { innerHeight: 800, visualHeight: 450, offsetTop: 0 },
      closed.lastFullHeight,
    );
    expect(overlay.appVh).toBe(800);
    expect(overlay.keyboardHeight).toBe(350);
    expect(overlay.lastFullHeight).toBe(800);
  });

  it('still freezes layout height when Safari pans offsetTop with the keyboard', () => {
    const closed = resolveViewportCssVars(
      { innerHeight: 800, visualHeight: 800, offsetTop: 0 },
      0,
    );

    const panned = resolveViewportCssVars(
      { innerHeight: 800, visualHeight: 450, offsetTop: 350 },
      closed.lastFullHeight,
    );
    expect(panned.appVh).toBe(800);
    expect(panned.keyboardHeight).toBe(350);
    expect(panned.lastFullHeight).toBe(800);
  });

  it('ignores Safari chrome show/hide under the overlay threshold', () => {
    const closed = resolveViewportCssVars(
      { innerHeight: 800, visualHeight: 800, offsetTop: 0 },
      0,
    );

    const chromeShrink = 800 - (KEYBOARD_OVERLAY_THRESHOLD_PX - 10);
    const chromeOnly = resolveViewportCssVars(
      { innerHeight: 800, visualHeight: chromeShrink, offsetTop: 0 },
      closed.lastFullHeight,
    );
    expect(chromeOnly.keyboardHeight).toBe(0);
    expect(chromeOnly.appVh).toBe(800);
    expect(chromeOnly.lastFullHeight).toBe(800);
  });

  it('keeps the last full height frozen while the keyboard stays open', () => {
    const closed = resolveViewportCssVars(
      { innerHeight: 844, visualHeight: 844, offsetTop: 0 },
      0,
    );

    const opening = resolveViewportCssVars(
      { innerHeight: 844, visualHeight: 600, offsetTop: 0 },
      closed.lastFullHeight,
    );
    const open = resolveViewportCssVars(
      { innerHeight: 844, visualHeight: 480, offsetTop: 0 },
      opening.lastFullHeight,
    );

    expect(opening.appVh).toBe(844);
    expect(open.appVh).toBe(844);
    expect(open.lastFullHeight).toBe(844);
    expect(open.keyboardHeight).toBe(364);
  });

  it('updates lastFullHeight after the keyboard closes onto a new layout size', () => {
    const overlay = resolveViewportCssVars(
      { innerHeight: 800, visualHeight: 450, offsetTop: 0 },
      800,
    );
    expect(overlay.appVh).toBe(800);

    const closedRotated = resolveViewportCssVars(
      { innerHeight: 390, visualHeight: 390, offsetTop: 0 },
      overlay.lastFullHeight,
    );
    expect(closedRotated.appVh).toBe(390);
    expect(closedRotated.keyboardHeight).toBe(0);
    expect(closedRotated.lastFullHeight).toBe(390);
  });

  it('treats missing visualHeight as innerHeight', () => {
    const result = resolveViewportCssVars(
      { innerHeight: 700, visualHeight: 0, offsetTop: 0 },
      0,
    );
    expect(result.appVh).toBe(700);
    expect(result.keyboardHeight).toBe(0);
  });
});
