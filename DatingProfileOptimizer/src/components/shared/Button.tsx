/**
 * Enhanced Button Component - Dating Profile Optimizer
 * WCAG 2.1 AA compliant with dating-specific optimizations
 * Material Design 3 with platform-specific adaptations
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Platform,
  Vibration,
  TouchableOpacityProps,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, SIZES, ACCESSIBILITY } from '../../utils/designSystem';

interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  // Content
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  
  // Variants
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger' | 'success' | 'platform';
  size?: 'small' | 'medium' | 'large';
  platformType?: 'tinder' | 'bumble' | 'hinge' | 'match';
  
  // States
  loading?: boolean;
  disabled?: boolean;
  selected?: boolean;
  
  // Layout
  fullWidth?: boolean;
  compact?: boolean;
  elevated?: boolean;
  
  // Styling
  style?: any;
  textStyle?: any;
  
  // Accessibility
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  
  // Callbacks
  onPress?: () => void;
  onLongPress?: () => void;
  
  // Features
  hapticFeedback?: boolean;
  gradientBackground?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  title,
  subtitle,
  icon,
  iconPosition = 'left',
  variant = 'primary',
  size = 'medium',
  platformType,
  loading = false,
  disabled = false,
  selected = false,
  fullWidth = false,
  compact = false,
  elevated = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  testID,
  onPress,
  onLongPress,
  hapticFeedback = true,
  gradientBackground = false,
  ...rest
}) => {
  // Handle press with haptic feedback
  const handlePress = () => {
    if (disabled || loading) return;
    
    if (hapticFeedback && Platform.OS === 'ios') {
      Vibration.vibrate(10);
    }
    
    onPress?.();
  };

  // Get button styles based on variant and state
  const getButtonStyles = () => {
    const isDisabled = disabled || loading;
    
    const baseVariants = {
      primary: {
        backgroundColor: isDisabled 
          ? COLORS.neutral[300] 
          : selected 
            ? COLORS.primary[700]
            : COLORS.primary[500],
        borderWidth: 0,
      },
      secondary: {
        backgroundColor: isDisabled 
          ? COLORS.neutral[100] 
          : selected 
            ? COLORS.secondary[700]
            : COLORS.secondary[500],
        borderWidth: 0,
      },
      tertiary: {
        backgroundColor: isDisabled 
          ? COLORS.neutral[100] 
          : selected 
            ? COLORS.primary[50]
            : COLORS.surface.primary,
        borderWidth: 1,
        borderColor: isDisabled 
          ? COLORS.neutral[300] 
          : selected 
            ? COLORS.primary[500]
            : COLORS.primary[500],
      },
      ghost: {
        backgroundColor: 'transparent',
        borderWidth: 0,
      },
      danger: {
        backgroundColor: isDisabled 
          ? COLORS.neutral[300] 
          : selected 
            ? COLORS.semantic.errorDark
            : COLORS.semantic.error,
        borderWidth: 0,
      },
      success: {
        backgroundColor: isDisabled 
          ? COLORS.neutral[300] 
          : selected 
            ? COLORS.semantic.successDark
            : COLORS.semantic.success,
        borderWidth: 0,
      },
      platform: {
        backgroundColor: isDisabled 
          ? COLORS.neutral[300]
          : platformType 
            ? COLORS.platform[platformType]
            : COLORS.primary[500],
        borderWidth: 0,
      },
    };

    const sizeStyles = {
      small: {
        height: compact ? SIZES.button.small - 8 : SIZES.button.small,
        paddingHorizontal: compact ? SPACING.sm : SPACING.md,
        borderRadius: RADIUS.component.button - 2,
      },
      medium: {
        height: compact ? SIZES.button.medium - 8 : SIZES.button.medium,
        paddingHorizontal: compact ? SPACING.md : SPACING.lg,
        borderRadius: RADIUS.component.button,
      },
      large: {
        height: compact ? SIZES.button.large - 8 : SIZES.button.large,
        paddingHorizontal: compact ? SPACING.lg : SPACING.xl,
        borderRadius: RADIUS.component.button + 2,
      },
    };

    const elevationStyle = elevated ? SHADOWS.medium : {};

    return {
      ...baseVariants[variant],
      ...sizeStyles[size],
      ...elevationStyle,
    };
  };

  // Get text styles based on variant and size
  const getTextStyles = () => {
    const isDisabled = disabled || loading;
    
    const textColors = {
      primary: isDisabled ? COLORS.neutral[500] : COLORS.text.inverse,
      secondary: isDisabled ? COLORS.neutral[500] : COLORS.text.inverse,
      tertiary: isDisabled ? COLORS.neutral[500] : COLORS.primary[500],
      ghost: isDisabled ? COLORS.neutral[500] : COLORS.primary[500],
      danger: isDisabled ? COLORS.neutral[500] : COLORS.text.inverse,
      success: isDisabled ? COLORS.neutral[500] : COLORS.text.inverse,
      platform: isDisabled ? COLORS.neutral[500] : COLORS.text.inverse,
    };

    const sizeStyles = {
      small: {
        ...TYPOGRAPHY.label.small,
      },
      medium: {
        ...TYPOGRAPHY.button,
      },
      large: {
        ...TYPOGRAPHY.title.small,
      },
    };

    return {
      color: textColors[variant],
      ...sizeStyles[size],
    };
  };

  const getSubtitleStyles = () => {
    const isDisabled = disabled || loading;
    
    return {
      ...TYPOGRAPHY.body.small,
      color: variant === 'tertiary' || variant === 'ghost' 
        ? COLORS.text.secondary 
        : COLORS.text.inverse,
      opacity: isDisabled ? 0.6 : 0.8,
      marginTop: 2,
    };
  };

  // Loading indicator color
  const getLoadingColor = () => {
    if (variant === 'tertiary' || variant === 'ghost') {
      return COLORS.primary[500];
    }
    return COLORS.text.inverse;
  };

  // Accessibility props
  const accessibilityProps = {
    accessible: true,
    accessibilityRole: 'button' as const,
    accessibilityLabel: accessibilityLabel || title,
    accessibilityHint,
    accessibilityState: {
      disabled: disabled || loading,
      busy: loading,
      selected,
    },
    testID,
  };

  // Render icon helper
  const renderIcon = () => {
    if (!icon || loading) return null;
    
    const iconStyle = {
      marginRight: iconPosition === 'left' ? SPACING.sm : 0,
      marginLeft: iconPosition === 'right' ? SPACING.sm : 0,
    };

    return (
      <View style={iconStyle}>
        {icon}
      </View>
    );
  };

  // Render loading indicator
  const renderLoading = () => {
    if (!loading) return null;
    
    return (
      <ActivityIndicator
        size={size === 'large' ? 'small' : 'small'}
        color={getLoadingColor()}
        style={{ marginRight: SPACING.sm }}
      />
    );
  };

  // Render content
  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContent}>
          {renderLoading()}
          <Text style={[getTextStyles(), textStyle, { opacity: 0.7 }]}>
            {title}
          </Text>
        </View>
      );
    }

    return (
      <View style={[
        styles.content,
        iconPosition === 'right' && styles.contentReverse,
        subtitle && styles.contentColumn,
      ]}>
        {iconPosition === 'left' && renderIcon()}
        
        <View style={subtitle ? styles.textContainer : undefined}>
          <Text 
            style={[getTextStyles(), textStyle]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {title}
          </Text>
          {subtitle && (
            <Text 
              style={getSubtitleStyles()}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
        </View>
        
        {iconPosition === 'right' && renderIcon()}
      </View>
    );
  };

  const buttonStyles = getButtonStyles();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        buttonStyles,
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        selected && styles.selected,
        style,
      ]}
      onPress={handlePress}
      onLongPress={onLongPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...accessibilityProps}
      {...rest}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

// Preset button variants for common use cases
export const PrimaryButton: React.FC<Partial<ButtonProps>> = (props) => (
  <Button variant="primary" {...props} />
);

export const SecondaryButton: React.FC<Partial<ButtonProps>> = (props) => (
  <Button variant="secondary" {...props} />
);

export const TertiaryButton: React.FC<Partial<ButtonProps>> = (props) => (
  <Button variant="tertiary" {...props} />
);

export const GhostButton: React.FC<Partial<ButtonProps>> = (props) => (
  <Button variant="ghost" {...props} />
);

export const DangerButton: React.FC<Partial<ButtonProps>> = (props) => (
  <Button variant="danger" {...props} />
);

export const SuccessButton: React.FC<Partial<ButtonProps>> = (props) => (
  <Button variant="success" {...props} />
);

// Platform-specific buttons
export const TinderButton: React.FC<Partial<ButtonProps>> = (props) => (
  <Button variant="platform" platformType="tinder" {...props} />
);

export const BumbleButton: React.FC<Partial<ButtonProps>> = (props) => (
  <Button variant="platform" platformType="bumble" {...props} />
);

export const HingeButton: React.FC<Partial<ButtonProps>> = (props) => (
  <Button variant="platform" platformType="hinge" {...props} />
);

// Floating Action Button (Material Design)
interface FABProps {
  onPress: () => void;
  icon: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  position?: 'bottomRight' | 'bottomLeft' | 'topRight' | 'topLeft';
  style?: any;
  accessibilityLabel?: string;
  testID?: string;
}

export const FAB: React.FC<FABProps> = ({
  onPress,
  icon,
  size = 'medium',
  position = 'bottomRight',
  style,
  accessibilityLabel,
  testID,
}) => {
  const fabSizes = {
    small: { width: 40, height: 40, borderRadius: 20 },
    medium: { width: 56, height: 56, borderRadius: 28 },
    large: { width: 72, height: 72, borderRadius: 36 },
  };

  const positions = {
    bottomRight: {
      position: 'absolute' as const,
      bottom: SPACING.lg + 80, // Account for bottom tabs
      right: SPACING.lg,
    },
    bottomLeft: {
      position: 'absolute' as const,
      bottom: SPACING.lg + 80,
      left: SPACING.lg,
    },
    topRight: {
      position: 'absolute' as const,
      top: SPACING.lg,
      right: SPACING.lg,
    },
    topLeft: {
      position: 'absolute' as const,
      top: SPACING.lg,
      left: SPACING.lg,
    },
  };

  return (
    <TouchableOpacity
      style={[
        styles.fab,
        fabSizes[size],
        positions[position],
        SHADOWS.heavy,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.9}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {icon}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: ACCESSIBILITY.touchTargetSize,
    ...Platform.select({
      android: {
        elevation: 2,
      },
    }),
  },
  
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  contentColumn: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  
  contentReverse: {
    flexDirection: 'row-reverse',
  },
  
  textContainer: {
    alignItems: 'center',
  },
  
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  fullWidth: {
    alignSelf: 'stretch',
  },
  
  disabled: {
    opacity: 0.6,
  },
  
  selected: {
    transform: [{ scale: 0.98 }],
  },
  
  fab: {
    backgroundColor: COLORS.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      android: {
        elevation: 6,
      },
    }),
  },
});

export default Button;