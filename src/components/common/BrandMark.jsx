import { useSettings } from '../../hooks/useSettings';

// On sert le PNG 192px (pas le 512px, réservé à l'icône PWA/manifest) car ce composant
// n'est jamais affiché à plus de ~56px : évite de télécharger ~6x plus de données que
// nécessaire sur chaque page pour les comptes sans logo personnalisé.
const DEFAULT_LOGO = '/icon-192.png';

export default function BrandMark({ size = 34, radius = 'var(--radius-sm)' }) {
  const { salon } = useSettings();

  const style = {
    width: size,
    height: size,
    borderRadius: radius,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
    background: 'var(--color-cream)',
  };

  return (
    <span style={style}>
      <img src={salon.logoUrl || DEFAULT_LOGO} alt={salon.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </span>
  );
}
