import { CreditCard, Check } from 'lucide-react';
import CurrentPlanBadge from './CurrentPlanBadge.jsx';

export default function PlanCard({
  name,
  priceDisplay,
  periodLabel,
  description,
  features,
  isCurrent,
  isEnterprise,
  isFree,
  onPrimaryClick,
  primaryDisabled,
  primaryLabel,
}) {
  const list = Array.isArray(features) && features.length > 0 ? features : description ? [description] : [];

  const ctaClass =
    isEnterprise || isFree
      ? 'hl-bill-card__cta hl-bill-card__cta--outline'
      : 'hl-bill-card__cta hl-bill-card__cta--upgrade';

  return (
    <section className={`hl-bill-card${isCurrent ? ' hl-bill-card--current' : ''}`}>
      <div className="hl-bill-card__top">
        <h2 className="hl-bill-card__name">{name}</h2>
        <CreditCard size={22} className="hl-bill-card__icon" aria-hidden />
      </div>
      <div className="hl-bill-card__price-row">
        <span className="hl-bill-card__amount">{priceDisplay}</span>
        {periodLabel ? <span className="hl-bill-card__period">{periodLabel}</span> : null}
      </div>
      {list.length > 0 && (
        <ul className="hl-bill-card__features">
          {list.map((f, i) => (
            <li key={i}>
              <Check size={16} className="hl-bill-card__check" aria-hidden />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      )}
      {isCurrent ? (
        <div className="hl-bill-card__cta hl-bill-card__cta--current">
          <CurrentPlanBadge />
        </div>
      ) : (
        <button
          type="button"
          className={ctaClass}
          onClick={onPrimaryClick}
          disabled={primaryDisabled}
        >
          {primaryLabel}
        </button>
      )}
    </section>
  );
}
