import { useState } from 'react';
import BottomSheet from '../common/BottomSheet';
import Icon from '../common/Icon';
import { useLashTemplatesStore } from '../../store/useLashTemplatesStore';
import { useToast } from '../../hooks/useToast';
import { MAP_TEMPLATES } from '../../utils/lashPresets';
import { eyeLengths, getEye } from '../../utils/lashModel';
import styles from './styles/LashMap.module.css';

/** Modèles de pose : les treize classiques du métier, plus ceux que la praticienne
 *  enregistre elle-même à partir d'un mapping réussi. */
export default function LashTemplates({ open, onClose, editor }) {
  const saved = useLashTemplatesStore((s) => s.templates);
  const addTemplate = useLashTemplatesStore((s) => s.addTemplate);
  const removeTemplate = useLashTemplatesStore((s) => s.removeTemplate);
  const { showToast } = useToast();
  const [bothEyes, setBothEyes] = useState(true);
  const [name, setName] = useState('');

  const eye = getEye(editor.map, editor.side);

  const apply = (template) => {
    editor.applyTemplate(template, { bothEyes });
    showToast(`Modèle « ${template.label} » appliqué`, 'success');
    onClose();
  };

  const saveCurrent = () => {
    const label = name.trim();
    if (!label) return;
    addTemplate({ label, hint: 'Modèle enregistré', profile: eyeLengths(eye), global: { ...eye.global } });
    setName('');
    showToast(`Modèle « ${label} » enregistré`, 'success');
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Modèles de pose">
      <label className={styles.panelRow} style={{ borderBottom: 'none' }}>
        <span className={styles.panelRowLabel}>Appliquer aux deux yeux</span>
        <input type="checkbox" checked={bothEyes} onChange={(event) => setBothEyes(event.target.checked)} />
      </label>

      <div className={styles.templateGrid}>
        {[...saved, ...MAP_TEMPLATES].map((template) => (
          <div key={template.id} style={{ position: 'relative' }}>
            <button
              type="button"
              className={`${styles.templateCard} ${editor.map.templateId === template.id ? styles.templateCardActive : ''}`}
              style={{ width: '100%' }}
              onClick={() => apply(template)}
            >
              <span className={styles.templateName}>{template.label}</span>
              <span className={styles.templateHint}>{template.hint}</span>
              <span className={styles.templateSpecs}>
                {template.global.curl} · {template.global.diameter} mm · {template.global.density}
              </span>
            </button>
            {template.createdAt && (
              <button
                type="button"
                className={styles.resetLink}
                style={{ position: 'absolute', top: 8, right: 10 }}
                onClick={() => { removeTemplate(template.id); showToast('Modèle supprimé', 'warning'); }}
                aria-label={`Supprimer le modèle ${template.label}`}
              >
                <Icon name="trash" size={13} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className={styles.field} style={{ marginTop: 'var(--space-4)' }}>
        <label className={styles.fieldLabel} htmlFor="lash-template-name">
          Enregistrer l’œil courant comme modèle
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            id="lash-template-name"
            className="input-field"
            value={name}
            placeholder="Cat Eye signature"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); saveCurrent(); } }}
          />
          <button type="button" className="btn btn-secondary btn-sm" onClick={saveCurrent} disabled={!name.trim()}>
            Enregistrer
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
