import axios from 'axios';
import { API_URL } from '@/config';
import { getTokens, setTokens, clearTokens } from '@/lib/secureStorage';

export const http = axios.create({ baseURL: API_URL });

http.interceptors.request.use(async (config) => {
  const { access } = await getTokens();
  config.headers = config.headers ?? {};
  if (access) {
    (config.headers as Record<string, string>).Authorization = `Bearer ${access}`;
  }
  return config;
});

let refreshing: Promise<boolean> | null = null;

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    if (status === 401 && !error.config?.__retry) {
      error.config.__retry = true;
      if (!refreshing) {
        refreshing = (async () => {
          const { refresh } = await getTokens();
          if (!refresh) return false;
          try {
            const { data } = await axios.post(`${API_URL}/auth/refresh`, {
              refresh_token: refresh,
            });
            await setTokens(data.access_token, data.refresh_token);
            return true;
          } catch {
            await clearTokens();
            return false;
          }
        })();
      }
      const ok = await refreshing;
      refreshing = null;
      if (ok) return http(error.config);
    }
    return Promise.reject(error);
  }
);
