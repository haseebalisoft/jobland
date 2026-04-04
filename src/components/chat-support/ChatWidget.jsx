import { useState } from 'react';
import { MessageCircle, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useUnreadCount } from '../../hooks/useUnreadCount.js';
import ChatPanel from './ChatPanel.jsx';
import './chat-support.css';

export default function ChatWidget() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const { count, refresh } = useUnreadCount(!loading && !!user);

  if (loading || !user) return null;

  return (
    <>
      <ChatPanel
        open={open}
        user={user}
        onClose={() => setOpen(false)}
        unreadCount={count}
        refreshUnread={refresh}
      />
      <button
        type="button"
        className={`cs-fab${open ? ' cs-fab--open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Close support chat' : 'Open support chat'}
      >
        {count > 0 && <span className="cs-fab__badge">{count > 9 ? '9+' : count}</span>}
        {open ? <ChevronDown size={24} /> : <MessageCircle size={24} />}
      </button>
    </>
  );
}
