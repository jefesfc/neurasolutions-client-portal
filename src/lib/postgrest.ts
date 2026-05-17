import { useAuthStore } from '../store/auth-store';

const BASE_URL = import.meta.env.VITE_POSTGREST_URL ?? 'https://xneurasolutions-postgrest.9lagn8.easypanel.host';

function getHeaders(): HeadersInit {
  const token = useAuthStore.getState().token;
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'is' | 'in';

interface QueryOptions {
  select?: string;
  filters?: Record<string, string>;          // { status: 'eq.active' }
  order?: string;                             // 'created_at.desc'
  limit?: number;
  offset?: number;
  count?: boolean;
}

function buildUrl(table: string, opts: QueryOptions = {}): string {
  const url = new URL(`${BASE_URL}/${table}`);

  if (opts.select) url.searchParams.set('select', opts.select);
  if (opts.order) url.searchParams.set('order', opts.order);
  if (opts.limit !== undefined) url.searchParams.set('limit', String(opts.limit));
  if (opts.offset !== undefined) url.searchParams.set('offset', String(opts.offset));

  for (const [col, val] of Object.entries(opts.filters ?? {})) {
    url.searchParams.set(col, val);
  }

  return url.toString();
}

export const postgrest = {
  async get<T>(table: string, opts: QueryOptions = {}): Promise<T[]> {
    const headers: HeadersInit = { ...getHeaders() };
    if (opts.count) (headers as Record<string, string>)['Prefer'] = 'count=exact';

    const res = await fetch(buildUrl(table, opts), { headers });
    if (!res.ok) throw new Error(`PostgREST ${res.status}: ${await res.text()}`);
    return res.json();
  },

  async getOne<T>(table: string, opts: QueryOptions = {}): Promise<T | null> {
    const rows = await postgrest.get<T>(table, { ...opts, limit: 1 });
    return rows[0] ?? null;
  },

  async post<T>(table: string, body: Partial<T>): Promise<T> {
    const res = await fetch(`${BASE_URL}/${table}`, {
      method: 'POST',
      headers: { ...getHeaders(), Prefer: 'return=representation' } as HeadersInit,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`PostgREST ${res.status}: ${await res.text()}`);
    const rows = await res.json();
    return rows[0];
  },

  async patch<T>(table: string, filters: Record<string, string>, body: Partial<T>): Promise<T[]> {
    const url = buildUrl(table, { filters });
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { ...getHeaders(), Prefer: 'return=representation' } as HeadersInit,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`PostgREST ${res.status}: ${await res.text()}`);
    return res.json();
  },

  async delete(table: string, filters: Record<string, string>): Promise<void> {
    const url = buildUrl(table, { filters });
    const res = await fetch(url, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error(`PostgREST ${res.status}: ${await res.text()}`);
  },
};

export type { QueryOptions, FilterOperator };
