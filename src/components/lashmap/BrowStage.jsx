import Icon from '../common/Icon';
import BrowCanvas from './BrowCanvas';
import { BROW_EFFECTS, BROW_ZONES, lookSummary } from '../../utils/browShapes';
import styles from './styles/BrowStudio.module.css';

/** La scène : le dessin des deux sourcils, et ce qui se règle en le regardant.
 *
 *  Les DEUX sourcils plutôt qu'un seul, parce que l'essentiel du métier est là : la
 *  symétrie. Un sourcil isolé se juge toujours réussi ; c'est la paire qui dit la vérité.
 *
 *  Sous le dessin, les puces d'effet et de zone — jamais dans un panneau à part. Un réglage
 *  dont on ne verrait pas l'effet au moment où on le touche ne servirait à rien, et c'est
 *  précisément ce que la version à onglets imposait.
 */
export default function BrowStage({ look, zone, onSelectZone, onChange }) {
  return (
    <div className={styles.stage}>
      <header className={styles.stageHead}>
        <h2 className={styles.stageTitle}>
          <Icon name="eye" size={15} /> Tracé
        </h2>
      </header>

      <div className={styles.canvasFrame}>
        <BrowCanvas look={look} selectedZone={zone} onSelectZone={onSelectZone} />
      </div>

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
