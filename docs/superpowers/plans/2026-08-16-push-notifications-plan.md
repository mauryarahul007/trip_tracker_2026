# Push Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notify trip members via native push for three events — a new expense added by someone else, a member joining the trip, and an on-demand settlement reminder — using Firebase Cloud Messaging for both Android and iOS.

**Architecture:** A single Supabase table (`device_push_tokens`) stores one row per device per user. A single Supabase Edge Function (`send-push`) is the only thing that talks to FCM — it verifies the caller shares a trip with every requested recipient (closing an otherwise-open spam vector), looks up their tokens, and sends via FCM's HTTP v1 API. All three trigger events are client-driven, not database triggers: the app calls the Edge Function right after the action that should notify someone succeeds (new expense saved, member claimed, reminder button tapped) — this matches the app's existing client-driven sync model (decision #8/#17 in `decisions.md`) rather than adding `pg_net`/database-level HTTP triggers. iOS devices register with FCM too (not raw APNs) — Capacitor's Push Notifications plugin supports this by adding the iOS app to the same Firebase project and uploading the Apple Developer account's APNs key to Firebase, so the backend only ever needs to speak to one provider.

**Tech Stack:** `@capacitor/push-notifications`, a new Supabase Edge Function (Deno, using `npm:google-auth-library` for FCM's OAuth2), a new Postgres migration.

**Spec:** No standalone spec doc — scoped via clarifying-question dialogue during brainstorming. Confirmed trigger set: (a) new expense added by another trip member, (b) member joins a trip, (c) settlement reminder (on-demand, not scheduled — kept minimal per YAGNI unless a scheduled variant is trivially cheap to add later).

**Depends on:** `docs/superpowers/plans/2026-08-16-capacitor-base-shell-plan.md` (native shell must exist to build/test push on-device).

## Global Constraints

- Push delivery is always best-effort and fire-and-forget from the caller's perspective — a push failure must never block or fail the primary action (saving an expense, joining a trip, sending a reminder). Every client call site wraps the push call so its errors are swallowed after logging, never surfaced to the user or thrown.
- The `send-push` Edge Function must verify the caller (`auth.uid()` from their JWT) shares at least one trip with every user ID they're asking to notify, using the existing `members` table (`trip_id` + `linked_user_id`) — no new membership table, and no trusting the client's recipient list unchecked.
- No scheduled/automatic settlement reminders in this plan — only a user-tapped "Remind" button. A cron-based version is explicitly out of scope unless a later task in this plan says otherwise.
- App ID stays `com.triptracker.app`, matching the base-shell plan.

---

### Task 1: Device push token table

**Files:**
- Create: `supabase/migrations/0045_add_device_push_tokens.sql`
- Modify: `src/types/database.ts` (this repo has no live Supabase project to auto-regenerate types from migrations — `database.ts` is hand-maintained and must be updated in the same task as the migration, or `npm run build` breaks for any later task that queries the new table)

**Interfaces:**
- Produces: `public.device_push_tokens(id, user_id, platform, fcm_token, created_at, updated_at)` — consumed by Task 3 (client upsert) and Task 2 (Edge Function lookup). Also produces the matching `Database['public']['Tables']['device_push_tokens']` TypeScript type in `src/types/database.ts` (Row/Insert/Update/Relationships, following the shape of the file's existing sibling table entries, with a `user_id` → `profiles.id` foreign key), consumed by every later task's TypeScript compilation.

- [ ] **Step 1: Check the latest migration number**

Run: `ls supabase/migrations | tail -3`
Expected: confirms `0044_backfill_creator_as_member.sql` is the latest, so this migration is `0045_...`.

- [ ] **Step 2: Write the migration**

```sql
-- supabase/migrations/0045_add_device_push_tokens.sql
create table public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  fcm_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, fcm_token)
);

create index device_push_tokens_user_id_idx on public.device_push_tokens (user_id);
alter table public.device_push_tokens enable row level security;

create policy "users manage their own device tokens"
  on public.device_push_tokens for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

- [ ] **Step 3: Applying the migration is a user step, not part of this task**

This execution environment has no linked Supabase project and no local Docker/Postgres available (`supabase start` needs Docker, which isn't reachable here) — `npx supabase db push` cannot run against the real project from here, and it shouldn't: applying a migration to a live database is exactly the kind of action that needs the project owner doing it deliberately, not an automated task step. This task's deliverable is the migration *file*, reviewed for correctness by inspection (Step 4) — not an applied migration. The user runs `npx supabase db push` themselves once ready (documented in Task 8).

- [ ] **Step 4: Verify the migration file by inspection**

Re-read `supabase/migrations/0045_add_device_push_tokens.sql` as written and check it against the existing migrations' conventions (e.g. `supabase/migrations/0044_backfill_creator_as_member.sql` or `0041_add_expense_recycle_bin.sql` for RLS-policy style): correct `create table`/`create index`/RLS syntax, the `unique (user_id, fcm_token)` constraint present, `enable row level security` before the policy, policy `using`/`with check` both reference `auth.uid()`. No live database check is possible in this environment.

- [ ] **Step 4.5: Add the matching TypeScript type to `src/types/database.ts`**

Read `src/types/database.ts` first — find an existing sibling table entry under `Database['public']['Tables']` (e.g. `categories` or `groups`) to match its exact shape. Add a `device_push_tokens` entry: `Row` (all 6 migration columns), `Insert` (all fields except the ones with SQL defaults: `id`, `created_at`, `updated_at` optional), `Update` (`Partial<{ platform, fcm_token, updated_at }>`), and `Relationships` with one entry for the `user_id` → `public.profiles.id` foreign key. This step exists because this repo has no live Supabase project to auto-generate `database.ts` from migrations — skipping it breaks `npm run build` for Task 3 (discovered during that task's implementation; folded back into this task's text since it belongs with the migration, not scattered into whichever later task happens to need the table first).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0045_add_device_push_tokens.sql src/types/database.ts
git commit -m "feat: add device_push_tokens table for push notification registration"
```

---

### Task 2: `send-push` Edge Function

**Files:**
- Create: `supabase/functions/send-push/index.ts`

**Interfaces:**
- Consumes: `public.device_push_tokens` and `public.members` (Task 1, existing schema); `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (already-standard Supabase Edge Function secrets), `FCM_SERVICE_ACCOUNT_JSON` (new secret, set up in Task 7).
- Produces: an HTTPS endpoint invocable via `supabase.functions.invoke('send-push', { body: { userIds, title, body, data } })` — the exact call shape Tasks 4–6's client code use.

- [ ] **Step 1: Write the function**

```typescript
// supabase/functions/send-push/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2';
import { GoogleAuth } from 'npm:google-auth-library@9';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FCM_SERVICE_ACCOUNT_JSON = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON')!;

interface SendPushRequest {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 });
  }
  const jwt = authHeader.replace('Bearer ', '');

  let requestBody: SendPushRequest;
  try {
    requestBody = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }
  const { userIds, title, body, data } = requestBody;
  if (!Array.isArray(userIds) || userIds.length === 0 || !title || !body) {
    return new Response(JSON.stringify({ error: 'userIds, title, and body are required' }), { status: 400 });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: callerData, error: callerError } = await supabaseAdmin.auth.getUser(jwt);
  if (callerError || !callerData.user) {
    return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401 });
  }
  const callerId = callerData.user.id;

  // Only allow notifying users who share at least one trip with the caller —
  // otherwise any authenticated user could push arbitrary text to any user ID.
  const { data: callerMemberships, error: membershipError } = await supabaseAdmin
    .from('members')
    .select('trip_id')
    .eq('linked_user_id', callerId);
  if (membershipError) {
    return new Response(JSON.stringify({ error: membershipError.message }), { status: 500 });
  }
  const callerTripIds = (callerMemberships || []).map((m) => m.trip_id);
  if (callerTripIds.length === 0) {
    return new Response(JSON.stringify({ error: 'Caller is not a participant in any trip' }), { status: 403 });
  }

  const { data: recipientMembers, error: recipientError } = await supabaseAdmin
    .from('members')
    .select('linked_user_id')
    .in('trip_id', callerTripIds)
    .in('linked_user_id', userIds);
  if (recipientError) {
    return new Response(JSON.stringify({ error: recipientError.message }), { status: 500 });
  }
  const allowedUserIds = new Set((recipientMembers || []).map((m) => m.linked_user_id));
  const filteredUserIds = userIds.filter((id) => allowedUserIds.has(id));
  if (filteredUserIds.length === 0) {
    return new Response(JSON.stringify({ sent: 0, total: 0 }), { status: 200 });
  }

  const { data: tokens, error: tokenError } = await supabaseAdmin
    .from('device_push_tokens')
    .select('fcm_token')
    .in('user_id', filteredUserIds);
  if (tokenError) {
    return new Response(JSON.stringify({ error: tokenError.message }), { status: 500 });
  }
  if (!tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ sent: 0, total: 0 }), { status: 200 });
  }

  const serviceAccount = JSON.parse(FCM_SERVICE_ACCOUNT_JSON);
  const auth = new GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });
  const accessToken = await auth.getAccessToken();

  let sent = 0;
  for (const { fcm_token } of tokens) {
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: fcm_token,
            notification: { title, body },
            data: data || {},
          },
        }),
      }
    );
    if (res.ok) sent++;
  }

  return new Response(JSON.stringify({ sent, total: tokens.length }), { status: 200 });
});
```

- [ ] **Step 2: Deploying the function is a user step, not part of this task**

Same reasoning as Task 1: this environment has no linked Supabase project/CLI session, so `npx supabase functions deploy send-push` cannot run from here, and shouldn't run unattended even if it could — deploying a new backend endpoint is a deliberate user action. This task's deliverable is the function's source code, reviewed by static inspection (Step 3) — not a live deployed function. The user deploys it themselves once ready (documented in Task 8).

- [ ] **Step 3: Verify the function by static inspection**

Re-read `supabase/functions/send-push/index.ts` as written. Check: the membership-authorization block runs and can short-circuit (`filteredUserIds.length === 0`) BEFORE any FCM/`GoogleAuth` code executes; every early return produces a valid `Response` object; the Deno/npm import specifiers (`npm:@supabase/supabase-js@2`, `npm:google-auth-library@9`) are syntactically well-formed. No live invocation is possible in this environment — the curl-based smoke test from the original plan draft is deferred to Task 8, once the user has actually deployed the function against their real project.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/send-push/index.ts
git commit -m "feat: add send-push Edge Function with trip-membership authorization"
```

---

### Task 3: Client push registration

**Files:**
- Create: `src/services/pushRegistration.ts`
- Modify: `src/store/authStore.ts`

**Interfaces:**
- Consumes: `Capacitor.isNativePlatform()`/`Capacitor.getPlatform()` from `@capacitor/core`; `PushNotifications` from `@capacitor/push-notifications`.
- Produces: `registerForPushNotifications(userId: string): Promise<void>` and `unregisterPushNotifications(userId: string): Promise<void>`, called from `authStore.ts`'s existing session lifecycle.

- [ ] **Step 1: Install the plugin**

Run: `npm install @capacitor/push-notifications`

- [ ] **Step 2: Write the registration module**

```typescript
// src/services/pushRegistration.ts
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from './supabaseClient';

export async function registerForPushNotifications(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') return;

    await PushNotifications.addListener('registration', async (token) => {
      await supabase.from('device_push_tokens').upsert(
        {
          user_id: userId,
          platform: Capacitor.getPlatform() as 'ios' | 'android',
          fcm_token: token.value,
        },
        { onConflict: 'user_id,fcm_token' }
      );
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('Push registration failed:', err);
    });

    await PushNotifications.register();
  } catch (err) {
    console.error('Push notification setup failed:', err);
  }
}

export async function unregisterPushNotifications(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await supabase.from('device_push_tokens').delete().eq('user_id', userId);
    await PushNotifications.removeAllListeners();
  } catch (err) {
    console.error('Push notification teardown failed:', err);
  }
}
```

- [ ] **Step 3: Read the current `authStore.ts` in full before editing**

Read `src/store/authStore.ts` (already modified once by the base-shell plan's Task 6 — re-read its current state, don't assume the version quoted in that plan is still exact after any conflicts during implementation).

- [ ] **Step 4: Wire registration into the session lifecycle**

In `initialize()`'s `onAuthStateChange` callback, after `set({ session })`, add:

```typescript
import { registerForPushNotifications, unregisterPushNotifications } from '../services/pushRegistration';
// ...existing imports...

supabase.auth.onAuthStateChange((_event, session) => {
  set({ session });
  if (session?.user) {
    registerForPushNotifications(session.user.id);
  }
});
```

And in `signOut`, before `set({ session: null })`:

```typescript
signOut: async () => {
  const userId = get().session?.user.id;
  await supabase.auth.signOut();
  if (userId) {
    await unregisterPushNotifications(userId);
  }
  set({ session: null });
},
```

- [ ] **Step 5: Type-check**

Run: `npm run build`
Expected: compiles cleanly.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/services/pushRegistration.ts src/store/authStore.ts
git commit -m "feat: register/unregister device push tokens on sign-in/out"
```

---

### Task 4: Notify other trip members when an expense is added

**Files:**
- Create: `src/services/pushApi.ts`
- Modify: `src/store/tripStore.ts`

**Interfaces:**
- Produces: `sendPushNotification(userIds: string[], title: string, body: string, data?: Record<string, string>): Promise<void>` — a fire-and-forget wrapper around `supabase.functions.invoke('send-push', ...)`, reused by Tasks 5 and 6.

- [ ] **Step 1: Write the shared client helper**

```typescript
// src/services/pushApi.ts
import { supabase } from './supabaseClient';

export async function sendPushNotification(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  if (userIds.length === 0) return;
  try {
    await supabase.functions.invoke('send-push', { body: { userIds, title, body, data } });
  } catch (err) {
    // Push delivery is best-effort — never block or fail the caller's primary action.
    console.error('Push notification failed:', err);
  }
}
```

- [ ] **Step 2: Read the current `addExpense` action in `tripStore.ts`**

Read `src/store/tripStore.ts` around the `addExpense` action (currently lines 724–789 — re-read live, since Tasks 1–3 of the other two plans may have shifted line numbers) — specifically the `saveAction` closure that calls `insertExpense` and its `set(...)` afterward.

- [ ] **Step 3: Fire the notification after a successful save**

Inside `saveAction`, immediately after the existing `set((state) => ({ expenses: ..., trips: ... }))` call that follows `insertExpense`, add:

```typescript
const trip = get().trips.find((t) => t.id === tripId);
const recipients = Object.values(get().members)
  .filter((m) => m.linkedUserId && m.linkedUserId !== userId)
  .map((m) => m.linkedUserId as string);
sendPushNotification(
  recipients,
  trip?.name || 'Trip Tracker',
  `${savedExpense.title} — ${savedExpense.currency} ${savedExpense.amount.toFixed(2)} added`
);
```

Add the import at the top of `tripStore.ts`:
```typescript
import { sendPushNotification } from '../services/pushApi';
```

This call is not awaited — it's genuinely fire-and-forget so it never delays the optimistic-UI flow `addExpense` already provides. If the user is offline (the `queueSync('addExpense', ...)` branch instead of `saveAction`), no notification fires for that add until the app is next online and the queued item is replayed through `processQueue()` — Step 4 covers that path too.

- [ ] **Step 4: Fire the notification from the offline-queue replay path too**

Read `processQueue()` in `tripStore.ts` (referenced by decision #17 as already handling `addExpense` replay) and locate where a queued `addExpense` item successfully calls `insertExpense` during replay. Add the same `sendPushNotification(...)` call there, using the queued item's resolved trip/member data at replay time (not the original enqueue-time state, since members/trip name could have changed while offline).

- [ ] **Step 5: Manual verification**

This is fire-and-forget UI-adjacent code with no meaningful unit-testable pure logic beyond what `pushApi.ts` already is (a thin wrapper) — verify manually: with two devices/accounts both joined to the same trip and both push-registered (Task 3), add an expense on device A and confirm device B receives a push notification.

- [ ] **Step 6: Commit**

```bash
git add src/services/pushApi.ts src/store/tripStore.ts
git commit -m "feat: notify other trip members via push when an expense is added"
```

---

### Task 5: Notify existing members when someone joins the trip

**Files:**
- Modify: `src/components/JoinTripScreen.tsx`

**Interfaces:**
- Consumes: `sendPushNotification` from Task 4.

- [ ] **Step 1: Read the current `handleClaim` in `JoinTripScreen.tsx`**

Read `src/components/JoinTripScreen.tsx` in full (currently ~50 lines shown above — re-read live) — specifically `handleClaim`, which calls `claimTripMember(memberId)` and, on success, calls `goToTrip(result.tripId)`.

- [ ] **Step 2: Add the notification after a successful claim**

`JoinLookupResult` (defined in `src/services/tripApi.ts`) has the shape `{ tripId: string; tripName: string; isAdmin: boolean; myMemberId: string | null; unclaimedMembers: { id: string; name: string }[] }` — there is no separate `fetchMembersForTrip` export, so query `members` directly rather than guessing at an existing helper.

In `handleClaim`, right after the `if (!claimed) { ... return; }` guard and before `if (result) await goToTrip(result.tripId);`, add:

```typescript
if (result) {
  const joinedMemberName = result.unclaimedMembers.find((m) => m.id === memberId)?.name || 'Someone';
  const { data: tripMembers } = await supabase
    .from('members')
    .select('id, linked_user_id')
    .eq('trip_id', result.tripId)
    .not('linked_user_id', 'is', null);
  const recipients = (tripMembers || [])
    .filter((m) => m.id !== memberId)
    .map((m) => m.linked_user_id as string);
  sendPushNotification(recipients, result.tripName, `${joinedMemberName} joined the trip`);
}
```

Add the imports at the top of `JoinTripScreen.tsx`:
```typescript
import { sendPushNotification } from '../services/pushApi';
import { supabase } from '../services/supabaseClient';
```

- [ ] **Step 3: Type-check**

Run: `npm run build`
Expected: compiles cleanly — this step will surface any mismatch between the assumed `JoinLookupResult` field names in Step 2 and its real shape; fix the property names if the compiler flags them.

- [ ] **Step 4: Manual verification**

With two devices/accounts, have one already-joined member (push-registered) and have a second person join via the invite link on another device — confirm the first device receives a "X joined the trip" push.

- [ ] **Step 5: Commit**

```bash
git add src/components/JoinTripScreen.tsx
git commit -m "feat: notify existing trip members via push when someone joins"
```

---

### Task 6: On-demand settlement reminder

**Files:**
- Modify: `src/components/BalancesSettlements.tsx`
- Modify: `src/App.tsx` (pass the new `members` prop at the existing `<BalancesSettlements>` call site, line 996)

**Interfaces:**
- Consumes: `sendPushNotification` from Task 4.
- Produces: `BalancesSettlements` gains a new required prop `members: Record<string, Member>` (for resolving a transfer's `fromMemberId`/`toMemberId` to a `linkedUserId`) — no change to its existing `onSettle` prop contract.

- [ ] **Step 1: Read the current transfer-row rendering in `BalancesSettlements.tsx`**

Read `src/components/BalancesSettlements.tsx` in full. Confirmed structure: the top-level export `BalancesSettlements` is typed by `type Props = {...}` (line 7), and each unsettled transfer row is rendered by a separate `TransferRow` function component (line 150) typed by `type TransferRowProps = {...}` (line 50), invoked twice (lines 605 and 648, inside two different render branches of `BalancesSettlements`).

- [ ] **Step 2: Thread a `members` prop through**

Add `members: Record<string, Member>` to both `Props` (line 7) and `TransferRowProps` (line 50) — import `Member` alongside the existing `Expense, Group, Trip` type import on line 2 (`import type { Expense, Group, Member, Trip } from '../types';`). Pass `members` from `BalancesSettlements`'s destructured params down into both `<TransferRow ... />` call sites (lines 605 and 648).

- [ ] **Step 3: Add the reminder handler and button**

In `TransferRow` (line 150), alongside the existing "Settle" button (around where `onSettle(t.fromMemberId, t.toMemberId, ...)` is called), add:

```tsx
<button
  type="button"
  className="secondary-btn"
  style={{ padding: '6px 10px', fontSize: '12px' }}
  onClick={() => {
    const fromLinkedUserId = members[t.fromMemberId]?.linkedUserId;
    if (!fromLinkedUserId) return;
    sendPushNotification(
      [fromLinkedUserId],
      'Settlement reminder',
      `You owe ${t.toLabel} ${t.amount.toFixed(2)} for this trip`
    );
  }}
  disabled={!members[t.fromMemberId]?.linkedUserId}
  title={members[t.fromMemberId]?.linkedUserId ? 'Send a reminder' : 'This member has no linked account to notify'}
>
  🔔 Remind
</button>
```

Add the import at the top of the file:
```typescript
import { sendPushNotification } from '../services/pushApi';
```

- [ ] **Step 4: Pass `members` down from the parent**

`<BalancesSettlements ... />` is rendered once, in `src/App.tsx` (lines 996–1008). `members` (a `Record<string, Member>`) is already destructured and in scope in `App.tsx` (line 34) — add `members={members}` alongside the existing `trip={activeTrip}` / `balances={balances}` / etc. props at that call site.

- [ ] **Step 5: Type-check**

Run: `npm run build`
Expected: compiles cleanly.

- [ ] **Step 6: Manual verification**

With two devices/accounts sharing a trip with an outstanding balance, tap "🔔 Remind" on the owing member's transfer row from the other member's device — confirm the owing member's device receives the reminder push. Confirm the button is disabled/absent for members with no linked account (nothing to notify).

- [ ] **Step 7: Commit**

```bash
git add src/components/BalancesSettlements.tsx src/App.tsx
git commit -m "feat: add on-demand settlement reminder push notification"
```

---

### Task 7: One-time Firebase/APNs account setup (documentation)

**Files:**
- Modify: `README.md`
- Create: `android/app/google-services.json` (real credential file, not committed with placeholder content — see Step 3)
- Create: `ios/App/App/GoogleService-Info.plist` (same caveat)

**Interfaces:**
- Produces: the `FCM_SERVICE_ACCOUNT_JSON` secret Task 2's Edge Function reads, and the two native config files Capacitor's Android/iOS builds need to talk to Firebase.

- [ ] **Step 1: Document the one-time Firebase Console setup**

This is app-owner account configuration involving real external credentials — not something this plan can generate. Add a section to `README.md`:

```markdown
## Push notifications (Firebase)

Push notifications use a single Firebase project for both Android and iOS, via Capacitor's
Push Notifications plugin. One-time setup (already-registered Apple Developer account required
for the iOS half):

1. Create a Firebase project. Add an Android app with package name `com.triptracker.app` —
   download the generated `google-services.json` into `android/app/google-services.json`.
2. Add an iOS app to the same Firebase project with bundle ID `com.triptracker.app` —
   download `GoogleService-Info.plist` into `ios/App/App/GoogleService-Info.plist`.
3. In the Apple Developer account, generate an APNs Auth Key (Certificates, Identifiers &
   Profiles -> Keys), then upload it in Firebase Console -> Project Settings -> Cloud
   Messaging -> Apple app configuration, so FCM can deliver to iOS devices via APNs
   under the hood.
4. In Firebase Console -> Project Settings -> Service Accounts, generate a new private key
   (a JSON file). Set its full contents as the `FCM_SERVICE_ACCOUNT_JSON` secret:
   `npx supabase secrets set FCM_SERVICE_ACCOUNT_JSON='<paste JSON>'`
5. Add the same two files' presence as a Codemagic build requirement — either commit them
   (Firebase config files are not sensitive; they identify the app, not a secret key) or
   inject them from a Codemagic encrypted file, matching whichever this repo already does
   for other config. Since neither file contains a private key, committing them alongside
   the rest of `android/`/`ios/` (already tracked, per the base-shell plan) is the simpler option.
```

- [ ] **Step 2: Wire the native Firebase config into the platform build files**

Read `android/app/build.gradle` and confirm/add the Google Services Gradle plugin (Capacitor's `npx cap sync android` may already require this if `@capacitor/push-notifications` is present — check `android/build.gradle` (project-level) for `com.google.gms:google-services` in the `dependencies` block and `android/app/build.gradle` for `apply plugin: 'com.google.gms.google-services'`; add both if `npx cap sync android` didn't already).

- [ ] **Step 3: Place the real credential files (user-performed)**

The actual `google-services.json`/`GoogleService-Info.plist` contents come from the user's Firebase Console (Step 1) — this step cannot be completed by an agent without those account-specific downloads. Once the user provides them, place them at the paths in Step 1 and commit.

- [ ] **Step 4: Commit the documentation (credential files committed separately once available)**

```bash
git add README.md android/build.gradle android/app/build.gradle
git commit -m "docs: document Firebase/APNs one-time setup for push notifications"
```

---

### Task 8: On-device verification and sign-off

**Files:**
- None (verification-only task).

**Interfaces:**
- Consumes: Tasks 1–7.
- Produces: a `decisions.md` entry recording this sub-project.

- [ ] **Step 0: Apply the migration and deploy the function (deferred from Tasks 1-2 — no automated environment could reach the real Supabase project)**

Run: `npx supabase db push`, then `npx supabase functions deploy send-push`. Then smoke-test the authorization check (replacing `<anon-jwt>` with a real logged-in test user's session JWT, obtainable via the browser dev tools `localStorage` Supabase session while logged into the running dev app):
```bash
curl -i -X POST 'https://<project-ref>.supabase.co/functions/v1/send-push' \
  -H "Authorization: Bearer <anon-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"userIds": ["00000000-0000-0000-0000-000000000000"], "title": "test", "body": "test"}'
```
Expected: `200` with `{"sent":0,"total":0}` (the fake recipient ID isn't a real co-member, filtered out before ever reaching FCM) — proves the endpoint is live and the membership check runs before any FCM call.

- [ ] **Step 1: Confirm the Firebase config files are in place (Task 7 prerequisite)**

Run: `ls android/app/google-services.json ios/App/App/GoogleService-Info.plist`
Expected: both exist (placed by the user per Task 7, Step 3). If missing, push notifications cannot be tested on-device yet — stop here and confirm with the user before proceeding.

- [ ] **Step 2: Rebuild and sync**

Run: `VITE_BASE_PATH=/ npm run build && npx cap sync`

- [ ] **Step 3: Verify all three triggers end-to-end**

Using two real devices/accounts both joined to the same test trip:
- [ ] New expense added by member A → member B's device receives a push (Task 4).
- [ ] A third person joins the trip via invite link → both existing members' devices receive a push (Task 5).
- [ ] Member B taps "🔔 Remind" on an unsettled transfer owed by member A → member A's device receives a push (Task 6).
- [ ] Sign out on one device → confirm (via the Supabase dashboard table editor) its row in `device_push_tokens` is deleted, and that device no longer receives pushes after re-triggering an event from the other device.

- [ ] **Step 4: Confirm web is unaffected**

Run: `npm run dev` — confirm the web build has no push-related UI/errors (the "🔔 Remind" button should still render on web since `sendPushNotification` degrades safely — it just won't have a device to deliver to, and the Edge Function's `sent: 0` response causes no error).

- [ ] **Step 5: Record the outcome in `decisions.md`**

Read the end of `decisions.md` first, then append a new numbered entry describing the push notification architecture (client-driven triggers over DB triggers, single FCM provider for both platforms, the trip-membership authorization check in the Edge Function, and the scoped-out automatic/scheduled reminder).

- [ ] **Step 6: Commit**

```bash
git add decisions.md
git commit -m "docs: record push notifications sub-project completion"
```
