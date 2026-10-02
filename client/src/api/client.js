import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const client = axios.create({ baseURL: API_URL, withCredentials: true });

// The access token lives only in memory. It is restored after a page reload
// by exchanging the httpOnly refresh cookie (see refreshSession).
let accessToken = null;
let onSessionExpired = () => {};

export const getAccessToken = () => accessToken;
export const setAccessToken = (token) => {
  accessToken = token;
};
export const setSessionExpiredHandler = (handler) => {
  onSessionExpired = handler;
};

// Refresh tokens are rotated on every use, so concurrent callers must share a
// single refresh request.
let refreshPromise = null;
export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = client
      .post('/auth/refresh')
      .then((res) => {
        accessToken = res.data.data.accessToken;
        return res.data.data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

client.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// On a 401 the access token has probably expired: refresh once and retry.
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const isSessionCall = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'].includes(config?.url);

    if (response?.status === 401 && config && !config._retried && !isSessionCall && accessToken) {
      config._retried = true;
      try {
        await refreshSession();
      } catch {
        accessToken = null;
        onSessionExpired();
        return Promise.reject(error);
      }
      return client(config);
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error) {
  const data = error?.response?.data;
  if (data?.errors?.length) return data.errors.map((e) => e.message).join('. ');
  if (data?.message) return data.message;
  if (error?.request && !error.response) return 'Cannot reach the server. Is the API running?';
  return 'Something went wrong';
}

export default client;
