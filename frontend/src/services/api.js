import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS) || 10000,
  withCredentials: true,
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

// A single in-flight refresh avoids every expired API call racing to rotate the
// same one-time refresh credential. The refresh token itself is HttpOnly and
// is therefore never read from browser storage or JavaScript.
let refreshPromise = null;

const refreshAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${api.defaults.baseURL}/auth/refresh`, {}, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      })
      .then(({ data }) => {
        localStorage.setItem('token', data.token);
        api.defaults.headers.common.Authorization = `Bearer ${data.token}`;
        return data.token;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
};

// Do not leave the user inside a broken dashboard when a token expires or was
// created with an old server secret. Clear it once and return to sign in.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original?._retried && !original?.url?.startsWith('/auth/')) {
      original._retried = true;
      try {
        const token = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch { /* fall through to a normal sign-out */ }
    }
    // A losing concurrent refresh request must not clear the newly rotated
    // cookie set by the winning request in another tab.
    if (error.response?.status === 401 && !error.config?.url?.startsWith('/auth/refresh') && !error.config?.url?.startsWith('/auth/login')) {
      localStorage.removeItem('token');
      delete api.defaults.headers.common.Authorization;
      if (window.location.pathname !== '/login') window.location.assign('/login');
    }
    return Promise.reject(error);
  }
);

export default api;
