import Icon from '../common/Icon';
import BrowCard from './BrowCard';
import { adviceToLook } from '../../utils/browAdvisor';
import { useToast } from '../../hooks/useToast';
import styles from './styles/BrowStudio.module.css';

/** Recommandations de l'assistant, après analyse du visage.
 *
 *  Le POURCENTAGE DE CONFIANCE est affiché tel qu'il est calculé, sans arrondi flatteur :
 *  une morphologie déduite de trois rapports de distances reste une estimation, et une
 *  praticienne qui voit « 58 % » saura qu'elle doit trancher elle-même. Un conseil qui
 *  s'annoncerait toujours certain finirait par ne plus être lu du tout.
 *
 *  Rien n'est jamais appliqué d'office : c'est un bouton, et il ne touche ni aux effets ni
 *  aux retouches de zone déjà faites (voir `adviceToLook`).
 */
export default function BrowAdviceCard({ analysis, onApply, embedded = false }) {
  const { showToast } = useToast();

  if (!analysis?.face) {
    return (
      <BrowCard title="Recommandations IA" icon="sparkles" embedded={embedded}>
        <p className={styles.cardEmpty}>
          Importe une photo dans la simulation, puis lance l’analyse : la morphologie du
          visage donnera la forme et la teinte à privilégier.
        </p>
      </BrowCard>
    );
  }

  const { face, advice } = analysis;
  const percent = Math.round((face.confidence ?? 0) * 100);

  return (
    <BrowCard title="Recommandations IA" icon="sparkles" embedded={embedded}>
      <div className={styles.adviceHead}>
        <span className={styles.adviceFace}>Visage {face.label.toLowerCase()}</span>
        <span className={styles.adviceConfidence}>{percent} % de confiance</span>
      </div>
      <div
        className={styles.confidenceTrack}
        role="img"
        aria-label={`Niveau de confiance de l’analyse : ${percent} %`}
      >
        <span className={styles.confidenceFill} style={{ width: `${percent}%` }} />
      </div>

      {advice ? (
        <>
          <p className={styles.adviceSentence}>{advice.sentence}</p>
          <p className={styles.adviceWhy}>{advice.why}</p>
          {advice.avoid && (
            <p className={styles.adviceWhy}>
              <strong>À éviter</strong> : {advice.avoid}
            </p>
          )}
          {advice.toneWhy && <p className={styles.adviceWhy}>{advice.toneWhy}</p>}
          {advice.symmetryNote && <p className={styles.adviceWhy}>{advice.symmetryNote}</p>}

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              onApply?.(adviceToLook(advice));
              showToast(`${advice.shape.label} appliqué`, 'success');
            }}
          >
            <Icon name="check" size={13} /> Appliquer ce conseil
          </button>
        </>
      ) : (
        <p className={styles.cardEmpty}>Morphologie estimée, mais aucune règle ne s’y applique.</p>
      )}

      <p className={styles.adviceFoot}>
        Tu vois le visage, l’outil ne voit que des coordonnées : corrige-le sans hésiter.
      </p>
    </BrowCard>
  );
}
