import { Lock } from 'lucide-react';

export default function PasswordCard({
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  onSubmit,
  savingPassword,
}) {
  return (
    <section className="hl-set-card">
      <div className="hl-set-card__header">
        <div className="hl-set-card__icon hl-set-card__icon--password">
          <Lock size={20} strokeWidth={2} />
        </div>
        <div>
          <h2 className="hl-set-card__title">Password</h2>
          <p className="hl-set-card__subtitle">Change your password to keep your account secure</p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="hl-set-form">
        <div className="hl-set-field">
          <label className="hl-set-label" htmlFor="hl-current-pw">
            Current password
          </label>
          <input
            id="hl-current-pw"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="hl-set-input"
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>
        <div className="hl-set-field">
          <label className="hl-set-label" htmlFor="hl-new-pw">
            New password
          </label>
          <input
            id="hl-new-pw"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="hl-set-input"
            placeholder=""
            autoComplete="new-password"
          />
        </div>
        <button type="submit" disabled={savingPassword} className="hl-set-btn hl-set-btn--outline">
          {savingPassword ? 'Updating…' : 'Change password'}
        </button>
      </form>
    </section>
  );
}
