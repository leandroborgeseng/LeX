import axios from 'axios';
import {
  enqueueOutbox,
  flushOutbox,
  type LexAxiosConfig,
} from '@/lib/offline-queue';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isNetworkFailure(err: unknown): boolean {
  return axios.isAxiosError(err) && !err.response;
}

api.interceptors.request.use((config) => {
  const t = localStorage.getItem('lex_token');
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (err: unknown) => {
    const orig = axios.isAxiosError(err) ? err.config : undefined;
    if (!orig) return Promise.reject(err);

    const cfg = orig as LexAxiosConfig;
    if (cfg.lexSkipOutbox) return Promise.reject(err);

    if (err && axios.isAxiosError(err) && err.response?.status === 401) {
      localStorage.removeItem('lex_token');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject(err);
    }

    const method = (orig.method ?? 'get').toUpperCase();
    const url = orig.url ?? '';
    const skipPath =
      url.includes('/auth/') || url.includes('login');

    if (MUTATING.has(method) && !skipPath && isNetworkFailure(err)) {
      try {
        await enqueueOutbox(method, url, orig.data);
        const queued = new Error('lex-offline-queued') as Error & { lexQueued: true };
        queued.lexQueued = true;
        return Promise.reject(queued);
      } catch {
        /* IndexedDB indisponível */
      }
    }

    return Promise.reject(err);
  },
);

window.addEventListener('online', () => {
  void flushOutbox(api);
});

export function syncOutboxNow(): Promise<void> {
  return flushOutbox(api);
}

export default api;
