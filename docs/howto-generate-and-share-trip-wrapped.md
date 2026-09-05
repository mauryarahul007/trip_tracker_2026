# How to Generate and Share Trip Wrapped

This guide walks you through launching your personalized trip recap ("Trip Wrapped"), navigating the story cards, toggling visual themes, and exporting a shareable graphic card in Trip Tracker 2026.

---

## Prerequisites

- An active trip with at least two logged expenses and two or more travelers.
- Trip Tracker open in an installable PWA or modern web browser.

---

## Steps

### 1. Launching Trip Wrapped
You can open Trip Wrapped from two places:
- **Method A (Header Menu):** Open your trip, tap the header dropdown menu (`▼` next to the trip name), and select **"Trip Wrapped Recap"** ✨.
- **Method B (Command Palette):** Press **`Cmd+K`** (macOS) or **`Ctrl+K`** (Windows), type `wrapped`, and press **Enter**.

### 2. Navigating the Story Slides
Once launched, the story starts auto-playing like an Instagram/WhatsApp story:
1. **Advance Slide:** Tap the right side of the screen or press the **Right Arrow (`→`)** key.
2. **Go Back:** Tap the left side of the screen or press the **Left Arrow (`←`)** key.
3. **Pause Story:** Press and hold your finger anywhere on the screen (or hold the spacebar) to pause the timer and read the stats.

### 3. Reviewing Awards and Insights
As the story progresses, observe:
- **Slide 2:** Your trip's detected **Archetype** (e.g. *The Gourmet Pilgrimage* or *The High-Luxe Sanctuary*).
- **Slide 3:** The **Daily Rhythm** showing the single biggest spending day of your expedition.
- **Slide 4:** **Member Superlatives** showing funny titles (e.g. *The Chief Investor*, *The Feast Sponsor*, or *The Frequent Swiper*).

### 4. Customizing the Recap Card
On the final slide (Slide 5):
1. Tap the **Sun / Moon** icon in the top right of the card to toggle between **Dark Mode** and **Light Mode** styling.
2. Review the consolidated summary card showing trip dates, member superlatives, total spent, and category breakdown.

### 5. Sharing or Downloading the Card
1. Tap the **"Share Recap"** button.
2. On mobile devices with Web Share support, the native share drawer will open, allowing you to share the image directly to Instagram Stories, WhatsApp, iMessage, or AirDrop.
3. On desktop browsers, the card automatically renders into a high-res PNG and downloads to your computer as `trip-wrapped-[trip-name].png`.

---

## Verification

To verify that the story and canvas generator function as expected:
1. Complete all 5 slides. On Slide 5, you should hear/feel a celebratory milestone haptic and see an interactive confetti burst.
2. Tap the theme toggle button. The background should smoothly switch without restarting the story.
3. Tap "Download Card". Check your downloads folder to verify that the generated image is a crisp 1080x1920 PNG file with legible text.

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Story says "The Clean Slate Odyssey" | No expenses have been logged for this trip yet | Add at least 1–2 expenses with categories to generate meaningful statistics. |
| Share button doesn't open WhatsApp/Instagram | Browser lacks `navigator.share` file support (common in older desktop browsers) | The app automatically falls back to direct PNG download. You can manually drag and drop the downloaded PNG into your chat or story. |
| Story doesn't advance automatically | You may be holding down the screen or mouse button | Release your finger/cursor to allow the 5-second slide timer to resume. |

---

## Related Documentation

- [Reference: Trip Wrapped & Milestone Analytics Engine](reference-trip-wrapped-engine.md)
- [Reference: Charts & Analytics](reference-analytics.md)
- [How to Record an Expense](howto-record-expense.md)
