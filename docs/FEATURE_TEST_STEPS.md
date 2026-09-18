# Feature test steps (living document)

Manual QA checklist for **customer-facing features**. Append a new dated section whenever a feature or customer-visible bug-fix ships. Do not replace older sections — keep history.

**Related:** math/automated QA lives in [`qa-testing-report.md`](./qa-testing-report.md). Feature flags live in Superadmin **Ops Deck → Flags**.

---

## How to maintain this file (agents + humans)

After implementing any **customer-facing** feature or UX fix that needs manual verification:

1. Add a new `##` section under **Changelog of test guides** (newest first is OK, or chronological — prefer chronological by ship date).
2. Include: version / commit / FEAT or BUG id, required flags (default OFF?), prep, numbered steps, negative checks (flag OFF), pass criteria.
3. Link the section from the **Index** table at the top.
4. Do this in the same PR/commit as the feature when practical; otherwise in the immediate follow-up commit before asking the user to test.

---

## Index

| Shipped | Version | Id | Section |
|--------|---------|-----|---------|
| 2026-09-16 | v3.25.1 | BUG-221 | [Chat overlay & live-location CTA](#bug-221--chat-overlay--live-location-cta-v3251) |
| 2026-09-17 | v3.26.0 / v3.26.1 | FEAT-076 | [Expense cards, location heartbeat, Summary polish](#feat-076--expense-cards-location-heartbeat-summary-polish-v3260) |
| 2026-09-17 | v3.27.0 | FEAT-077 | [Chat depth: media, voice, typing, reads, tripbot](#feat-077--chat-depth-media-voice-typing-reads-tripbot-v3270) |
| 2026-09-17 | v3.27.1 | BUG-222 | [Chat placement + Notes/Chat crash](#chat-placement-flags--notes-vs-tab-1) |
| 2026-09-17 | v3.27.2 | BUG-223 | [Chat max update depth](#bug-223--chat-max-update-depth-v3272) |
| 2026-09-17 | v3.27.3 | BUG-224 | [Settlement Algorithm info modal opacity](#bug-224--settlement-algorithm-info-modal-opacity-v3273) |
| 2026-09-17 | v3.28.0 | FEAT-078 | [Settlement confirmation, share link, contact invite, weather nudges, expense approval](#feat-078--settlement-confirmation-share-link-contact-invite-weather-nudges-expense-approval-v3280) |
| 2026-09-18 | v3.29.0 | FEAT-079 | [Multi-payer single expense, ledger UI enhancements, quick filter chips](#feat-079--multi-payer-single-expense-ledger-ui-enhancements-quick-filter-chips-v3290) |
| 2026-09-19 | v3.30.0 | FEAT-080 | [Data Saver, Compact Ledger View, Category Reorder, What's New Hub](#feat-080--data-saver-compact-ledger-view-category-reorder-whats-new-hub-v3300) |

---

## Shared prep

1. Hard-refresh or pull latest `main` so the version badge matches the section you are testing.
2. Sign in as a **linked trip member** (chat needs a member row tied to your user).
3. Prefer **two browsers / accounts** on the same trip for realtime checks (A = you, B = peer).
4. Open **Superadmin → Ops Deck → Flags**. Prefer **trip overrides** for safe testing.
5. For each feature: confirm **flag OFF → feature absent**, then arm the flag and retest.

---

## BUG-221 — Chat overlay & live-location CTA (v3.25.1)

**Commit:** chat overlay fix + Chat share CTA (see `decisions.md` ADR #187).  
**Flags:** no new flag. Live-location CTA reuses `enableLiveLocationShare`. Chat reactions UI needs `enableChatReactionsAndReplies` if testing long-press sheet.

### Steps

1. Open a trip → **Chat** with messages.
2. Long-press a message → ActionSheet opens with reactions in the **sheet header** (not a floating bar covering Reply/Pin).
3. Confirm **Reply** / **Pin** (if admin + social flag) are tappable, not covered.
4. With `enableChatFirstNav` ON: open Chat tab → floating **+** FAB must **not** sit on the composer; FAB hidden on Chat.
5. With `enableLiveLocationShare` ON: in Chat, use **Share my location** / **Share mine** on the live-location banner → `LiveLocationShareModal` opens.
6. Start sharing from that modal; stop sharing works.

### Pass

- No emoji pill overlapping sheet actions; no FAB over composer on Chat; location share reachable from Chat.

---

## FEAT-076 — Expense cards, location heartbeat, Summary polish (v3.26.0)

**Commits:** `b4eb125` (feature), `a4549d3` (TS build fix v3.26.1).  
**Migration:** `0094` (`trip_messages.kind` / `payload`) — required for cards.  
**ADR:** #188.

### Flags

| Behavior | Flag | Default |
|----------|------|---------|
| Trip chat | `enableTripChat` | (existing) |
| Expense event cards | `enableInChatEventCards` | OFF |
| Live location | `enableLiveLocationShare` | (existing) |

### A. In-chat expense cards

1. `enableInChatEventCards` **OFF** → add expense → Chat has **no** expense card (push may still fire).
2. Flag **ON** (+ trip chat ON) → add expense → compact card (title, amount, tap to view).
3. Tap card → expense review opens.
4. Peer B sees card via realtime without refresh.
5. Long-press card → View expense / Delete; **no text Edit**.

### B. Live-location session heartbeat

1. `enableLiveLocationShare` ON → start sharing from Chat CTA or Settings.
2. Modal copy: keep the **app open** while sharing (foreground session, not phone-locked GPS).
3. **Close the share sheet** without stopping → stay in the app; after ~60s peer map/banner still updates.
4. Background the tab briefly, return → heartbeat resumes on visibility.
5. **Stop sharing** → updates stop; changing trip / logout stops heartbeat.

### C. Summary polish

1. **Pinned carousel:** pin 2+ chat messages → swipe horizontally across pins; tap jumps to message.
2. **Offline readiness:** with pending `syncQueue` items, open **Summary** → compact sync-ready line (not a duplicate of the global offline banner).
3. **Needs you chips:** when you owe/are owed, have disputes (if that flag on), pending invites, or closeout available → chips above balances; tap routes to the relevant section.

### Pass

- Cards only when flag on; heartbeat survives modal close; Summary strip/chips behave as above.

---

## FEAT-077 — Chat depth: media, voice, typing, reads, tripbot (v3.27.0)

**Commits:** `fbe5c7a`, feature log `6c1fab3`.  
**Migrations:** `0095`–`0097` (kinds, `chat-media` bucket, `trip_chat_read_cursors`) — already applied on remote.  
**ADR:** #189.  
**Storage:** private bucket `chat-media` (`{tripId}/{messageId}.ext`), max **5 MB**/object; voice max **60s**.

### Flags (all default OFF unless noted)

| Feature | Flag(s) |
|---------|---------|
| Base chat | `enableTripChat` |
| Expense / settlement / dispute cards | `enableInChatEventCards` (+ `enableExpenseDisputes` for dispute posts) |
| Why this split? | `enableExplainThisNumber` (+ cards) |
| Attachments | `enableChatAttachments` |
| Voice notes | `enableChatVoiceNotes` |
| Typing | `enableChatTypingIndicators` |
| Read receipts | `enableChatReadReceipts` |
| @tripbot | `enableTripbotNlExpenses` |

### 1. Settlement / dispute cards

1. Cards flag ON → add normal expense → expense card.
2. Add **Settlement:** expense → **settlement** card.
3. Dispute an expense (`enableExpenseDisputes` ON) → **disputed** card for B.
4. Resolve dispute → **resolved** card.
5. Flag OFF → no new event cards.

### 2. Why this split?

1. Cards + `enableExplainThisNumber` ON.
2. Long-press expense card → **Why this split?** → share list with amounts.
3. Explain flag OFF → action hidden.

### 3. Attachment tray

1. `enableChatAttachments` ON → composer **+** appears; OFF → no +.
2. **+ → Camera** → image bubble; B sees realtime; image loads.
3. **+ → Gallery** → same.
4. **+ → Attach expense** → pick bill → link card; tap opens expense.
5. Soft-delete own image → gone for both (optional: Storage → `chat-media`).

### 4. Voice notes

1. `enableChatVoiceNotes` ON → hold mic control; grant mic if prompted.
2. Release before 60s → playable bubble with duration for B.
3. Hold to ~60s → auto-stop at cap.
4. Deny mic → error, no corrupt message.
5. Flag OFF → no voice control.

### 5. Typing indicators

1. Flag ON; A and B on Chat.
2. A types (don’t send) → B sees “{Name} is typing…”.
3. A stops → clears after timeout.
4. Flag OFF → no typing line.

### 6. Read receipts

1. Flag ON; A sends text.
2. B opens Chat / catches up.
3. A sees read/caught-up state on own message (cursor-based, not outbox ticks).
4. If B never opens Chat → A should not see read.
5. Flag OFF → no read UI.

### 7. @tripbot

1. `enableTripbotNlExpenses` ON.
2. Send `@tripbot Dinner 450 food` → **confirm sheet** (no expense yet).
3. Cancel → no expense.
4. Confirm → expense in ledger; if cards ON → expense card in chat.
5. Bad parse `@tripbot hello` → parse error; no silent write.
6. Flag OFF → sends as normal text.

### Pass

- Each flag gates its UI/writes; media lands in `chat-media`; tripbot never auto-writes without confirm.

---

## Chat placement flags — Notes vs Tab 1

**Version:** v3.27.1 · **BUG-222** (Notes hub blanked when opening Chat).  
**Context:** `enableTripChat` = capability; `enableChatFirstNav` = placement only. Chat must not disappear when Chat-first is OFF.

### Flags

| Behavior | Flag | Default |
|----------|------|---------|
| Chat available | `enableTripChat` | ON |
| Elevate Chat to bottom Tab 1 | `enableChatFirstNav` | OFF |
| Notes / Checklist hub | `enableNotesAndChecklist` | ON |
| Passes in hub | `enableTravelPasses` | ON |

### Matrix

| Trip Chat | Chat-first | Expected |
|-----------|------------|----------|
| OFF | * | No Chat anywhere |
| ON | OFF | Chat under **Notes** hub (segment “Chat”) |
| ON | ON | Chat as **bottom Tab 1**; no Chat segment in Notes |

### Steps

1. Trip Chat ON, Chat-first **OFF**, Notes hub available → open **Notes** → tap **Chat** → thread loads (send a message). A Chat crash must show “Chat … error / Try again” (plus a short error detail line), not wipe the whole Notes hub forever. If you previously saw “Notes & Checklist … error”, hard-refresh once (MapLibre was pulled into Notes; that path is now lazy).
2. Trip Chat ON, Chat-first **ON** → bottom bar shows **Chat** first; Notes has no Chat segment; open Tab-1 Chat and send.
3. Trip Chat ON, Chat-first OFF, **Notes + Passes both OFF** → bottom bar still shows a Notes-style hub that opens Chat (fallback so Chat is not homeless).
4. Trip Chat **OFF** → no Chat tab and no Chat segment in Notes.
5. Ops Deck: `enableChatFirstNav` description mentions it **moves** Chat and requires Trip Group Chat.

### Negative checks

- Chat-first ON → Chat must not appear twice (Tab 1 and Notes).
- Trip Chat OFF → Chat-first ON alone must not invent a working chat without `enableTripChat` (panel may mount empty only if misconfigured; capability flag must gate).

### Pass

- Placement matches the matrix; homeless-Chat gap closed; Chat errors isolated from Notes.

---

## BUG-223 — Chat max update depth (v3.27.2)

**Commit:** pending in this release. **ADR:** #191.

### Flags
No new flag. `enableInChatEventCards` unchanged (not the crash cause).

### Steps
1. Trip with expenses; Trip Chat ON; Chat-first OFF.
2. Notes → Chat → thread loads (no error boundary).
3. Send a message; optional: toggle `enableInChatEventCards` and add an expense → card still works when ON.

### Negative checks
- Chat-first ON → Tab-1 Chat also loads without max-update-depth error.

### Pass
- No “Maximum update depth exceeded”; Chat usable.

---

## BUG-224 — Settlement Algorithm info modal opacity (v3.27.3)

**Commit:** `5e907a6`. **ADR:** #192.

### Flags
No new flag. Summary / Who owes who available when balances exist.

### Steps
1. Open a trip with unsettled balances → **Summary** → **Who owes who**.
2. Tap the **ⓘ** info control next to Simplified / Direct.
3. Confirm the **Settlement Algorithm** dialog has a solid opaque card (page text behind does not show through title or body copy).
4. Scrim dims the page; **Got it** / ✕ / tap outside closes the dialog.
5. Toggle Simplified ↔ Direct; reopen ⓘ — Active badge and copy stay readable in light and dark theme.

### Negative checks
- N/A (no feature flag).

### Pass
- Dialog text is fully readable; no bleed-through of “Who owes who” / amounts through the card.

---

## FEAT-078 — Settlement confirmation, share link, contact invite, weather nudges, expense approval (v3.28.0)

**Migrations:** `0098` (trip share link), `0099` (settlement confirmation), `0100` (expense approval threshold), `0101` (weather nudges). `0102` (Google Calendar sync) and its edge functions were shipped, then fully removed by `0103` before any user connected — see decisions.md #194. Not covered below.
**New edge functions:** `send-weather-nudge`.
**Manual setup required** (server-side, one-time, not code): Vault secret `weather_nudge_cron_secret` (see migration 0101 header) — already set for this project; until set, weather nudges silently no-op on schedule instead of erroring.

### Flags

| Behavior | Flag | Default |
|----------|------|---------|
| Two-sided settlement confirmation | `enableSettlementConfirmation` | OFF |
| Read-only trip share link | `enableTripShareLink` | OFF |
| Invite from phone contacts | `enableContactInvite` | OFF |
| Weather-triggered itinerary nudges | `enableWeatherItineraryNudges` | OFF |
| Big-expense mutual approval | `enableExpenseApprovalThreshold` | OFF |

### A. Settlement confirmation

1. `enableSettlementConfirmation` OFF → record a settlement (A pays B) → open it from the expense list → no confirm button, no status banner.
2. Flag ON → A records the settlement → as **B**, open the settlement from the list → "Confirm Receipt" button visible; A does not see it on their own copy.
3. B taps Confirm → banner switches to "✓ Confirmed received by B"; A's view updates on refresh.
4. B gets a push/in-app notification ("...confirm you received it") when the settlement is recorded.
5. Confirming twice (retry) is rejected server-side (`already confirmed`).

### B. Read-only trip share link

1. `enableTripShareLink` OFF → Share & Export modal → no "Read-only summary link" section.
2. Flag ON → open **Share & Export** → **Generate Share Link** → link appears, copy works.
3. Open the link in a private/incognito window (logged out) → trip name, dates, destination, traveler/expense counts, and total spend by currency render — **no** member names, no individual expenses, no balances.
4. **Revoke Link** → reloading the same URL shows "This link has ended or expired."
5. Regenerating issues a new token; the old link stops resolving.

### C. Invite from phone contacts

1. `enableContactInvite` OFF → Share & Export modal → no "Invite From Contacts" button.
2. Flag ON, **native app only** (button hidden on web) → tap **Invite From Contacts** → OS contact picker opens.
3. Grant permission, pick a contact → OS share sheet opens prefilled with a message containing the join link.
4. Deny contacts permission → inline error shown, no crash.

### D. Weather-triggered itinerary nudges

1. `enableWeatherItineraryNudges` OFF for all trips → no nudge pushes/notifications appear regardless of forecast.
2. Flag ON (global or trip override) for a trip with a route stop that has coordinates, ending in the future → after the daily cron fires (18:00 UTC) and Open-Meteo reports ≥60% precip probability or a stormy code for tomorrow at that stop, all linked participants get a push + in-app notification ("Rain looks likely tomorrow...").
3. A trip already nudged today is not nudged again even if the job re-runs (`weather_nudge_log` dedupe).
4. A trip with no stop coordinates and no `destination` text is skipped, not errored.

### E. Big-expense mutual approval

1. `enableExpenseApprovalThreshold` OFF → **Balances** tab has no "Require 2nd approval above" field; expenses of any size post normally.
2. Flag ON → trip admin sets a threshold (e.g. 5000) in **Balances** → an expense at/above that amount saves with a ⏳ badge in the list and doesn't move balances (Balances tab total unaffected).
3. Open the pending expense → "Pending approval" banner + **Approve** button visible to anyone **except** its creator.
4. A second member taps Approve → badge/banner clear, balances update to include it.
5. The creator does not see an Approve button on their own pending expense (self-approval blocked server-side too).
6. A settlement above the threshold is **not** gated (settlement confirmation, section A, covers that trust path instead).
7. Clearing the threshold field (empty) turns the gate off for that trip; expenses of any size post normally again.

### Negative checks

- All five flags OFF → none of the new UI (share link section, contacts button, approval field/badges) renders anywhere, and no new push/notification types fire.

### Pass

- Each flag independently gates its feature with no bleed into the others; balances/analytics never include a pending-approval expense; the share link never exposes member-level data.

---

## FEAT-079 — Multi-payer single expense, ledger UI enhancements, quick filter chips (v3.29.0)

**Migrations:** `0104_multi_payer_expenses.sql`. **ADR:** #195.

### Flags
| Behavior | Flag | Default | Phase |
|----------|------|---------|-------|
| Multi-payer contributions per expense | `enableMultiPayerExpenses` | OFF | Phase 4 |
| Sticky glassmorphic day-total headers | `enableStickyDayHeaders` | OFF | Phase 1 |
| Category icon ambient glow rings | `enableCategoryColorRings` | OFF | Phase 1 |
| OLED Pure Black theme in Settings | `enableAmoledTheme` | OFF | Phase 4 |
| Quick filter chip bar on Expenses tab | `enableExpenseQuickFilterChips` | OFF | Phase 5 |

### A. Multi-Payer Single Expense

1. `enableMultiPayerExpenses` OFF → Add Expense form shows standard single "Paid By" member dropdown.
2. Flag ON → Add Expense form shows a segmented toggle: **Single Payer** vs **Multiple Payers**.
3. Select **Multiple Payers** → Member list appears with input fields for each member's contribution amount.
4. Tap **Split Equally** → Total expense amount is divided equally among members with cents rounded and balanced.
5. Manually edit shares → The allocation counter displays "Allocated: $X / $Y" with green checkmark when balanced, or warning badge if sum does not match total expense.
6. Attempt to submit with mismatched allocation → Form displays validation message preventing save.
7. Save balanced expense → On the Expenses ledger, expense row displays an avatar stack of all contributing payers and the count of contributors.
8. Balances & Settlements → Verify in Balances tab that each contributing payer is credited their exact paid portion, and debts are minimized correctly.

### B. Sticky Day-Total Headers

1. `enableStickyDayHeaders` OFF → Date headers scroll away naturally with standard static styling.
2. Flag ON → Date group headers become sticky at the top of the viewport when scrolling down the expenses ledger.
3. Verify sticky header displays the day's formatted date, expense item count pill, and total sum of actual expenses spent that day.
4. Verify smooth background blur (`backdrop-filter: blur(12px)`) with crisp contrast in light, dark, and OLED themes.

### C. Category Ambient Color Glow Rings & Tabular Numerals

1. `enableCategoryColorRings` OFF → Category icons render standard circular badges.
2. Flag ON → Category icons on expense rows render with a vibrant duo-tone ambient glow ring matching the category accent palette.
3. Tabular numerals check: Amounts across ledger rows and day headers maintain uniform character width and digit alignment (`font-variant-numeric: tabular-nums`).

### D. OLED Pure Black Theme

1. `enableAmoledTheme` OFF → Settings → Appearance only shows "System", "Day flight", "Night flight".
2. Flag ON → Settings → Appearance shows "OLED" pure black theme option.
3. Switch to OLED → Page background flips to true `#000000`, card borders have clean high-contrast edges, saving power on AMOLED screens.

### E. Quick Filter Chip Bar

1. `enableExpenseQuickFilterChips` OFF → Quick filter chip bar above expenses list is hidden.
2. Flag ON → Horizontally scrollable chip bar renders right above the ledger with:
   - **All** (active default with count)
   - **My Expenses** (filters expenses involving current member)
   - **Paid by Me** (filters expenses where current member is the primary or joint payer)
   - **Pending ⏳** (filters expenses awaiting threshold approval)
   - Top category chips (e.g. Food, Stay, Travel)
   - Spending thresholds (e.g. `> 1000`)
3. Tap **Paid by Me** → Ledger immediately filters without page reload or network request.
4. Tap **All** → Ledger resets to full list instantly.

### Negative checks
- All five flags OFF → The app looks and behaves exactly as v3.28.1 with single-payer dropdown, classic date headers, standard category badges, and no quick filter bar.

### Pass
- Each of the 5 flags functions completely independently with zero regressions, settlements balance to exact zero, and build/tests pass 100%.

---

## FEAT-080 — Data Saver, Compact Ledger View, Category Reorder, What's New Hub (v3.30.0)

**Migrations:** `0105_category_order.sql`. **ADR:** #197.

### Flags
| Behavior | Flag | Default | Phase |
|----------|------|---------|-------|
| Data Saver mode (map stays collapsed, no celebration animations) | `enableDataSaverMode` | OFF | Phase 3 |
| Compact/dense expense ledger rows | `enableCompactLedgerView` | OFF | Phase 1 |
| Manual up/down category reorder | `enableCategoryReorder` | OFF | Phase 1 |
| Tappable version → "What's New" screen (Settings → About) | `enableWhatsNewHub` | OFF | Phase 1 |

### A. Data Saver Mode

1. `enableDataSaverMode` OFF → Settings → Preferences shows no Data Saver row; trip dashboard map loads normally on open.
2. Flag ON → Settings → Preferences shows a **Data Saver** toggle (OFF by default).
3. Turn it ON → reopen a trip → the map area shows a **"🗺️ Map hidden to save data · Tap to load"** placeholder instead of the live map; the content sheet starts fully expanded over it.
4. Tap the placeholder → the real map (MapLibre) loads immediately for the rest of this session.
5. Reload the page (fresh session) with Data Saver still ON → map is hidden again (placeholder, not auto-revealed) — confirms the reveal is per-session, not permanent.
6. With Data Saver ON, trigger a settlement / UPI "Mark as Settled" / checklist-100%-complete celebration → no confetti plays (compare to Data Saver OFF, where confetti plays normally).
7. Slow-connection nudge: in DevTools → Network → set throttling to "Slow 3G" (or set `navigator.connection.saveData` via a quick console call if throttling doesn't expose it), reload with Data Saver OFF → a dismissible banner appears suggesting Data Saver; tapping **Enable** turns the toggle on and hides the banner; tapping the ✕ dismisses without enabling and doesn't reappear on next reload.

### B. Compact Ledger View

1. `enableCompactLedgerView` OFF → Settings → Preferences shows no Compact Ledger row; Expenses tab rows render at normal size.
2. Flag ON → toggle appears in Settings; turning it ON immediately shrinks row padding, category icon box, and icon size on the Expenses tab ledger.
3. Turn OFF again → rows return to normal size.

### C. Manual Category Reorder

1. `enableCategoryReorder` OFF → Settings → Categories & Tags shows no up/down arrows next to each category.
2. Flag ON → up/down chevron buttons appear next to every category row; the first row's up-arrow and the last row's down-arrow are disabled.
3. Move a category down, then reopen Settings → Categories & Tags → new order persists (same device).
4. Open the Add Expense form's Category picker → the same reordered sequence appears there too.
5. On a second device/browser signed into the same trip, refresh → the reordered sequence syncs (confirms the Supabase `category_order` write, not just local state).
6. Add a brand-new custom category after reordering → it appears at the end of the list (unlisted categories render last), not inserted into the middle.

### D. "What's New" on the Version Screen (reworked in v3.30.1)

1. `enableWhatsNewHub` OFF → Settings → Help & About → About & Legal: the version cell reads "Version X · Web Edition" and is not tappable; there is no separate "What's New" row anywhere in Settings.
2. Flag ON → the version cell reads "Version X · See what's new" and shows a chevron.
3. Tap it → iOS-style "What's New" screen: subtitle "Version X · date", a bullet list of this release's changes, and an "Earlier versions" section below.
4. Back → returns to About & Legal (not the Settings root).
5. Search Settings for "new" → no standalone What's New result appears.

### Negative checks
- All four flags OFF → app behaves exactly as v3.29.1: map always loads immediately, ledger rows at normal size, no reorder controls, no What's New entry.

### Pass
- Each of the 4 flags functions independently with zero regressions; Data Saver measurably stops the map from mounting (verify via DevTools Network tab — no `tiles.openfreemap.org` requests until the placeholder is tapped); category order syncs across devices; What's New badge correctly reflects only genuinely new flag activity, never the initial baseline.

---

## Template for the next feature

Copy below when shipping the next customer-facing change:

```markdown
## FEAT-XXX / BUG-XXX — Short title (vX.Y.Z)

**Commit:** `hash`. **Migrations:** … **ADR:** …

### Flags
| Behavior | Flag | Default |
|----------|------|---------|
| … | `enable…` | OFF |

### Steps
1. …
2. …

### Negative checks
- Flag OFF → …

### Pass
- …
```

Then add a row to the **Index** table.
