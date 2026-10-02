import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../api/client';

// Runs an API call that resolves to the { data, meta } envelope and tracks its
// loading and error state. Re-runs when `deps` change or `reload` is called.
export function useFetch(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, meta: null, loading: true, error: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetcher()
      .then((res) => {
        if (!cancelled) setState({ data: res.data, meta: res.meta ?? null, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ data: null, meta: null, loading: false, error: getErrorMessage(err) });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return { ...state, reload };
}
