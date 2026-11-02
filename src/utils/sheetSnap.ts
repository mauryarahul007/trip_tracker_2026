// Snap points and drag resolution for TripContentSheet, kept out of the component file so they can be unit tested.

// Exported so TripMapHero can size its fitBounds padding to match --
// the map needs to fit the whole route above wherever the sheet's top
// edge actually sits, not just this file's own layout.
export const SHEET_COLLAPSED_TOP = 50; // vh% -- map half visible when the user peeks it
export const SHEET_EXPANDED_TOP = 20; // vh% -- swiped-up state, 80% coverage
export const SHEET_FULL_TOP = 0; // vh% -- fully expanded, Uber-style: covers the map entirely

// Touch drags rest on full or collapsed only (matching the Flutter app); the 80% step stays reachable from the
// keyboard handle. A resting 80% state made opening over the map take two swipes.
const SNAP_POINTS = [SHEET_FULL_TOP, SHEET_COLLAPSED_TOP];
// vh% of travel from the starting point that commits to the other state without needing a flick.
const COMMIT_DISTANCE = 6;
export function nearestSnapPoint(value: number): number {
  return SNAP_POINTS.reduce((closest, point) =>
    Math.abs(point - value) < Math.abs(closest - value) ? point : closest
  );
}

// A quick short flick should move one snap step in the flick's direction,
// same as iOS/Android native sheets, instead of always settling on whichever
// point the finger happened to end up closest to. %-of-viewport-height per ms;
// tuned so an ordinary drag (which stays well under this) never triggers it.
const FLING_VELOCITY_THRESHOLD = 0.08;
export function resolveSnapPoint(value: number, velocity: number, startTop: number): number {
  if (velocity <= -FLING_VELOCITY_THRESHOLD) return SHEET_FULL_TOP; // flung up
  if (velocity >= FLING_VELOCITY_THRESHOLD) return SHEET_COLLAPSED_TOP; // flung down
  if (startTop >= SHEET_COLLAPSED_TOP) return value < SHEET_COLLAPSED_TOP - COMMIT_DISTANCE ? SHEET_FULL_TOP : SHEET_COLLAPSED_TOP;
  if (startTop <= SHEET_FULL_TOP) return value > SHEET_FULL_TOP + COMMIT_DISTANCE ? SHEET_COLLAPSED_TOP : SHEET_FULL_TOP;
  return nearestSnapPoint(value);
}

