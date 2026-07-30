import { useState } from 'react';
import Icon from '../common/Icon';
import CalendarSyncModal from './CalendarSyncModal';

/** Le bouton « Synchroniser mon agenda » et sa fenêtre, d'un seul tenant.
 *
 *  Présent à deux endroits — Paramètres → Réservation en ligne, et l'en-tête de la page
 *  Agenda — parce que c'est en regardant son planning qu'on pense à le retrouver sur son
 *  téléphone, pas en fouillant les paramètres. */
export default function CalendarSyncButton({
  variant = 'btn-primary',
  size = '',
  label = 'Synchroniser mon agenda',
  onDownloadFile,
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={`btn ${variant} ${size}`.trim()} onClick={() => setOpen(true)}>
        <Icon name="calendar" size={16} /> {label}
      </button>
      <CalendarSyncModal open={open} onClose={() => setOpen(false)} onDownloadFile={onDownloadFile} />
    </>
  );
}
