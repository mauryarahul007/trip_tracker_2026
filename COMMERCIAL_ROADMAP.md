# 🚀 Commercial Feature Roadmap & Tracking Ledger

*Master tracking document for commercial-grade features, WhatsApp parity, Splitwise FinTech upgrades, and Google Travel utilities for **Trip Tracker 2026**.*

---

## 📊 Summary of Phases & Features

| Phase | Title | Theme | Target | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 06** | **WhatsApp Social & Chat Hub** | Real-time social engagement, emoji reactions, outbox, and Tab-1 elevation | WhatsApp | 🟢 **Completed & Gated (v3.24.0)** |
| **Phase 07** | **Commercial FinTech & Smart Splitting** | Simplify debts toggle, multi-payer bills, shared kitty, 2-step settle handshake | Splitwise & Revolut | 🟢 **Phase 7A Shipped & Gated (v3.24.0)** |
| **Phase 08** | **Smart Travel Concierge & Timeline** | Day-by-day unified itinerary, in-chat @tripbot, Apple/Google Wallet export | Google Travel & Apple Wallet | 📋 **Backlog** |
| **Phase 09** | **Zero-Signal Offline Mesh** | P2P animated QR sync, zero-signal group mesh reconciliation | Offline-First Advantage | 📋 **Backlog** |

---

## 🏗️ Active Feature Requests (Phase 06 & Phase 07)

### 1. Primary Tab-1 Navigation Elevation (`enableChatFirstNav`)
- **Category**: `ui-ux` | **Phase**: `phase6` | **Flag**: `enableChatFirstNav` (Default: `false`)
- **Description**: Elevates Chat from being buried as a 4th sub-tab in Notes to become **Tab 1 (Activity / Chat)** on the primary bottom navigation bar. Notes tab then becomes dedicated to travel preparation (Packing Checklist, Wi-Fi/Travel Notes, Travel Pass Wallet, Document Vault).
- **Fallback**: When disabled, cleanly falls back to the classic 5-tab layout (Summary, Expenses, Members, Notes [with chat]).

### 2. WhatsApp Emoji Reactions & Swipe-to-Reply (`enableChatReactionsAndReplies`)
- **Category**: `collab` | **Phase**: `phase6` | **Flag**: `enableChatReactionsAndReplies` (Default: `false`)
- **Description**: 
  - **Reactions**: Quick emoji picker (👍, ❤️, 😂, 😮, 🙏) on long-press or tap, with clustered reaction chips on bubbles and participant list.
  - **Swipe-to-Reply**: Swiping right on any message quotes it above the input composer with the author's name and text snippet.
  - **Pinned Notices**: Trip admins can pin up to 3 urgent messages (e.g. hotel Wi-Fi password, lobby departure time) into a collapsible sticky notice bar at the top of the chat.

### 3. Offline Chat Outbox with Status Ticks (`enableChatOfflineOutbox`)
- **Category**: `collab` | **Phase**: `phase6` | **Flag**: `enableChatOfflineOutbox` (Default: `false`)
- **Description**: Removes the blocking offline error in chat. Messages composed while offline are stored in an IndexedDB outbox queue. Displays WhatsApp-standard delivery indicators:
  - 🕒 **Clock**: Queued in local outbox (waiting for signal).
  - ✓ **Single Tick**: Successfully persisted to Supabase server.
  - ✓✓ **Double Tick**: Delivered to fellow trip participants.
  - Background auto-drain event reconciles queue when network reconnects.

### 4. "Simplify Debts" Toggle (`enableSimplifyDebtsToggle`)
- **Category**: `splits` | **Phase**: `phase7` | **Flag**: `enableSimplifyDebtsToggle` (Default: `false`)
- **Description**: Splitwise-style settlement switch allowing trip members to choose between:
  - **Simplified Debts (Greedy Netting)**: Minimizes the total number of transfers across all members using greedy flow matching.
  - **Direct Bilateral Debts (Exact Pairs)**: Calculates exact pairwise debts (you pay back the exact person who fronted money for your share, rather than routing through a third party).
  - Includes interactive informational tooltip explaining the algorithmic trade-off.

---

## 📋 Comprehensive Catalog of 12 Commercial Enhancements

### Pillar I: WhatsApp-Grade Social & Collaboration
1. **[FEAT-C01] Primary Chat Navigation (Tab 1)** — Extracted from Notes, elevated to primary social hub.
2. **[FEAT-C02] Emoji Reactions, Swipe-to-Reply & Pinned Notices** — WhatsApp micro-interactions on chat messages.
3. **[FEAT-C03] Offline Chat Outbox with Status Ticks** — 🕒 ➔ ✓ ➔ ✓✓ queue in IndexedDB.
4. **[FEAT-C04] Voice Notes & Audio Memos** — Hold-to-record voice messages in chat and 15s audio explanations on complex bills.
5. **[FEAT-C05] In-Chat Interactive Event Cards** — Auto-post rich interactive transaction bubbles (`💳 Rahul added Dinner`) directly to chat.
6. **[FEAT-C06] In-Chat Natural Language `@tripbot`** — Instant natural-language expense logging via chat commands.

### Pillar II: Splitwise & Revolut FinTech Suite
7. **[FEAT-C07] "Simplify Debts" Toggle** — Switch between Greedy minimization and Direct bilateral debts.
8. **[FEAT-C08] Multi-Payer Expenses ("Multiple People Paid")** — Split the payment among multiple members on a single transaction.
9. **[FEAT-C09] Shared Trip Kitty / Cash Pool ("Trip Pot")** — Upfront group pool funding and deductions for small joint expenses.
10. **[FEAT-C10] Two-Step Settlement Handshake & Payment Proof** — Debtor uploads payment screenshot; creditor confirms receipt.

### Pillar III: Google Travel & Smart Itinerary Hub
11. **[FEAT-C11] Interactive Day-by-Day Travel Timeline** — Unified chronological schedule merging passes, hotel check-ins, route stops, and bills.
12. **[FEAT-C12] Native Apple Wallet (.pkpass) & Google Wallet** — 1-tap pass export to mobile OS lock screens.

### Pillar IV: Zero-Signal Offline Advantage
13. **[FEAT-C13] Offline P2P Dynamic QR Sync** — Device-to-device synchronization over animated rotating QR codes for zero-signal environments.

**Status notes:** FEAT-C05 (`enableInChatEventCards`) implemented client-side with migration `0094` (default OFF). Apply migration before arming the flag.

---

## 🛠️ Superadmin Switchboard Gating Rules

All new features are strictly gated by feature flags in `src/utils/featureFlags.ts` and managed from the **Superadmin Ops Deck > Flags** tab:
1. **Default State**: New feature flags default to `false` (safed) for production stability until armed.
2. **Trip & User Overrides**: Support granular per-trip or per-user overrides without affecting global fleet.
3. **Graceful Fallback**: If a feature flag is disabled, UI components gracefully collapse to their existing stable layout with zero regressions or orphaned state.
