import { Link } from 'react-router-dom';
import { CreditCard } from 'lucide-react';

export default function SubscriptionCard({
  currentPlan,
  subscriptionStatus,
  renewDate,
  canCancelSubscription,
  showCancelConfirm,
  setShowCancelConfirm,
  cancelingSubscription,
  onCancelSubscription,
}) {
  return (
    <section className="hl-set-card">
      <div className="hl-set-card__header">
        <div className="hl-set-card__icon hl-set-card__icon--subscription">
          <CreditCard size={20} strokeWidth={2} />
        </div>
        <div>
          <h2 className="hl-set-card__title">Subscription</h2>
          <p className="hl-set-card__subtitle">Your current plan and billing</p>
        </div>
      </div>
      <div className="hl-set-sub-row">
        <span className="hl-set-sub-label">Current plan</span>
        <span className="hl-set-plan-badge">{currentPlan}</span>
      </div>
      <div className="hl-set-sub-row">
        <span className="hl-set-sub-label">Status</span>
        <span className={`hl-set-status hl-set-status--${subscriptionStatus === 'active' ? 'on' : 'off'}`}>{subscriptionStatus}</span>
      </div>
      <div className="hl-set-sub-row">
        <span className="hl-set-sub-label">Renews on</span>
        <span className="hl-set-sub-value">{renewDate}</span>
      </div>
      <Link to="/dashboard/billing" className="hl-set-manage-link">
        Manage billing →
      </Link>
      {canCancelSubscription && (
        <div className="hl-set-cancel-wrap">
          {!showCancelConfirm ? (
            <button
              type="button"
              className="hl-set-btn hl-set-btn--danger"
              onClick={() => setShowCancelConfirm(true)}
              disabled={cancelingSubscription}
            >
              Cancel subscription
            </button>
          ) : (
            <div className="hl-set-cancel-box">
              <p>This will cancel your paid subscription and move your account to the free plan.</p>
              <div className="hl-set-cancel-actions">
                <button
                  type="button"
                  className="hl-set-btn hl-set-btn--outline"
                  onClick={() => setShowCancelConfirm(false)}
                  disabled={cancelingSubscription}
                >
                  Keep subscription
                </button>
                <button
                  type="button"
                  className="hl-set-btn hl-set-btn--danger"
                  onClick={onCancelSubscription}
                  disabled={cancelingSubscription}
                >
                  {cancelingSubscription ? 'Canceling…' : 'Confirm cancel'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
