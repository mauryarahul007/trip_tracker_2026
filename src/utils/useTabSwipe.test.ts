import { describe, expect, it } from 'vitest';
import { bindTabSwipe, shouldStartTabSwipe } from './useTabSwipe';

type Fake = {
  parentElement: Fake | null;
  className: string;
  attrs: Record<string, string>;
  scrollWidth: number;
  clientWidth: number;
  classList: { contains: (token: string) => boolean };
  getAttribute: (name: string) => string | null;
  closest: (selector: string) => Fake | null;
  getBoundingClientRect: () => { left: number; right: number };
};

function matches(el: Fake, selector: string): boolean {
  if (selector.startsWith('.')) return el.classList.contains(selector.slice(1));
  if (selector.startsWith('[') && selector.endsWith(']')) {
    return el.getAttribute(selector.slice(1, -1)) != null;
  }
  return false;
}

function fake(partial: Partial<Fake> = {}): Fake {
  const el: Fake = {
    parentElement: partial.parentElement ?? null,
    className: partial.className ?? '',
    attrs: partial.attrs ?? {},
    scrollWidth: partial.scrollWidth ?? 0,
    clientWidth: partial.clientWidth ?? 100,
    classList: { contains: (token) => el.className.split(/\s+/).filter(Boolean).includes(token) },
    getAttribute: (name) => (name in el.attrs ? el.attrs[name] : null),
    closest(selector) {
      let current: Fake | null = el;
      while (current) {
        if (selector.split(',').some((part) => matches(current as Fake, part.trim()))) return current;
        current = current.parentElement;
      }
      return null;
    },
    getBoundingClientRect: partial.getBoundingClientRect ?? (() => ({ left: 0, right: 360 })),
  };
  return el;
}

function asEl(node: Fake): HTMLElement {
  return node as unknown as HTMLElement;
}

describe('shouldStartTabSwipe', () => {
  const overflow = (el: HTMLElement) => (el as unknown as { overflowX?: string }).overflowX ?? 'visible';

  it('still starts on a wide vertical tab pane', () => {
    const pane = fake({ className: 'tab-pane', scrollWidth: 800, clientWidth: 320 });
    (pane as Fake & { overflowX: string }).overflowX = 'auto';
    const target = fake({ parentElement: pane, scrollWidth: 800, clientWidth: 320 });
    const host = fake();
    pane.parentElement = host;
    expect(shouldStartTabSwipe(asEl(target), asEl(host), 180, overflow)).toBe(true);
  });

  it('does not start on a horizontal chip strip', () => {
    const chips = fake({ className: 'filter-chips-track', scrollWidth: 600, clientWidth: 320 });
    const target = fake({ parentElement: chips });
    const host = fake();
    chips.parentElement = host;
    expect(shouldStartTabSwipe(asEl(target), asEl(host), 180, overflow)).toBe(false);
  });

  it('does not start on another wide horizontal scroller', () => {
    const strip = fake({ scrollWidth: 500, clientWidth: 200 });
    (strip as Fake & { overflowX: string }).overflowX = 'scroll';
    const target = fake({ parentElement: strip });
    const host = fake();
    strip.parentElement = host;
    expect(shouldStartTabSwipe(asEl(target), asEl(host), 40, overflow)).toBe(false);
  });

  it('lets an edge-zone touch on a swipeable row change tabs', () => {
    const row = fake({ attrs: { 'data-no-tab-swipe': 'row' } });
    const target = fake({ parentElement: row });
    const host = fake();
    row.parentElement = host;
    expect(shouldStartTabSwipe(asEl(target), asEl(host), 10, overflow)).toBe(true);
    expect(shouldStartTabSwipe(asEl(target), asEl(host), 180, overflow)).toBe(false);
  });
});

describe('bindTabSwipe', () => {
  it('attaches listeners only after the host mounts', () => {
    const added: string[] = [];
    const removed: string[] = [];
    const host = {
      addEventListener(type: string) { added.push(type); },
      removeEventListener(type: string) { removed.push(type); },
    } as unknown as HTMLElement;

    const stopMissing = bindTabSwipe(null, () => {
      throw new Error('must not bind before the trip screen mounts');
    });
    expect(added).toEqual([]);
    stopMissing();

    const stop = bindTabSwipe(host, () => ({
      start() {},
      move() {},
      end() {},
      cancel() {},
    }));
    expect(added).toEqual(['touchstart', 'touchmove', 'touchend', 'touchcancel']);
    stop();
    expect(removed).toEqual(['touchstart', 'touchmove', 'touchend', 'touchcancel']);
  });
});
