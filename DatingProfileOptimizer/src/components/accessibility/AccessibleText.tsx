/**
 * Accessible Text Component
 * Text component that automatically applies accessibility settings
 */

import React from 'react';
import {
  Text,
  TextProps,
  StyleProp,
  TextStyle,
} from 'react-native';
import { useAccessibility } from '../../contexts/AccessibilityContext';

interface AccessibleTextProps extends TextProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'inverse' | 'error' | 'success' | 'warning';
  size?: 'caption' | 'body' | 'title' | 'headline';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  autoScale?: boolean;
  highContrast?: boolean;
  announceChanges?: boolean;
}

const AccessibleText: React.FC<AccessibleTextProps> = ({
  children,
  style,
  variant = 'primary',
  size = 'body',
  weight = 'normal',
  autoScale = true,
  highContrast = false,
  announceChanges = false,
  accessible = true,
  ...restProps
}) => {
  const {
    getCurrentColorPalette,
    getAccessibleTextSize,
    state,
    announceForAccessibility,
  } = useAccessibility();

  const colorPalette = getCurrentColorPalette();
  
  // Base font sizes for different variants
  const baseFontSizes = {
    caption: 12,
    body: 16,
    title: 20,
    headline: 24,
  };

  // Font weights
  const fontWeights = {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  };

  // Get color based on variant
  const getTextColor = () => {
    if (highContrast) {
      return variant === 'inverse' ? '#FFFFFF' : '#000000';
    }

    switch (variant) {
      case 'primary':
        return colorPalette.text.primary;
      case 'secondary':
        return colorPalette.text.secondary;
      case 'tertiary':
        return colorPalette.text.secondary; // Using secondary as fallback
      case 'inverse':
        return '#FFFFFF'; // Always white for inverse
      case 'error':
        return colorPalette.error;
      case 'success':
        return colorPalette.success;
      case 'warning':
        return colorPalette.warning;
      default:
        return colorPalette.text.primary;
    }
  };

  // Build text styles
  const textStyles: TextStyle = {
    color: getTextColor(),
    fontWeight: fontWeights[weight],
  };

  // Apply text scaling
  if (autoScale) {
    const baseFontSize = baseFontSizes[size];
    textStyles.fontSize = getAccessibleTextSize(baseFontSize);
  } else {
    textStyles.fontSize = baseFontSizes[size];
  }

  // Apply bold text if system setting is enabled
  if (state.systemSettings.isBoldTextEnabled || state.settings.largeText) {
    textStyles.fontWeight = fontWeights.bold;
  }

  // Adjust line height for better readability
  if (state.settings.largeText) {
    textStyles.lineHeight = (textStyles.fontSize as number) * 1.4;
  }

  // Announce text changes for screen readers
  React.useEffect(() => {
    if (announceChanges && typeof children === 'string') {
      announceForAccessibility(children);
    }
  }, [announceChanges, children, announceForAccessibility]);

  return (
    <Text
      style={[textStyles, style]}
      accessible={accessible}
      {...restProps}
    >
      {children}
    </Text>
  );
};

export default AccessibleText;