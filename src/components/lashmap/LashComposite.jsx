import { useEffect, useRef, useState } from 'react';
import LashOverlayArt from './LashOverlayArt';
import { VIEWBOX, lidPoint } from '../../utils/lashGeometry';
import { getEye } from '../../utils/lashModel';
import { eyeCorners } from '../../utils/faceLandmarks';
import { applyTransform, similarityTransform } from '../../utils/browComposite';

/** La frange d'extensions posée sur chaque œil de la photo.
 *
 *  BEAUCOUP PLUS SIMPLE QUE LE SOURCIL, et pour une raison de métier : une extension
 *  s'AJOUTE à un cil, elle ne le remplace pas. Rien à effacer, donc — les cils naturels de
 *  la cliente restent visibles dessous, ce qui est exactement ce qui se passe en cabine.
 *
 *  CHAQUE ŒIL REÇOIT LA SIENNE. La planche du schéma porte un seul œil, et le module la
 *  retourne pour dessiner l'autre. On fait correspondre coin interne à coin interne et
 *  coin externe à coin externe : le sens du retournement s'en déduit, et il n'y a rien à
 *  supposer sur le côté de l'image où l'on se trouve.
 *
 *  LE SCHÉMA DE LA CLIENTE, PAS UN DESSIN GÉNÉRIQUE : l'œil DROIT de la cliente est celui
 *  qu'on voit à GAUCHE de la photo, puisqu'on la regarde en face. C'est l'erreur qui
 *  passerait le plus facilement inaperçue — le rendu serait plausible, mais on montrerait
 *  à la cliente le mapping de son autre œil.
 */

const MAX_WIDTH = 1100;
const RASTER = 2;

/** Les deux coins de l'œil DANS LE REPÈRE DU DESSIN.
 *
 *  `lidPoint(0)` est le coin interne et `lidPoint(1)` l'externe — sur une planche NON
 *  retournée. Sur une planche retournée, le dessin est renvoyé en miroir autour de l'axe
 *  vertical, et les deux coins changent d'abscisse. On applique donc la même symétrie que
 *  le dessin plutôt que de se fier au fait que les deux points sont, ici, symétriques :
 *  cette coïncidence tient à la géométrie actuelle de la paupière et ne survivrait pas à
 *  une retouche du tracé. */
function sourceCorners(mirrored) {
  const flip = (p) => (mirrored ? { x: VIEWBOX.width - p.x, y: p.y } : p);
  return { inner: flip(lidPoint(0)), outer: flip(lidPoint(1)) };
}

/** Côté de la photo ⇄ œil de la cliente. On la regarde en face : son œil droit est à
 *  gauche de l'image. */
const EYES = [
  { imageSide: 'left', clientSide: 'right' },
  { imageSide: 'right', clientSide: 'left' },
];

function serialize(svg) {
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(VIEWBOX.width * RASTER));
  clone.setAttribute('height', String(VIEWBOX.height * RASTER));
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

/** Ordonnée des deux coins dans le dessin : l'axe autour duquel on retourne la planche. */
const CORNER_Y = lidPoint(0).y;

/**
 * Retournement vertical de la planche, autour de la ligne des deux coins.
 *
 *  SANS LUI, LA FRANGE SE POSE SOUS L'ŒIL. Le schéma dessine un œil BAISSÉ, vu de face :
 *  sa ligne ciliaire creuse vers le bas entre les deux coins, et les cils en descendent.
 *  C'est la bonne convention pour une planche de travail, où l'on regarde la pose comme sur
 *  une paupière fermée. Sur une photo d'œil OUVERT, la ligne fait exactement l'inverse —
 *  elle bombe vers le haut entre les coins — et les cils remontent. Faire correspondre les
 *  deux coins ne suffit donc pas : le milieu de l'arc atterrissait cent unités trop bas, et
 *  la frange se retrouvait sur la paupière inférieure. Mesuré à l'écran, pas déduit.
 *
 *  Une symétrie ne s'exprime pas dans une similitude — qui ne fait que tourner et
 *  redimensionner : on l'applique donc au point source, avant elle.
 */
function reflect(point) {
  return { x: point.x, y: 2 * CORNER_Y - point.y };
}

/** La frange remonte-t-elle bien vers le front ? Un rendu où elle descendrait signalerait
 *  une correspondance retournée, et mieux vaut ne rien poser que poser à l'envers. */
function fanPointsUp(transform) {
  const mid = lidPoint(0.5);
  const base = applyTransform(transform, { x: reflect(mid).x * RASTER, y: reflect(mid).y * RASTER });
  const tip = applyTransform(transform, {
    x: reflect({ x: mid.x, y: mid.y + 60 }).x * RASTER,
    y: reflect({ x: mid.x, y: mid.y + 60 }).y * RASTER,
  });
  return tip.y < base.y;
}

export default function LashComposite({ photoSrc, points, map, opacity = 0.95, onPaint }) {
  const canvasRef = useRef(null);
  const hostRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const onPaintRef = useRef(onPaint);
  onPaintRef.current = onPaint;

  useEffect(() => {
    let cancelled = false;

    async function paint() {
      const canvas = canvasRef.current;
      const svgs = hostRef.current?.querySelectorAll('svg');
      if (!canvas || !svgs || svgs.length < 2 || !photoSrc) return;

      const targets = EYES.map((eye, index) => ({
        ...eye,
        corners: eyeCorners(points, eye.imageSide),
        svg: svgs[index],
      })).filter((t) => t.corners && t.svg);

      if (targets.length === 0) {
        setFailed(true);
        return;
      }

      try {
        const photo = await loadImage(photoSrc);
        const drawings = await Promise.all(
          targets.map((t) =>
            loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialize(t.svg))}`)
          )
        );
        if (cancelled) return;

        const width = Math.min(MAX_WIDTH, photo.naturalWidth || MAX_WIDTH);
        const height = Math.round((width * (photo.naturalHeight || 1)) / (photo.naturalWidth || 1));
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(photo, 0, 0, width, height);

        targets.forEach((target, index) => {
          const source = sourceCorners(target.imageSide === 'left');
          const t = similarityTransform(
            { x: source.inner.x * RASTER, y: reflect(source.inner).y * RASTER },
            { x: source.outer.x * RASTER, y: reflect(source.outer).y * RASTER },
            { x: target.corners.inner.x * width, y: target.corners.inner.y * height },
            { x: target.corners.outer.x * width, y: target.corners.outer.y * height }
          );
          if (!t || !fanPointsUp(t)) return;

          ctx.save();
          ctx.globalAlpha = opacity;
          // `multiply` : un cil posé assombrit ce qu'il recouvre, il ne l'efface pas.
          ctx.globalCompositeOperation = 'multiply';
          ctx.transform(
            t.scale * Math.cos(t.angle),
            t.scale * Math.sin(t.angle),
            -t.scale * Math.sin(t.angle),
            t.scale * Math.cos(t.angle),
            t.tx,
            t.ty
          );
          // La symétrie, appliquée dans le repère du dessin : y → 2·CORNER_Y − y.
          ctx.translate(0, 2 * CORNER_Y * RASTER);
          ctx.scale(1, -1);
          ctx.drawImage(drawings[index], 0, 0);
          ctx.restore();
        });

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        setFailed(false);
        onPaintRef.current?.(canvas, photo);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    const timer = setTimeout(paint, 90);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [photoSrc, points, map, opacity]);

  return (
    <>
      {/* Les deux planches sources, hors écran. Le retournement suit le côté de la
          CLIENTE, pas celui de l'image : c'est son mapping qu'on lui montre. */}
      <div
        ref={hostRef}
        aria-hidden="true"
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}
      >
        {EYES.map(({ imageSide, clientSide }) => (
          <LashOverlayArt
            key={imageSide}
            eye={getEye(map, clientSide)}
            mirrored={imageSide === 'left'}
          />
        ))}
      </div>
      <canvas
        ref={canvasRef}
        style={{ display: failed ? 'none' : 'block', width: '100%', height: 'auto' }}
        aria-label="Rendu simulé des extensions"
      />
    </>
  );
}
