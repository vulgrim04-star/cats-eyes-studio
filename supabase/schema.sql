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

-- Retours des utilisatrices (bug, suggestion) et rapports d'erreur automatiques envoyés
-- par l'ErrorBoundary. `user_id` est nullable pour couvrir les pages publiques
-- (/r/:ownerId) où personne n'est authentifié.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  kind text not null default 'bug',
  message text not null,
  page text,
  user_agent text,
  error_detail text,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

-- Journal des rappels automatiques déjà envoyés (voir api/send-reminders.js).
--
-- Sa raison d'être tient dans la contrainte d'unicité : c'est ELLE qui garantit qu'une
-- cliente ne reçoit pas deux fois le même rappel. Le balayage tourne toutes les quinze
-- minutes et rattrape les échéances manquées sur plusieurs heures ; sans verrou, chaque
-- passage renverrait les mêmes e-mails. Deux exécutions qui se chevauchent (reprise de
-- l'ordonnanceur, relance manuelle) sont elles aussi couvertes : la seconde insertion
-- échoue, elle ne double pas l'envoi.
--
-- Ce suivi ne pouvait PAS vivre dans `app_state` : le navigateur réécrit ce blob en entier
-- à chaque enregistrement, en dernier-écrivain-gagne. Il aurait effacé le journal sans
-- prévenir, et les rappels seraient repartis en boucle.
--
-- `appointment_id` est du texte, pas un uuid : les identifiants de rendez-vous sont générés
-- côté client au format `apt_xxx` (voir src/utils/id.js).
create table if not exists public.reminder_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  appointment_id text not null,
  kind text not null check (kind in ('24h', '2h')),
  sent_at timestamptz not null default now(),
  unique (user_id, appointment_id, kind)
);

alter table public.reminder_log enable row level security;

-- ── Diffusion temps réel ────────────────────────────────────────────────────
-- Supabase n'inscrit AUCUNE table dans la publication `supabase_realtime` par défaut.
-- Sans la ligne ci-dessous, l'abonnement `postgres_changes` de useBookingNotifications
-- se connecte sans la moindre erreur et ne reçoit jamais rien : la salonnière n'était
-- donc jamais alertée d'une nouvelle demande, même l'app ouverte sous les yeux. Une panne
-- parfaitement muette, impossible à distinguer de « aucune cliente n'a réservé ».
--
-- L'app ne dépend plus de cette publication pour alerter (un sondage au premier plan sert
-- de filet, voir hooks/usePollWhileVisible.js) — elle sert à rendre l'alerte instantanée
-- au lieu d'attendre le prochain sondage.
--
-- Bloc conditionnel : `add table` échoue si la table est déjà publiée, ce qui interromprait
-- le reste du script à la seconde exécution.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'booking_requests'
  ) then
    alter publication supabase_realtime add table public.booking_requests;
  end if;
end
$$;
