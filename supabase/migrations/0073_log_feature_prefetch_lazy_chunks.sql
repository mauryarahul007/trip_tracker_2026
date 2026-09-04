-- Log a dev-shipped feature directly (no live user request preceded it):
-- prefetch the ExpenseForm/SettingsTab lazy chunks on FAB/settings-tab
-- hover-or-press intent so the first open isn't gated on the chunk's
-- network fetch. See src/components/NavTabs.tsx.
do $$
declare
  next_id text;
begin
  select 'FEAT-' || lpad(
    (coalesce(max((regexp_match(id, '^FEAT-(\d+)$'))[1]::int), 0) + 1)::text,
    3, '0'
  )
  into next_id
  from public.features
  where id ~ '^FEAT-\d+$';

  insert into public.features (
    id, title, description, category, status, requested_by, environment,
    shipped_at, shipped_by, shipped_note
  ) values (
    next_id,
    'Prefetch lazy-loaded modal chunks on hover/press intent',
    'ExpenseForm and SettingsTab are code-split (React.lazy). Hovering or pressing the "+" FAB / Settings tab now fires a matching import() ahead of the click, warming the chunk cache so the modal opens without a network+eval stall on first use.',
    'performance',
    'shipped',
    'claude',
    '{"platform": "web"}'::jsonb,
    now(),
    'claude',
    'Implemented in NavTabs.tsx (prefetchExpenseForm / prefetchSettingsTab on onMouseEnter/onPointerDown).'
  );
end $$;

notify pgrst, 'reload schema';
