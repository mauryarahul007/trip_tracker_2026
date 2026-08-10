-- The app intentionally allows deleting a member who has existing expenses:
-- those expenses keep their paid_by/split_member_ids values and render as
-- "[Deleted Member]" in the UI rather than being blocked or cascade-deleted.
-- A hard FK on paid_by would raise a foreign-key-violation on that delete,
-- so drop it; referential integrity here is enforced by the app, not Postgres.
alter table public.expenses drop constraint expenses_paid_by_fkey;
