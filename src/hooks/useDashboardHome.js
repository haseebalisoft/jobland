import { useCallback, useEffect, useState } from 'react';
import api from '../services/api.js';

/**
 * Loads dashboard home payloads from authenticated APIs.
 */
export function useDashboardHome() {
  const [state, setState] = useState({
    loading: true,
    profile: null,
    progress: null,
    actionPlan: null,
    plan: null,
    error: null,
  });

  const load = useCallback(async (opts = {}) => {
    const silent = !!opts.silent;
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const [profileRes, progressRes, actionRes, planRes] = await Promise.all([
        api.get('/user/profile'),
        api.get('/user/progress'),
        api.get('/dashboard/action-plan'),
        api.get('/user/plan'),
      ]);
      setState({
        loading: false,
        profile: profileRes.data,
        progress: progressRes.data,
        actionPlan: actionRes.data,
        plan: planRes.data,
        error: null,
      });
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        'Unable to load dashboard. Please try again.';
      setState((s) => ({
        ...s,
        loading: false,
        ...(silent ? {} : { error: msg }),
      }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refetch: load };
}
