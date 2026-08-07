import BrowCard from './BrowCard';
import { BROW_TONES, toneById } from '../../utils/browShapes';
import styles from './styles/BrowStudio.module.css';

const COLOR_SLIDERS = [
  ['intensity', 'Intensité'],
  ['transparency', 'Transparence'],
  ['warmth', 'Chaleur'],
  ['saturation', 'Saturation'],
];

/** Nuancier et réglages de teinture.
 *
 *  Les douze pastilles portent leur vraie valeur hexadécimale : la pastille montre la
 *  couleur qui sortira du tube, pas une approximation décorative. Le numéro reste affiché
 *  parce que c'est lui qu'on lit sur le flacon.
 */
export default function BrowColorCard({ look, onChange, embedded = false }) {
  const tone = toneById(look.toneId);

  return (
    <BrowCard title="Couleur" icon="droplet" hint={`n°${tone.number} · ${tone.label}`} embedded={embedded}>
      <div className={styles.swatches} role="radiogroup" aria-label="Nuancier">
        {BROW_TONES.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={look.toneId === t.id}
            className={`${styles.swatch} ${look.toneId === t.id ? styles.swatchActive : ''}`}
            onClick={() => onChange({ toneId: t.id })}
            title={`n°${t.number} ${t.label}`}
          >
            <span className={styles.swatchChip} style={{ background: t.hex }} aria-hidden="true" />
            <span className={styles.swatchLabel}>
              n°{t.number}
              <br />
              {t.label}
            </span>
          </button>
        ))}
      </div>

      {COLOR_SLIDERS.map(([field, label]) => (
        <label key={field} className={styles.field}>
          <span className={styles.label}>
            {label} <strong>{look[field]} %</strong>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={look[field]}
            onChange={(e) => onChange({ [field]: e.target.value })}
            className={styles.slider}
          />
        </label>
      ))}
    </BrowCard>
  );
}
