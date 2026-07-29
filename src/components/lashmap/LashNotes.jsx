import { useId } from 'react';
import Icon from '../common/Icon';
import { EYE_SHAPES, POSE_TYPES, SET_SHAPES } from '../../utils/lashPresets';
import { formatDateLong } from '../../utils/date';
import styles from './styles/LashMap.module.css';

const NOTES_MAX = 500;

const TEXT_FIELDS = [
  { field: 'products', label: 'Produits utilisés', placeholder: 'Bouquets 0.05 · plateau C…' },
  { field: 'adhesive', label: 'Colle utilisée', placeholder: 'Sensitive 1-2 s' },
  { field: 'poseDuration', label: 'Temps de pose', placeholder: '2 h 15' },
  { field: 'fillDuration', label: 'Temps de remplissage', placeholder: '1 h 30' },
  { field: 'sensitivities', label: 'Sensibilités / allergies', placeholder: 'Larmoiement en fin de pose…' },
  { field: 'lashHealth', label: 'Santé des cils naturels', placeholder: 'Fins mais résistants' },
];

/** Tout ce qui accompagne le schéma : contexte de la séance, produits, observations.
 *  Replié par défaut — pendant la pose, c'est le schéma qui compte. */
export default function LashNotes({ editor, suggestedRetouch }) {
  const id = useId();
  const { map } = editor;

  return (
    <>
      <details className={styles.section}>
        <summary className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Séance</h2>
          <span className={styles.sectionMeta}>
            {formatDateLong(map.date)} · {map.poseType}
            {suggestedRetouch ? ` · retouche suggérée le ${formatDateLong(suggestedRetouch)}` : ''}
          </span>
        </summary>

        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor={`${id}-date`}>Date</label>
            <input
              id={`${id}-date`}
              type="date"
              className="input-field"
              value={map.date}
              onChange={(event) => editor.setField('date', event.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor={`${id}-pose`}>Type de séance</label>
            <select
              id={`${id}-pose`}
              className="input-field"
              value={map.poseType}
              onChange={(event) => editor.setField('poseType', event.target.value)}
            >
              {POSE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.value}</option>
              ))}
              {!POSE_TYPES.some((t) => t.value === map.poseType) && (
                <option value={map.poseType}>{map.poseType}</option>
              )}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor={`${id}-cycle`}>Cycle de retouche</label>
            <input
              id={`${id}-cycle`}
              className="input-field"
              value={map.fillCycle}
              placeholder="2-3 semaines"
              onChange={(event) => editor.setField('fillCycle', event.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor={`${id}-eyeshape`}>Forme de l’œil</label>
            <input
              id={`${id}-eyeshape`}
              className="input-field"
              list={`${id}-eyeshapes`}
              value={map.eyeShape}
              placeholder="Amande, rond…"
              onChange={(event) => editor.setField('eyeShape', event.target.value)}
            />
            <datalist id={`${id}-eyeshapes`}>
              {EYE_SHAPES.map((shape) => <option key={shape} value={shape} />)}
            </datalist>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor={`${id}-setshape`}>Forme de la pose</label>
            <input
              id={`${id}-setshape`}
              className="input-field"
              list={`${id}-setshapes`}
              value={map.setShape}
              placeholder="Cat Eye, Doll Eye…"
              onChange={(event) => editor.setField('setShape', event.target.value)}
            />
            <datalist id={`${id}-setshapes`}>
              {SET_SHAPES.map((shape) => <option key={shape} value={shape} />)}
            </datalist>
          </div>
        </div>
      </details>

      <details className={styles.section}>
        <summary className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Notes & observations</h2>
          <span className={styles.sectionMeta}>{map.notes ? `${map.notes.slice(0, 60)}…` : 'Aucune note'}</span>
        </summary>

        <div className={styles.grid2}>
          {TEXT_FIELDS.map(({ field, label, placeholder }) => (
            <div className={styles.field} key={field}>
              <label className={styles.fieldLabel} htmlFor={`${id}-${field}`}>{label}</label>
              <input
                id={`${id}-${field}`}
                className="input-field"
                value={map[field] ?? ''}
                placeholder={placeholder}
                onChange={(event) => editor.setField(field, event.target.value)}
              />
            </div>
          ))}
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor={`${id}-advice`}>
            <Icon name="sparkles" size={12} /> Conseils donnés à la cliente
          </label>
          <input
            id={`${id}-advice`}
            className="input-field"
            value={map.advice ?? ''}
            placeholder="Brosser matin et soir, éviter les soins gras…"
            onChange={(event) => editor.setField('advice', event.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor={`${id}-notes`}>Observations</label>
          <textarea
            id={`${id}-notes`}
            className="input-field"
            rows={4}
            maxLength={NOTES_MAX}
            value={map.notes}
            placeholder="Belle repousse, cils naturels en excellente santé…"
            onChange={(event) => editor.setField('notes', event.target.value)}
          />
          <p className={styles.charCount}>{(map.notes ?? '').length} / {NOTES_MAX}</p>
        </div>
      </details>
    </>
  );
}
