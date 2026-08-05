import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

export function useLiveNba() {
  const [games, setGames] = useState(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  // `loading` starts true (useState(true)) so the initial mount fetch needs no
  // reset here; refresh() resets it itself before bumping `tick`, since that
  // happens in a click handler rather than this effect.
  useEffect(() => {
    let cancelled = false;
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
    setLoading(true);
    await api.nbaRefresh();
    setTick(t => t + 1);
  }, []);

  return { games, loading, live, error, refresh };
}
