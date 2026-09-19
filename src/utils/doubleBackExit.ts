export const EXIT_WINDOW_MS = 2000;

/** True when this back press lands inside the window opened by the previous one. */
export function isSecondBackPress(lastPressAt: number, now: number): boolean {
  return lastPressAt > 0 && now - lastPressAt <= EXIT_WINDOW_MS;
}

let lastPressAt = 0;
let hintEl: HTMLElement | null = null;

function showExitHint() {
  hintEl?.remove();
  const el = document.createElement('div');
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.textContent = 'Press back again to exit';
  el.style.cssText =
    'position:fixed;left:50%;transform:translateX(-50%);z-index:20000;padding:10px 16px;' +
    'border-radius:9999px;background:rgba(22,24,29,0.92);color:#fff;font-size:13px;font-weight:600;' +
    'bottom:calc(88px + env(safe-area-inset-bottom, 0px));pointer-events:none;';
  document.body.appendChild(el);
  hintEl = el;
  setTimeout(() => {
    if (hintEl === el) hintEl = null;
    el.remove();
  }, EXIT_WINDOW_MS);
}

/** Root-screen back press: returns true (exit) on the second press within the window, else shows a hint. */
export function handleRootBackPress(now = Date.now()): boolean {
  if (isSecondBackPress(lastPressAt, now)) {
    lastPressAt = 0;
    return true;
  }
  lastPressAt = now;
  showExitHint();
  return false;
}
