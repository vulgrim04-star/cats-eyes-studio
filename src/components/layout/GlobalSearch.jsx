import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Icon from '../common/Icon';
import { useClients, searchClients } from '../../hooks/useClients';
import { useAppointments, enrich } from '../../hooks/useAppointments';
import { useProducts } from '../../hooks/useProducts';
import { formatDateShort } from '../../utils/date';
import { fullName } from '../../utils/format';
import styles from './GlobalSearch.module.css';

export default function GlobalSearch({ onClose }) {
  const navigate = useNavigate();
  const { clients } = useClients();
  const { appointments } = useAppointments();
  const { products } = useProducts();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const trimmed = query.trim().toLowerCase();

  const matchedClients = useMemo(() => (trimmed ? searchClients(clients, trimmed).slice(0, 5) : []), [clients, trimmed]);

  const matchedAppointments = useMemo(() => {
    if (!trimmed) return [];
    return appointments
      .map(enrich)
      .filter((a) => a.client && (fullName(a.client).toLowerCase().includes(trimmed) || a.service?.name.toLowerCase().includes(trimmed)))
      .sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1))
      .slice(0, 5);
  }, [appointments, trimmed]);

  const matchedProducts = useMemo(
    () => (trimmed ? products.filter((p) => p.name.toLowerCase().includes(trimmed)).slice(0, 5) : []),
    [products, trimmed]
  );

  const hasResults = matchedClients.length + matchedAppointments.length + matchedProducts.length > 0;

  const go = (path) => {
    onClose();
    navigate(path);
  };

  return createPortal(
    <div className={styles.backdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.panel}>
        <div className={styles.inputRow}>
          <Icon name="search" size={18} />
          <input
            className={styles.input}
            placeholder="Rechercher une cliente, un RDV, un produit…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Fermer">
            <Icon name="x" size={15} />
          </button>
        </div>

        <div className={styles.results}>
          {!trimmed && <div className={styles.empty}>Commencez à taper pour rechercher.</div>}
          {trimmed && !hasResults && <div className={styles.empty}>Aucun résultat pour « {query} ».</div>}

          {matchedClients.length > 0 && (
            <>
              <div className={styles.groupLabel}>Clientes</div>
              {matchedClients.map((c) => (
                <button key={c.id} type="button" className={styles.row} onClick={() => go(`/clientes/${c.id}`)}>
                  <span className={styles.iconWrap}><Icon name="users" size={15} /></span>
                  <div>
                    <div className={styles.rowTitle}>{fullName(c)}</div>
                    <div className={styles.rowSubtitle}>{c.phone}</div>
                  </div>
                </button>
              ))}
            </>
          )}

          {matchedAppointments.length > 0 && (
            <>
              <div className={styles.groupLabel}>Rendez-vous</div>
              {matchedAppointments.map((a) => (
                <button key={a.id} type="button" className={styles.row} onClick={() => go('/agenda')}>
                  <span className={styles.iconWrap}><Icon name="calendar" size={15} /></span>
                  <div>
                    <div className={styles.rowTitle}>{fullName(a.client)} — {a.service?.name}</div>
                    <div className={styles.rowSubtitle}>{formatDateShort(a.date)} à {a.time}</div>
                  </div>
                </button>
              ))}
            </>
          )}

          {matchedProducts.length > 0 && (
            <>
              <div className={styles.groupLabel}>Produits</div>
              {matchedProducts.map((p) => (
                <button key={p.id} type="button" className={styles.row} onClick={() => go('/stock')}>
                  <span className={styles.iconWrap}><Icon name="package" size={15} /></span>
                  <div>
                    <div className={styles.rowTitle}>{p.name}</div>
                    <div className={styles.rowSubtitle}>{p.stock} {p.unit} en stock</div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
