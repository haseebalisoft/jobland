import { Search } from 'lucide-react';
import { HELP_ARTICLES } from './helpArticles.js';
import './chat-support.css';

export default function HelpTab({ search, onSearchChange, onChatWithUs, onViewAll }) {
  const q = search.trim().toLowerCase();
  const filtered = q
    ? HELP_ARTICLES.filter((a) => a.title.toLowerCase().includes(q))
    : HELP_ARTICLES;

  return (
    <div className="cs-help">
      <div className="cs-help__search-wrap">
        <Search size={18} className="cs-help__search-icon" aria-hidden />
        <input
          className="cs-help__search"
          placeholder="Search for articles..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <ul className="cs-help__articles">
        {filtered.map((a) => (
          <li key={a.id}>
            <a href={a.href} className="cs-help__article" target="_blank" rel="noopener noreferrer">
              {a.title}
            </a>
          </li>
        ))}
      </ul>
      <button type="button" className="cs-help__viewall" onClick={onViewAll}>
        View all articles
      </button>
      <div className="cs-help__contact">
        <button type="button" className="cs-help__link-btn" onClick={onChatWithUs}>
          Chat with us
        </button>
        <a className="cs-help__link-btn cs-help__link-btn--ghost" href="mailto:support@hirdlogic.com">
          Send email
        </a>
      </div>
    </div>
  );
}
