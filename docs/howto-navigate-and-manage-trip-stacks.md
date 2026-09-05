# How to Navigate and Manage Trip Stacks

This guide walks you through browsing your trip catalog using the passport card stack, switching trips via gestures or keyboard shortcuts, and using the bottom slide launcher in Trip Tracker 2026.

---

## Prerequisites

- Trip Tracker installed as a PWA or open in a modern web browser.
- At least one trip created or loaded via the **"Load Demo Trip"** option in Settings.

---

## Steps

### 1. Browsing Trips via Touch Gestures
On the main home screen:
1. **Swipe Left or Right** anywhere on the passport card stack to flip between your active and past trips.
2. The card stack animates with physical 3D perspective depth, bringing the next trip forward.
3. Observe the **pagination dots** directly below the card to see your current index in the catalog.

### 2. Browsing Trips via Keyboard
If using a desktop computer or connected physical keyboard:
1. Press the **Left Arrow (`←`)** key to navigate to the previous trip.
2. Press the **Right Arrow (`→`)** key to advance to the next trip.
3. Press **Enter** to open the currently focused trip.

### 3. Opening a Trip
1. Tap directly on the passport card to enter the trip dashboard.
2. The card transitions smoothly into the interactive map view and bottom content sheet.

### 4. Managing Trip Actions
On the top right of each passport card, tap the **More Options (`⋮` or `···`)** button to access trip actions:
- **Edit Trip Details:** Update trip title, departure and return dates, and base currency.
- **Freeze Trip:** Lock the trip into read-only mode to prevent accidental edits once all debts are settled.
- **Export to CSV:** Download an Excel-compatible spreadsheet of all expenses and settlements.
- **Delete Trip:** Move the trip to the recycle bin (supported by a 5-second undo toast).

### 5. Using the Slide-to-Action Launcher
Anchored at the bottom of the home screen is the **Trip Slide Launcher**:
- **Slide Right to Create:** Drag the thumb slider all the way to the right to trigger the **"+ New Trip"** modal.
- **Slide Left to Join:** Drag the thumb slider to the left to open the **"Join with Code"** screen.
- Releasing the slider before reaching either threshold springs the thumb back to center with a light haptic tap.

---

## Verification

To verify that the trip stack is operating correctly:
1. Swipe rapidly across 3 cards. The cards should track smoothly without horizontal page jumping or vertical scrolling.
2. Tap the bottom slider and drag it 80% to the right; releasing it should open the New Trip dialog.
3. Press the browser or hardware **Back** button. The dialog should close, returning focus cleanly to the card stack.

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Swiping horizontally also scrolls the webpage | Browser pull-to-refresh or swipe gesture conflict | The app enforces `overscroll-behavior: none` and `touch-action: pan-y`. If running inside Safari, ensure the page is installed to home screen (PWA mode) for full-screen touch isolation. |
| Slider feels sluggish or doesn't snap | Low power mode or background thermal throttling | Check your device's battery saver mode. Trip Tracker disables non-composited animations in battery saver to conserve CPU cycles. |

---

## Related Documentation

- [Explanation: Trip Stack & Cross-Platform Viewport Architecture](explanation-trip-stack-and-viewport-architecture.md)
- [How to Record an Expense](howto-record-expense.md)
- [Reference: Design System](reference-design-system.md)
