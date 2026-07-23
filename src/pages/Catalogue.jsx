import { useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import Icon from '../components/common/Icon';
import ServiceRow from '../components/catalogue/ServiceRow';
import ServiceModal from '../components/catalogue/ServiceModal';
import PromoList from '../components/catalogue/PromoList';
import { useServices, groupByCategory } from '../hooks/useServices';
import { SERVICE_CATEGORIES } from '../data/services';
import styles from './Catalogue.module.css';

export default function Catalogue() {
  const { services, removeService } = useServices();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);

  const grouped = groupByCategory(services);

  const openNew = () => {
    setEditingService(null);
    setModalOpen(true);
  };

  const openEdit = (service) => {
    setEditingService(service);
    setModalOpen(true);
  };

  const handleDelete = (service) => {
    if (window.confirm(`Supprimer « ${service.name} » du catalogue ?`)) {
      removeService(service.id);
    }
  };

  return (
    <>
      <PageHeader
        title="Catalogue"
        subtitle={`${services.length} prestations au catalogue`}
        actions={
          <button type="button" className="btn btn-primary" onClick={openNew}>
            <Icon name="plus" size={16} /> Nouvelle prestation
          </button>
        }
      />

      {SERVICE_CATEGORIES.map((cat) => {
        const rows = grouped[cat.id] ?? [];
        if (rows.length === 0) return null;
        return (
          <div key={cat.id} className={styles.categoryBlock}>
            <div className={styles.categoryTitle}>{cat.label}</div>
            <div className="card">
              {rows.map((service) => (
                <ServiceRow key={service.id} service={service} onEdit={openEdit} onDelete={handleDelete} />
              ))}
            </div>
          </div>
        );
      })}

      <div className={styles.bottomGrid}>
        <PromoList />
      </div>

      <ServiceModal open={modalOpen} onClose={() => setModalOpen(false)} service={editingService} />
    </>
  );
}
