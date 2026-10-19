# Staging Environment & Test Execution Matrix (`contract/STAGING_SETUP.md`)

This guide outlines the environment topology, database seeding procedures, test user credentials, and authentication token minting for automated CI and native smoke testing in the Flutter migration.

---

## 1. Environment Topology Matrix

| Environment | Purpose | Database Host | Migration Pipeline | Automated Tests Permitted |
|---|---|---|---|---|
| **Local Development** | Developer iteration, unit & integration tests | Local Docker Supabase (`supabase start`) | `supabase db reset` | **YES** |
| **Staging** | CI end-to-end testing, Flutter staging smoke runs | Dedicated Supabase Project | `supabase db push` / GitHub Actions | **YES** |
| **Production** | Live traveler app (`src/`, Capacitor, Flutter prod) | Supabase Production Project | Manual migration deployment / tags | **STRICTLY PROHIBITED** |

> [!CAUTION]
> **Cardinal Security Rule:** No automated test, load test, or mock script may ever point to or execute against the production Supabase project under any circumstances.

---

## 2. Seed Dataset & Test Personas (`supabase/seed/staging_seed.sql`)

The staging database is initialized using [`supabase/seed/staging_seed.sql`](file:///home/rahulm/Documents/trip_tracker_2026/supabase/seed/staging_seed.sql) to provide a rich dataset for testing RLS, outbox synchronization, conflict resolution, and offline behavior.

### Test Personas

| Role | Email | User ID (`auth.users.id`) | Password | Permissions & Scope |
|---|---|---|---|---|
| **Trip Owner** | `owner@triptracker.test` | `00000000-0000-0000-0000-000000000001` | `password123` | Admin of Trip 1 ("Goa") & Trip 2 ("Himalaya"). Full CRUD on expenses, members, settings. |
| **Trip Member** | `member@triptracker.test` | `00000000-0000-0000-0000-000000000002` | `password123` | Participant in Trip 1. Can view/add expenses, collaborative fields, chat. Cannot delete trip. |
| **Outsider** | `outsider@triptracker.test` | `00000000-0000-0000-0000-000000000003` | `password123` | Owner of Trip 3 ("Secret"). Zero read or write access to Trip 1 or Trip 2 (RLS isolation anchor). |

---

## 3. Seeded Entities Breakdown

1. **Trips:**
   - `11111111-1111-1111-1111-111111111111`: "Goa Weekend Getaway 🏖️" (Multi-user collaborative trip).
   - `11111111-1111-1111-1111-111111111112`: "Himalayan Solo Trek 🏔️" (Single traveler trip).
   - `11111111-1111-1111-1111-111111111113`: "Outsider Secret Trip 🔒" (Isolation test anchor).
2. **Expenses in Trip 1:**
   - Equal split (`equal`)
   - Custom weights split (`custom`)
   - Exact amounts split (`exact`)
   - Percentage split (`percentage`)
   - Multi-payer split (`paid_by_shares`)
   - Confirmed settlement (`is_settlement = true`, `settlement_confirmed_at` populated)
   - Disputed transaction (`disputed_at` and `dispute_note` populated)
   - Soft-deleted expense (`deleted_at` populated in 24h grace window for recycle-bin / tombstone tests)
   - Pending approval threshold transaction (`approval_status = 'pending_approval'`)
3. **Collaboration & Chat:**
   - 2 checklist items (1 completed, 1 pending)
   - 1 rich note
   - 1 flight boarding pass stub
   - 3 chat messages (including system event cards and edited status)

---

## 4. Applying Staging Schema & Seed

### Local Development:
```bash
# Start Supabase locally
supabase start

# Reset and seed database
supabase db reset
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/seed/staging_seed.sql
```

### Staging Cloud Project:
```bash
# Push additive migrations to staging
supabase link --project-ref <STAGING_PROJECT_REF>
supabase db push

# Apply seed dataset
psql "<STAGING_CONNECTION_STRING>" -f supabase/seed/staging_seed.sql
```

---

## 5. Token Minting for CI & Native Testing

Automated integration tests can obtain authenticated tokens using Supabase Auth password grant:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function getTestUserTokens() {
  const { data: ownerAuth } = await supabase.auth.signInWithPassword({
    email: 'owner@triptracker.test',
    password: 'password123',
  });

  const { data: memberAuth } = await supabase.auth.signInWithPassword({
    email: 'member@triptracker.test',
    password: 'password123',
  });

  const { data: outsiderAuth } = await supabase.auth.signInWithPassword({
    email: 'outsider@triptracker.test',
    password: 'password123',
  });

  return {
    ownerToken: ownerAuth.session?.access_token,
    memberToken: memberAuth.session?.access_token,
    outsiderToken: outsiderAuth.session?.access_token,
  };
}
```

### Running Native Flutter Smoke Test Against Staging
```bash
cd flutter_app
flutter run --dart-define-from-file=env/staging.json
# Navigate to /smoke-test to execute connectivity and RLS validation
```
