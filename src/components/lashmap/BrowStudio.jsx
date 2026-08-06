import { useMemo, useRef, useState } from 'react';
import Icon from '../common/Icon';
import BottomSheet from '../common/BottomSheet';
import BrowStage from './BrowStage';
import BrowShapeCard from './BrowShapeCard';
import BrowShapeSliders from './BrowShapeSliders';
import BrowColorCard from './BrowColorCard';
import BrowAdviceCard from './BrowAdviceCard';
import BrowHistoryCard from './BrowHistoryCard';
import { BrowDetailsCard, BrowNotesCard, BrowProductsCard } from './BrowSessionCards';
import { useClients } from '../../hooks/useClients';
import { useToast } from '../../hooks/useToast';
import { UPLOAD_DEMO, uploadClientPhoto } from '../../utils/photoStorage';
import { createId } from '../../utils/id';
import { DESKTOP_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';
import { lookSummary, normalizeLook } from '../../utils/browShapes';
import { normalizeBrowSession, minutesForService } from '../../utils/browModel';
import { formatDateLong } from '../../utils/date';
import styles from './styles/BrowStudio.module.css';

/** Les réglages qui vivent dans la colonne de droite sur ordinateur, et dans une feuille
 *  glissante sur téléphone. Un seul tableau pour les deux : la barre du bas et les
 *  raccourcis de la barre de contexte s'en déduisent, donc rien ne peut diverger. */
const SECTIONS = [
  { id: 'shape', label: 'Forme', icon: 'sparkles' },
  { id: 'sliders', label: 'Réglages', icon: 'settings' },
  { id: 'color', label: 'Couleur', icon: 'droplet' },
  { id: 'session', label: 'Séance', icon: 'clipboard' },
];

/** Brow Lift — l'outil du brow artist.
 *
 *  Quatre zones visibles ensemble, jamais empilées derrière des onglets : la scène au
 *  centre, les réglages en colonne à droite, le contexte de la cliente au-dessus, et en
 *  bandeau bas ce qui se consulte plutôt qu'il ne se règle — le conseil, l'historique, la
 *  prestation.
 *
 *  C'est le point de la refonte : dans la version à onglets, changer la teinte pendant
 *  qu'on regardait la simulation obligeait à quitter la simulation. On réglait donc à
 *  l'aveugle, ce qui est exactement ce qu'un outil de projection ne doit pas demander.
 */
export default function BrowStudio({ client, prestation }) {
  const { addBrowSession, updateBrowSession, removeBrowSession } = useClients();
  const { showToast } = useToast();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  const [look, setLook] = useState(() => normalizeLook(null));
  const [session, setSession] = useState(() => normalizeBrowSession(null));
  const [zone, setZone] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [sheet, setSheet] = useState(null);

  const cardRefs = useRef({});
  // La photo et son rendu, remontés par la scène. Dans une référence et non dans l'état :
  // ils ne changent rien à l'affichage du studio, et les y mettre relancerait tout l'arbre
  // à chaque repeinte de la simulation.
  const snapshotRef = useRef(null);

  const sessions = useMemo(
    () => [...(client?.browSessions ?? [])].sort((a, b) => String(b.date).localeCompare(String(a.date))),
    [client]
  );

  const setLookField = (patch) => setLook((l) => normalizeLook({ ...l, ...patch }));
  const setSessionField = (patch) => setSession((s) => normalizeBrowSession({ ...s, ...patch }));

  /** Retouche de la zone retenue. Elle s'ajoute au modèle sans le remplacer : on peut
   *  changer de forme ensuite et retrouver ses retouches. */
  const setZoneField = (field, value) =>
    setLook((l) =>
      normalizeLook({ ...l, zones: { ...l.zones, [zone]: { ...l.zones[zone], [field]: Number(value) } } })
    );

  const changeService = (service) => {
    const untouched = session.processingMinutes === minutesForService(session.service);
    setSession((s) =>
      normalizeBrowSession({
        ...s,
        service,
        processingMinutes: untouched ? minutesForService(service) : s.processingMinutes,
      })
    );
  };

  /** Sélection d'une zone : sur téléphone la colonne n'est pas à l'écran, on ouvre donc
   *  directement la feuille des réglages — sinon toucher une pastille ne ferait rien de
   *  visible. Sur ordinateur, on fait défiler la colonne jusqu'aux curseurs. */
  const selectZone = (id) => {
    setZone(id);
    if (!id) return;
    if (isDesktop) cardRefs.current.sliders?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    else setSheet('sliders');
  };

  const openSection = (id) => {
    if (isDesktop) cardRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    else setSheet(id);
  };

  /** Les deux images de la séance, envoyées au stockage.
   *
   *  L'« avant » est la photo importée, l'« après » le canvas composé — pas une capture
   *  d'écran ni une reconstitution : l'image exacte qu'on a montrée à la cliente ce
   *  jour-là. C'est ce qui rend l'historique utile plutôt que décoratif.
   *
   *  Un échec n'empêche JAMAIS l'enregistrement de la séance : les réglages valent bien
   *  plus que les vignettes, et perdre une prestation parce qu'un téléversement a échoué
   *  serait un très mauvais marché.
   */
  const capturePhotos = async () => {
    const snap = snapshotRef.current;
    if (!snap?.beforeSrc || !snap.canvas || !client?.id) return {};
    try {
      const [before, after] = await Promise.all([
        fetch(snap.beforeSrc).then((r) => r.blob()),
        new Promise((resolve) => snap.canvas.toBlob(resolve, 'image/jpeg', 0.85)),
      ]);
      if (!before || !after) return {};
      const photoId = createId('bsim');
      const target = { clientId: client.id, photoId };
      const [beforePath, afterPath] = await Promise.all([
        uploadClientPhoto(before, { ...target, side: 'before' }),
        uploadClientPhoto(after, { ...target, side: 'after' }),
      ]);
      // En démonstration il n'y a pas de session : le module le signale par un code dédié
      // plutôt que par un échec, et il faut le dire clairement au lieu de laisser croire à
      // une panne réseau.
      if (beforePath === UPLOAD_DEMO || afterPath === UPLOAD_DEMO) {
        showToast('Mode démonstration : la photo n’est pas conservée', 'warning');
        return {};
      }
      if (!beforePath || !afterPath) {
        showToast('Séance enregistrée, mais les photos n’ont pas pu être envoyées', 'warning');
        return {};
      }
      return { photoBeforePath: beforePath, photoAfterPath: afterPath };
    } catch {
      showToast('Séance enregistrée, mais les photos n’ont pas pu être envoyées', 'warning');
      return {};
    }
  };

  const save = async () => {
    const photos = await capturePhotos();
    // Le look complet est enregistré AVEC la séance : c'est ce qui permet de rouvrir une
    // prestation d'il y a six mois et de la rejouer à l'identique.
    // `prestation` vient de la page : elle vaut pour la séance entière, pas pour le seul
    // sourcil. C'est elle qui permettra plus tard de relire un historique et de savoir si
    // ce jour-là on avait aussi posé les cils.
    const payload = { ...session, prestation, look, summary: lookSummary(look), ...photos };
    if (editingId) {
      updateBrowSession(client.id, editingId, payload);
      showToast('Séance sourcils modifiée', 'success');
    } else {
      addBrowSession(client.id, payload);
      showToast('Séance sourcils enregistrée', 'success');
    }
    setEditingId(null);
    setSheet(null);
  };

  const edit = (entry) => {
    setEditingId(entry.id);
    setSession(normalizeBrowSession(entry));
    setLook(normalizeLook(entry.look));
    setZone(null);
  };

  const remove = (entry) => {
    if (!window.confirm(`Supprimer la séance du ${formatDateLong(entry.date)} ? Cette action est irréversible.`)) return;
    removeBrowSession(client.id, entry.id);
    if (editingId === entry.id) setEditingId(null);
  };

  const lastSession = sessions[0];

  const cardProps = (id) => ({ ref: (node) => { cardRefs.current[id] = node; } });

  /** Les cinq cartes de réglages, rendues soit en colonne, soit dans la feuille. Un seul
   *  endroit qui décide de leur contenu, pour que les deux ne divergent jamais. */
  const renderSection = (id, embedded = false) => {
    switch (id) {
      case 'shape':
        return <BrowShapeCard look={look} onChange={setLookField} embedded={embedded} />;
      case 'sliders':
        return (
          <BrowShapeSliders
            look={look}
            zone={zone}
            onChange={setLookField}
            onZoneChange={setZoneField}
            onCloseZone={() => setZone(null)}
            onReset={setLook}
            embedded={embedded}
          />
        );
      case 'color':
        return <BrowColorCard look={look} onChange={setLookField} embedded={embedded} />;
      case 'session':
        return (
          <>
            <BrowProductsCard session={session} onChange={setSessionField} embedded={embedded} />
            <BrowNotesCard session={session} onChange={setSessionField} embedded={embedded} />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.wrap}>
      {/* L'identité de la cliente est déjà portée par la page, juste au-dessus : cette
          barre ne dit que ce qui est propre au Brow Lift — de quelle séance il s'agit, et
          où sont les réglages. */}
      <header className={styles.contextBar}>
        <span className={styles.contextState}>
          <Icon name={editingId ? 'edit' : 'clock'} size={15} />
          {editingId
            ? `Séance du ${formatDateLong(session.date)} — en modification`
            : lastSession
              ? `Dernière séance le ${formatDateLong(lastSession.date)}`
              : 'Première séance sourcils'}
        </span>

        <nav className={styles.shortcuts} aria-label="Aller au réglage">
          {SECTIONS.map(({ id, label, icon }) => (
            <button key={id} type="button" className={styles.shortcut} onClick={() => openSection(id)}>
              <Icon name={icon} size={14} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </header>

      <BrowStage
        client={client}
        look={look}
        zone={zone}
        onSelectZone={selectZone}
        onChange={setLookField}
        onAnalysis={setAnalysis}
        onSnapshot={(snap) => { snapshotRef.current = snap; }}
      />

      {/* Colonne de réglages : montée seulement sur ordinateur. Sur téléphone, les mêmes
          cartes vivent dans la feuille glissante — les monter deux fois redessinerait dix
          paires de sourcils pour rien. */}
      {isDesktop && (
        <div className={`${styles.column} scrollbar-hidden`}>
          {SECTIONS.map(({ id }) => (
            <div key={id} {...cardProps(id)} className={styles.columnSlot}>
              {renderSection(id)}
            </div>
          ))}
        </div>
      )}

      <div className={styles.band}>
        <BrowAdviceCard analysis={analysis} look={look} onApply={setLookField} />
        <BrowHistoryCard sessions={sessions} onOpen={edit} onRemove={remove} />
        <BrowDetailsCard
          session={session}
          onChange={setSessionField}
          onChangeService={changeService}
          onSave={save}
          editing={Boolean(editingId)}
          onNew={() => setEditingId(null)}
        />
      </div>

      {!isDesktop && (
        <>
          <div className={styles.mobileBar} role="group" aria-label="Réglages">
            {SECTIONS.map(({ id, label, icon }) => (
              <button
                key={id}
                type="button"
                className={styles.mobileBtn}
                aria-expanded={sheet === id}
                onClick={() => setSheet(id)}
              >
                <Icon name={icon} size={17} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <BottomSheet
            open={sheet !== null}
            onClose={() => setSheet(null)}
            title={SECTIONS.find((s) => s.id === sheet)?.label ?? ''}
          >
            {sheet && renderSection(sheet, true)}
          </BottomSheet>
        </>
      )}
    </div>
  );
}
