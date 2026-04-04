import { useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';

export function useScenarios({ category, search }) {
  const [scenarios, setScenarios] = useState([]);
  const [categories, setCategories] = useState(['All Scenario']);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { limit: 100, page: 1 };
      if (category && category !== 'All Scenario') params.category = category;
      if (search && String(search).trim()) params.search = String(search).trim();
      const res = await api.get('/mock-interviews/scenarios', { params });
      setScenarios(res.data.scenarios || []);
      setTotal(res.data.total ?? 0);
      if (Array.isArray(res.data.categories) && res.data.categories.length) {
        setCategories(res.data.categories);
      }
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
      setScenarios([]);
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { scenarios, categories, total, loading, error, refetch };
}
