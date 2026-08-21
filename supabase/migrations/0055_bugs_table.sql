-- Real backend for the Bug Ledger. Previously the UI only talked to
-- /api/bugs, a Vite dev-server-only middleware reading/writing
-- bugs/bugs.json on disk -- nonexistent in any real deployment, so the UI
-- silently fell back to per-browser localStorage there. Two different
-- visitors (or the same person on two devices) saw two different ledgers,
-- and nothing recorded via the bug.mjs CLI ever reached them. This table
-- is the shared source of truth for the deployed app; bug.mjs + bugs.json
-- remain a separate, git-tracked ledger for AI/CLI agents working in the
-- repo during development -- unrelated, not migrated here.

create table public.bugs (
  id text primary key,
  title text not null,
  description text not null default '',
  severity text not null check (severity in ('critical', 'high', 'medium', 'low')),
  category text not null check (category in (
    'offline-sync', 'splits-math', 'ui-ux', 'navigation', 'auth',
    'receipts-camera', 'p2p-sync', 'performance', 'general'
  )),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'wont_fix')),
  found_by text not null default 'unknown',
  environment jsonb not null default '{}'::jsonb,
  repro_steps text[] not null default '{}',
  expected_behavior text not null default '',
  actual_behavior text not null default '',
  diagnostics jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text,
  resolution_note text
);

create index bugs_status_idx on public.bugs (status);

alter table public.bugs enable row level security;

-- Internal tool: superadmin-only, same as the rest of the Ops Deck.
create policy "superadmins manage bugs"
  on public.bugs for all
  to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

notify pgrst, 'reload schema';
