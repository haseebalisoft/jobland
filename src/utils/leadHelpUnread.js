import api from '../services/api.js';

const MAX_LEADS = 15;

/**
 * Count assigned leads whose last message is from BD/admin (user may want to reply).
 * Used for Help widget FAB badge and navbar notifications (no AI support-chat).
 */
export async function fetchBdReplyAttentionCount() {
  try {
    const { data } = await api.get('/leads/user', { params: { range: 'all', limit: MAX_LEADS } });
    const items = Array.isArray(data.items) ? data.items : [];
    let count = 0;
    for (const lead of items) {
      try {
        const { data: d2 } = await api.get(`/leads/${lead.id}/messages`);
        const msgs = Array.isArray(d2.messages) ? d2.messages : [];
        if (!msgs.length) continue;
        const last = msgs[msgs.length - 1];
        if (last.sender_role === 'bd' || last.sender_role === 'admin') {
          count += 1;
        }
      } catch {
        /* ignore per-lead */
      }
    }
    return count;
  } catch {
    return 0;
  }
}
