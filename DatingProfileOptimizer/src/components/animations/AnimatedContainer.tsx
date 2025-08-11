/**
 * Animated Container Component
 * Provides common entrance and exit animations for containers
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  ViewProps,
  ViewStyle,
  StyleProp,
} from 'react-native';
import {
  createFadeAnimation,
  createScaleAnimation,
  createSlideAnimation,
  createParallelAnimation,
  ANIMATION_DURATION,
  EASING,
} from '../../utils/animations';
import { useAccessibility } from '../../contexts/AccessibilityContext';

interface AnimatedContainerProps extends ViewProps {
  children: React.ReactNode;
  animation?: 'fade' | 'scale' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'fadeScale';
  duration?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
  onAnimationComplete?: () => void;
  trigger?: boolean; // Re-trigger animation when this changes
}

const AnimatedContainer: React.FC<AnimatedContainerProps> = ({
  children,
  animation = 'fade',
  duration = ANIMATION_DURATION.normal,
  delay = 0,
  style,
  onAnimationComplete,
  trigger = true,
  ...restProps
}) => {
  const { shouldReduceMotion, getAnimationDuration } = useAccessibility();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const translateXAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  // Adjust duration based on accessibility settings
  const adjustedDuration = shouldReduceMotion() 
    ? getAnimationDuration(duration) 
    : duration;

  const resetAnimations = () => {
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.8);
    translateXAnim.setValue(0);
    translateYAnim.setValue(0);
  };

  const getInitialValues = () => {
    switch (animation) {
      case 'fade':
        fadeAnim.setValue(0);
        break;
      case 'scale':
        scaleAnim.setValue(0.8);
        fadeAnim.setValue(0);
        break;
      case 'slideUp':
        translateYAnim.setValue(50);
        fadeAnim.setValue(0);
        break;
      case 'slideDown':
        translateYAnim.setValue(-50);
        fadeAnim.setValue(0);
        break;
      case 'slideLeft':
        translateXAnim.setValue(50);
        fadeAnim.setValue(0);
        break;
      case 'slideRight':
        translateXAnim.setValue(-50);
        fadeAnim.setValue(0);
        break;
      case 'fadeScale':
        fadeAnim.setValue(0);
        scaleAnim.setValue(0.9);
        break;
    }
  };

  const createAnimation = () => {
    if (shouldReduceMotion()) {
      // Simple fade for reduced motion
      return createFadeAnimation(fadeAnim, 1, adjustedDuration, EASING.linear, delay);
    }

    const animations: Animated.CompositeAnimation[] = [];

    switch (animation) {
      case 'fade':
        animations.push(
          createFadeAnimation(fadeAnim, 1, adjustedDuration, EASING.easeOut, delay)
        );
        break;
        
      case 'scale':
        animations.push(
          createFadeAnimation(fadeAnim, 1, adjustedDuration, EASING.easeOut, delay),
          createScaleAnimation(scaleAnim, 1, adjustedDuration, EASING.backOut, delay)
        );
        break;
        
      case 'slideUp':
        animations.push(
          createFadeAnimation(fadeAnim, 1, adjustedDuration, EASING.easeOut, delay),
          createSlideAnimation(translateYAnim, 0, adjustedDuration, EASING.decelerate, delay)
        );
        break;
        
      case 'slideDown':
        animations.push(
          createFadeAnimation(fadeAnim, 1, adjustedDuration, EASING.easeOut, delay),
          createSlideAnimation(translateYAnim, 0, adjustedDuration, EASING.decelerate, delay)
        );
        break;
        
      case 'slideLeft':
        animations.push(
          createFadeAnimation(fadeAnim, 1, adjustedDuration, EASING.easeOut, delay),
          createSlideAnimation(translateXAnim, 0, adjustedDuration, EASING.decelerate, delay)
        );
        break;
        
      case 'slideRight':
        animations.push(
          createFadeAnimation(fadeAnim, 1, adjustedDuration, EASING.easeOut, delay),
          createSlideAnimation(translateXAnim, 0, adjustedDuration, EASING.decelerate, delay)
        );
        break;
        
      case 'fadeScale':
        animations.push(
          createFadeAnimation(fadeAnim, 1, adjustedDuration, EASING.easeOut, delay),
          createScaleAnimation(scaleAnim, 1, adjustedDuration, EASING.easeOut, delay)
        );
        break;
    }

    return createParallelAnimation(animations);
  };

  const startAnimation = () => {
    getInitialValues();
    const animationSequence = createAnimation();
    
    animationSequence.start((finished) => {
      if (finished && onAnimationComplete) {
        onAnimationComplete();
      }
    });
  };

  useEffect(() => {
    if (trigger) {
      startAnimation();
    }
  }, [trigger]);

  const getTransformStyle = () => {
    const transforms: any[] = [];

    if (shouldReduceMotion()) {
      return { opacity: fadeAnim };
    }

    switch (animation) {
      case 'fade':
        return { opacity: fadeAnim };
        
      case 'scale':
        return {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        };
        
      case 'slideUp':
      case 'slideDown':
        return {
          opacity: fadeAnim,
          transform: [{ translateY: translateYAnim }],
        };
        
      case 'slideLeft':
      case 'slideRight':
        return {
          opacity: fadeAnim,
          transform: [{ translateX: translateXAnim }],
        };
        
      case 'fadeScale':
        return {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        };
        
      default:
        return { opacity: fadeAnim };
    }
  };

  return (
    <Animated.View
      style={[style, getTransformStyle()]}
      {...restProps}
    >
      {children}
    </Animated.View>
  );
};

export default AnimatedContainer;