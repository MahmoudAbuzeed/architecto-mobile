import { darkTheme, lightTheme, Theme } from './tokens';
import { resolveDark, useThemeStore } from './theme.store';

export function useTheme(): Theme {
  const mode = useThemeStore((s) => s.mode);
  return resolveDark(mode) ? darkTheme : lightTheme;
}
