import { useState, useEffect, useCallback } from 'react';
import { postgrest, type QueryOptions } from '../lib/postgrest';

interface UseQueryResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useQuery<T>(
  table: string,
  opts: QueryOptions & { pollInterval?: number } = {}
): UseQueryResult<T> {
  const { pollInterval, ...queryOpts } = opts;

  const [data, setData]       = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const key = JSON.stringify({ table, queryOpts });

  // silent=true → updates data without touching loading/error (used by background polls)
  // silent=false → shows loading state (used on mount and manual refetch)
  const doFetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    if (!silent) setError(null);
    try {
      const rows = await postgrest.get<T>(table, queryOpts);
      setData(rows);
    } catch (e) {
      if (!silent) setError(e instanceof Error ? e.message : 'Error fetching data');
    } finally {
      if (!silent) setLoading(false);
    }
  // key encodes table + queryOpts — safe to use as dep
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Initial fetch (shows loading skeleton)
  useEffect(() => { void doFetch(false); }, [doFetch]);

  // Background polling — silent so no loading flash every interval
  useEffect(() => {
    if (!pollInterval || pollInterval <= 0) return;
    const id = setInterval(() => void doFetch(true), pollInterval);
    return () => clearInterval(id);
  }, [doFetch, pollInterval]);

  // Refresh when user returns to the tab/window
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void doFetch(true);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [doFetch]);

  return { data, loading, error, refetch: () => void doFetch(false) };
}
