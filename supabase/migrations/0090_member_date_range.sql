-- Optional join/leave date range for a member's participation in a trip
-- (FeatureFlagKey: enableDateRangeMembership). Nullable -- unset means
-- "present for the whole trip", so every existing member is unaffected.
alter table members
  add column if not exists join_date date,
  add column if not exists leave_date date;
