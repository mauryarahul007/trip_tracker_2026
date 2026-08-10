do $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"d024b8af-cb39-46f2-8eb2-755c44e079a3","role":"authenticated"}', true);
  perform set_config('request.jwt.claim.sub', 'd024b8af-cb39-46f2-8eb2-755c44e079a3', true);

  insert into public.trips (name, start_date, end_date, base_currency, owner_id)
  values ('Raw SQL SET ROLE Test', '2026-08-14', '2026-08-19', 'INR', 'd024b8af-cb39-46f2-8eb2-755c44e079a3');

  reset role;
end $$;
