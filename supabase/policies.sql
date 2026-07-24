-- Cat's Eyes Studio — policies RLS actives (extrait le 2026-07-24 via pg_policies).
-- Voir README.md pour le contexte de chaque règle.

-- ── app_state ────────────────────────────────────────────────────────────────
-- Chaque salon ne peut lire/écrire que ses propres lignes.
create policy select_own on public.app_state
  for select
  using (auth.uid() = user_id);

create policy insert_own on public.app_state
  for insert
  with check (auth.uid() = user_id);

create policy update_own on public.app_state
  for update
  using (auth.uid() = user_id);

create policy delete_own on public.app_state
  for delete
  using (auth.uid() = user_id);

-- Lecture publique (anonyme) restreinte aux deux store_key nécessaires à la page
-- de réservation en ligne — jamais aux clientes, rendez-vous, finances, etc.
create policy public_read_booking_config on public.app_state
  for select
  to anon
  using (store_key = any (array['ces-services', 'ces-settings']));

-- ── booking_requests ────────────────────────────────────────────────────────
-- Une visiteuse anonyme peut uniquement créer une demande au statut 'pending'
-- (jamais lire, modifier, ou voir les demandes des autres).
create policy anon_insert_booking_request on public.booking_requests
  for insert
  to anon
  with check (status = 'pending');

-- Le salon propriétaire garde le contrôle complet de ses propres demandes.
create policy owner_select_booking_requests on public.booking_requests
  for select
  using (auth.uid() = owner_id);

create policy owner_update_booking_requests on public.booking_requests
  for update
  using (auth.uid() = owner_id);

create policy owner_delete_booking_requests on public.booking_requests
  for delete
  using (auth.uid() = owner_id);
