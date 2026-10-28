# Incident: Authentication Failure

## Purpose
Diagnose and recover when users cannot sign in — Google OAuth, superadmin email/password, or guest/demo mode (`src/store/authStore.ts`).

## Impact
Users blocked from sign-in cannot access cloud-synced trips or superadmin tools. Guest/demo mode (`signInAsGuest`, `signInAsDemoUser`) does not depend on Supabase and is a viable fallback path for basic app usage during an auth outage.

## Severity
P1 (blocks sign-in broadly); P0 if it also blocks the superadmin console during an active incident requiring superadmin access.

## Symptoms
- Google OAuth (`supabase.auth.signInWithOAuth`) fails or redirects incorrectly.
- Superadmin email/password sign-in (`supabase.auth.signInWithPassword`, gated by an optional Turnstile `captchaToken`) fails or hangs.
- `supabase.auth.onAuthStateChange` never fires after a sign-in attempt.
- `isMissingSupabaseEnv` is `true` in the deployed build — the client is pointed at a dummy Supabase project, so **all** real auth silently fails while looking like an outage (see [Supabase/Database Unavailable](supabase-database-unavailable.md) Diagnosis for how to check this).

## Immediate Actions
1. Determine which sign-in path is affected: Google OAuth, superadmin password, or both. Guest/demo mode failing would indicate a client-side bug unrelated to Supabase, since those paths never call `supabase.auth`.
2. If only superadmin sign-in is affected, verify whether Cloudflare Turnstile (`VITE_TURNSTILE_SITE_KEY`, optional) is configured and whether the Turnstile widget itself is loading (a Turnstile outage would present as a stuck/failing captcha, not an auth server issue).

## Diagnosis
- Check browser devtools Network tab for the actual `supabase.auth` request/response during a failed sign-in attempt — distinguishes a Supabase Auth outage (5xx/timeout) from a credential/config issue (4xx: invalid grant, redirect URI mismatch) from a captcha failure.
- For Google OAuth specifically: a redirect URI mismatch (Supabase project's configured OAuth redirect vs. the deployed domain) is a common non-outage cause — compare the deployed origin (GitHub Pages subpath vs. EC2 domain root) against what's registered in the Supabase project's Auth settings. NOT VERIFIED what redirect URIs are currently registered; check the Supabase dashboard directly.
- Native (Capacitor) builds use PKCE flow specifically because "the custom URL scheme callback can't use the implicit flow" (`src/services/supabaseClient.ts` comment) — an auth failure isolated to the native app (web unaffected) points at the custom URL scheme / deep-link callback, not Supabase itself.

## Recovery
- If it's a Supabase Auth outage: no client-side fix — see [Supabase/Database Unavailable](supabase-database-unavailable.md).
- If it's a redirect URI/config mismatch: correct the registered redirect URI in the Supabase project's Auth settings (dashboard action, outside this repo) to match the current deployed origin.
- If it's the dummy-client fallback (missing env vars on a deploy): fix the GitHub Actions secret and redeploy — see [Application Down](application-down.md).
- In the meantime, direct affected users to guest/demo mode for basic (non-synced) usage.

## Validation
- Complete a real sign-in (Google OAuth or superadmin password) end to end and confirm `onAuthStateChange` fires and the app transitions out of the login screen.

## Rollback
No verified rollback mechanism found for third-party OAuth/Auth provider issues. For a bad redirect-URI config change, revert it in the Supabase dashboard to the prior working value.

## Escalation
Escalate to a human with Supabase dashboard access for any Auth settings change (redirect URIs, provider config) — these are outside the codebase and not scriptable from this repo.

## Do Not
- Do not disable Turnstile/captcha for superadmin sign-in as a workaround without human approval — it's a deliberate anti-bot control (`docs/reference-security-and-anti-bot-defense.md`).
- Do not weaken RLS or auth checks to "unblock" a user during an incident.

## Root Cause Follow-Up
- If caused by a redirect URI drift after a domain/deploy change, document the correct value somewhere durable so future deploys don't repeat it — NOT VERIFIED where (if anywhere) this is currently tracked.
