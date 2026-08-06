import Icon from '../common/Icon';
import BrowCard from './BrowCard';
import { BROW_ZONES, isCustomized, resetShape } from '../../utils/browShapes';
import styles from './styles/BrowStudio.module.css';

/** Réglages de forme, dans l'ordre où on les touche en cabine. */
const SHAPE_SLIDERS = [
  ['archHeight', "Hauteur d'arche"],
  ['length', 'Longueur'],
  ['thickness', 'Épaisseur'],
  ['angle', 'Angle'],
  ['symmetry', 'Symétrie'],
  ['density', 'Densité'],
];

const ZONE_SLIDERS = [
  ['lift', 'Hauteur'],
  ['weight', 'Épaisseur'],
];

/** Les six curseurs de forme, plus la retouche de la zone sélectionnée.
 *
 *  La retouche s'affiche EN TÊTE quand une zone est retenue : c'est le réglage qu'on vient
 *  de demander en touchant la pastille sur le dessin, il ne doit pas être à chercher sous
 *  six curseurs.
 */
export default function BrowShapeSliders({ look, zone, onChange, onZoneChange, onCloseZone, onReset, embedded = false }) {
  const zoneLabel = BROW_ZONES.find((z) => z.id === zone);

  return (
    <BrowCard
      title="Réglages de la forme"
      icon="settings"
      embedded={embedded}
      action={
        isCustomized(look) ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onReset(resetShape(look))}>
            <Icon name="arrow-left" size={13} /> Modèle
          </button>
        ) : null
      }
    >
      {zoneLabel && (
        <div className={styles.zonePanel}>
          <span className={styles.label}>
            Retouche · {zoneLabel.label}
            <button type="button" className="btn btn-ghost btn-sm" onClick={onCloseZone}>
              Fermer
            </button>
          </span>
          <p className={styles.zoneHint}>{zoneLabel.hint}</p>
          {ZONE_SLIDERS.map(([field, label]) => (
            <label key={field} className={styles.field}>
              <span className={styles.label}>
                {label}{' '}
                <strong>
                  {look.zones[zone][field] > 0 ? '+' : ''}
                  {look.zones[zone][field]}
                </strong>
              </span>
              <input
                type="range"
                min={-50}
                max={50}
                value={look.zones[zone][field]}
                onChange={(e) => onZoneChange(field, e.target.value)}
                className={styles.slider}
              />
            </label>
          ))}
        </div>
      )}

      {SHAPE_SLIDERS.map(([field, label]) => (
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
