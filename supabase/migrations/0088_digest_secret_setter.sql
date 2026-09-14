-- Migration 0088: One-time-use setter for the digest_cron_secret Vault
-- entry (see migration 0087's header). Never embeds the secret value
-- itself here -- that would put it in git. service_role-only so it can be
-- invoked once via an ad-hoc script using the service role key, never
-- exposed to anon/authenticated clients.

create or replace function public.set_digest_cron_secret(p_secret text)
returns void
language plpgsql
security definer set search_path = public, vault
as $$
declare
  v_existing_id uuid;
begin
  if p_secret is null or char_length(p_secret) < 16 then
    raise exception 'secret must be at least 16 characters';
  end if;

  select id into v_existing_id from vault.secrets where name = 'digest_cron_secret';
  if v_existing_id is not null then
    perform vault.update_secret(v_existing_id, p_secret);
  else
    perform vault.create_secret(p_secret, 'digest_cron_secret');
  end if;
end;
$$;

revoke all on function public.set_digest_cron_secret(text) from public, anon, authenticated;

notify pgrst, 'reload schema';
