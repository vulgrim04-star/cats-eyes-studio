import { useSettings } from '../../hooks/useSettings';

const DEFAULT_LOGO = '/icon-512.png';

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
