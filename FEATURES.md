# 🗺️ Trip Tracker 2026 — Comprehensive Features Catalog

> **Application Version:** `v3.14.1`  
> **Total Architectural Decision Records (ADRs):** `157`  
> **Automated Test Coverage:** `48 test suites · 247 unit tests (100% passing)`  
> **Platform Architecture:** Offline-First PWA (React 19 + TypeScript + Vite + Supabase + Capacitor)  
> **Strategic Analysis:** [`docs/product-strategy-and-market-analysis.md`](file:///c:/ProjectsV1/Trip_Tracker_2026/docs/product-strategy-and-market-analysis.md)

---

## 📑 Feature Categories Index

1. [Type 1: Core Expense Management & Split Engine](#type-1-core-expense-management--split-engine)
2. [Type 2: Voice Input & Smart Traveler Intelligence](#type-2-voice-input--smart-traveler-intelligence)
3. [Type 3: Travel Pass Wallet, Flight Radar & Gate Scanner](#type-3-travel-pass-wallet-flight-radar--gate-scanner)
4. [Type 4: Settlements, Multi-Currency & Payments](#type-4-settlements-multi-currency--payments)
5. [Type 5: Trip Planning, Route Stops, Packing & Notes](#type-5-trip-planning-route-stops-packing--notes)
6. [Type 6: Offline-First Architecture, Storage & Sync](#type-6-offline-first-architecture-storage--sync)
7. [Type 7: Mobile Ergonomics, Gestures & Motion Design](#type-7-mobile-ergonomics-gestures--motion-design)
8. [Type 8: Security, Governance & Superadmin Ops Deck](#type-8-security-governance--superadmin-ops-deck)
9. [Type 9: Delighters, Gamification & Visual Memories](#type-9-delighters-gamification--visual-memories)
10. [Milestone Releases & Version Evolution](#milestone-releases--version-evolution)

---

## Type 1: Core Expense Management & Split Engine

| Feature Name | Description & Capabilities | User Impact & Value | Version / ADR | Key Files & Components |
| :--- | :--- | :--- | :--- | :--- |
| **Multi-Mode Split Calculator** | Supports **Equal**, **Exact Amounts**, **Percentage**, and **Custom Weights / Shares** across any subset of trip members or groups. | Eliminates manual math; accommodates complex travel scenarios (couples, non-drinkers, partial shares). | `v1.0.0` (ADR 5, 6) | [`ExpenseForm.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/ExpenseForm.tsx), [`splitCalculator.ts`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/utils/splitCalculator.ts) |
| **Predictive Quick-Chips** | Context-aware expense suggestion chips based on time-of-day (breakfast/metro vs dinner/cab) and frequently logged items ($\ge 2$ times). | 1-tap populates title, category, and shifts focus directly to amount for instant entry. | `v3.14.0` (ADR 156) | [`predictiveExpenses.ts`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/utils/predictiveExpenses.ts), [`ExpenseForm.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/ExpenseForm.tsx) |
| **Duplicate Expense Warning Guard** | 4D heuristic detection (amount within 2%, token title similarity $\ge 0.70$, $\pm 24\text{h}$ proximity, and payer collision). | Prevents double-logging identical bills or shared checks paid by multiple companions; pauses voice auto-submit. | `v3.13.0` (ADR 155) | [`duplicateExpenseDetector.ts`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/utils/duplicateExpenseDetector.ts), [`ExpenseForm.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/ExpenseForm.tsx) |
| **Auto-Tagging & Smart Categorization** | 200+ built-in keywords and brand dictionary automatically inferring trip categories as users type titles. | Zero-effort transaction labeling (e.g. typing "Uber" auto-selects Travel & Transport). | `v1.2.0` (ADR 19) | [`categoryHelper.ts`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/utils/categoryHelper.ts) |
| **Expense Geotagging & Places** | Coordinates, place names, and map markers attached to expenses via GPS or manual place search. | Pinpoints exact food stalls, hotels, and attractions on the interactive journey map. | `v1.3.0` (ADR 20, 22) | [`geolocation.ts`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/utils/geolocation.ts), [`TripJourneyMap.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/TripJourneyMap.tsx) |
| **Recycle Bin (Soft-Delete)** | 24-hour staging area for deleted expenses with full instant restore capability. | Protects against accidental deletions; maintains audit trail for group ledgers. | `v1.1.0` (ADR 15) | [`SettingsRecycleBinScreen.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/settings/SettingsRecycleBinScreen.tsx) |
| **Draft Auto-Recovery** | `sessionStorage`-backed draft engine that preserves in-progress expense forms across accidental app navigation. | Never lose half-entered itemizations or receipts when interrupted on mobile. | `v3.1.0` (ADR 112) | [`ExpenseForm.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/ExpenseForm.tsx) |
| **Itemized Receipt Splitting** | Multi-item breakdown with line-item participant assignment and tax/tip auto-proration. | Solves complicated restaurant bills where companions order different dishes. | `v3.3.0` (ADR 116) | [`ExpenseReviewModal.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/ExpenseReviewModal.tsx) |

---

## Type 2: Voice Input & Smart Traveler Intelligence

| Feature Name | Description & Capabilities | User Impact & Value | Version / ADR | Key Files & Components |
| :--- | :--- | :--- | :--- | :--- |
| **Hands-Free Voice Quick-Add** | Web Speech API integration with 3-second auto-save countdown timer, interim transcripts, and acoustic pulse feedback. | Allows hands-free logging while walking, driving, or carrying luggage in noisy streets. | `v3.11.2` (ADR 152) | [`SmartExpenseQuickAddModal.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/SmartExpenseQuickAddModal.tsx) |
| **NLP Quick Expense Parser** | Parses natural spoken phrases like *"500 coffee"*, *"coffee 500"*, *"500/- for lunch"*, and Hinglish numbers (*"dedh sau"*, *"dhai hazar"*). | Strips prepositions (`for`, `on`, `ka`, `ki`, `ke`) and isolates title, price, and category cleanly. | `v3.14.1` (ADR 157) | [`expenseQuickParser.ts`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/utils/expenseQuickParser.ts) |
| **Dialect Engine** | Switchable speech dialect acoustic models: Indian English (`en-IN`), US English (`en-US`), UK English (`en-GB`), and Hindi (`hi-IN`). | Guarantees high phonetic accuracy across regional accents without dropping words. | `v3.11.3` (ADR 153) | [`SmartExpenseQuickAddModal.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/SmartExpenseQuickAddModal.tsx) |
| **On-Device Receipt OCR** | Tesseract.js / Canvas-based on-device text and total-amount recognition directly from phone camera photos. | Scans paper receipts offline without sending images to third-party cloud servers. | `v3.4.0` (ADR 117, 154) | [`receiptOcr.ts`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/utils/receiptOcr.ts) |
| **Client-Side Image Compressor** | Multi-step client-side canvas compression downscaling receipts and passes to $\le 300\text{KB}$. | Fast uploads and compact local IndexedDB cache footprint. | `v3.0.0` (ADR 86) | [`imageCompressor.ts`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/utils/imageCompressor.ts) |

---

## Type 3: Travel Pass Wallet, Flight Radar & Gate Scanner

| Feature Name | Description & Capabilities | User Impact & Value | Version / ADR | Key Files & Components |
| :--- | :--- | :--- | :--- | :--- |
| **"Next Up" Dynamic Travel Capsule** | Pinned Dynamic Island widget at the top of the expense ledger tracking imminent flights and trains within 36 hours. | Shows countdowns (*"Boarding in 45m"*, *"Departs in 3h"*), seat, gate, terminal, and 1-tap pass shortcuts. | `v3.14.0` (ADR 156) | [`NextUpTravelCapsule.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/NextUpTravelCapsule.tsx) |
| **High-Contrast Optical Gate Scanner** | Inverted `#FFFFFF` retina QR/barcode pass viewer engineered specifically for optical security turnstiles. | Integrates Screen Wake Lock API to keep screen bright in airport boarding lines; guaranteed offline. | `v3.14.0` (ADR 156) | [`PassScannerModal.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/PassScannerModal.tsx) |
| **Live Flight & PNR Status Radar** | Automatic carrier identification (IndiGo, Air India, Akasa, Emirates, etc.) and Indian Railways 10-digit PNR detection. | Direct deep links with pre-filled ICAO callsigns to Flightradar24, FlightAware, Google Flight Status, ConfirmTkt, and RailYatri. | `v3.13.0` (ADR 155) | [`travelStatusService.ts`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/utils/travelStatusService.ts), [`LiveTravelStatusModal.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/LiveTravelStatusModal.tsx) |
| **Universal Travel Pass Wallet** | Digital ticket organizer supporting multi-leg routes, passenger splitting, sorting by leg/member/date, and PDF attachments. | Consolidates airline boarding passes, train tickets, bus passes, and hotel vouchers in one unified tab. | `v3.4.0` (ADR 117, 120, 126) | [`TravelPassWalletView.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/TravelPassWalletView.tsx) |
| **E-Ticket PDF & Image Parser** | Extracts flight codes, departure dates, times, origins, destinations, passenger names, and seats from uploaded PDF booking passes. | Converts messy PDF confirmations into structured ticket cards with a single tap. | `v3.4.2` (ADR 119, 122) | [`pdfExtractor.ts`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/utils/pdfExtractor.ts), [`passParser.ts`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/utils/passParser.ts) |
| **Pass Attachment IndexedDB Cache** | Dedicated high-capacity IndexedDB store for ticket attachments with self-healing quota recovery. | Access boarding pass PDFs and barcode images at 35,000 feet without cellular data. | `v3.4.6` (ADR 123) | [`passAttachmentStore.ts`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/services/passAttachmentStore.ts) |

---

## Type 4: Settlements, Multi-Currency & Payments

| Feature Name | Description & Capabilities | User Impact & Value | Version / ADR | Key Files & Components |
| :--- | :--- | :--- | :--- | :--- |
| **Minimizing Settlement Engine** | Greedy algorithm that computes the minimal number of peer-to-peer transactions required to settle a trip. | Turns messy group debts into 2 or 3 direct payments instead of a dozen circular transfers. | `v1.0.0` (ADR 1) | [`settlement.ts`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/utils/settlement.ts), [`BalancesTab.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/BalancesTab.tsx) |
| **1-Tap UPI Payment Deep Links** | Generates standardized `upi://pay` links pre-populating payee UPI VPA ID, exact settlement amount, and trip note. | Instantly launches Google Pay, PhonePe, Paytm, or BHIM on Android/iOS without entering numbers. | `v2.0.0` (ADR 88) | [`upiLinks.ts`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/utils/upiLinks.ts) |
| **Dynamic Client-Side QR Generator** | Pure client-side SVG/Canvas QR engine creating scannable UPI settlement codes and trip invite links. | Lets companions settle up in person by pointing their phone camera at the screen. | `v2.0.0` (ADR 87, 88) | [`qrGenerator.ts`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/utils/qrGenerator.ts) |
| **Live Multi-Currency FX Engine** | Real-time exchange rate converter supporting 160+ fiat currencies with offline fallback rate lock. | Seamlessly log expenses in foreign currencies (e.g. USD, EUR, THB, JPY) while converting to the trip base currency. | `v3.4.0` (ADR 117) | [`currencyFx.ts`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/utils/currencyFx.ts), [`FxRatesModal.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/FxRatesModal.tsx) |
| **Cross-Trip Global Balance** | Aggregated net balance dashboard across all active and archived trips associated with a user profile. | Know your overarching balance across all friend circles in one consolidated view. | `v3.9.1` (ADR 142) | [`SettingsProfileScreen.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/settings/SettingsProfileScreen.tsx) |
| **Guarded Trip Settlement Checkpoint** | Strict validation preventing trip closure and archiving until all balances are fully settled. | Avoids closing trips with unresolved lingering debts. | `v2.4.0` (ADR 71, 72) | [`SettingsView.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/SettingsView.tsx) |

---

## Type 5: Trip Planning, Route Stops, Packing & Notes

| Feature Name | Description & Capabilities | User Impact & Value | Version / ADR | Key Files & Components |
| :--- | :--- | :--- | :--- | :--- |
| **Smart Weather & Flight Packing Assistant** | Contextual checklist generator analyzing destination weather forecasts, trip duration, transport type, and airline luggage rules. | Pre-fills luggage items (warm layers, power banks, rain gear, cabin liquid rules $\le 100\text{ml}$). | `v3.10.0` (ADR 147, 148, 149) | [`packingSuggestions.ts`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/utils/packingSuggestions.ts), [`PackingAssistantModal.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/PackingAssistantModal.tsx) |
| **Realtime Weather Engine** | Open-Meteo API integration delivering current temperatures, weather conditions, and forecast icons for trip destinations and stops. | Helps travelers plan daily itineraries and wear appropriate clothing. | `v2.6.0` (ADR 80, 82) | [`weatherService.ts`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/services/weatherService.ts) |
| **Collaborative Checklist & Notes Hub** | Unified 5th bottom navigation tab with task checkboxes, category tagging, search, and rich notes. | Replaces separate note apps; coordinate packing, shared equipment, and trip bookings. | `v2.8.0` (ADR 92) | [`ChecklistNotesTab.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/ChecklistNotesTab.tsx) |
| **Checklist Focus Mode & Confetti Burst** | Focused single-item completion mode with canvas confetti burst celebration upon checking off items. | Gamifies packing and pre-trip preparation. | `v3.0.1` (ADR 104) | [`ChecklistNotesTab.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/ChecklistNotesTab.tsx) |
| **Interactive Route Stops Itinerary** | Multi-stop itinerary manager with arrival/departure dates, re-ordering, and map integration. | Organize multi-city road trips or vacations with clear visual stops. | `v3.0.1` (ADR 101, 102) | [`TripRouteModal.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/TripRouteModal.tsx) |
| **Trip Journey Map** | MapLibre GL vector map rendering geotagged expense pins and route trails. | Interactive geographical memory of where money was spent throughout the trip. | `v1.3.0` (ADR 20) | [`TripJourneyMap.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/TripJourneyMap.tsx) |

---

## Type 6: Offline-First Architecture, Storage & Sync

| Feature Name | Description & Capabilities | User Impact & Value | Version / ADR | Key Files & Components |
| :--- | :--- | :--- | :--- | :--- |
| **Optimistic Zustand Store Mutations** | Local-first state mutations executing immediately in UI while queuing background synchronization. | Zero UI lag or spinners; works instantly even on slow 2G connections or remote trails. | `v1.0.0` (ADR 8, 17) | [`tripStore.ts`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/store/tripStore.ts) |
| **Supabase Cloud Sync & Realtime Channel** | Background PostgreSQL sync channel keeping multiple devices updated in real-time. | Shared trips stay synchronized across all members' phones seamlessly. | `v2.0.0` (ADR 4, 16, 62) | [`tripApi.ts`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/services/tripApi.ts) |
| **Tactile Pull-to-Sync** | Native mobile-grade pull-down gesture with spring physics triggering manual cloud sync. | Gives travelers immediate manual control and confidence over data synchronization. | `v3.1.0` (ADR 112) | [`PullToSync.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/PullToSync.tsx) |
| **Offline Snapshots & Data Backups** | JSON snapshot export/import and offline full-database backup engine with storage visualizer. | Complete user data ownership; safely export or migrate trip history anytime. | `v3.3.0` (ADR 87, 116) | [`OfflineSnapshotModal.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/OfflineSnapshotModal.tsx) |
| **PWA Service Worker Self-Stamping** | Automated build timestamp stamping and cache busting in `sw.js` with instant activation. | Updates download automatically in the background without stale cache lockups. | `v3.4.7` (ADR 124, 131) | [`stampServiceWorker.mjs`](file:///c:/ProjectsV1/Trip_Tracker_2026/scripts/stampServiceWorker.mjs) |

---

## Type 7: Mobile Ergonomics, Gestures & Motion Design

| Feature Name | Description & Capabilities | User Impact & Value | Version / ADR | Key Files & Components |
| :--- | :--- | :--- | :--- | :--- |
| **Tactile Dual-Stage Haptic Swipe Rows** | Swipe-to-edit and swipe-to-delete with vertical dominance lock (cancels gesture if scrolling vertically $>7\text{px}$) and dual vibration ticks. | Buttery smooth mobile list manipulation without accidental deletes while scrolling. | `v3.14.0` (ADR 99, 156) | [`SwipeableRow.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/SwipeableRow.tsx), [`haptics.ts`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/utils/haptics.ts) |
| **3D Trip Card Stack Deck** | Interactive spatial card deck with reactive escalation, velocity flick physics, and elevation shadows. | Tactile, game-like trip switching experience on the home screen. | `v2.5.0` (ADR 79, 83) | [`TripStack.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/TripStack.tsx) |
| **Dynamic Viewport (100dvh) Isolation** | Strict dynamic viewport height calculation preventing iOS Safari bottom bar clipping and Android keyboard overflow. | Ensures all bottom action sheets, buttons, and headers stay perfectly pinned on all devices. | `v1.1.0` (ADR 12, 21) | [`index.css`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/index.css) |
| **WhatsApp-Style Inset Settings** | Grouped inset rounded cell architecture with chevron indicators, subtitles, and icon glow badges. | Clean, instantly familiar settings ergonomics. | `v2.7.0` (ADR 66, 67, 87) | [`SettingsView.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/SettingsView.tsx) |
| **Universal Spotlight Search** | Floating search overlay (`Ctrl+K` / `Cmd+K` or search bar tap) searching expenses, members, notes, and settings. | Jump to any transaction or setting in 2 keystrokes. | `v2.7.0` (ADR 68, 85, 110) | [`CommandPalette.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/CommandPalette.tsx) |
| **Universal Back Navigation** | Unified hardware back button (`PopStateEvent`), Android back, and modal escape key handling. | Natural back navigation that closes active popups rather than exiting the web app. | `v3.4.11` (ADR 128) | [`useHistoryBack.ts`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/utils/useHistoryBack.ts) |

---

## Type 8: Security, Governance & Superadmin Ops Deck

| Feature Name | Description & Capabilities | User Impact & Value | Version / ADR | Key Files & Components |
| :--- | :--- | :--- | :--- | :--- |
| **WebAuthn Biometric Authentication** | FaceID / TouchID / Windows Hello credential registration and login gated by feature flag. | Frictionless, passwordless local biometric security. | `v3.1.0` (ADR 112, 113) | [`webAuthn.ts`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/utils/webAuthn.ts) |
| **Multi-Admin Governance & Protection** | Trip owner immutability, multi-admin roles, and sole-admin deletion guardrails. | Prevents trips from being orphaned or hijacked by malicious/accidental deletion. | `v1.4.0` (ADR 25, 26) | [`adminRole.ts`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/utils/adminRole.ts) |
| **Superadmin Ops Deck Suite** | Mission control dashboard with Heartbeat Radar, Trip Deep Inspector, Multi-Filter Audit Matrix, and Feature Flags. | Complete operational observability and remote triage across the entire platform. | `v2.5.0` (ADR 23, 24, 77) | [`AdminCommandCenterPage.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/admin/AdminCommandCenterPage.tsx) |
| **In-Shell Bug Ledger & Tracker** | Comprehensive issue tracking system with triage columns, bug status lifecycles, and direct diagnostic logs. | Enables rapid reporting and live resolution tracking of bugs directly within the web app. | `v3.8.0` (ADR 140) | [`SuperAdminBugTracker.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/SuperAdminBugTracker.tsx) |
| **Security Hardening (RLS & Quotas)** | Row Level Security policies, anti-bot Cloudflare Turnstile integration, statement timeouts, and MIME whitelisting. | Prevents unauthorized data access, scraping, and storage abuse. | `v3.9.1` (ADR 31, 143) | [`TurnstileWidget.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/TurnstileWidget.tsx) |

---

## Type 9: Delighters, Gamification & Visual Memories

| Feature Name | Description & Capabilities | User Impact & Value | Version / ADR | Key Files & Components |
| :--- | :--- | :--- | :--- | :--- |
| **Trip Wrapped (Year-in-Review)** | Interactive Spotify-style summary of total expenses, top spender, most active day, favorite category, and travel stats. | Fun, shareable post-trip visual memory that friends enjoy looking back on. | `v2.9.0` (ADR 95) | [`TripWrappedModal.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/TripWrappedModal.tsx) |
| **Achievement Badges Engine** | Gamified badge awards (*"Speedy Settler"*, *"Big Spender"*, *"Global Trotter"*, *"Packing Master"*). | Encourages timely settlements and active collaboration through delightful rewards. | `v2.9.0` (ADR 95) | [`achievementBadges.ts`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/utils/achievementBadges.ts) |
| **Photo & Receipt Memory Gallery** | Visual photo wall aggregating all receipts, boarding pass images, and trip photos in a responsive lightbox. | Relive travel highlights and quickly inspect proof-of-purchase images. | `v3.3.0` (ADR 116) | [`TripMediaGalleryModal.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/TripMediaGalleryModal.tsx) |
| **Boarding Pass Hero Card** | Airline-styled boarding pass ticket card with perforated edges, barcode, and transparent tilted passport stamps. | Creates an emotional travel aesthetic that makes the app feel like a real passport wallet. | `v3.7.1` (ADR 138) | [`BoardingPassHeroCard.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/BoardingPassHeroCard.tsx) |
| **Theme System (OLED, Dark, Light)** | Curated color palettes with high-contrast OLED black mode, vibrant cyan accents, and system auto-switch. | Conserves battery on mobile OLED screens; pleasant night-time visibility. | `v1.0.0` (ADR 7) | [`index.css`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/index.css), [`theme.ts`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/utils/theme.ts) |

---

## Milestone Releases & Version Evolution

| Version | Milestone Focus & Major Delivered Capabilities | Date / Era |
| :--- | :--- | :--- |
| **`v1.0.0`** | Initial offline-first core release: multi-split calculation engine, basic member balance minimizer, local storage persistence, and OLED dark mode. | Early 2026 |
| **`v1.5.0`** | Geotagging, MapLibre journey maps, 200+ auto-tagging keyword rules, and multi-admin governance. | Q1 2026 |
| **`v2.0.0`** | WhatsApp-style navigation overhaul, client-side QR generator, 1-tap UPI deep links, and Supabase cloud sync channel. | Mid 2026 |
| **`v2.5.0`** | 3D Trip Card Stack deck, Uber/Revolut spring motion architecture, and Superadmin Ops Deck with Heartbeat Radar. | Mid 2026 |
| **`v3.0.0`** | Major milestone release: Collaborative Checklist & Notes hub, interactive Route Stops modal, and mobile compositor 120 FPS optimization. | Late 2026 |
| **`v3.4.0`** | Travel Utility Suite: Digital Travel Pass & Ticket Wallet, on-device OCR, PDF itinerary parser, and multi-currency FX rates. | Late 2026 |
| **`v3.10.0`** | Smart Weather & Flight Packing Assistant with airline luggage rule inference and season overrides. | Q3 2026 |
| **`v3.13.0`** | Duplicate expense 4D detection guard and Live Flight Radar / Indian Railways PNR tracker. | Q3 2026 |
| **`v3.14.0`** | "Next Up" Dynamic Island travel capsule, high-contrast optical pass scanner, tactile haptic swipe rows, and predictive quick-chips. | September 2026 |
| **`v3.14.1`** *(Current)* | NLP Voice Input parser refinement (Hinglish numbers, trailing punctuation handling) and Settings Help & About cleanup. | September 2026 |
