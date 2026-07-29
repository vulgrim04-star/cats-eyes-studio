import { useMemo } from 'react';
import Modal from '../common/Modal';
import LashMapEditor from './LashMapEditor';
import { useLashMapForm } from '../../hooks/useLashMapForm';
import { useClients } from '../../hooks/useClients';
import styles from './styles/LashMap.module.css';

/** Conteneur de la modale : gestion du cycle de vie du formulaire et enregistrement.
 *  Toute la logique d'édition vit dans `useLashMapForm` et `LashMapEditor`. */
export default function LashMapModal({ open, onClose, client, editingMap }) {
  const { addLashMap, updateLashMap } = useClients();
  const isEdit = Boolean(editingMap);
  const formApi = useLashMapForm(editingMap, open);

  // Fiches de référence pour la frise : les autres séances, de la plus récente à la
  // plus ancienne (la fiche en cours de modification ne se compare pas à elle-même).
  const previousMaps = useMemo(() => {
    const maps = (client?.lashMaps ?? []).filter((map) => map.id !== editingMap?.id);
    return [...maps].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [client, editingMap]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isEdit) {
      updateLashMap(client.id, editingMap.id, formApi.form);
    } else {
      addLashMap(client.id, formApi.form);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Modifier la Lash Map' : 'Nouvelle Lash Map'}
      maxWidth={860}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" form="lashmap-form" className="btn btn-primary">
            {isEdit ? 'Enregistrer' : 'Enregistrer la fiche'}
          </button>
        </>
      }
    >
      <form id="lashmap-form" onSubmit={handleSubmit} className={styles.form}>
        <LashMapEditor formApi={formApi} previousMaps={previousMaps} />
      </form>
    </Modal>
  );
}
