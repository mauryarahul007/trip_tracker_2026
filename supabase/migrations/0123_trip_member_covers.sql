-- Member covers (FeatureFlagKey: enableMemberWeights).
-- coveredMemberId -> payerMemberId ("Rahul pays for Priya"). On a NEW expense with both in it,
-- the covered member is left out of the split and the payer carries their share.
-- Stored expenses and balance maths are unchanged. Empty object by default.
alter table trips
  add column if not exists member_covers jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';
