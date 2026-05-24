import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 40000, // 40s — Render free tier cold start can take 30s
  withCredentials: false,
});

// ─── Attach JWT token to every request ─────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => Promise.reject(error));

// ─── Response interceptor — NO window.location (causes reload loop) ─
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    // Skip refresh for auth endpoints to avoid loops
    const isAuthEndpoint = original?.url?.includes('/auth/');
    if (isAuthEndpoint) return Promise.reject(err);

    // On 401 — try silent token refresh ONCE
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken }, { timeout: 10000 });
        const { accessToken, refreshToken: newRefresh } = res.data.data;

        localStorage.setItem('accessToken', accessToken);
        if (newRefresh) localStorage.setItem('refreshToken', newRefresh);
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        // Silent fail — clear storage, let React Router handle redirect
        // DO NOT use window.location.href — that causes reload loops
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        // Dispatch a custom event so AuthContext can react
        window.dispatchEvent(new CustomEvent('auth:logout'));
        return Promise.reject(err);
      }
    }

    return Promise.reject(err);
  }
);

export default api;
