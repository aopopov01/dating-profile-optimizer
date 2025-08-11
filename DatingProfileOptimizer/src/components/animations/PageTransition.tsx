/**
 * Page Transition Component
 * Smooth transitions between screens and views
 */

import React, { useRef, useEffect } from 'react';
import {
  Animated,
  Dimensions,
  ViewStyle,
  StyleProp,
} from 'react-native';
import {
  createPageTransition,
  createParallelAnimation,
  ANIMATION_DURATION,
  EASING,
} from '../../utils/animations';
import { useAccessibility } from '../../contexts/AccessibilityContext';

interface PageTransitionProps {
  children: React.ReactNode;
  isVisible: boolean;
  transitionType?: 'slide' | 'fade' | 'scale' | 'push' | 'slideUp' | 'slideDown';
  direction?: 'in' | 'out';
  duration?: number;
  style?: StyleProp<ViewStyle>;
  onTransitionComplete?: (finished: boolean) => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  isVisible,
  transitionType = 'fade',
  direction = 'in',
  duration = ANIMATION_DURATION.normal,
  style,
  onTransitionComplete,
}) => {
  const { shouldReduceMotion, getAnimationDuration } = useAccessibility();
  
  const fadeAnim = useRef(new Animated.Value(direction === 'in' ? 0 : 1)).current;
  const scaleAnim = useRef(new Animated.Value(direction === 'in' ? 0.8 : 1)).current;
  const translateXAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  // Adjust duration based on accessibility settings
  const adjustedDuration = shouldReduceMotion() 
    ? getAnimationDuration(duration) 
    : duration;

  const getInitialValues = () => {
    switch (transitionType) {
      case 'slide':
        translateXAnim.setValue(direction === 'in' ? screenWidth : 0);
        fadeAnim.setValue(direction === 'in' ? 0 : 1);
        break;
      case 'slideUp':
        translateYAnim.setValue(direction === 'in' ? screenHeight : 0);
        fadeAnim.setValue(direction === 'in' ? 0 : 1);
        break;
      case 'slideDown':
        translateYAnim.setValue(direction === 'in' ? -screenHeight : 0);
        fadeAnim.setValue(direction === 'in' ? 0 : 1);
        break;
      case 'push':
        translateXAnim.setValue(direction === 'in' ? screenWidth : 0);
        break;
      case 'scale':
        scaleAnim.setValue(direction === 'in' ? 0.8 : 1);
        fadeAnim.setValue(direction === 'in' ? 0 : 1);
        break;
      case 'fade':
      default:
        fadeAnim.setValue(direction === 'in' ? 0 : 1);
        break;
    }
  };

  const createTransitionAnimation = () => {
    if (shouldReduceMotion()) {
      // Simple fade for reduced motion
      return Animated.timing(fadeAnim, {
        toValue: direction === 'in' ? 1 : 0,
        duration: adjustedDuration,
        easing: EASING.linear,
        useNativeDriver: true,
      });
    }

    const animations: Animated.CompositeAnimation[] = [];

    switch (transitionType) {
      case 'slide':
        animations.push(
          Animated.timing(translateXAnim, {
            toValue: direction === 'in' ? 0 : screenWidth,
            duration: adjustedDuration,
            easing: direction === 'in' ? EASING.decelerate : EASING.accelerate,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: direction === 'in' ? 1 : 0,
            duration: adjustedDuration,
            easing: direction === 'in' ? EASING.easeOut : EASING.easeIn,
            useNativeDriver: true,
          })
        );
        break;

      case 'slideUp':
        animations.push(
          Animated.timing(translateYAnim, {
            toValue: direction === 'in' ? 0 : screenHeight,
            duration: adjustedDuration,
            easing: direction === 'in' ? EASING.decelerate : EASING.accelerate,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: direction === 'in' ? 1 : 0,
            duration: adjustedDuration,
            easing: direction === 'in' ? EASING.easeOut : EASING.easeIn,
            useNativeDriver: true,
          })
        );
        break;

      case 'slideDown':
        animations.push(
          Animated.timing(translateYAnim, {
            toValue: direction === 'in' ? 0 : -screenHeight,
            duration: adjustedDuration,
            easing: direction === 'in' ? EASING.decelerate : EASING.accelerate,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: direction === 'in' ? 1 : 0,
            duration: adjustedDuration,
            easing: direction === 'in' ? EASING.easeOut : EASING.easeIn,
            useNativeDriver: true,
          })
        );
        break;

      case 'push':
        animations.push(
          Animated.timing(translateXAnim, {
            toValue: direction === 'in' ? 0 : -screenWidth,
            duration: adjustedDuration,
            easing: EASING.decelerate,
            useNativeDriver: true,
          })
        );
        break;

      case 'scale':
        animations.push(
          Animated.timing(scaleAnim, {
            toValue: direction === 'in' ? 1 : 0.8,
            duration: adjustedDuration,
            easing: direction === 'in' ? EASING.backOut : EASING.backIn,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: direction === 'in' ? 1 : 0,
            duration: adjustedDuration,
            easing: direction === 'in' ? EASING.easeOut : EASING.easeIn,
            useNativeDriver: true,
          })
        );
        break;

      case 'fade':
      default:
        animations.push(
          Animated.timing(fadeAnim, {
            toValue: direction === 'in' ? 1 : 0,
            duration: adjustedDuration,
            easing: direction === 'in' ? EASING.easeOut : EASING.easeIn,
            useNativeDriver: true,
          })
        );
        break;
    }

    return createParallelAnimation(animations);
  };

  useEffect(() => {
    if (isVisible) {
      getInitialValues();
      const animation = createTransitionAnimation();
      
      animation.start((finished) => {
        if (onTransitionComplete) {
          onTransitionComplete(finished);
        }
      });
    }
  }, [isVisible]);

  const getTransformStyle = (): ViewStyle => {
    if (shouldReduceMotion()) {
      return {
        opacity: fadeAnim,
      };
    }

    const transforms: any[] = [];

    // Add scale transform if needed
    if (transitionType === 'scale') {
      transforms.push({ scale: scaleAnim });
    }

    // Add translate transforms if needed
    if (transitionType === 'slide' || transitionType === 'push') {
      transforms.push({ translateX: translateXAnim });
    }
    
    if (transitionType === 'slideUp' || transitionType === 'slideDown') {
      transforms.push({ translateY: translateYAnim });
    }

    return {
      opacity: fadeAnim,
      transform: transforms.length > 0 ? transforms : undefined,
    };
  };

  if (!isVisible && direction === 'out') {
    return null;
  }

  return (
    <Animated.View
      style={[
        {
          flex: 1,
        },
        style,
        getTransformStyle(),
      ]}
    >
      {children}
    </Animated.View>
  );
};

// Higher-order component for easy page transitions
export const withPageTransition = (
  Component: React.ComponentType<any>,
  transitionConfig?: Partial<PageTransitionProps>
) => {
  return React.forwardRef<any, any>((props, ref) => {
    const [isVisible, setIsVisible] = React.useState(true);

    React.useImperativeHandle(ref, () => ({
      show: () => setIsVisible(true),
      hide: () => setIsVisible(false),
    }));

    return (
      <PageTransition
        isVisible={isVisible}
        {...transitionConfig}
      >
        <Component {...props} />
      </PageTransition>
    );
  });
};

// Hook for managing page transitions
export const usePageTransition = (initialVisible: boolean = true) => {
  const [isVisible, setIsVisible] = React.useState(initialVisible);
  const [isTransitioning, setIsTransitioning] = React.useState(false);

  const showPage = React.useCallback(() => {
    setIsTransitioning(true);
    setIsVisible(true);
  }, []);

  const hidePage = React.useCallback(() => {
    setIsTransitioning(true);
    setIsVisible(false);
  }, []);

  const handleTransitionComplete = React.useCallback((finished: boolean) => {
    setIsTransitioning(false);
  }, []);

  return {
    isVisible,
    isTransitioning,
    showPage,
    hidePage,
    handleTransitionComplete,
  };
};

export default PageTransition;