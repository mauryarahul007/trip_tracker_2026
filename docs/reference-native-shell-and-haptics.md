# Reference: Native Shell & Micro-Haptics Integration

This document provides technical reference for the native mobile shell bridge, safe-area inset measurement probes, keyboard avoidance handlers, and multi-tier haptic feedback architecture in Trip Tracker 2026.

---

## 1. Micro-Haptics System (`haptics.ts`)

Source: [`src/utils/haptics.ts`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/utils/haptics.ts)

### Haptic Feedback Preferences

Users can configure their desired vibration intensity in Settings. Preferences are persisted in `localStorage` under the key `tt_haptic_preference`:

```typescript
export type HapticPreference = 'standard' | 'subtle' | 'off';
```

| Preference | Scaling Factor | Behavior |
|------------|----------------|----------|
| `'standard'` | `1.0` | Default crisp feedback on actions, checklists, and milestones. |
| `'subtle'` | `0.5` | Damped, gentle vibrations for quiet environments. |
| `'off'` | `0.0` | Completely suppresses all vibration calls. |

### Haptic Profiles & Vibration Signatures

```typescript
export function triggerHaptic(
  type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' = 'light'
): void
```

| Type | Target Action | Vibration Pattern (Standard) | Vibration Pattern (Subtle) |
|------|---------------|------------------------------|----------------------------|
| `'light'` | Tab navigation, checklist ticks, slider snap | `8 ms` | `4 ms` |
| `'medium'` | Card swiping, dialog opening, copy confirmation | `16 ms` | `8 ms` |
| `'heavy'` | Settle debt confirmation, milestone celebration | `28 ms` | `14 ms` |
| `'success'` | 100% packing complete, expense recorded | `[10ms, 35ms, 15ms]` | `[5ms, 20ms, 8ms]` |
| `'warning'` | Delete expense, discard changes, undo alert | `[20ms, 50ms, 20ms]` | `[12ms, 30ms, 12ms]` |

---

## 2. Native Shell Bridge (`nativeShell.ts`)

Source: [`src/utils/nativeShell.ts`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/utils/nativeShell.ts)

The native shell bridges the web codebase with mobile operating system chrome across Android and iOS using Capacitor plugins.

### Safe Area Inset Probe (`applySafeAreaVars`)
iOS WKWebView reports `env(safe-area-inset-*)` as `0px` on initial DOM paint and only resolves physical notch and home-indicator geometries ~300–500ms later. CSS rules that evaluate `env()` directly at parse time freeze with `0px`.

To ensure consistent geometry:
1. `applySafeAreaVars()` appends a zero-opacity DOM probe reading `env(safe-area-inset-*)`.
2. The resolved computed padding values are written to `:root` CSS custom properties:
   - `--safe-top`
   - `--safe-bottom`
   - `--safe-left`
   - `--safe-right`
3. All UI layouts (headers, floating tab bars, bottom sheets) reference these custom properties rather than raw `env()` calls.

### Dynamic Viewport Sizing (`applyViewportHeightVar`)
Mobile Safari's `100dvh` unit does not reliably recalculate when the document has `overflow: hidden`. 

To prevent layout clipping:
1. The shell observes `window.visualViewport`'s `resize` and `orientationchange` events.
2. The live viewport height (`vv.height ?? window.innerHeight`) is assigned to `--app-vh`.
3. To avoid document-wide style invalidation during momentum scrolling, the shell does **not** attach listeners to the `scroll` event.

### Keyboard Avoidance Engine (`setUpKeyboardAvoidance`)
Capacitor’s Keyboard plugin is initialized with `resize: 'none'` in `capacitor.config.ts`, granting full manual control over form positioning.

When the soft keyboard opens:
```
Keyboard Will Show Event (keyboardHeight)
   │
   ├── Set :root --keyboard-height = ${keyboardHeight}px
   ├── Find scrollable ancestor: findScrollParent(document.activeElement)
   ├── Apply paddingBottom = ${keyboardHeight}px to scroll container
   └── Smooth-scroll active field into center view after 50ms delay
```

When the keyboard dismisses:
```
Keyboard Will Hide Event
   │
   ├── Set :root --keyboard-height = 0px
   └── Reset paddingBottom on target scroll container
```

---

## Related Documentation

- [Explanation: Mobile Compositor & WebKit Performance Architecture](explanation-mobile-compositor-and-webkit-performance.md)
- [Reference: Gesture & Sheet System](reference-gesture-and-sheet-system.md)
- [How to Set Up Codemagic](howto-codemagic-setup.md)
