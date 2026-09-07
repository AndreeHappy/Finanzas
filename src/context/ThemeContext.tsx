import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeStyle = 'glassmorphism' | 'minimalist';
export type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  style: ThemeStyle;
  mode: ThemeMode;
  theme: ThemeMode; // backward compatibility
  setStyle: (style: ThemeStyle) => void;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const LOCAL_STORAGE_THEME_STYLE_KEY = 'app_finanzas_theme_style_v1';
const LOCAL_STORAGE_THEME_MODE_KEY = 'app_finanzas_theme_mode_v1';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [style, setStyle] = useState<ThemeStyle>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_THEME_STYLE_KEY);
    return saved === 'minimalist' ? 'minimalist' : 'glassmorphism';
  });

  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_THEME_MODE_KEY);
    return saved === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_THEME_STYLE_KEY, style);
    localStorage.setItem(LOCAL_STORAGE_THEME_MODE_KEY, mode);

    const root = document.documentElement;

    // Apply dark/light class
    if (mode === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }

    // Apply glassmorphism vs minimalist class
    if (style === 'minimalist') {
      root.classList.remove('theme-glassmorphism');
      root.classList.add('theme-minimalist');
    } else {
      root.classList.remove('theme-minimalist');
      root.classList.add('theme-glassmorphism');
    }
  }, [style, mode]);

  const toggleTheme = () => {
    setMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider
      value={{
        style,
        mode,
        theme: mode,
        setStyle,
        setMode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
