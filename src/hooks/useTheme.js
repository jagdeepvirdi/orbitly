import { useAppStore } from '../store/appStore';

export function useTheme() {
  const { state, dispatch } = useAppStore();
  return {
    theme: state.theme,
    isDark: state.theme === 'dark',
    toggleTheme: () => dispatch({ type: 'TOGGLE_THEME' }),
  };
}
