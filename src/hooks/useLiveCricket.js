import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

// `enabled=false` skips the fetch entirely, so sports a user hasn't subscribed to never
// spend the shared API quota.
export function useLiveCricket(enabled = true) {
  const [matches, setMatches] = useState(null);
  const [loading, setLoading] = useState(true);
  const [placeholder, setPlaceholder] = useState(false);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  // `loading` starts true (useState(true)) so the initial mount fetch needs no
  // reset here; refresh() resets it itself before bumping `tick`, since that
  // happens in a click handler rather than this effect.
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    api.cricketMatches()
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
  }, [tick, enabled]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await api.cricketRefresh();
    setTick(t => t + 1);
  }, []);

  return { matches, loading, placeholder, error, refresh };
}
