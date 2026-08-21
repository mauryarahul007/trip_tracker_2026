create policy "users delete their own notifications"
  on public.notifications for delete
  to authenticated
  using (user_id = auth.uid())
