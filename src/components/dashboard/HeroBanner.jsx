import { useEffect, useMemo, useState } from 'react';

function getPartOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export default function HeroBanner({ firstName, urgentAction, profileScore }) {
  const [progress, setProgress] = useState(0);
  const ringSize = 132;
  const stroke = 10;
  const radius = (ringSize - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const t = setTimeout(() => setProgress(profileScore || 0), 120);
    return () => clearTimeout(t);
  }, [profileScore]);

  const dashOffset = useMemo(
    () => circumference - (Math.max(0, Math.min(100, progress)) / 100) * circumference,
    [circumference, progress],
  );

  const dayLine = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <section className="hero-banner">
      <div className="hero-orb hero-orb--one" />
      <div className="hero-orb hero-orb--two" />
      <div>
        <span className="hero-live">
          <span className="hero-live-dot" />
          Live
        </span>
        <h1>
          Good {getPartOfDay()},{' '}
          <span className="hero-name-grad">{firstName || 'there'}</span> 👋
        </h1>
        <p>{urgentAction || 'Your most urgent action appears here based on your activity.'}</p>
        <div className="hero-actions">
          <a className="hero-btn hero-btn--primary" href="/resume-maker">Build Resume</a>
          <a className="hero-btn hero-btn--ghost" href="/dashboard/mock-interviews">Practice Now</a>
        </div>
      </div>

      <div className="hero-score">
        <div className="hero-date">{dayLine}</div>
        <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`}>
          <defs>
            <linearGradient id="strengthGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--purple)" />
              <stop offset="100%" stopColor="var(--green)" />
            </linearGradient>
          </defs>
          <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} className="hero-ring-bg" />
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            className="hero-ring-fg"
            style={{
              strokeDasharray: `${circumference}px`,
              strokeDashoffset: `${dashOffset}px`,
            }}
          />
        </svg>
        <div className="hero-score-text">
          <strong>{Math.round(profileScore || 0)}%</strong>
          <span>Profile Strength</span>
        </div>
      </div>
    </section>
  );
}
