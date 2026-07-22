import Icon from './Icon';
import { useSettings } from '../../hooks/useSettings';

export default function BrandMark({ size = 34, radius = 'var(--radius-sm)', iconSize }) {
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
  };

  if (salon.logoUrl) {
    return (
      <span style={{ ...style, background: 'var(--color-cream)' }}>
        <img src={salon.logoUrl} alt={salon.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </span>
    );
  }

  return (
    <span style={{ ...style, background: 'linear-gradient(135deg, var(--color-rose), var(--color-rose-dark))', color: 'var(--color-white)' }}>
      <Icon name="scissors" size={iconSize ?? Math.round(size * 0.5)} />
    </span>
  );
}
