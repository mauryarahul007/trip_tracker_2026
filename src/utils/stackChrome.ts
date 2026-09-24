// Home-stack chrome above and below the 3:4 card. iOS sizes the card from
// the visible viewport minus this sum. Margins that are `auto` (the
// launcher's margin-top) are omitted: their used value is leftover space,
// and counting it would shrink the card on the next frame.

export const STACK_CHROME_FALLBACK_PX = 220;

// Matches the locked-stack stylesheet, not computed auto margins:
// header margin-bottom 6, section margin-bottom 4, stage margin-bottom 6,
// stepper margin 14+2.
export const STACK_CHROME_HEADER_GAP_PX = 6;
export const STACK_CHROME_SECTION_GAP_PX = 4;
export const STACK_CHROME_STAGE_GAP_PX = 6;
export const STACK_CHROME_STEPPER_GAP_PX = 16;

export type StackChromeInput = {
  paddingTop: number;
  paddingBottom: number;
  header: number;
  section: number;
  netRow: number;
  stepper: number;
  launcher: number;
};

function px(n: number): number {
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function stackChromePx(input: StackChromeInput): number {
  const stepper = px(input.stepper);
  const measured =
    px(input.paddingTop) +
    px(input.paddingBottom) +
    px(input.header) +
    px(input.section) +
    px(input.netRow) +
    stepper +
    px(input.launcher);

  if (measured <= 0) return STACK_CHROME_FALLBACK_PX;

  return Math.round(
    measured +
    STACK_CHROME_HEADER_GAP_PX +
    STACK_CHROME_SECTION_GAP_PX +
    STACK_CHROME_STAGE_GAP_PX +
    (stepper > 0 ? STACK_CHROME_STEPPER_GAP_PX : 0),
  );
}

function visibleHeight(el: Element | null): number {
  if (!(el instanceof HTMLElement) || el.getClientRects().length === 0) return 0;
  return el.getBoundingClientRect().height;
}

export function readStackChrome(root: HTMLElement): number {
  const cs = getComputedStyle(root);
  return stackChromePx({
    paddingTop: parseFloat(cs.paddingTop) || 0,
    paddingBottom: parseFloat(cs.paddingBottom) || 0,
    header: visibleHeight(root.querySelector('.home-unified-header') || root.querySelector('.concept1-header') || root.querySelector('.trips-screen-header')),
    section: visibleHeight(root.querySelector('.trips-section-header')),
    netRow: visibleHeight(root.querySelector('.home-net-row')),
    stepper: visibleHeight(root.querySelector('.trip-stepper-dots')),
    launcher: visibleHeight(root.querySelector('.trip-launcher')),
  });
}
