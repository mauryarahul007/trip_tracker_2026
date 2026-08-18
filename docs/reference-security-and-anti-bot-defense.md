# Security Hardening & Anti-Bot Defense Reference

This document outlines the multi-layered security architecture, anti-DDoS protections, and bot defense mechanisms implemented in **Trip Tracker 2026** across the client UI, Supabase Storage, and PostgreSQL database.

---

## 1. Security Architecture Overview

Trip Tracker 2026 employs a **defense-in-depth** model where security constraints are enforced at four independent tiers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. CLIENT UI TIER (React / Vite PWA / Mobile)                              │
│    • Honeypot decoy form traps to block automated scrapers.                 │
│    • Pre-validation of file sizes (< 5MB) and MIME types before upload.     │
│    • Live lockout countdown timer for rate-limited requests.                │
│    • Cloudflare Turnstile CAPTCHA integration.                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. EDGE & GATEWAY TIER (Cloudflare / Kong API Gateway)                      │
│    • L3/L4 volumetric DDoS mitigation via Anycast edge.                     │
│    • Token-bucket rate limiting per IP and authenticated JWT.              │
│    • Managed bot challenges & Web Application Firewall (WAF).               │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. STORAGE TIER (Supabase Storage: `receipts`)                              │
│    • Hard 5MB per-file upload size cap (`file_size_limit = 5242880`).       │
│    • Strict image MIME whitelist (`jpeg`, `png`, `webp`, `heic`, `heif`).   │
│    • Storage RLS policies restricting file access strictly to trip members. │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. DATABASE TIER (PostgreSQL 15+ / Supavisor Connection Pooler)             │
│    • Statement timeouts (`5000ms` authenticated, `3000ms` anon) for anti-DDoS.│
│    • Join code brute-force rate limiter (5 failed attempts per 15 min).     │
│    • Row Level Security (RLS) on all application tables.                   │
│    • Revocation of all mutating permissions (`INSERT/UPDATE/DELETE`) from anon.│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Threat Matrix & Defensive Countermeasures

| Attack Vector | Target Surface | Impact | Implemented Countermeasure |
| :--- | :--- | :--- | :--- |
| **Join Code Brute-Force** | `lookup_trip_by_join_code` RPC | Unauthorized entry to private trips | **Sliding Lockout Engine**: Max 5 failed attempts per 15 min; enforces 15-minute temporary lockout in PostgreSQL. |
| **Storage Flooding / Bloat** | `receipts` storage bucket | Storage quota burnout & massive cloud bills | **5MB Bucket Quota & MIME Whitelist**: Database and client reject non-images or files exceeding 5MB. |
| **Slow-Query / DB Lockup** | PostgreSQL / PostgREST | 100% CPU exhaustion / service disruption | **Statement Timeouts**: Hard `5000ms` execution ceiling automatically kills runaway queries. |
| **Automated Form Spam** | Join / Expense / Trip Forms | Spam trips, false expense logs | **Honeypot Decoys & Turnstile**: Offscreen form traps drop automated scripts before network calls. |
| **Anonymous Tampering** | Public REST Tables | Data modification without authentication | **Permission Revocation**: `REVOKE INSERT, UPDATE, DELETE FROM anon` on all public tables. |

---

## 3. Database Layer Hardening

### A. Join Code Rate Limiting & Cooldown (`Migration 0047`)
To prevent attackers or bots from discovering 6-character trip join codes through automated enumeration:
1. **Tracking Table (`public.trip_join_attempts`)**:
   - Stores `user_id`, `failed_attempts`, `locked_until`, and `last_attempt_at`.
   - Table permissions are completely revoked from client roles (`anon`, `authenticated`), making direct manipulation impossible.
2. **PL/pgSQL RPC Logic (`lookup_trip_by_join_code`)**:
   - Checks if the user is currently under a lockout. If locked, raises an informative exception with the remaining cooldown seconds:
     ```sql
     raise exception 'Too many invalid join code attempts. Please wait % seconds before trying again.', v_lockout_seconds;
     ```
   - On incorrect join code, increments `failed_attempts`. If failures reach $\ge 5$, sets `locked_until = now() + interval '15 minutes'`.
   - On valid join code, immediately resets `failed_attempts` to `0` and clears `locked_until`.

### B. Statement Timeouts for Query-Based Anti-DDoS (`Migration 0046`)
To protect database CPU and connection pools from slow-query exhaustion attacks:
```sql
ALTER ROLE authenticated SET statement_timeout = '5000ms';
ALTER ROLE anon SET statement_timeout = '3000ms';
```
Any complex nested join or query taking longer than 5 seconds is aborted by PostgreSQL, preserving database throughput for all users.

### C. Permission Revocation for Anonymous Role (`Migration 0046`)
All write capabilities are explicitly revoked from the `anon` role:
```sql
REVOKE INSERT, UPDATE, DELETE ON public.trips FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.members FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.groups FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.group_members FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.categories FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.expenses FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.device_push_tokens FROM anon;
```

---

## 4. Storage Bucket Hardening

The Supabase `'receipts'` storage bucket is hardened against arbitrary file uploads and quota exhaustion:

1. **Bucket Configuration (`Migration 0046`)**:
   - `file_size_limit`: `5242880` bytes (5 MB).
   - `allowed_mime_types`: `['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']`.
   - `public`: `false`.
2. **Storage Object RLS Policies**:
   - **SELECT**: Restricted to trip participants via `public.is_trip_participant(((storage.foldername(name))[1])::uuid)`.
   - **INSERT**: Requires authenticated user to be a verified participant of the trip folder.
   - **UPDATE / DELETE**: Strictly limited to trip administrators or the original expense creator.

---

## 5. Client-Side & UI Security Controls

### A. Honeypot Bot Traps
Invisible decoy form inputs are rendered across all interactive submission screens:
```tsx
{/* Honeypot field for automated bot trap */}
<div style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none', height: 0, overflow: 'hidden' }} aria-hidden="true">
  <input
    type="text"
    name="trip_join_security_token"
    tabIndex={-1}
    autoComplete="off"
    value={honeypotVal}
    onChange={(e) => setHoneypotVal(e.target.value)}
  />
</div>
```
If an automated web scraper auto-fills this field, the client drops the request immediately with zero network traffic.

### B. Client-Side Upload Pre-Validation (`src/utils/image.ts`)
Before reading large files into memory or converting to Base64:
* Verifies `file.size <= 5MB`.
* Verifies `file.type` against allowed image MIME types.
* Automatically downscales and compresses photos to a 1000px maximum bounding box at 70% JPEG quality before cloud upload.

### C. Live Cooldown Countdown UX (`JoinTripScreen.tsx`)
When a rate-limit exception occurs:
* The client parses the remaining seconds from the database response.
* Renders a live countdown timer (`Try again in Xm Ys`).
* Disables the submission button until the cooldown period expires.

### D. Cloudflare Turnstile Integration (`TurnstileWidget.tsx`)
* Seamless component supporting Cloudflare Turnstile anti-bot verification.
* Can be enabled in any environment by defining `VITE_TURNSTILE_SITE_KEY`.
* Operates in non-interactive / invisible mode for legitimate human users.

### E. JSON Backup Data Sanitization (`src/utils/backupValidation.ts`)
* Prevents prototype pollution (`__proto__`, `constructor`) during backup imports.
* Validates and caps string lengths, dates, positive numeric amounts, and trip counts before persisting to IndexedDB or executing database mutations.

---

## 6. Offline-First Resilience During Incidents

Because Trip Tracker 2026 uses an offline-first storage queue (`localforage` IndexedDB):
* If the Supabase API is experiencing high latency, 429 rate limiting, or undergoing a DDoS mitigation event, **the app does not crash or lock out users**.
* All local expenses, trip edits, and settlement calculations continue operating locally.
* Mutations are queued in `syncQueue` and synchronized automatically with exponential backoff and randomized jitter once the backend connection stabilizes.

---

## 7. Applied Migration History

* **`0046_security_hardening_phase1.sql`**: Storage bucket quotas, image MIME whitelist, PostgreSQL statement timeouts, RLS re-assertion, and anon permission revocation.
* **`0047_security_hardening_phase2_join_limits.sql`**: `trip_join_attempts` tracking table and 5-attempt brute-force rate limiter with 15-minute sliding lockout.
* **`0048_security_hardening_phase3_constraints_and_audit.sql`**: Entity field `CHECK` constraints (lengths, positive amounts, valid date ranges) and `security_audit_logs` administrative audit trail.
