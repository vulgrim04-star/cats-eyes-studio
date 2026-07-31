import { useState } from 'react';
import SettingsPage from '../../components/settings/SettingsPage';
import Icon from '../../components/common/Icon';
import { useReferentialsStore } from '../../store/useReferentialsStore';
import { DEFAULT_REFERENTIALS, REFERENTIAL_HINTS, REFERENTIAL_KEYS, REFERENTIAL_LABELS } from '../../utils/referentials';
import styles from '../Settings.module.css';

function ListEditor({ listKey }) {
  const values = useReferentialsStore((s) => s[listKey]);
  const { addValue, renameValue, removeValue, move, resetList } = useReferentialsStore();
  const [draft, setDraft] = useState('');

  const submit = (e) => {
    e.preventDefault();
    addValue(listKey, draft);
    setDraft('');
  };

  const isDefault =
    values.length === DEFAULT_REFERENTIALS[listKey].length &&
    values.every((v, i) => v === DEFAULT_REFERENTIALS[listKey][i]);

  return (
    <div className="card" style={{ marginTop: 'var(--space-5)' }}>
      <div className={styles.blockHead}>
        <h3 className="card-title" style={{ margin: 0 }}>{REFERENTIAL_LABELS[listKey]}</h3>
        {!isDefault && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => resetList(listKey)}>
            Valeurs par défaut
          </button>
        )}
      </div>
      <p className={styles.checkHint} style={{ marginBottom: 'var(--space-3)' }}>{REFERENTIAL_HINTS[listKey]}</p>

      {values.map((value, index) => (
        <div key={`${listKey}-${index}`} className={styles.valueRow}>
          <input
            className="input-field"
            value={value}
            aria-label={`${REFERENTIAL_LABELS[listKey]} — valeur ${index + 1}`}
            onChange={(e) => renameValue(listKey, index, e.target.value)}
          />
          <button
            type="button"
            className={styles.valueBtn}
            onClick={() => move(listKey, index, -1)}
            disabled={index === 0}
            aria-label="Monter"
          >
            <Icon name="chevron-up" size={15} />
          </button>
          <button
            type="button"
            className={styles.valueBtn}
            onClick={() => move(listKey, index, 1)}
            disabled={index === values.length - 1}
            aria-label="Descendre"
          >
            <Icon name="chevron-down" size={15} />
          </button>
          <button
            type="button"
            className={`${styles.valueBtn} ${styles.valueRemove}`}
            onClick={() => removeValue(listKey, index)}
            aria-label={`Retirer ${value}`}
          >
            <Icon name="x" size={15} />
          </button>
        </div>
      ))}

      <form onSubmit={submit} className={styles.valueAdd}>
        <input
          className="input-field"
          placeholder="Ajouter une valeur…"
          aria-label={`Ajouter une valeur à ${REFERENTIAL_LABELS[listKey]}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className="btn btn-secondary btn-sm" disabled={!draft.trim()}>
          <Icon name="plus" size={13} /> Ajouter
        </button>
      </form>
    </div>
  );
}

export default function SettingsReferentials() {
  return (
    <SettingsPage
      title="Listes de la fiche cliente"
      subtitle="Les choix proposés pour le type, l'état et la longueur des cils"
    >
      {/* Dit explicitement ce qui arrive aux fiches déjà remplies : c'est la question qu'on
          se pose au moment de retirer une valeur, et y répondre après coup serait trop tard. */}
      <div className="card">
        <p className={styles.checkHint} style={{ margin: 0 }}>
          Retirer une valeur ne modifie aucune fiche existante : une cliente qui la porte
          continue de l'afficher. Elle ne sera simplement plus proposée aux nouvelles saisies.
        </p>
      </div>

      {REFERENTIAL_KEYS.map((key) => (
        <ListEditor key={key} listKey={key} />
      ))}
    </SettingsPage>
  );
}
