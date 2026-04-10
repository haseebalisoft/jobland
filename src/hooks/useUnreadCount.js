import { useCallback, useEffect, useState } from 'react';
import { fetchBdReplyAttentionCount } from '../utils/leadHelpUnread.js';

export function useUnreadCount(enabled) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const n = await fetchBdReplyAttentionCount();
      setCount(typeof n === 'number' ? n : 0);
    } catch {
      setCount(0);
    }
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return undefined;
    const t = setInterval(refresh, 45000);
    return () => clearInterval(t);
  }, [enabled, refresh]);

  return { count, refresh };
}
