/**
 * Accessible View Component
 * Wrapper that applies accessibility settings to child components
 */

import React from 'react';
import {
  View,
  ViewProps,
  AccessibilityProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useAccessibility } from '../../contexts/AccessibilityContext';

interface AccessibleViewProps extends ViewProps, AccessibilityProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  enhanceFocus?: boolean;
  adjustTouchTarget?: boolean;
  announceChanges?: boolean;
  highContrastBorder?: boolean;
}

const AccessibleView: React.FC<AccessibleViewProps> = ({
  children,
  style,
  enhanceFocus = false,
  adjustTouchTarget = false,
  announceChanges = false,
  highContrastBorder = false,
  accessibilityRole,
  accessibilityLabel,
  accessibilityHint,
  accessible = true,
  ...restProps
}) => {
  const {
    getCurrentColorPalette,
    getTouchTargetSize,
    shouldShowFocusIndicator,
    shouldReduceMotion,
    announceForAccessibility,
  } = useAccessibility();

  const colorPalette = getCurrentColorPalette();
  const touchTargetSize = getTouchTargetSize();
  const showFocus = shouldShowFocusIndicator();

  // Build dynamic styles based on accessibility settings
  const accessibilityStyles: ViewStyle = {};

  // Apply touch target adjustments
  if (adjustTouchTarget) {
    accessibilityStyles.minHeight = touchTargetSize;
    accessibilityStyles.minWidth = touchTargetSize;
  }

  // Apply focus indicators
  if (enhanceFocus && showFocus) {
    accessibilityStyles.borderWidth = 2;
    accessibilityStyles.borderColor = colorPalette.focus;
    accessibilityStyles.borderRadius = 4;
  }

  // Apply high contrast borders
  if (highContrastBorder) {
    accessibilityStyles.borderWidth = 1;
    accessibilityStyles.borderColor = colorPalette.border;
  }

  // Announce content changes for screen readers
  React.useEffect(() => {
    if (announceChanges && accessibilityLabel) {
      announceForAccessibility(accessibilityLabel);
    }
  }, [announceChanges, accessibilityLabel, announceForAccessibility]);

  return (
    <View
      style={[style, accessibilityStyles]}
      accessible={accessible}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      {...restProps}
    >
      {children}
    </View>
  );
};

export default AccessibleView;