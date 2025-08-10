/**
 * Enhanced Input Component - Dating Profile Optimizer
 * Material Design 3 compliant with validation and accessibility
 * Optimized for dating profile content creation
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  TextInputProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SIZES, ACCESSIBILITY } from '../../utils/designSystem';

interface InputProps extends Omit<TextInputProps, 'style'> {
  // Content
  label?: string;
  placeholder?: string;
  helperText?: string;
  errorText?: string;
  successText?: string;
  
  // Variants
  variant?: 'outlined' | 'filled' | 'underlined';
  size?: 'small' | 'medium' | 'large';
  
  // Input types
  inputType?: 'text' | 'email' | 'password' | 'numeric' | 'bio' | 'age' | 'name';
  
  // Validation
  required?: boolean;
  validated?: boolean;
  error?: boolean;
  success?: boolean;
  
  // Features
  maxLength?: number;
  showCharacterCount?: boolean;
  clearable?: boolean;
  showPasswordToggle?: boolean;
  
  // Icons
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  
  // Styling
  style?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  
  // Dating-specific
  bioOptimization?: boolean;
  platformLimit?: 'tinder' | 'bumble' | 'hinge';
  
  // Callbacks
  onClear?: () => void;
  onValidation?: (isValid: boolean) => void;
  
  // Accessibility
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  helperText,
  errorText,
  successText,
  variant = 'outlined',
  size = 'medium',
  inputType = 'text',
  required = false,
  validated = false,
  error = false,
  success = false,
  maxLength,
  showCharacterCount = false,
  clearable = false,
  showPasswordToggle = false,
  leftIcon,
  rightIcon,
  style,
  inputStyle,
  labelStyle,
  bioOptimization = false,
  platformLimit,
  onClear,
  onValidation,
  accessibilityLabel,
  accessibilityHint,
  testID,
  value = '',
  onChangeText,
  onFocus,
  onBlur,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [internalValue, setInternalValue] = useState(value);
  
  const animatedLabel = useRef(new Animated.Value(value ? 1 : 0)).current;
  const inputRef = useRef<TextInput>(null);

  // Platform-specific character limits
  const getPlatformLimit = (): number => {
    if (inputType === 'bio' && platformLimit) {
      const limits = {
        tinder: 500,
        bumble: 300,
        hinge: 300,
      };
      return limits[platformLimit];
    }
    return maxLength || (inputType === 'bio' ? 500 : 100);
  };

  const actualMaxLength = getPlatformLimit();
  const characterCount = internalValue.length;
  const isOverLimit = characterCount > actualMaxLength;

  // Validation logic
  const validateInput = (text: string): boolean => {
    switch (inputType) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
      case 'age':
        const age = parseInt(text);
        return age >= 18 && age <= 100;
      case 'bio':
        return text.length >= 20 && text.length <= actualMaxLength;
      case 'name':
        return text.length >= 2 && text.length <= 50;
      default:
        return required ? text.length > 0 : true;
    }
  };

  // Handle input changes
  const handleChangeText = (text: string) => {
    setInternalValue(text);
    onChangeText?.(text);
    
    if (onValidation) {
      const isValid = validateInput(text);
      onValidation(isValid);
    }
  };

  // Handle focus
  const handleFocus = (e: any) => {
    setIsFocused(true);
    animateLabel(true);
    onFocus?.(e);
  };

  // Handle blur
  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (!internalValue) {
      animateLabel(false);
    }
    onBlur?.(e);
  };

  // Animate label
  const animateLabel = (focused: boolean) => {
    Animated.timing(animatedLabel, {
      toValue: focused || internalValue ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  // Update internal value when prop changes
  useEffect(() => {
    setInternalValue(value);
    if (value && !isFocused) {
      animateLabel(true);
    }
  }, [value]);

  // Get container styles
  const getContainerStyles = (): ViewStyle => {
    const baseVariants = {
      outlined: {
        borderWidth: 1,
        borderColor: error 
          ? COLORS.semantic.error 
          : success 
            ? COLORS.semantic.success
            : isFocused 
              ? COLORS.primary[500] 
              : COLORS.neutral[300],
        backgroundColor: COLORS.surface.primary,
        borderRadius: RADIUS.component.input,
      },
      filled: {
        backgroundColor: error 
          ? COLORS.semantic.error + '10'
          : success 
            ? COLORS.semantic.success + '10'
            : COLORS.neutral[100],
        borderRadius: RADIUS.component.input,
        borderBottomWidth: 2,
        borderBottomColor: error 
          ? COLORS.semantic.error 
          : success 
            ? COLORS.semantic.success
            : isFocused 
              ? COLORS.primary[500] 
              : COLORS.neutral[400],
      },
      underlined: {
        borderBottomWidth: error || success ? 2 : 1,
        borderBottomColor: error 
          ? COLORS.semantic.error 
          : success 
            ? COLORS.semantic.success
            : isFocused 
              ? COLORS.primary[500] 
              : COLORS.neutral[400],
        backgroundColor: 'transparent',
      },
    };

    const sizeStyles = {
      small: {
        minHeight: SIZES.input.small,
        paddingHorizontal: SPACING.md,
      },
      medium: {
        minHeight: SIZES.input.medium,
        paddingHorizontal: SPACING.md,
      },
      large: {
        minHeight: SIZES.input.large,
        paddingHorizontal: SPACING.lg,
      },
    };

    return {
      ...baseVariants[variant],
      ...sizeStyles[size],
    };
  };

  // Get input styles
  const getInputStyles = (): TextStyle => {
    const sizeStyles = {
      small: { ...TYPOGRAPHY.body.small },
      medium: { ...TYPOGRAPHY.body.medium },
      large: { ...TYPOGRAPHY.body.large },
    };

    return {
      ...sizeStyles[size],
      color: COLORS.text.primary,
      flex: 1,
      paddingVertical: variant === 'outlined' ? SPACING.sm : SPACING.xs,
      paddingTop: label ? SPACING.lg : SPACING.sm,
    };
  };

  // Get label styles
  const getLabelStyles = () => {
    const labelSize = animatedLabel.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 12],
    });

    const labelY = animatedLabel.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 4],
    });

    return {
      position: 'absolute' as const,
      left: SPACING.md,
      fontSize: labelSize,
      top: labelY,
      color: error 
        ? COLORS.semantic.error 
        : success 
          ? COLORS.semantic.success
          : isFocused 
            ? COLORS.primary[500] 
            : COLORS.text.secondary,
      backgroundColor: variant === 'outlined' ? COLORS.surface.primary : 'transparent',
      paddingHorizontal: variant === 'outlined' ? 4 : 0,
      zIndex: 1,
    };
  };

  // Render helper text
  const renderHelperText = () => {
    const text = errorText || successText || helperText;
    if (!text && !showCharacterCount) return null;

    const textColor = error 
      ? COLORS.semantic.error 
      : success 
        ? COLORS.semantic.success 
        : COLORS.text.secondary;

    return (
      <View style={styles.helperContainer}>
        {text && (
          <Text style={[styles.helperText, { color: textColor }]}>
            {text}
          </Text>
        )}
        {showCharacterCount && (
          <Text style={[
            styles.characterCount, 
            { color: isOverLimit ? COLORS.semantic.error : COLORS.text.secondary }
          ]}>
            {characterCount}/{actualMaxLength}
          </Text>
        )}
      </View>
    );
  };

  // Render bio optimization tips
  const renderBioOptimization = () => {
    if (!bioOptimization || !isFocused) return null;

    return (
      <View style={styles.optimizationContainer}>
        <Text style={styles.optimizationTitle}>💡 Bio Tips:</Text>
        <Text style={styles.optimizationTip}>• Include your interests and hobbies</Text>
        <Text style={styles.optimizationTip}>• Show your personality and humor</Text>
        <Text style={styles.optimizationTip}>• Mention what you're looking for</Text>
        {platformLimit && (
          <Text style={styles.optimizationTip}>
            • Optimized for {platformLimit.charAt(0).toUpperCase() + platformLimit.slice(1)}
          </Text>
        )}
      </View>
    );
  };

  // Render clear button
  const renderClearButton = () => {
    if (!clearable || !internalValue) return null;

    return (
      <TouchableOpacity
        onPress={() => {
          setInternalValue('');
          onChangeText?.('');
          onClear?.();
        }}
        style={styles.iconButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.clearButton}>×</Text>
      </TouchableOpacity>
    );
  };

  // Render password toggle
  const renderPasswordToggle = () => {
    if (!showPasswordToggle || inputType !== 'password') return null;

    return (
      <TouchableOpacity
        onPress={() => setIsPasswordVisible(!isPasswordVisible)}
        style={styles.iconButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.toggleText}>
          {isPasswordVisible ? '🙈' : '👁️'}
        </Text>
      </TouchableOpacity>
    );
  };

  // Get keyboard type
  const getKeyboardType = () => {
    switch (inputType) {
      case 'email':
        return 'email-address';
      case 'numeric':
      case 'age':
        return 'numeric';
      default:
        return 'default';
    }
  };

  // Get auto-complete type
  const getAutoCompleteType = () => {
    switch (inputType) {
      case 'email':
        return 'email';
      case 'password':
        return 'password';
      case 'name':
        return 'name';
      default:
        return 'off';
    }
  };

  const containerStyles = getContainerStyles();
  const inputStyles = getInputStyles();

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.inputContainer, containerStyles]}>
        {label && (
          <Animated.Text style={[getLabelStyles(), labelStyle]}>
            {label} {required && <Text style={styles.required}>*</Text>}
          </Animated.Text>
        )}
        
        {leftIcon && (
          <View style={styles.leftIcon}>
            {leftIcon}
          </View>
        )}
        
        <TextInput
          ref={inputRef}
          value={internalValue}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={!label ? placeholder : undefined}
          placeholderTextColor={COLORS.text.tertiary}
          secureTextEntry={inputType === 'password' && !isPasswordVisible}
          keyboardType={getKeyboardType()}
          autoCompleteType={getAutoCompleteType()}
          maxLength={actualMaxLength}
          multiline={inputType === 'bio'}
          numberOfLines={inputType === 'bio' ? 4 : 1}
          textAlignVertical={inputType === 'bio' ? 'top' : 'center'}
          style={[inputStyles, inputStyle]}
          accessible
          accessibilityLabel={accessibilityLabel || label}
          accessibilityHint={accessibilityHint}
          testID={testID}
          {...textInputProps}
        />
        
        {renderClearButton()}
        {renderPasswordToggle()}
        
        {rightIcon && (
          <View style={styles.rightIcon}>
            {rightIcon}
          </View>
        )}
      </View>
      
      {renderHelperText()}
      {renderBioOptimization()}
    </View>
  );
};

// Preset input variants
export const EmailInput: React.FC<Partial<InputProps>> = (props) => (
  <Input inputType="email" label="Email" {...props} />
);

export const PasswordInput: React.FC<Partial<InputProps>> = (props) => (
  <Input 
    inputType="password" 
    label="Password" 
    showPasswordToggle 
    {...props} 
  />
);

export const BioInput: React.FC<Partial<InputProps>> = (props) => (
  <Input 
    inputType="bio" 
    label="Bio" 
    bioOptimization 
    showCharacterCount 
    variant="outlined"
    {...props} 
  />
);

export const AgeInput: React.FC<Partial<InputProps>> = (props) => (
  <Input 
    inputType="age" 
    label="Age" 
    maxLength={2}
    {...props} 
  />
);

export const NameInput: React.FC<Partial<InputProps>> = (props) => (
  <Input 
    inputType="name" 
    label="Name" 
    clearable
    {...props} 
  />
);

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.sm,
  },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  
  leftIcon: {
    marginRight: SPACING.sm,
  },
  
  rightIcon: {
    marginLeft: SPACING.sm,
  },
  
  iconButton: {
    padding: SPACING.xs,
  },
  
  clearButton: {
    fontSize: 20,
    color: COLORS.text.secondary,
    fontWeight: 'bold',
  },
  
  toggleText: {
    fontSize: 16,
  },
  
  required: {
    color: COLORS.semantic.error,
  },
  
  helperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
    marginHorizontal: SPACING.md,
  },
  
  helperText: {
    ...TYPOGRAPHY.caption,
    flex: 1,
  },
  
  characterCount: {
    ...TYPOGRAPHY.caption,
    marginLeft: SPACING.sm,
  },
  
  optimizationContainer: {
    backgroundColor: COLORS.primary[50],
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary[500],
  },
  
  optimizationTitle: {
    ...TYPOGRAPHY.label.medium,
    color: COLORS.primary[700],
    marginBottom: SPACING.xs,
  },
  
  optimizationTip: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
});

export default Input;