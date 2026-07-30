# Supabase — schéma & sécurité (Cat's Eyes Studio)

Ce dossier documente, en dehors du tableau de bord Supabase, la structure des tables et les
règles RLS ("Row Level Security") du projet **Cat's eyes** (`ewkevxufmeuwgpdpyjun`). Avant
ce commit, ces règles n'existaient que dans le tableau de bord Supabase — aucune trace dans le
dépôt, donc aucun moyen de les reconstruire si elles étaient accidentellement modifiées ou
supprimées, ni de savoir rapidement ce qui est réellement autorisé sans se reconnecter au
dashboard.

## Contenu

- `schema.sql` — définition des tables applicatives (`app_state`, `booking_requests`,
  `push_subscriptions`).
- `policies.sql` — toutes les policies RLS actives sur ces tables.
- `functions.sql` — la fonction `SECURITY DEFINER` utilisée par la page de réservation publique.

Extrait le 2026-07-24 par introspection directe (`pg_policies`, `information_schema.columns`,
`pg_get_functiondef`) sur le projet en production — c'est donc un reflet fidèle de l'état réel
à cette date, pas une reconstruction approximative.

## Pourquoi ces règles existent

- **`app_state`** stocke l'état de chaque store Zustand (clientes, rendez-vous, prestations…)
  sous forme de blob JSON par `(user_id, store_key)`. Chaque salon ne doit voir/modifier que ses
  propres données (`auth.uid() = user_id`), à une exception près : la page de réservation
  publique (`/r/:ownerId`) doit pouvoir lire, en anonyme, les prestations et les infos du salon
  d'un compte qu'elle ne possède pas — d'où la policy `public_read_booking_config`, volontairement
  restreinte aux deux `store_key` concernés (`ces-services`, `ces-settings`), jamais aux autres
  (clientes, rendez-vous, finances...).
- **`booking_requests`** reçoit les demandes de RDV soumises par des visiteuses anonymes. Elles
  ne doivent pouvoir que créer une demande `pending` (jamais lire, modifier ou lire les demandes
  des autres), tandis que le salon propriétaire (`owner_id`) garde le contrôle complet des
  siennes.
- **`public_appointments_for_date`** est un `SECURITY DEFINER` : il permet de calculer les
  créneaux déjà pris pour une date donnée sans jamais exposer les données privées des rendez-vous
  (nom de cliente, notes...) à une visiteuse anonyme — seuls `staffId`, `date`, `time`, `duration`
  et `status` sont renvoyés.
- **`push_subscriptions`** stocke, par appareil/navigateur, l'abonnement Web Push (endpoint +
  clés de chiffrement) qui permet d'envoyer une vraie notification système même app fermée.
  Chaque salon ne doit voir/gérer que ses propres abonnements.

## Comment vérifier que ce fichier est à jour

Depuis le SQL Editor du dashboard Supabase du projet :

```sql
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where tablename in ('app_state', 'booking_requests')
order by tablename, policyname;
```

Comparer le résultat à `policies.sql`. En cas d'écart, mettre à jour ce dossier pour qu'il
reste la source de vérité versionnée.

## Étape manuelle requise : créer la table `push_subscriptions`

Contrairement à `app_state` et `booking_requests` (déjà en place), la table
`push_subscriptions` (notifications push, voir plus bas) doit être créée une fois dans le
SQL Editor du dashboard Supabase — copier-coller et exécuter :

```sql
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy owner_select_push_subscriptions on public.push_subscriptions
  for select using (auth.uid() = user_id);
create policy owner_insert_push_subscriptions on public.push_subscriptions
  for insert with check (auth.uid() = user_id);
create policy owner_update_push_subscriptions on public.push_subscriptions
  for update using (auth.uid() = user_id);
create policy owner_delete_push_subscriptions on public.push_subscriptions
  for delete using (auth.uid() = user_id);
```

Sans cette table, activer les notifications dans Paramètres ne provoquera pas d'erreur visible,
mais aucun abonnement ne sera enregistré et aucune notification ne sera reçue app fermée.

## Étape manuelle requise : publier `booking_requests` en temps réel

Supabase n'inscrit **aucune** table dans la publication `supabase_realtime` par défaut. Tant
que cette ligne n'a pas été exécutée, l'abonnement temps réel de l'app se connecte sans la
moindre erreur et ne reçoit jamais rien — ni alerte, ni rafraîchissement de la liste des
demandes. À exécuter une fois dans le SQL Editor :

```sql
alter publication supabase_realtime add table public.booking_requests;
```

(Le même bloc, rendu ré-exécutable, se trouve en fin de `schema.sql`. Équivalent au dashboard :
Database → Replication → publication `supabase_realtime` → cocher `booking_requests`.)

L'app **n'en dépend plus pour alerter** : un sondage au premier plan sert de filet
(`src/hooks/usePollWhileVisible.js`), et les demandes apparaissent de toute façon dans la
cloche et sur le tableau de bord. Cette publication ne fait que rendre l'alerte instantanée
au lieu d'attendre le prochain sondage — jusqu'à une minute.

## Vérifier les notifications de bout en bout

Trois choses doivent être vraies pour qu'un téléphone verrouillé sonne. Dans l'ordre où il
faut les vérifier :

1. **`/api/health`** (à ouvrir dans le navigateur) doit rapporter `vapidConfigured: true`
   **et** `vapidClientKeyConfigured: true`. Le second est le piège classique : la clé publique
   existe en deux exemplaires, `VAPID_PUBLIC_KEY` pour le serveur et `VITE_VAPID_PUBLIC_KEY`
   pour le navigateur. N'ajouter que la première donne un serveur prêt à envoyer… à personne,
   puisqu'aucun appareil n'a jamais pu s'abonner.
   ⚠️ Une variable `VITE_` est figée dans le bundle **à la construction** : l'ajouter dans
   Vercel n'a aucun effet tant qu'on n'a pas redéployé.
2. **Le SQL ci-dessus** (table `push_subscriptions` + publication temps réel) doit être exécuté.
3. **Paramètres → « Tester les notifications »** sur l'appareil concerné. Ce bouton emprunte
   exactement le même chemin que la vraie notification (`api/_lib/push.js`) et nomme la cause
   quand ça échoue : clé absente, permission refusée, aucun appareil abonné, envoi rejeté.

Sur **iPhone/iPad**, une notification app fermée exige que l'app soit ajoutée à l'écran
d'accueil (Partager → « Sur l'écran d'accueil ») et ouverte **depuis cette icône** : Safari en
onglet ne donne pas accès au push, quelle que soit la configuration serveur.

### Quatre pannes qui n'étaient PAS des pannes de configuration

Les points ci-dessus supposent tous que le problème vient d'une variable ou d'une table. Ce
n'était pas toujours le cas, et ces quatre-là ne se voyaient dans aucun diagnostic :

- **Sur Android, `new Notification(...)` lève.** Le constructeur est interdit dès qu'un service
  worker est enregistré : « Illegal constructor. Use ServiceWorkerRegistration.showNotification()
  instead. » L'app affichait donc son bandeau interne et rien d'autre — l'exception partait
  dans une promesse non rattrapée. Tout passe désormais par `src/utils/localNotify.js`, qui
  emprunte le service worker et ne retombe sur le constructeur que là où il est permis.
- **Deux notifications identiques**, app ouverte au premier plan : celle du serveur et celle
  de l'app. Elles partagent maintenant l'étiquette `booking-request` ; le système remplace au
  lieu d'empiler. `renotify: true` conserve le son de la seconde, sans quoi une demande
  arrivée pendant qu'une autre n'est pas lue passerait inaperçue.
- **Toucher la notification n'ouvrait pas la bonne page.** Elle visait `/agenda`, alors qu'une
  demande en attente n'entre dans l'agenda qu'une fois validée — elle se trouve sur le tableau
  de bord. Et le rapprochement de fenêtre (`url.includes(cible)`) se trompait dans les deux
  sens : `/` correspondait à n'importe quelle page ouverte, tandis qu'une cible absente faisait
  ouvrir une SECONDE fenêtre de l'app par-dessus la première.
- **Après rotation de l'abonnement par le navigateur**, l'appareil se retrouvait sans aucun
  abonnement : l'ancien endpoint répondait 410 (le serveur supprimait la ligne) et rien n'en
  créait de nouveau. `public/sw.js` gère désormais `pushsubscriptionchange`. Son enregistrement
  en base, lui, reste fait par l'app à sa prochaine ouverture : le service worker n'a pas de
  session Supabase, et lui ouvrir un endpoint d'écriture non authentifié permettrait de
  détourner les notifications d'un compte vers un autre appareil.

## Synchronisation d'agenda (Google / Apple)

Le bouton « Synchroniser mon agenda » abonne l'agenda personnel de la salonnière au flux
`.ics` servi par `api/ics.js`. **Aucune configuration supplémentaire n'est nécessaire** : ni
compte Google, ni clé d'API, ni OAuth. On ne parle pas à l'API de Google ou d'Apple — on leur
donne l'adresse d'un flux, ce sont eux qui viennent le relire, toutes les quelques heures.

Ce qui doit être vrai pour que ça marche :

1. **`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`** doivent être définies dans Vercel (voir
   plus bas). Sans elles, `api/ics.js` répond 500 et l'abonnement échoue côté Google/Apple.
2. **Le jeton doit avoir atteint le cloud avant l'ouverture de Google/Apple.** Le jeton
   (`calendarToken`) est créé dans le navigateur et vérifié par le serveur, qui le relit dans
   `app_state`. Les écritures étant regroupées sur 800 ms, ouvrir l'agenda trop tôt le fait
   tomber sur un jeton que le serveur ne connaît pas encore — il répond « Lien invalide ou
   expiré », et Google garde l'agenda en échec dans la liste. `src/hooks/useCalendarSync.js`
   force donc l'envoi (`flushPendingWrites`) et attend sa confirmation avant de proposer les
   boutons. Ne pas court-circuiter cette attente.

Deux détails de mise en œuvre qui ont l'air anodins et ne le sont pas :

- **Le schéma `webcal:` n'est pas décoratif.** En `https:`, iOS *télécharge* un fichier `.ics`
  figé : les rendez-vous ajoutés ensuite n'apparaîtront jamais. En `webcal:`, il crée un
  abonnement qui se met à jour. C'est exactement la différence entre l'export manuel et la
  synchronisation. Google reçoit la même URL `webcal:` via `calendar.google.com/calendar/r?cid=`.
- **L'onglet doit s'ouvrir dans le gestionnaire de clic.** Un `window.open` appelé après un
  `await` n'est plus rattaché à l'action de l'utilisatrice : Safari et Firefox le bloquent.
  D'où la préparation à l'ouverture de la fenêtre, et non au clic.

Le flux lui-même (`src/utils/ical.js`) doit rester strictement conforme à la RFC 5545 : un
calendrier *abonné* que Google refuse n'affiche aucune erreur, il reste simplement vide. En
particulier, une seule date invalide fait rejeter le flux **entier** — d'où le filtrage des
rendez-vous incomplets, le repliage des lignes au-delà de 75 octets, et les tests de
`src/utils/ical.test.js`.

## Stockage des photos (bucket `client-photos`)

Les photos de séance vivaient à l'origine en data URL base64 **à l'intérieur** du blob
`app_state`, qui est réécrit intégralement à chaque enregistrement — quelques dizaines de
photos suffisaient à rendre chaque sauvegarde très lourde sur mobile. Elles sont désormais
dans un bucket Storage privé.

Créé le 2026-07-25 via le SQL Editor :

```sql
insert into storage.buckets (id, name, public)
values ('client-photos', 'client-photos', false)
on conflict (id) do nothing;

-- Isolation par compte : le premier segment du chemin est l'uuid du compte.
create policy photos_select_own on storage.objects for select
  using (bucket_id = 'client-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy photos_insert_own on storage.objects for insert
  with check (bucket_id = 'client-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy photos_update_own on storage.objects for update
  using (bucket_id = 'client-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy photos_delete_own on storage.objects for delete
  using (bucket_id = 'client-photos' and (storage.foldername(name))[1] = auth.uid()::text);
```

Convention de chemin : `{user_id}/{client_id}/{photo_id}-{before|after}.jpg`. Le bucket
étant privé, l'affichage passe par des URL signées (voir `src/utils/photoStorage.js`).

Compatibilité : une photo peut porter soit `beforePath`/`afterPath` (Storage), soit
`beforeUrl`/`afterUrl` (ancienne data URL). Les deux s'affichent ; Paramètres →
« Optimisation des photos » déplace les anciennes vers le bucket quand il en reste.

## Variables d'environnement Vercel requises

Toutes les fonctions serveur du projet tournent sur **Vercel**, pas sur Supabase — il n'y a
donc aucune Edge Function à déployer dans Supabase, et elles se mettent à jour toutes seules
à chaque `git push` :

- `api/ics.js` — flux d'abonnement calendrier Google/Apple (bouton « Synchroniser mon agenda »,
  dans Paramètres → "Réservation en ligne" et dans l'en-tête de la page Agenda). Voir la
  section « Synchronisation d'agenda » plus bas.
- `api/notify-booking.js` — e-mail + notification push au salon à la réception d'une nouvelle
  réservation en ligne.
- `api/send-confirmation-email.js` — e-mail de confirmation à la cliente dès qu'un RDV est créé,
  si "Confirmation automatique" est activé.
- `api/delete-account.js` — suppression définitive du compte et de toutes ses données
  (Paramètres → "Supprimer mon compte", après confirmation par e-mail).

Il faut en revanche ajouter, une seule fois, ces variables d'environnement dans le tableau de
bord Vercel du projet (Project Settings → Environment Variables) :

- `SUPABASE_URL` — l'URL du projet Supabase (Project Settings → API dans le dashboard Supabase).
- `SUPABASE_SERVICE_ROLE_KEY` — la clé `service_role` (même page). **Ne jamais l'exposer côté
  client** (pas de préfixe `VITE_`) : elle contourne toutes les policies RLS.

  ⚠️ **Ces deux-là doivent être ajoutées explicitement.** Une version antérieure de ce document
  affirmait le contraire : l'intégration Supabase (marketplace Vercel) expose
  `Catseyesapp_SUPABASE_URL` / `Catseyesapp_SUPABASE_SERVICE_ROLE_KEY`, sur lesquelles
  `api/_lib/supabaseAdmin.js` retombe, et on en concluait qu'aucune étape manuelle n'était
  nécessaire. C'était faux en pratique : le 27 juillet 2026, `GET /api/health` a renvoyé
  `supabaseSameProjectAsClient: false` et `supabaseError: PGRST205` — l'intégration pointait
  vers un **autre projet** que celui du front (`ewkevxufmeuwgpdpyjun`). Toutes les fonctions
  serveur échouaient donc silencieusement : les deux e-mails, la suppression de compte et le
  flux `.ics`.

  Les noms « plats » ont la priorité dans le code, donc les définir corrige le problème sans
  toucher à l'intégration. `SUPABASE_URL` doit valoir exactement l'URL du projet que le
  navigateur utilise (`VITE_SUPABASE_URL`), et la clé `service_role` doit provenir de **ce**
  projet-là. `/api/health` permet de le vérifier sans accès au tableau de bord Vercel.
- `RESEND_API_KEY` — clé API [Resend](https://resend.com) (compte gratuit, aucune carte
  bancaire requise pour le tier gratuit ~3000 e-mails/mois). Nécessaire pour les deux
  fonctionnalités d'e-mail (notification de réservation au salon, confirmation à la cliente) ;
  sans cette clé, les toggles concernés dans Paramètres restent sans effet (pas d'erreur,
  l'e-mail n'est simplement pas envoyé).
- `RESEND_FROM` — adresse d'expédition, sur un domaine **vérifié** dans Resend. Pour ce
  projet : `studio@cats-eyes.ch` (ou `Cat's Eyes Studio <studio@cats-eyes.ch>`).

  ⚠️ Le domaine est `cats-eyes.ch`, chez IONOS. Le `.com` appartient à un tiers : ne rien y
  envoyer, il n'a aucun MX.

  **Cette variable n'est pas optionnelle en pratique.** Sans elle, les e-mails partent du
  domaine de test `onboarding@resend.dev`, et Resend n'accepte alors qu'un seul destinataire :
  l'adresse du titulaire du compte Resend. Tout autre destinataire est refusé avec un 403.
  Concrètement :
  - la **notification de réservation** (adressée à la salonnière) ne part que si l'e-mail du
    salon est exactement celui du compte Resend ;
  - la **confirmation à la cliente** échoue systématiquement, puisqu'elle écrit par définition
    à une adresse tierce.

  Pour lever la limite : dashboard Resend → Domains → Add Domain, ajouter les enregistrements
  DNS fournis chez le registrar, attendre la vérification, puis définir `RESEND_FROM` dans
  Vercel. Aucune modification de code n'est nécessaire. Les deux endpoints journalisent
  explicitement ce diagnostic (`unverified-sender-domain`) en cas de 403.
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — paire de clés Web Push (norme ouverte, aucun compte
  tiers à créer) générée pour ce projet le 2026-07-24 :
  ```
  VAPID_PUBLIC_KEY=BF5oBDKEgzKt5C_R2XkRsBqgAbTRe6RlldlFrzwYY--wdw0dSKucIWPu9w9JPXsy5uVKHyvrPASW85v5HpLQdqQ
  VAPID_PRIVATE_KEY=EkCbiatB5UuCI0tj9Exxwre6LVex3hsS0Tjy71UtKC8
  ```
  Utilisées par `api/notify-booking.js` pour envoyer une vraie notification système (même
  app fermée) quand "Notification nouvelle réservation" est activé dans Paramètres.
  **`VAPID_PRIVATE_KEY` ne doit jamais avoir le préfixe `VITE_`** (elle reste côté serveur).
- `VITE_VAPID_PUBLIC_KEY` — **la même clé publique que `VAPID_PUBLIC_KEY` ci-dessus**, mais
  avec le préfixe `VITE_` cette fois : c'est la variante que le navigateur doit lire pour
  s'abonner (`import.meta.env.VITE_VAPID_PUBLIC_KEY`, voir `src/utils/push.js`). Sans elle,
  le bouton "Activer" des notifications dans Paramètres n'abonne pas l'appareil au push.

Sans les deux premières variables, le lien de calendrier renvoie une erreur 500 au lieu du
flux `.ics`. Sans `RESEND_API_KEY`, les réservations continuent de fonctionner normalement
(la demande est bien enregistrée) — seul l'e-mail de notification ne part pas. Sans les
variables VAPID (et sans la table `push_subscriptions` ci-dessus), les notifications
continuent de fonctionner comme avant *uniquement quand l'app est ouverte au premier plan* —
elles ne seront simplement jamais reçues app fermée/téléphone verrouillé.
