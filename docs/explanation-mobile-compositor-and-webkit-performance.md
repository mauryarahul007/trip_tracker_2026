# Explanation: Mobile Compositor & WebKit Performance Architecture

This document explains the architectural principles, rendering pipeline constraints, and performance optimizations implemented to ensure fluid 60–120 FPS interactions across both Blink (Android Chrome) and WebKit (iOS Safari) in Trip Tracker 2026.

---

## The Problem: The WebKit Frame-Rate Chasm

While Trip Tracker ran at a consistent 60–120 FPS on Android devices running Chrome, testing on iOS Safari revealed visual stutter, delayed touch tracking, and frame drops down to 15–30 FPS during bottom sheet gestures and map interactions.

In modern hybrid web applications, cross-platform performance disparities rarely stem from JavaScript execution speed. Instead, they arise from differences in browser compositor architectures, GPU memory models, and layer rasterization pipelines.

```
       [ Blink / Skia (Android Chrome) ]               [ WebKit / Metal (iOS Safari) ]
       ---------------------------------               -------------------------------
       - Asynchronous compositor thread                - Synchronous main-thread hooks
       - Aggressive tile caching                       - Immediate layer invalidation
       - Dedicated GPU command buffers                 - Stringent fragment shader caps
       - Unified canvas surface discard                - Heavy penalty on canvas readback
```

Profiling the iOS Safari rendering pipeline revealed four critical bottlenecks:

### 1. React State Thrashing on Continuous Gestures
During bottom sheet dragging in [`TripContentSheet.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/TripContentSheet.tsx), touch events fired at up to 120 Hz on ProMotion displays. The initial implementation executed `setTopPercent()` on every single `touchmove` event. 

This forced React to perform reconciliation, virtual DOM diffing, and component re-renders up to 120 times per second. Furthermore, mutating CSS `top` invalidated the layout tree, triggering synchronous layout reflows and continuous GPU clipping mask re-rasterizations due to `border-radius` curves.

### 2. Synchronous WebGL Canvas Readback & Pipeline Stalls
[`TripMapHero.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/TripMapHero.tsx) rendered an interactive OpenFreeMap vector map via MapLibre GL. To dynamically detect whether the map backdrop underneath the status bar was bright or dark, the component registered a continuous `map.on('render')` listener.

On every map render frame, the callback drew the WebGL canvas into an offscreen 2D canvas via `ctx.drawImage()` and called `ctx.getImageData()` to sample pixel luminance. 

In Metal/WebKit architectures, reading pixels from a GPU-backed WebGL buffer into CPU memory (`getImageData`) forces a synchronous CPU-GPU pipeline stall. The GPU must halt command processing, flush its pipeline, and synchronize buffer memory with system RAM before JavaScript can continue. Additionally, configuring `preserveDrawingBuffer: true` prevented the compositor from discarding swap-chain buffers, doubling GPU memory bandwidth.

### 3. Glassmorphism Fragment Shader Saturation
The design system applied `backdrop-filter: blur(28px)` and `blur(24px)` across multiple overlapping elements (the app header, floating navigation tabs, and bottom content sheet). 

On desktop GPUs and high-end Android chipsets, multi-pass separable Gaussian blurs are cheap. On mobile iOS devices, CoreAnimation allocates offscreen scratch buffers for every layer with `backdrop-filter`. When stacked over a live WebGL canvas, the fragment shader workload exceeded the GPU's 16.6ms per-frame rendering budget.

### 4. Continuous `:root` Custom Property Mutations on VisualViewport Scroll
[`nativeShell.ts`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/utils/nativeShell.ts) listened to `window.visualViewport`'s `scroll` event and continuously mutated `--app-vh` on `document.documentElement.style`. 

In WebKit, setting any CSS custom property on the `:root` element invalidates the style resolution cache for the entire document tree. During inertial scrolling, this triggered full-tree style recalculations on every frame.

---

## The Approach: Zero-Reflow Compositor Decoupling

To resolve these bottlenecks without stripping the visual richness of the app, we redesigned the interaction pipeline around hardware-accelerated compositor primitives.

### 1. Direct DOM GPU Transforms (`translate3d`)
We decoupled touch gesture tracking from React's state tree in [`TripContentSheet.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/TripContentSheet.tsx):

```
User Touch Gesture
       │
       ▼
[handleTouchMove] (120 Hz)
       │
       ├── Compute deltaPx with rubber-band resistance
       ├── sheetRef.current.style.transform = `translate3d(0, ${deltaPx}px, 0)`
       ├── scrimRef.current.style.opacity = `${interpolatedOpacity}`
       │
       └── NO React setState() ──> NO component re-render ──> NO layout reflow
       │
Touch Release
       │
       ▼
[handleTouchEnd]
       │
       ├── Calculate fling velocity
       ├── Animate CSS transition to nearest snap point
       └── Reconcile React state (setTopPercent) ONCE on completion
```

By manipulating `style.transform` directly via DOM references:
- Active drag movements execute on the GPU compositor thread using `translate3d`.
- Zero layout reflows occur during drag gestures; only compositor properties are updated.
- React state is updated exactly once when the gesture completes.

### 2. Elimination of WebGL Readback & Buffer Preservation
In [`TripMapHero.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/TripMapHero.tsx):
- Removed `canvasContextAttributes: { preserveDrawingBuffer: true }`, allowing the browser GPU to utilize double-buffering and buffer discards.
- Removed the continuous `sampleHeaderLuminance` readback loop (`ctx.getImageData`).
- Replaced dynamic canvas pixel sampling with static high-contrast text shadows and predictable gradient scrims over the map header.

### 3. Glass Shader Calibration
In [`src/index.css`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/index.css):
- Reduced blur radii from 28px/24px down to 14px/16px. This reduced GPU fragment shader passes by over 50% while preserving a rich glassmorphism texture.
- Cleaned up non-composited CSS properties from `will-change`, retaining only `will-change: transform, opacity`.
- Added WebKit-specific queries to disable expensive scrolling alpha masks on iOS devices:
  ```css
  @supports (-webkit-touch-callout: none) {
    .tab-pane {
      -webkit-mask-image: none !important;
      mask-image: none !important;
    }
  }
  ```

### 4. Decoupled Viewport Sizing
In [`src/utils/nativeShell.ts`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/utils/nativeShell.ts):
- Removed the `scroll` event listener from `visualViewport`.
- Retained only `resize` and `orientationchange` listeners to update `--app-vh` when the soft keyboard appears or device orientation flips.

---

## Trade-offs Accepted

| Trade-off | Rationale |
|-----------|-----------|
| **Static Header Scrim vs. Dynamic Pixel Luminance** | Giving up dynamic per-pixel header tone detection over the map was necessary to eliminate the fatal WebGL-CPU pipeline stall. High-contrast text shadows ensure readability over all map styles. |
| **DOM Bypass During Active Drag** | Bypassing React state during drag gestures requires maintaining synchronization between DOM styles and React refs. This complexity was accepted because it is the only way to achieve 120 FPS gestures on mobile WebKit. |
| **14px Blur Radius vs. 28px Blur** | While 28px blur creates a softer diffusion, 14px blur requires half the fragment shader computations and looks visually indistinguishable on high-density Retina displays. |

---

## Related Documentation

- [Reference: Gesture & Sheet System](reference-gesture-and-sheet-system.md)
- [Explanation: Navigation & Offline Fixes](explanation-navigation-and-offline-fixes.md)
- [Reference: Design System](reference-design-system.md)
