# iOS & WebKit Defect Catalogue (Flutter Acceptance Criteria)
**Version:** 1.0.0  
**Baseline Source:** `BUGS.md`, `bugs/bugs.json`, `docs/explanation-*.md`  
**Purpose:** Ensure native Flutter implementation permanently resolves the historical WebKit/Capacitor defect classes on iOS. Re-verified during Phase 12 QA.

---

## 1. Viewport & Virtual Keyboard Defects

### DEF-01: Virtual Keyboard Displacing Screen Layout (BUG-214)
- **Historical WebKit Issue:** On iOS WKWebView, focusing an input inside the bottom sheet caused the whole document body to scroll up, displacing the map and persistent header off-screen.
- **Root Cause:** Safari's visualViewport panning behavior when focused inputs are near the bottom of the viewport.
- **Flutter Native Acceptance Check:**
  - `Scaffold(resizeToAvoidBottomInset: true)` must resize the active sheet or view container without scrolling the root header or background elements off-screen.
  - Tapping a text field inside a modal bottom sheet (`AppSheet`) or chat composer smoothly animates the view upwards by exactly `MediaQuery.of(context).viewInsets.bottom`.
  - The root app bar and ambient chrome remain firmly pinned at the top.

### DEF-02: Keyboard Covering Composer on Focus (BUG-213)
- **Historical WebKit Issue:** Resizing the bottom sheet synchronously inside an `onFocus` event caused WebKit to abort keyboard presentation, flashing the map and closing the keyboard.
- **Root Cause:** WebKit cancels active keyboard transition if the focused element's ancestor layout dimensions change in the same event tick.
- **Flutter Native Acceptance Check:**
  - In `TripChatPanel`, when the chat input gains focus, the keyboard slides in cleanly at 60fps.
  - The message list scrolls down to reveal the latest message and composer above the keyboard.
  - The keyboard never flickers, stutters, or auto-dismisses upon focus.

### DEF-03: Viewport Auto-Zoom on Input Focus (BUG-211)
- **Historical WebKit Issue:** Text inputs with font size smaller than 16px triggered WebKit's automatic viewport zoom on iOS, causing layout skew and horizontal panning.
- **Flutter Native Acceptance Check:**
  - Flutter renders through its own canvas (Impeller) and does not trigger browser auto-zoom regardless of font size.
  - Form field typography must adhere strictly to design tokens (14sp/16sp) with zero visual viewport scaling when focused.

### DEF-04: Home Bar / Safe Area Clipping (BUG-011, BUG-028)
- **Historical WebKit Issue:** `100vh` on mobile Safari caused bottom navigation tabs, action sheets, and toasts to be hidden under the home indicator pill or dynamic island.
- **Flutter Native Acceptance Check:**
  - `SafeArea` must wrap all screen scaffolds, floating action buttons, bottom bars, and toast hosts.
  - Minimum bottom clearance of `MediaQuery.paddingOf(context).bottom` is preserved across all iPhones (including iPhone 14/15/16 Pro Dynamic Island).

---

## 2. Rendering, Compositing & Animation Defects

### DEF-05: Compositor Lag with Stacked Blurs (BUG-228)
- **Historical WebKit Issue:** CSS `backdrop-filter: blur(...)` combined with CSS animations on iOS WKWebView overwhelmed the CoreAnimation compositor, causing frame drops below 20fps.
- **Flutter Native Acceptance Check:**
  - Glassmorphic card surfaces and bottom sheets use Flutter's `BackdropFilter` or tinted surface containers.
  - Impeller metal backend delivers a steady 60fps / 120fps (ProMotion) during list scrolling and sheet dragging on iOS 15+.
  - No hitching or dropped frames when dragging sheets over maps or list cards.

### DEF-06: Trip Stack 3D Transform Hitching (BUG-230, BUG-244)
- **Historical WebKit Issue:** Dragging cards in `TripStack` with 3D rotations caused WebKit memory churn and hitchy transitions on iPhones.
- **Flutter Native Acceptance Check:**
  - `TripStack` card drag gestures are implemented using `GestureDetector` / `Transform` with hardware-accelerated matrix transforms.
  - Dismissal swiping and stack cycling maintain 60fps smoothness with spring physics (`ClampingScrollPhysics` / `SpringSimulation`).

---

## 3. Gestures & Touch Target Defects

### DEF-07: Gesture Contention: Horizontal Chips vs Vertical Sheet Drag
- **Historical WebKit Issue:** Swiping horizontally across filter chips or category tags inadvertently triggered the parent vertical drag-to-dismiss gesture on the bottom sheet.
- **Flutter Native Acceptance Check:**
  - Horizontal chip rows (`SingleChildScrollView(scrollDirection: Axis.horizontal)`) take gesture precedence over vertical sheet drag controllers.
  - Sheet drag controller only claims gestures that have a vertical component exceeding `kTouchSlop` with vertical velocity > horizontal velocity.

### DEF-08: Touch Target Accessibility & Keyboard Navigation (BUG-111, BUG-112)
- **Historical WebKit Issue:** Interactive cards and icon buttons had sub-24px tap areas and missing keyboard semantics.
- **Flutter Native Acceptance Check:**
  - Every interactive widget enforces a minimum touch target size of **48x48 dp** (`kMinInteractiveDimension`).
  - Screen reader semantics (`Semantics` / `Tooltip`) exist for all icon-only buttons, close glyphs, and modal dialogs.
  - Escape key / hardware back button consistently dismisses modals without data loss.

---

## 4. Realtime & Socket Lifecycle Defects

### DEF-09: Duplicate Channel Subscriptions & Memory Leaks (BUG-146, BUG-223)
- **Historical WebKit Issue:** Rapid switching between trip tabs created duplicate Realtime socket topic registrations, leading to unhandled message floods and client crashes.
- **Flutter Native Acceptance Check:**
  - Riverpod subscription providers automatically clean up Realtime channels (`supabase.removeChannel`) on `ref.onDispose()`.
  - Resuming app from background verifies active channel states and performs seamless reconnect without creating redundant socket connections.
