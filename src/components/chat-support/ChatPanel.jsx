import { useCallback, useEffect, useState } from 'react';
import { X, Home, MessageCircle, HelpCircle } from 'lucide-react';
import api from '../../services/api.js';
import { firstNameFromUser } from './chatUtils.js';
import HomeTab from './HomeTab.jsx';
import MessagesTab from './MessagesTab.jsx';
import HelpTab from './HelpTab.jsx';
import ConversationView from './ConversationView.jsx';
import './chat-support.css';

export default function ChatPanel({ open, user, onClose, unreadCount, refreshUnread }) {
  const [tab, setTab] = useState('home');
  const [view, setView] = useState('main');
  const [conversations, setConversations] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [helpSearch, setHelpSearch] = useState('');
  const [panelIn, setPanelIn] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/support-chat/conversations');
      setConversations(data.conversations || []);
    } catch {
      setConversations([]);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadConversations();
      refreshUnread?.();
      requestAnimationFrame(() => setPanelIn(true));
    } else {
      setPanelIn(false);
      setView('main');
      setActiveThread(null);
    }
  }, [open, loadConversations, refreshUnread]);

  const startNewConversation = async () => {
    try {
      const { data } = await api.post('/support-chat/conversations');
      const id = data.conversationId;
      const raw = data.conversation?.messages || [];
      setActiveThread({ id, messages: raw });
      setView('thread');
      await loadConversations();
      refreshUnread?.();
    } catch (e) {
      console.error(e);
    }
  };

  const openFromHomeCard = async () => {
    setTab('messages');
    await startNewConversation();
  };

  const openThread = async (c) => {
    try {
      const { data } = await api.get(`/support-chat/conversations/${c.id}`);
      setActiveThread({ id: c.id, messages: data.messages || [] });
      setView('thread');
      await api.patch(`/support-chat/conversations/${c.id}/read`);
      refreshUnread?.();
      loadConversations();
    } catch (e) {
      console.error(e);
    }
  };

  const backFromThread = () => {
    setView('main');
    setActiveThread(null);
    loadConversations();
    refreshUnread?.();
  };

  const fn = firstNameFromUser(user);

  if (!open) return null;

  return (
    <div className={`cs-panel ${panelIn ? 'cs-panel--in' : ''}`} role="dialog" aria-label="Support chat">
      <button type="button" className="cs-panel__close" onClick={onClose} aria-label="Close">
        <X size={20} />
      </button>

      <div className="cs-panel__body">
        {view === 'thread' && activeThread ? (
          <ConversationView
            conversationId={activeThread.id}
            initialMessages={activeThread.messages}
            onBack={backFromThread}
            onRefreshUnread={refreshUnread}
          />
        ) : (
          <>
            <div className="cs-panel__tab-screen">
              {tab === 'home' && (
                <HomeTab firstName={fn} onOpenMessages={openFromHomeCard} />
              )}
              {tab === 'messages' && (
                <MessagesTab
                  conversations={conversations}
                  onSelect={openThread}
                  onNewConversation={startNewConversation}
                />
              )}
              {tab === 'help' && (
                <HelpTab
                  search={helpSearch}
                  onSearchChange={setHelpSearch}
                  onChatWithUs={() => {
                    setTab('messages');
                    startNewConversation();
                  }}
                  onViewAll={() => {
                    window.open('https://hirdlogic.com/help', '_blank', 'noopener,noreferrer');
                  }}
                />
              )}
            </div>

            <nav className="cs-tabs" aria-label="Support sections">
              <button
                type="button"
                className={`cs-tab${tab === 'home' ? ' cs-tab--active' : ''}`}
                onClick={() => setTab('home')}
              >
                <Home size={22} strokeWidth={tab === 'home' ? 2.5 : 2} />
                <span>Home</span>
              </button>
              <button
                type="button"
                className={`cs-tab${tab === 'messages' ? ' cs-tab--active' : ''}`}
                onClick={() => setTab('messages')}
              >
                <span className="cs-tab__icon-wrap">
                  <MessageCircle size={22} strokeWidth={tab === 'messages' ? 2.5 : 2} />
                  {unreadCount > 0 && <span className="cs-tab__badge">1</span>}
                </span>
                <span>Messages</span>
              </button>
              <button
                type="button"
                className={`cs-tab${tab === 'help' ? ' cs-tab--active' : ''}`}
                onClick={() => setTab('help')}
              >
                <HelpCircle size={22} strokeWidth={tab === 'help' ? 2.5 : 2} />
                <span>Help</span>
              </button>
            </nav>
          </>
        )}
      </div>
    </div>
  );
}
