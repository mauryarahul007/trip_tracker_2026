# Deep Links & Universal Links Contract

This document defines the deep-linking contracts, Universal Link / App Link paths, domain hosting requirements, and anonymous RPC permissions required for native link opening.

---

## 1. Canonical URL Formats

The Flutter application listens for both Universal Links (HTTPS) and custom URL schemes:

| Purpose | Canonical HTTPS Format | Custom Scheme Format | Target Flutter Route |
|---|---|---|---|
| **Join Trip (Invite Code)** | `https://<domain>/join/:code` | `com.triptracker.app://join/:code` | `/join/:code` |
| **Share Trip (View-only link)** | `https://<domain>/share/:token` | `com.triptracker.app://share/:token` | `/share/:token` |
| **Live Location Radar** | `https://<domain>/live/:token` | `com.triptracker.app://live/:token` | `/live/:token` |
| **Password Reset** | `https://<domain>/reset-password` | `com.triptracker.app://reset-password` | `/reset-password` |
| **OAuth Callback** | — | `com.triptracker.app://auth-callback` | Handled by Supabase auth listener |

---

## 2. Domain Hosting & Well-Known Assets

Apple and Android verify domain association by fetching metadata files directly from domain root:
- **iOS:** `https://<domain>/.well-known/apple-app-site-association`
- **Android:** `https://<domain>/.well-known/assetlinks.json`

### Strict Hosting Requirements
1. Must be served over **HTTPS**.
2. Must return HTTP status **`200 OK`** (strictly **NO HTTP redirects** like 301/302).
3. `Content-Type` header must be **`application/json`**.
4. Both files are maintained in [`public/.well-known/`](file:///home/rahulm/Documents/trip_tracker_2026/public/.well-known/) and bundled into web build artifacts (`dist/.well-known/`).

### Critical Infrastructure Blocker: GitHub Pages Subpath
> [!WARNING]
> **Subpath Domain Blocker:**
> When the web app is hosted on GitHub Pages with a repository sub-path (e.g. `https://mauryarahul007.github.io/trip_tracker_2026/`), universal links **CANNOT** function because Apple and Google strictly query the domain root (`https://mauryarahul007.github.io/.well-known/apple-app-site-association`), which GitHub Pages rejects or routes to the user's primary GitHub profile page.
>
> **Resolution / Required Action:**
> Universal Links and Android App Links require a **canonical custom domain** (e.g. `https://triptracker.app` or `https://app.triptracker.app`) mapped to the web deploy target (EC2, Cloudflare Pages, or custom domain on GitHub Pages). Custom scheme deep links (`com.triptracker.app://...`) function independently of this web hosting limitation.

---

## 3. Unauthenticated RPC Access Matrix

When a traveler taps an invite or share link on mobile without having an active account or session, the application must be able to display the trip preview before prompting for login. The following PostgreSQL RPCs are verified to work with the **Supabase Anon Key**:

| RPC Function | Migration Reference | Executable By | Purpose & Data Returned |
|---|---|---|---|
| `public.preview_trip_by_join_code(text)` | Migration `0081` | `anon`, `authenticated` | Returns trip name, dates, and member first names without exposing trip ID, internal member IDs, or expenses. Keyed by IP hash rate limit. |
| `public.record_join_preview(text)` | Migration `0108` | `anon`, `authenticated` | Increments invite preview counter for growth metrics. |
| `public.get_trip_share(uuid)` | Migration `0098` | `anon`, `authenticated` | Returns read-only public trip overview if the share token is valid and unexpired. |
| `public.record_trip_share_view(uuid)` | Migration `0107` | `anon`, `authenticated` | Increments share view count for growth ops. |
| `public.get_shared_location(uuid)` | Migration `0086` | `anon`, `authenticated` | Returns active traveler radar coordinates for valid unexpired live session tokens. |
| `public.get_app_version_gate(text, text, text)` | Migration `0112` | `anon`, `authenticated` | Returns minimum supported versions, update URLs, and maintenance status. |
| `public.get_app_flag(text)` | Migration `0060` | `anon`, `authenticated` | Reads public config flags (`signup_gate`, `maintenance_mode`). |
| `public.lookup_trip_by_join_code(text)` | Migration `0060` | `authenticated` only | Restricted to signed-in users attempting to claim membership. |
