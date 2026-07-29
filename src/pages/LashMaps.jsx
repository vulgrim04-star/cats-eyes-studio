import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import SearchInput from '../components/common/SearchInput';
import EmptyState from '../components/common/EmptyState';
import LashMapCanvas from '../components/lashmap/LashMapCanvas';
import { useClients } from '../hooks/useClients';
import { getEye, lengthRange, normalizeLashMap } from '../utils/lashModel';
import { formatDateLong } from '../utils/date';
import { fullName } from '../utils/format';
import styles from './LashMaps.module.css';

/** Toutes les Lash Maps du salon, la plus récente en tête.
 *
 * Utile quand on cherche « ce cat eye posé le mois dernier » sans se rappeler sur
 * quelle cliente : on retrouve la forme à l'œil, pas au nom.
 */
export default function LashMaps() {
  const { clients } = useClients();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const entries = useMemo(() => {
    const all = clients.flatMap((client) =>
      (client.lashMaps ?? []).map((map) => ({ client, map: normalizeLashMap(map), id: map.id }))
    );
    const sorted = all.sort((a, b) => String(b.map.date).localeCompare(String(a.map.date)));
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(({ client, map }) => {
      const eye = getEye(map, 'right');
      return [fullName(client), map.poseType, map.setShape, eye.global.style, eye.global.curl]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [clients, query]);

  return (
    <>
      <PageHeader
        title="Lash map"
        subtitle={`${entries.length} fiche${entries.length > 1 ? 's' : ''} technique${entries.length > 1 ? 's' : ''}`}
      />

      <SearchInput value={query} onChange={setQuery} placeholder="Cliente, technique, courbure…" />

      {entries.length === 0 ? (
        <EmptyState
          icon="sparkles"
          title="Aucune Lash Map"
          subtitle="Les fiches créées depuis l'onglet Lash Map d'une cliente apparaîtront ici."
        />
      ) : (
        <div className={styles.grid}>
          {entries.map(({ client, map, id }) => {
            const eye = getEye(map, 'right');
            return (
              <button
                key={`${client.id}-${id}`}
                type="button"
                className={styles.card}
                onClick={() => navigate(`/clientes/${client.id}/lash-map/${id}`)}
              >
                <LashMapCanvas map={map} side="right" compact readOnly />
                <span className={styles.cardName}>{fullName(client)}</span>
                <span className={styles.cardMeta}>{formatDateLong(map.date)} · {map.poseType}</span>
                <span className={styles.cardSpecs}>
                  {eye.global.style} · {eye.global.curl} · {lengthRange(eye)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
