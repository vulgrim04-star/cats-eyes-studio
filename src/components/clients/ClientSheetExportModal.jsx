import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import Icon from '../common/Icon';
import { buildClientSheetPdf, generateClientSheetPdf } from '../../utils/clientSheetPdf';

const SECTIONS = [
  { key: 'identity', label: 'Informations générales', hint: "Photo de profil, coordonnées, Instagram, préférences, type de cils…" },
  { key: 'notes', label: 'Notes' },
  { key: 'history', label: 'Historique des rendez-vous' },
  { key: 'lashMaps', label: 'Lash Maps' },
  { key: 'photos', label: 'Photos avant / après' },
];

const ALL_CHECKED = SECTIONS.reduce((acc, s) => ({ ...acc, [s.key]: true }), {});

export default function ClientSheetExportModal({ open, onClose, client, appointments, salon, themeColor }) {
  const [checked, setChecked] = useState(ALL_CHECKED);
  const [generating, setGenerating] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  const clearPreview = () => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return '';
    });
  };

  // Réinitialise l'aperçu à chaque ouverture/fermeture pour ne jamais montrer le PDF
  // d'une cliente précédente, et libère l'URL blob pour éviter une fuite mémoire.
  useEffect(() => {
    if (!open) clearPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = (key) => {
    setChecked((c) => ({ ...c, [key]: !c[key] }));
    clearPreview();
  };

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const doc = await buildClientSheetPdf(client, appointments, salon, checked, themeColor);
      clearPreview();
      setPreviewUrl(doc.output('bloburl'));
    } finally {
      setPreviewing(false);
    }
  };

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
      maxWidth={680}
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
        Choisissez ce qui doit être inclus dans le PDF, puis prévisualisez avant de télécharger.
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

      <button
        type="button"
        className="btn btn-secondary btn-sm"
        style={{ marginTop: 'var(--space-4)' }}
        onClick={handlePreview}
        disabled={previewing || noneChecked}
      >
        <Icon name="eye" size={14} /> {previewing ? 'Génération de l’aperçu…' : previewUrl ? 'Actualiser l’aperçu' : 'Aperçu du PDF'}
      </button>

      {previewUrl && (
        <iframe
          src={previewUrl}
          title="Aperçu du PDF"
          style={{
            width: '100%',
            height: 440,
            marginTop: 'var(--space-3)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
          }}
        />
      )}
    </Modal>
  );
}
