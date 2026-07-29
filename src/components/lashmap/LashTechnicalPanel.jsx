import { useId, useState } from 'react';
import Icon from '../common/Icon';
import { formatDateLong } from '../../utils/date';
import { parseMm } from '../../utils/lashCalculations';
import { BASE_TYPES, EYE_SHAPES, LENGTHS, SET_SHAPES, THICKNESSES } from '../../utils/lashPresets';
import styles from './styles/LashMap.module.css';

const NOTES_MAX = 500;

function isPreset(list, value) {
  return list.map(String).includes(String(value));
}

/** Groupe de valeurs proposées + saisie libre. Les fournisseurs ne vendent pas tous les
 *  mêmes calibres : « Autre » n'est pas un cas limite, c'est un usage courant. */
function PresetChips({ label, options, unit, value, onChange }) {
  const [custom, setCustom] = useState(() => value !== '' && !isPreset(options, value));

  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <div className={`${styles.chipRow} ${styles.chipRowScroll} scrollbar-hidden`}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={`${styles.chip} ${!custom && String(value) === String(option) ? styles.chipActive : ''}`}
            onClick={() => { setCustom(false); onChange(String(option)); }}
          >
            {option}{unit}
          </button>
        ))}
        <button
          type="button"
          className={`${styles.chip} ${custom ? styles.chipActive : ''}`}
          onClick={() => { setCustom(true); onChange(''); }}
        >
          Autre
        </button>
      </div>
      {custom && (
        <input
          className="input-field"
          style={{ marginTop: 8, maxWidth: 160 }}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={`ex. 13.5${unit}`}
          inputMode="decimal"
        />
      )}
    </div>
  );
}

function Section({ title, subtitle, defaultOpen = false, children }) {
  return (
    <details className={styles.section} open={defaultOpen}>
      <summary className={styles.sectionSummary}>
        <span>
          {title}
          {subtitle && <span className={styles.sectionSubtitle}>{subtitle}</span>}
        </span>
        <Icon name="chevron-down" size={16} className={styles.sectionChevron} />
      </summary>
      <div className={styles.sectionBody}>{children}</div>
    </details>
  );
}

/** Panneau technique déroulant : tout ce qui n'a pas besoin d'être visible pendant
 *  qu'on dessine la lash map, mais qui doit rester à un geste de distance. */
export default function LashTechnicalPanel({ form, suggestedRetouch, onField, onLayer }) {
  const id = useId();
  const layersTotal = ['top', 'mid', 'bottom']
    .map((key) => form.layers[key])
    .filter((value) => String(value).trim() !== '');
  const layersSum = layersTotal.reduce((sum, value) => sum + parseMm(value, 0), 0);

  return (
    <div className={styles.panel}>
      <Section title="Infos générales" defaultOpen>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor={`${id}-date`}>Date de la séance</label>
            <input
              id={`${id}-date`}
              type="date"
              className="input-field"
              value={form.date}
              onChange={(event) => onField('date', event.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor={`${id}-cycle`}>Cycle de retouche</label>
            <input
              id={`${id}-cycle`}
              className="input-field"
              value={form.fillCycle}
              onChange={(event) => onField('fillCycle', event.target.value)}
              placeholder="2-3 semaines"
            />
          </div>
        </div>

        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor={`${id}-eyeshape`}>Forme de l'œil</label>
            <input
              id={`${id}-eyeshape`}
              className="input-field"
              list={`${id}-eyeshapes`}
              value={form.eyeShape}
              onChange={(event) => onField('eyeShape', event.target.value)}
              placeholder="Amande, rond…"
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
              value={form.setShape}
              onChange={(event) => onField('setShape', event.target.value)}
              placeholder="Cat Eye, Doll Eye…"
            />
            <datalist id={`${id}-setshapes`}>
              {SET_SHAPES.map((shape) => <option key={shape} value={shape} />)}
            </datalist>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor={`${id}-health`}>Santé des cils naturels</label>
          <input
            id={`${id}-health`}
            className="input-field"
            value={form.lashHealth}
            onChange={(event) => onField('lashHealth', event.target.value)}
            placeholder="Fins mais résistants…"
          />
          <p className={styles.fieldHelp}>
            Sert d'alerte pendant la saisie : les zones trop longues pour ce type de cil sont signalées.
          </p>
        </div>

        <div className={styles.readonlyRow}>
          <span className={styles.fieldLabel}>Prochaine retouche suggérée</span>
          <strong>{suggestedRetouch ? formatDateLong(suggestedRetouch) : '—'}</strong>
        </div>
      </Section>

      <Section title="Produits & technique">
        <PresetChips
          label="Longueur globale"
          options={LENGTHS}
          unit="mm"
          value={form.length}
          onChange={(value) => onField('length', value)}
        />
        <PresetChips
          label="Épaisseur"
          options={THICKNESSES}
          unit="mm"
          value={form.thickness}
          onChange={(value) => onField('thickness', value)}
        />

        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor={`${id}-base`}>Type de base</label>
            <select
              id={`${id}-base`}
              className="input-field"
              value={form.baseType}
              onChange={(event) => onField('baseType', event.target.value)}
            >
              <option value="">—</option>
              {BASE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor={`${id}-adhesive`}>Colle utilisée</label>
            <input
              id={`${id}-adhesive`}
              className="input-field"
              value={form.adhesive}
              onChange={(event) => onField('adhesive', event.target.value)}
              placeholder="Sensitive 1-2 s"
            />
          </div>
        </div>

        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor={`${id}-inner`}>Coin interne (mm)</label>
            <input
              id={`${id}-inner`}
              className="input-field"
              inputMode="decimal"
              value={form.innerCornerLength}
              onChange={(event) => onField('innerCornerLength', event.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor={`${id}-outer`}>Coin externe (mm)</label>
            <input
              id={`${id}-outer`}
              className="input-field"
              inputMode="decimal"
              value={form.outerCornerLength}
              onChange={(event) => onField('outerCornerLength', event.target.value)}
            />
          </div>
        </div>
      </Section>

      <Section title="Répartition par couches" subtitle="optionnel">
        <div className={styles.grid3}>
          {[['top', 'Haut'], ['mid', 'Milieu'], ['bottom', 'Bas']].map(([key, label]) => (
            <div className={styles.field} key={key}>
              <label className={styles.fieldLabel} htmlFor={`${id}-layer-${key}`}>{label}</label>
              <input
                id={`${id}-layer-${key}`}
                className="input-field"
                inputMode="decimal"
                value={form.layers[key]}
                onChange={(event) => onLayer(key, event.target.value)}
              />
            </div>
          ))}
        </div>
        {layersTotal.length > 0 && (
          <p className={styles.fieldHelp}>Total saisi : {Math.round(layersSum * 10) / 10}</p>
        )}
        <p className={styles.fieldHelp}>
          Conseillé pour un volume max : 40 % haut, 50 % milieu, 10 % bas.
        </p>
      </Section>

      <Section title="Notes & observations">
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor={`${id}-notes`}>Notes</label>
          <textarea
            id={`${id}-notes`}
            className="input-field"
            rows={4}
            maxLength={NOTES_MAX}
            value={form.notes}
            onChange={(event) => onField('notes', event.target.value)}
            placeholder="Effet naturel demandé, densité légère sur les coins externes…"
          />
          <p className={styles.charCount}>{form.notes.length} / {NOTES_MAX}</p>
        </div>
      </Section>
    </div>
  );
}
