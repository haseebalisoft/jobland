import { Search } from 'lucide-react';
import { HELP_ARTICLES } from './helpArticles.js';
import { getSupportAvailabilityLine } from './chatUtils.js';
import './chat-support.css';

export default function HomeTab({ firstName, onOpenMessages }) {
  const availability = getSupportAvailabilityLine();

  return (
    <div className="cs-home">
      <div className="cs-home__greet">
        <div className="cs-home__hi">
          Hi {firstName} 👋
        </div>
        <div className="cs-home__sub">How can we help?</div>
      </div>

      <button type="button" className="cs-card" onClick={onOpenMessages}>
        <div className="cs-card__text">
          <div className="cs-card__title">Message your BD</div>
          <div className="cs-card__sub">{availability}</div>
        </div>
        <span className="cs-card__arrow" aria-hidden>
          ›
        </span>
      </button>

      <div className="cs-home__search-label">
        <span>Search for help</span>
        <Search size={16} className="cs-home__search-icon" aria-hidden />
      </div>
      <ul className="cs-articles">
        {HELP_ARTICLES.map((a) => (
          <li key={a.id}>
            <a href={a.href} className="cs-article-link" target="_blank" rel="noopener noreferrer">
              <span>{a.title}</span>
              <span className="cs-article-link__chev">›</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
