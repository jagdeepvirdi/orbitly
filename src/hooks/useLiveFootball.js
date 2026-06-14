import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

export function useLiveFootball(competitions = 'WC,PL,PD,CL,EC') {
  const [matches, setMatches] = useState(null);
  const [loading, setLoading] = useState(true);
  const [placeholder, setPlaceholder] = useState(false);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.footballMatches(competitions)
      .then(res => {
        if (cancelled) return;
        if (res.placeholder) { setPlaceholder(true); setLoading(false); return; }
        setPlaceholder(false);
        setMatches(res.data || []);
        setLoading(false);
      })
      .catch(e => {
        if (!cancelled) { setError(e.message); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, [competitions, tick]);

  const refresh = useCallback(async () => {
    await api.footballRefresh(competitions);
    setTick(t => t + 1);
  }, [competitions]);

  return { matches, loading, placeholder, error, refresh };
}
