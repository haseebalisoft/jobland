import React, { useState } from 'react';
import {
  Monitor,
  Handshake,
  Briefcase,
  Phone,
  Crown,
  Users,
  TrendingUp,
  FileText,
  Code,
} from 'lucide-react';

const ICON_MAP = {
  technical: { Icon: Monitor, color: '#2563eb' },
  behavioral: { Icon: Handshake, color: '#10b981' },
  negotiation: { Icon: Briefcase, color: '#8b5cf6' },
  screening: { Icon: Phone, color: '#f59e0b' },
  leadership: { Icon: Crown, color: '#eab308' },
  situational: { Icon: Users, color: '#2563eb' },
  career_dev: { Icon: TrendingUp, color: '#10b981' },
  case_study: { Icon: FileText, color: '#2563eb' },
  code: { Icon: Code, color: '#2563eb' },
  phone: { Icon: Phone, color: '#f59e0b' },
};

export default function ScenarioCard({ scenario, locked, onStart, onUpgrade }) {
  const [hover, setHover] = useState(false);
  const meta = ICON_MAP[scenario.icon_type] || ICON_MAP.technical;
  const { Icon, color } = meta;

  return (
    <div
      className={`mi-card${hover ? ' mi-card--hover' : ''}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      role="article"
    >
      {scenario.is_premium && (
        <div className="mi-card__crown" title="Premium scenario">
          <Crown size={18} strokeWidth={2} />
        </div>
      )}
      <div className="mi-card__icon" style={{ color }}>
        <Icon size={22} strokeWidth={2} />
      </div>
      <h3 className="mi-card__title">{scenario.title}</h3>
      <p className="mi-card__desc">{scenario.description}</p>
      <div className="mi-card__footer">
        <span className="mi-card__duration">
          {scenario.duration_mins} Mins
        </span>
        {hover && !locked && (
          <button type="button" className="mi-card__start" onClick={() => onStart?.(scenario)}>
            Start Interview →
          </button>
        )}
        {hover && locked && (
          <button type="button" className="mi-card__start" onClick={() => onUpgrade?.(scenario)}>
            Upgrade →
          </button>
        )}
      </div>
      {hover && (
        <div className="mi-tooltip" role="tooltip">
          <p className="mi-tooltip__text">{scenario.description}</p>
          {Array.isArray(scenario.focus_areas) && scenario.focus_areas.length > 0 && (
            <div className="mi-tooltip__focus">
              <strong>Key areas to focus on:</strong>
              <ul>
                {scenario.focus_areas.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
