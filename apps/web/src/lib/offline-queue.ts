import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

const DB_NAME = 'lex-offline';
const STORE = 'outbox';
const DB_VERSION = 1;

export type OutboxItem = {
  id: number;
  method: string;
  url: string;
  body: string | null;
  createdAt: number;
};

type OutboxInsert = Omit<OutboxItem, 'id'>;

interface LexDB extends DBSchema {
  outbox: {
    key: number;
    value: OutboxItem;
  };
}

let dbPromise: Promise<IDBPDatabase<LexDB>> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB<LexDB>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(STORE)) {
          database.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
}

export function emitOutboxChanged() {
  window.dispatchEvent(new CustomEvent('lex-outbox'));
}

export async function outboxCount(): Promise<number> {
  const d = await db();
  return d.count(STORE);
}

export async function enqueueOutbox(method: string, url: string, data: unknown): Promise<void> {
  const d = await db();
  const body = data == null ? null : typeof data === 'string' ? data : JSON.stringify(data);
  await d.add(STORE, {
    method,
    url,
    body,
    createdAt: Date.now(),
  } as OutboxInsert);
  emitOutboxChanged();
}

/** Marca pedidos de replay para não voltarem à fila. */
export type LexAxiosConfig = InternalAxiosRequestConfig & { lexSkipOutbox?: boolean };

export async function flushOutbox(api: AxiosInstance): Promise<void> {
  const d = await db();
  const all = await d.getAll(STORE);
  const rows = all.sort((a, b) => a.createdAt - b.createdAt);
  for (const row of rows) {
    try {
      await api.request({
        method: row.method as 'POST' | 'PATCH' | 'PUT' | 'DELETE',
        url: row.url,
        data: row.body ? JSON.parse(row.body) : undefined,
        lexSkipOutbox: true,
      } as LexAxiosConfig);
      await d.delete(STORE, row.id);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 401) {
        emitOutboxChanged();
      }
      break;
    }
  }
  emitOutboxChanged();
}
