-- Log two dev-shipped Flutter features directly (no live user request preceded
-- them): per-person balance bars in the ledger, and an Add expense quick
-- action under the top trip card. Gated by the Trip pack flags
-- enableBalanceBars and enableTripCardQuickAdd (src/utils/featureFlags.ts).
do $$
declare
  next_n int;
begin
  select coalesce(max((regexp_match(id, '^FEAT-(\d+)$'))[1]::int), 0)
  into next_n
  from public.features
  where id ~ '^FEAT-\d+$';

  insert into public.features (
    id, title, description, category, status, requested_by, environment,
    shipped_at, shipped_by, shipped_note, linked_flag_key
  ) values (
    'FEAT-' || lpad((next_n + 1)::text, 3, '0'),
    'Who is up, who is down: balance bars in the Flutter ledger',
    'The Who pays whom section only listed transfers, so there was no at-a-glance view of who is owed and who owes. It now opens with one bar per person from a centre line (green right for owed, red left for owes), scaled to the biggest balance, with a screen-reader sentence per row. Hidden once everyone is settled.',
    'ui-ux',
    'shipped',
    'mauryarahul007@gmail.com',
    '{"platform": "flutter"}'::jsonb,
    now(),
    'claude',
    'Flutter widgets/balance_bars.dart wired into ledger_tab.dart; flag enableBalanceBars, Trip pack, default ON.',
    'enableBalanceBars'
  );

  insert into public.features (
    id, title, description, category, status, requested_by, environment,
    shipped_at, shipped_by, shipped_note, linked_flag_key
  ) values (
    'FEAT-' || lpad((next_n + 2)::text, 3, '0'),
    'Add expense quick action under the top trip card (Flutter)',
    'Adding an expense from the Trips deck meant opening the trip first. A new Add expense button under the top card opens the new-expense form for that trip. Hidden for archived and closed trips; swiping, opening and the long-press menu are unchanged.',
    'ui-ux',
    'shipped',
    'mauryarahul007@gmail.com',
    '{"platform": "flutter"}'::jsonb,
    now(),
    'claude',
    'Flutter trip_card_stack.dart (onAddExpense) and trips_screen.dart; flag enableTripCardQuickAdd, Trip pack, default ON.',
    'enableTripCardQuickAdd'
  );
end $$;

notify pgrst, 'reload schema';
