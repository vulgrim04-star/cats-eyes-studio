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
import { LashObservations, LashSessionFields } from '../components/lashmap/LashNotes';
import LashTimeline from '../components/lashmap/LashTimeline';
import LashHistory from '../components/lashmap/LashHistory';
import LashTemplates from '../components/lashmap/LashTemplates';
import LashExportMenu from '../components/lashmap/LashExportMenu';
import StudioCard from '../components/lashmap/StudioCard';
import BrowStudio from '../components/lashmap/BrowStudio';
import { useClient } from '../hooks/useClients';
import { useAppointments, getAppointmentsByClient } from '../hooks/useAppointments';
import { useSettings } from '../hooks/useSettings';
import { useToast } from '../hooks/useToast';
import { NEW_MAP_ID, useLashMapEditor } from '../hooks/useLashMapEditor';
import { useSectorInteractions } from '../hooks/useSectorInteractions';
import { SIDE_LABEL, changedSectorIndexes, diffLashMaps, eyeLengths, getEye, lengthRange } from '../utils/lashModel';
import { safetyMessage, unsafeSectors } from '../utils/lashSafety';
import { MODULES } from '../utils/modules';
import {
  availablePrestations,
  lastPrestation,
  shouldOfferChoice,
  studiosFor,
} from '../utils/prestation';
import { buildSectors } from '../utils/lashGeometry';
import { estimateNextRetouchDate } from '../utils/lashCycle';
import { formatDateLong, todayISO } from '../utils/date';
import { fullName, initials } from '../utils/format';
import { DESKTOP_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
// Nommé `layout` et non `studio` : la page a déjà un état du même nom — le studio
// affiché — qui masquait cet import silencieusement. Toutes les classes sortaient alors
// `undefined`, donc une page entièrement sans styles, sans la moindre erreur au build.
import layout from '../components/lashmap/styles/studio.module.css';
import styles from './LashMapPage.module.css';

const SIDES = ['right', 'left'];

/** Les cartes vers lesquelles les raccourcis de la barre de contexte font défiler. Un seul
 *  tableau, pour que la barre et les cartes ne puissent pas diverger. */
const LASH_SECTIONS = [
  { id: 'properties', label: 'Réglages', icon: 'settings' },
  { id: 'session', label: 'Séance', icon: 'clipboard' },
  { id: 'notes', label: 'Notes', icon: 'edit' },
  { id: 'history', label: 'Historique', icon: 'clock' },
];

/** Les deux vues du schéma.
 *
 *  FERMÉ est la planche de travail : c'est la position de pose, et c'est la seule où les
 *  secteurs peuvent s'ouvrir en éventail au-dessus de la paupière. OUVERT est un aperçu du
 *  rendu — ce que la cliente verra en se relevant, qu'un dégradé 9-13 lu à plat ne dit pas.
 */
const VIEWS = [
  { id: 'closed', label: 'Fermé', hint: 'La planche de travail : c’est ici qu’on règle.' },
  { id: 'open', label: 'Ouvert', hint: 'Aperçu du rendu, yeux ouverts.' },
];

const STUDIO_TITLES = { lash: 'Lash Studio', brow: 'Brow Lift' };
const STUDIO_SUBTITLES = { brow: 'Sourcils' };

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
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const cardRefs = useRef({});

  // Les deux yeux sont montés en permanence (le second hors écran) : l'export PDF et
  // l'impression les sérialisent tous les deux sans avoir à changer d'onglet.
  const svgs = useRef({ left: null, right: null });

  // La prestation du jour. Elle n'est pas le réglage des Paramètres : celui-ci dit ce que
  // le salon PRATIQUE, celle-ci ce qu'on fait AUJOURD'HUI chez cette cliente. Amorcée sur
  // la dernière séance, parce qu'une cliente qui vient pour les deux depuis un an revient
  // le plus souvent pour les deux.
  const pastSessions = useMemo(
    () => [...(client?.lashMaps ?? []), ...(client?.browSessions ?? [])],
    [client]
  );
  const [prestation, setPrestation] = useState(() => lastPrestation(pastSessions, modules));
  const prestationChoices = useMemo(() => availablePrestations(modules), [modules]);
  const offerChoice = shouldOfferChoice(modules);

  // Le studio affiché. Les cils et les sourcils sont deux métiers qui se pratiquent dans
  // la même séance : deux onglets d'une même page, pas deux pages.
  const studioIds = useMemo(() => studiosFor(prestation, modules), [prestation, modules]);
  const availableStudios = useMemo(
    () => studioIds.map((sid) => MODULES.find((m) => m.id === sid)).filter(Boolean),
    [studioIds]
  );
  const [studio, setStudio] = useState(() => studiosFor(prestation, modules)[0]);
  // Le module qu'on regardait vient d'être masqué — depuis les Réglages, ou parce qu'on a
  // changé de prestation. On retombe sur le premier disponible plutôt que sur une page vide.
  const activeStudio = studioIds.includes(studio) ? studio : studioIds[0];
  const [view, setView] = useState('closed');
  // Une fois ouverte, la vue le reste — montée, simplement rendue transparente. La démonter
  // à chaque retour sur la planche régénérerait la frange, et le fondu n'aurait alors rien
  // à croiser.
  const [openMounted, setOpenMounted] = useState(false);
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
    // La prestation part avec la fiche : sans elle, l'historique dirait quels cils ont été
    // posés mais plus si la séance comprenait aussi les sourcils.
    const savedId = editor.save({ prestation });
    if (!savedId) return;
    showToast('Lash map enregistrée', 'success');
    if (mapId === NEW_MAP_ID) navigate(`/clientes/${id}/lash-map/${savedId}`, { replace: true });
  }, [editor, prestation, showToast, mapId, navigate, id]);

  /** Sur ordinateur, un raccourci fait défiler jusqu'à la carte ; sur téléphone il ouvre la
   *  feuille glissante, la colonne n'y étant pas montée. */
  const openSection = useCallback(
    (sectionId) => {
      if (sectionId === 'properties' && !isDesktop) {
        setSheetOpen(true);
        return;
      }
      cardRefs.current[sectionId]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },
    [isDesktop]
  );

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

      {/* La prestation d'abord, les onglets ensuite : on décide de ce qu'on fait, puis on
          travaille. Le sélecteur disparaît quand le salon ne pratique qu'un métier — un
          choix qui n'en est pas un n'est pas un réglage. */}
      {offerChoice && (
        <div className={styles.prestationRow} role="group" aria-label="Prestation du jour">
          <span className={styles.prestationLabel}>Séance</span>
          {prestationChoices.map(({ id: value, label, hint }) => (
            <button
              key={value}
              type="button"
              aria-pressed={prestation === value}
              className={`${styles.prestationChip} ${prestation === value ? styles.prestationChipActive : ''}`}
              onClick={() => setPrestation(value)}
              title={hint}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Un rang d'onglets à un seul onglet n'est pas une navigation, c'est une étiquette :
          le titre de la page dit déjà où l'on est. Même règle que le sélecteur de
          prestation, qui disparaît lui aussi quand il n'y a rien à choisir. */}
      {availableStudios.length > 1 && (
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
      )}

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

      {activeStudio === 'brow' && <BrowStudio client={client} prestation={prestation} />}

      {activeStudio === 'lash' && (
        <div className={layout.wrap}>
          {/* Barre de contexte : l'état de la séance, et où sont les réglages. La cliente
              est déjà nommée juste au-dessus par la page — la répéter serait du bruit. */}
          <header className={layout.contextBar}>
            <span className={layout.contextState}>
              <Icon name={editor.carriedFrom ? 'check-circle' : 'clock'} size={15} />
              {editor.carriedFrom
                ? `Repris de la séance du ${formatDateLong(editor.carriedFrom.date)} — ${carriedSummary}`
                : `${formatDateLong(map.date)} · ${map.poseType}`}
            </span>

            {editor.carriedFrom && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={editor.startBlank}>
                Repartir d’une fiche vierge
              </button>
            )}

            <nav className={layout.shortcuts} aria-label="Aller au réglage">
              {LASH_SECTIONS.map(({ id: sectionId, label, icon }) => (
                <button
                  key={sectionId}
                  type="button"
                  className={layout.shortcut}
                  onClick={() => openSection(sectionId)}
                >
                  <Icon name={icon} size={14} />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </header>

          <section className={layout.stage}>
            <header className={layout.stageHead}>
              <h2 className={layout.stageTitle}>
                <Icon name="eye" size={15} /> Schéma
              </h2>
              <div className={layout.stageActions}>
                <div className={layout.chipRow} role="tablist" aria-label="Œil affiché">
                  {SIDES.map((value) => (
                    <button
                      key={value}
                      type="button"
                      role="tab"
                      aria-selected={side === value}
                      className={`${layout.chip} ${side === value ? layout.chipActive : ''}`}
                      onClick={() => { editor.setSide(value); editor.setSelected(null); interactions.closeMenu(); }}
                    >
                      {SIDE_LABEL[value]}
                    </button>
                  ))}
                </div>

                <div className={layout.chipRow} role="tablist" aria-label="Vue du schéma">
                  {VIEWS.map(({ id: value, label, hint }) => (
                    <button
                      key={value}
                      type="button"
                      role="tab"
                      title={hint}
                      aria-selected={view === value}
                      className={`${layout.chip} ${view === value ? layout.chipActive : ''}`}
                      onClick={() => {
                        if (value === 'open') setOpenMounted(true);
                        setView(value);
                        interactions.closeMenu();
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </header>

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

            <div className={layout.canvasFrame}>
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

              {/* La vue ouverte est posée EN SURIMPRESSION, et la planche reste montée
                  dessous. Deux raisons, et la seconde est la vraie : la bascule se fait en
                  fondu sans redessiner 240 cils, et surtout c'est la PLANCHE qui garde la
                  référence d'export — un PDF ou une impression sortent la fiche technique,
                  jamais l'aperçu, quelle que soit la vue affichée au moment du clic.
                  Montée à la première ouverture seulement : sur téléphone, doubler le SVG
                  d'entrée de jeu se paierait au chargement pour une vue qu'on n'ouvrira
                  peut-être jamais. */}
              {openMounted && (
                <div
                  className={`${styles.openView} ${view === 'open' ? styles.openViewOn : ''}`}
                  aria-hidden={view !== 'open'}
                >
                  <LashMapCanvas map={map} side={side} view="open" />
                </div>
              )}

              {openMenuSector && view === 'closed' && (
                <LashSectorMenu
                  sector={openMenuSector}
                  currentLength={eye.zones[interactions.menuIndex].length}
                  onPick={(value) => editor.setLength(interactions.menuIndex, value)}
                  onClose={interactions.closeMenu}
                />
              )}
            </div>

            {view === 'open' && (
              <p className={layout.stageCaption}>
                Aperçu du rendu, yeux ouverts. Les réglages continuent de s’appliquer en
                direct ; le découpage en secteurs, lui, ne se manipule que sur la planche fermée.
              </p>
            )}

            <LashToolbar editor={editor} onOpenTemplates={() => setTemplatesOpen(true)} onUndo={interactions.undo} />

            <LashQuickPicker editor={editor} selectedIndex={selected} />
          </section>

          {/* Colonne montée seulement sur ordinateur : sur téléphone les mêmes réglages
              vivent dans la feuille glissante, et les monter deux fois redessinerait le
              schéma pour rien. */}
          {isDesktop && (
            <div className={`${layout.column} scrollbar-hidden`}>
              <div ref={(node) => { cardRefs.current.properties = node; }} className={layout.columnSlot}>
                <StudioCard title="Réglages de l’œil" icon="settings" hint={lengthRange(eye)}>
                  <LashProperties editor={editor} eye={eye} lengthLabel={lengthRange(eye)} embedded />
                </StudioCard>
              </div>

              <div ref={(node) => { cardRefs.current.session = node; }} className={layout.columnSlot}>
                <StudioCard title="Séance" icon="clipboard">
                  <LashSessionFields editor={editor} />
                </StudioCard>
              </div>
            </div>
          )}

          <div className={layout.band}>
            {/* Sur téléphone la colonne n'est pas montée : la Séance revient ici, sinon
                elle deviendrait injoignable. */}
            {!isDesktop && (
              <StudioCard title="Séance" icon="clipboard">
                <LashSessionFields editor={editor} />
              </StudioCard>
            )}

            <div ref={(node) => { cardRefs.current.notes = node; }}>
              <StudioCard title="Notes & observations" icon="edit">
                <LashObservations editor={editor} />
              </StudioCard>
            </div>

            <div ref={(node) => { cardRefs.current.history = node; }}>
              <StudioCard title="Historique" icon="clock">
                {previousMaps.length === 0 ? (
                  <p className={layout.cardEmpty}>Première lash map de cette cliente.</p>
                ) : (
                  <>
                    <LashHistory
                      previousMaps={previousMaps}
                      comparedId={comparedId}
                      onCompare={setComparedId}
                      diff={diff}
                    />
                    <LashTimeline
                      maps={previousMaps}
                      currentId={editor.savedId}
                      onOpen={(target) => confirmLeave() && navigate(`/clientes/${id}/lash-map/${target.id}`)}
                    />
                  </>
                )}
              </StudioCard>
            </div>
          </div>

          {!isDesktop && (
            <div className={layout.mobileBar} role="group" aria-label="Réglages">
              <button type="button" className={layout.mobileBtn} onClick={() => setSheetOpen(true)}>
                <Icon name="settings" size={17} />
                <span>Réglages</span>
              </button>
              <button type="button" className={layout.mobileBtn} onClick={() => setTemplatesOpen(true)}>
                <Icon name="sparkles" size={17} />
                <span>Modèles</span>
              </button>
            </div>
          )}

          {/* Second œil, monté hors écran : sert uniquement aux exports (PDF, impression).
              Il ne doit JAMAIS disparaître d'une refonte de mise en page — sans lui, la
              fiche PDF sortirait avec un seul œil, sans que rien ne le signale. */}
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
        </div>
      )}
    </div>
  );
}
