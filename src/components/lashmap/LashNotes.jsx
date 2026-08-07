import { useId } from 'react';
import Icon from '../common/Icon';
import LashAdvice from './LashAdvice';
import { EYE_SHAPES, POSE_TYPES, SET_SHAPES } from '../../utils/lashPresets';
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

/** Ce qui accompagne le schéma, en deux blocs séparés.
 *
 *  SÉPARÉS parce qu'ils ne se remplissent pas au même moment : la séance se décide avant de
 *  commencer, les observations s'écrivent pendant ou après. Ils vivaient jusqu'ici dans deux
 *  panneaux dépliants au bas d'une page très longue ; ce sont maintenant deux cartes du
 *  bandeau, et ils n'ont donc plus à porter leur propre cadre ni leur propre titre —
 *  `StudioCard` s'en charge, comme pour le Brow Lift.
 */

export function LashSessionFields({ editor }) {
  const id = useId();
  const { map } = editor;

  return (
    <>
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

      {/* Placé sous les deux champs de forme : le conseil découle de ce qu'on vient d'y
          saisir, et se lit dans la foulée. */}
      <LashAdvice editor={editor} />
    </>
  );
}

export function LashObservations({ editor }) {
  const id = useId();
  const { map } = editor;

  return (
    <>
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
    </>
  );
}
