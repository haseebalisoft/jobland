import { useCallback, useEffect, useState } from 'react';
import { X, Home, MessageCircle, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import { firstNameFromUser } from './chatUtils.js';
import HomeTab from './HomeTab.jsx';
import MessagesTab from './MessagesTab.jsx';
import HelpTab from './HelpTab.jsx';
import BdLeadConversationView from './BdLeadConversationView.jsx';
import './chat-support.css';

export default function ChatPanel({ open, user, onClose, unreadCount, refreshUnread }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('home');
  const [view, setView] = useState('main');
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [activeLead, setActiveLead] = useState(null);
  const [helpSearch, setHelpSearch] = useState('');
  const [panelIn, setPanelIn] = useState(false);

  const loadLeads = useCallback(async () => {
    setLeadsLoading(true);
    try {
      const { data } = await api.get('/leads/user', { params: { range: 'all', limit: 100 } });
      setLeads(Array.isArray(data.items) ? data.items : []);
    } catch {
      setLeads([]);
    } finally {
      setLeadsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadLeads();
      refreshUnread?.();
      requestAnimationFrame(() => setPanelIn(true));
    } else {
      setPanelIn(false);
      setView('main');
      setActiveLead(null);
    }
  }, [open, loadLeads, refreshUnread]);

  const openLeadThread = async (lead) => {
    if (!lead?.id) return;
    try {
      const { data } = await api.get(`/leads/${lead.id}/messages`);
      setActiveLead({
        id: lead.id,
        job_title: lead.job_title,
        company_name: lead.company_name,
        messages: Array.isArray(data.messages) ? data.messages : [],
      });
      setView('thread');
      refreshUnread?.();
    } catch (e) {
      console.error(e);
    }
  };

  const backFromThread = () => {
    setView('main');
    setActiveLead(null);
    loadLeads();
    refreshUnread?.();
  };

  const openMessagesFromHome = () => {
    setTab('messages');
  };

  const fn = firstNameFromUser(user);

  if (!open) return null;

  return (
    <div className={`cs-panel ${panelIn ? 'cs-panel--in' : ''}`} role="dialog" aria-label="Help and BD chat">
      <button type="button" className="cs-panel__close" onClick={onClose} aria-label="Close">
        <X size={20} />
      </button>

      <div className="cs-panel__body">
        {view === 'thread' && activeLead ? (
          <BdLeadConversationView
            leadId={activeLead.id}
            jobTitle={activeLead.job_title}
            companyName={activeLead.company_name}
            userId={user?.id}
            initialMessages={activeLead.messages}
            onBack={backFromThread}
            onRefreshUnread={refreshUnread}
          />
        ) : (
          <>
            <div className="cs-panel__tab-screen">
              {tab === 'home' && <HomeTab firstName={fn} onOpenMessages={openMessagesFromHome} />}
              {tab === 'messages' && (
                <MessagesTab
                  leads={leads}
                  loading={leadsLoading}
                  onSelectLead={openLeadThread}
                  onOpenFullHelp={() => {
                    onClose();
                    navigate('/dashboard/help');
                  }}
                />
              )}
              {tab === 'help' && (
                <HelpTab
                  search={helpSearch}
                  onSearchChange={setHelpSearch}
                  onChatWithUs={() => setTab('messages')}
                  onViewAll={() => {
                    window.open('https://hirdlogic.com/help', '_blank', 'noopener,noreferrer');
                  }}
                />
              )}
            </div>

            <nav className="cs-tabs" aria-label="Help sections">
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
