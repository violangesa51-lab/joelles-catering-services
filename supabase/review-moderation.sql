-- Run this once in the Supabase SQL Editor for Joelle's Catering Services.
-- Existing reviews remain public. New reviews stay hidden until you publish them in Admin.

alter table public.customer_reviews
  add column if not exists is_published boolean;

alter table public.customer_reviews
  add column if not exists business_response text;

alter table public.customer_reviews
  add column if not exists responded_at timestamptz;

update public.customer_reviews
set is_published = true
where is_published is null;

alter table public.customer_reviews
  alter column is_published set default false;

alter table public.customer_reviews
  alter column is_published set not null;

alter table public.customer_reviews enable row level security;

-- Replace any previous review rules so hidden reviews cannot be read by visitors.
do $$
declare policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'customer_reviews'
  loop
    execute format('drop policy if exists %I on public.customer_reviews', policy_record.policyname);
  end loop;
end $$;

create policy "visitors see published customer reviews"
on public.customer_reviews for select
using (is_published = true);

create policy "visitors submit customer reviews"
on public.customer_reviews for insert
with check (true);

create policy "admins manage customer reviews"
on public.customer_reviews for all
using (public.is_gallery_admin())
with check (public.is_gallery_admin());
