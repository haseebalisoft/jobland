import { useCallback, useEffect, useState } from 'react';
import api from '../services/api.js';

export function useProfileScore() {
  const [score, setScore] = useState(0);
  const [breakdown, setBreakdown] = useState({});
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/user/profile-score');
      setScore(Number(res.data?.score || 0));
      setBreakdown(res.data?.breakdown || {});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { score, breakdown, loading, refetch };
}
