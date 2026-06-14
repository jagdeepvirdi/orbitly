import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { APP_TODAY } from '../utils/dateUtils';

export function useLiveHolidays(countries = ['IN', 'TH'], year) {
  const targetYear = year || APP_TODAY.getFullYear();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // Fetch both the requested year and the next, so month navigation near year-end works
    const years = [targetYear, targetYear + 1];
    Promise.all(
      years.flatMap(y => countries.map(cc => api.holidays(y, cc).catch(() => [])))
    ).then(results => {
      if (cancelled) return;
      const merged = results.flat().map(h => ({
        ...h,
        year:  parseInt(h.date.slice(0, 4)),
        month: parseInt(h.date.slice(5, 7)) - 1, // 0-indexed
        day:   parseInt(h.date.slice(8, 10)),
      }));
      merged.sort((a, b) => a.date.localeCompare(b.date));
      setHolidays(merged);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [targetYear, countries.join(',')]);

  return { holidays, loading };
}
