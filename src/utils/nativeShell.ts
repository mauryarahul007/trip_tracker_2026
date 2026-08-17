import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

// WKWebView reports env(safe-area-inset-*) as 0 on the very first paint and
// only resolves the real geometry ~500ms later. CSS rules that read env()
// directly would capture that initial 0 and never re-check, so every
// consuming rule reads var(--safe-*) instead, which we set here and refresh
// once the real values are in.
function applySafeAreaVars(): void {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:absolute;visibility:hidden;pointer-events:none;' +
    'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) ' +
    'env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px);';
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const root = document.documentElement.style;
  root.setProperty('--safe-top', cs.paddingTop);
  root.setProperty('--safe-right', cs.paddingRight);
  root.setProperty('--safe-bottom', cs.paddingBottom);
  root.setProperty('--safe-left', cs.paddingLeft);
  probe.remove();
}

function findScrollParent(el: HTMLElement): HTMLElement | null {
  let node = el.parentElement;
  while (node) {
    const style = getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY)) return node;
    node = node.parentElement;
  }
  return document.scrollingElement as HTMLElement | null;
}

// Capacitor's Keyboard plugin is configured with resize:'none' (see
// capacitor.config.ts) so we have full manual control here — instead of
// hardcoding which container needs extra bottom padding for every form in
// the app, find whichever scrollable ancestor holds the currently focused
// input and pad + scroll that one, so any form's active field stays above
// the keyboard. --keyboard-height is also set globally so footer bars that
// sit outside the scrollable area (e.g. ExpenseForm's fixed Add/Cancel bar)
// can shift themselves up too — padding the scroll parent alone doesn't
// move siblings sitting next to it.
let keyboardPadTarget: HTMLElement | null = null;

function setUpKeyboardAvoidance(): void {
  Keyboard.addListener('keyboardWillShow', (info) => {
    document.documentElement.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);

    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) return;

    const scrollParent = findScrollParent(active);
    if (scrollParent) {
      keyboardPadTarget = scrollParent;
      scrollParent.style.paddingBottom = `${info.keyboardHeight}px`;
    }

    // Let the padding take effect before scrolling, or the browser measures
    // the input's position against the not-yet-resized scroll container.
    setTimeout(() => {
      active.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 50);
  });

  Keyboard.addListener('keyboardWillHide', () => {
    document.documentElement.style.setProperty('--keyboard-height', '0px');
    if (keyboardPadTarget) {
      keyboardPadTarget.style.paddingBottom = '';
      keyboardPadTarget = null;
    }
  });
}

export function initNativeShell(): void {
  if (!Capacitor.isNativePlatform()) return;

  document.documentElement.classList.add('capacitor-native');

  applySafeAreaVars();
  setTimeout(applySafeAreaVars, 600);
  window.addEventListener('resize', applySafeAreaVars);

  setUpKeyboardAvoidance();
}
