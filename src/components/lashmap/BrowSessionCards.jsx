import Icon from '../common/Icon';
import BrowCard from './BrowCard';
import { BROW_SERVICES } from '../../utils/browModel';
import { todayISO } from '../../utils/date';
import styles from './styles/BrowStudio.module.css';

/** Les trois cartes qui décrivent la SÉANCE plutôt que le rendu.
 *
 *  Séparées des réglages de forme et de couleur parce qu'elles ne se remplissent pas au
 *  même moment : la forme se choisit avec la cliente avant de commencer, les produits et
 *  les notes s'écrivent pendant ou après la pose.
 */

export function BrowProductsCard({ session, onChange, embedded = false }) {
  return (
    <BrowCard title="Produits utilisés" icon="package" embedded={embedded}>
      <label className={styles.field}>
        <span className={styles.srOnly}>Produits utilisés</span>
        <input
          className="input-field"
          value={session.products}
          placeholder="Teinture, oxydant, colle de lift…"
          onChange={(e) => onChange({ products: e.target.value })}
        />
      </label>
    </BrowCard>
  );
}

export function BrowNotesCard({ session, onChange, embedded = false }) {
  return (
    <BrowCard title="Notes" icon="edit" embedded={embedded}>
      <label className={styles.field}>
        <span className={styles.srOnly}>Notes de séance</span>
        <textarea
          className="input-field"
          rows={4}
          value={session.notes}
          placeholder="Réaction, rendu obtenu, à ajuster la prochaine fois…"
          onChange={(e) => onChange({ notes: e.target.value })}
        />
      </label>
    </BrowCard>
  );
}

/** Détails de la prestation, et l'enregistrement.
 *
 *  Le bouton d'enregistrement vit ICI, avec la date et la prestation, parce que c'est le
 *  dernier geste : on ne l'atteint qu'après avoir dit de quelle séance il s'agit.
 */
export function BrowDetailsCard({ session, onChange, onChangeService, onSave, editing, onNew, embedded = false }) {
  return (
    <BrowCard title="Détails prestation" icon="clipboard" embedded={embedded}>
      <div className={styles.row2}>
        <label className={styles.field}>
          <span className={styles.label}>Prestation</span>
          <select className="input-field" value={session.service} onChange={(e) => onChangeService(e.target.value)}>
            {BROW_SERVICES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.value}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Temps de pose (min)</span>
          <input
            type="number"
            min={0}
            className="input-field"
            value={session.processingMinutes}
            onChange={(e) => onChange({ processingMinutes: e.target.value })}
          />
        </label>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>Date</span>
        <input
          type="date"
          className="input-field"
          value={session.date || todayISO()}
          onChange={(e) => onChange({ date: e.target.value })}
        />
      </label>

      <div className={styles.actions}>
        <button type="button" className="btn btn-primary" onClick={onSave}>
          <Icon name="check" size={15} /> {editing ? 'Enregistrer les modifications' : 'Enregistrer la séance'}
        </button>
        {editing && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onNew}>
            Nouvelle séance
          </button>
        )}
      </div>
    </BrowCard>
  );
}
