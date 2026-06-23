import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { APP_TODAY } from '../utils/dateUtils';

export function useLiveHolidays(calendars = ['IN', 'TH'], year) {
  const targetYear = year || APP_TODAY.getFullYear();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);

  const calKey = [...calendars].sort().join(',');

  useEffect(() => {
    if (!calendars || calendars.length === 0) {
      setHolidays([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    // Fetch current year + next so month navigation near year-end works
    Promise.all([
      api.getMultiHolidays(targetYear, calendars).catch(() => []),
      api.getMultiHolidays(targetYear + 1, calendars).catch(() => []),
    ]).then(([curr, next]) => {
      if (cancelled) return;
      const merged = [...curr, ...next].map(h => ({
        ...h,
        year:  parseInt(h.date.slice(0, 4)),
        month: parseInt(h.date.slice(5, 7)) - 1,
        day:   parseInt(h.date.slice(8, 10)),
      }));
      merged.sort((a, b) => a.date.localeCompare(b.date));
      setHolidays(merged);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [targetYear, calKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { holidays, loading };
}
