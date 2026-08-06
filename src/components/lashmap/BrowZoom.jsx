import { useEffect, useRef } from 'react';
import Icon from '../common/Icon';
import styles from './styles/BrowStudio.module.css';

/** Agrandissement de la zone des yeux, et comparaison côte à côte.
 *
 *  POURQUOI CE BLOC EXISTE : sur un visage entier affiché à cinq cents pixels de large, un
 *  sourcil en fait quatre-vingts. C'est là qu'on juge le travail, et c'est justement la
 *  taille à laquelle on ne voit rien. Le recadrage sur les arcades est le seul moyen de
 *  montrer à une cliente ce qui a changé.
 *
 *  IL NE RECOMPOSE RIEN. Il recopie deux images déjà calculées — la photo d'origine et le
 *  canvas du rendu composé — dans la zone qui l'intéresse. Refaire la composition pour
 *  l'agrandissement doublerait le coût de chaque mouvement de curseur pour un résultat
 *  strictement identique.
 */

const MODES = [
  { id: 'zoom', label: 'Zoom', icon: 'search' },
  { id: 'compare', label: 'Comparaison', icon: 'eye' },
];

/** Hauteur de rendu du recadrage, en pixels de canvas. Au-delà on agrandit du flou. */
const CROP_HEIGHT = 260;

function drawCrop(canvas, source, region, label) {
  if (!canvas || !source || !region) return;
  const sw = source.width ?? source.naturalWidth;
  const sh = source.height ?? source.naturalHeight;
  if (!sw || !sh) return;

  const sx = region.x * sw;
  const sy = region.y * sh;
  const sWidth = region.width * sw;
  const sHeight = region.height * sh;

  const height = CROP_HEIGHT;
  const width = Math.round((height * sWidth) / sHeight);
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(source, sx, sy, sWidth, sHeight, 0, 0, width, height);

  if (label) {
    ctx.font = '600 13px system-ui, sans-serif';
    const textWidth = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(43, 39, 36, 0.62)';
    ctx.fillRect(8, height - 30, textWidth + 18, 22);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, 17, height - 14);
  }
}

/**
 * @param {string} mode 'zoom' ou 'compare'
 * @param {object} region zone à recadrer, en fractions de l'image
 * @param {HTMLImageElement} photo photo d'origine, déjà chargée
 * @param {HTMLCanvasElement} composite canvas du rendu composé
 * @param {number} tick incrémenté à chaque repeinte du composé, pour redessiner
 */
export default function BrowZoom({ mode, onMode, region, photo, composite, tick }) {
  const beforeRef = useRef(null);
  const afterRef = useRef(null);

  useEffect(() => {
    if (mode === 'compare') {
      drawCrop(beforeRef.current, photo, region, 'Avant');
      drawCrop(afterRef.current, composite, region, 'Après');
    } else {
      drawCrop(afterRef.current, composite, region, null);
    }
  }, [mode, region, photo, composite, tick]);

  if (!region || !composite) return null;

  return (
    <div className={styles.zoomBlock}>
      <div className={styles.zoomHead}>
        <span className={styles.label}>Aperçu rapproché</span>
        <div className={styles.chipRow} role="group" aria-label="Mode d’aperçu">
          {MODES.map(({ id, label, icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={mode === id}
              className={`${styles.chip2} ${mode === id ? styles.chip2Active : ''}`}
              onClick={() => onMode(id)}
            >
              <Icon name={icon} size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className={mode === 'compare' ? styles.zoomPair : styles.zoomSingle}>
        {mode === 'compare' && <canvas ref={beforeRef} className={styles.zoomCanvas} aria-label="Avant, rapproché" />}
        <canvas
          ref={afterRef}
          className={styles.zoomCanvas}
          aria-label={mode === 'compare' ? 'Après, rapproché' : 'Rendu rapproché'}
        />
      </div>
    </div>
  );
}
