import { ArrowRight } from 'lucide-react';
import { formatRelativeTime } from './chatUtils.js';
import './chat-support.css';

export default function MessagesTab({ leads = [], loading = false, onSelectLead, onOpenFullHelp }) {
  return (
    <div className="cs-messages">
      <h2 className="cs-messages__title">BD messages</h2>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: '#64748b', lineHeight: 1.45 }}>
        Choose a job you&apos;re working on with your BD. Each thread is tied to that lead — same as the full{' '}
        <button
          type="button"
          onClick={onOpenFullHelp}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: '#2563eb',
            cursor: 'pointer',
            textDecoration: 'underline',
            font: 'inherit',
          }}
        >
          Help
        </button>{' '}
        page.
      </p>
      <div className="cs-messages__list">
        {loading && <p className="cs-messages__empty">Loading your leads…</p>}
        {!loading && leads.length === 0 && (
          <p className="cs-messages__empty">
            No assigned leads yet. When your BD adds opportunities, they&apos;ll appear here for chat.
          </p>
        )}
        {!loading &&
          leads.map((lead) => (
            <button
              key={lead.id}
              type="button"
              className="cs-thread-row"
              onClick={() => onSelectLead(lead)}
            >
              <div className="cs-thread-row__avatar">
                <img src="/logo.png" alt="" />
              </div>
              <div className="cs-thread-row__body">
                <div className="cs-thread-row__top">
                  <span className="cs-thread-row__name">{lead.job_title || 'Role'}</span>
                  <span className="cs-thread-row__time">{formatRelativeTime(lead.created_at)}</span>
                </div>
                <div className="cs-thread-row__preview">{lead.company_name || '—'}</div>
              </div>
            </button>
          ))}
      </div>
      <button type="button" className="cs-messages__cta" onClick={onOpenFullHelp}>
        Open full Help &amp; BD chat
        <ArrowRight size={18} />
      </button>
    </div>
  );
}
