import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useRNColorScheme, Appearance } from 'react-native';
import { Colors } from '@/constants/theme';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  themeMode: ThemeMode;
  colors: typeof Colors.light;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'light',
  colors: Colors.light,
  toggleTheme: () => {},
  setThemeMode: () => {},
});

export const CustomThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useRNColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>(systemScheme === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    // Listen to Appearance changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (colorScheme) {
        setThemeModeState(colorScheme === 'dark' ? 'dark' : 'light');
      }
    });
    return () => subscription.remove();
  }, []);

  const toggleTheme = () => {
    const nextTheme = themeMode === 'light' ? 'dark' : 'light';
    setThemeModeState(nextTheme);
    try {
      Appearance.setColorScheme(nextTheme);
    } catch (e) {}
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      Appearance.setColorScheme(mode);
    } catch (e) {}
  };

  const colors = Colors[themeMode];

  return (
    <ThemeContext.Provider value={{ themeMode, colors, toggleTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useCustomTheme = () => useContext(ThemeContext);
