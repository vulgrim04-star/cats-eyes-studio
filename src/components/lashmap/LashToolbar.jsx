import Icon from '../common/Icon';
import { SECTOR_MAX, SECTOR_MIN } from '../../utils/lashGeometry';
import { SIDE_LABEL, getEye } from '../../utils/lashModel';
import styles from './styles/LashMap.module.css';

/** Actions qui portent sur l'œil entier : nombre de secteurs, symétrie, modèles.
 *  Tout ce qui est plus fin se fait sur le schéma lui-même. */
export default function LashToolbar({ editor, onOpenTemplates, onUndo }) {
  const eye = getEye(editor.map, editor.side);
  const count = eye.zones.length;
  const otherSide = editor.side === 'left' ? 'right' : 'left';

  return (
    <div className={styles.toolbar}>
      <div className={styles.stepper}>
        <button
          type="button"
          className={styles.stepperBtn}
          onClick={() => editor.setSectorCount(count - 1)}
          disabled={count <= SECTOR_MIN}
          aria-label="Retirer un secteur"
        >
          −
        </button>
        <span className={styles.stepperCount}>{count} secteurs</span>
        <button
          type="button"
          className={styles.stepperBtn}
          onClick={() => editor.setSectorCount(count + 1)}
          disabled={count >= SECTOR_MAX}
          aria-label="Ajouter un secteur"
        >
          +
        </button>
      </div>

      <button type="button" className="btn btn-ghost btn-sm" onClick={onOpenTemplates}>
        <Icon name="sparkles" size={14} /> Modèles
      </button>

      <button type="button" className="btn btn-ghost btn-sm" onClick={editor.copyToOtherEye}>
        <Icon name="eye" size={14} /> Copier vers l’{SIDE_LABEL[otherSide].toLowerCase()}
      </button>

      <button type="button" className="btn btn-ghost btn-sm" onClick={editor.mirrorCurrentEye}>
        <Icon name="arrow-left" size={14} /> Inverser le dégradé
      </button>

      <div className={styles.toolbarSpacer} />

      <button type="button" className="btn btn-ghost btn-sm" onClick={onUndo} disabled={!editor.canUndo()}>
        <Icon name="arrow-left" size={14} /> Annuler
      </button>
    </div>
  );
}
