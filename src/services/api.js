import axios from 'axios';

const ACCESS_TOKEN_STORAGE_KEY = 'hiredlogics_access_token';

/**
 * Ensure requests hit /api/... on this Express app when the env is only host:port.
 * If VITE_API_URL is http://localhost:5000 (path /), axios + /cv/... becomes /cv/... (404).
 * If you mount the API at a custom path (e.g. /v1), set VITE_API_URL to that full base — we won't append /api.
 */
export function getApiBaseUrl() {
  const raw = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const trimmed = String(raw).trim().replace(/\/+$/, '');
  try {
    const u = new URL(trimmed);
    let path = u.pathname || '/';
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    if (path === '/' || path === '') {
      return `${trimmed}/api`;
    }
    if (path.includes('/api')) {
      return trimmed;
    }
    return trimmed;
  } catch {
    return `${trimmed}/api`;
  }
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
});

let accessToken =
  typeof window !== 'undefined'
    ? window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
    : null;

export function setAccessToken(token) {
  accessToken = token;
  if (typeof window === 'undefined') return;

  if (token) {
    window.sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  } else {
    window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  }
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    // If request was to refresh-token itself, do NOT try to refresh again
    if (original?.url?.includes('/auth/refresh-token')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const res = await api.post('/auth/refresh-token');
        accessToken = res.data.accessToken;
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (e) {
        accessToken = null;
      }
    }
    return Promise.reject(error);
  },
);

export default api;

