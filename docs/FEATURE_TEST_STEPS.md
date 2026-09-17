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
