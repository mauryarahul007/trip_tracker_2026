-- The edge function stops writing a pre-built sentence into body going
-- forward — the in-app panel now renders display text client-side from
-- (type, data) via src/utils/notificationText.ts, so there's no reason to
-- store the same string twice. Existing rows keep their body untouched
-- (used as a fallback for any row/type the renderer doesn't recognize).
alter table public.notifications alter column body drop not null
