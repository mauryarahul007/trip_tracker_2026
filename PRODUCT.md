# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Small friend/family trip groups (roughly 2-10 people) splitting shared travel costs together — casual, non-commercial use. One person typically creates the trip and invites the rest via a join code; not everyone needs an account to view.

## Product Purpose

Trip Tracker 2026 is a mobile-first, offline-capable, multi-user trip-expense splitter. Create a trip, invite friends with a join code, log expenses with flexible split modes, and see who owes whom in real time, synced across every device via Supabase, with a native Android/iOS app and an installable web PWA sharing the same codebase.

## Positioning

Offline-first with real-time cross-device sync: the app works fully without a connection (mutations queue locally and sync on reconnect), but every member sees live updates on every other device the moment they're back online. Native camera, geolocation, and haptics come from the same shared codebase across web PWA and Capacitor-wrapped Android/iOS, rather than separate platform builds.

## Operating Context

Used before/during/after a group trip, often with unreliable connectivity (flights, remote destinations). Core workflow: create a trip → invite via join code or link → add members and optional groups (couples, kids, etc.) → log expenses on the go (often with a receipt photo) → check Balances & Settlements to see who pays whom → settle up, optionally via UPI deep link. A settled trip can be frozen against further edits. Deleted expenses land in a recoverable recycle bin rather than being gone immediately.

## Capabilities and Constraints

- Cloud-synced trips (Supabase Postgres + Row Level Security); every member sees live updates on every device
- Join by 6-character code or link; no account required to view
- Member & group management, including couples/kids-style groups for one-tap split selection
- 4 expense split modes: equal, weighted, exact amount, percentage, with live running-total feedback
- Receipt photos, client-compressed, offline-safe local caching until synced
- Trip Journey Map (MapLibre) plotting geotagged expenses along the route
- Search/filter by title, category, member, date range
- Custom categories with emoji icon picker, alongside built-ins
- Soft-delete recycle bin for expenses (24h purge window)
- Settlement engine: greedy algorithm minimizing number of transfers to settle all debts
- Charts & analytics: spending by category, per-member contribution
- CSV export (Excel-compatible); full JSON backup/restore
- Email/password auth (Supabase Auth) with password reset
- Privacy Blind Mode: one tap blurs every amount on screen
- Trip freeze: locks a settled trip against further edits
- Push + in-app notifications (expense added/edited, member joined, trip deleted, settlement reminders), WhatsApp-style notification center
- Offline-first PWA: installable, service worker with stale-while-revalidate caching + local receipt queue, auto-syncs on reconnect
- Self-updating web app in the background with an update-available banner
- Capacitor-based Android & iOS builds sharing the full web codebase
- In-app "Report a Problem" (auto-captured diagnostic snapshot) and flag-gated "Suggest a Feature"
- Superadmin Ops Deck: Flags, fleet Analytics, Trips directory, Users, security Audit log, Feature tracker, Tools — plus terminal CLIs for filing/resolving bugs and features
- Security hardening: RLS on every table, join-code rate limiting, Cloudflare Turnstile + honeypot anti-bot, DB-level constraints, audit logging, locked-down CSP

Constraint: no Tailwind config in the repo — styling is hand-authored CSS custom properties in `src/index.css` plus per-component class names (see DESIGN.md).

## Brand Commitments

Fixed product name: "Trip Tracker 2026". No other binding voice/identity constraints established.

## Evidence on Hand

Live deployed app: https://mauryarahul007.github.io/trip_tracker_2026/ — real production usage, real bug/feature tracker (bugs/bugs.json, features/features.json) with a substantial resolved-issue history. No testimonials, case studies, or press exist; future work must not fabricate any.

## Product Principles

- Offline-first correctness over convenience: no data loss or silent failure when disconnected; sync queues and reconciles rather than blocking.
- Multi-device real-time consistency: what one trip member sees should reach every other member's device promptly once online.
- One shared codebase, one design language: web PWA and native Android/iOS wrappers stay visually and behaviorally identical rather than diverging per platform.
- User control and privacy by default: Blind Mode, trip freeze, and a recoverable recycle bin all favor reversibility and discretion over irreversible, exposed-by-default behavior.
- Security-hardened by default: RLS, rate limiting, anti-bot defenses, and audit logging are baseline, not opt-in.
