import PageHeader from '../components/common/PageHeader';
import Icon from '../components/common/Icon';
import { APP_NAME } from '../data/brand';
import { GUIDE_STEPS, GUIDE_TIPS } from '../data/guideText';
import styles from './Guide.module.css';

export default function Guide() {
  return (
    <>
      <PageHeader title="Guide de démarrage" subtitle={`Prendre en main ${APP_NAME} en quelques minutes`} />

      <div className={styles.steps}>
        {GUIDE_STEPS.map((step) => (
          <div key={step.title} className={styles.step}>
            <div className={styles.stepHead}>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <span className={styles.where}>{step.where}</span>
            </div>
            <p className={styles.body}>{step.body}</p>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 'var(--space-5)' }}>
        <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Bon à savoir</h3>
        {GUIDE_TIPS.map((tip) => (
          <div key={tip.title} className={styles.tip}>
            <Icon name="sparkles" size={16} />
            <div>
              <div className={styles.tipTitle}>{tip.title}</div>
              <p className={styles.body}>{tip.body}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
