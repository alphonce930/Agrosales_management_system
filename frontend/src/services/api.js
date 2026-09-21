import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS) || 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Automatically attach login token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Do not leave the user inside a broken dashboard when a token expires or was
// created with an old server secret. Clear it once and return to sign in.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original?._retried && !original?.url?.startsWith('/auth/')) {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        original._retried = true;
        try {
          const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken }, { headers: { 'Content-Type': 'application/json' } });
          localStorage.setItem('token', data.token);
          localStorage.setItem('refresh_token', data.refreshToken);
          original.headers.Authorization = `Bearer ${data.token}`;
          return api(original);
        } catch { /* fall through to a normal sign-out */ }
      }
    }
    if (error.response?.status === 401 && !error.config?.url?.startsWith('/auth/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      delete api.defaults.headers.common.Authorization;
      if (window.location.pathname !== '/login') window.location.assign('/login');
    }
    return Promise.reject(error);
  }
);

export default api;
