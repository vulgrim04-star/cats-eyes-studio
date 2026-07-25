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

-- ── push_subscriptions ──────────────────────────────────────────────────────
-- Chaque salon ne peut voir/gérer que les abonnements push de ses propres appareils.
create policy owner_select_push_subscriptions on public.push_subscriptions
  for select
  using (auth.uid() = user_id);

create policy owner_insert_push_subscriptions on public.push_subscriptions
  for insert
  with check (auth.uid() = user_id);

create policy owner_update_push_subscriptions on public.push_subscriptions
  for update
  using (auth.uid() = user_id);

create policy owner_delete_push_subscriptions on public.push_subscriptions
  for delete
  using (auth.uid() = user_id);

-- ── feedback ────────────────────────────────────────────────────────────────
-- Insertion ouverte (y compris anonyme, pour capter les erreurs de la page de
-- réservation publique), mais uniquement pour soi : impossible d'attribuer un retour
-- à un autre compte. Lecture strictement limitée à ses propres retours.
create policy feedback_insert on public.feedback
  for insert
  with check (user_id is null or auth.uid() = user_id);

create policy feedback_select_own on public.feedback
  for select
  using (auth.uid() = user_id);

-- ── storage.objects — bucket « client-photos » ──────────────────────────────
-- Les photos avant/après ne sont pas dans une table mais dans un bucket privé, dont les
-- policies vivent sur storage.objects. Elles étaient jusqu'ici décrites uniquement en prose
-- dans le README, alors que ce fichier se présente comme le reflet des règles actives.
--
-- Isolation par compte : le premier segment du chemin est l'uuid du compte, d'où la
-- convention `{user_id}/{client_id}/{photo_id}-{before|after}.jpg`. Le bucket étant privé,
-- l'affichage passe par des URL signées (voir src/utils/photoStorage.js).
insert into storage.buckets (id, name, public)
values ('client-photos', 'client-photos', false)
on conflict (id) do nothing;

create policy photos_select_own on storage.objects
  for select
  using (bucket_id = 'client-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy photos_insert_own on storage.objects
  for insert
  with check (bucket_id = 'client-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy photos_update_own on storage.objects
  for update
  using (bucket_id = 'client-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy photos_delete_own on storage.objects
  for delete
  using (bucket_id = 'client-photos' and (storage.foldername(name))[1] = auth.uid()::text);
