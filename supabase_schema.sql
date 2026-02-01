-- ZARX SYSTEM: ROBUST & AUTONOMOUS SQL SCHEMA
-- VERSION: 1.0 (Fresh Start)

-- 1. EXTENSIONS
-- Enable PostGIS for advanced geolocation (Military/Civilian standard)
create extension if not exists postgis;
-- Enable PG_CRON for scheduled maintenance (Keep Alive)
create extension if not exists pg_cron;

-- 2. KEEPALIVE CRON (Prevents inactivity pauses if applicable)
-- Schedules a simple select every day at midnight.
select cron.schedule('zarx-keepalive', '0 0 * * *', $$select 1$$);


-- 3. PROFILES
-- Strict separation from auth.users
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  role text default 'civilian' check (role in ('civilian', 'responder', 'military', 'admin')),
  status text default 'active' check (status in ('active', 'inactive', 'banned')),
  last_known_location geography(POINT),
  battery_level int,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS: Profiles
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using ( true );

create policy "Users can update their own profile"
  on public.profiles for update
  using ( auth.uid() = id );

-- 4. ALERTS (The Core)
create table public.alerts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  type text not null check (type in ('SOS', 'FIRE', 'MEDICAL', 'MILITARY_OPS', 'SUSPICIOUS_ACTIVITY')),
  priority text default 'HIGH' check (priority in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status text default 'OPEN' check (status in ('OPEN', 'ENGAGED', 'RESOLVED', 'FALSE_ALARM')),
  location geography(POINT) not null,
  description text,
  media_url text, -- For photos/videos
  created_at timestamp with time zone default timezone('utc'::text, now()),
  resolved_at timestamp with time zone
);

-- RLS: Alerts
alter table public.alerts enable row level security;

create policy "Everyone can see active alerts"
  on public.alerts for select
  using ( true );

create policy "Authenticated users can create alerts"
  on public.alerts for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own alerts"
  on public.alerts for update
  using ( auth.uid() = user_id );

-- 5. AUTOMATION: Trigger for Profile Creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Anonymous User'), 
    'civilian'
  );
  return new;
end;
$$;

-- Drop trigger if exists to avoid conflicts in future updates
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. INDEXES (Performance)
create index if not exists alerts_location_idx on public.alerts using GIST (location);
create index if not exists  profiles_location_idx on public.profiles using GIST (last_known_location);
