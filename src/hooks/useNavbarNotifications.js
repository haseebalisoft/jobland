import { useCallback, useEffect, useState } from 'react';
import api from '../services/api.js';

const DISMISSED_TASKS_KEY = 'hirdlogic:notif-dismissed-tasks';

function getDismissedTaskIds() {
  try {
    const raw = sessionStorage.getItem(DISMISSED_TASKS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function dismissTaskIds(ids) {
  if (!ids.length) return;
  const prev = getDismissedTaskIds();
  sessionStorage.setItem(DISMISSED_TASKS_KEY, JSON.stringify([...new Set([...prev, ...ids.map(String)])]));
}

/**
 * Loads data for the dashboard notification bell: support unread + conversations + open tasks.
 */
export function useNavbarNotifications(enabled) {
  const [state, setState] = useState({
    loading: true,
    clearing: false,
    supportUnread: 0,
    conversations: [],
    pendingTasks: [],
  });

  const load = useCallback(async () => {
    if (!enabled) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    try {
      const [unreadRes, convRes, tasksRes] = await Promise.all([
        api.get('/support-chat/unread-count'),
        api.get('/support-chat/conversations'),
        api.get('/dashboard/tasks'),
      ]);
      const supportUnread = typeof unreadRes.data?.count === 'number' ? unreadRes.data.count : 0;
      const conversations = Array.isArray(convRes.data?.conversations) ? convRes.data.conversations : [];
      const allTasks = Array.isArray(tasksRes.data?.tasks) ? tasksRes.data.tasks : [];
      const dismissed = new Set(getDismissedTaskIds());
      const pendingTasks = allTasks
        .filter((t) => !t.done && !dismissed.has(String(t.id)))
        .slice(0, 6);
      setState((s) => ({
        ...s,
        loading: false,
        supportUnread,
        conversations: conversations.slice(0, 6),
        pendingTasks,
      }));
    } catch {
      setState((s) => ({
        ...s,
        loading: false,
        supportUnread: 0,
        conversations: [],
        pendingTasks: [],
      }));
    }
  }, [enabled]);

  const clearAll = useCallback(async () => {
    setState((s) => {
      dismissTaskIds(s.pendingTasks.map((t) => t.id));
      return { ...s, clearing: true };
    });
    try {
      await api.patch('/support-chat/conversations/read-all');
      window.dispatchEvent(new CustomEvent('hirdlogic:refresh-unread'));
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setState((s) => ({ ...s, clearing: false }));
    }
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!enabled) return undefined;
    const t = setInterval(load, 45000);
    return () => clearInterval(t);
  }, [enabled, load]);

  return { ...state, refresh: load, clearAll };
}
