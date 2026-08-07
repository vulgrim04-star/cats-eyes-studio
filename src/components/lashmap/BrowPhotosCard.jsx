import { useRef } from 'react';
import Icon from '../common/Icon';
import StoredImage from '../common/StoredImage';
import BrowCard from './BrowCard';
import { useToast } from '../../hooks/useToast';
import styles from './styles/BrowStudio.module.css';

/** Au-delà, un téléphone récent produit des fichiers que la fiche n'a pas à porter. */
const MAX_MO = 8;

const SLOTS = [
  { id: 'before', label: 'Avant' },
  { id: 'after', label: 'Après' },
];

/** Les deux photos de la séance, jointes à la main.
 *
 *  RIEN N'EST ANALYSÉ NI COMPOSÉ ICI. C'est le geste que font déjà les praticiennes pour
 *  leur portfolio : une photo au début, une à la fin. La frise d'historique les reprend
 *  ensuite, ce qui rend une séance d'il y a six mois réellement consultable.
 *
 *  Les fichiers ne partent qu'à l'ENREGISTREMENT de la séance. Téléverser au choix du
 *  fichier laisserait des images orphelines dans le stockage chaque fois qu'on change
 *  d'avis, et personne ne saurait qu'elles sont là.
 */
export default function BrowPhotosCard({ pending, stored, onPick, embedded = false }) {
  const { showToast } = useToast();
  const inputs = useRef({});

  const pick = (slot) => (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_MO * 1024 * 1024) {
      showToast(`Photo trop lourde (max ${MAX_MO} Mo)`, 'warning');
      return;
    }
    onPick(slot, file);
  };

  return (
    <BrowCard title="Photos de la séance" icon="camera" embedded={embedded}>
      <div className={styles.photoSlots}>
        {SLOTS.map(({ id, label }) => {
          const file = pending?.[id];
          const path = stored?.[id];
          return (
            <div key={id} className={styles.photoSlot}>
              <span className={styles.slotLabel}>{label}</span>

              <button
                type="button"
                className={styles.photoDrop}
                onClick={() => inputs.current[id]?.click()}
                aria-label={`${file || path ? 'Remplacer' : 'Ajouter'} la photo ${label.toLowerCase()}`}
              >
                {file ? (
                  <img src={URL.createObjectURL(file)} alt="" className={styles.photoThumb} />
                ) : path ? (
                  <StoredImage
                    path={path}
                    alt=""
                    className={styles.photoThumb}
                    placeholder={<Icon name="camera" size={20} />}
                  />
                ) : (
                  <>
                    <Icon name="upload" size={18} />
                    <span>Ajouter</span>
                  </>
                )}
              </button>

              <input
                ref={(node) => { inputs.current[id] = node; }}
                type="file"
                accept="image/*"
                hidden
                onChange={pick(id)}
              />

              {file && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onPick(id, null)}>
                  Retirer
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className={styles.cardFoot}>
        Elles partent avec la séance, à l’enregistrement, et alimentent la frise d’évolution.
      </p>
    </BrowCard>
  );
}
