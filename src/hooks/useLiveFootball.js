import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

export function useLiveFootball(competitions = 'WC,PL,PD,CL,EC') {
  const [matches, setMatches] = useState(null);
  const [loading, setLoading] = useState(true);
  const [placeholder, setPlaceholder] = useState(false);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  // `loading` starts true (useState(true)) so the initial mount fetch needs no
  // reset here; refresh() resets it itself before bumping `tick`, since that
  // happens in a click handler rather than this effect. A `competitions`
  // change (editing league subscriptions) still refetches via this effect,
  // just without a loading flash — matches swap in-place once the new data
  // arrives instead of showing a skeleton first.
  useEffect(() => {
    let cancelled = false;
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
    setLoading(true);
    await api.footballRefresh();
    setTick(t => t + 1);
  }, []);

  return { matches, loading, placeholder, error, refresh };
}
