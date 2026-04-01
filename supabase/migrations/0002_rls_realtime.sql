-- Browser: read-only on public work tables; writes only via service_role (Vercel)

alter table public.work_item enable row level security;
alter table public.work_item_status_history enable row level security;

drop policy if exists "anon_read_work_item" on public.work_item;
create policy "anon_read_work_item"
  on public.work_item for select to anon using (true);

drop policy if exists "authenticated_read_work_item" on public.work_item;
create policy "authenticated_read_work_item"
  on public.work_item for select to authenticated using (true);

drop policy if exists "anon_read_work_item_status_history" on public.work_item_status_history;
create policy "anon_read_work_item_status_history"
  on public.work_item_status_history for select to anon using (true);

drop policy if exists "authenticated_read_work_item_status_history" on public.work_item_status_history;
create policy "authenticated_read_work_item_status_history"
  on public.work_item_status_history for select to authenticated using (true);

-- Realtime: board-facing tables only (p2/v4)
do $$
begin
  alter publication supabase_realtime add table public.work_item;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.work_item_status_history;
exception
  when duplicate_object then null;
end $$;
