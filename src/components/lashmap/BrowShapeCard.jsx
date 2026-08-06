import BrowCard from './BrowCard';
import BrowCanvas from './BrowCanvas';
import { BROW_SHAPES } from '../../utils/browShapes';
import styles from './styles/BrowStudio.module.css';

/** Vignettes allégées : dix paires de sourcils redessinées à chaque réglage, c'est le bloc
 *  le plus coûteux du module. À cette taille, un poil sur trois suffit largement — la
 *  silhouette, seule chose lisible dans une vignette, ne change pas. */
const THUMB_HAIRS = 130;

/** Bibliothèque de formes.
 *
 *  Chaque vignette est le vrai dessin de la forme AVEC les réglages en cours (teinte,
 *  épaisseur, effet) : on voit ce qu'on obtiendrait, pas une icône générique. C'est ce qui
 *  permet à la cliente de choisir en regardant plutôt qu'en lisant.
 */
export default function BrowShapeCard({ look, onChange, embedded = false }) {
  return (
    <BrowCard title="Forme du sourcil" icon="sparkles" embedded={embedded}>
      <div className={styles.shapeGrid}>
        {BROW_SHAPES.map((shape) => (
          <button
            key={shape.id}
            type="button"
            aria-pressed={look.shapeId === shape.id}
            className={`${styles.shapeCard} ${look.shapeId === shape.id ? styles.shapeCardActive : ''}`}
            onClick={() => onChange({ shapeId: shape.id })}
            title={shape.hint}
          >
            <BrowCanvas look={{ ...look, shapeId: shape.id }} readOnly hairCount={THUMB_HAIRS} />
            <span className={styles.shapeName}>{shape.label}</span>
          </button>
        ))}
      </div>
    </BrowCard>
  );
}
