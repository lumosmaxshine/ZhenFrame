-- 在 Supabase Dashboard → SQL Editor 中整段执行一次。

create table if not exists public.site_content (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

drop policy if exists "public can read site" on public.site_content;
create policy "public can read site"
  on public.site_content for select
  using (true);

drop policy if exists "owner can write site" on public.site_content;
create policy "owner can write site"
  on public.site_content for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "public read media" on storage.objects;
create policy "public read media"
  on storage.objects for select
  using (bucket_id = 'media');

drop policy if exists "owner upload media" on storage.objects;
create policy "owner upload media"
  on storage.objects for insert
  with check (bucket_id = 'media' and auth.role() = 'authenticated');

drop policy if exists "owner update media" on storage.objects;
create policy "owner update media"
  on storage.objects for update
  using (bucket_id = 'media' and auth.role() = 'authenticated');

drop policy if exists "owner delete media" on storage.objects;
create policy "owner delete media"
  on storage.objects for delete
  using (bucket_id = 'media' and auth.role() = 'authenticated');
