-- Run this once in the Supabase SQL Editor for Joelle's Catering Services.
-- It stores one shared view total for the public website.

create table if not exists public.site_metrics (
    metric_key text primary key,
    metric_value bigint not null default 0,
    updated_at timestamptz not null default now()
);

insert into public.site_metrics (metric_key, metric_value)
values ('public_site_views', 0)
on conflict (metric_key) do nothing;

create or replace function public.record_site_view()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
    new_total bigint;
begin
    update public.site_metrics
    set metric_value = metric_value + 1,
        updated_at = now()
    where metric_key = 'public_site_views'
    returning metric_value into new_total;

    return new_total;
end;
$$;

create or replace function public.get_site_view_total()
returns bigint
language sql
security definer
set search_path = public
as $$
    select metric_value
    from public.site_metrics
    where metric_key = 'public_site_views';
$$;

alter table public.site_metrics enable row level security;

drop policy if exists "admins view site metrics" on public.site_metrics;
create policy "admins view site metrics"
on public.site_metrics for select
using (public.is_gallery_admin());

grant execute on function public.record_site_view() to anon, authenticated;
grant execute on function public.get_site_view_total() to anon, authenticated;
