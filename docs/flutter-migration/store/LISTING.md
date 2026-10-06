# Store listing pack (Phase 12.6): everything the owner pastes into the consoles

Drafts to edit. Owner holds the Apple and Google accounts. Same bundle id / applicationId `com.triptracker.app`, so this is an **update** of the existing listings.

## Text
| Field | Draft | Limit |
|-------|-------|-------|
| App name | Trip Tracker | 30 |
| Subtitle (iOS) | Split trip costs with friends | 30 |
| Short description (Play) | Track and split group trip expenses, even offline. | 80 |
| Keywords (iOS) | trip,expense,split,group,travel,budget,settle,bill,shared,offline | 100 |
| Category | unchanged (Travel on iOS; Travel & Local on Play: confirm what the current listing uses) | |
| Support URL | https://trip-tracker.blackmaroon.in (confirm a support page or mailbox exists) | |
| Privacy policy URL | https://trip-tracker.blackmaroon.in/privacy | |
| Account deletion URL (Play requires one) | https://trip-tracker.blackmaroon.in/delete-account | |
| Age rating | Everyone / 4+. No user-generated public content (chat is private to a trip), no purchases | |

### Full description (draft)
> Trip Tracker is the easy way to share costs on a trip. Add an expense in seconds, split it any way you like, and see exactly who owes whom. It works offline, so a bad signal never stops you.
>
> - Add expenses with equal, exact, percentage or itemised splits
> - Works offline and syncs when you are back online
> - Settle up with the fewest payments, share a summary, pay by UPI where available
> - Trip chat, notes, packing checklist and travel passes
> - Receipts, maps, weather and Trip Wrapped
> - Invite friends with a code or link; they do not need to pay or set anything up
>
> Your trips stay private to the people you invite.

### Release notes (first Flutter release)
> A completely new, faster Trip Tracker, rebuilt as a native app. Your trips and expenses come with you when you sign in. If you used Guest mode, export your data from the old version first (Settings, Export my local data) and restore it here (Settings, Restore backup).

## Screenshots (generate from seeded staging data, never real user data)
| Device class | Sizes needed | Screens to capture |
|--------------|--------------|--------------------|
| iPhone 6.9" and 6.5" | Apple's current required sizes (**verify in App Store Connect**) | Trips list, add expense, balances/settle up, chat, trip wrapped |
| iPad 13" (only if iPad is supported) | | same |
| Android phone | 1080 x 1920 or larger, 2-8 images | same |
| Android 7" / 10" tablet | optional | same |
Seed with the staging persona (`contract/STAGING_SETUP.md`), set the device clock to 9:41, hide notifications, light and dark variants.

## Per-store checklists
### iOS
- [ ] Usage strings in `Info.plist` match `flutter_app/docs/PERMISSIONS.md` (camera, photos, Face ID, location when in use and always)
- [ ] `ITSAppUsesNonExemptEncryption = false` (added; HTTPS only)
- [ ] Background modes: `location` (live location share, user-started, 12 h limit) and `remote-notification` (push). Justification text in `REVIEW_NOTES.md`
- [ ] Capabilities in Xcode: Push Notifications, Sign in with Apple, Associated Domains with the real host (B-014, B-137)
- [ ] Privacy nutrition label from `flutter_app/docs/PRIVACY_LABELS.md`; App Tracking Transparency not needed (no tracking)
- [ ] In-app account deletion present (Settings, Delete account)
- [ ] Demo account and notes for reviewers (`REVIEW_NOTES.md`)

### Android
- [ ] Target API at the current Play requirement (the Flutter plugin sets `targetSdk`; **check the console message at upload**)
- [ ] Data safety form from `PRIVACY_LABELS.md` section 4
- [ ] Background location declaration with video and justification (live location share) or remove background location from the manifest if it is not needed (see `REVIEW_NOTES.md`)
- [ ] Foreground-service type `location` declared (manifest has `FOREGROUND_SERVICE_LOCATION`)
- [ ] Play App Signing enabled; upload the `.aab` from the release pipeline
- [ ] `assetlinks.json` hosted and verified for the https host
- [ ] Merged manifest permission audit (see `flutter_app/docs/PERMISSIONS.md`); 64-bit only builds are produced by default
