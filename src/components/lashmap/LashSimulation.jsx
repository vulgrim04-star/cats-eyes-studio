import { useCallback, useRef, useState } from 'react';
import Icon from '../common/Icon';
import LashMapCanvas from './LashMapCanvas';
import LashComposite from './LashComposite';
import { useToast } from '../../hooks/useToast';
import { DETECTION_STATE, useFaceLandmarker } from '../../hooks/useFaceLandmarker';
import { hasEyeCorners } from '../../utils/faceLandmarks';
import { resolvePhotoSrc } from '../../utils/photoStorage';
import { VIEWBOX } from '../../utils/lashGeometry';
import {
  OVERLAY_DEFAULT,
  isEmbeddable,
  normalizeOverlay,
  overlayStyle,
  wipeClip,
  wipeFromPointer,
} from '../../utils/lashOverlay';
import styles from './styles/LashSimulation.module.css';

const RATIO = VIEWBOX.height / VIEWBOX.width;
/** Au-delà, un téléphone récent produit des fichiers que la fiche ne doit pas porter. */
const MAX_MO = 8;

/** Simulation avant / après sur la photo de la cliente.
 *
 *  CE QU'ELLE EST : le tracé de la pose, celui-là même qui sera posé, superposé à la photo
 *  et ajustable à l'œil, avec un volet qu'on fait glisser. De quoi montrer à la cliente ce
 *  qu'on lui propose, avant de commencer.
 *
 *  CE QU'ELLE N'EST PAS : un rendu photoréaliste. Fabriquer une image de synthèse
 *  demanderait un modèle génératif, que cette application — hors-ligne, sans serveur — n'a
 *  pas. Un aperçu honnête vaut mieux qu'une promesse qu'on ne tient pas devant la cliente.
 */
export default function LashSimulation({ client, map, side, layers }) {
  const { showToast } = useToast();
  const { state, error, detect } = useFaceLandmarker();
  const [photo, setPhoto] = useState(null);
  const [overlay, setOverlay] = useState(OVERLAY_DEFAULT);
  // Repères gardés après l'analyse : ce sont eux qui posent la frange sur CHAQUE œil, à sa
  // largeur et à son inclinaison, au lieu d'un seul calque à plat au milieu de la photo.
  const [points, setPoints] = useState(null);
  const [manual, setManual] = useState(false);
  const frameRef = useRef(null);
  const imgRef = useRef(null);
  const fileRef = useRef(null);

  const update = (patch) => setOverlay((o) => normalizeOverlay({ ...o, ...patch }));

  /** Photos déjà présentes sur la fiche : le plus souvent, la bonne est déjà là. */
  const stored = (client?.photos ?? []).flatMap((session) =>
    [
      { key: `${session.id}-b`, label: `${session.label || 'Séance'} — avant`, path: session.beforePath, legacyUrl: session.beforeUrl },
      { key: `${session.id}-a`, label: `${session.label || 'Séance'} — après`, path: session.afterPath, legacyUrl: session.afterUrl },
    ].filter((p) => p.path || p.legacyUrl)
  );

  const pickStored = async (entry) => {
    const src = await resolvePhotoSrc({ path: entry.path, legacyUrl: entry.legacyUrl });
    if (!src) {
      showToast('Photo illisible', 'error');
      return;
    }
    setPhoto({ src, name: entry.label });
  };

  const importFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_MO * 1024 * 1024) {
      showToast(`Photo trop lourde (max ${MAX_MO} Mo)`, 'warning');
      return;
    }
    const reader = new FileReader();
    // Lue en data URL et JAMAIS en URL d'objet : c'est la seule forme qui survive à une
    // sérialisation du schéma, et la seule qui ne se périme pas au rechargement.
    reader.onload = () => {
      setPhoto({ src: String(reader.result), name: file.name });
      setPoints(null);
      setManual(false);
    };
    reader.onerror = () => showToast('Lecture de la photo impossible', 'error');
    reader.readAsDataURL(file);
  };

  const moveWipe = useCallback((clientX) => {
    const rect = frameRef.current?.getBoundingClientRect();
    setOverlay((o) => normalizeOverlay({ ...o, wipe: wipeFromPointer(clientX, rect) }));
  }, []);

  /** Repère les deux yeux pour poser la frange sur chacun d'eux. */
  const analyse = async () => {
    const image = imgRef.current;
    if (!image?.complete) {
      showToast('Photo pas encore chargée', 'warning');
      return;
    }
    const found = await detect(image);
    if (!found || !hasEyeCorners(found)) {
      showToast('Aucun visage détecté — cale le tracé à la main', 'warning');
      setManual(true);
      return;
    }
    setPoints(found);
    setManual(false);
    showToast('Yeux repérés — frange posée sur chacun', 'success');
  };

  /** Glissé du volet.
   *
   *  Les écouteurs sont posés SUR LA FENÊTRE et DANS le gestionnaire d'appui, pas dans un
   *  effet ni sur le cadre lui-même. Les deux autres approches ont été essayées et
   *  échouent, chacune pour sa raison :
   *
   *  - dans un effet, ils ne s'attachent qu'au rendu suivant, et un glissé rapide perd ses
   *    premiers déplacements ;
   *  - sur le cadre avec `setPointerCapture`, le cadre cesse de recevoir les événements dès
   *    que le tracé se redessine au-dessus (mesuré : deux `pointermove` sur huit, et aucun
   *    `pointerup`).
   *
   *  Posés sur la fenêtre, ils suivent le doigt partout et jusqu'au relâchement, y compris
   *  hors de la photo — ce qu'on attend d'une poignée. */
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

  // La séance ne porte pas sur les cils : ce calque-ci n'a rien à montrer, et le dire vaut
  // mieux que poser un tracé de pose sur la photo d'une cliente venue pour ses sourcils.
  if (layers && !layers.lash) {
    return (
      <div className={styles.empty}>
        <Icon name="sparkles" size={26} />
        <h3>Séance sourcils</h3>
        <p>
          Cette séance ne concerne que les sourcils : la simulation se trouve dans l’onglet
          <strong> Brow Lift</strong>, où elle suit les réglages en cours. Choisis
          « Les deux » plus haut si tu poses aussi des cils aujourd’hui.
        </p>
      </div>
    );
  }

  if (!photo) {
    return (
      <div className={styles.empty}>
        <Icon name="camera" size={26} />
        <h3>Simulation avant / après</h3>
        <p>
          Pose le tracé de la lash map sur une photo de la cliente pour lui montrer le rendu
          proposé avant de commencer.
        </p>
        <div className={styles.emptyActions}>
          <button type="button" className="btn btn-primary" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={15} /> Importer une photo
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={importFile} />
        </div>
        {stored.length > 0 && (
          <div className={styles.storedList}>
            <span className={styles.storedTitle}>Ou depuis sa fiche :</span>
            {stored.map((entry) => (
              <button key={entry.key} type="button" className="btn btn-ghost btn-sm" onClick={() => pickStored(entry)}>
                {entry.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const embeddable = isEmbeddable(photo.src);
  // Composition possible ET souhaitée : sinon on retombe sur le calque à plat, celui-là
  // même qu'on avait avant, avec ses curseurs.
  const composed = !manual && points !== null && hasEyeCorners(points);
  const busy = state === DETECTION_STATE.loading || state === DETECTION_STATE.running;

  return (
    <div className={styles.wrap}>
      <div className={styles.stage}>
        <div
          className={styles.frame}
          ref={frameRef}
          onPointerDown={startDrag}
        >
          {/* `draggable={false}` n'est pas cosmétique : sans lui, appuyer puis glisser sur
              la photo déclenche le glisser-déposer natif de l'image, et le navigateur cesse
              alors d'émettre `pointermove`. Mesuré : deux événements sur huit, puis plus
              rien — la poignée se figeait après le premier millimètre. */}
          <img
            ref={imgRef}
            className={styles.photo}
            src={photo.src}
            alt={`Photo de ${client?.firstName ?? 'la cliente'}`}
            draggable={false}
          />

          <div className={styles.after} style={{ clipPath: wipeClip(overlay) }}>
            {composed ? (
              <LashComposite
                photoSrc={photo.src}
                points={points}
                map={map}
                opacity={overlay.opacity / 100}
              />
            ) : (
              <div style={overlayStyle(overlay, RATIO)} className={styles.tracing}>
                <LashMapCanvas map={map} side={side} readOnly bare />
              </div>
            )}
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
        <p className={styles.photoName}>
          <Icon name="camera" size={13} /> {photo.name}
        </p>

        <button type="button" className="btn btn-primary btn-sm" onClick={analyse} disabled={busy}>
          <Icon name="sparkles" size={14} />
          {state === DETECTION_STATE.loading ? 'Chargement du modèle…' : busy ? 'Analyse…' : 'Repérer les yeux'}
        </button>

        {points && hasEyeCorners(points) && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            aria-pressed={!composed}
            onClick={() => setManual((m) => !m)}
          >
            {composed ? 'Passer au calque simple' : 'Revenir au rendu posé'}
          </button>
        )}

        {state === DETECTION_STATE.loading && (
          <p className={styles.storedTitle}>
            Premier chargement : environ 6 Mo, une seule fois. Ensuite c’est immédiat, même
            hors ligne.
          </p>
        )}

        {state === DETECTION_STATE.failed && (
          <p className={styles.warn}>
            L’analyse automatique n’a pas pu démarrer sur cet appareil{error ? ` (${error})` : ''}.
            Cale le tracé à la main — le résultat est le même.
          </p>
        )}

        {!embeddable && (
          <p className={styles.warn}>
            Cette photo est chargée depuis une adresse distante : elle s’affiche ici, mais ne
            sera pas incluse dans les exports.
          </p>
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
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setPhoto(null); setOverlay(OVERLAY_DEFAULT); }}>
            Changer de photo
          </button>
        </div>
      </div>
    </div>
  );
}
