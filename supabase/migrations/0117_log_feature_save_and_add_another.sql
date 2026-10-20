-- Log a dev-shipped feature directly (no live user request preceded it):
-- "Save and add another" on the Flutter new-expense form. Gated by the Trip
-- pack flag enableSaveAndAddAnother (src/utils/featureFlags.ts); see
-- flutter_app/lib/features/expenses/presentation/expense_form_screen.dart.
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
    shipped_at, shipped_by, shipped_note, linked_flag_key
  ) values (
    next_id,
    'Save and add another on the new-expense form (Flutter)',
    'Logging a run of expenses meant reopening the form after every Save. The new-expense form now has a second button, Save and add another: it saves, clears the form (starting from the remembered payer, category and split when those flags are on), refocuses the amount field and keeps the screen open. Hidden when editing.',
    'ui-ux',
    'shipped',
    'mauryarahul007@gmail.com',
    '{"platform": "flutter"}'::jsonb,
    now(),
    'claude',
    'Flutter expense_form_screen.dart and expense_form_controller.dart (resetForNext); flag enableSaveAndAddAnother, Trip pack, default ON.',
    'enableSaveAndAddAnother'
  );
end $$;

notify pgrst, 'reload schema';
