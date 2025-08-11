import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Appearance, ColorSchemeName, StatusBar, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAccessibility } from './AccessibilityContext';

// Theme types
export type ThemeMode = 'light' | 'dark' | 'auto' | 'high_contrast_light' | 'high_contrast_dark';
export type ColorScheme = 'light' | 'dark';

export interface ThemeColors {
  // Base colors
  primary: string;
  primaryVariant: string;
  secondary: string;
  secondaryVariant: string;
  background: string;
  surface: string;
  error: string;
  warning: string;
  success: string;
  info: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textDisabled: string;
  textInverse: string;
  
  // Interactive colors
  border: string;
  divider: string;
  shadow: string;
  overlay: string;
  
  // Accessibility colors
  focus: string;
  selection: string;
  
  // Component-specific colors
  card: string;
  notification: string;
  modal: string;
  
  // Gradient colors
  gradientStart: string;
  gradientEnd: string;
}

export interface Theme {
  mode: ThemeMode;
  scheme: ColorScheme;
  colors: ThemeColors;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    fontSize: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
      xxl: number;
    };
    lineHeight: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
      xxl: number;
    };
    fontWeight: {
      light: string;
      normal: string;
      medium: string;
      semibold: string;
      bold: string;
    };
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  shadows: {
    sm: object;
    md: object;
    lg: object;
  };
  animation: {
    scale: number;
    duration: {
      fast: number;
      normal: number;
      slow: number;
    };
  };
}

// Theme definitions
const lightTheme: ThemeColors = {
  primary: '#FF6B6B',
  primaryVariant: '#FF5252',
  secondary: '#4ECDC4',
  secondaryVariant: '#26A69A',
  background: '#FFFFFF',
  surface: '#F8F9FA',
  error: '#F44336',
  warning: '#FF9800',
  success: '#4CAF50',
  info: '#2196F3',
  text: '#212121',
  textSecondary: '#757575',
  textDisabled: '#BDBDBD',
  textInverse: '#FFFFFF',
  border: '#E0E0E0',
  divider: '#F0F0F0',
  shadow: 'rgba(0, 0, 0, 0.1)',
  overlay: 'rgba(0, 0, 0, 0.5)',
  focus: '#2196F3',
  selection: 'rgba(33, 150, 243, 0.2)',
  card: '#FFFFFF',
  notification: '#FF6B6B',
  modal: '#FFFFFF',
  gradientStart: '#FF6B6B',
  gradientEnd: '#4ECDC4'
};

const darkTheme: ThemeColors = {
  primary: '#FF6B6B',
  primaryVariant: '#FF8A80',
  secondary: '#4ECDC4',
  secondaryVariant: '#80CBC4',
  background: '#121212',
  surface: '#1E1E1E',
  error: '#CF6679',
  warning: '#FFB74D',
  success: '#81C784',
  info: '#64B5F6',
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  textDisabled: '#666666',
  textInverse: '#000000',
  border: '#333333',
  divider: '#2A2A2A',
  shadow: 'rgba(0, 0, 0, 0.3)',
  overlay: 'rgba(0, 0, 0, 0.7)',
  focus: '#64B5F6',
  selection: 'rgba(100, 181, 246, 0.2)',
  card: '#1E1E1E',
  notification: '#FF6B6B',
  modal: '#2A2A2A',
  gradientStart: '#FF6B6B',
  gradientEnd: '#4ECDC4'
};

const highContrastLightTheme: ThemeColors = {
  primary: '#000000',
  primaryVariant: '#333333',
  secondary: '#000000',
  secondaryVariant: '#333333',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  error: '#CC0000',
  warning: '#FF6600',
  success: '#008800',
  info: '#0066CC',
  text: '#000000',
  textSecondary: '#000000',
  textDisabled: '#666666',
  textInverse: '#FFFFFF',
  border: '#000000',
  divider: '#000000',
  shadow: 'rgba(0, 0, 0, 0.5)',
  overlay: 'rgba(0, 0, 0, 0.8)',
  focus: '#0066CC',
  selection: 'rgba(0, 102, 204, 0.3)',
  card: '#FFFFFF',
  notification: '#CC0000',
  modal: '#FFFFFF',
  gradientStart: '#000000',
  gradientEnd: '#333333'
};

const highContrastDarkTheme: ThemeColors = {
  primary: '#FFFFFF',
  primaryVariant: '#CCCCCC',
  secondary: '#FFFFFF',
  secondaryVariant: '#CCCCCC',
  background: '#000000',
  surface: '#000000',
  error: '#FF6666',
  warning: '#FFAA00',
  success: '#66DD66',
  info: '#6699FF',
  text: '#FFFFFF',
  textSecondary: '#FFFFFF',
  textDisabled: '#999999',
  textInverse: '#000000',
  border: '#FFFFFF',
  divider: '#FFFFFF',
  shadow: 'rgba(255, 255, 255, 0.3)',
  overlay: 'rgba(255, 255, 255, 0.2)',
  focus: '#6699FF',
  selection: 'rgba(102, 153, 255, 0.3)',
  card: '#000000',
  notification: '#FF6666',
  modal: '#000000',
  gradientStart: '#FFFFFF',
  gradientEnd: '#CCCCCC'
};

// Base theme structure
const baseTheme = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32
  },
  typography: {
    fontSize: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 24,
      xxl: 32
    },
    lineHeight: {
      xs: 16,
      sm: 20,
      md: 24,
      lg: 28,
      xl: 32,
      xxl: 40
    },
    fontWeight: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700'
    }
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16
  },
  shadows: {
    sm: {
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1
    },
    md: {
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.23,
      shadowRadius: 2.62,
      elevation: 4
    },
    lg: {
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 4.65,
      elevation: 8
    }
  },
  animation: {
    scale: 1,
    duration: {
      fast: 150,
      normal: 300,
      slow: 500
    }
  }
};

// Theme state and actions
interface ThemeState {
  mode: ThemeMode;
  theme: Theme;
}

type ThemeAction = 
  | { type: 'SET_THEME'; payload: ThemeMode }
  | { type: 'TOGGLE_THEME' }
  | { type: 'SET_SYSTEM_THEME'; payload: ColorScheme };

// Theme context
interface ThemeContextType extends ThemeState {
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme reducer
const themeReducer = (state: ThemeState, action: ThemeAction): ThemeState => {
  switch (action.type) {
    case 'SET_THEME':
      return {
        ...state,
        mode: action.payload,
        theme: createTheme(action.payload, state.theme.scheme)
      };
    case 'TOGGLE_THEME':
      const newMode = state.mode === 'light' ? 'dark' : 'light';
      return {
        ...state,
        mode: newMode,
        theme: createTheme(newMode, state.theme.scheme)
      };
    case 'SET_SYSTEM_THEME':
      return {
        ...state,
        theme: createTheme(state.mode, action.payload)
      };
    default:
      return state;
  }
};

// Create theme helper
const createTheme = (mode: ThemeMode, systemScheme: ColorScheme): Theme => {
  let colors: ThemeColors;
  let scheme: ColorScheme;

  switch (mode) {
    case 'light':
      colors = lightTheme;
      scheme = 'light';
      break;
    case 'dark':
      colors = darkTheme;
      scheme = 'dark';
      break;
    case 'high_contrast_light':
      colors = highContrastLightTheme;
      scheme = 'light';
      break;
    case 'high_contrast_dark':
      colors = highContrastDarkTheme;
      scheme = 'dark';
      break;
    case 'auto':
    default:
      if (systemScheme === 'dark') {
        colors = darkTheme;
        scheme = 'dark';
      } else {
        colors = lightTheme;
        scheme = 'light';
      }
      break;
  }

  return {
    mode,
    scheme,
    colors,
    ...baseTheme
  };
};

// Theme provider component
interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { accessibilitySettings } = useAccessibility();
  const systemScheme = Appearance.getColorScheme() || 'light';
  
  const [state, dispatch] = useReducer(themeReducer, {
    mode: 'auto',
    theme: createTheme('auto', systemScheme)
  });

  // Load saved theme on app start
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('userTheme');
        if (savedTheme) {
          const mode = savedTheme as ThemeMode;
          dispatch({ type: 'SET_THEME', payload: mode });
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      }
    };

    loadTheme();
  }, []);

  // Listen to system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      dispatch({ type: 'SET_SYSTEM_THEME', payload: colorScheme || 'light' });
    });

    return () => subscription?.remove();
  }, []);

  // Apply accessibility settings to theme
  useEffect(() => {
    if (accessibilitySettings.highContrastEnabled) {
      const contrastMode = state.theme.scheme === 'dark' ? 'high_contrast_dark' : 'high_contrast_light';
      if (state.mode !== contrastMode) {
        dispatch({ type: 'SET_THEME', payload: contrastMode });
      }
    } else if (state.mode.includes('high_contrast')) {
      // Switch back to normal theme if high contrast is disabled
      const normalMode = state.theme.scheme === 'dark' ? 'dark' : 'light';
      dispatch({ type: 'SET_THEME', payload: normalMode });
    }
  }, [accessibilitySettings.highContrastEnabled, state.mode, state.theme.scheme]);

  // Update status bar style based on theme
  useEffect(() => {
    if (Platform.OS === 'ios') {
      StatusBar.setBarStyle(state.theme.scheme === 'dark' ? 'light-content' : 'dark-content');
    } else {
      StatusBar.setBarStyle(state.theme.scheme === 'dark' ? 'light-content' : 'dark-content');
      StatusBar.setBackgroundColor(state.theme.colors.background);
    }
  }, [state.theme.scheme, state.theme.colors.background]);

  const setTheme = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem('userTheme', mode);
      dispatch({ type: 'SET_THEME', payload: mode });
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const toggleTheme = () => {
    dispatch({ type: 'TOGGLE_THEME' });
  };

  const contextValue: ThemeContextType = {
    ...state,
    setTheme,
    toggleTheme
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook for using theme
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Helper hooks for specific theme properties
export const useColors = () => {
  const { theme } = useTheme();
  return theme.colors;
};

export const useSpacing = () => {
  const { theme } = useTheme();
  return theme.spacing;
};

export const useTypography = () => {
  const { theme } = useTheme();
  return theme.typography;
};

export const useBorderRadius = () => {
  const { theme } = useTheme();
  return theme.borderRadius;
};

export const useShadows = () => {
  const { theme } = useTheme();
  return theme.shadows;
};

export default ThemeContext;