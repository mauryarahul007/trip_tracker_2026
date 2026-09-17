-- Migration 0096: Chat media kinds + private chat-media storage bucket
-- Shared by image attachments, expense_link cards, and voice notes.

alter table public.trip_messages
  drop constraint if exists trip_messages_kind_check;

alter table public.trip_messages
  add constraint trip_messages_kind_check
  check (kind in (
    'text',
    'expense_added',
    'settlement_recorded',
    'expense_disputed',
    'expense_dispute_resolved',
    'image',
    'expense_link',
    'voice_note'
  ));

-- Allow empty/placeholder body for non-text kinds (push/list fallbacks still set a short label).
alter table public.trip_messages
  drop constraint if exists trip_messages_body_check;

alter table public.trip_messages
  add constraint trip_messages_body_check
  check (char_length(body) <= 2000);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-media',
  'chat-media',
  false,
  5242880,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
    'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/x-m4a', 'audio/aac'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
    'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/x-m4a', 'audio/aac'
  ];

-- Path convention: chat-media/{trip_id}/{message_id}.{ext}
drop policy if exists "trip participants can read chat media" on storage.objects;
create policy "trip participants can read chat media"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'chat-media'
    and public.is_trip_participant(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "trip participants can upload chat media" on storage.objects;
create policy "trip participants can upload chat media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'chat-media'
    and public.is_trip_participant(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "trip participants can update chat media" on storage.objects;
create policy "trip participants can update chat media"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'chat-media'
    and public.is_trip_participant(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'chat-media'
    and public.is_trip_participant(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "trip participants can delete chat media" on storage.objects;
create policy "trip participants can delete chat media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'chat-media'
    and public.is_trip_participant(((storage.foldername(name))[1])::uuid)
  );

notify pgrst, 'reload schema';
