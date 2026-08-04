import { useMemo, useState } from 'react';
import Icon from '../common/Icon';
import { useClients } from '../../hooks/useClients';
import { useToast } from '../../hooks/useToast';
import {
  BROW_COLORS,
  BROW_SERVICES,
  BROW_SHAPES,
  browSummary,
  colorById,
  minutesForService,
  normalizeBrowSession,
  renderedColor,
} from '../../utils/browModel';
import { VIEWBOX, buildBrow } from '../../utils/lashGeometry';
import { formatDateLong } from '../../utils/date';
import styles from './styles/BrowStudio.module.css';

/** Aperçu du sourcil, teinté par les réglages en cours.
 *
 *  Le tracé vient de `buildBrow`, déjà employé par le schéma des cils : un seul dessin de
 *  sourcil dans toute l'application, et la teinte du jour lui est appliquée par-dessus.
 *  Le viewBox est recadré sur la seule zone du sourcil — le reste du cadre des cils serait
 *  du vide.
 */
function BrowPreview({ session }) {
  const hairs = useMemo(() => buildBrow(), []);
  const { hex, opacity } = renderedColor(session);
  return (
    <svg
      className={styles.preview}
      viewBox={`60 -30 ${VIEWBOX.width - 90} 170`}
      role="img"
      aria-label={`Aperçu du sourcil — ${browSummary(session)}`}
    >
      <g fill={hex} stroke="none" opacity={opacity}>
        {hairs.map((hair) => (
          <path key={hair.key} d={hair.d} />
        ))}
      </g>
    </svg>
  );
}

/** Brow Studio : la séance sourcils d'une cliente.
 *
 *  Même logique que le Lash Studio — on regarde le dessin, pas un formulaire — mais la
 *  matière est ici la COULEUR. D'où le nuancier en grand, avec la vraie teinte sur chaque
 *  pastille : une praticienne choisit à l'œil, et lit le numéro pour commander.
 */
export default function BrowStudio({ client }) {
  const { addBrowSession, updateBrowSession, removeBrowSession } = useClients();
  const { showToast } = useToast();

  const sessions = useMemo(
    () => [...(client?.browSessions ?? [])].sort((a, b) => String(b.date).localeCompare(String(a.date))),
    [client]
  );

  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(() => normalizeBrowSession(null));

  const update = (patch) => setDraft((d) => normalizeBrowSession({ ...d, ...patch }));

  /** Changer de prestation pré-remplit le temps de pose — le réglage qu'on oublie le plus
   *  souvent, et celui qui décide du résultat. On ne l'écrase que s'il n'a pas été touché
   *  à la main : sinon on effacerait un choix délibéré. */
  const changeService = (service) => {
    const suggested = minutesForService(service);
    const untouched = draft.processingMinutes === minutesForService(draft.service);
    update({ service, processingMinutes: untouched ? suggested : draft.processingMinutes });
  };

  const save = () => {
    if (editingId) {
      updateBrowSession(client.id, editingId, draft);
      showToast('Séance sourcils modifiée', 'success');
    } else {
      addBrowSession(client.id, draft);
      showToast('Séance sourcils enregistrée', 'success');
    }
    setEditingId(null);
    setDraft(normalizeBrowSession(null));
  };

  const edit = (session) => {
    setEditingId(session.id);
    setDraft(normalizeBrowSession(session));
  };

  const remove = (session) => {
    if (!window.confirm(`Supprimer la séance du ${formatDateLong(session.date)} ? Cette action est irréversible.`)) return;
    removeBrowSession(client.id, session.id);
    if (editingId === session.id) {
      setEditingId(null);
      setDraft(normalizeBrowSession(null));
    }
  };

  const selected = colorById(draft.colorId);

  return (
    <div className={styles.wrap}>
      <div className={styles.stage}>
        <BrowPreview session={draft} />
        <p className={styles.stageCaption}>
          {selected.label} · n°{selected.number} — intensité {draft.intensity} %, saturation {draft.saturation} %
        </p>
      </div>

      <div className={styles.panel}>
        <div className={styles.row2}>
          <label className={styles.field}>
            <span className={styles.label}>Prestation</span>
            <select className="input-field" value={draft.service} onChange={(e) => changeService(e.target.value)}>
              {BROW_SERVICES.map((s) => (
                <option key={s.value} value={s.value}>{s.value}</option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Forme</span>
            <select className="input-field" value={draft.shape} onChange={(e) => update({ shape: e.target.value })}>
              {BROW_SHAPES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>

        <span className={styles.label}>Couleur</span>
        <div className={styles.swatches} role="radiogroup" aria-label="Nuancier">
          {BROW_COLORS.map((color) => (
            <button
              key={color.id}
              type="button"
              role="radio"
              aria-checked={draft.colorId === color.id}
              className={`${styles.swatch} ${draft.colorId === color.id ? styles.swatchActive : ''}`}
              onClick={() => update({ colorId: color.id })}
              title={`n°${color.number} ${color.label}`}
            >
              <span className={styles.chip} style={{ background: color.hex }} aria-hidden="true" />
              <span className={styles.swatchLabel}>
                n°{color.number}
                <br />
                {color.label}
              </span>
            </button>
          ))}
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Intensité <strong>{draft.intensity} %</strong></span>
          <input
            type="range"
            min={0}
            max={100}
            value={draft.intensity}
            onChange={(e) => update({ intensity: e.target.value })}
            className={styles.slider}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Saturation <strong>{draft.saturation} %</strong></span>
          <input
            type="range"
            min={0}
            max={100}
            value={draft.saturation}
            onChange={(e) => update({ saturation: e.target.value })}
            className={styles.slider}
          />
        </label>

        <div className={styles.row2}>
          <label className={styles.field}>
            <span className={styles.label}>Temps de pose (min)</span>
            <input
              type="number"
              min={0}
              className="input-field"
              value={draft.processingMinutes}
              onChange={(e) => update({ processingMinutes: e.target.value })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Date</span>
            <input
              type="date"
              className="input-field"
              value={draft.date}
              onChange={(e) => update({ date: e.target.value })}
            />
          </label>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Produits utilisés</span>
          <input
            className="input-field"
            value={draft.products}
            placeholder="Teinture, oxydant, colle de lift…"
            onChange={(e) => update({ products: e.target.value })}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Notes</span>
          <textarea
            className="input-field"
            rows={2}
            value={draft.notes}
            placeholder="Réaction, rendu obtenu, à ajuster la prochaine fois…"
            onChange={(e) => update({ notes: e.target.value })}
          />
        </label>

        <div className={styles.actions}>
          <button type="button" className="btn btn-primary" onClick={save}>
            <Icon name="check" size={15} /> {editingId ? 'Enregistrer les modifications' : 'Enregistrer la séance'}
          </button>
          {editingId && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => { setEditingId(null); setDraft(normalizeBrowSession(null)); }}
            >
              Annuler
            </button>
          )}
        </div>
      </div>

      <div className={styles.history}>
        <h3 className={styles.historyTitle}>Séances précédentes</h3>
        {sessions.length === 0 ? (
          <p className={styles.empty}>Aucune séance sourcils enregistrée pour cette cliente.</p>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className={styles.historyRow}>
              <span className={styles.historyChip} style={{ background: colorById(session.colorId).hex }} aria-hidden="true" />
              <div className={styles.historyMain}>
                <strong>{formatDateLong(session.date)}</strong>
                <span>{browSummary(session)}</span>
              </div>
              <button type="button" className={styles.iconBtn} onClick={() => edit(session)} aria-label={`Modifier la séance du ${formatDateLong(session.date)}`}>
                <Icon name="edit" size={14} />
              </button>
              <button type="button" className={styles.iconBtn} onClick={() => remove(session)} aria-label={`Supprimer la séance du ${formatDateLong(session.date)}`}>
                <Icon name="trash" size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
