import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle, ListTodo, Loader2 } from 'lucide-react';

function formatTime(ts) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '';
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 60_000) return 'Just now';
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function openSupportChat() {
  window.dispatchEvent(new CustomEvent('hirdlogic:open-support-chat'));
}

function taskHref(taskId) {
  if (taskId === 't-onboard') return '/dashboard/job-preferences';
  return '/dashboard/job-tracker';
}

export default function NotificationDropdown({
  open,
  onClose,
  loading,
  clearing,
  supportUnread,
  conversations,
  pendingTasks,
  onAfterNavigate,
  onClearAll,
}) {
  const navigate = useNavigate();

  const handleNav = (to) => {
    navigate(to);
    onClose();
    onAfterNavigate?.();
  };

  const hasUnreadSupport = supportUnread > 0;
  const showConv = conversations.slice(0, 4);
  const showTasks = pendingTasks.slice(0, 4);
  const empty = !loading && !hasUnreadSupport && showConv.length === 0 && showTasks.length === 0;
  const noItemsYet = !hasUnreadSupport && showConv.length === 0 && showTasks.length === 0;
  const canClear = !loading && (hasUnreadSupport || showConv.length > 0 || showTasks.length > 0);

  if (!open) return null;

  return (
    <div className="dl-notif-panel" role="dialog" aria-label="Notifications">
      <div className="dl-notif-panel__head">
        <span className="dl-notif-panel__title">Notifications</span>
        <div className="dl-notif-panel__head-actions">
          {canClear && onClearAll && (
            <button
              type="button"
              className="dl-notif-clear-btn"
              disabled={clearing}
              onClick={() => onClearAll()}
            >
              {clearing ? 'Clearing…' : 'Clear all'}
            </button>
          )}
          {loading && <Loader2 size={14} className="dl-notif-panel__spin" aria-hidden />}
        </div>
      </div>

      <div className="dl-notif-panel__body">
        {hasUnreadSupport && (
          <button type="button" className="dl-notif-item dl-notif-item--highlight" onClick={() => { openSupportChat(); onClose(); }}>
            <MessageCircle size={18} className="dl-notif-item__icon" />
            <div className="dl-notif-item__text">
              <div className="dl-notif-item__title">BD messages</div>
              <div className="dl-notif-item__sub">
                {supportUnread} lead{supportUnread === 1 ? '' : 's'} with a reply from your BD — open Help chat
              </div>
            </div>
          </button>
        )}

        {showConv.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`dl-notif-item${c.unread ? ' dl-notif-item--unread' : ''}`}
            onClick={() => {
              openSupportChat();
              onClose();
            }}
          >
            <MessageCircle size={16} className="dl-notif-item__icon" />
            <div className="dl-notif-item__text">
              <div className="dl-notif-item__title">{c.preview ? String(c.preview).slice(0, 72) : 'Support conversation'}</div>
              <div className="dl-notif-item__sub">
                {formatTime(c.timestamp)}
                {c.unread ? ' · Unread' : ''}
              </div>
            </div>
          </button>
        ))}

        {showTasks.map((t) => (
          <button
            key={t.id}
            type="button"
            className="dl-notif-item"
            onClick={() => handleNav(taskHref(t.id))}
          >
            <ListTodo size={16} className="dl-notif-item__icon" />
            <div className="dl-notif-item__text">
              <div className="dl-notif-item__title">{t.text}</div>
              {t.sub && <div className="dl-notif-item__sub">{t.sub}</div>}
            </div>
          </button>
        ))}

        {loading && noItemsYet && (
          <div className="dl-notif-empty">Loading notifications…</div>
        )}

        {empty && (
          <div className="dl-notif-empty">You&apos;re all caught up.</div>
        )}
      </div>

      <div className="dl-notif-panel__foot">
        <Link to="/dashboard" className="dl-notif-foot-link" onClick={onClose}>
          Dashboard
        </Link>
        <button type="button" className="dl-notif-foot-link dl-notif-foot-link--btn" onClick={() => { openSupportChat(); onClose(); }}>
          Help &amp; BD chat
        </button>
      </div>
    </div>
  );
}
