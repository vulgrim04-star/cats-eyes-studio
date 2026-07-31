import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import Icon from '../common/Icon';
import { useClients } from '../../hooks/useClients';

/** Correction de l'identité d'une cliente.
 *
 *  Le prénom et le nom n'étaient modifiables nulle part : l'en-tête les affichait en lecture
 *  seule et la modale de création ne servait qu'à créer. Une faute de frappe à l'inscription
 *  était donc définitive, et la seule issue consistait à supprimer la fiche — avec son
 *  historique.
 *
 *  Le téléphone et l'e-mail sont là aussi parce qu'ils accompagnent naturellement une
 *  correction d'identité. Le reste (Instagram, allergies, état des cils…) reste dans l'onglet
 *  Profil : le dupliquer ici créerait deux endroits pour la même donnée, donc deux occasions
 *  de les voir diverger. */
export default function EditIdentityModal({ open, client, onClose }) {
  const { updateClient } = useClients();
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '' });

  // Recharge à chaque ouverture : sans cela, corriger une fiche puis en ouvrir une autre
  // afficherait encore les valeurs de la précédente.
  useEffect(() => {
    if (!open || !client) return;
    setForm({
      firstName: client.firstName ?? '',
      lastName: client.lastName ?? '',
      phone: client.phone ?? '',
      email: client.email ?? '',
    });
  }, [open, client]);

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) return;
    updateClient(client.id, {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
    });
    onClose();
  };

  if (!client) return null;

  const valid = form.firstName.trim() && form.lastName.trim();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Modifier la fiche"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" form="edit-identity" className="btn btn-primary" disabled={!valid}>
            <Icon name="check" size={15} /> Enregistrer
          </button>
        </>
      }
    >
      <form id="edit-identity" onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field-group">
            <label className="field-label" htmlFor="ei-first">Prénom</label>
            <input id="ei-first" className="input-field" value={form.firstName} onChange={(e) => update({ firstName: e.target.value })} required />
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="ei-last">Nom</label>
            <input id="ei-last" className="input-field" value={form.lastName} onChange={(e) => update({ lastName: e.target.value })} required />
          </div>
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="ei-phone">Téléphone</label>
          <input id="ei-phone" className="input-field" value={form.phone} onChange={(e) => update({ phone: e.target.value })} />
        </div>

        <div className="field-group" style={{ marginBottom: 0 }}>
          <label className="field-label" htmlFor="ei-email">Email</label>
          <input id="ei-email" type="email" className="input-field" value={form.email} onChange={(e) => update({ email: e.target.value })} />
        </div>
      </form>
    </Modal>
  );
}
