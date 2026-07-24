import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import EyeDiagram from './EyeDiagram';
import { useClients } from '../../hooks/useClients';
import { todayISO } from '../../utils/date';
import styles from './LashMap.module.css';

const POSE_TYPES = ['Pose complète', 'Retouche', 'Dépose'];
const STYLES = ['Classique', 'Volume', 'Mega volume', 'Hybride', 'Wispy'];
const EFFECTS = ['Cat Eye', 'Open Eye', 'Squirrel', 'Rounded', 'Wispy'];
const CURLS = ['J', 'B', 'C', 'CC', 'D', 'DD', 'L', 'M'];
const LENGTHS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const THICKNESSES = [0.03, 0.05, 0.07, 0.1, 0.12, 0.15];

const EMPTY = {
  date: todayISO(),
  eyeShape: '',
  lashHealth: '',
  fillCycle: '',
  setShape: '',
  poseType: 'Pose complète',
  styles: [],
  effects: [],
  curl: 'C',
  length: '',
  thickness: '',
  adhesive: '',
  innerCornerLength: '',
  outerCornerLength: '',
  layers: { top: '', mid: '', bottom: '' },
  notes: '',
  zonesLeft: ['', '', '', '', '', ''],
  zonesRight: ['', '', '', '', '', ''],
};

function isPreset(list, value) {
  return list.map(String).includes(value);
}

export default function LashMapModal({ open, onClose, client, editingMap }) {
  const { addLashMap, updateLashMap } = useClients();
  const isEdit = Boolean(editingMap);
  const [form, setForm] = useState(() => (editingMap ? { ...EMPTY, ...editingMap, layers: { ...EMPTY.layers, ...editingMap.layers } } : EMPTY));
  const [customLength, setCustomLength] = useState(() => form.length !== '' && !isPreset(LENGTHS, form.length));
  const [customThickness, setCustomThickness] = useState(() => form.thickness !== '' && !isPreset(THICKNESSES, form.thickness));

  useEffect(() => {
    const next = editingMap ? { ...EMPTY, ...editingMap, layers: { ...EMPTY.layers, ...editingMap.layers } } : EMPTY;
    setForm(next);
    setCustomLength(next.length !== '' && !isPreset(LENGTHS, next.length));
    setCustomThickness(next.thickness !== '' && !isPreset(THICKNESSES, next.thickness));
  }, [editingMap, open]);

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));
  const updateLayer = (key, value) => setForm((f) => ({ ...f, layers: { ...f.layers, [key]: value } }));

  const toggleFrom = (key, value) => {
    update({
      [key]: form[key].includes(value) ? form[key].filter((s) => s !== value) : [...form[key], value],
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
    if (isEdit) {
      updateLashMap(client.id, editingMap.id, form);
    } else {
      addLashMap(client.id, form);
      setForm(EMPTY);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Modifier la Lash Map' : 'Nouvelle Lash Map'}
      maxWidth={720}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" form="lashmap-form" className="btn btn-primary">{isEdit ? 'Enregistrer' : 'Enregistrer la fiche'}</button>
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
                onClick={() => toggleFrom('styles', style)}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        <div className="field-group">
          <label className="field-label">Effet</label>
          <div className={styles.chipRow}>
            {EFFECTS.map((effect) => (
              <button
                key={effect}
                type="button"
                className={`${styles.chip} ${form.effects.includes(effect) ? styles.chipActive : ''}`}
                onClick={() => toggleFrom('effects', effect)}
              >
                {effect}
              </button>
            ))}
          </div>
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="lm-curl">Courbure</label>
          <select id="lm-curl" className="input-field" style={{ maxWidth: 140 }} value={form.curl} onChange={(e) => update({ curl: e.target.value })}>
            {CURLS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="field-group">
          <label className="field-label">Longueur</label>
          <div className={styles.chipRow}>
            {LENGTHS.map((l) => (
              <button
                key={l}
                type="button"
                className={`${styles.chip} ${!customLength && form.length === String(l) ? styles.chipActive : ''}`}
                onClick={() => { setCustomLength(false); update({ length: String(l) }); }}
              >
                {l}mm
              </button>
            ))}
            <button
              type="button"
              className={`${styles.chip} ${customLength ? styles.chipActive : ''}`}
              onClick={() => { setCustomLength(true); update({ length: '' }); }}
            >
              Autre
            </button>
          </div>
          {customLength && (
            <input
              className="input-field"
              style={{ marginTop: 8, maxWidth: 160 }}
              value={form.length}
              onChange={(e) => update({ length: e.target.value })}
              placeholder="ex. 13.5mm"
              autoFocus
            />
          )}
        </div>

        <div className="field-group" style={{ marginBottom: 0 }}>
          <label className="field-label">Épaisseur</label>
          <div className={styles.chipRow}>
            {THICKNESSES.map((t) => (
              <button
                key={t}
                type="button"
                className={`${styles.chip} ${!customThickness && form.thickness === String(t) ? styles.chipActive : ''}`}
                onClick={() => { setCustomThickness(false); update({ thickness: String(t) }); }}
              >
                {t}mm
              </button>
            ))}
            <button
              type="button"
              className={`${styles.chip} ${customThickness ? styles.chipActive : ''}`}
              onClick={() => { setCustomThickness(true); update({ thickness: '' }); }}
            >
              Autre
            </button>
          </div>
          {customThickness && (
            <input
              className="input-field"
              style={{ marginTop: 8, maxWidth: 160 }}
              value={form.thickness}
              onChange={(e) => update({ thickness: e.target.value })}
              placeholder="ex. 0.08mm"
              autoFocus
            />
          )}
        </div>

        <div className="field-group">
          <label className="field-label">Longueurs par zone (mm)</label>
          <div className={styles.eyesRow}>
            <EyeDiagram title="Œil gauche" zones={form.zonesLeft} onChange={(i, v) => setZone('left', i, v)} />
            <EyeDiagram title="Œil droit" zones={form.zonesRight} onChange={(i, v) => setZone('right', i, v)} />
          </div>
        </div>

        <div className="field-group">
          <label className="field-label">Répartition par couche (optionnel)</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <input className="input-field" value={form.layers.top} onChange={(e) => updateLayer('top', e.target.value)} placeholder="Haut" />
            <input className="input-field" value={form.layers.mid} onChange={(e) => updateLayer('mid', e.target.value)} placeholder="Milieu" />
            <input className="input-field" value={form.layers.bottom} onChange={(e) => updateLayer('bottom', e.target.value)} placeholder="Bas" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div className="field-group">
            <label className="field-label" htmlFor="lm-adhesive">Colle utilisée</label>
            <input id="lm-adhesive" className="input-field" value={form.adhesive} onChange={(e) => update({ adhesive: e.target.value })} placeholder="Sensitive, 1 seconde…" />
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="lm-inner">Coin interne (mm)</label>
            <input id="lm-inner" className="input-field" value={form.innerCornerLength} onChange={(e) => update({ innerCornerLength: e.target.value })} />
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="lm-outer">Coin externe (mm)</label>
            <input id="lm-outer" className="input-field" value={form.outerCornerLength} onChange={(e) => update({ outerCornerLength: e.target.value })} />
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
