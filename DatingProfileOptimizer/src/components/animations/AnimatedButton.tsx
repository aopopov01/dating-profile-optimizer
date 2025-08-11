/**
 * Animated Button Component
 * Button with press animations and micro-interactions
 */

import React, { useRef } from 'react';
import {
  Animated,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
  StyleProp,
  Haptics,
  Platform,
} from 'react-native';
import {
  createScaleAnimation,
  createFadeAnimation,
  createParallelAnimation,
  ANIMATION_DURATION,
  EASING,
} from '../../utils/animations';
import { useAccessibility } from '../../contexts/AccessibilityContext';

interface AnimatedButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  animationType?: 'scale' | 'fade' | 'press' | 'bounce' | 'ripple';
  hapticFeedback?: boolean;
  pressScale?: number;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  style,
  animationType = 'scale',
  hapticFeedback = true,
  pressScale = 0.95,
  disabled = false,
  loading = false,
  onPress,
  ...restProps
}) => {
  const {
    shouldReduceMotion,
    getAnimationDuration,
    getTouchTargetSize,
    state,
  } = useAccessibility();
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const loadingAnim = useRef(new Animated.Value(0)).current;

  // Adjust animation duration based on accessibility settings
  const pressAnimDuration = shouldReduceMotion() 
    ? getAnimationDuration(ANIMATION_DURATION.fast)
    : ANIMATION_DURATION.fast;

  const handlePressIn = () => {
    if (disabled || loading) return;

    // Haptic feedback
    if (hapticFeedback && state.settings.hapticFeedback && Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Create press animation based on type
    let animation: Animated.CompositeAnimation;

    if (shouldReduceMotion()) {
      // Simple opacity change for reduced motion
      animation = createFadeAnimation(
        fadeAnim,
        0.7,
        pressAnimDuration,
        EASING.easeOut
      );
    } else {
      switch (animationType) {
        case 'scale':
          animation = createScaleAnimation(
            scaleAnim,
            pressScale,
            pressAnimDuration,
            EASING.easeOut
          );
          break;
          
        case 'fade':
          animation = createFadeAnimation(
            fadeAnim,
            0.7,
            pressAnimDuration,
            EASING.easeOut
          );
          break;
          
        case 'press':
          animation = createParallelAnimation([
            createScaleAnimation(scaleAnim, pressScale, pressAnimDuration, EASING.easeOut),
            createFadeAnimation(fadeAnim, 0.8, pressAnimDuration, EASING.easeOut),
          ]);
          break;
          
        case 'bounce':
          animation = createScaleAnimation(
            scaleAnim,
            pressScale,
            pressAnimDuration,
            EASING.backOut
          );
          break;
          
        case 'ripple':
          animation = createParallelAnimation([
            createScaleAnimation(scaleAnim, pressScale, pressAnimDuration, EASING.easeOut),
            Animated.timing(rippleAnim, {
              toValue: 1,
              duration: pressAnimDuration * 2,
              easing: EASING.easeOut,
              useNativeDriver: true,
            }),
          ]);
          break;
          
        default:
          animation = createScaleAnimation(
            scaleAnim,
            pressScale,
            pressAnimDuration,
            EASING.easeOut
          );
      }
    }

    animation.start();
  };

  const handlePressOut = () => {
    if (disabled || loading) return;

    // Create release animation
    let animation: Animated.CompositeAnimation;

    if (shouldReduceMotion()) {
      animation = createFadeAnimation(
        fadeAnim,
        1,
        pressAnimDuration,
        EASING.easeOut
      );
    } else {
      switch (animationType) {
        case 'scale':
          animation = createScaleAnimation(
            scaleAnim,
            1,
            pressAnimDuration,
            EASING.easeOut
          );
          break;
          
        case 'fade':
          animation = createFadeAnimation(
            fadeAnim,
            1,
            pressAnimDuration,
            EASING.easeOut
          );
          break;
          
        case 'press':
          animation = createParallelAnimation([
            createScaleAnimation(scaleAnim, 1, pressAnimDuration, EASING.easeOut),
            createFadeAnimation(fadeAnim, 1, pressAnimDuration, EASING.easeOut),
          ]);
          break;
          
        case 'bounce':
          animation = createScaleAnimation(
            scaleAnim,
            1,
            pressAnimDuration,
            EASING.backOut
          );
          break;
          
        case 'ripple':
          animation = createParallelAnimation([
            createScaleAnimation(scaleAnim, 1, pressAnimDuration, EASING.easeOut),
            Animated.timing(rippleAnim, {
              toValue: 0,
              duration: pressAnimDuration,
              easing: EASING.easeOut,
              useNativeDriver: true,
            }),
          ]);
          break;
          
        default:
          animation = createScaleAnimation(
            scaleAnim,
            1,
            pressAnimDuration,
            EASING.easeOut
          );
      }
    }

    animation.start();
  };

  const handlePress = () => {
    if (disabled || loading || !onPress) return;
    onPress();
  };

  // Loading animation
  React.useEffect(() => {
    if (loading) {
      const loadingAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(loadingAnim, {
            toValue: 1,
            duration: 1000,
            easing: EASING.linear,
            useNativeDriver: true,
          }),
          Animated.timing(loadingAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
      loadingAnimation.start();
      
      return () => loadingAnimation.stop();
    }
  }, [loading]);

  const getAnimatedStyle = () => {
    const baseStyle: any = {
      minHeight: getTouchTargetSize(),
      minWidth: getTouchTargetSize(),
    };

    if (shouldReduceMotion()) {
      return {
        ...baseStyle,
        opacity: fadeAnim,
      };
    }

    switch (animationType) {
      case 'scale':
        return {
          ...baseStyle,
          transform: [{ scale: scaleAnim }],
        };
        
      case 'fade':
        return {
          ...baseStyle,
          opacity: fadeAnim,
        };
        
      case 'press':
        return {
          ...baseStyle,
          transform: [{ scale: scaleAnim }],
          opacity: fadeAnim,
        };
        
      case 'bounce':
        return {
          ...baseStyle,
          transform: [{ scale: scaleAnim }],
        };
        
      case 'ripple':
        return {
          ...baseStyle,
          transform: [{ scale: scaleAnim }],
          opacity: fadeAnim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [1, 0.8, 1],
          }),
        };
        
      default:
        return {
          ...baseStyle,
          transform: [{ scale: scaleAnim }],
        };
    }
  };

  const getRippleStyle = () => {
    if (animationType !== 'ripple') return null;
    
    return {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 1000,
      transform: [
        {
          scale: rippleAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 2],
          }),
        },
      ],
      opacity: rippleAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 1, 0],
      }),
    };
  };

  const getLoadingIndicatorStyle = () => {
    if (!loading) return null;
    
    return {
      transform: [
        {
          rotate: loadingAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '360deg'],
          }),
        },
      ],
    };
  };

  return (
    <TouchableOpacity
      activeOpacity={1} // We handle our own opacity changes
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled || loading}
      accessible={true}
      accessibilityRole="button"
      accessibilityState={{
        disabled: disabled || loading,
        busy: loading,
      }}
      {...restProps}
    >
      <Animated.View style={[style, getAnimatedStyle()]}>
        {/* Ripple effect overlay */}
        {animationType === 'ripple' && (
          <Animated.View style={getRippleStyle()} pointerEvents="none" />
        )}
        
        {/* Loading indicator overlay */}
        {loading && (
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: '50%',
                left: '50%',
                marginTop: -10,
                marginLeft: -10,
                width: 20,
                height: 20,
                borderWidth: 2,
                borderColor: 'rgba(255, 255, 255, 0.3)',
                borderTopColor: 'white',
                borderRadius: 10,
              },
              getLoadingIndicatorStyle(),
            ]}
          />
        )}
        
        {/* Button content */}
        <Animated.View
          style={{
            opacity: loading ? 0.5 : 1,
          }}
        >
          {children}
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default AnimatedButton;