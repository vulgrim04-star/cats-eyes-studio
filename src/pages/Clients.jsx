import { useMemo, useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import SearchInput from '../components/common/SearchInput';
import EmptyState from '../components/common/EmptyState';
import Fab from '../components/common/Fab';
import ClientRow from '../components/clients/ClientRow';
import NewClientModal from '../components/clients/NewClientModal';
import { useClients, searchClients } from '../hooks/useClients';
import { useAppointments } from '../hooks/useAppointments';
import { completedCountForClient } from '../utils/loyalty';
import styles from './Clients.module.css';

export default function Clients() {
  const { clients } = useClients();
  const { appointments } = useAppointments();
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(() => searchClients(clients, query), [clients, query]);

  return (
    <>
      <PageHeader title="Clientes" subtitle={`${clients.length} fiches clientes enregistrées`} />

      <div className={styles.toolbar}>
        <SearchInput value={query} onChange={setQuery} placeholder="Rechercher par nom, téléphone, email…" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="users" title="Aucune cliente trouvée" subtitle="Essayez une autre recherche ou créez une nouvelle fiche." />
      ) : (
        <>
          <div className={styles.count}>{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</div>
          <div className={styles.list}>
            {filtered.map((client) => (
              <ClientRow key={client.id} client={client} completedCount={completedCountForClient(appointments, client.id)} />
            ))}
          </div>
        </>
      )}

      <Fab onClick={() => setModalOpen(true)} label="Nouvelle cliente" />
      <NewClientModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
