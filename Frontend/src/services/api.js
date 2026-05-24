import axios from 'axios';

// ─── Base URL Resolution ────────────────────────────────────────
// Priority:
//   1. VITE_API_URL env var  (set this in Vercel / Netlify dashboard)
//   2. /api proxy            (works in local dev via vite.config.js)
//
// In production build, Vite replaces import.meta.env.VITE_API_URL
// at build time, so there is NO proxy — the full URL must be set.

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000, // 15s — handles Render cold starts
  withCredentials: false,
});

// ─── Request interceptor — attach JWT ──────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => Promise.reject(error));

// ─── Response interceptor — auto refresh on 401 ────────────────
let refreshing = false;
let queue = [];

const processQueue = (error, token = null) => {
  queue.forEach(p => error ? p.reject(error) : p.resolve(token));
  queue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    // Don't retry refresh endpoint itself
    if (original.url?.includes('/auth/refresh')) {
      localStorage.clear();
      window.location.href = '/login';
      return Promise.reject(err);
    }

    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (refreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        }).catch(e => Promise.reject(e));
      }

      refreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        // Use axios directly (not api instance) to avoid interceptor loop
        const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = res.data.data;

        localStorage.setItem('accessToken', accessToken);
        if (newRefresh) localStorage.setItem('refreshToken', newRefresh);

        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);

        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (refreshErr) {
        processQueue(refreshErr);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        refreshing = false;
      }
    }

    // Network error (backend down / CORS blocked)
    if (!err.response) {
      console.error('🔌 Cannot reach backend:', BASE_URL);
      err.message = `Cannot connect to server. Check your VITE_API_URL setting.\nCurrent: ${BASE_URL}`;
    }

    return Promise.reject(err);
  }
);

export default api;
