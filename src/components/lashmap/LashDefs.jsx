import { memo } from 'react';
import { GRADIENT_BOUNDS, PALETTE } from '../../utils/lashGeometry';
import { OPEN_GRADIENT_BOUNDS } from '../../utils/lashEyeOpen';

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
 * @param {{prefix: string, open?: boolean}} props préfixe unique fourni par `useId()` du
 *   canevas, et `open` quand la vue œil ouvert est montée — elle a ses propres définitions,
 *   qui n'ont rien à faire dans les autres planches.
 */
function LashDefs({ prefix, open = false }) {
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

      {open && <OpenEyeDefs prefix={prefix} />}
    </defs>
  );
}

/** Définitions propres à la VUE ŒIL OUVERT — émises seulement quand elle est montée.
 *
 *  Séparées parce qu'elles ne servent qu'à elle : les faire porter à chaque planche
 *  alourdirait pour rien tous les SVG exportés, qui sont autant de fichiers que la
 *  praticienne garde et envoie. */
function OpenEyeDefs({ prefix }) {
  return (
    <>
      {/* PEAU. Un dégradé radial qui se dissout dans le papier sur ses bords : l'œil est
          installé dans un visage, pas découpé dans une photo. Sans ce fondu, on aurait un
          rectangle de peau en travers de la planche. */}
      <radialGradient id={`${prefix}-open-skin`} gradientUnits="userSpaceOnUse" cx="300" cy="250" r="330">
        <stop offset="0%" stopColor={PALETTE.skinMid} />
        <stop offset="52%" stopColor={PALETTE.skinMid} />
        <stop offset="100%" stopColor={PALETTE.paper} />
      </radialGradient>

      {/* GLOBE. Clair au centre, assombri vers les coins : c'est ce qui lui donne sa
          rondeur. Un blanc d'œil uni fait découpe de papier. */}
      <radialGradient id={`${prefix}-open-sclera`} gradientUnits="userSpaceOnUse" cx="300" cy="252" r="240">
        <stop offset="0%" stopColor={PALETTE.sclera} />
        <stop offset="58%" stopColor={PALETTE.sclera} />
        <stop offset="100%" stopColor={PALETTE.scleraShade} />
      </radialGradient>

      {/* IRIS : doré au centre, brun au milieu, presque noir au limbe. Trois arrêts, parce
          qu'un iris n'est jamais d'une seule teinte — c'est un tissu. */}
      <radialGradient id={`${prefix}-open-iris`} cx="42%" cy="36%" r="72%">
        <stop offset="0%" stopColor={PALETTE.irisLight} />
        <stop offset="38%" stopColor={PALETTE.iris} />
        <stop offset="82%" stopColor={PALETTE.irisDeep} />
        <stop offset="100%" stopColor={PALETTE.irisRim} />
      </radialGradient>

      {/* OMBRE DE LA FRANGE sur le globe : dense contre la paupière, éteinte quelques
          dizaines d'unités plus bas. Une ombre franche ferait un bandeau. */}
      <linearGradient
        id={`${prefix}-open-shadow`}
        gradientUnits="userSpaceOnUse"
        x1="0"
        y1={OPEN_GRADIENT_BOUNDS.shadow.y0}
        x2="0"
        y2={OPEN_GRADIENT_BOUNDS.shadow.y1}
      >
        <stop offset="0%" stopColor={PALETTE.ink} stopOpacity="0.55" />
        <stop offset="60%" stopColor={PALETTE.ink} stopOpacity="0.16" />
        <stop offset="100%" stopColor={PALETTE.ink} stopOpacity="0" />
      </linearGradient>

      {/* Fondu large, pour la peau et l'ombre portée. Distinct du flou de profondeur, dix
          fois plus étroit : les deux ne rendent pas le même service. */}
      <filter id={`${prefix}-open-soft`} x="-25%" y="-25%" width="150%" height="150%">
        <feGaussianBlur stdDeviation="9" />
      </filter>

      <linearGradient
        id={`${prefix}-open-lash`}
        gradientUnits="userSpaceOnUse"
        x1="0"
        y1={OPEN_GRADIENT_BOUNDS.lash.y0}
        x2="0"
        y2={OPEN_GRADIENT_BOUNDS.lash.y1}
      >
        <stop offset="0%" stopColor={PALETTE.lashRoot} />
        <stop offset="55%" stopColor={PALETTE.lashRoot} />
        <stop offset="100%" stopColor={PALETTE.lashTip} />
      </linearGradient>

      <linearGradient
        id={`${prefix}-open-lash-back`}
        gradientUnits="userSpaceOnUse"
        x1="0"
        y1={OPEN_GRADIENT_BOUNDS.lash.y0}
        x2="0"
        y2={OPEN_GRADIENT_BOUNDS.lash.y1}
      >
        <stop offset="0%" stopColor={PALETTE.lashBackRoot} />
        <stop offset="100%" stopColor={PALETTE.lashBackTip} />
      </linearGradient>

      <linearGradient
        id={`${prefix}-open-lid`}
        gradientUnits="userSpaceOnUse"
        x1="0"
        y1={OPEN_GRADIENT_BOUNDS.lid.y0}
        x2="0"
        y2={OPEN_GRADIENT_BOUNDS.lid.y1}
      >
        <stop offset="0%" stopColor={PALETTE.lidHigh} stopOpacity="0.3" />
        <stop offset="70%" stopColor={PALETTE.lidLow} stopOpacity="0.7" />
        <stop offset="100%" stopColor={PALETTE.lidLow} stopOpacity="0.95" />
      </linearGradient>

    </>
  );
}

export default memo(LashDefs);
