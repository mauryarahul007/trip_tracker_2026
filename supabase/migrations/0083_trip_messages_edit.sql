-- Migration 0083: WhatsApp-style edit for trip chat messages.
-- Delete already existed (0082, soft-delete via deleted_at). This adds edit:
-- an edited_at column plus a SECURITY DEFINER RPC that is the only path
-- allowed to change `body`, so the 15-minute edit window is enforced
-- server-side, not just hidden client-side.

alter table public.trip_messages
  add column edited_at timestamptz;

-- Direct UPDATE (used today only by deleteTripMessage, to set deleted_at)
-- must not change body: tighten the existing soft-delete policy's WITH CHECK
-- so body edits can only happen through edit_trip_message() below.
drop policy "author or admin can soft-delete messages" on public.trip_messages;

create policy "author or admin can soft-delete messages"
  on public.trip_messages for update
  to authenticated
  using (
    public.is_trip_admin(trip_id) or member_id = public.my_member_id(trip_id)
  )
  with check (
    (public.is_trip_admin(trip_id) or member_id = public.my_member_id(trip_id))
    and body = (select tm.body from public.trip_messages tm where tm.id = trip_messages.id)
  );

create or replace function public.edit_trip_message(p_message_id uuid, p_body text)
returns public.trip_messages
language plpgsql
security definer set search_path = public
as $$
declare
  msg public.trip_messages;
  result public.trip_messages;
begin
  select * into msg from public.trip_messages where id = p_message_id;
  if not found then
    raise exception 'message not found';
  end if;
  if msg.deleted_at is not null then
    raise exception 'cannot edit a deleted message';
  end if;
  if char_length(trim(p_body)) < 1 or char_length(p_body) > 2000 then
    raise exception 'invalid message body';
  end if;
  if not (
    public.is_trip_admin(msg.trip_id)
    or (msg.member_id = public.my_member_id(msg.trip_id) and msg.created_at > now() - interval '15 minutes')
  ) then
    raise exception 'not allowed to edit this message';
  end if;

  update public.trip_messages
  set body = p_body, edited_at = now()
  where id = p_message_id
  returning * into result;

  return result;
end;
$$;

grant execute on function public.edit_trip_message(uuid, text) to authenticated;

notify pgrst, 'reload schema';
