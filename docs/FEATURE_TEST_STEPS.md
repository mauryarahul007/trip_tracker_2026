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
| unreleased | next | FEAT-GROWTH2 | [Growth: invite conversion, telemetry, passport, nudges](#feat-growth2--invite-conversion-telemetry-passport-nudges) |
| 2026-09-21 | v3.36.0 | FEAT-093 | [Flag recipes and saved mixes](#feat-presets--flag-recipes-and-saved-mixes) |
| 2026-09-21 | v3.35.1 | FEAT-092 | [Restore recommended app confirm](#feat-092--restore-recommended-app-confirm) |
| 2026-09-21 | v3.35.0 | FEAT-GROWTH | [Superadmin loop health & growth](#feat-growth--superadmin-loop-health--growth) |
| 2026-09-21 | v3.35.0 | FEAT-PACKS | [Consumer packs in Ops Deck](#feat-packs--consumer-packs-replace-phases) |
| 2026-09-21 | v3.34.0 | FEAT-LIGHTLOOP2 | [Money-loop finish](#feat-lightloop2--money-loop-finish) |
| 2026-09-21 | v3.34.0 | FEAT-LIGHTLOOP | [Light money loop](#feat-lightloop--light-money-loop) |
| 2026-09-21 | v3.33.0 | FEAT-088 | [Chat money cards stay quiet](#feat-chatlife--chat-money-cards-stay-quiet) |
| 2026-09-16 | v3.25.1 | BUG-221 | [Chat overlay & live-location CTA](#bug-221--chat-overlay--live-location-cta-v3251) |
| 2026-09-17 | v3.26.0 / v3.26.1 | FEAT-076 | [Expense cards, location heartbeat, Summary polish](#feat-076--expense-cards-location-heartbeat-summary-polish-v3260) |
| 2026-09-17 | v3.27.0 | FEAT-077 | [Chat depth: media, voice, typing, reads, tripbot](#feat-077--chat-depth-media-voice-typing-reads-tripbot-v3270) |
| 2026-09-17 | v3.27.1 | BUG-222 | [Chat placement + Notes/Chat crash](#chat-placement-flags--notes-vs-tab-1) |
| 2026-09-17 | v3.27.2 | BUG-223 | [Chat max update depth](#bug-223--chat-max-update-depth-v3272) |
| 2026-09-17 | v3.27.3 | BUG-224 | [Settlement Algorithm info modal opacity](#bug-224--settlement-algorithm-info-modal-opacity-v3273) |
| 2026-09-17 | v3.28.0 | FEAT-078 | [Settlement confirmation, share link, contact invite, weather nudges, expense approval](#feat-078--settlement-confirmation-share-link-contact-invite-weather-nudges-expense-approval-v3280) |
| 2026-09-18 | v3.29.0 | FEAT-079 | [Multi-payer single expense, ledger UI enhancements, quick filter chips](#feat-079--multi-payer-single-expense-ledger-ui-enhancements-quick-filter-chips-v3290) |
| 2026-09-19 | v3.30.0 | FEAT-080 | [Data Saver, Compact Ledger View, Category Reorder, What's New Hub](#feat-080--data-saver-compact-ledger-view-category-reorder-whats-new-hub-v3300) |
| 2026-09-19 | v3.30.2 | BUG-227 | [Voice expense payer is the signed-in member](#bug-227--voice-expense-payer-is-the-signed-in-member) |
| 2026-09-19 | v3.30.3 | BUG-228 | [iOS WebKit compositor feel](#ios-webkit-compositor-feel) |
| 2026-09-20 | v3.30.4 | BUG-229 / BUG-230 | [Expeditions chip contrast + iOS stack swipe](#expeditions-chip-contrast--ios-stack-swipe) |
| 2026-09-20 | v3.31.0 | BUG-232..236 / FEAT-083..087 | [Navigation, dialogs & sync UX pass](#navigation-dialogs--sync-ux-pass-v3310) |
| 2026-09-20 | unreleased | FEAT-TRIPSORT | [Trip stack alphabetical swipe + sort toggle](#feat-tripsort--trip-stack-alphabetical-swipe--sort-toggle) |
| 2026-09-20 | v3.32.7 | BUG-240 / BUG-241 | [Ops Deck load + home stack smoothness](#perf-ops-stack--ops-deck-load--home-stack-smoothness) |

---

## Shared prep

1. Hard-refresh or pull latest `main` so the version badge matches the section you are testing.
2. Sign in as a **linked trip member** (chat needs a member row tied to your user).
3. Prefer **two browsers / accounts** on the same trip for realtime checks (A = you, B = peer).
4. Open **Superadmin → Ops Deck → Flags**. Prefer **trip overrides** for safe testing.
5. For each feature: confirm **flag OFF → feature absent**, then arm the flag and retest.

---

## FEAT-PRESETS — Flag recipes and saved mixes

**Commit:** 2a704e0 (v3.36.0). **ADR:** 217. **Tracker:** FEAT-093. No new traveler flag.

**Point:** Superadmin Flags can apply a named global mix. Built-in recipes are Recommended, On the road, Flyer, Power money. Save current mix stores up to 5 named custom mixes. This is not all flags on. Packs still Arm/Safe one group.

### Flags
None new. Recipes write `DEFAULT_FEATURE_FLAGS` variants.

### Prep
1. Superadmin → Ops Deck → Flags. Hard-refresh so the **Recipes** card is under the page title.

### Steps
1. Recipes shows Recommended, On the road, Flyer, Power money, and **Save current mix**.
2. **Recommended** confirm: Core + Trip on, Travel capable, Pro/Labs off. Cancel writes nothing. Apply → Core/Trip Armed, Travel Partial, Pro/Labs/Ops Safe.
3. **On the road** → Travel pack Safe (passes/radar off). Core+Trip still Armed.
4. **Flyer** → same pack states as Recommended.
5. **Power money** → Pro Armed, Labs still Safe. Itemized/OCR available; Chat-first still absent.
6. Toggle a Pro flag extra, **Save current mix** as “Goa weekend”. Chip appears. Apply it after changing flags — mix returns. Delete mix → flags unchanged.
7. Seventh save is blocked (max 5).

### Negative checks
- Built-in recipes never turn Labs on.
- Arm Pack on Travel still turns route stops on (different from Flyer/Recommended).
- Cancel on confirm leaves flags unchanged.

### Pass
- One confirm per apply. Custom mix round-trips. Packs below still work.

---

## FEAT-092 — Restore recommended app confirm

**Commit:** aee182f (v3.35.1). **Tracker:** FEAT-092. Reuses pack defaults from FEAT-PACKS / ADR 215. No new traveler flag.

**Point:** Superadmin Flags no longer silently resets. **Recommended** (Recipes) confirms Core + Trip on, Travel capable, Pro/Labs/Ops off. This is not all flags on. See FEAT-PRESETS for On the road / Flyer / Power money / saved mixes.

### Flags
None new. Same `DEFAULT_FEATURE_FLAGS` as FEAT-PACKS.

### Prep
1. Superadmin → Ops Deck → Flags. Hard-refresh so **Recipes** includes **Recommended**.

### Steps
1. **Recommended** recipe chip, not a silent Reset to Defaults.
2. Click it. Dialog lists Core/Trip on, Travel capable (route stops off), Pro/Labs/Ops off.
3. **Cancel** — pack chips and toggles unchanged.
4. Click again → **Restore recommended**. Toast: Core and Trip on, Pro and Labs off. Core/Trip Armed, Travel Partial, Pro/Labs/Ops Safe.

### Negative checks
- Confirm does not arm Pro, Labs, or route stops.
- Arm Pack on Travel still turns route stops on (different from Restore).

### Pass
- One confirm, copy matches pack intent, Cancel writes nothing.

---

## FEAT-GROWTH — Superadmin loop health & growth

**Commit:** dca5349 (v3.35.0). **Migrations:** `0107_growth_ops_attribution.sql` (pulse, Splitwise count, share views, signup UTM). **ADR:** 216. **Tracker:** FEAT-091.

**Point:** Ops Deck measures the trip loop (first expense, second member, settle, next trip), not 30-day login. Travelers get no new tab. Optional one-tap closeout pulse is Labs, default OFF.

### Flags
| Behavior | Flag | Default |
|----------|------|---------|
| One-tap “use this next trip?” after lock | `enableCloseoutPulse` | OFF (Labs) |

Landing headline / tagline / invite blurb / empty-state copy are **Tools → app_config**, not flags.

### Prep
1. Superadmin account. Hard-refresh so Command Center and Analytics load this build.
2. Prefer a fleet that already has trips, expenses, and at least one claimed member.
3. Dummy local Supabase with no trips will show 0s — that is expected.

### Steps
1. Superadmin → **Command Center**. A **Loop health** strip shows five percentages: first expense ≤ 10 min, second member, settlement, locked, same-squad next trip ≤ 90d. Ghost-trip count may appear under the strip.
2. Tap **Open Growth** (or Analytics). Default sub-tab is **Growth**.
3. Confirm sections: activation funnel, ghost queue, flag used vs armed (proxies labeled), invite/share attribution, trip-type slices, closeout pulse, Splitwise imports, win-back list, signup UTM.
4. **Tools → Landing & empty-state copy.** Change headline and tagline, Save. Sign out and open `/login` — copy matches. Home empty state uses the empty-trip blurb when you have no trips.
5. Arm `enableCloseoutPulse` on a trip override. End-date in the past → Close out → Lock. After lock, Yes / Not this group / Skip appear. Answer Yes. Growth closeout pulse increments (or after refresh). Flag OFF: lock still two buttons, no question.
6. (Optional, needs migration 0107) Open a view-only share link in a private window. Share views on Growth increment. Import a Splitwise CSV on a Pro-armed trip — trips imported / rows imported increment.

### Negative checks
- Flag `enableCloseoutPulse` OFF → no pulse question after lock.
- Non-superadmin never sees Command Center / Growth.
- No DAU, streak, chat transcript, or email-blast UI.

### Pass
- Loop health is visible without scrolling past spend.
- Growth tab is derived from trips/expenses/members (proxies are labeled).
- Landing copy changes without a deploy.
- Pulse is one tap and absent when the flag is off.

---

## FEAT-PACKS — Consumer packs replace phases

**Commit:** dca5349 (v3.35.0). **ADR:** 215. **Tracker:** FEAT-090.

**Point:** Ops Deck groups flags by who should see them (Core / Trip / Travel / Pro / Labs / Ops), not by engineering Phase 1–7. Core money loop defaults ON in code. Production DB rows still win until **Restore recommended app** or Arm Pack.

### Flags / packs

| Pack | Default in code | What travelers feel |
|------|-----------------|---------------------|
| Core (18) | ON | First 60s + last 5 min: add, invite, settle, share, lock, same squad next trip |
| Trip (11) | ON | Voice, receipt, Notes + quiet chat, packing, FX, map collapsed |
| Travel (8) | Partial | Passes / Next-Up / scanner / radar ON; route stops / tiles / data-saver OFF. Next-Up chrome hidden until a pass exists |
| Pro (28) | OFF | Itemized, OCR, analytics, biometric, Splitwise import |
| Labs (18) | OFF | Chat-first, Tripbot, live location, achievements, closeout pulse |
| Ops (4) | OFF | Demo seed, snapshot, suggestions, sync inspector |

### Prep

1. Hard-refresh so Ops Deck loads this build.
2. Superadmin → Ops Deck → Flags. Tab is **Consumer Packs** (not Release Phases).
3. If production already stored flags, click **Restore recommended app** on a staging env only — confirm lists Core + Trip on, Travel capable, Pro/Labs/Ops off. That writes pack defaults to `resolved.global`. Cancel leaves flags unchanged. This is not “all flags on.”

### Steps

1. Command Center shows six pack chips (CORE, TRIP, TRAVEL, PRO, LABS, OPS) with Armed / Partial / Safe.
2. Flags page: six summary cards. Core is expanded. Arm Pack / Safe Pack toggles every flag in that pack.
3. Search "Why This Amount" — it sits under Core, not Phase 1.
4. As a traveler after Restore recommended app: home can show You owe / You are owed; settle rows can show WhatsApp / UPI / Why?; ended trip can offer New trip with this group.
5. Expenses tab without a pass: no Next-Up capsule (progressive Next-Up is Core ON).
6. Itemized split / OCR / analytics / achievements absent until Pro or Labs is armed.

### Flag-OFF / negative

1. Safe Pack on Core → home IOU, clone last, closeout, UPI, share link gone (old first-session).
2. Arm Pack on Labs → Chat-first and Tripbot appear. Do not leave Labs armed on production.
3. Safe Pack on Trip → voice / Notes hub / chat under Notes disappear.

### Pass

- No "Phase 1–7" copy in Flags or Command Center.
- Core + Trip armed by default after Restore recommended app.
- Labs and Pro stay safed.
- Traveler first-open is not a radar/scanner cockpit. Last 5 min can settle and clone squad without a Pro pack.

---

## FEAT-LIGHTLOOP — Light money loop

**Commit:** v3.34.0. **ADR:** 214.

**Point:** Faster add, clearer home IOU, settle without leaving chat-you-already-use, next trip with the same people. No Chat-first, Tripbot, or itinerary builder.

**Defaults note:** This section recorded v3.34.0 as all-OFF. From ADR 215 / FEAT-PACKS, these flags sit in **Core** and default **ON** in code. Production stored rows still win until Reset / Arm Pack.

### Flags

All default **OFF**. Arm in Superadmin → Ops Deck → Flags (or Release Phases). Nothing in this feature is reachable until its flag is ON.

| Behavior | Flag | Default |
|----------|------|---------|
| Clone last expense | `enableCloneLastExpense` | OFF |
| Remember split | `enableRememberDefaultSplit` | OFF |
| Expense draft 24h | `enablePersistentExpenseDraft` | OFF |
| WhatsApp settle card | `enableWhatsAppSettlementShare` | OFF |
| UPI on settlement row | `enableUpiPayments` | OFF |
| Trip closeout | `enableTripCloseout` | OFF |
| View-only share link | `enableTripShareLink` | OFF |
| Home You are owed / You owe | `enableHomeNetBalance` | OFF |
| New trip with this group (copy names) | `enableCloneTripSquad` | OFF |
| Notes Talk / Pack / Pass labels | `enableNotesTalkPackPass` | OFF |
| Hide Next-Up until a pass exists | `enableProgressiveNextUp` | OFF |
| Chat-first / Tripbot / in-chat cards | Phase 6 flags | stay OFF |

If production Ops Deck already stored a flag as ON, that stored value still wins — turn it OFF there to hide the surface.

### A. Fast add
**Flags ON:** `enableCloneLastExpense`, `enableRememberDefaultSplit`, `enablePersistentExpenseDraft`.

1. Open a trip with at least one expense. Add expense → **Clone last** (or long-press +). Date is today; split matches last.
2. Change split participants, save. Next new expense reuses that split.
3. Start a new expense, type a title, leave. Reopen add: draft is still there.

### B. Settle out
**Flags ON:** `enableUpiPayments`, `enableWhatsAppSettlementShare`, `enableTripCloseout`, `enableTripShareLink`.

1. Balances with an open transfer → **UPI Pay** on that row (not a new tab). **Share** produces a WhatsApp/system card.
2. Trip end date in the past → closeout reminder. Complete closeout → trip locks.
3. Share trip → generate read-only link. Open in a logged-out browser: summary, no edit.

### C. Home IOU and next trip
**Flags ON:** `enableHomeNetBalance`, `enableCloneTripSquad`.

1. Home (no trip open), online, you have a non-zero net in some currency → strip **You are owed** / **You owe** above the stack.
2. Trip action sheet → **New trip with this group**. New trip has the same people (names, not their logins) and no expenses.

### D. Notes IA and progressive travel
**Flags ON:** `enableNotesTalkPackPass`, `enableProgressiveNextUp` (plus existing `enableTravelPasses` / `enableNextUpCapsule`).

1. Notes hub segments: **Talk / Pack / Pass / Notes** (Talk only if trip chat is on and chat-first is off).
2. Expenses tab: Next-Up capsule is absent until the trip has a pass. Radar / scanner stay on pass cards only.

### Negative checks
- **All light-loop flags OFF:** no Clone last, no remembered split, no 24h draft, no UPI chip, no WhatsApp settle share, no closeout, no share link, no home IOU strip, Duplicate Trip copies only you (not the squad), Notes labels stay Passes / Notes / Checklist / Chat, Next-Up can still show without a pass (existing Next-Up flag).
- Phase 6 chat-first / Tripbot / in-chat cards still OFF → no Chat tab-1, no tripbot, no extra money bubbles.
- Splitwise import and contact invite still OFF.
- Toggle any one flag OFF in Ops Deck → that surface disappears; others stay.

### Pass
- With flags ON: second expense is fast; home shows money; settle is a row action; next trip reuses the squad; Notes is three jobs plus notes; travel extras wait for a pass.
- With flags OFF: none of those surfaces appear.

---

## FEAT-LIGHTLOOP2 — Money-loop finish

**Commit:** v3.34.0. **ADR:** 214.

**Point:** Finish the five leftover edges from the light money-loop analysis: home Add, copy split on squad clone, closeout → Wrapped, view-only share first, Why? on settle rows. No new flags — each reuses an existing Superadmin flag, default OFF except Wrapped (already ON).

### Flags

| Behavior | Flag | Default |
|----------|------|---------|
| Home IOU strip + **Add** | `enableHomeNetBalance` | OFF |
| Copy squad + remembered split | `enableCloneTripSquad` + `enableRememberDefaultSplit` | OFF |
| Closeout then Wrapped recap | `enableTripCloseout` (+ `enableTripWrapped`) | Closeout OFF, Wrapped ON |
| View-only link first in Invite | `enableTripShareLink` | OFF |
| **Why?** on settle rows | `enableExplainThisNumber` | OFF |

### A. Home Add
1. Flags: `enableHomeNetBalance` ON. Home, online, non-zero net → strip shows You are owed / You owe **and** **Add**.
2. Tap **Add** → opens the trip whose dates include today (else last-updated open trip) with the add-expense form.
3. Flag OFF → no strip, no Add.

### B. Split habits on next trip
1. Flags: `enableCloneTripSquad` and `enableRememberDefaultSplit` ON. On a trip, save an expense with a non-default split.
2. Action sheet → **New trip with this group**. Add expense on the copy: split mode/people match (mapped by name).
3. Either flag OFF → Duplicate Trip does not copy split storage.

### C. Closeout → Wrapped
1. Flags: `enableTripCloseout` ON, `enableTripWrapped` ON. Finish closeout → **Lock trip**. Trip Wrapped opens immediately (closeout sheet closes).
2. Wrapped OFF → lock stays on the “Trip locked / Done” sheet. No recap.

### D. View-only share first
1. Flag: `enableTripShareLink` ON. Settings → Invite & Share. **View-only link (no account)** is first; a link is generated if none exists. Join code is under **Invite to join**.
2. Open the `/share/…` URL logged out: summary only, no edit.
3. Flag OFF → join link/code first; no view-only block.

### E. Why this amount?
1. Flag: `enableExplainThisNumber` ON. Balances → a suggested transfer shows **ⓘ Why?**
2. Tap → bill titles that make up that amount. Flag OFF → no Why? control.

### Negative checks
- Home Add never appears without the IOU strip / flag.
- Duplicate without both clone-squad and remember-split does not write `tt-default-split` for the new trip.
- Share modal does not auto-generate a view-only token when `enableTripShareLink` is OFF.

### Pass
- Home is money + one tap to add; next trip keeps split habits; lock becomes a recap; auntie gets a view-only link first; settle rows can explain the number.

---

## FEAT-CHATLIFE — Chat money cards stay quiet

**Commit:** v3.33.0 (FEAT-088). **Migration:** `0106` applied (kinds allowed; delete/confirm are **in-place overlays**, not extra bubbles).  
**Point:** Chat stays a conversation. Money events are one card each; status updates on that card.

### Flags

| Behavior | Flag | Default |
|----------|------|---------|
| Trip chat | `enableTripChat` | (existing) |
| Expense event cards | `enableInChatEventCards` | OFF |
| Settlement confirm overlay | `enableSettlementConfirmation` | OFF |
| Reply on expense cards | `enableChatReactionsAndReplies` | OFF |
| Unread on Notes / Chat tab | `enableChatUnreadOnNotes` | OFF |

### A. In-place delete / settle (no extra bubbles)

1. Cards ON. Add an expense → one **added** card.
2. Delete it → **same** card strikes through with **Deleted**. No second “deleted” bubble. Tap does not open review.
3. Restore from Recycle Bin → original card is live again (**Tap to view**). No “restored” bubble.
4. Record a settlement from Balances → one **settlement** card.
5. Peer confirms (`enableSettlementConfirmation` ON) → that settlement card shows **Confirmed**. No extra confirm bubble.

### B. Stack consecutive bills

1. Add 2+ expenses in a row with no chat in between → one **N bills** row.
2. Tap **Show** → cards expand. **Hide** collapses.
3. A normal text message between bills breaks the stack.

### C. Hide bills

1. Cards ON → **Hide bills** in the chat header.
2. Money cards disappear; human messages stay.
3. **Show bills** brings them back. Preference survives reload on this trip.

### D. Reply on an expense card

1. `enableChatReactionsAndReplies` ON.
2. Long-press an expense card → **Reply** is in the sheet.
3. Send a reply → quote of that bill sits on the human message.

### E. Unread on Notes

1. `enableChatUnreadOnNotes` ON. Stay on Summary (or Notes → Checklist).
2. Peer sends a chat message → **dot on Notes** (or Chat tab if Chat-first is on). Chat segment also dots when Notes is open on another sub-tab.
3. Open Chat → dot clears.
4. Flag OFF → no unread dots.

### Negative checks

- `enableInChatEventCards` OFF → no add cards, no Hide bills, no stacks.
- Unread flag OFF → no Notes/Chat unread dots (chat still works).
- Reply flag OFF → no Reply on expense cards.

### Pass

- Delete/settle visible without extra bubbles; stacks and Hide bills keep talk readable; unread is a dot only.

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

## BUG-227 — Voice expense payer is the signed-in member

**Why:** Voice Quick-Add used `visibleMembers[0]` (usually the trip creator, e.g. Rahul) whenever speech did not name a payer, then hid that default in the preview. Auto-save in 3s wrote the wrong person.

**Flags:** `enableVoiceInput` (existing). No new flag.

### Prep
1. Use a trip with at least two linked members (A = trip creator, B = someone else).
2. Sign in as **member B**. Confirm B is a linked trip member (not just a guest viewer).
3. Superadmin → Ops Deck → Flags: `enableVoiceInput` **ON** for this trip.

### Steps
1. Open the trip as B → Voice Quick-Add (mic / command palette “Voice quick-add”).
2. Speak or type **`500 coffee`** (no name). Parsed preview must show **Paid by B (you)**, not A.
3. Let the 3s auto-save complete (or tap Save). Expense ledger: **Paid by B**.
4. Speak **`I paid 200 for cab`**. Payer is B.
5. Speak **`Lunch 1200 paid by` + A's name**. Payer is A (explicit name still wins).
6. Change the Paid-by dropdown to A before save → auto-save pauses; saving stores A.
7. If B is not a linked member, preview asks **Who paid?** and does **not** auto-save until a member is picked.
8. Add Expense form (not voice): new expense Paid-by defaults to **B**, not the first member.

### Negative checks
- `enableVoiceInput` OFF → Voice Quick-Add is hidden; Add Expense form still defaults Paid-by to the signed-in member.
- Explicit "paid by [other member]" must never be overwritten with the speaker.

### Pass
- Whoever is signed in is the default payer for unnamed voice/NL expenses; the preview always shows who paid; named payers still win.

---

## Expeditions chip contrast + iOS stack swipe

**Commit:** v3.30.4 / BUG-229 + BUG-230 (see `decisions.md` ADR 201). **Migrations:** none.  
**Flags:** none.

### Steps
1. Home (trips list) with a **bright** cover photo behind the header (sky, snow, beach). The `N Expeditions` chip is **dark text on a light pill**, readable against the photo. Greeting text stays readable.
2. Swipe the stack to a **dark** cover photo. The chip becomes **light text on a dark pill**. It never stays sky-blue on a blue sky.
3. With no cover photo (or before the image loads), the chip uses theme text/`--bg-surface` and is still readable in light and dark theme.
4. On **iPhone Safari / Capacitor**: swipe the trip stack left/right. The front card tracks the finger without hitching at drag start; peek cards rise; release still browses. Swipe up still archives. Long-press still opens edit/delete.
5. Repeat stack swipes several times in a row. No stutter when the next card becomes front.

### Negative checks
- **Android Chrome**: stack cards still have the 3D tilt while dragging. Glass/blur on Android home chrome is unchanged.
- Flag N/A.

### Pass
- Expeditions count is readable on bright and dark trip photos.
- iOS stack swipe tracks the finger without the post-v3.30.3 hitch; Android look/feel is unchanged aside from the chip contrast.

---

## iOS WebKit compositor feel

**Commit:** v3.30.3 / BUG-228 (see `decisions.md` ADR 200). **Migrations:** none.  
**Flags:** none — always-on WebKit compositor fallback. Android Chrome must keep existing glass.

### Steps
1. On **iPhone Safari** (and Capacitor if installed): open login. Glass cards are solid/opaque, not heavy blur. Screen does not hitch on first paint.
2. Home trip stack: swipe left/right/up. Front card tracks the finger; peek cards scale without live `filter: blur`. Release commits browse/archive as before.
3. Open a trip: drag the content sheet. Sheet follows the finger; map does not pan during the drag. Snap is a transform spring (no jump when it settles).
4. Expense list: swipe a row to Edit/Delete. Row tracks the finger; action reveal fades in.
5. Swipe between tabs (from the screen edge). Panes follow the finger, then settle.
6. Open a modal / action sheet. Overlay is a darker solid, not frosted glass. Drag-to-dismiss still works.
7. Keyboard on Add Expense: sheet still clears the keyboard; layout does not jump every scroll frame.

### Negative checks
- **Android Chrome** (or desktop Chrome): login glass, stack pills, and modal overlays still use `backdrop-filter` blur. Gestures still commit the same actions.
- Flag N/A — there is no Superadmin flag for this UX fix.

### Pass
- iOS scroll/drag feels within a small gap of Android (no 15–30fps sheet/stack hitch). Android visuals are unchanged.

---

## Navigation, dialogs & sync UX pass (v3.31.0)

**Ids:** BUG-232 (F1), BUG-233 (F2), BUG-234 (F4), BUG-235 (F5), BUG-236 (F6); FEAT-083 (A), FEAT-084 (B), FEAT-085 (C), FEAT-086 (D), FEAT-087 (E). **Migrations:** none. **ADR:** #203.

### Flags
| Behavior | Flag | Default | Phase |
|----------|------|---------|-------|
| Back walks the tabs you visited (up to 5) | `enableTabBackHistory` | OFF | Phase 1 |
| `?trip=&tab=` mirrors the open screen; refresh / shared link restores it | `enableDeepLinkedTabs` | OFF | Phase 1 |
| Undo toast for member delete, member archive, recorded settlement | `enableExtendedUndo` | OFF | Phase 1 |
| New-expense draft survives app close (24h), covers payers / currency / location / itemized receipt | `enablePersistentExpenseDraft` | OFF | Phase 2 |
| Offline queue shows readable items, errors, per-item Retry / Discard | `enableSyncQueueInspector` | OFF | Phase 5 |

Arm each in Superadmin **Ops Deck → Flags** (arm the whole phase, or use **Tune Individual Flags**).

### Fixes (no flag — verify with all flags OFF)

**F1. Back closes the three overlays that used to ignore it**
1. (needs `enableSimplifyDebtsToggle`) Open a trip → Balances → tap the info icon next to "simplify" → the **Settlement Algorithm** sheet opens. Press browser Back / Android back / swipe-back → only the sheet closes; you stay on the same trip and tab. Repeat with **Esc** on desktop.
2. (needs `enableTripCloseout`) Settings → **Close out trip** → the closeout modal opens. Press Back → only the modal closes.
3. Go offline (DevTools → Network → Offline) and make any edit → tap the **In-Flight** pill → the queue drawer opens. Press Back → only the drawer closes.
4. In each case, with the overlay closed, one more Back leaves the trip as before (no extra history entry left behind).

**F2. Android: press back again to exit** (native Android build only)
1. From the trips list (root screen), press the back button once → a **"Press back again to exit"** pill appears and the app stays open.
2. Press back again within 2 seconds → the app exits.
3. Press once, wait 3 seconds, press again → the hint shows again (no exit).
4. Inside a trip / any sheet, back still steps out one level as before (no hint).

**F4. Web: reload warning on an unsaved new expense** (flag `enablePersistentExpenseDraft` OFF)
1. Add Expense → type a title or amount → reload or close the tab → the browser shows its "Leave site?" prompt.
2. Empty form, or editing an existing expense → no prompt.
3. Save the expense → no prompt afterwards.
4. Native app: no prompt at all (not applicable).

**F5. No more native `alert()` popups**
1. New Trip → enter a name, leave dates empty → **Save Trip** → a red inline message *"Please choose a start and end date for the trip."* appears under **Dates**; no browser alert. Pick both dates → message clears; trip saves.
2. Biometric enroll prompt (needs `enableBiometricAuth`, device with a passkey): cancel the system prompt / cause a failure → the error appears inside the prompt card in red. No alert; tapping ✕ clears it.

**F6. Focus is trapped and restored in the overlays** — open the simplify sheet or the queue drawer with the keyboard (Tab/Enter): Tab cycles inside the dialog; Esc closes it; focus returns to the button that opened it.

### A. `enableTabBackHistory`
1. Flag OFF → open a trip, go Summary → Expenses → Members, press Back → jumps straight to **Summary** (old behavior).
2. Flag ON → repeat: Back goes **Members → Expenses → Summary**, one step at a time; one more Back leaves the trip.
3. Switch to the same tab you're already on → no extra Back step.
4. Switch tabs more than 5 times → the last 5 steps are walkable; Back never breaks or skips the trip exit.
5. Swipe between tabs (edge swipe) → those switches are recorded too.
6. Leave the trip with the on-screen back arrow while on the Members tab → trips list shows; press Back once → you are **not** dropped into a stale tab of the old trip.
**Pass:** Back always retraces tabs in reverse order; leaving the trip is always the last step.

### B. `enableDeepLinkedTabs`
1. Flag ON → open a trip and switch tabs → the address bar shows `?trip=<id>&tab=<tab>` (Expenses tab = `ledger`, Summary = `expenses`). The Back stack is unchanged (no new entries).
2. Reload → you land on the same trip and tab.
3. Paste that URL into a new browser tab (signed in) → same trip and tab. Signed out → login, then you land on it afterwards.
4. Edit the URL to a trip id you don't belong to, or a tab that doesn't exist (`tab=nope`) → the app opens normally, no error, and the URL is rewritten to the real state.
5. Leave the trip → `trip` / `tab` are removed from the URL; other query params stay.
6. With `enableTabBackHistory` also ON: open a URL with `tab=members` → Back returns to Summary before leaving the trip.
7. Flag OFF → URL never gets `trip` / `tab`; existing `?trip=` in the URL is ignored.

### C. `enablePersistentExpenseDraft`
1. Flag OFF → type into Add Expense, hard-reload → reopening shows the draft only within the same browser tab session (old behavior); closing the tab loses it. Nothing stored in `localStorage` under `tt_draft_expense_*`.
2. Flag ON → Add Expense → title `Beach shack lunch`, amount `450`; wait 1s → DevTools → Application → Local Storage → `tt_draft_expense_<tripId>` exists with `savedAt`.
3. Close the tab / kill the app and reopen → Add Expense shows **"Restored unsaved draft"**, with title, amount, category, date, payer, split, multi-payer shares, currency, location, and itemized items restored.
4. Tap **Discard** on the banner → fields reset and the storage key is gone.
5. Save the expense → draft is removed; reopening Add Expense is blank.
6. Edit `savedAt` in DevTools to more than 24h ago → reopening shows a blank form and the key is deleted.
7. Background the app right after typing (switch tab / app) → the draft is still saved (flushed on hide).
8. With the flag ON, the browser "Leave site?" prompt (F4) is **not** shown.

### D. `enableSyncQueueInspector`
1. Flag OFF → go offline, make 2 edits → pill shows "2 staged offline"; drawer rows show a raw type name and "Staged locally", no buttons.
2. Flag ON → drawer rows read like **"Add expense: Dinner"**, **"Delete member: Asha"**, **"Create trip: Goa"**, each with **Retry** (online only) and **Discard**.
3. Go online with a change the server rejects (permission / policy error) → the row stays in the drawer with a red border, **"Needs attention: <error>"**, and is **not** dropped silently. It is skipped by automatic sync until you tap **Retry**.
4. A network failure shows **"Retrying (attempt N): <error>"** and keeps retrying automatically.
5. **Discard** → first tap changes the button to **Confirm?**, second tap removes the row. Discarding a queued *Add expense* also removes that expense from the ledger and anything queued against it.
6. Discarding the last item closes the drawer (banner disappears when online); pressing Back afterwards leaves the trip, not a ghost drawer.
7. Reload with items queued → rows, errors and "Needs attention" markers persist.

### E. `enableExtendedUndo`
1. Flag OFF → Members tab → delete a member (confirm) → member is deleted immediately, no undo toast.
2. Flag ON → delete a member (confirm) → member disappears from the list at once and a toast **"Member 'X' deleted · Undo"** shows for about 2 seconds.
   - Tap **Undo** → member is back, with balances and groups intact. Do nothing → member is deleted for good when the toast ends (offline queue shows "Delete member: X").
   - Delete member A, then quickly member B → A is deleted for good (committed), B gets the toast.
3. Archive a member → toast **"Member 'X' archived · Undo archive"**; Undo restores them. Restore an archived member → toast **"restored · Undo restore"**.
4. Record a settlement (Balances → Settle → confirm) → toast **"Settlement recorded · Undo settlement"**; Undo removes the settlement expense and the balance returns.
5. Leave the trip / close the app mid-toast on a member delete → the delete is committed, not lost.

### Negative checks
- With **all five flags OFF**: tab Back jumps to Summary, no URL params, no draft in `localStorage`, drawer rows show raw type names with no buttons, no undo toast for members or settlements. Fixes F1–F6 still apply.
- Superadmin **Traveler Preview** follows the same flags as real users.

### Pass
- Back always closes the top-most overlay first, then retraces tabs (flag ON), then leaves the trip; nothing is left in the history stack afterwards.
- A failed offline change is never lost without the user choosing **Discard**.
- Drafts survive an app kill for up to 24h and vanish after save, Discard or expiry.

## FEAT-TRIPSORT — Trip stack alphabetical swipe + sort toggle

**Commit:** `40d0d01`. **Migrations:** none.

### Flags
| Behavior | Flag | Default |
|----------|------|---------|
| Sort: A–Z / Date toggle under the stack | `enableTripStackSort` (Phase 1 Core) | OFF |
| Alphabetical ring + directional swipe | none (fix to existing behavior) | always on |

### Prep
Account with 4+ trips, e.g. Bali, agra, Goa, Coorg (mixed case, different start dates). Phone width (<900px).

### Steps
1. Open Home. Front card is **agra** (first A–Z, case-insensitive), not the newest trip.
2. Swipe **left** repeatedly: agra → Bali → Coorg → Goa → back to agra (wraps).
3. Swipe **right** repeatedly: agra → Goa → Coorg → Bali → agra.
4. Watch the pagination dots: the active dot moves in the same order; tap a dot to jump to that trip; scrub across the dots.
5. Enable `enableTripStackSort` in Ops Deck, reload. A `Sort: A–Z` pill appears beside "View all trips".
6. Tap it → `Sort: Date`; front card becomes the newest trip; left = next older, right = newer. Reload: choice persists.
7. Swipe up to archive a trip: stack advances without errors.
8. (v3.32.5, BUG-238) With 4+ trips, swipe left and right repeatedly, also fast flicks: the swiped-away card must not flash back at the front, and no blank white card should appear before the photo.
9. (v3.32.6, BUG-239) Drag slowly to the right without releasing: the trip rising behind the front card must be the *previous* trip (alphabetical/date), not the next one. Release: that same trip becomes the front with no swap. Drag left: the next trip rises.

### Negative checks
- Flag OFF → no Sort pill; order is always A–Z; left/right still step next/previous.
- 1 trip → no pill, swipe rubber-bands.

### Pass
- Left/right are exact opposites and wrap; dots match the stack; toggle persists.

---

## PERF-OPS-STACK — Ops Deck load + home stack smoothness

**Commit:** `432b854` (v3.32.7, BUG-240 / BUG-241). **Migrations:** none. **Flags:** none.

Two related performance fixes: Ops Deck / Bug Ledger no longer download the whole fleet on first paint, and the home trip stack drops live blur + forced reflow during swipe.

### Prep
- Superadmin account with a real Supabase project (not dummy env).
- Traveler account with 4+ trips that have cover photos.

### Steps

#### Superadmin portal / Bug Ledger
1. Sign in as superadmin. Default landing is Command Center (or Bugs if you used `#/bugs`).
2. Command Center should show the shell (rail, clock, health pill) quickly. Spend / settlement widgets may fill in a moment later — they wait on expenses, not on Bugs/Audit/Users.
3. Open **Bugs**. The table/kanban appears without a second full-ledger download. Expand a row or open the drawer: diagnostics / screenshot load then, not on first list paint.
4. Open **Analytics** or **Trips** after sitting on Bugs: expenses load on that tab, not retroactively while you were on Bugs.
5. Tap **Refresh** on a page: that page's data reloads. Jump search still finds trips from the already-loaded trip graph.

#### Home card stack
1. Open Home on a phone-width viewport with 4+ photo cards.
2. Drag slowly left and right: the front card tracks the finger without stutter; peek cards rise in the swipe direction (left = next, right = previous).
3. Flick left/right repeatedly: no blank white card, no flash of the old trip back to the front, no clunk at the end of the swipe.
4. Swipe up to archive: still works; confirm remains.
5. Data Saver ON: stack still swipes; no regression.

### Negative checks
- Non-superadmin never sees Ops Deck.
- Flag `enableTripStackSort` OFF: no Sort pill (existing). Stack smoothness does not depend on the flag.

### Pass
- Opening Ops Deck or Bugs no longer waits on every expense, audit log, user, and bug diagnostic before the first useful screen.
- Home stack swipe stays on the finger through the gesture and the commit, with no flash or hitch.

---

## FEAT-GROWTH2 — Invite conversion, telemetry, passport, nudges (unreleased)

**Migrations:** `0108_growth_telemetry_and_lifecycle.sql` (apply first; untested against a live DB when written, so run it on staging). **Edge function:** `send-lifecycle-nudge` (deploy, then one-time Vault secret `lifecycle_nudge_cron_secret` and env `LIFECYCLE_NUDGE_CRON_SECRET`, see migration header).

### Flags
| Behavior | Flag | Pack | Default |
|----------|------|------|---------|
| Invite preview value block + invite signup tag; share-page signup button | `enableInviteConversion` | Core | ON |
| Traveler Passport card in Settings | `enableTravelerPassport` | Trip | ON |
| App-open / sync-health events, join-preview counter, Retention + Reliability cards | `enableGrowthTelemetry` | Ops | OFF |
| Daily lifecycle push job | `enableLifecycleNudges` | Travel | OFF |

### A. Invite & share conversion (`enableInviteConversion`)
1. Ops Deck → Flags: confirm the flag is ON. Signed out (private window), open a real `/join/<code>`.
2. Preview shows the trip name, dates, who is on it, a three-line "what you get" block, then Continue with Google. Sign in and claim a name.
3. Ops Deck → Analytics → Growth → Signup source: `invite` increases by 1 for a **new** account. Known limit: an older account with no stored signup source that signs in through an invite link is also tagged `invite`.
4. Signed out, open `/share/<token>` from a trip with Share link on: a green "Splitting a trip with friends? Track it free" button shows under the totals. Tap it: lands on `/login`, and after a fresh Google signup the source shows as `trip_share`.
5. Guests still see no expenses, balances or member list on either page.

**Negative checks:** flag OFF → preview is the plain Google-only screen, share page has no button, no `invite` / `trip_share` source is recorded. An RPC failure also renders the original UI.

### B. Growth telemetry (`enableGrowthTelemetry`)
1. Flag OFF (default): open the app, then in the DB `select count(*) from app_events` stays 0; Growth cards show "No events yet".
2. Arm the flag globally. Reload as a normal user: one `app_open` row for today. Reload again: still one.
3. Go offline, add an expense, stay online-but-blocked (or leave the queue non-empty) for 10+ minutes: one `queue_stuck` row. Force a failing sync: one `sync_fail`. Let a queue drain: one `flush_ok`. Each appears at most once per session.
4. Open a signed-out `/join/<code>`: that trip's `join_preview_count` goes up by 1. Invalid code: nothing changes and no error is shown.
5. Ops Deck → Analytics → Growth: Retention table, Trip 1 → trip 2 tile, Sync reliability table and the "Signed-out invite previews" bar all render. Non-superadmin calling the `admin_*` RPCs gets "Superadmin access required".
6. `props` never contains expense, member or search text (inspect a few rows).

**Negative checks:** flag OFF again → new inserts are rejected by RLS and nothing is sent; join previews stop counting.

### C. Traveler Passport (`enableTravelerPassport`)
1. Settings shows a "Traveler Passport" card above "This Trip" with Trips, Destinations, Settled, Days away.
2. Two trips with destination "Goa" and " goa " count as 1 destination. A closed trip adds to Settled. A future trip adds no days.
3. No currency amounts appear anywhere on the card.

**Negative checks:** flag OFF → no card. No trips → no card.

### D. Lifecycle nudges (`enableLifecycleNudges`)
1. Flag OFF (default): invoke the function manually with the secret header: response `{"nudged":0,"candidates":0}` and nothing is sent.
2. Arm globally (or on one test trip). Create a trip older than 24h with no expenses and nobody else joined: the next run sends the organizer "Nobody has joined yet… code XXXXXX" (push if a token is registered, always an in-app "Trip Tip" notification).
3. Trip starting in 2 days with an empty checklist: packing nudge. A closed trip that ended 30 days ago: next-trip nudge.
4. Run again: no duplicate for the same trip + kind. A second eligible trip for the same user within 3 days: not sent.
5. User with Quiet hours active, or Digest mode ON: gets the in-app notification but no push.

**Negative checks:** flag OFF → nothing selected, nothing sent. Settlement reminders are unaffected either way.

### Pass
- With the two default-OFF flags left OFF, no new data is collected and no push is sent.
- Every new surface disappears when its flag is turned OFF.

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
