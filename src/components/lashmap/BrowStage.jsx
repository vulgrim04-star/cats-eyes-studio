import { useCallback, useRef, useState } from 'react';
import Icon from '../common/Icon';
import BrowCanvas from './BrowCanvas';
import BrowComposite from './BrowComposite';
import { useToast } from '../../hooks/useToast';
import { DETECTION_STATE, useFaceLandmarker } from '../../hooks/useFaceLandmarker';
import { BROW_VIEWBOX } from '../../utils/browGeometry';
import { adviseBrow, analyseSymmetry } from '../../utils/browAdvisor';
import { browHeights, estimateFaceShape, overlayFromLandmarks } from '../../utils/faceLandmarks';
import { BROW_EFFECTS, BROW_ZONES, lookSummary } from '../../utils/browShapes';
import { canCompose } from '../../utils/browComposite';
import {
  OVERLAY_DEFAULT,
  normalizeOverlay,
  overlayStyle,
  wipeClip,
  wipeFromPointer,
} from '../../utils/lashOverlay';
import styles from './styles/BrowStudio.module.css';

const RATIO = BROW_VIEWBOX.height / BROW_VIEWBOX.width;
const MAX_MO = 8;

const OVERLAY_SLIDERS = [
  ['Position horizontale', 'x', 0, 100],
  ['Position verticale', 'y', 0, 100],
  ['Taille', 'scale', 10, 200],
  ['Opacité du tracé', 'opacity', 10, 100],
];

/** La scène : ce qu'on regarde, et ce qu'on montre à la cliente.
 *
 *  Elle occupe le centre en permanence, et bascule seule entre deux états. Sans photo, le
 *  tracé vectoriel des deux sourcils, avec ses pastilles de zone : c'est l'outil de
 *  travail. Avec une photo, le même tracé posé sur le visage et un volet avant/après :
 *  c'est l'outil de vente.
 *
 *  La bascule est automatique et non un onglet. Un onglet obligerait à choisir entre voir
 *  son réglage et voir son effet ; ici les puces d'effet et de zone restent sous la scène
 *  dans les deux cas, et un réglage se voit immédiatement là où il compte.
 */
export default function BrowStage({ client, look, zone, onSelectZone, onChange, onAnalysis }) {
  const { showToast } = useToast();
  const { state, error, detect } = useFaceLandmarker();

  const [photo, setPhoto] = useState(null);
  const [overlay, setOverlay] = useState(OVERLAY_DEFAULT);
  const [tuning, setTuning] = useState(false);
  // Les repères sont GARDÉS après l'analyse, et non consommés puis jetés : ce sont eux qui
  // permettent d'effacer le sourcil naturel et de reposer le nouveau à sa place.
  const [points, setPoints] = useState(null);
  // Le calage à la main reste toujours joignable. La composition peut décevoir sur une
  // photo à contre-jour ou de trois quarts, et une simulation qu'on ne pourrait pas
  // rattraper ne servirait à rien en cabine.
  const [manual, setManual] = useState(false);
  const frameRef = useRef(null);
  const imgRef = useRef(null);
  const fileRef = useRef(null);

  const update = (patch) => setOverlay((o) => normalizeOverlay({ ...o, ...patch }));

  const moveWipe = useCallback((clientX) => {
    const rect = frameRef.current?.getBoundingClientRect();
    setOverlay((o) => normalizeOverlay({ ...o, wipe: wipeFromPointer(clientX, rect) }));
  }, []);

  /** Les écouteurs sont posés sur `window` DANS le gestionnaire, pas dans un effet : le
   *  glissement doit continuer quand le doigt sort du cadre. */
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
      onAnalysis?.(null);
      setPoints(null);
      setManual(false);
      setOverlay(OVERLAY_DEFAULT);
    };
    reader.onerror = () => showToast('Lecture de la photo impossible', 'error');
    reader.readAsDataURL(file);
    // Sans cette remise à zéro, réimporter LE MÊME fichier n'émet pas d'événement.
    event.target.value = '';
  };

  /** Analyse : place le tracé, estime la morphologie, mesure la symétrie, puis conseille. */
  const analyse = async () => {
    const image = imgRef.current;
    if (!image?.complete) {
      showToast('Photo pas encore chargée', 'warning');
      return;
    }
    const found = await detect(image);
    if (!found) {
      showToast('Aucun visage détecté — cale le tracé à la main', 'warning');
      setManual(true);
      setTuning(true);
      return;
    }
    setPoints(found);
    setManual(false);
    // Le calage à plat est préparé quand même : c'est vers lui qu'on bascule si la
    // composition ne convient pas, et il doit alors être déjà au bon endroit.
    const placement = overlayFromLandmarks(found);
    if (placement) setOverlay((o) => normalizeOverlay({ ...o, ...placement }));

    const face = estimateFaceShape(found);
    const heights = browHeights(found);
    const symmetry = heights ? analyseSymmetry(heights.leftY, heights.rightY, heights.span) : null;
    const advice = face ? adviseBrow({ faceShape: face.id, hairTone: client?.hairTone, symmetry }) : null;
    onAnalysis?.({ face, symmetry, advice });
    showToast(canCompose(found) ? 'Visage analysé — sourcils recomposés' : 'Visage analysé', 'success');
  };

  // Composition possible ET souhaitée : sinon on retombe sur le calque à plat d'origine.
  const composed = !manual && points !== null && canCompose(points);

  const busy = state === DETECTION_STATE.loading || state === DETECTION_STATE.running;

  return (
    <div className={styles.stage}>
      <header className={styles.stageHead}>
        <h2 className={styles.stageTitle}>
          <Icon name={photo ? 'camera' : 'eye'} size={15} /> {photo ? 'Simulation' : 'Tracé'}
        </h2>
        <div className={styles.stageHeadActions}>
          {photo && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setPhoto(null);
                onAnalysis?.(null);
                setOverlay(OVERLAY_DEFAULT);
              }}
            >
              Retirer la photo
            </button>
          )}
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={14} /> {photo ? 'Changer' : 'Importer une photo'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={importFile} />
        </div>
      </header>

      {photo ? (
        <>
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
              {composed ? (
                // Le canvas EST la photo repeinte : il recouvre l'original en entier, et
                // c'est le volet qui décide de la part qu'on en voit.
                <BrowComposite
                  photoSrc={photo.src}
                  points={points}
                  look={look}
                  opacity={overlay.opacity / 100}
                  onReady={(ok) => { if (!ok) setManual(true); }}
                />
              ) : (
                <div style={overlayStyle(overlay, RATIO)} className={styles.tracing}>
                  <BrowCanvas look={look} readOnly transparent />
                </div>
              )}
            </div>

            <div className={styles.divider} style={{ left: `${overlay.wipe}%` }} aria-hidden="true">
              <span className={styles.dividerHandle}>
                <Icon name="chevron-left" size={12} />
                <Icon name="chevron-right" size={12} />
              </span>
            </div>

            <span className={`${styles.tag} ${styles.tagLeft}`}>Avant</span>
            <span className={`${styles.tag} ${styles.tagRight}`}>Après</span>
          </div>

          <label className={styles.field}>
            <span className={styles.label}>
              Volet avant / après <strong>{overlay.wipe} %</strong>
            </span>
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

          <div className={styles.stageTools}>
            <button type="button" className="btn btn-primary btn-sm" onClick={analyse} disabled={busy}>
              <Icon name="sparkles" size={14} />
              {state === DETECTION_STATE.loading
                ? 'Chargement du modèle…'
                : busy
                  ? 'Analyse…'
                  : 'Analyser le visage'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              aria-expanded={tuning}
              onClick={() => setTuning((t) => !t)}
            >
              <Icon name={tuning ? 'chevron-up' : 'chevron-down'} size={13} /> Caler le tracé
            </button>
            {points && canCompose(points) && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                aria-pressed={!composed}
                onClick={() => {
                  const next = !manual;
                  setManual(next);
                  // Basculer en calque simple sans ouvrir les curseurs laisserait devant un
                  // tracé mal placé sans dire comment le rattraper.
                  if (next) setTuning(true);
                }}
              >
                {composed ? 'Passer au calque simple' : 'Revenir au rendu composé'}
              </button>
            )}
          </div>

          {state === DETECTION_STATE.loading && (
            <p className={styles.stageNote}>
              Premier chargement : environ 6 Mo, une seule fois. Ensuite l’analyse est
              immédiate, même hors ligne.
            </p>
          )}

          {state === DETECTION_STATE.failed && (
            <p className={styles.warn}>
              L’analyse automatique n’a pas pu démarrer sur cet appareil{error ? ` (${error})` : ''}.
              Cale le tracé à la main — le résultat est le même.
            </p>
          )}

          {tuning && (
            <div className={styles.tuningPanel}>
              {/* En rendu composé, position et taille sont déduites du visage : les
                  proposer laisserait croire qu'elles agissent. Seule l'opacité reste. */}
              {(composed ? OVERLAY_SLIDERS.filter(([, key]) => key === 'opacity') : OVERLAY_SLIDERS).map(([label, key, min, max]) => (
                <label key={key} className={styles.field}>
                  <span className={styles.label}>
                    {label} <strong>{overlay[key]} %</strong>
                  </span>
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
              {!composed && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setOverlay((o) => normalizeOverlay({ ...OVERLAY_DEFAULT, wipe: o.wipe }))}
                >
                  Recentrer
                </button>
              )}
            </div>
          )}

          <p className={styles.stageNote}>
            {composed
              ? 'Les sourcils naturels sont effacés et remplacés, chacun à l’inclinaison de son arcade. Sur une photo à contre-jour ou de trois quarts, la zone retouchée peut se voir : passe au calque simple si le rendu ne te convainc pas.'
              : 'La photo ne quitte jamais l’appareil : l’analyse se fait entièrement dans le navigateur.'}
          </p>
        </>
      ) : (
        <div className={styles.canvasFrame}>
          <BrowCanvas look={look} selectedZone={zone} onSelectZone={onSelectZone} />
        </div>
      )}

      <div className={styles.chipRow} role="group" aria-label="Effet">
        {BROW_EFFECTS.map((effect) => (
          <button
            key={effect.id}
            type="button"
            aria-pressed={look.effectId === effect.id}
            className={`${styles.chip2} ${look.effectId === effect.id ? styles.chip2Active : ''}`}
            onClick={() => onChange({ effectId: effect.id })}
            title={effect.hint}
          >
            {effect.label}
          </button>
        ))}
      </div>

      <div className={styles.chipRow} role="group" aria-label="Zone à retoucher">
        {BROW_ZONES.map((z) => (
          <button
            key={z.id}
            type="button"
            aria-pressed={zone === z.id}
            className={`${styles.chip2} ${zone === z.id ? styles.chip2Active : ''}`}
            onClick={() => onSelectZone(zone === z.id ? null : z.id)}
            title={z.hint}
          >
            {z.label}
          </button>
        ))}
      </div>

      <p className={styles.stageCaption}>{lookSummary(look)}</p>
    </div>
  );
}
