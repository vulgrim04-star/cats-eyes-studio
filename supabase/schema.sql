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
  staff_id text, -- non utilisé (app pour praticienne indépendante) ; laissé nullable pour compat
  staff_name text, -- idem
  notes text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.booking_requests enable row level security;

-- Abonnements Web Push (un par appareil/navigateur) — permet d'envoyer une vraie
-- notification système (même app fermée / téléphone verrouillé) quand une nouvelle
-- réservation arrive, voir api/notify-booking.js et src/utils/push.js.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
