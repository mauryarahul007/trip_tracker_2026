-- Per-category default split exclusions (FeatureFlagKey: enableSplitExclusionDefaults).
-- categoryId -> memberIds excluded by default from that category's split.
-- Defaults to an empty object -- every existing trip is unaffected.
alter table trips
  add column if not exists split_exclusion_defaults jsonb not null default '{}'::jsonb;
