import { useState } from 'react';
import Modal from '../common/Modal';
import EyeDiagram from './EyeDiagram';
import { useClients } from '../../hooks/useClients';
import { todayISO } from '../../utils/date';
import styles from './LashMap.module.css';

const POSE_TYPES = ['Pose complète', 'Retouche', 'Dépose'];
const STYLES = ['Classique', 'Volume', 'Mega volume', 'Hybride', 'Wispy'];
const CURLS = ['J', 'B', 'C', 'CC', 'D', 'DD', 'L', 'M'];

const EMPTY = {
  date: todayISO(),
  eyeShape: '',
  lashHealth: '',
  fillCycle: '',
  setShape: '',
  poseType: 'Pose complète',
  styles: [],
  curl: 'C',
  length: '',
  thickness: '',
  notes: '',
  zonesLeft: ['', '', '', '', '', ''],
  zonesRight: ['', '', '', '', '', ''],
};

export default function LashMapModal({ open, onClose, client }) {
  const { addLashMap } = useClients();
  const [form, setForm] = useState(EMPTY);

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const toggleStyle = (style) => {
    update({
      styles: form.styles.includes(style)
        ? form.styles.filter((s) => s !== style)
        : [...form.styles, style],
    });
  };

  const setZone = (side, index, value) => {
    const key = side === 'left' ? 'zonesLeft' : 'zonesRight';
    const zones = [...form[key]];
    zones[index] = value;
    update({ [key]: zones });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    addLashMap(client.id, form);
    setForm(EMPTY);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nouvelle Lash Map"
      maxWidth={680}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" form="lashmap-form" className="btn btn-primary">Enregistrer la fiche</button>
        </>
      }
    >
      <form id="lashmap-form" onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field-group">
            <label className="field-label" htmlFor="lm-date">Date de la séance</label>
            <input id="lm-date" type="date" className="input-field" value={form.date} onChange={(e) => update({ date: e.target.value })} required />
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="lm-fill">Cycle de retouche</label>
            <input id="lm-fill" className="input-field" value={form.fillCycle} onChange={(e) => update({ fillCycle: e.target.value })} placeholder="2-3 semaines" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field-group">
            <label className="field-label" htmlFor="lm-eyeshape">Forme de l'œil</label>
            <input id="lm-eyeshape" className="input-field" value={form.eyeShape} onChange={(e) => update({ eyeShape: e.target.value })} placeholder="Amande, rond…" />
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="lm-setshape">Forme de la pose</label>
            <input id="lm-setshape" className="input-field" value={form.setShape} onChange={(e) => update({ setShape: e.target.value })} placeholder="Cat Eye, Doll Eye…" />
          </div>
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="lm-health">Santé des cils naturels</label>
          <input id="lm-health" className="input-field" value={form.lashHealth} onChange={(e) => update({ lashHealth: e.target.value })} placeholder="Courts et épais…" />
        </div>

        <div className="field-group">
          <label className="field-label">Type de séance</label>
          <div className={styles.chipRow}>
            {POSE_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className={`${styles.chip} ${form.poseType === type ? styles.chipActive : ''}`}
                onClick={() => update({ poseType: type })}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="field-group">
          <label className="field-label">Style</label>
          <div className={styles.chipRow}>
            {STYLES.map((style) => (
              <button
                key={style}
                type="button"
                className={`${styles.chip} ${form.styles.includes(style) ? styles.chipActive : ''}`}
                onClick={() => toggleStyle(style)}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div className="field-group">
            <label className="field-label" htmlFor="lm-curl">Courbure</label>
            <select id="lm-curl" className="input-field" value={form.curl} onChange={(e) => update({ curl: e.target.value })}>
              {CURLS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="lm-length">Longueur</label>
            <input id="lm-length" className="input-field" value={form.length} onChange={(e) => update({ length: e.target.value })} placeholder="13mm" />
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="lm-thickness">Épaisseur</label>
            <input id="lm-thickness" className="input-field" value={form.thickness} onChange={(e) => update({ thickness: e.target.value })} placeholder="0.05mm" />
          </div>
        </div>

        <div className="field-group">
          <label className="field-label">Longueurs par zone (mm)</label>
          <div className={styles.eyesRow}>
            <EyeDiagram title="Œil gauche" zones={form.zonesLeft} onChange={(i, v) => setZone('left', i, v)} />
            <EyeDiagram title="Œil droit" zones={form.zonesRight} onChange={(i, v) => setZone('right', i, v)} />
          </div>
        </div>

        <div className="field-group" style={{ marginBottom: 0 }}>
          <label className="field-label" htmlFor="lm-notes">Notes</label>
          <textarea id="lm-notes" className="input-field" rows={3} value={form.notes} onChange={(e) => update({ notes: e.target.value })} />
        </div>
      </form>
    </Modal>
  );
}
