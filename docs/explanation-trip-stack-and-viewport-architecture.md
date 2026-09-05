# Explanation: Trip Stack & Cross-Platform Viewport Architecture

This document explains the architectural decisions behind the passport card stack (`TripStack`), the slide-to-create/join launcher (`TripSlideLauncher`), and the cross-platform viewport locking system in Trip Tracker 2026.

---

## The Problem: Asymmetric Viewport Geometries

The home screen of Trip Tracker uses a physical passport aesthetic: trips are presented as stacked 3:4 portrait cards with travel stamps, live stats, and a bottom gesture launcher.

```
       ┌────────────────────────┐
       │   Trip Tracker 2026    │  Header + Profile
       ├────────────────────────┤
       │ ┌────────────────────┐ │
       │ │   Passport Card    │ │  3:4 Portrait Ratio Card
       │ │   (Goa Trip ☀️)    │ │  (Cover photo, stamps, spend)
       │ │                    │ │
       │ └────────────────────┘ │
       │         ● ○ ○          │  Pagination Indicators
       ├────────────────────────┤
       │ [==== Slide ====>]     │  Pinned Launcher Slider
       └────────────────────────┘
```

When deploying across Android Chrome and iOS Safari, two layout failure modes emerged:

### 1. Card Squashing on iOS Safari
On Android Chrome, address bars and navigation controls are compact (~80px), providing ~780–840px of visible height. The card naturally rendered in an elegant 3:4 portrait luxury ratio (~480px height).

On iOS Safari, browser UI elements (top URL pill, bottom toolbar, notch safe areas, and dynamic home indicator) reduce available viewport height to as little as 640px. When CSS containers used naive `flex: 1` or percentage heights, the card was squashed down to ~320px, turning into an awkward 1:1 square that severely cropped cover photos and truncated member lists.

### 2. The Android "Dead Space" Void
Attempting to fix Safari by introducing static clamped heights (`height: clamp(430px, 58vh, 485px)`) and enabling vertical overflow caused a secondary defect on tall Android screens: all elements clustered at the top of the screen, leaving an empty 200–250px dead gap above the bottom navigation bar.

### 3. Popstate Hijacking on Modal Navigation
When users opened secondary modals from the trip screen (such as `TripRouteModal` or `TripActionSheet`) and used the hardware back button or swipe-to-go-back gesture, the app would prematurely exit the active trip entirely (`selectTrip(null)`). This occurred because modals were not registered in a unified Last-In-First-Out (LIFO) history stack.

---

## The Approach: Dynamic Geometric Clamping & Pinned Staging

### 1. Dynamic 3:4 Proportional Clamping Formula
To preserve the 3:4 aspect ratio across any phone height without clipping or squashing, we derived a dynamic bounding formula in [`src/index.css`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/index.css):

```css
.trip-stack-stage {
  flex: 1;
  min-height: 0;
  height: auto;
  width: 100%;
  max-width: min(390px, calc((var(--app-vh, 100dvh) - 220px) * 0.75));
  margin: 0 auto 6px;
}
```

#### How the formula works:
1. `var(--app-vh, 100dvh) - 220px`: Subtracts the known vertical overhead of headers, pagination dots, safe areas, and the bottom launcher.
2. `* 0.75`: Scales the available height by the exact 3:4 aspect ratio (`3 / 4 = 0.75`).
3. `min(390px, ...)`: Caps the width on wide devices to avoid excessive stretching on tablets and desktops.

On short screens (iOS Safari with active toolbars), the container dynamically scales down its width to match its height, preserving the exact 3:4 card proportions. On tall screens (Android), it expands to the 390px cap and fills the stage naturally.

### 2. Viewport Lock & Launcher Bottom Pinning
To eliminate empty dead space on tall devices:
- `.trips-screen-scroll.stack-viewport-lock` is locked to `height: 100%; height: var(--app-vh, 100dvh); overflow: hidden; overscroll-behavior: none;`.
- `.trip-launcher` is pinned to the bottom of the flex column using `margin-top: auto; margin-bottom: 0; flex-shrink: 0;`.
- Any excess vertical space is absorbed proportionally by the stage padding, ensuring the slider is always anchored directly above the system navigation bar.

### 3. Unified LIFO Back Navigation Stack
To guarantee that hardware back buttons and swipe gestures dismiss the topmost modal rather than exiting the trip:
- Every overlay modal registers a handler with [`useHistoryBack`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/hooks/useHistoryBack.ts).
- Overlays push a synthetic `history.pushState` entry upon opening.
- The `popstate` listener resolves in reverse registration order, dismissing only the active child overlay.

```
Trip Screen (Root)
       └──> Open Route Modal (Pushes state)
              └──> Open Share Sheet (Pushes state)
                     │
                     ▼ Swipe Back / Hardware Back
              Dismisses Share Sheet (Route Modal remains visible)
                     │
                     ▼ Swipe Back / Hardware Back
       Dismisses Route Modal (Returns cleanly to Trip Screen)
```

---

## Trade-offs Accepted

| Trade-off | Rationale |
|-----------|-----------|
| **Zero Vertical Scroll on Home Screen** | Locking `overflow: hidden` on phone viewports means users cannot scroll down on the home card stack. This was accepted because the home view is designed as an app launcher / dashboard widget, where all primary controls must remain in thumb reach without scroll ambiguity. |
| **Fixed Overhead Subtraction (`220px`)** | Using a static 220px constant in CSS calc assumes a predictable header and footer footprint. This trade-off is guarded by CSS custom properties (`--safe-top`, `--safe-bottom`) that dynamically adapt to device notches. |

---

## Related Documentation

- [How to Navigate and Manage Trip Stacks](howto-navigate-and-manage-trip-stacks.md)
- [Explanation: Mobile Compositor & WebKit Performance Architecture](explanation-mobile-compositor-and-webkit-performance.md)
- [Reference: Design System](reference-design-system.md)
