import Icon from '../common/Icon';
import {
  COLORS,
  CURLS,
  DENSITIES,
  DIAMETERS,
  OVERRIDABLE,
  TECHNIQUES,
  effectiveZone,
  sectorLabel,
} from '../../utils/lashModel';
import { formatMm } from '../../utils/lashCalculations';
import { suggestSetShape } from '../../utils/lashPresets';
import styles from './styles/LashMap.module.css';

const FIELDS = [
  { field: 'style', label: 'Technique', options: TECHNIQUES },
  { field: 'curl', label: 'Courbure', options: CURLS },
  { field: 'diameter', label: 'Épaisseur', options: DIAMETERS, unit: ' mm' },
  { field: 'density', label: 'Densité', options: DENSITIES },
  { field: 'color', label: 'Couleur', options: COLORS },
];

function Select({ id, label, value, options, unit = '', onChange, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={id}>
        {label}
        {children}
      </label>
      <select id={id} className="input-field" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>{option}{unit}</option>
        ))}
      </select>
    </div>
  );
}

/** Panneau de propriétés : les réglages de l'œil, puis ceux du secteur sélectionné.
 *
 * La règle de surcharge est rendue visible plutôt que devinée : un secteur qui dévie du
 * réglage de l'œil l'affiche, et un lien ramène à l'héritage en un clic.
 */
export default function LashProperties({ editor, eye, lengthLabel, embedded = false }) {
  const { selected, side } = editor;
  const zone = selected === null ? null : effectiveZone(eye, selected);
  const suggestion = suggestSetShape(eye.global.curl, eye.global.style);

  // Sans son propre cadre ni son propre titre : elle vit dans une `StudioCard`, qui les
  // porte déjà. Les garder afficherait « Réglages de l'œil » deux fois de suite.
  const eyeCard = (
    <section className={styles.panelGroup}>
      {FIELDS.map(({ field, label, options, unit }) => (
        <Select
          key={field}
          id={`global-${side}-${field}`}
          label={label}
          value={eye.global[field]}
          options={options}
          unit={unit ?? ''}
          onChange={(value) => editor.setGlobal(field, value)}
        />
      ))}
      {suggestion && (
        <p className={styles.panelHint}>
          <Icon name="info" size={12} /> {suggestion}
        </p>
      )}
    </section>
  );

  return (
    <div className={styles.panel}>
      {!embedded && (
        <section className={styles.panelCard}>
          <h3 className={styles.panelTitle}>Informations</h3>
          <div className={styles.panelRow}>
            <span className={styles.panelRowLabel}>Longueurs</span>
            <span className={styles.panelRowValue}>{lengthLabel}</span>
          </div>
          <div className={styles.panelRow}>
            <span className={styles.panelRowLabel}>Secteurs</span>
            <span className={styles.panelRowValue}>{eye.zones.length}</span>
          </div>
          <div className={styles.panelRow}>
            <span className={styles.panelRowLabel}>Personnalisations</span>
            <span className={styles.panelRowValue}>
              {eye.zones.filter((z) => OVERRIDABLE.some((f) => z[f] !== null)).length || '—'}
            </span>
          </div>
        </section>
      )}

      {/* En feuille glissante, le secteur sélectionné passe devant : c'est lui qu'on
          vient de toucher, et la feuille s'ouvre déjà à son nom. */}
      {!embedded && eyeCard}

      {zone && (
        <section className={styles.panelCard}>
          <h3 className={styles.panelTitle}>
            {sectorLabel(selected, eye.zones.length)} · secteur {selected + 1}
          </h3>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Longueur</span>
            <div className={styles.panelRow} style={{ paddingTop: 0 }}>
              <div className={styles.stepper}>
                <button
                  type="button"
                  className={styles.stepperBtn}
                  onClick={() => editor.setLength(selected, zone.length - 0.5)}
                  aria-label="Raccourcir d’un demi-millimètre"
                >
                  −
                </button>
                <span className={styles.stepperCount}>{formatMm(zone.length)} mm</span>
                <button
                  type="button"
                  className={styles.stepperBtn}
                  onClick={() => editor.setLength(selected, zone.length + 0.5)}
                  aria-label="Allonger d’un demi-millimètre"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {FIELDS.map(({ field, label, options, unit }) => {
            const overridden = zone.overrides.includes(field);
            return (
              <Select
                key={field}
                id={`zone-${side}-${selected}-${field}`}
                label={label}
                value={zone[field]}
                options={options}
                unit={unit ?? ''}
                onChange={(value) => editor.setZoneProperty(selected, field, value)}
              >
                {overridden && (
                  <>
                    {' '}
                    <span className={styles.overrideBadge}>personnalisé</span>{' '}
                    <button
                      type="button"
                      className={styles.resetLink}
                      onClick={() => editor.setZoneProperty(selected, field, null)}
                    >
                      hériter
                    </button>
                  </>
                )}
              </Select>
            );
          })}

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor={`zone-note-${side}-${selected}`}>Note du secteur</label>
            <input
              id={`zone-note-${side}-${selected}`}
              className="input-field"
              value={zone.notes}
              maxLength={120}
              placeholder="Cil naturel fragile ici…"
              onChange={(event) => editor.setZoneProperty(selected, 'notes', event.target.value)}
            />
          </div>
        </section>
      )}

      {embedded && eyeCard}

      {!zone && (
        <p className={styles.panelHint}>
          Touchez un secteur du schéma pour régler sa longueur et, si besoin, dévier des
          réglages de l’œil.
        </p>
      )}
    </div>
  );
}
