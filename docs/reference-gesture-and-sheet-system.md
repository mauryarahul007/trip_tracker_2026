# Reference: Gesture & Sheet System

This document provides technical reference for the interactive bottom content sheet (`TripContentSheet`), its gesture physics constants, snap-point algorithms, and compositor lifecycle in Trip Tracker 2026.

---

## Component Interface: `TripContentSheet`

Source: [`src/components/TripContentSheet.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/TripContentSheet.tsx)

### Props

```typescript
interface Props {
  children: ReactNode;
  onExpandedChange?: (expanded: boolean) => void;
  onFullChange?: (full: boolean) => void;
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | Required | Content rendered inside the scrollable bottom sheet (tabs, expense lists, forms). |
| `onExpandedChange` | `(expanded: boolean) => void` | `undefined` | Callback fired when the sheet transitions between collapsed (`top: 50%`) and expanded/full (`top: 20%` or `0%`). Used to adjust map controls. |
| `onFullChange` | `(full: boolean) => void` | `undefined` | Callback fired when the sheet snaps fully open (`top: 0%`). Used by [`App.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/App.tsx) to hide the floating header. |

---

## Snap Points & Physics Constants

The sheet operates across three discrete vertical snap points defined as percentages of the viewport height:

```typescript
export const SHEET_COLLAPSED_TOP = 50; // vh% -- initial state, map half visible
const SHEET_EXPANDED_TOP = 20;         // vh% -- swiped-up state, 80% coverage
const SHEET_FULL_TOP = 0;              // vh% -- fully expanded, covers map & header
const SNAP_POINTS = [SHEET_FULL_TOP, SHEET_EXPANDED_TOP, SHEET_COLLAPSED_TOP];
```

### Physics Constants

| Constant | Value | Unit | Purpose |
|----------|-------|------|---------|
| `FLING_VELOCITY_THRESHOLD` | `0.08` | `vh% / ms` | Minimum velocity required to trigger a directional snap step override regardless of touch position. |
| `RESISTANCE` | `0.35` | Ratio (0.0–1.0) | Rubber-band damping factor applied when dragging past bounds (`< 0%` or `> 50%`). |

---

## Algorithms & Resolution Logic

### 1. Nearest Snap Point
Finds the closest discrete snap target based on absolute distance:
```typescript
function nearestSnapPoint(value: number): number {
  return SNAP_POINTS.reduce((closest, point) =>
    Math.abs(point - value) < Math.abs(closest - value) ? point : closest
  );
}
```

### 2. Velocity-Aware Fling Resolution
Overrides nearest-point selection when a directional flick is detected, advancing by one discrete snap step in the direction of the flick:
```typescript
function resolveSnapPoint(value: number, velocity: number, startTop: number): number {
  if (Math.abs(velocity) >= FLING_VELOCITY_THRESHOLD) {
    const startIdx = SNAP_POINTS.indexOf(nearestSnapPoint(startTop));
    if (velocity < 0 && startIdx > 0) return SNAP_POINTS[startIdx - 1]; // flung up
    if (velocity > 0 && startIdx < SNAP_POINTS.length - 1) return SNAP_POINTS[startIdx + 1]; // flung down
  }
  return nearestSnapPoint(value);
}
```

### 3. Boundary Rubber-Banding
Damps touch displacement beyond extreme boundaries to prevent hard stops:
```typescript
function withResistance(value: number): number {
  if (value < SHEET_FULL_TOP) {
    return SHEET_FULL_TOP - (SHEET_FULL_TOP - value) * RESISTANCE;
  }
  if (value > SHEET_COLLAPSED_TOP) {
    return SHEET_COLLAPSED_TOP + (value - SHEET_COLLAPSED_TOP) * RESISTANCE;
  }
  return value;
}
```

---

## Gesture Lifecycle & Compositor Integration

```
Touch Down (touchstart / pointerdown)
  │
  ├── Record touchStartY, touchStartX, and dragStartTop
  ├── Query target.closest('.tab-pane, [data-scrollable]')
  │     └── If scrollContainer.scrollTop > 0: ABORT DRAG (allow inner content scroll)
  └── Reset velocity tracking
        │
        ▼
Touch Move (touchmove / pointermove)
  │
  ├── Check gesture angle: if |deltaX| > |deltaY|, cancel drag (horizontal swipe)
  ├── Calculate deltaPx = (currentY - touchStartY)
  ├── Calculate liveTop = dragStartTop + (deltaPx / window.innerHeight * 100)
  ├── Apply rubber-band resistance: dampedTop = withResistance(liveTop)
  ├── Set sheetRef.current.style.transform = `translate3d(0, ${deltaPx}px, 0)`
  └── Interpolate scrimRef.current.style.opacity
        │
        ▼
Touch End (touchend / pointerup)
  │
  ├── Compute velocity = (currentTop - lastMovePercent) / timeDelta
  ├── Resolve target: finalSnap = resolveSnapPoint(dampedTop, velocity, dragStartTop)
  ├── Apply GPU CSS transition to final target
  ├── Trigger haptic feedback: Haptics.impact({ style: ImpactStyle.Light })
  └── Reconcile React state: setTopPercent(finalSnap) after transition completes
```

---

## Nested Scroll Conflict Resolution

To prevent conflict between child list scrolling and bottom sheet dragging:
1. On `touchstart`, the handler inspects `target.closest('.tab-pane, [data-scrollable]')`.
2. If the scrollable parent has `scrollTop > 0`, the bottom sheet drag is disabled, allowing native momentum scrolling inside the list.
3. Only when `scrollTop === 0` and the user pulls downward does the gesture transition to collapsing the sheet.

---

## Related Documentation

- [Explanation: Mobile Compositor & WebKit Performance Architecture](explanation-mobile-compositor-and-webkit-performance.md)
- [Reference: Design System](reference-design-system.md)
- [Reference: Native Shell & Haptics](reference-native-shell-and-haptics.md)
