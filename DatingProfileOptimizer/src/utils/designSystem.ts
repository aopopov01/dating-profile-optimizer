/**
 * Enhanced Design System for Dating Profile Optimizer
 * Material Design 3 compliant with dating-specific optimizations
 * WCAG 2.1 AA accessibility standards
 */

import { Platform, Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Color System - Dating App Optimized
export const COLORS = {
  // Primary Brand Colors
  primary: {
    50: '#fce4ec',
    100: '#f8bbd9',
    200: '#f48fb1',
    300: '#f06292',
    400: '#ec407a',
    500: '#e91e63', // Main brand color
    600: '#d81b60',
    700: '#c2185b',
    800: '#ad1457',
    900: '#880e4f',
  },
  
  // Secondary Colors
  secondary: {
    50: '#fff3e0',
    100: '#ffe0b3',
    200: '#ffcc80',
    300: '#ffb74d',
    400: '#ffa726',
    500: '#ff9800', // Accent color
    600: '#fb8c00',
    700: '#f57c00',
    800: '#ef6c00',
    900: '#e65100',
  },
  
  // Semantic Colors
  semantic: {
    success: '#4caf50',
    successLight: '#81c784',
    successDark: '#388e3c',
    warning: '#ff9800',
    warningLight: '#ffb74d',
    warningDark: '#f57c00',
    error: '#f44336',
    errorLight: '#e57373',
    errorDark: '#d32f2f',
    info: '#2196f3',
    infoLight: '#64b5f6',
    infoDark: '#1976d2',
  },
  
  // Dating Platform Colors
  platform: {
    tinder: '#fd5068',
    bumble: '#f4c430',
    hinge: '#4b0082',
    match: '#009ddc',
    pof: '#ff6b35',
  },
  
  // Neutral Colors
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
  
  // Text Colors (WCAG 2.1 AA Compliant)
  text: {
    primary: '#212121', // 4.5:1 contrast on white
    secondary: '#616161', // 4.5:1 contrast on white
    tertiary: '#757575', // 4.5:1 contrast on white
    inverse: '#ffffff', // High contrast on dark backgrounds
    link: '#1976d2',
    disabled: '#9e9e9e',
  },
  
  // Background Colors
  background: {
    primary: '#ffffff',
    secondary: '#fafafa',
    tertiary: '#f5f5f5',
    overlay: 'rgba(0, 0, 0, 0.6)',
    modal: 'rgba(0, 0, 0, 0.8)',
    gradient: {
      primary: ['#e91e63', '#ff9800'],
      secondary: ['#ff9800', '#ff5722'],
      romantic: ['#ff6b6b', '#ffa8a8'],
      success: ['#4caf50', '#81c784'],
    },
  },
  
  // Surface Colors
  surface: {
    primary: '#ffffff',
    secondary: '#f8f9fa',
    tertiary: '#e9ecef',
    elevated: '#ffffff',
    card: '#ffffff',
    modal: '#ffffff',
  },
};

// Typography System - Dating Content Optimized
export const TYPOGRAPHY = {
  // Font Families
  fontFamily: {
    primary: Platform.select({
      ios: 'System',
      android: 'Roboto',
    }),
    secondary: Platform.select({
      ios: 'System',
      android: 'Roboto',
    }),
    mono: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
    }),
  },
  
  // Display Typography
  display: {
    large: {
      fontSize: 57,
      lineHeight: 64,
      fontWeight: '400',
      letterSpacing: -0.25,
    },
    medium: {
      fontSize: 45,
      lineHeight: 52,
      fontWeight: '400',
      letterSpacing: 0,
    },
    small: {
      fontSize: 36,
      lineHeight: 44,
      fontWeight: '400',
      letterSpacing: 0,
    },
  },
  
  // Headline Typography
  headline: {
    large: {
      fontSize: 32,
      lineHeight: 40,
      fontWeight: '600',
      letterSpacing: 0,
    },
    medium: {
      fontSize: 28,
      lineHeight: 36,
      fontWeight: '600',
      letterSpacing: 0,
    },
    small: {
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '600',
      letterSpacing: 0,
    },
  },
  
  // Title Typography
  title: {
    large: {
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '600',
      letterSpacing: 0,
    },
    medium: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '600',
      letterSpacing: 0.15,
    },
    small: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '600',
      letterSpacing: 0.1,
    },
  },
  
  // Body Typography
  body: {
    large: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '400',
      letterSpacing: 0.15,
    },
    medium: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400',
      letterSpacing: 0.25,
    },
    small: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '400',
      letterSpacing: 0.4,
    },
  },
  
  // Label Typography
  label: {
    large: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '600',
      letterSpacing: 0.1,
    },
    medium: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '600',
      letterSpacing: 0.5,
    },
    small: {
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '600',
      letterSpacing: 0.5,
    },
  },
  
  // Button Typography
  button: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  
  // Caption Typography
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    letterSpacing: 0.4,
  },
};

// Spacing System - 8px Grid
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  
  // Component-specific spacing
  component: {
    card: 16,
    button: 12,
    input: 16,
    modal: 24,
    screen: 16,
  },
  
  // Layout spacing
  layout: {
    gutter: 16,
    section: 32,
    content: 24,
  },
};

// Border Radius
export const RADIUS = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  xxxl: 24,
  full: 9999,
  
  // Component-specific radius
  component: {
    button: 8,
    card: 12,
    input: 8,
    modal: 16,
    photo: 12,
    avatar: 9999,
  },
};

// Shadows and Elevation
export const SHADOWS = {
  none: {},
  
  light: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    android: {
      elevation: 2,
    },
  }),
  
  medium: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
    },
    android: {
      elevation: 4,
    },
  }),
  
  heavy: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    },
    android: {
      elevation: 8,
    },
  }),
  
  intense: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
    },
    android: {
      elevation: 16,
    },
  }),
};

// Component Sizes
export const SIZES = {
  // Button Sizes
  button: {
    small: 36,
    medium: 48,
    large: 56,
  },
  
  // Input Sizes
  input: {
    small: 40,
    medium: 48,
    large: 56,
  },
  
  // Avatar Sizes
  avatar: {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
    xxl: 80,
  },
  
  // Icon Sizes
  icon: {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  // Photo Sizes (Dating App Optimized)
  photo: {
    thumbnail: 80,
    small: 120,
    medium: 160,
    large: 240,
    hero: screenWidth - 32,
  },
};

// Accessibility Standards
export const ACCESSIBILITY = {
  // Touch Target Sizes (WCAG Guidelines)
  touchTargetSize: Platform.select({
    ios: 44, // Apple HIG minimum
    android: 48, // Material Design minimum
  }),
  
  // Minimum contrast ratios
  contrastRatios: {
    normal: 4.5,
    large: 3.0,
    nonText: 3.0,
  },
  
  // Focus indicators
  focus: {
    width: 2,
    color: COLORS.primary[500],
    offset: 2,
  },
  
  // Animation durations (respecting reduced motion)
  animation: {
    short: 150,
    medium: 250,
    long: 350,
  },
};

// Layout Breakpoints
export const BREAKPOINTS = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  
  // Device-specific
  phone: 0,
  tablet: 768,
  desktop: 1024,
};

// Dating App Specific Constants
export const DATING_CONSTANTS = {
  // Photo specifications
  photo: {
    maxCount: 10,
    minCount: 3,
    aspectRatio: 4 / 5, // Dating app standard
    maxSize: 5 * 1024 * 1024, // 5MB
    quality: 0.8,
    formats: ['jpg', 'jpeg', 'png'],
  },
  
  // Bio specifications
  bio: {
    maxLength: {
      tinder: 500,
      bumble: 300,
      hinge: 300,
      default: 500,
    },
    minLength: 50,
    recommendedLength: 200,
  },
  
  // Platform-specific colors
  platformColors: {
    tinder: '#fd5068',
    bumble: '#f4c430',
    hinge: '#4b0082',
    match: '#009ddc',
    pof: '#ff6b35',
  },
  
  // Success metrics
  scoring: {
    excellent: 90,
    good: 75,
    average: 60,
    poor: 45,
  },
};

// Animation Easing Functions
export const EASING = {
  easeInOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  easeOut: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0.0, 1, 1)',
  sharp: 'cubic-bezier(0.4, 0.0, 0.6, 1)',
};

// Utility Functions
export const getResponsiveSize = (baseSize: number, screenWidth: number): number => {
  const scale = screenWidth / 375; // iPhone 6/7/8 base
  return Math.round(baseSize * Math.min(scale, 1.3)); // Cap scaling at 130%
};

export const getContrastColor = (backgroundColor: string): string => {
  // Simple contrast calculation - in production use a proper contrast library
  return backgroundColor === COLORS.background.primary ? COLORS.text.primary : COLORS.text.inverse;
};

export const getPlatformColor = (platform: string): string => {
  return DATING_CONSTANTS.platformColors[platform.toLowerCase()] || COLORS.primary[500];
};

export const getScoreColor = (score: number): string => {
  if (score >= DATING_CONSTANTS.scoring.excellent) return COLORS.semantic.success;
  if (score >= DATING_CONSTANTS.scoring.good) return COLORS.semantic.info;
  if (score >= DATING_CONSTANTS.scoring.average) return COLORS.semantic.warning;
  return COLORS.semantic.error;
};

export default {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  SIZES,
  ACCESSIBILITY,
  BREAKPOINTS,
  DATING_CONSTANTS,
  EASING,
  getResponsiveSize,
  getContrastColor,
  getPlatformColor,
  getScoreColor,
};