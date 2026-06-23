import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

export function useLiveNba() {
  const [games, setGames] = useState(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.nbaGames()
      .then(res => {
        if (cancelled) return;
        setGames(res.data || []);
        setLive(res.live || false);
        setLoading(false);
      })
      .catch(e => {
        if (!cancelled) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [tick]);

  const refresh = useCallback(async () => {
    await api.nbaRefresh();
    setTick(t => t + 1);
  }, []);

  return { games, loading, live, error, refresh };
}
