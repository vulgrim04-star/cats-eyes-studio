import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '../components/common/Icon';
import EmptyState from '../components/common/EmptyState';
import BottomSheet from '../components/common/BottomSheet';
import LashMapCanvas from '../components/lashmap/LashMapCanvas';
import LashSectorMenu from '../components/lashmap/LashSectorMenu';
import LashToolbar from '../components/lashmap/LashToolbar';
import LashQuickPicker from '../components/lashmap/LashQuickPicker';
import LashProperties from '../components/lashmap/LashProperties';
import LashNotes from '../components/lashmap/LashNotes';
import LashTimeline from '../components/lashmap/LashTimeline';
import LashHistory from '../components/lashmap/LashHistory';
import LashTemplates from '../components/lashmap/LashTemplates';
import LashExportMenu from '../components/lashmap/LashExportMenu';
import BrowStudio from '../components/lashmap/BrowStudio';
import LashSimulation from '../components/lashmap/LashSimulation';
import { useClient } from '../hooks/useClients';
import { useAppointments, getAppointmentsByClient } from '../hooks/useAppointments';
import { useSettings } from '../hooks/useSettings';
import { useToast } from '../hooks/useToast';
import { NEW_MAP_ID, useLashMapEditor } from '../hooks/useLashMapEditor';
import { useSectorInteractions } from '../hooks/useSectorInteractions';
import { SIDE_LABEL, changedSectorIndexes, diffLashMaps, eyeLengths, getEye, lengthRange } from '../utils/lashModel';
import { safetyMessage, unsafeSectors } from '../utils/lashSafety';
import { enabledModules, firstEnabled } from '../utils/modules';
import { buildSectors } from '../utils/lashGeometry';
import { estimateNextRetouchDate } from '../utils/lashCycle';
import { formatDateLong, todayISO } from '../utils/date';
import { fullName, initials } from '../utils/format';
import styles from './LashMapPage.module.css';

const SIDES = ['right', 'left'];

const STUDIO_TITLES = { lash: 'Lash Studio', brow: 'Brow Studio', simulation: 'Simulation' };
const STUDIO_SUBTITLES = { brow: 'Sourcils', simulation: 'Aperçu avant / après' };

/** Page d'édition d'une Lash Map — la pièce maîtresse de la fiche cliente.
 *
 * Un œil à la fois, en grand : pendant la pose, c'est le schéma qu'on regarde, pas un
 * formulaire. Tout le reste (propriétés, notes, historique) gravite autour, et sur
 * téléphone passe en feuille glissante pour ne jamais lui voler l'écran.
 */
export default function LashMapPage() {
  const { id, mapId } = useParams();
  const navigate = useNavigate();
  const client = useClient(id);
  const { appointments } = useAppointments();
  const { salon, modules } = useSettings();
  const { showToast } = useToast();

  // Les deux yeux sont montés en permanence (le second hors écran) : l'export PDF et
  // l'impression les sérialisent tous les deux sans avoir à changer d'onglet.
  const svgs = useRef({ left: null, right: null });

  // Le studio affiché. Les cils et les sourcils sont deux métiers qui se pratiquent dans
  // la même séance : deux onglets d'une même page, pas deux pages.
  const availableStudios = useMemo(() => enabledModules(modules), [modules]);
  const [studio, setStudio] = useState(() => firstEnabled(modules));
  // Le module qu'on regardait vient d'être masqué depuis les Réglages : on retombe sur le
  // premier actif plutôt que d'afficher une page vide.
  const activeStudio = availableStudios.some((m) => m.id === studio) ? studio : firstEnabled(modules);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [comparedId, setComparedId] = useState(null);

  const editor = useLashMapEditor(client, mapId);
  const { map, side, selected, dirty } = editor;
  const interactions = useSectorInteractions(editor, { onOpenPanel: () => setSheetOpen(true) });

  const clientAppointments = useMemo(
    () => (client ? getAppointmentsByClient(appointments, client.id) : []),
    [appointments, client]
  );

  const previousMaps = useMemo(() => {
    const maps = (client?.lashMaps ?? []).filter((m) => m.id !== editor.savedId);
    return [...maps].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [client, editor.savedId]);

  const compared = useMemo(() => previousMaps.find((m) => m.id === comparedId) ?? null, [previousMaps, comparedId]);
  const diff = useMemo(() => (compared ? diffLashMaps(map, compared) : null), [map, compared]);
  const changed = useMemo(() => (diff ? changedSectorIndexes(diff, side) : null), [diff, side]);

  const eye = getEye(map, side);
  const sectors = useMemo(
    () => buildSectors(eye.zones.length, { mirrored: side === 'left' }),
    [eye.zones.length, side]
  );

  // Garde-fou : les secteurs trop longs pour le cil naturel de CETTE cliente. Lu sur sa
  // fiche (type, état, longueur naturelle), pas sur un réglage du schéma.
  const unsafe = useMemo(() => unsafeSectors(eyeLengths(eye), client), [eye, client]);
  const unsafeIndexes = useMemo(() => new Set(unsafe.map((u) => u.index)), [unsafe]);
  const safetyText = useMemo(() => safetyMessage(eyeLengths(eye), client), [eye, client]);

  const handleSave = useCallback(() => {
    const savedId = editor.save();
    if (!savedId) return;
    showToast('Lash map enregistrée', 'success');
    if (mapId === NEW_MAP_ID) navigate(`/clientes/${id}/lash-map/${savedId}`, { replace: true });
  }, [editor, showToast, mapId, navigate, id]);

  const confirmLeave = useCallback(
    () => !dirty || window.confirm('Des modifications ne sont pas enregistrées. Quitter quand même ?'),
    [dirty]
  );

  if (!client) {
    return <EmptyState icon="users" title="Cliente introuvable" subtitle="Cette fiche a peut-être été supprimée." />;
  }

  const lastVisit = clientAppointments.find((a) => a.date <= todayISO());
  const nextVisit = [...clientAppointments].reverse().find((a) => a.date > todayISO());
  const suggestedRetouch = estimateNextRetouchDate(map.date, map.fillCycle);
  const otherSide = side === 'left' ? 'right' : 'left';
  const openMenuSector = interactions.menuIndex === null ? null : sectors[interactions.menuIndex];
  // Résumé de ce qui a été repris : sans lui, le bandeau annonce une reprise sans dire
  // laquelle, et il faut aller vérifier dans le panneau ce qui a été pré-rempli.
  const carriedSummary = [eye.global.style, eye.global.curl, `${eye.global.diameter} mm`, lengthRange(eye)]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.backLink}
          onClick={() => confirmLeave() && navigate(`/clientes/${id}`)}
        >
          <Icon name="arrow-left" size={15} /> Retour
        </button>

        <div className={styles.headerTitle}>
          <h1 className={styles.title}>{STUDIO_TITLES[activeStudio]}</h1>
          <span className={styles.subtitle}>{STUDIO_SUBTITLES[activeStudio] ?? SIDE_LABEL[side]}</span>
        </div>

        <div className={styles.headerActions}>
          {/* Enregistrement et export ne concernent que la lash map : le Brow Studio a
              son propre bouton, au bas de son panneau, et n'a rien à exporter. */}
          {activeStudio === 'lash' && (
            <>
              {dirty && (
                <span className={styles.dirtyFlag}>
                  <span className={styles.dirtyDot} aria-hidden="true" /> Non enregistré
                </span>
              )}
              <LashExportMenu client={client} map={map} salon={salon} svgs={svgs} side={side} />
              <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={!dirty}>
                <Icon name="check" size={15} /> Enregistrer
              </button>
            </>
          )}
        </div>
      </header>

      <div className={styles.studioTabs} role="tablist" aria-label="Studio affiché">
        {availableStudios.map(({ id: value, label, icon }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={activeStudio === value}
            className={`${styles.studioTab} ${activeStudio === value ? styles.studioTabActive : ''}`}
            onClick={() => setStudio(value)}
          >
            <Icon name={icon} size={15} /> {label}
          </button>
        ))}
      </div>

      <section className={styles.clientBar}>
        <span className={styles.avatar}>{initials(client.firstName, client.lastName)}</span>
        <div className={styles.clientIdentity}>
          <strong>{fullName(client)}</strong>
          <span>Cliente depuis {formatDateLong(client.createdAt)}</span>
        </div>
        <dl className={styles.clientFacts}>
          <div>
            <dt>Dernier rendez-vous</dt>
            <dd>{lastVisit ? formatDateLong(lastVisit.date) : '—'}</dd>
          </div>
          <div>
            <dt>Prochain rendez-vous</dt>
            <dd>
              {nextVisit
                ? formatDateLong(nextVisit.date)
                : suggestedRetouch
                  ? `${formatDateLong(suggestedRetouch)} · suggéré`
                  : '—'}
            </dd>
          </div>
          <div>
            <dt>Séance</dt>
            <dd>{map.poseType}</dd>
          </div>
        </dl>
      </section>

      {activeStudio === 'brow' && <BrowStudio client={client} />}

      {activeStudio === 'simulation' && <LashSimulation client={client} map={map} side={side} />}

      {activeStudio === 'lash' && (
      <>
      {editor.carriedFrom && (
        <div className={styles.carryBanner}>
          <Icon name="check-circle" size={16} />
          <div className={styles.carryText}>
            <strong>Repris de la séance du {formatDateLong(editor.carriedFrom.date)}</strong>
            <span>{carriedSummary} — modifie ce qui change, le reste est déjà là.</span>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={editor.startBlank}>
            Repartir d’une fiche vierge
          </button>
        </div>
      )}

      <div className={styles.layout}>
        <main className={styles.canvasColumn}>
          <div className={styles.eyeTabs} role="tablist" aria-label="Œil affiché">
            {SIDES.map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={side === value}
                className={`${styles.eyeTab} ${side === value ? styles.eyeTabActive : ''}`}
                onClick={() => { editor.setSide(value); editor.setSelected(null); interactions.closeMenu(); }}
              >
                {SIDE_LABEL[value]}
              </button>
            ))}
          </div>

          {safetyText && (
            <div className={styles.safetyBanner} role="status">
              <Icon name="alert-triangle" size={17} />
              <p className={styles.safetyText}>{safetyText}</p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  // On ramène à la limite, on ne réécrit pas la pose : les secteurs qui
                  // la respectent gardent exactement la valeur choisie.
                  unsafe.forEach((sector) => editor.setLength(sector.index, sector.maxMm));
                  showToast(`${unsafe.length} secteur(s) ramené(s) à ${unsafe[0].maxMm} mm`, 'success');
                }}
              >
                Ramener à {unsafe[0].maxMm} mm
              </button>
            </div>
          )}

          <div className={styles.canvasWrap}>
            <LashMapCanvas
              ref={(node) => { svgs.current[side] = node; }}
              map={map}
              side={side}
              selectedIndex={selected}
              changedIndexes={changed}
              unsafeIndexes={unsafeIndexes}
              dropIndex={interactions.dropIndex}
              onSelect={interactions.select}
              onActivate={interactions.activate}
              onSectorPointerDown={interactions.pointerDown}
              onSectorKeyDown={interactions.keyDown}
              onSectorDragOver={interactions.dragOver}
              onSectorDragLeave={interactions.dragLeave}
              onSectorDrop={interactions.drop}
            />

            {openMenuSector && (
              <LashSectorMenu
                sector={openMenuSector}
                currentLength={eye.zones[interactions.menuIndex].length}
                onPick={(value) => editor.setLength(interactions.menuIndex, value)}
                onClose={interactions.closeMenu}
              />
            )}
          </div>

          <LashToolbar editor={editor} onOpenTemplates={() => setTemplatesOpen(true)} onUndo={interactions.undo} />

          <LashQuickPicker editor={editor} selectedIndex={selected} />

          <button type="button" className={`btn btn-secondary ${styles.sheetTrigger}`} onClick={() => setSheetOpen(true)}>
            <Icon name="settings" size={15} /> Réglages détaillés
          </button>
        </main>

        <aside className={styles.panelColumn}>
          <LashProperties editor={editor} eye={eye} lengthLabel={lengthRange(eye)} />
        </aside>
      </div>

      <LashNotes editor={editor} suggestedRetouch={suggestedRetouch} />

      <LashHistory previousMaps={previousMaps} comparedId={comparedId} onCompare={setComparedId} diff={diff} />

      <LashTimeline
        maps={previousMaps}
        currentId={editor.savedId}
        onOpen={(target) => confirmLeave() && navigate(`/clientes/${id}/lash-map/${target.id}`)}
      />

      {/* Second œil, monté hors écran : sert uniquement aux exports (PDF, impression). */}
      <div className={styles.exportStage} aria-hidden="true">
        <LashMapCanvas
          ref={(node) => { svgs.current[otherSide] = node; }}
          map={map}
          side={otherSide}
          readOnly
        />
      </div>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={selected === null ? 'Réglages de l’œil' : `Secteur ${selected + 1}`}
      >
        <LashProperties editor={editor} eye={eye} lengthLabel={lengthRange(eye)} embedded />
      </BottomSheet>

      <LashTemplates open={templatesOpen} onClose={() => setTemplatesOpen(false)} editor={editor} />
      </>
      )}
    </div>
  );
}
