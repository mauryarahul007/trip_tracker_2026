# Review notes and declarations (drafts for App Review and Play review)

## Notes to App Review (paste into App Store Connect)
> Trip Tracker splits shared trip expenses between friends. It does not process payments.
> **Demo account:** email ______ / password ______ (seeded trip "Goa Weekend" with 4 people). Please do not delete it.
> **Sign in with Apple** is offered alongside Google and email. **Account deletion:** Settings, Delete account.
> **Location (always):** used only when the user starts "Live Location Share" for a trip; it stops after 12 hours or when switched off, and is visible only to that trip's members.
> **Push notifications:** trip activity alerts; asked once after the first saved expense.
> **Camera and photos:** attach receipt photos. **Face ID:** optional app lock.
> No ads, no tracking, no purchases.

## Background location justification (Play and Apple)
Feature: user-initiated live location sharing with the other members of one trip, for meeting up while travelling. Behaviour: starts only after the user taps Start Sharing and grants permission; heartbeat every 60 seconds; auto-stops after 12 hours; a persistent in-app indicator shows while active. Without background access the position would stop updating when the screen locks.
**Open question for the owner:** if the foreground-only version is acceptable, drop `ACCESS_BACKGROUND_LOCATION` and `UIBackgroundModes: location` to avoid the extra review and the declaration video. Decide before the first Play submission (B-190).

## Play declarations
- Data safety: `flutter_app/docs/PRIVACY_LABELS.md` section 4.
- Foreground service: type `location` (live location).
- Account deletion: URL above and in-app path.
- Ads: none. Target audience: 18+ (policy text requires adults in India; see privacy policy).
