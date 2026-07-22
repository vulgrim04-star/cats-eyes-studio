import { useState } from 'react';
import Icon from '../common/Icon';
import { useClients } from '../../hooks/useClients';
import { getAppointmentsByClient } from '../../hooks/useAppointments';
import { clientVisitStats } from '../../utils/retention';
import { formatPriceFull } from '../../utils/format';
import styles from './NotesTab.module.css';

export default function NotesTab({ client, appointments }) {
  const { addNote } = useClients();
  const [draft, setDraft] = useState('');

  const history = getAppointmentsByClient(appointments, client.id);
  const total = history.filter((a) => a.status === 'completed').length;
  const revenue = history.filter((a) => a.status === 'completed').reduce((sum, a) => sum + a.price, 0);
  const noShows = history.filter((a) => a.status === 'no-show').length;
  const visitStats = clientVisitStats(appointments, client.id);

  const handleAdd = () => {
    if (!draft.trim()) return;
    addNote(client.id, draft.trim());
    setDraft('');
  };

  return (
    <div>
      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <div className={styles.statValue}>{total}</div>
          <div className={styles.statLabel}>RDV réalisés</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{formatPriceFull(revenue)}</div>
          <div className={styles.statLabel}>CA généré</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{noShows}</div>
          <div className={styles.statLabel}>No-shows</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{visitStats.avgIntervalDays ? `${visitStats.avgIntervalDays}j` : '—'}</div>
          <div className={styles.statLabel}>Fréquence moyenne</div>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title" style={{ marginBottom: 'var(--space-3)' }}>Notes de la praticienne</h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--color-text-soft)', whiteSpace: 'pre-wrap', marginBottom: 'var(--space-4)' }}>
          {client.notes || 'Aucune note pour le moment.'}
        </p>
        <textarea
          className="input-field"
          rows={3}
          placeholder="Ajouter une note…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 'var(--space-3)' }} onClick={handleAdd}>
          <Icon name="plus" size={14} /> Ajouter la note
        </button>
      </div>
    </div>
  );
}
