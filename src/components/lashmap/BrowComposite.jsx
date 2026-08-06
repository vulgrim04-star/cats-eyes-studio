import { useEffect, useRef, useState } from 'react';
import BrowCanvas from './BrowCanvas';
import { BROW_VIEWBOX, browEnds } from '../../utils/browGeometry';
import {
  applyTransform,
  browFrame,
  browFramePx,
  eraseZone,
  similarityTransform,
  skinProbes,
} from '../../utils/browComposite';

/** Le rendu « après » : le sourcil naturel effacé, le nouveau posé à sa place.
 *
 *  C'EST LA DIFFÉRENCE AVEC L'ANCIENNE SIMULATION. Elle posait un dessin à plat au milieu
 *  de la photo, sans l'incliner ni l'ajuster côté par côté, et le sourcil de la cliente
 *  restait dessous : on lui montrait deux sourcils superposés. Ici la photo est repeinte.
 *
 *  Trois opérations, dans cet ordre, et chacune a sa raison d'être :
 *
 *   1. **Effacer** — la peau du front est recopiée par-dessus le sourcil (le geste du
 *      tampon de clonage), puis floutée. Un aplat de couleur moyenne serait plus simple et
 *      se verrait immédiatement : la peau a un grain et un dégradé de lumière qu'un aplat
 *      n'a pas.
 *   2. **Fondre les bords** — le rustine est masqué par un contour flouté. Sans ce
 *      dégradé, la limite de la zone effacée trace un liseré net sur le front, et c'est
 *      lui qu'on remarque, pas le sourcil.
 *   3. **Reposer** — le dessin est amené sur l'arcade en faisant correspondre sa tête et sa
 *      queue à celles du visage. L'inclinaison et l'échelle en découlent, donc rien n'est
 *      estimé, et les deux arcades reçoivent chacune la sienne.
 *
 *  CE QUE ÇA N'EST PAS : une photo. C'est un dessin très bien posé. Sur un visage éclairé
 *  et de face le résultat tient ; à contre-jour ou de trois quarts, la zone effacée se
 *  voit. Le repli manuel reste donc accessible, et la praticienne juge.
 */

/** Largeur de travail. Au-delà, on paie trois canvas pleine résolution à chaque mouvement
 *  de curseur sans que l'œil y gagne : la simulation se regarde à l'écran, pas en A3. */
const MAX_WIDTH = 1100;

/** Résolution de rastérisation du dessin, en multiples de son viewBox. Deux suffisent :
 *  le sourcil est réduit à quelques centaines de pixels une fois posé sur le visage. */
const RASTER = 2;

/** Réglages de l'effacement, en multiples de l'épaisseur du sourcil pour suivre les
 *  visages fins comme les épais. L'étendue de la zone, elle, vit dans `browComposite.js`
 *  avec la fonction qui la construit. */
const ERASE = {
  /** Distance de prélèvement de la peau, vers le front.
   *
   *  1,3 fois l'épaisseur, pas davantage : c'est juste au-dessus du sourcil, donc déjà de
   *  la peau, mais encore loin de la naissance des cheveux. À 2,4 le prélèvement allait
   *  chercher la frange sur un front dégagé et déposait une bande sombre au-dessus de
   *  chaque arcade. */
  lift: 1.3,
  /** Flou du prélèvement, et fondu du bord de la rustine. */
  blur: 0.6,
  feather: 0.55,
};

const SIDES = ['left', 'right'];

/** Sérialise un `<svg>` du document en fichier autonome, à ses propres dimensions.
 *  `lashExport.serializeSvg` fige celles de la lash map ; ici le viewBox est autre. */
function serialize(svg) {
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(BROW_VIEWBOX.width * RASTER));
  clone.setAttribute('height', String(BROW_VIEWBOX.height * RASTER));
  clone.querySelectorAll('[tabindex], [role="button"]').forEach((node) => {
    node.removeAttribute('tabindex');
    node.removeAttribute('role');
    node.removeAttribute('aria-pressed');
  });
  return new XMLSerializer().serializeToString(clone);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image illisible'));
    image.src = src;
  });
}

/** Trace un contour déjà exprimé en pixels. */
function tracePath(ctx, polygon) {
  ctx.beginPath();
  polygon.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const luminance = (c) => 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;

/**
 * Teinte de peau lue sur les sondes.
 *
 * MÉDIANE, ET LES ABERRANTES ÉCARTÉES, pas une moyenne. Les sondes tombent sur le front,
 * mais l'une d'elles peut atterrir sur une mèche, une racine de cheveu ou l'ombre d'une
 * frange. En moyenne, cette seule sonde sombre tire toute la teinte vers le bas et le
 * rebouchage pose un halo gris au-dessus du sourcil — mesuré, pas supposé. La médiane
 * l'ignore, et le filtre de luminance l'exclut franchement.
 */
function skinColour(ctx, probes, width, height) {
  const samples = probes
    .map((p) => {
      const x = Math.round(p.x * width);
      const y = Math.round(p.y * height);
      if (x < 0 || y < 0 || x >= width || y >= height) return null;
      const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
      return { r, g, b };
    })
    .filter(Boolean);
  if (samples.length === 0) return null;

  const reference = median(samples.map(luminance));
  const kept = samples.filter((c) => Math.abs(luminance(c) - reference) <= reference * 0.18);
  const pool = kept.length > 0 ? kept : samples;
  const channel = (key) => Math.round(median(pool.map((c) => c[key])));
  return `rgb(${channel('r')}, ${channel('g')}, ${channel('b')})`;
}

/** Efface un sourcil : peau du front recopiée par-dessus, floutée, aux bords fondus.
 *  `framePx` et la zone sont en PIXELS — voir `browFramePx` pour pourquoi. */
function eraseBrow(ctx, photo, framePx, probes, width, height) {
  const zone = eraseZone(framePx);
  const thickness = Math.max(framePx.thickness, framePx.length * 0.16);
  const blurPx = Math.max(2, thickness * ERASE.blur);
  const featherPx = Math.max(2, thickness * ERASE.feather);

  // Direction du front : la normale à l'axe, retournée si elle descend.
  let nx = Math.sin(framePx.angle);
  let ny = -Math.cos(framePx.angle);
  if (ny > 0) { nx = -nx; ny = -ny; }

  // LE DÉCALAGE EST L'OPPOSÉ DE CETTE DIRECTION, et c'est contre-intuitif au point que la
  // première version l'a pris à l'endroit. `drawImage` à l'offset (ox, oy) fait apparaître
  // au point p le pixel qui était en p − (ox, oy) : pour amener sur le sourcil la peau du
  // FRONT, située en p + n·d, il faut décaler de −n·d.
  const dx = -nx * thickness * ERASE.lift;
  const dy = -ny * thickness * ERASE.lift;

  // La rustine est peinte à part puis découpée par un masque flouté : découper
  // directement sur la photo donnerait un bord net, qu'on remarque plus que le sourcil.
  const patch = document.createElement('canvas');
  patch.width = width;
  patch.height = height;
  const pctx = patch.getContext('2d');
  pctx.filter = `blur(${blurPx}px)`;
  pctx.drawImage(photo, dx, dy, width, height);
  pctx.filter = 'none';

  const skin = skinColour(ctx, probes, width, height);
  if (skin) {
    // Un voile de la teinte moyenne : le clonage garde le grain, ce voile rattrape ce
    // qu'il aurait pu ramener d'une mèche ou d'une ombre.
    pctx.globalAlpha = 0.42;
    pctx.fillStyle = skin;
    pctx.fillRect(0, 0, width, height);
    pctx.globalAlpha = 1;
  }

  const mask = document.createElement('canvas');
  mask.width = width;
  mask.height = height;
  const mctx = mask.getContext('2d');
  mctx.filter = `blur(${featherPx}px)`;
  mctx.fillStyle = '#fff';
  tracePath(mctx, zone);
  mctx.fill();
  mctx.filter = 'none';

  pctx.globalCompositeOperation = 'destination-in';
  pctx.drawImage(mask, 0, 0);

  ctx.drawImage(patch, 0, 0);
}

/** Pose le dessin sur une arcade, à son inclinaison et à sa longueur. */
function paintBrow(ctx, drawing, look, side, frame, width, height, opacity) {
  const ends = browEnds(look, side);
  const source = {
    head: { x: ends.head.x * RASTER, y: ends.head.y * RASTER },
    tail: { x: ends.tail.x * RASTER, y: ends.tail.y * RASTER },
  };
  const dest = {
    head: { x: frame.head.x * width, y: frame.head.y * height },
    tail: { x: frame.tail.x * width, y: frame.tail.y * height },
  };
  const t = similarityTransform(source.head, source.tail, dest.head, dest.tail);
  if (!t) return;

  ctx.save();

  // La planche porte LES DEUX sourcils : posée une fois par côté, elle déposerait aussi le
  // voisin, quelque part vers le nez. On la découpe donc à sa propre moitié.
  //
  // Découpée à sa MOITIÉ, et non à une boîte autour de l'arcade — c'est la deuxième
  // version. La première prenait un rectangle de 1,7 fois la longueur du sourcil : trop
  // long, il laissait passer une touffe du sourcil voisin au milieu du front ; trop court à
  // la fois, il tranchait la queue du sourcil d'un trait vertical net. La moitié de la
  // planche n'a aucun de ces défauts puisqu'elle est la séparation que le dessin porte
  // lui-même — chaque sourcil y tient entier, et rien d'autre n'y tient.
  const w = BROW_VIEWBOX.width * RASTER;
  const h = BROW_VIEWBOX.height * RASTER;
  const mid = w / 2;
  const halfRect = side === 'left'
    ? [{ x: 0, y: 0 }, { x: mid, y: 0 }, { x: mid, y: h }, { x: 0, y: h }]
    : [{ x: mid, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: mid, y: h }];
  ctx.beginPath();
  halfRect.map((p) => applyTransform(t, p)).forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
  ctx.clip();

  ctx.globalAlpha = opacity;
  // `multiply` plutôt que le report normal : un poil posé sur la peau la fonce, il ne la
  // remplace pas. En report normal, le sourcil paraît collé sur le visage.
  ctx.globalCompositeOperation = 'multiply';
  ctx.transform(
    t.scale * Math.cos(t.angle),
    t.scale * Math.sin(t.angle),
    -t.scale * Math.sin(t.angle),
    t.scale * Math.cos(t.angle),
    t.tx,
    t.ty
  );
  ctx.drawImage(drawing, 0, 0);

  ctx.restore();
}

/**
 * Rendu composé.
 *
 * @param {string} photoSrc data URL de la photo
 * @param {Array} points repères faciaux, ou null
 * @param {object} look réglages du sourcil
 * @param {number} opacity opacité du tracé posé, 0–1
 * @param {(ok:boolean)=>void} onReady prévient si la composition a pu se faire
 */
/** Délai avant repeinte, en millisecondes.
 *
 *  Un mouvement de curseur émet des dizaines de rendus par seconde, et chacun coûte une
 *  rastérisation du dessin plus trois canvas pleine taille. Sans ce délai, la scène se
 *  traîne pendant qu'on règle — et c'est précisément pendant qu'on règle qu'on la regarde.
 *  Assez court pour que le résultat semble immédiat après le doigt levé. */
const REPAINT_DELAY = 90;

export default function BrowComposite({ photoSrc, points, look, opacity = 0.92, onReady }) {
  const canvasRef = useRef(null);
  const svgHostRef = useRef(null);
  const [failed, setFailed] = useState(false);

  // `onReady` est une fonction fléchée écrite dans le JSX du parent : son identité change à
  // CHAQUE rendu. En dépendance de l'effet, elle relancerait toute la composition à chaque
  // frappe, y compris quand rien de visible n'a bougé. On la garde dans une référence.
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    let cancelled = false;

    async function paint() {
      const canvas = canvasRef.current;
      const svg = svgHostRef.current?.querySelector('svg');
      if (!canvas || !svg || !photoSrc) return;

      const frames = SIDES.map((side) => ({ side, frame: browFrame(points, side) }))
        .filter((entry) => entry.frame);
      if (frames.length === 0) {
        setFailed(true);
        onReadyRef.current?.(false);
        return;
      }

      try {
        const [photo, drawing] = await Promise.all([
          loadImage(photoSrc),
          // Data URL et non URL d'objet : le SVG porte ses propres `defs` grâce au préfixe
          // `useId`, et une image distante ne serait de toute façon pas chargée par la
          // rastérisation.
          loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialize(svg))}`),
        ]);
        if (cancelled) return;

        const width = Math.min(MAX_WIDTH, photo.naturalWidth || MAX_WIDTH);
        const height = Math.round((width * (photo.naturalHeight || 1)) / (photo.naturalWidth || 1));
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(photo, 0, 0, width, height);

        frames.forEach(({ side, frame }) => {
          const framePx = browFramePx(points, side, width, height);
          if (framePx) eraseBrow(ctx, photo, framePx, skinProbes(frame), width, height);
        });

        frames.forEach(({ side, frame }) => {
          paintBrow(ctx, drawing, look, side, frame, width, height, opacity);
        });
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;

        setFailed(false);
        onReadyRef.current?.(true);
      } catch {
        if (cancelled) return;
        setFailed(true);
        onReadyRef.current?.(false);
      }
    }

    const timer = setTimeout(paint, REPAINT_DELAY);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [photoSrc, points, look, opacity]);

  return (
    <>
      {/* Le dessin source, hors écran : il n'est là que pour être rasterisé. */}
      <div ref={svgHostRef} aria-hidden="true" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}>
        <BrowCanvas look={look} readOnly transparent />
      </div>
      <canvas
        ref={canvasRef}
        style={{ display: failed ? 'none' : 'block', width: '100%', height: 'auto' }}
        aria-label="Rendu simulé des sourcils"
      />
    </>
  );
}
