import { useState, useEffect, useCallback } from 'react';
import { postgrest, type QueryOptions } from '../lib/postgrest';

interface UseQueryResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useQuery<T>(table: string, opts: QueryOptions = {}): UseQueryResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify({ table, opts });

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await postgrest.get<T>(table, opts);
      setData(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error fetching data');
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
