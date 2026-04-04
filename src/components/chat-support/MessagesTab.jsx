import { ArrowRight } from 'lucide-react';
import { formatRelativeTime } from './chatUtils.js';
import './chat-support.css';

const SUPPORT_NAME = 'Hirdlogic Support';

export default function MessagesTab({ conversations, onSelect, onNewConversation, unreadTab }) {
  return (
    <div className="cs-messages">
      <h2 className="cs-messages__title">Messages</h2>
      <div className="cs-messages__list">
        {conversations.length === 0 && (
          <p className="cs-messages__empty">No messages yet. Start a conversation below.</p>
        )}
        {conversations.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`cs-thread-row${c.unread ? ' cs-thread-row--unread' : ''}`}
            onClick={() => onSelect(c)}
          >
            {c.unread && <span className="cs-thread-row__dot" aria-hidden />}
            <div className="cs-thread-row__avatar">
              <img src="/logo.png" alt="" />
            </div>
            <div className="cs-thread-row__body">
              <div className="cs-thread-row__top">
                <span className="cs-thread-row__name">{SUPPORT_NAME}</span>
                <span className="cs-thread-row__time">{formatRelativeTime(c.timestamp)}</span>
              </div>
              <div className="cs-thread-row__preview">{c.preview || c.lastMessage || '…'}</div>
            </div>
          </button>
        ))}
      </div>
      <button type="button" className="cs-messages__cta" onClick={onNewConversation}>
        Send us a message
        <ArrowRight size={18} />
      </button>
    </div>
  );
}
