import Icon from '../common/Icon';
import BrowCard from './BrowCard';
import BrowCanvas from './BrowCanvas';
import { adviceToLook } from '../../utils/browAdvisor';
import { useToast } from '../../hooks/useToast';
import styles from './styles/BrowStudio.module.css';

/** Vignette allégée — voir `BrowShapeCard`, même raison. */
const THUMB_HAIRS = 110;

/** Recommandations de l'assistant, après analyse du visage.
 *
 *  TROIS TUILES PLUTÔT QU'UN PARAGRAPHE : forme, couleur, intensité. C'est ainsi qu'on en
 *  parle à une cliente — « on vous fait cette forme-là, dans cette teinte-là, à cette
 *  intensité » — et chacune montre ce qu'elle annonce : la forme est dessinée, la teinte est
 *  à sa vraie valeur, l'intensité a sa jauge. Un texte seul obligerait à imaginer.
 *
 *  LE POURCENTAGE DE CONFIANCE est affiché tel qu'il est calculé, sans arrondi flatteur :
 *  une morphologie déduite de trois rapports de distances reste une estimation, et une
 *  praticienne qui voit « 58 % » saura qu'elle doit trancher elle-même. Un conseil qui
 *  s'annoncerait toujours certain finirait par ne plus être lu.
 *
 *  Rien n'est jamais appliqué d'office : c'est un bouton, et il ne touche ni aux effets ni
 *  aux retouches de zone déjà faites (voir `adviceToLook`).
 */
export default function BrowAdviceCard({ analysis, look, onApply, embedded = false }) {
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
          <div className={styles.adviceTiles}>
            <div className={styles.adviceTile}>
              <span className={styles.adviceTileLabel}>Forme idéale</span>
              <div className={styles.adviceThumb}>
                <BrowCanvas
                  look={{ ...(look ?? {}), shapeId: advice.shape.id }}
                  readOnly
                  hairCount={THUMB_HAIRS}
                />
              </div>
              <strong className={styles.adviceTileValue}>{advice.shape.label}</strong>
              <span className={styles.adviceTileHint}>{advice.shape.hint}</span>
            </div>

            <div className={styles.adviceTile}>
              <span className={styles.adviceTileLabel}>Couleur recommandée</span>
              {advice.tone ? (
                <>
                  <span
                    className={styles.adviceDot}
                    style={{ background: advice.tone.hex }}
                    aria-hidden="true"
                  />
                  <strong className={styles.adviceTileValue}>
                    n°{advice.tone.number} {advice.tone.label}
                  </strong>
                  <span className={styles.adviceTileHint}>{advice.toneWhy}</span>
                </>
              ) : (
                <span className={styles.adviceTileHint}>
                  Renseigne la couleur de cheveux sur la fiche pour obtenir une teinte.
                </span>
              )}
            </div>

            <div className={styles.adviceTile}>
              <span className={styles.adviceTileLabel}>Intensité recommandée</span>
              <div className={styles.intensityTrack} aria-hidden="true">
                <span className={styles.intensityFill} style={{ width: `${advice.intensity}%` }} />
              </div>
              <strong className={styles.adviceTileValue}>{advice.intensity} %</strong>
              <span className={styles.adviceTileHint}>
                {advice.intensity >= 75
                  ? 'Une teinte claire demande de la matière pour se voir.'
                  : 'Assez pour dessiner, pas au point de durcir le regard.'}
              </span>
            </div>
          </div>

          <p className={styles.adviceWhy}>{advice.why}</p>
          {advice.avoid && (
            <p className={styles.adviceWhy}>
              <strong>À éviter</strong> : {advice.avoid}
            </p>
          )}
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
