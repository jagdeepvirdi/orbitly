import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

export function useLiveF1() {
  const [schedule,     setSchedule]     = useState(null);
  const [standings,    setStandings]    = useState(null);
  const [constructors, setConstructors] = useState(null);
  const [raceResults,  setRaceResults]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);

  // Fetch + resolve only — no synchronous state reset here, so this is safe
  // to call directly from the mount effect below. `loading`/`error` already
  // start at their reset values (useState(true) / useState(null)); refresh()
  // resets them itself, since that runs from a click handler, not an effect.
  const load = useCallback(() => {
    Promise.all([
      api.f1Schedule(),
      api.f1Standings(),
      api.f1Constructors(),
      api.f1RaceResults(),
    ])
      .then(([s, d, c, r]) => {
        setSchedule(s?.length     ? s : null);
        setStandings(d?.length    ? d : null);
        setConstructors(c?.length ? c : null);
        setRaceResults(r?.length  ? r : null);
        setFetchedAt(new Date());
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    await api.f1Refresh();
    load();
  }, [load]);

  // Derive the actual season year from live data (first race in schedule, or first driver entry)
  const season = schedule?.[0]?.season || standings?.[0]?.season || new Date().getFullYear();

  return { schedule, standings, constructors, raceResults, loading, error, refresh, fetchedAt, season };
}
