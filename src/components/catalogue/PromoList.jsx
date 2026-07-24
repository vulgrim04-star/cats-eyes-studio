import { useState } from 'react';
import Toggle from '../common/Toggle';
import Icon from '../common/Icon';
import PromoModal from './PromoModal';
import { useServices } from '../../hooks/useServices';
import styles from './PromoList.module.css';

export default function PromoList() {
  const { promoCodes, togglePromo, removePromo } = useServices();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);

  const openNew = () => {
    setEditingPromo(null);
    setModalOpen(true);
  };

  const openEdit = (promo) => {
    setEditingPromo(promo);
    setModalOpen(true);
  };

  const handleDelete = (promo) => {
    if (window.confirm(`Supprimer le code promo "${promo.code}" ?`)) {
      removePromo(promo.id);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
        <h3 className="card-title" style={{ marginBottom: 0 }}>Codes promo</h3>
        <button type="button" className="btn btn-secondary btn-sm" onClick={openNew}>
          <Icon name="plus" size={13} /> Nouveau code
        </button>
      </div>
      {promoCodes.length === 0 && (
        <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Aucun code promo pour le moment.</p>
      )}
      {promoCodes.map((promo) => (
        <div key={promo.id} className={styles.row}>
          <div className={styles.headRow}>
            <span className={styles.code}>{promo.code}</span>
            <div className={styles.actions}>
              <Toggle
                active={promo.active}
                onChange={() => togglePromo(promo.id)}
                label={promo.active ? 'Désactiver' : 'Activer'}
              />
              <button type="button" className={styles.iconBtn} onClick={() => openEdit(promo)} title="Modifier">
                <Icon name="edit" size={14} />
              </button>
              <button type="button" className={styles.iconBtn} onClick={() => handleDelete(promo)} title="Supprimer">
                <Icon name="trash" size={14} />
              </button>
            </div>
          </div>
          <p className={styles.desc}>{promo.label} · -{promo.discountPercent}%</p>
        </div>
      ))}

      <PromoModal open={modalOpen} onClose={() => setModalOpen(false)} promo={editingPromo} />
    </div>
  );
}
