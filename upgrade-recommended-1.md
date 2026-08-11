# Phase 2 Upgrade Recommendations

Here is the list of 15 functional, visual, and architectural enhancements recommended for Phase 2 of Trip Tracker 2026.

---

## 1. UX & Functional Enhancements

### 1. Multi-Currency Transactions with Offline Exchange Rates
* **Description:** Allow users to record individual expenses in foreign currencies (e.g., paying for lunch in EUR while the trip base currency is INR).
* **Implementation:** Add a currency picker to the `ExpenseForm` and store the transaction currency + exchange rate. Periodically fetch and cache a daily rates table in IndexedDB for offline conversions.

### 2. Receipt OCR (Optical Character Recognition) Scanner
* **Description:** Auto-populate expense fields (amount, date, title) from uploaded receipt photos.
* **Implementation:** Integrate a lightweight client-side library (like `tesseract.js`) or a backend serverless function (Taggun / Google Cloud Vision API) to extract fields instantly.

### 3. Google Sheets Direct Export & Cloud Sync
* **Description:** Allow users to export and auto-sync trip transaction histories directly to a shared Google Sheet.
* **Implementation:** Integrate Google API client library, request scope permission, and push expense row data on changes to a dynamically created sheet.

### 4. Custom Categories and Icon Creator
* **Description:** Replace the hardcoded category list with an interactive settings panel allowing users to define custom categories.
* **Implementation:** Allow users to select background colors, pick icons (from Lucide React), and delete/merge historical categories with a migration prompt.

### 5. Multi-Member Travel Budgets & Alerts
* **Description:** Establish trip budgets (total or category-wise) with progress indicators and warnings.
* **Implementation:** Let creators set spending limits, and add visual indicator rings (glassmorphic gauge bars) that shift from green to warning yellow/red at 80% and 100% capacity.

### 6. Interactive Audit Trail for Settlements
* **Description:** Clarify the exact calculation behind simplified settlements.
* **Implementation:** Add a "Show Calculation" dropdown under each transaction settlement detailing exactly which expenses contributed to that debt, helping members trust the algorithm.

### 7. Custom Settlement Routing Controls
* **Description:** Allow users to prioritize specific payment paths (e.g., "Always pay via Rahul" or "Skip Priya for cash transactions").
* **Implementation:** Update the `calculateSettlements` matrix minimizer to accept route constraint weights, modifying path flows during simplification.

### 8. Trip Checklists & Packing Lists
* **Description:** Add shared collaborative checklists (e.g., "Tent", "First aid kit", "Tickets") to keep travelers aligned before the trip.
* **Implementation:** Create a new Zustand slice and database tables for checklist items, support assigning items to specific members, and track completion progress.

---

## 2. Advanced Visuals & Analytics

### 9. Map & Route Visualization
* **Description:** Track geographic spending hotspots and render the trip route on an interactive map.
* **Implementation:** Allow optional geo-tagging on expenses using browser location APIs. Render a Mapbox/Leaflet cluster map in the Analytics tab.

### 10. Calendar Layout View
* **Description:** Display expenses on a calendar grid to help users visualize daily schedules, accommodation blocks, and flight timelines.
* **Implementation:** Add a toggle inside `ExpenseList` to switch from the list view to a clean monthly/weekly grid layout, clicking dates to view transactions.

### 11. Custom PDF & CSV Rich Exporter
* **Description:** Generate premium, styled PDF invoice summaries for printing or emailing to members.
* **Implementation:** Use `jspdf` or HTML canvas rendering to export formatted statements, group breakdowns, and signature fields.

### 12. Smart Title-to-Category Auto-Tagging
* **Description:** Auto-categorize expenses as the user types based on key matching (e.g., "Uber" -> Transport, "McDonalds" -> Food).
* **Implementation:** Implement a client-side keyword mapper or fuzzy search match in the title input onChange handler to auto-select matching categories.

---

## 3. Architecture & Offline Sync

### 13. Peer-to-Peer (P2P) Offline WebRTC Syncing
* **Description:** Allow members on flights, hikes, or remote trains to sync trip logs without active internet connections.
* **Implementation:** Wire WebRTC connections using a library like `Yjs` or standard RTCPeerConnection to merge Zustand sync queues directly over local Wi-Fi / Bluetooth.

### 14. Recurring / Subscription Splitting
* **Description:** Support recurring items (e.g., daily car rentals, weekly hotels, or monthly shared subscriptions).
* **Implementation:** Add schedule configurations to expenses. Trigger automatic postings or notifications on scheduled dates using background workers.

### 15. Reusable Trip Templates
* **Description:** Save customized categories, standard members, and recurring checklist templates for future getaways.
* **Implementation:** Expose a "Save as Template" action in settings, allowing one-click initialization of new trips preloaded with baseline structures.
