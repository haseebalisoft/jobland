import { useCallback, useEffect, useState } from 'react';
import api from '../services/api.js';

export function useUnreadCount(enabled) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const { data } = await api.get('/support-chat/unread-count');
      setCount(typeof data?.count === 'number' ? data.count : 0);
    } catch {
      setCount(0);
    }
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return undefined;
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [enabled, refresh]);

  return { count, refresh };
}
