import Icon from '../common/Icon';
import { useToast } from '../../hooks/useToast';
import { adviseForEyeShape, isRiskyChoice } from '../../utils/lashAdvisor';
import styles from './styles/LashMap.module.css';

/** Le conseil de pose, à partir de la forme de l'œil.
 *
 *  Ne s'affiche que lorsqu'une forme reconnue est renseignée : un encart de conseil
 *  permanent devient un décor qu'on cesse de lire. La mise en garde, elle, n'apparaît que
 *  si le modèle actuellement posé est justement celui qu'il vaudrait mieux éviter.
 *
 *  Rien n'est appliqué d'office — la praticienne garde la main, et le « pourquoi » lui
 *  permet de l'expliquer à sa cliente, ou de choisir autrement en connaissance de cause.
 */
export default function LashAdvice({ editor }) {
  const { showToast } = useToast();
  const { map } = editor;
  const advice = adviseForEyeShape(map.eyeShape);
  if (!advice) return null;

  const risky = isRiskyChoice(map.eyeShape, map.templateId);
  const alreadyApplied = map.templateId === advice.template.id;

  const apply = () => {
    editor.applyTemplate(advice.template, { bothEyes: true });
    showToast(`Modèle « ${advice.template.label} » appliqué`, 'success');
  };

  return (
    <div className={styles.advice}>
      <div className={styles.adviceHead}>
        <Icon name="sparkles" size={15} />
        <strong>Œil {advice.label.toLowerCase()}</strong>
      </div>

      <p className={styles.adviceLine}>
        <span className={styles.adviceGood}>{advice.template.label}</span> — {advice.why}
      </p>

      {advice.avoid && (
        <p className={`${styles.adviceLine} ${risky ? styles.adviceWarn : ''}`}>
          <span className={styles.adviceBad}>À éviter</span> : {advice.avoid}
          {risky && <strong> C’est le modèle actuellement posé.</strong>}
        </p>
      )}

      <div className={styles.adviceActions}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={apply} disabled={alreadyApplied}>
          {alreadyApplied ? 'Déjà appliqué' : `Appliquer ${advice.template.label}`}
        </button>
        {advice.alternatives.length > 0 && (
          <span className={styles.adviceAlt}>
            Aussi adaptés : {advice.alternatives.map((t) => t.label).join(', ')}
          </span>
        )}
      </div>
    </div>
  );
}
