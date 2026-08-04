import { useMemo, useState } from 'react';
import Icon from '../common/Icon';
import BrowCanvas from './BrowCanvas';
import BrowSimulation from './BrowSimulation';
import BrowTimeline from './BrowTimeline';
import { useClients } from '../../hooks/useClients';
import { useToast } from '../../hooks/useToast';
import {
  BROW_EFFECTS,
  BROW_SHAPES,
  BROW_TONES,
  BROW_ZONES,
  isCustomized,
  lookSummary,
  normalizeLook,
  resetShape,
  toneById,
} from '../../utils/browShapes';
import { normalizeBrowSession, BROW_SERVICES, minutesForService } from '../../utils/browModel';
import { formatDateLong, todayISO } from '../../utils/date';
import styles from './styles/BrowStudio.module.css';

/** Réglages de forme, dans l'ordre où on les touche en cabine. */
const SHAPE_SLIDERS = [
  ['archHeight', "Hauteur d'arche"],
  ['length', 'Longueur'],
  ['thickness', 'Épaisseur'],
  ['angle', 'Angle'],
  ['symmetry', 'Symétrie'],
  ['density', 'Densité'],
];

const COLOR_SLIDERS = [
  ['intensity', 'Intensité'],
  ['transparency', 'Transparence'],
  ['warmth', 'Chaleur'],
  ['saturation', 'Saturation'],
];

const PANELS = [
  ['shape', 'Forme', 'sparkles'],
  ['color', 'Couleur', 'droplet'],
  ['simulation', 'Simulation', 'camera'],
  ['session', 'Séance', 'clipboard'],
];

/** Brow Lift — l'outil du brow artist.
 *
 *  Organisé autour de l'aperçu des deux sourcils, parce que c'est la paire qui se juge, et
 *  parce qu'une cliente doit pouvoir s'y projeter avant qu'on touche à quoi que ce soit.
 *  Tout ce qu'on règle s'y voit immédiatement — un curseur dont l'effet ne se verrait pas
 *  ne servirait à rien.
 */
export default function BrowStudio({ client }) {
  const { addBrowSession, updateBrowSession, removeBrowSession } = useClients();
  const { showToast } = useToast();

  const [look, setLook] = useState(() => normalizeLook(null));
  const [session, setSession] = useState(() => normalizeBrowSession(null));
  const [zone, setZone] = useState(null);
  const [panel, setPanel] = useState('shape');
  const [editingId, setEditingId] = useState(null);

  const sessions = useMemo(
    () => [...(client?.browSessions ?? [])].sort((a, b) => String(b.date).localeCompare(String(a.date))),
    [client]
  );

  const setLookField = (patch) => setLook((l) => normalizeLook({ ...l, ...patch }));

  /** Retouche de la zone retenue. Elle s'ajoute au modèle sans le remplacer : on peut
   *  changer de forme ensuite et retrouver ses retouches. */
  const setZoneField = (field, value) =>
    setLook((l) =>
      normalizeLook({ ...l, zones: { ...l.zones, [zone]: { ...l.zones[zone], [field]: Number(value) } } })
    );

  const changeService = (service) => {
    const untouched = session.processingMinutes === minutesForService(session.service);
    setSession((s) =>
      normalizeBrowSession({ ...s, service, processingMinutes: untouched ? minutesForService(service) : s.processingMinutes })
    );
  };

  const save = () => {
    // Le look complet est enregistré AVEC la séance : c'est ce qui permet de rouvrir une
    // prestation d'il y a six mois et de la rejouer à l'identique.
    const payload = { ...session, look, summary: lookSummary(look) };
    if (editingId) {
      updateBrowSession(client.id, editingId, payload);
      showToast('Séance sourcils modifiée', 'success');
    } else {
      addBrowSession(client.id, payload);
      showToast('Séance sourcils enregistrée', 'success');
    }
    setEditingId(null);
  };

  const edit = (entry) => {
    setEditingId(entry.id);
    setSession(normalizeBrowSession(entry));
    setLook(normalizeLook(entry.look));
    setPanel('shape');
  };

  const remove = (entry) => {
    if (!window.confirm(`Supprimer la séance du ${formatDateLong(entry.date)} ? Cette action est irréversible.`)) return;
    removeBrowSession(client.id, entry.id);
    if (editingId === entry.id) setEditingId(null);
  };

  const tone = toneById(look.toneId);
  const zoneLabel = BROW_ZONES.find((z) => z.id === zone);

  return (
    <div className={styles.wrap}>
      <div className={styles.stage}>
        <BrowCanvas look={look} selectedZone={zone} onSelectZone={(id) => { setZone(id); setPanel('shape'); }} />

        <div className={styles.zoneRow} role="group" aria-label="Zone à retoucher">
          {BROW_ZONES.map((z) => (
            <button
              key={z.id}
              type="button"
              className={`${styles.zoneChip} ${zone === z.id ? styles.zoneChipActive : ''}`}
              onClick={() => setZone(zone === z.id ? null : z.id)}
            >
              {z.label}
            </button>
          ))}
        </div>

        <p className={styles.stageCaption}>{lookSummary(look)}</p>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelTabs} role="tablist" aria-label="Réglages">
          {PANELS.map(([id, label, icon]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={panel === id}
              className={`${styles.panelTab} ${panel === id ? styles.panelTabActive : ''}`}
              onClick={() => setPanel(id)}
            >
              <Icon name={icon} size={14} /> {label}
            </button>
          ))}
        </div>

        {panel === 'shape' && (
          <>
            <span className={styles.label}>Bibliothèque de formes</span>
            <div className={styles.shapeGrid}>
              {BROW_SHAPES.map((shape) => (
                <button
                  key={shape.id}
                  type="button"
                  aria-pressed={look.shapeId === shape.id}
                  className={`${styles.shapeCard} ${look.shapeId === shape.id ? styles.shapeCardActive : ''}`}
                  onClick={() => setLookField({ shapeId: shape.id })}
                  title={shape.hint}
                >
                  <BrowCanvas look={{ ...look, shapeId: shape.id }} readOnly />
                  <span className={styles.shapeName}>{shape.label}</span>
                </button>
              ))}
            </div>

            {zone && (
              <div className={styles.zonePanel}>
                <span className={styles.label}>
                  Retouche · {zoneLabel.label}
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setZone(null)}>Fermer</button>
                </span>
                <p className={styles.zoneHint}>{zoneLabel.hint}</p>
                {[['lift', 'Hauteur'], ['weight', 'Épaisseur']].map(([field, label]) => (
                  <label key={field} className={styles.field}>
                    <span className={styles.label}>{label} <strong>{look.zones[zone][field] > 0 ? '+' : ''}{look.zones[zone][field]}</strong></span>
                    <input
                      type="range"
                      min={-50}
                      max={50}
                      value={look.zones[zone][field]}
                      onChange={(e) => setZoneField(field, e.target.value)}
                      className={styles.slider}
                    />
                  </label>
                ))}
              </div>
            )}

            {SHAPE_SLIDERS.map(([field, label]) => (
              <label key={field} className={styles.field}>
                <span className={styles.label}>{label} <strong>{look[field]} %</strong></span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={look[field]}
                  onChange={(e) => setLookField({ [field]: e.target.value })}
                  className={styles.slider}
                />
              </label>
            ))}

            <span className={styles.label}>Effet</span>
            <div className={styles.effectRow}>
              {BROW_EFFECTS.map((effect) => (
                <button
                  key={effect.id}
                  type="button"
                  aria-pressed={look.effectId === effect.id}
                  className={`${styles.effectChip} ${look.effectId === effect.id ? styles.effectChipActive : ''}`}
                  onClick={() => setLookField({ effectId: effect.id })}
                  title={effect.hint}
                >
                  {effect.label}
                </button>
              ))}
            </div>

            {isCustomized(look) && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLook(resetShape(look))}>
                <Icon name="arrow-left" size={13} /> Revenir au modèle
              </button>
            )}
          </>
        )}

        {panel === 'color' && (
          <>
            <span className={styles.label}>Nuancier · n°{tone.number} {tone.label}</span>
            <div className={styles.swatches} role="radiogroup" aria-label="Nuancier">
              {BROW_TONES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={look.toneId === t.id}
                  className={`${styles.swatch} ${look.toneId === t.id ? styles.swatchActive : ''}`}
                  onClick={() => setLookField({ toneId: t.id })}
                  title={`n°${t.number} ${t.label}`}
                >
                  <span className={styles.chip} style={{ background: t.hex }} aria-hidden="true" />
                  <span className={styles.swatchLabel}>n°{t.number}<br />{t.label}</span>
                </button>
              ))}
            </div>

            {COLOR_SLIDERS.map(([field, label]) => (
              <label key={field} className={styles.field}>
                <span className={styles.label}>{label} <strong>{look[field]} %</strong></span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={look[field]}
                  onChange={(e) => setLookField({ [field]: e.target.value })}
                  className={styles.slider}
                />
              </label>
            ))}
          </>
        )}

        {panel === 'simulation' && (
          <BrowSimulation client={client} look={look} onApplyAdvice={(patch) => setLookField(patch)} />
        )}

        {panel === 'session' && (
          <>
            <div className={styles.row2}>
              <label className={styles.field}>
                <span className={styles.label}>Prestation</span>
                <select className="input-field" value={session.service} onChange={(e) => changeService(e.target.value)}>
                  {BROW_SERVICES.map((s) => <option key={s.value} value={s.value}>{s.value}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Temps de pose (min)</span>
                <input
                  type="number"
                  min={0}
                  className="input-field"
                  value={session.processingMinutes}
                  onChange={(e) => setSession((s) => normalizeBrowSession({ ...s, processingMinutes: e.target.value }))}
                />
              </label>
            </div>

            <label className={styles.field}>
              <span className={styles.label}>Date</span>
              <input
                type="date"
                className="input-field"
                value={session.date || todayISO()}
                onChange={(e) => setSession((s) => normalizeBrowSession({ ...s, date: e.target.value }))}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Produits utilisés</span>
              <input
                className="input-field"
                value={session.products}
                placeholder="Teinture, oxydant, colle de lift…"
                onChange={(e) => setSession((s) => normalizeBrowSession({ ...s, products: e.target.value }))}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Notes</span>
              <textarea
                className="input-field"
                rows={3}
                value={session.notes}
                placeholder="Réaction, rendu obtenu, à ajuster la prochaine fois…"
                onChange={(e) => setSession((s) => normalizeBrowSession({ ...s, notes: e.target.value }))}
              />
            </label>
          </>
        )}

        <div className={styles.actions}>
          <button type="button" className="btn btn-primary" onClick={save}>
            <Icon name="check" size={15} /> {editingId ? 'Enregistrer les modifications' : 'Enregistrer la séance'}
          </button>
          {editingId && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Nouvelle séance</button>
          )}
        </div>
      </div>

      <BrowTimeline sessions={sessions} onOpen={edit} />

      <div className={styles.history}>
        <h3 className={styles.historyTitle}>Séances précédentes</h3>
        {sessions.length === 0 ? (
          <p className={styles.empty}>Aucune séance sourcils enregistrée pour cette cliente.</p>
        ) : (
          sessions.map((entry) => (
            <div key={entry.id} className={styles.historyRow}>
              <span
                className={styles.historyChip}
                style={{ background: toneById(normalizeLook(entry.look).toneId).hex }}
                aria-hidden="true"
              />
              <div className={styles.historyMain}>
                <strong>{formatDateLong(entry.date)}</strong>
                <span>{entry.summary || lookSummary(entry.look)}{entry.processingMinutes ? ` · ${entry.processingMinutes} min` : ''}</span>
              </div>
              <button type="button" className={styles.iconBtn} onClick={() => edit(entry)} aria-label={`Modifier la séance du ${formatDateLong(entry.date)}`}>
                <Icon name="edit" size={14} />
              </button>
              <button type="button" className={styles.iconBtn} onClick={() => remove(entry)} aria-label={`Supprimer la séance du ${formatDateLong(entry.date)}`}>
                <Icon name="trash" size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
