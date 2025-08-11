import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { 
  AccessibilityInfo, 
  Alert,
  Platform,
  Dimensions,
  PixelRatio
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAnalytics } from './AnalyticsContext';

// Accessibility settings interface
export interface AccessibilitySettings {
  // Visual accessibility
  highContrastEnabled: boolean;
  largeTextEnabled: boolean;
  boldTextEnabled: boolean;
  reducedMotionEnabled: boolean;
  colorBlindnessType: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'monochromacy';
  
  // Audio accessibility
  screenReaderEnabled: boolean;
  soundEffectsEnabled: boolean;
  voiceGuidanceEnabled: boolean;
  hapticFeedbackEnabled: boolean;
  
  // Interaction accessibility
  touchAccommodationsEnabled: boolean;
  slowAnimationsEnabled: boolean;
  simplifiedUIEnabled: boolean;
  focusIndicatorEnhanced: boolean;
  
  // Text and content
  fontSize: number; // Scale factor (0.8 to 2.0)
  lineHeight: number; // Scale factor (1.0 to 1.8)
  readingTimeExtended: boolean;
  contentFiltering: 'none' | 'basic' | 'strict';
  
  // Navigation
  tabNavigationOnly: boolean;
  gestureAlternatives: boolean;
  voiceCommandsEnabled: boolean;
  switchControlEnabled: boolean;
}

// System accessibility info
interface SystemAccessibilityInfo {
  screenReaderEnabled: boolean;
  isReduceMotionEnabled: boolean;
  isReduceTransparencyEnabled: boolean;
  isGrayscaleEnabled: boolean;
  isInvertColorsEnabled: boolean;
  isBoldTextEnabled: boolean;
}

// Accessibility state
interface AccessibilityState {
  settings: AccessibilitySettings;
  systemInfo: SystemAccessibilityInfo;
  isLoading: boolean;
}

// Accessibility actions
type AccessibilityAction = 
  | { type: 'LOAD_SETTINGS'; payload: AccessibilitySettings }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AccessibilitySettings> }
  | { type: 'UPDATE_SYSTEM_INFO'; payload: Partial<SystemAccessibilityInfo> }
  | { type: 'RESET_SETTINGS' }
  | { type: 'SET_LOADING'; payload: boolean };

// Default accessibility settings
const defaultAccessibilitySettings: AccessibilitySettings = {
  highContrastEnabled: false,
  largeTextEnabled: false,
  boldTextEnabled: false,
  reducedMotionEnabled: false,
  colorBlindnessType: 'none',
  screenReaderEnabled: false,
  soundEffectsEnabled: true,
  voiceGuidanceEnabled: false,
  hapticFeedbackEnabled: true,
  touchAccommodationsEnabled: false,
  slowAnimationsEnabled: false,
  simplifiedUIEnabled: false,
  focusIndicatorEnhanced: false,
  fontSize: 1.0,
  lineHeight: 1.2,
  readingTimeExtended: false,
  contentFiltering: 'none',
  tabNavigationOnly: false,
  gestureAlternatives: false,
  voiceCommandsEnabled: false,
  switchControlEnabled: false
};

const defaultSystemInfo: SystemAccessibilityInfo = {
  screenReaderEnabled: false,
  isReduceMotionEnabled: false,
  isReduceTransparencyEnabled: false,
  isGrayscaleEnabled: false,
  isInvertColorsEnabled: false,
  isBoldTextEnabled: false
};

// Accessibility context interface
interface AccessibilityContextType extends AccessibilityState {
  updateAccessibilitySettings: (settings: Partial<AccessibilitySettings>) => Promise<void>;
  resetAccessibilitySettings: () => Promise<void>;
  getAdjustedFontSize: (baseFontSize: number) => number;
  getAdjustedLineHeight: (baseLineHeight: number) => number;
  shouldReduceMotion: () => boolean;
  shouldEnhanceContrast: () => boolean;
  getColorAdjusted: (color: string) => string;
  announceForAccessibility: (message: string) => void;
  enableVoiceGuidance: () => void;
  disableVoiceGuidance: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

// Accessibility reducer
const accessibilityReducer = (state: AccessibilityState, action: AccessibilityAction): AccessibilityState => {
  switch (action.type) {
    case 'LOAD_SETTINGS':
      return {
        ...state,
        settings: { ...defaultAccessibilitySettings, ...action.payload },
        isLoading: false
      };
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload }
      };
    case 'UPDATE_SYSTEM_INFO':
      return {
        ...state,
        systemInfo: { ...state.systemInfo, ...action.payload }
      };
    case 'RESET_SETTINGS':
      return {
        ...state,
        settings: defaultAccessibilitySettings
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
    default:
      return state;
  }
};

// Color adjustment utilities
const adjustColorForColorBlindness = (color: string, type: AccessibilitySettings['colorBlindnessType']): string => {
  if (type === 'none') return color;
  
  // Basic color adjustments for color blindness
  // This is a simplified implementation - in production, you'd use a more sophisticated algorithm
  const colorMap: { [key: string]: { [key in Exclude<AccessibilitySettings['colorBlindnessType'], 'none'>]: string } } = {
    '#FF6B6B': {
      protanopia: '#FFA500',    // Orange instead of red
      deuteranopia: '#FFD700',  // Gold instead of red
      tritanopia: '#FF69B4',    // Pink instead of red
      monochromacy: '#808080'   // Gray
    },
    '#4ECDC4': {
      protanopia: '#87CEEB',    // Light blue
      deuteranopia: '#87CEEB',  // Light blue
      tritanopia: '#9370DB',    // Purple
      monochromacy: '#A0A0A0'   // Light gray
    }
  };

  return colorMap[color]?.[type] || color;
};

const enhanceContrast = (color: string, background: string): string => {
  // Simplified contrast enhancement
  // In production, you'd calculate actual contrast ratios and adjust accordingly
  if (background === '#FFFFFF' || background.toLowerCase() === '#ffffff') {
    // Light background - make colors darker
    return color === '#FF6B6B' ? '#CC0000' : 
           color === '#4ECDC4' ? '#006B63' : color;
  } else {
    // Dark background - make colors lighter
    return color === '#FF6B6B' ? '#FF8A80' : 
           color === '#4ECDC4' ? '#80CBC4' : color;
  }
};

// Accessibility provider component
interface AccessibilityProviderProps {
  children: ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const { trackEvent } = useAnalytics();
  
  const [state, dispatch] = useReducer(accessibilityReducer, {
    settings: defaultAccessibilitySettings,
    systemInfo: defaultSystemInfo,
    isLoading: true
  });

  // Load accessibility settings on app start
  useEffect(() => {
    const loadAccessibilitySettings = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        // Load saved user settings
        const savedSettings = await AsyncStorage.getItem('accessibilitySettings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          dispatch({ type: 'LOAD_SETTINGS', payload: parsedSettings });
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }

        // Get system accessibility info
        const systemInfo = await getSystemAccessibilityInfo();
        dispatch({ type: 'UPDATE_SYSTEM_INFO', payload: systemInfo });
        
      } catch (error) {
        console.error('Error loading accessibility settings:', error);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadAccessibilitySettings();
  }, []);

  // Get system accessibility information
  const getSystemAccessibilityInfo = async (): Promise<SystemAccessibilityInfo> => {
    try {
      const [
        screenReaderEnabled,
        isReduceMotionEnabled,
        isReduceTransparencyEnabled,
        isGrayscaleEnabled,
        isInvertColorsEnabled,
        isBoldTextEnabled
      ] = await Promise.all([
        AccessibilityInfo.isScreenReaderEnabled(),
        AccessibilityInfo.isReduceMotionEnabled(),
        Platform.OS === 'ios' ? AccessibilityInfo.isReduceTransparencyEnabled() : Promise.resolve(false),
        Platform.OS === 'ios' ? AccessibilityInfo.isGrayscaleEnabled() : Promise.resolve(false),
        Platform.OS === 'ios' ? AccessibilityInfo.isInvertColorsEnabled() : Promise.resolve(false),
        Platform.OS === 'ios' ? AccessibilityInfo.isBoldTextEnabled() : Promise.resolve(false)
      ]);

      return {
        screenReaderEnabled,
        isReduceMotionEnabled,
        isReduceTransparencyEnabled,
        isGrayscaleEnabled,
        isInvertColorsEnabled,
        isBoldTextEnabled
      };
    } catch (error) {
      console.error('Error getting system accessibility info:', error);
      return defaultSystemInfo;
    }
  };

  // Listen for system accessibility changes
  useEffect(() => {
    const subscriptions: any[] = [];

    // Screen reader changes
    const screenReaderSubscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (screenReaderEnabled) => {
        dispatch({ 
          type: 'UPDATE_SYSTEM_INFO', 
          payload: { screenReaderEnabled } 
        });
        
        // Auto-enable voice guidance when screen reader is enabled
        if (screenReaderEnabled && !state.settings.voiceGuidanceEnabled) {
          updateAccessibilitySettings({ voiceGuidanceEnabled: true });
        }
      }
    );
    subscriptions.push(screenReaderSubscription);

    // Reduce motion changes
    const reduceMotionSubscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (isReduceMotionEnabled) => {
        dispatch({ 
          type: 'UPDATE_SYSTEM_INFO', 
          payload: { isReduceMotionEnabled } 
        });
        
        // Auto-enable reduced motion setting
        if (isReduceMotionEnabled && !state.settings.reducedMotionEnabled) {
          updateAccessibilitySettings({ reducedMotionEnabled: true });
        }
      }
    );
    subscriptions.push(reduceMotionSubscription);

    // iOS-specific subscriptions
    if (Platform.OS === 'ios') {
      const boldTextSubscription = AccessibilityInfo.addEventListener(
        'boldTextChanged',
        (isBoldTextEnabled) => {
          dispatch({ 
            type: 'UPDATE_SYSTEM_INFO', 
            payload: { isBoldTextEnabled } 
          });
          
          // Auto-enable bold text setting
          if (isBoldTextEnabled && !state.settings.boldTextEnabled) {
            updateAccessibilitySettings({ boldTextEnabled: true });
          }
        }
      );
      subscriptions.push(boldTextSubscription);
    }

    return () => {
      subscriptions.forEach(subscription => subscription?.remove());
    };
  }, [state.settings]);

  // Update accessibility settings
  const updateAccessibilitySettings = async (newSettings: Partial<AccessibilitySettings>) => {
    try {
      const updatedSettings = { ...state.settings, ...newSettings };
      
      // Save to storage
      await AsyncStorage.setItem('accessibilitySettings', JSON.stringify(updatedSettings));
      
      // Update state
      dispatch({ type: 'UPDATE_SETTINGS', payload: newSettings });
      
      // Track accessibility changes
      Object.keys(newSettings).forEach(key => {
        trackEvent('accessibility_setting_changed', {
          setting: key,
          value: newSettings[key as keyof AccessibilitySettings],
          source: 'user'
        });
      });

    } catch (error) {
      console.error('Error updating accessibility settings:', error);
      Alert.alert('Error', 'Failed to save accessibility settings');
    }
  };

  // Reset accessibility settings
  const resetAccessibilitySettings = async () => {
    try {
      await AsyncStorage.removeItem('accessibilitySettings');
      dispatch({ type: 'RESET_SETTINGS' });
      
      trackEvent('accessibility_settings_reset', {
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error resetting accessibility settings:', error);
    }
  };

  // Get adjusted font size based on accessibility settings
  const getAdjustedFontSize = (baseFontSize: number): number => {
    let adjustedSize = baseFontSize * state.settings.fontSize;
    
    // Apply system font scale if large text is enabled
    if (state.settings.largeTextEnabled) {
      adjustedSize *= PixelRatio.getFontScale();
    }
    
    return Math.round(adjustedSize);
  };

  // Get adjusted line height
  const getAdjustedLineHeight = (baseLineHeight: number): number => {
    return baseLineHeight * state.settings.lineHeight;
  };

  // Check if motion should be reduced
  const shouldReduceMotion = (): boolean => {
    return state.settings.reducedMotionEnabled || state.systemInfo.isReduceMotionEnabled;
  };

  // Check if contrast should be enhanced
  const shouldEnhanceContrast = (): boolean => {
    return state.settings.highContrastEnabled || state.systemInfo.isGrayscaleEnabled;
  };

  // Get color adjusted for accessibility
  const getColorAdjusted = (color: string): string => {
    let adjustedColor = color;
    
    // Apply color blindness adjustments
    if (state.settings.colorBlindnessType !== 'none') {
      adjustedColor = adjustColorForColorBlindness(adjustedColor, state.settings.colorBlindnessType);
    }
    
    // Apply contrast enhancement
    if (shouldEnhanceContrast()) {
      adjustedColor = enhanceContrast(adjustedColor, '#FFFFFF'); // Simplified - should use actual background
    }
    
    return adjustedColor;
  };

  // Announce message for screen readers
  const announceForAccessibility = (message: string) => {
    if (state.settings.screenReaderEnabled || state.systemInfo.screenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility(message);
    }
  };

  // Enable voice guidance
  const enableVoiceGuidance = async () => {
    await updateAccessibilitySettings({ voiceGuidanceEnabled: true });
    announceForAccessibility('Voice guidance enabled');
  };

  // Disable voice guidance
  const disableVoiceGuidance = async () => {
    await updateAccessibilitySettings({ voiceGuidanceEnabled: false });
    announceForAccessibility('Voice guidance disabled');
  };

  const contextValue: AccessibilityContextType = {
    ...state,
    updateAccessibilitySettings,
    resetAccessibilitySettings,
    getAdjustedFontSize,
    getAdjustedLineHeight,
    shouldReduceMotion,
    shouldEnhanceContrast,
    getColorAdjusted,
    announceForAccessibility,
    enableVoiceGuidance,
    disableVoiceGuidance
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
    </AccessibilityContext.Provider>
  );
};

// Custom hook for using accessibility
export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

// Accessibility utility hooks
export const useAccessibleText = () => {
  const { getAdjustedFontSize, getAdjustedLineHeight, settings } = useAccessibility();
  
  return {
    getFontSize: getAdjustedFontSize,
    getLineHeight: getAdjustedLineHeight,
    isBoldTextEnabled: settings.boldTextEnabled,
    isLargeTextEnabled: settings.largeTextEnabled
  };
};

export const useAccessibleColors = () => {
  const { getColorAdjusted, shouldEnhanceContrast, settings } = useAccessibility();
  
  return {
    getColor: getColorAdjusted,
    shouldEnhanceContrast,
    colorBlindnessType: settings.colorBlindnessType
  };
};

export const useAccessibleMotion = () => {
  const { shouldReduceMotion, settings } = useAccessibility();
  
  return {
    shouldReduceMotion,
    slowAnimationsEnabled: settings.slowAnimationsEnabled,
    getAnimationDuration: (baseDuration: number) => 
      settings.slowAnimationsEnabled ? baseDuration * 2 : 
      shouldReduceMotion() ? 0 : baseDuration
  };
};

export const useScreenReader = () => {
  const { announceForAccessibility, settings, systemInfo } = useAccessibility();
  
  return {
    announce: announceForAccessibility,
    isEnabled: settings.screenReaderEnabled || systemInfo.screenReaderEnabled,
    voiceGuidanceEnabled: settings.voiceGuidanceEnabled
  };
};

export default AccessibilityContext;