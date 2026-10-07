-- Run once in Supabase SQL Editor. It adds the protected records used by admin.html.
create table if not exists public.site_content (
  section_key text primary key, title text not null default '', body text not null default '', updated_at timestamptz not null default now()
);
create table if not exists public.catering_menus (
  id uuid primary key default gen_random_uuid(), name text not null, description text not null, price numeric, is_published boolean not null default true, sort_order integer not null default 0, created_at timestamptz not null default now()
);
create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(), full_name text not null, phone text, email text, event_type text, event_date date, status text not null default 'new', created_at timestamptz not null default now()
);
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(), customer_name text not null, event_type text, event_date date, guest_count integer, status text not null default 'confirmed', created_at timestamptz not null default now()
);
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(), full_name text not null, phone text, email text, updated_at timestamptz not null default now()
);
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(), customer_name text not null, message text not null, rating smallint not null check (rating between 1 and 5), is_published boolean not null default false, created_at timestamptz not null default now()
);

alter table public.site_content enable row level security;
alter table public.catering_menus enable row level security;
alter table public.enquiries enable row level security;
alter table public.bookings enable row level security;
alter table public.customers enable row level security;
alter table public.reviews enable row level security;

-- is_gallery_admin already protects the existing gallery. Reuse it for this admin.
create policy "public sees published menus" on public.catering_menus for select using (is_published);
create policy "admins manage menus" on public.catering_menus for all using (public.is_gallery_admin()) with check (public.is_gallery_admin());
create policy "public sees published reviews" on public.reviews for select using (is_published);
create policy "admins manage reviews" on public.reviews for all using (public.is_gallery_admin()) with check (public.is_gallery_admin());
create policy "admins manage content" on public.site_content for all using (public.is_gallery_admin()) with check (public.is_gallery_admin());
create policy "admins manage enquiries" on public.enquiries for all using (public.is_gallery_admin()) with check (public.is_gallery_admin());
create policy "admins manage bookings" on public.bookings for all using (public.is_gallery_admin()) with check (public.is_gallery_admin());
create policy "admins manage customers" on public.customers for all using (public.is_gallery_admin()) with check (public.is_gallery_admin());

-- Use these only if you later change the public website forms to store records directly.
create policy "public creates enquiries" on public.enquiries for insert with check (true);
create policy "public creates reviews" on public.reviews for insert with check (true);
