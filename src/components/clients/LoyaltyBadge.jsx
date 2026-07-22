import { loyaltyTier } from '../../utils/loyalty';

export default function LoyaltyBadge({ completedCount, size = 'md' }) {
  const tier = loyaltyTier(completedCount);
  return (
    <span
      className="badge"
      style={{
        background: tier.bg,
        color: tier.color,
        fontSize: size === 'sm' ? '0.68rem' : undefined,
        padding: size === 'sm' ? '3px 9px' : undefined,
      }}
    >
      {tier.label}
    </span>
  );
}
