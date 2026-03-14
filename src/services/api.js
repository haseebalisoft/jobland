import axios from 'axios';

const ACCESS_TOKEN_STORAGE_KEY = 'hiredlogics_access_token';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
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

