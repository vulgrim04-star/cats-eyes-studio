# Supabase — schéma & sécurité (Cat's Eyes Studio)

Ce dossier documente, en dehors du tableau de bord Supabase, la structure des tables et les
règles RLS ("Row Level Security") du projet **Cat's eyes** (`ewkevxufmeuwgpdpyjun`). Avant
ce commit, ces règles n'existaient que dans le tableau de bord Supabase — aucune trace dans le
dépôt, donc aucun moyen de les reconstruire si elles étaient accidentellement modifiées ou
supprimées, ni de savoir rapidement ce qui est réellement autorisé sans se reconnecter au
dashboard.

## Contenu

- `schema.sql` — définition des deux tables applicatives (`app_state`, `booking_requests`).
- `policies.sql` — toutes les policies RLS actives sur ces deux tables.
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

## Variables d'environnement Vercel requises

`api/ics.js` (flux d'abonnement calendrier Google/Apple, voir Paramètres → "Synchronisation
avec Google / Apple Agenda"), `api/notify-booking.js` (e-mail au salon à la réception d'une
nouvelle réservation en ligne) et `api/send-confirmation-email.js` (e-mail à la cliente dès
qu'un RDV est créé, si "Confirmation automatique" est activé) tournent côté serveur sur
Vercel, pas sur Supabase — il n'y a donc rien à déployer dans Supabase pour ces
fonctionnalités. Il faut en revanche ajouter, une seule fois, ces variables d'environnement
dans le tableau de bord Vercel du projet (Project Settings → Environment Variables) :

- `SUPABASE_URL` — l'URL du projet Supabase (Project Settings → API dans le dashboard Supabase).
- `SUPABASE_SERVICE_ROLE_KEY` — la clé `service_role` (même page). **Ne jamais l'exposer côté
  client** (pas de préfixe `VITE_`) : elle contourne toutes les policies RLS, exactement comme
  pour la fonction `delete-account` (voir `functions/delete-account/index.ts`).
- `RESEND_API_KEY` — clé API [Resend](https://resend.com) (compte gratuit, aucune carte
  bancaire requise pour le tier gratuit ~3000 e-mails/mois). Nécessaire pour les deux
  fonctionnalités d'e-mail (notification de réservation au salon, confirmation à la cliente) ;
  sans cette clé, les toggles concernés dans Paramètres restent sans effet (pas d'erreur,
  l'e-mail n'est simplement pas envoyé). Les e-mails partent depuis le domaine de test
  `onboarding@resend.dev` fourni par Resend — cela fonctionne sans configuration DNS, mais pour
  un meilleur taux de délivrabilité et un expéditeur à votre propre nom de domaine, vous pouvez
  plus tard vérifier votre propre domaine dans le dashboard Resend (Domains → Add Domain) sans
  rien changer côté code.

Sans les deux premières variables, le lien de calendrier renvoie une erreur 500 au lieu du
flux `.ics`. Sans `RESEND_API_KEY`, les réservations continuent de fonctionner normalement
(la demande est bien enregistrée) — seul l'e-mail de notification ne part pas.
