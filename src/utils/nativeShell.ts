import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { StatusBar, Style } from '@capacitor/status-bar';

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

// The native tab bar (MainViewController.swift) owns all the visuals —
// .nav-tabs stays in the DOM (invisible) purely so its existing React
// onClick handlers still work when native calls .click() on it, and so
// its .active class / data-tab stay the single source of truth for which
// tab is selected. setActiveTab isn't only driven by nav-bar taps (a few
// flows in App.tsx switch tabs programmatically), so native can't just
// assume "whichever tab I tapped is now active" — it has to read this
// state back rather than own it.
function resolveTheme(): 'light' | 'dark' {
  const pinned = document.documentElement.dataset.theme;
  if (pinned === 'light' || pinned === 'dark') return pinned;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Matches the sheet/header's own tone logic: headerTone 'dark' means the
// header switched to dark text because the background behind it (map or,
// once full, the app surface) is bright -- so the OS status bar icons need
// to go dark to stay legible on it too, and vice versa. No-ops on web.
export function syncStatusBarTone(backgroundIsBright: boolean): void {
  if (!Capacitor.isNativePlatform()) return;
  void StatusBar.setStyle({ style: backgroundIsBright ? Style.Dark : Style.Light });
}

export { resolveTheme };

// Native views (the header/tab bar glass) are separate subviews stacked
// on top of the entire webview, above its whole rendered output — a
// web-rendered modal's own CSS z-index has no effect on that, it's still
// just content within the flat layer sitting underneath. Every full-
// screen modal in the app uses one of these two classes, so both native
// surfaces hide themselves whenever either is open, letting the modal
// actually cover everything the way its CSS already intends.
function isAnyModalOpen(): boolean {
  return !!document.querySelector('.modal-overlay, .modal-backdrop');
}

function setUpNativeTabBarSync(): void {
  const w = window as unknown as {
    webkit?: {
      messageHandlers?: {
        navTabsState?: { postMessage(v: { visible: boolean; active: string | null; theme: 'light' | 'dark'; modalOpen: boolean }): void };
      };
    };
  };
  const messenger = w.webkit?.messageHandlers?.navTabsState;
  if (!messenger) return;

  let last = '';
  const sync = () => {
    const navTabs = document.querySelector('.nav-tabs');
    const activeEl = navTabs?.querySelector<HTMLElement>('.nav-tab-item.active');
    const state = { visible: !!navTabs, active: activeEl?.dataset.tab ?? null, theme: resolveTheme(), modalOpen: isAnyModalOpen() };
    const key = JSON.stringify(state);
    if (key === last) return;
    last = key;
    messenger.postMessage(state);
  };

  sync();
  new MutationObserver(sync).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'data-theme'],
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', sync);
}

type HeaderState = {
  visible: boolean;
  tripName: string;
  eyebrow: string;
  memberLabel: string;
  expenseLabel: string;
  syncLabel: string;
  syncStatus: string;
  theme: 'light' | 'dark';
  modalOpen: boolean;
};

// Same reasoning as the tab bar: a native blur behind CSS content would
// blur that content too, so the header's title/eyebrow/stats/sync
// pill/buttons are all native (MainViewController.swift), tap-forwarded
// via data-action to the equivalent .app-header buttons. Unlike the tab
// bar's 4 static icons, this content is rich and frequently changing, so
// rather than trying to read/diff every individual field, just report the
// whole header's text content as one state object whenever anything in it
// changes — simpler and self-correcting if the markup shifts later.
function setUpNativeHeaderSync(): void {
  const w = window as unknown as {
    webkit?: {
      messageHandlers?: {
        headerState?: { postMessage(v: HeaderState): void };
        headerScroll?: { postMessage(v: number): void };
      };
    };
  };
  const stateMessenger = w.webkit?.messageHandlers?.headerState;
  const scrollMessenger = w.webkit?.messageHandlers?.headerScroll;
  if (!stateMessenger || !scrollMessenger) return;

  let lastState = '';
  const syncState = () => {
    // Scoped to .trip-dashboard-header, not the shared .app-header class —
    // GlobalSettingsModal and ExpenseForm reuse .app-header for their own
    // in-modal headers, and a generic query here could pick up whichever
    // happens to be first in the DOM instead of the real trip header.
    const header = document.querySelector('.trip-dashboard-header');
    const state: HeaderState = {
      visible: !!header,
      tripName: header?.querySelector('.app-logo')?.textContent?.trim() ?? '',
      eyebrow: header?.querySelector('.app-eyebrow')?.textContent?.trim() ?? '',
      memberLabel: header?.querySelectorAll('.app-header-stats span')[0]?.textContent?.trim() ?? '',
      expenseLabel: header?.querySelectorAll('.app-header-stats span')[1]?.textContent?.trim() ?? '',
      syncLabel: header?.querySelector('.sync-header-pill span:last-child')?.textContent?.trim() ?? '',
      syncStatus:
        Array.from(header?.querySelector('.sync-badge-dot')?.classList ?? []).find((c) => c !== 'sync-badge-dot') ?? 'synced',
      theme: resolveTheme(),
      modalOpen: isAnyModalOpen(),
    };
    const key = JSON.stringify(state);
    if (key === lastState) return;
    lastState = key;
    stateMessenger.postMessage(state);
  };

  syncState();

  // .tab-pane's own top padding already reserves space for the fully
  // expanded native header (see html.capacitor-ios .tab-pane in
  // index.css) — it's a fixed, never-changing value on purpose, so the
  // native header can simply shrink into that reserved space as it
  // collapses (its own height animates; the space it no longer visually
  // fills just reveals scrolled-up content, blurred, behind it) without
  // any risk of fighting the browser's own scroll-position math the way
  // adjusting padding-top mid-scroll would.
  let lastProgress = -1;
  let pendingProgress: number | null = null;
  let rafScheduled = false;

  const postProgress = (progress: number) => {
    pendingProgress = Math.max(0, Math.min(1, progress));
    if (!rafScheduled) {
      rafScheduled = true;
      requestAnimationFrame(flush);
    }
  };

  // A scroll event fires far more often than the display can redraw —
  // posting straight from the handler means every one of those extra
  // calls still pays a full JS-to-native bridge hop (serialization + a
  // main-thread dispatch on the Swift side) for a value the previous,
  // still-unprocessed one already superseded. Coalescing to one post per
  // animation frame caps that at the screen's actual refresh rate, which
  // is what was really behind the collapse feeling less than smooth.
  function flush() {
    rafScheduled = false;
    if (pendingProgress === null) return;
    const progress = pendingProgress;
    pendingProgress = null;
    if (Math.abs(progress - lastProgress) < 0.01) return;
    lastProgress = progress;
    scrollMessenger!.postMessage(progress);
  }

  // 100 matches HeaderMetrics.expandedContentHeight in
  // MainViewController.swift (also html.capacitor-ios .tab-pane's
  // reserved padding-top) — collapse finishing exactly when that reserved
  // space is fully scrolled through means content reaches the header's
  // bottom edge right as it visually finishes collapsing, not before (a
  // lingering, closing gap) or after (content flush against it while
  // still "mid-collapse").
  document.body.addEventListener(
    'scroll',
    (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement) || !target.classList.contains('tab-pane')) return;
      postProgress(target.scrollTop / 100);
    },
    true
  );

  // Switching tabs toggles a .tab-pane's `display` between none/block
  // without ever firing a scroll event on it — so without this, the header
  // just keeps showing whatever collapse state the previously active pane
  // happened to be scrolled to, mismatched against the freshly-shown
  // pane's actual scroll position (e.g. staying collapsed over a tab
  // that's sitting right at its own top). Re-deriving progress from
  // whichever pane is actually visible every time the DOM changes keeps
  // the two in sync across tab switches, not just within one.
  const resyncActivePaneProgress = () => {
    const panes = document.querySelectorAll<HTMLElement>('.tab-pane');
    const active = Array.from(panes).find((p) => p.style.display !== 'none');
    if (active) postProgress(active.scrollTop / 100);
  };

  resyncActivePaneProgress();
  new MutationObserver(() => {
    syncState();
    resyncActivePaneProgress();
  }).observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'data-theme', 'style'],
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncState);
}

// Temporary diagnostic bridge — WKWebView's JS console doesn't surface
// through `devicectl --console`/NSLog on its own, so uncaught errors are
// forwarded to MainViewController.swift's nativeLog handler (NSLog) to
// make native-only JS failures visible without a Safari Web Inspector
// session.
function setUpNativeErrorLog(): void {
  const w = window as unknown as {
    webkit?: { messageHandlers?: { nativeLog?: { postMessage(v: string): void } } };
  };
  const messenger = w.webkit?.messageHandlers?.nativeLog;
  if (!messenger) return;

  window.addEventListener('error', (e) => {
    messenger.postMessage(`error: ${e.message} @ ${e.filename}:${e.lineno}:${e.colno}\n${e.error?.stack ?? ''}`);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    messenger.postMessage(`unhandledrejection: ${reason?.message ?? reason}\n${reason?.stack ?? ''}`);
  });

  // Libraries like MapLibre report failures (bad tile fetch, style load
  // failure, WebGL context issues) via console.error/an internal 'error'
  // event rather than a thrown/rejected exception, so window.onerror alone
  // misses them — wrapping console directly catches those too.
  (['error', 'warn'] as const).forEach((level) => {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      original(...args);
      try {
        messenger.postMessage(`console.${level}: ${args.map((a) => (a instanceof Error ? a.stack ?? a.message : String(a))).join(' ')}`);
      } catch {
        // Non-serializable argument — the original console call above
        // already happened, nothing more to do.
      }
    };
  });
}

export function initNativeShell(): void {
  if (!Capacitor.isNativePlatform()) return;

  document.documentElement.classList.add('capacitor-native');
  if (Capacitor.getPlatform() === 'ios') {
    document.documentElement.classList.add('capacitor-ios');
    setUpNativeTabBarSync();
    setUpNativeHeaderSync();
    setUpNativeErrorLog();
  }

  applySafeAreaVars();
  setTimeout(applySafeAreaVars, 600);
  window.addEventListener('resize', applySafeAreaVars);

  setUpKeyboardAvoidance();
}
