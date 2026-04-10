import { User } from 'lucide-react';

export default function ProfileCard({ fullName, setFullName, email, createdAt, onSubmit, savingProfile }) {
  return (
    <section className="hl-set-card">
      <div className="hl-set-card__header">
        <div className="hl-set-card__icon hl-set-card__icon--profile">
          <User size={20} strokeWidth={2} />
        </div>
        <div>
          <h2 className="hl-set-card__title">Profile</h2>
          <p className="hl-set-card__subtitle">Update your name and view account info</p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="hl-set-form">
        <div className="hl-set-field">
          <label className="hl-set-label" htmlFor="hl-full-name">
            Full Name
          </label>
          <input
            id="hl-full-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="hl-set-input"
          />
        </div>
        <div className="hl-set-field">
          <label className="hl-set-label" htmlFor="hl-email">
            Email
          </label>
          <input id="hl-email" type="email" value={email} readOnly className="hl-set-input hl-set-input--readonly" />
        </div>
        {createdAt ? (
          <p className="hl-set-meta">Member since {new Date(createdAt).toLocaleDateString()}</p>
        ) : null}
        <button type="submit" disabled={savingProfile} className="hl-set-btn hl-set-btn--primary">
          {savingProfile ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </section>
  );
}
