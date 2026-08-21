-- Backfill structured `data` fields for notification rows written before
-- 0052 (when the send-push edge function pre-built a sentence into `body`
-- instead of storing type+params). The in-app panel already falls back to
-- parsing `body` for these legacy rows (src/utils/notificationText.ts), so
-- this is a display-quality cleanup, not a correctness fix: it makes old
-- rows match the same data shape as new ones instead of relying on the
-- regex fallback every render.

-- expense_deleted / expense_updated / expense_restored:
-- legacy body was `"<title>" was deleted` / `was updated` / `was restored`
-- (quotes optional depending on call site).
update public.notifications
set data = data || jsonb_build_object('expenseTitle', trim(both '"' from m[1]))
from (
  select id, regexp_match(body, '^"?(.+?)"?\s+was (?:deleted|updated|restored)$', 'i') as m
  from public.notifications
  where data ->> 'type' in ('expense_deleted', 'expense_updated', 'expense_restored')
    and data ->> 'expenseTitle' is null
    and body is not null
) matched
where public.notifications.id = matched.id
  and matched.m is not null

-- expense_added:
-- legacy body was `<title> — <currency> <amount> added`.
update public.notifications
set data = data || jsonb_build_object(
  'expenseTitle', trim(both '"' from m[1]),
  'currency', m[2],
  'amount', m[3]
)
from (
  select id, regexp_match(body, '^"?(.+?)"?\s+—\s+([A-Za-z]+)\s+([\d,]+\.?\d*)\s+added$', 'i') as m
  from public.notifications
  where data ->> 'type' = 'expense_added'
    and data ->> 'expenseTitle' is null
    and body is not null
) matched
where public.notifications.id = matched.id
  and matched.m is not null
