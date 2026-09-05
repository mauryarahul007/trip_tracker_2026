# Reference: Trip Wrapped & Milestone Analytics Engine

This document provides the technical specification, data interfaces, classification heuristics, and export pipeline for the Trip Wrapped recap engine (`TripWrappedModal`) in Trip Tracker 2026.

---

## Component Interface: `TripWrappedModal`

Source: [`src/components/TripWrappedModal.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/TripWrappedModal.tsx)

### Props

```typescript
interface TripWrappedModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  expenses: Expense[];
  members: Member[];
  categories: Category[];
}
```

| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | `boolean` | Controls modal visibility. Mounts the focus trap and locks body scrolling when `true`. |
| `onClose` | `() => void` | Callback triggered when the user dismisses the story or taps the close button. |
| `trip` | `Trip` | The active trip entity containing dates, currency, and name. |
| `expenses` | `Expense[]` | Filtered list of non-deleted expenses for the trip. |
| `members` | `Member[]` | Active and archived members associated with the trip. |
| `categories` | `Category[]` | Category catalog used to map emoji icons and names. |

---

## Core Data Structures

### 1. `TripArchetype`
Defines the thematic identity generated for the trip based on spending distribution:
```typescript
export interface TripArchetype {
  title: string;     // e.g. "The Gourmet Pilgrimage"
  subtitle: string;  // e.g. "80% culinary tastings, 20% walking to the next meal."
  icon: string;      // e.g. "🍕"
  tag: string;       // e.g. "FOODIE PARADISE"
}
```

### 2. `MemberSuperlative`
Defines awards granted to individual members based on transaction patterns:
```typescript
export interface MemberSuperlative {
  memberName: string; // Member display name
  title: string;      // Award title, e.g. "The Chief Investor"
  icon: string;       // Distinct award icon, e.g. "💳"
  note: string;       // Humorous contextual explanation
}
```

### 3. `TripRhythm`
Tracks spending velocity and temporal peaks:
```typescript
export interface TripRhythm {
  peakDay: string;    // Name of weekday with highest spending volume
  pace: string;       // Average spend per calendar day formatted in base currency
  vibeTag: string;    // Qualitative pace rating: "CHILL VIBES" | "STEADY CRUISE" | "LIGHTNING PACE"
}
```

---

## Heuristics & Classification Rules

### Archetype Detection (`getTripArchetype`)
The engine tallies expenses grouped by category ID and identifies the category with the highest aggregate expenditure:

| Dominant Category Keywords / Icon | Generated Title | Tag |
|-----------------------------------|-----------------|-----|
| `food`, `dining`, `cafe`, `🍔` | The Gourmet Pilgrimage | `FOODIE PARADISE` |
| `stay`, `hotel`, `resort`, `🏨` | The High-Luxe Sanctuary | `PURE RELAXATION` |
| `travel`, `flight`, `transport`, `cab`, `✈️`, `🚗` | The Fast-Paced Expedition | `ADVENTURE SEEKERS` |
| `shop`, `souvenir`, `🛍️` | The Collector’s Grand Tour | `RETAIL ODYSSEY` |
| `party`, `club`, `drink`, `🍺` | The Midnight Revelry | `NIGHT VIBES` |
| *(Fallback / Mixed spend)* | The Grand Odyssey | `BALANCED JOURNEY` |
| *(Zero expenses recorded)* | The Clean Slate Odyssey | `NEW HORIZONS` |

### Member Superlative Assignment
1. **The Chief Investor (💳):** Member with the highest total currency amount paid upfront (`sum(expense.amount)` where `paidBy === member.id`).
2. **The Frequent Swiper (⚡):** Member who logged the largest number of distinct transactions, regardless of amount.
3. **The Early Bird Payer (🌅):** Member who paid for the chronologically earliest expense in the trip timeline.
4. **The Feast Sponsor (🍲):** Member who paid the highest aggregate amount specifically in food and dining categories.
5. **The Free Spirit (🎒):** Member who participated in splits but paid for 0 expenses upfront.

### Pace & Rhythm Calculation
- **Daily Pace:** `totalSpend / max(1, durationInDays)`.
- **Vibe Classification:**
  - `< ₹1,000 / $20 per day`: `CHILL VIBES`
  - `₹1,000 – ₹5,000 / $20 – $100 per day`: `STEADY CRUISE`
  - `> ₹5,000 / $100 per day`: `LIGHTNING PACE`

---

## Story Slides & State Machine

The presentation is structured as a 5-step interactive story:

```
[ Slide 1: Welcome & Total Spend ]
                │
                ▼ (Tap Right / 5s Auto-advance)
[ Slide 2: Category Breakdown & Archetype ]
                │
                ▼
[ Slide 3: Peak Spend Day & Rhythm ]
                │
                ▼
[ Slide 4: Member Awards & Superlatives ]
                │
                ▼
[ Slide 5: Grand Finale Board & Canvas Card ]
```

### Story Controls
- **Tap Left 30% of screen:** Previous slide.
- **Tap Right 70% of screen:** Next slide.
- **Hold down:** Pauses auto-advance timer.
- **Swipe Down:** Dismisses modal.
- **Theme Switcher:** Toggles the final card between Dark and Light palette.

---

## Canvas Export & Sharing Pipeline

On Slide 5, the user can download or share a high-resolution summary image:
1. The DOM elements of the summary card are measured and projected onto an offscreen HTML5 `<canvas>` element (1080x1920 portrait 9:16 aspect ratio).
2. Canvas renders background gradients, typography, member award badges, and total spend statistics.
3. If `navigator.share` and `navigator.canShare({ files })` are supported (iOS Safari and Android Chrome), the canvas exports to a PNG `Blob` and opens the native OS share sheet.
4. If native sharing is unsupported, the blob triggers an automatic `<a download="trip-wrapped.png">` file download.

---

## Related Documentation

- [How to Generate and Share Trip Wrapped](howto-generate-and-share-trip-wrapped.md)
- [Reference: Charts & Analytics](reference-analytics.md)
- [Reference: Design System](reference-design-system.md)
