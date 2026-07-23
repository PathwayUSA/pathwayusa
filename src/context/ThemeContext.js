import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildColors } from '../themes';
import { THEME_DEFINITIONS } from '../themes';

const THEME_STORAGE_KEY = '@pathwayusa/theme';

const ThemeContext = createContext({
  themeName: 'classic',
  colors: buildColors('classic'),
  applyTheme: () => {},
  themeReady: false,
});

export function ThemeProvider({ children }) {
  const [themeName, setThemeName] = useState('classic');
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((saved) => {
        if (saved && THEME_DEFINITIONS[saved]) {
          setThemeName(saved);
        }
      })
      .catch(() => {})
      .finally(() => setThemeReady(true));
  }, []);

  const colors = useMemo(() => buildColors(themeName), [themeName]);

  const applyTheme = useCallback(async (name) => {
    if (!THEME_DEFINITIONS[name]) return;
    setThemeName(name);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, name);
    } catch (_) {}
  }, []);

  return (
    <ThemeContext.Provider value={{ themeName, colors, applyTheme, themeReady }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
