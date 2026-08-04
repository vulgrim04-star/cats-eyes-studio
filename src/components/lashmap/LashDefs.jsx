import { memo } from 'react';
import { GRADIENT_BOUNDS, PALETTE } from '../../utils/lashGeometry';

/** Définitions du relief : dégradés et flou de profondeur.
 *
 * POURQUOI DES DÉFINITIONS PARTAGÉES, et pas une couleur par tracé — la frange compte
 * quelque 250 chemins. Leur donner à chacun sa nuance reviendrait à créer 250 dégradés,
 * pour un résultat identique : les cils partent tous du bord ciliaire et descendent. Un
 * seul dégradé vertical en `userSpaceOnUse` suffit donc à les teinter tous, de la racine
 * sombre à la pointe éclaircie, et il ne coûte rien à l'édition puisqu'il est statique.
 *
 * POURQUOI UN PRÉFIXE D'IDENTIFIANT — plusieurs schémas cohabitent dans la même page
 * (l'œil affiché, le second monté hors écran pour les exports, les vignettes de la liste).
 * Des `id` identiques s'y écraseraient, et surtout un SVG exporté doit emporter SES
 * propres définitions : sans elles, le fichier ouvert ailleurs sortirait sans relief.
 *
 * @param {{prefix: string}} props préfixe unique, fourni par `useId()` du canevas
 */
function LashDefs({ prefix }) {
  const { lash, brow, lid } = GRADIENT_BOUNDS;

  return (
    <defs>
      {/* Extensions : le contraste le plus marqué, ce sont elles qu'on vient lire. */}
      <linearGradient id={`${prefix}-lash`} gradientUnits="userSpaceOnUse" x1="0" y1={lash.y0} x2="0" y2={lash.y1}>
        <stop offset="0%" stopColor={PALETTE.lashRoot} />
        <stop offset="55%" stopColor={PALETTE.lashRoot} />
        <stop offset="100%" stopColor={PALETTE.lashTip} />
      </linearGradient>

      {/* Plan arrière : plus clair, il recule sans ajouter de trait lisible. */}
      <linearGradient id={`${prefix}-lash-back`} gradientUnits="userSpaceOnUse" x1="0" y1={lash.y0} x2="0" y2={lash.y1}>
        <stop offset="0%" stopColor={PALETTE.lashBackRoot} />
        <stop offset="100%" stopColor={PALETTE.lashBackTip} />
      </linearGradient>

      <linearGradient id={`${prefix}-brow`} gradientUnits="userSpaceOnUse" x1="0" y1={brow.y0} x2="0" y2={brow.y1}>
        <stop offset="0%" stopColor={PALETTE.browTip} />
        <stop offset="100%" stopColor={PALETTE.browRoot} />
      </linearGradient>

      {/* Paupière : claire dans le creux de l'orbite, plus dense au bord ciliaire. */}
      <linearGradient id={`${prefix}-lid`} gradientUnits="userSpaceOnUse" x1="0" y1={lid.y0} x2="0" y2={lid.y1}>
        <stop offset="0%" stopColor={PALETTE.lidHigh} stopOpacity="0.25" />
        <stop offset="70%" stopColor={PALETTE.lidLow} stopOpacity="0.72" />
        <stop offset="100%" stopColor={PALETTE.lidLow} stopOpacity="0.95" />
      </linearGradient>

      {/* Flou de profondeur. UN SEUL filtre dans tout le schéma : à 3840 px de large, un
          `feGaussianBlur` par plan se paierait cher à l'export PNG. */}
      <filter id={`${prefix}-depth`} x="-8%" y="-8%" width="116%" height="116%">
        <feGaussianBlur stdDeviation="1.35" />
      </filter>
    </defs>
  );
}

export default memo(LashDefs);
