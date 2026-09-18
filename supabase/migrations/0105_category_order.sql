-- Manual category display order (FeatureFlagKey: enableCategoryReorder).
-- Array of category IDs in display order. Any category not listed (e.g.
-- newly created after the order was last saved) renders after the listed
-- ones, in its normal insertion order -- see resolveCategoryOrder in
-- tripStore.ts. Defaults to an empty array -- every existing trip is
-- unaffected until a member reorders categories for the first time.
alter table trips
  add column if not exists category_order jsonb not null default '[]'::jsonb;
