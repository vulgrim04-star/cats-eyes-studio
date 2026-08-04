import { useCallback, useRef, useState } from 'react';
import Icon from '../common/Icon';
import BrowCanvas from './BrowCanvas';
import { useToast } from '../../hooks/useToast';
import { DETECTION_STATE, useFaceLandmarker } from '../../hooks/useFaceLandmarker';
import { BROW_VIEWBOX } from '../../utils/browGeometry';
import { adviceToLook, adviseBrow, analyseSymmetry } from '../../utils/browAdvisor';
import { browHeights, estimateFaceShape, overlayFromLandmarks } from '../../utils/faceLandmarks';
import { BROW_TONES } from '../../utils/browShapes';
import {
  OVERLAY_DEFAULT,
  normalizeOverlay,
  overlayStyle,
  wipeClip,
  wipeFromPointer,
} from '../../utils/lashOverlay';
import styles from './styles/LashSimulation.module.css';

const RATIO = BROW_VIEWBOX.height / BROW_VIEWBOX.width;
const MAX_MO = 8;

/** Simulation Brow Lift : le tracé posé sur le visage de la cliente.
 *
 *  La détection place le tracé toute seule — repères faciaux, morphologie, écart de
 *  symétrie — puis l'assistant en tire une recommandation. Mais TOUT reste rattrapable à la
 *  main : la détection peut se tromper, le modèle peut refuser de se charger, et une
 *  simulation qui deviendrait inutilisable dans ces cas-là ne servirait à rien en cabine.
 */
export default function BrowSimulation({ client, look, onApplyAdvice }) {
  const { showToast } = useToast();
  const { state, error, detect } = useFaceLandmarker();

  const [photo, setPhoto] = useState(null);
  const [overlay, setOverlay] = useState(OVERLAY_DEFAULT);
  const [analysis, setAnalysis] = useState(null);
  const frameRef = useRef(null);
  const imgRef = useRef(null);
  const fileRef = useRef(null);

  const update = (patch) => setOverlay((o) => normalizeOverlay({ ...o, ...patch }));

  const moveWipe = useCallback((clientX) => {
    const rect = frameRef.current?.getBoundingClientRect();
    setOverlay((o) => normalizeOverlay({ ...o, wipe: wipeFromPointer(clientX, rect) }));
  }, []);

  const startDrag = (event) => {
    moveWipe(event.clientX);
    const move = (e) => moveWipe(e.clientX);
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
  };

  const importFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_MO * 1024 * 1024) {
      showToast(`Photo trop lourde (max ${MAX_MO} Mo)`, 'warning');
      return;
    }
    const reader = new FileReader();
    // Data URL et jamais URL d'objet : c'est la seule forme qui ne se périme pas au
    // rechargement et qui survivrait à une sérialisation.
    reader.onload = () => {
      setPhoto({ src: String(reader.result), name: file.name });
      setAnalysis(null);
      setOverlay(OVERLAY_DEFAULT);
    };
    reader.onerror = () => showToast('Lecture de la photo impossible', 'error');
    reader.readAsDataURL(file);
  };

  /** Analyse : place le tracé, estime la morphologie, mesure la symétrie, puis conseille. */
  const analyse = async () => {
    const image = imgRef.current;
    if (!image?.complete) {
      showToast('Photo pas encore chargée', 'warning');
      return;
    }
    const points = await detect(image);
    if (!points) {
      showToast('Aucun visage détecté — cale le tracé à la main', 'warning');
      return;
    }
    const placement = overlayFromLandmarks(points);
    if (placement) setOverlay((o) => normalizeOverlay({ ...o, ...placement }));

    const face = estimateFaceShape(points);
    const heights = browHeights(points);
    const symmetry = heights ? analyseSymmetry(heights.leftY, heights.rightY, heights.span) : null;
    const advice = face ? adviseBrow({ faceShape: face.id, hairTone: client?.hairTone, symmetry }) : null;
    setAnalysis({ face, symmetry, advice });
    showToast('Visage analysé', 'success');
  };

  const busy = state === DETECTION_STATE.loading || state === DETECTION_STATE.running;

  if (!photo) {
    return (
      <div className={styles.empty}>
        <Icon name="camera" size={26} />
        <h3>Simulation Brow Lift</h3>
        <p>
          Importe une photo du visage de la cliente. L’outil repère seul les sourcils, estime
          la morphologie et propose la forme adaptée — tout reste modifiable ensuite.
        </p>
        <div className={styles.emptyActions}>
          <button type="button" className="btn btn-primary" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={15} /> Importer une photo
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={importFile} />
        </div>
        <p className={styles.storedTitle} style={{ marginTop: 'var(--space-3)' }}>
          La photo ne quitte jamais l’appareil : l’analyse se fait entièrement dans le navigateur.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.stage}>
        <div className={styles.frame} ref={frameRef} onPointerDown={startDrag}>
          {/* `draggable={false}` : sans lui, glisser sur la photo déclenche le
              glisser-déposer natif de l'image et le navigateur cesse d'émettre
              `pointermove` — la poignée se figerait au premier millimètre. */}
          <img
            ref={imgRef}
            className={styles.photo}
            src={photo.src}
            alt={`Visage de ${client?.firstName ?? 'la cliente'}`}
            draggable={false}
          />

          <div className={styles.after} style={{ clipPath: wipeClip(overlay) }}>
            <div style={overlayStyle(overlay, RATIO)} className={styles.tracing}>
              <BrowCanvas look={look} readOnly transparent />
            </div>
          </div>

          <div className={styles.divider} style={{ left: `${overlay.wipe}%` }} aria-hidden="true">
            <span className={styles.handle}><Icon name="chevron-left" size={12} /><Icon name="chevron-right" size={12} /></span>
          </div>

          <span className={`${styles.tag} ${styles.tagLeft}`}>Avant</span>
          <span className={`${styles.tag} ${styles.tagRight}`}>Après</span>
        </div>

        <label className={styles.wipeField}>
          <span className={styles.label}>Volet avant / après</span>
          <input
            type="range"
            min={0}
            max={100}
            value={overlay.wipe}
            onChange={(e) => update({ wipe: e.target.value })}
            className={styles.slider}
            aria-label="Position du volet avant / après"
          />
        </label>
      </div>

      <div className={styles.panel}>
        <button type="button" className="btn btn-primary" onClick={analyse} disabled={busy}>
          <Icon name="sparkles" size={15} />
          {state === DETECTION_STATE.loading ? 'Chargement du modèle…' : busy ? 'Analyse…' : 'Analyser le visage'}
        </button>

        {state === DETECTION_STATE.loading && (
          <p className={styles.storedTitle}>
            Premier chargement : environ 6 Mo, une seule fois. Ensuite l’analyse est immédiate,
            même hors ligne.
          </p>
        )}

        {state === DETECTION_STATE.failed && (
          <p className={styles.warn}>
            L’analyse automatique n’a pas pu démarrer sur cet appareil{error ? ` (${error})` : ''}.
            Cale le tracé à la main avec les curseurs ci-dessous — le résultat est le même.
          </p>
        )}

        {analysis?.face && (
          <div className={styles.advice}>
            <p className={styles.adviceHead}>
              <Icon name="sparkles" size={14} /> Visage {analysis.face.label.toLowerCase()}
              <span className={styles.adviceConfidence}>
                {analysis.face.confidence >= 0.7 ? 'estimation nette' : 'estimation à confirmer'}
              </span>
            </p>

            {analysis.advice && (
              <>
                <p className={styles.adviceSentence}>{analysis.advice.sentence}</p>
                <p className={styles.adviceWhy}>{analysis.advice.why}</p>
                {analysis.advice.avoid && (
                  <p className={styles.adviceWhy}><strong>À éviter</strong> : {analysis.advice.avoid}</p>
                )}
                {analysis.advice.toneWhy && <p className={styles.adviceWhy}>{analysis.advice.toneWhy}</p>}
                {analysis.advice.symmetryNote && <p className={styles.adviceWhy}>{analysis.advice.symmetryNote}</p>}
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    onApplyAdvice?.(adviceToLook(analysis.advice));
                    showToast(`${analysis.advice.shape.label} appliqué`, 'success');
                  }}
                >
                  Appliquer ce conseil
                </button>
              </>
            )}

            <p className={styles.storedTitle}>
              Une morphologie déduite de quelques mesures reste une estimation. Tu vois le
              visage, l’outil ne voit que des coordonnées : corrige-le sans hésiter.
            </p>
          </div>
        )}

        {[
          ['Position horizontale', 'x', 0, 100],
          ['Position verticale', 'y', 0, 100],
          ['Taille', 'scale', 10, 200],
          ['Opacité du tracé', 'opacity', 10, 100],
        ].map(([label, key, min, max]) => (
          <label key={key} className={styles.field}>
            <span className={styles.label}>{label} <strong>{overlay[key]} %</strong></span>
            <input
              type="range"
              min={min}
              max={max}
              value={overlay[key]}
              onChange={(e) => update({ [key]: e.target.value })}
              className={styles.slider}
            />
          </label>
        ))}

        <div className={styles.actions}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOverlay(OVERLAY_DEFAULT)}>
            Recentrer
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => { setPhoto(null); setAnalysis(null); setOverlay(OVERLAY_DEFAULT); }}
          >
            Changer de photo
          </button>
        </div>
      </div>
    </div>
  );
}

/** Teintes de cheveux proposées à la saisie, pour le conseil de coloration. */
export const HAIR_TONES = BROW_TONES;
