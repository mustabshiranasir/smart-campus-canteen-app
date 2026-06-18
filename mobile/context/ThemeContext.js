// mobile/context/ThemeContext.js
import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const THEMES = {
  dark: 'dark',
  light: 'light',
  midnight: 'midnight',
  warm: 'warm',
  system: 'system',
};

const palettes = {
  dark: {
    bg: '#0F0F13',
    surface: '#1A1A22',
    card: '#22222E',
    border: '#2E2E3D',
    text: '#F0F0F5',
    textSub: '#8888A8',
    textMuted: '#555570',
    accent: '#FF7A00',
    accentSoft: 'rgba(255,122,0,0.15)',
    accentGrad: ['#FF7A00', '#FF4D00'],
    success: '#00C58E',
    error: '#FF4E6A',
    inputBg: '#1E1E28',
    shadow: '#000',
    isDark: true,
    name: 'Dark',
    icon: '🌙',
  },
  light: {
    bg: '#F7F8FC',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    border: '#E8E8F0',
    text: '#1A1A2E',
    textSub: '#6B6B85',
    textMuted: '#B0B0C8',
    accent: '#FF7A00',
    accentSoft: 'rgba(255,122,0,0.1)',
    accentGrad: ['#FF7A00', '#FF4D00'],
    success: '#00A878',
    error: '#E63950',
    inputBg: '#F2F2FA',
    shadow: '#B0B0C8',
    isDark: false,
    name: 'Light',
    icon: '☀️',
  },
  midnight: {
    bg: '#050912',
    surface: '#0D1225',
    card: '#111930',
    border: '#1E2840',
    text: '#E8EEFF',
    textSub: '#7A88B8',
    textMuted: '#3A4460',
    accent: '#5E8FFF',
    accentSoft: 'rgba(94,143,255,0.15)',
    accentGrad: ['#5E8FFF', '#8B5CFF'],
    success: '#00D4A1',
    error: '#FF5C77',
    inputBg: '#0D1225',
    shadow: '#000',
    isDark: true,
    name: 'Midnight',
    icon: '✨',
  },
  warm: {
    bg: '#FFF8F2',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    border: '#F0E0D0',
    text: '#2A1800',
    textSub: '#7A5A40',
    textMuted: '#C8A88A',
    accent: '#E85D04',
    accentSoft: 'rgba(232,93,4,0.1)',
    accentGrad: ['#E85D04', '#DC2F02'],
    success: '#3A7D44',
    error: '#D62839',
    inputBg: '#FFF3EA',
    shadow: '#D4A070',
    isDark: false,
    name: 'Warm',
    icon: '🔥',
  },
};

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [themeKey, setThemeKey] = useState('dark');

  useEffect(() => {
    AsyncStorage.getItem('appTheme').then((saved) => {
      if (saved && palettes[saved]) setThemeKey(saved);
      else if (saved === 'system') setThemeKey('system');
    });
  }, []);

  const resolvedKey = themeKey === 'system'
    ? (systemScheme === 'dark' ? 'dark' : 'light')
    : themeKey;

  const theme = palettes[resolvedKey] || palettes.dark;

  const setTheme = async (key) => {
    setThemeKey(key);
    await AsyncStorage.setItem('appTheme', key);
  };

  return (
    <ThemeContext.Provider value={{ theme, themeKey, setTheme, THEMES, palettes }}>
      {children}
    </ThemeContext.Provider>
  );
}