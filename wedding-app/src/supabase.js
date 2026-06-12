import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null

export const isConfigured = () => !!supabase

export const MIGRATION_SQL = `
-- Nouvelles colonnes sur guests
alter table guests add column if not exists ticket_type text default 'individuel' check (ticket_type in ('individuel','couple','famille'));
alter table guests add column if not exists children_count int default 0;
alter table guests add column if not exists babies_count int default 0;
alter table guests add column if not exists guest_group text default 'amis' check (guest_group in ('famille mariée','famille mariée(e)','amis','autres'));
alter table guests drop column if exists diet;
alter table guests drop column if exists plus_one;

-- Sous-programme et capacité sur program_events
alter table program_events add column if not exists capacity int default 0;
alter table program_events add column if not exists sub_program text;

-- Menus liés aux événements
create table if not exists event_menus (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references program_events(id) on delete cascade,
  starter text,
  main_course text,
  dessert text,
  drinks text,
  notes text,
  created_at timestamptz default now()
);
`

export const SETUP_SQL = `
-- Invités
create table if not exists guests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  rsvp text default 'en attente' check (rsvp in ('confirmé','décliné','en attente')),
  ticket_type text default 'individuel' check (ticket_type in ('individuel','couple','famille')),
  children_count int default 0,
  babies_count int default 0,
  guest_group text default 'amis' check (guest_group in ('famille mariée','famille mariée(e)','amis','autres')),
  table_id uuid,
  ticket_code text unique default gen_random_uuid()::text,
  ticket_used boolean default false,
  notes text,
  created_at timestamptz default now()
);

create table if not exists seating_tables (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  capacity int default 8,
  notes text,
  created_at timestamptz default now()
);

create table if not exists budget_items (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  label text not null,
  estimated numeric default 0,
  actual numeric default 0,
  paid boolean default false,
  notes text,
  created_at timestamptz default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text default 'général',
  due_date date,
  done boolean default false,
  priority text default 'normale' check (priority in ('haute','normale','basse')),
  notes text,
  created_at timestamptz default now()
);

create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  contact_name text,
  phone text,
  email text,
  price numeric default 0,
  deposit_paid numeric default 0,
  status text default 'en discussion' check (status in ('confirmé','en discussion','annulé')),
  contract_signed boolean default false,
  notes text,
  created_at timestamptz default now()
);

create table if not exists program_events (
  id uuid primary key default gen_random_uuid(),
  time text not null,
  title text not null,
  description text,
  location text,
  duration_min int default 30,
  capacity int default 0,
  sub_program text,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table if not exists event_menus (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references program_events(id) on delete cascade,
  starter text,
  main_course text,
  dessert text,
  drinks text,
  notes text,
  created_at timestamptz default now()
);

alter table guests
  add constraint fk_table foreign key (table_id) references seating_tables(id) on delete set null;
`
