-- ============================================================
-- QueuePro Health — Supabase Schema & Seed
-- Jalankan di Supabase Dashboard → SQL Editor
-- ============================================================

-- Services table
create table if not exists "Service" (
  id text primary key,
  service_code text,
  service_name text,
  service_group text,
  booth_number integer,
  free_quota integer default 0,
  rp1_quota integer default 0,
  special_quota integer default 0,
  used_free_quota integer default 0,
  used_rp1_quota integer default 0,
  used_special_quota integer default 0,
  free_price integer default 0,
  rp1_price integer default 0,
  special_price integer default 0,
  is_active boolean default true,
  provider text,
  created_date timestamptz default now()
);

-- Participants table
create table if not exists "Participant" (
  id text primary key,
  full_name text,
  phone text,
  nik text,
  unit text,
  registration_number text,
  quota_type text default 'FREE',
  status text default 'REGISTERED',
  notes text,
  created_date timestamptz default now()
);

-- Queues table
create table if not exists "Queue" (
  id text primary key,
  service_id text,
  participant_id text,
  queue_number text,
  queue_sequence integer,
  status text default 'WAITING',
  quota_type text default 'FREE',
  created_date timestamptz default now()
);

-- Users table
create table if not exists "User" (
  id text primary key,
  email text unique,
  username text unique,
  password text,
  role text default 'nakes',
  full_name text,
  created_date timestamptz default now()
);

-- EventSetting table
create table if not exists "EventSetting" (
  id text primary key,
  event_name text,
  event_headline text,
  event_tagline text,
  location text,
  event_date text,
  max_participants integer default 750,
  free_check_quota integer default 750,
  payment_quota integer default 0,
  queue_monitor_url text,
  mobile_monitor_url text,
  event_status text default 'ACTIVE',
  created_date timestamptz default now()
);

-- QueueEvent table
create table if not exists "QueueEvent" (
  id text primary key,
  queue_id text,
  event_type text,
  created_date timestamptz default now()
);

-- Disable RLS (internal event system, no public exposure needed)
alter table "Service"      disable row level security;
alter table "Participant"  disable row level security;
alter table "Queue"        disable row level security;
alter table "User"         disable row level security;
alter table "EventSetting" disable row level security;
alter table "QueueEvent"   disable row level security;

-- Enable Realtime
alter publication supabase_realtime add table "Queue";
alter publication supabase_realtime add table "Participant";
alter publication supabase_realtime add table "Service";

-- ── Seed Data ────────────────────────────────────────────────

insert into "Service" (id, service_code, service_name, service_group, booth_number, free_quota, rp1_quota, special_quota, used_free_quota, used_rp1_quota, used_special_quota, free_price, rp1_price, special_price, is_active, provider)
values
  ('svc-a', 'A', 'Mini MCU',           'MEDICAL',   1, 100, 100, 100, 0, 0, 0, 0, 1, 50000,  true, 'Primaya Hospital'),
  ('svc-b', 'B', 'Vitamin C Injection', 'MEDICAL',   2, 25,  25,  250, 0, 0, 0, 0, 1, 85000,  true, 'Primaya Hospital'),
  ('svc-c', 'C', 'Influenza Vaccine',   'MEDICAL',   3, 25,  25,  250, 0, 0, 0, 0, 1, 185000, true, 'Primaya Hospital'),
  ('svc-d', 'D', 'Eye Check (Airdoc)',  'EYE_CHECK', 4, 50,  0,   250, 0, 0, 0, 0, 1, 0,      true, 'Optik Melawai'),
  ('svc-e', 'E', 'Eye Check (Autoref)', 'EYE_CHECK', 5, 400, 0,   0,   0, 0, 0, 0, 1, 0,      true, 'Optik Melawai')
on conflict (id) do nothing;

insert into "EventSetting" (id, event_name, event_headline, event_tagline, location, event_date, max_participants, free_check_quota, payment_quota, queue_monitor_url, mobile_monitor_url, event_status)
values (
  'evt-default',
  'Brilian Talks Health Care 2025',
  'Kesehatan Untuk Semua',
  'Healthy People, Healthy Performance',
  'Aula Utama',
  '2025-05-13',
  750, 750, 0,
  'https://queuepro-health.vercel.app/led-monitor',
  'https://queuepro-health.vercel.app/mobile-monitor',
  'ACTIVE'
) on conflict (id) do nothing;

insert into "User" (id, email, username, password, role, full_name)
values
  ('user-admin', 'admin@demo.com', 'admin', 'admin123', 'admin', 'Admin Pusat'),
  ('user-nakes', 'nakes@demo.com', 'nakes', 'nakes',    'nakes', 'Petugas Nakes')
on conflict (id) do nothing;
