# Reference: Global Command Palette & Fuzzy Navigation

This document provides technical reference for the global command palette (`CommandPalette`), its keyboard event listeners, fuzzy search indexing, accessibility focus trap, and action dispatch architecture in Trip Tracker 2026.

---

## Component Interface: `CommandPalette`

Source: [`src/components/CommandPalette.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/CommandPalette.tsx)

### Props

```typescript
interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  trip?: Trip;
  trips?: Trip[];
  expenses: Expense[];
  members: Member[];
  categories: Category[];
  onSelectExpense: (expense: Expense) => void;
  onSelectMember: (memberId: string) => void;
  onSelectTrip?: (tripId: string) => void;
  onNewExpense: () => void;
  onCreateTrip?: () => void;
  onOpenWrapped: () => void;
  onOpenSettings: () => void;
  onSwitchTab: (tab: 'expenses' | 'balances' | 'settings' | 'members') => void;
  smartSuggestions?: Array<{
    id: string;
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    action: () => void;
  }>;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | `boolean` | Controls palette visibility. Triggers input autofocus and mounts the focus trap when `true`. |
| `onClose` | `() => void` | Callback to close the palette (fired on `Escape`, click outside backdrop, or action selection). |
| `trip` | `Trip \| undefined` | Currently active trip context. If present, surfaces scoped expenses, members, and actions. |
| `trips` | `Trip[]` | Global catalog of all trips for quick switching. |
| `expenses` | `Expense[]` | Searchable list of expenses for the active trip. |
| `members` | `Member[]` | Searchable list of travelers for the active trip. |
| `categories` | `Category[]` | Category catalog for mapping expense icons. |
| `smartSuggestions` | `Array<...>` | Contextual quick-actions dynamically injected based on app state. |

---

## Keyboard Triggers & Event Handlers

The command palette is registered globally in [`App.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/App.tsx) via a global `keydown` event listener:

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      setIsCommandPaletteOpen((prev) => !prev);
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

### Palette Navigation Shortcuts

| Key | Action |
|-----|--------|
| **`Cmd+K` / `Ctrl+K`** | Toggle Command Palette open or closed from anywhere in the app. |
| **`ArrowDown` (`↓`)** | Move highlight to the next search result. Wraps to top at list end. |
| **`ArrowUp` (`↑`)** | Move highlight to the previous search result. Wraps to bottom at list start. |
| **`Enter`** | Execute the currently highlighted item's action and close palette. |
| **`Escape`** | Close Command Palette immediately without executing actions. |

---

## Search Indexing & Query Resolution

When the user types a query `q`, the palette evaluates and ranks items across five categories:

```
                  User Query String
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   [ Actions ]      [ Trips ]       [ Expenses ]
   - Create Trip    - Goa Trip ☀️   - Dinner (₹1,200)
   - Add Expense    - Japan Tour    - Uber to Airport
   - Trip Wrapped   - Ladakh 2026   - Hotel Booking
        │                │                │
        └────────────────┼────────────────┘
                         ▼
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   [ Members ]       [ Tabs ]      [ Smart Hints ]
   - Rahul           - Expenses     - Settle Rahul
   - Priyam          - Balances     - Export CSV
                         │
                         ▼
                 Ranked Result List
```

### Search Matching Rules
1. **Actions:** Matches action titles and aliases (e.g. typing `"new"` matches *Create New Trip* and *Add Expense*; typing `"recap"` matches *Trip Wrapped*).
2. **Trips:** Substring matching across all trip names and destinations.
3. **Expenses:** Matches expense `title`, numeric `amount`, formatted currency strings, payer member name, and notes.
4. **Members:** Matches member display names and roles.
5. **Tabs:** Direct jumping to `expenses`, `balances`, `members`, and `settings`.

---

## Accessibility & Focus Management

The component integrates with [`useFocusTrap`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/hooks/useFocusTrap.ts):
- When opened, focus is automatically directed to the search input via `setTimeout(() => inputRef.current?.focus(), 50)`.
- Tab keys are trapped inside the modal container, cycling between input and action buttons without escaping into background DOM nodes.
- When closed, focus returns to the previously active trigger element.
- The input carries `role="combobox"`, `aria-expanded={isOpen}`, and `aria-autocomplete="list"`.

---

## Related Documentation

- [How to Record an Expense](howto-record-expense.md)
- [Reference: Design System](reference-design-system.md)
- [Explanation: Navigation & Offline Fixes](explanation-navigation-and-offline-fixes.md)
