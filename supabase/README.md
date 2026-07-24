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
