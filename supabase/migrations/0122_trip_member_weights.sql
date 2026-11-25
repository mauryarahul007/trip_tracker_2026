-- Member weights (FeatureFlagKey: enableMemberWeights).
-- memberId -> how many people that member stands for (a couple = 2). Missing means 1.
-- Only the default split of NEW expenses reads it (as a 'custom' shares split);
-- stored expenses and balance maths are unchanged. Defaults to an empty object,
-- so every existing trip is unaffected and older app builds ignore it.
alter table trips
  add column if not exists member_weights jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';
