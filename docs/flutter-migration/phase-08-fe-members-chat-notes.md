# Phase 8 (FE): Members, groups, chat, notes/checklist, passes

**Track:** Flutter UI · **Size:** XL · **Depends on:** Phases 5, 6 · **Parallel with:** 7
**Read first:** [README.md](README.md), `PARITY_MATRIX.md` (this phase's rows), `contract/API_CONTRACT.md` §Realtime §Storage.

## Goal
The collaboration surface: people, chat (realtime, media, voice), shared notes/checklists, and travel passes/documents.

## Web sources to port
`MembersGroupsTab`, `TripChatPanel`, `TripbotConfirmSheet`, `LiveLocationChatBanner` (banner only; live map in Phase 9), `ChecklistNotesTab`, `TravelPassWalletView` + `TravelPassWalletModal`, `PassScannerModal`, `DocumentVaultModal`, `TripMediaGalleryModal`, `TripContentSheet`, `InAppNotificationBanner` (shared with Phase 10), hooks `useTripChatUnread`, `useChatMuteEventCards`, `usePeerPresence`; services `tripMessagesApi`, `chatMediaApi`, `chatReadCursorApi`, `offlineChatStore`, `passAttachmentStore`, `documentVaultStore`.
Read: `docs/howto-manage-groups.md`, `docs/howto-manage-checklists-and-notes.md`, `contract/IOS_DEFECTS.md` (chat composer/keyboard items).

## Tasks

### 8.1 Members & groups
Roster list, add member (name, link to existing user, previous-members suggestions, contacts), rename, archive/unarchive (soft-delete semantics: archived excluded from new splits, preserved in history), roles (`memberRoles`, `updateTripMemberRoles`), claim-your-member (`claim_trip_member`) UX, groups CRUD with `groupNaming`, invite entry (reuses Phase 6 share sheet), split-exclusion defaults UI (`updateTripSplitExclusionDefaults`), per-member date ranges (`memberDateRange`), member detail with balance summary (read from Phase 7 providers).

### 8.2 Chat (flag-aware, chat-first nav aware)
- Message list: pagination (load older), day separators, grouped bubbles, status (`sending/sent/delivered`), edit (`edit_trip_message`), delete (tombstone), reply-to with quote, reactions (map emoji → memberIds), pins, link previews if web has them, message kinds from `TripMessageKind`: text, image, voice_note, expense_added / link / deleted / restored, settlement_recorded / confirmed, expense_disputed / resolved. **Event cards** render via `chatExpenseCards` data and deep-link to the expense/settlement; honour mute-event-cards pref (`useChatMuteEventCards`).
- Composer: multiline growth, attach image (camera/gallery, compress via `flutter_image_compress`, upload to the chat-media bucket with progress, retry), **voice notes** (`record` package: AAC/m4a, hold-to-record/slide-to-cancel, waveform + `just_audio` playback), emoji, `@`-mentions only if web has them. **Keyboard handling is the headline iOS fix**: composer must ride the keyboard smoothly with interactive dismissal; verified against `IOS_DEFECTS.md`.
- Realtime: new messages, edits, reactions, read cursors (`chatReadCursorApi`), typing/presence if web has it, unread badge on the nav tab (`useTripChatUnread`), offline outbox for sends (`offlineChatStore` parity) with clear pending/failed UI + retry.
- Tripbot: parse chat text → expense draft (`TripbotConfirmSheet`, `expenseQuickParser`); confirm creates expense via Phase 7 repository and posts the event message with `source: 'tripbot'`.
- Media gallery (`TripMediaGalleryModal`): grid of trip images/receipts, full-screen zoom/swipe, share/save (`gal`/`image_gallery_saver` permission handling).
- Mute trip (`setTripMutedRow`), notification-affecting settings link out to Phase 10.

### 8.3 Notes & checklist
Checklist items (category packing/prep/documents/medical/general, assignee, completed-by/at), reorder, filter, progress; notes (rich-enough text parity with web: check whether markdown/plain; link detection); **concurrent edit behaviour** per `tripCollabMerge`/`set_trip_collab_field` (field-level merge, optimistic UI, remote update animation, no cursor jumps while typing: debounce + merge on blur/pause); templates / `packingSuggestions`; read `checklistNotes` store tests for expected behaviour (`src/store/checklistNotes.test.ts`).

### 8.4 Passes & documents (Travel pack: flag-gated)
Travel pass wallet (flight/train/hotel passes, `TravelPass` model, `passParser`, `passBackStub`, `passReminders` → local notifications scheduled in Phase 10 infra), add pass by manual form / camera scan / PDF import (`pdfrx` + text extraction replacing `unpdf`; barcode/QR via `mobile_scanner`), pass attachment storage (encrypted, Phase 5), full-screen boarding-pass view with **screen-brightness boost** (`screen_brightness`) and keep-awake (`wakelock_plus`), `PassScannerModal` (scan to add), document vault (encrypted local store, biometric gate per web), share sheet restrictions per web.

### 8.5 Tests & verification
- Unit/widget: bubble grouping, status transitions, reaction toggle, composer state machine, checklist merge.
- Realtime integration test (staging, two accounts): messages appear < 2 s, edit/delete/reaction sync, read cursors, offline send → reconnect delivers once (no duplicates).
- Golden images: message bubbles by kind (light/dark), checklist row, pass card.
- Manual: `FEATURE_TEST_STEPS.md` chat/members/notes/passes sections + new Flutter steps (keyboard interactive dismissal, voice permissions denied/granted, background audio interruption); update parity matrix.

## Deliverables
Members, Chat, Notes/Checklist, Passes/Docs screens + tests, updated docs/matrix, ADRs (audio package, PDF package, chat list implementation), `HANDOFF.md` entry.

## Out of scope
Live-location map (Phase 9), push notification delivery/UI (Phase 10), OCR receipts (Phase 9).

## Exit criteria
- [ ] All T1 members/chat/notes parity rows `done`/`skipped+reason`; T2 passes rows done or explicitly deferred.
- [ ] Chat: 2-account staging test passes; no duplicate/missing messages across 20 offline-send cycles.
- [ ] Chat composer verified on a real iOS device (or Codemagic simulator capture) against every relevant `IOS_DEFECTS.md` line.
- [ ] 1,000-message thread scrolls ≥ 55 fps; image upload shows progress and survives app background.
- [ ] Concurrent checklist edits from two accounts converge identically to web behaviour.
