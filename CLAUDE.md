# Cat's Eyes Studio — consignes de travail

PWA de gestion de salon, en français. React 19 + Vite, JavaScript (pas de TypeScript),
CSS Modules, Zustand persisté vers Supabase, déployée sur Vercel.

## Langue

Répondre en français. Le code, les commentaires et les messages de commit sont en français —
c'est la langue de tout le dépôt, s'y tenir.

## Livraison — à faire systématiquement, sans demander

1. Développer et commiter sur `claude/lash-map-interactive-redesign-nitjk0`.
2. `npm run lint`, `npm test`, `npm run build` — **les trois au vert**.
3. Pousser la branche, puis **fusionner vers `main` et pousser `main`**.

La fusion vers `main` n'a plus à être demandée : elle est acquise. C'est elle qui déclenche le
déploiement Vercel, donc sans elle rien n'arrive sur le téléphone de l'utilisateur — une
branche poussée mais non fusionnée est un travail invisible.

Deux garde-fous, en revanche, qui eux ne se négocient pas :

- **Rien ne part vers `main` si lint, tests ou build échouent.** La fusion automatique retire
  le point de contrôle humain ; c'est cette barrière-là qui le remplace.
- **Fusion en avance rapide (`--ff-only`) uniquement.** Si elle échoue, c'est que `main` a
  bougé de son côté : s'arrêter et le signaler, plutôt que de fabriquer un commit de fusion
  en aveugle.

Ne pas ouvrir de *pull request* sans demande explicite.

## Repères du projet

- **Vérification** : `npm run lint` (oxlint, `no-undef` en erreur), `npm test` (vitest, env
  `node`), `npm run build`.
- **Logique métier en fonctions pures**, hors de React et du DOM (`src/utils/`), pour rester
  testable sous vitest en environnement `node`. Suivre ce découpage plutôt que d'enfouir une
  règle de calcul dans un composant.
- **Mode démonstration** : s'atteint par la route `/demo`, jamais par une URL directe — toute
  route protégée renvoie sinon à l'écran de connexion. Le drapeau vit en `sessionStorage`
  (`ces-demo-mode`) et survit aux rechargements, mais le jeu de données fictif est **réamorcé
  à chaque chargement** : un état modifié en démo ne survit pas à un `reload`.
- **Vérification navigateur** : Chromium est préinstallé (`/opt/pw-browsers/chromium`), à
  lancer contre un `vite preview`. Ne jamais exécuter `playwright install`.
- **`vercel.json` n'admet aucune clé de commentaire** (pas de `"//"`) : le schéma est strict et
  toute clé inconnue fait échouer *tous* les déploiements, en silence côté application. Cette
  erreur a déjà bloqué la production plusieurs heures sans que rien ne le signale.
- **Variables `VITE_`** : figées au moment du build. Les modifier impose un redéploiement.
