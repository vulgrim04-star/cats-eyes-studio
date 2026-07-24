-- Cat's Eyes Studio — schéma des tables applicatives (extrait le 2026-07-24).
-- Voir README.md pour le contexte et la façon de revérifier ces définitions.
-- Colonnes et types confirmés par introspection (information_schema.columns).
-- Clés primaires/étrangères déduites du comportement applicatif (upsert onConflict
-- 'user_id,store_key', suppression en cascade attendue avec le compte propriétaire) :
-- à revérifier dans le dashboard (Database > Tables) si ce fichier sert de référence stricte.

-- Un blob JSON par store Zustand persistant, par compte salon. `data` reflète
-- exactement la forme { state, version } de zustand/middleware persist.
create table if not exists public.app_state (
  user_id uuid not null references auth.users (id) on delete cascade,
  store_key text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, store_key)
);

alter table public.app_state enable row level security;

-- Demandes de rendez-vous soumises par des visiteuses anonymes depuis /r/:ownerId,
-- en attente de validation par le salon (voir Booking.jsx / useBookingRequests.js).
create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  phone text not null,
  email text,
  service_id text not null,
  service_name text not null,
  duration integer not null,
  price numeric not null,
  date text not null,
  time text not null,
  staff_id text not null,
  staff_name text,
  notes text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.booking_requests enable row level security;
