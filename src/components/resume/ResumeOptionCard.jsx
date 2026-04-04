import { Loader2 } from 'lucide-react';

export default function ResumeOptionCard({
  icon: Icon,
  title,
  subtitle,
  onClick,
  loading = false,
  disabled = false,
  error = '',
}) {
  const inactive = disabled && !loading;
  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={inactive}
        className="cr-option-card"
        style={{
          opacity: inactive ? 0.5 : 1,
          pointerEvents: inactive ? 'none' : 'auto',
        }}
      >
        <span className="cr-option-card__icon-wrap" aria-hidden>
          {loading ? (
            <Loader2 className="cr-option-card__spinner" size={28} strokeWidth={2} />
          ) : (
            Icon && <Icon size={28} strokeWidth={2} className="cr-option-card__icon" />
          )}
        </span>
        <span className="cr-option-card__text">
          <span className="cr-option-card__title">{title}</span>
          <span className="cr-option-card__subtitle">{subtitle}</span>
        </span>
      </button>
      {error ? (
        <p className="cr-option-card__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
