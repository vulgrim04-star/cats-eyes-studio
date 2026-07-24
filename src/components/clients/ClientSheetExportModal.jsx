import { useState } from 'react';
import Modal from '../common/Modal';
import { generateClientSheetPdf } from '../../utils/clientSheetPdf';

const SECTIONS = [
  { key: 'identity', label: 'Informations générales', hint: "Coordonnées, Instagram, préférences, type de cils…" },
  { key: 'notes', label: 'Notes' },
  { key: 'history', label: 'Historique des rendez-vous' },
  { key: 'lashMaps', label: 'Lash Maps' },
  { key: 'photos', label: 'Photos avant / après' },
];

const ALL_CHECKED = SECTIONS.reduce((acc, s) => ({ ...acc, [s.key]: true }), {});

export default function ClientSheetExportModal({ open, onClose, client, appointments, salon, themeColor }) {
  const [checked, setChecked] = useState(ALL_CHECKED);
  const [generating, setGenerating] = useState(false);

  const toggle = (key) => setChecked((c) => ({ ...c, [key]: !c[key] }));

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateClientSheetPdf(client, appointments, salon, checked, themeColor);
      onClose();
    } finally {
      setGenerating(false);
    }
  };

  const noneChecked = SECTIONS.every((s) => !checked[s.key]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Télécharger la fiche cliente"
      maxWidth={440}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button type="button" className="btn btn-primary" onClick={handleGenerate} disabled={generating || noneChecked}>
            {generating ? 'Génération…' : 'Télécharger le PDF'}
          </button>
        </>
      }
    >
      <p style={{ fontSize: '0.86rem', color: 'var(--color-text-soft)', marginBottom: 'var(--space-3)' }}>
        Choisissez ce qui doit être inclus dans le PDF.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {SECTIONS.map((s) => (
          <label key={s.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={checked[s.key]}
              onChange={() => toggle(s.key)}
              style={{ marginTop: 3 }}
            />
            <span>
              <span style={{ display: 'block', fontWeight: 600, fontSize: '0.92rem' }}>{s.label}</span>
              {s.hint && <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text-soft)' }}>{s.hint}</span>}
            </span>
          </label>
        ))}
      </div>
    </Modal>
  );
}
