create extension if not exists postgis;

create type zone_type as enum ('SAFE', 'DANGER', 'BLOCKED', 'COMMERCIAL');

create table zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  risk_level int check (risk_level between 1 and 100),
  type zone_type not null default 'DANGER',
  geom geometry(Polygon, 4326),
  created_at timestamptz default now()
);

create index zones_geom_idx on zones using gist (geom);
