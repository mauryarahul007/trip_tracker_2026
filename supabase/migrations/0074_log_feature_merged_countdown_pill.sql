-- Log a dev-shipped feature directly (no live user request preceded it):
-- merged the trip-card countdown badge, destination, and weather into a
-- single unified pill instead of two stacked, disconnected pills. See
-- src/components/TripStack.tsx (CardContent header) and src/index.css
-- (.stack-header-caption / .stack-status-dot-indicator).
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
    'Merge trip-card countdown badge into the destination/weather pill',
    'The "IN X DAYS" / "ONGOING" status badge floated as its own separate pill above the destination + weather pill on the home trip-stack card, reading as disconnected and oddly positioned. Merged all three into one pill: countdown dot+label, then destination, then live weather, separated by middots.',
    'ui-ux',
    'shipped',
    'mauryarahul007@gmail.com',
    '{"platform": "web"}'::jsonb,
    now(),
    'claude',
    'Implemented in TripStack.tsx (CardContent header) commit f1f2345.'
  );
end $$;

notify pgrst, 'reload schema';
