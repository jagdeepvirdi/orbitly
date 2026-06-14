import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';

export function useTimer() {
  const { state, dispatch } = useAppStore();

  useEffect(() => {
    if (!state.timerRunning) return;
    const id = setInterval(() => {
      dispatch({ type: 'TICK_TIMER' });
    }, 1000);
    return () => clearInterval(id);
  }, [state.timerRunning, dispatch]);
}
