/**
 * Animation Utilities
 * Centralized animation configurations and helpers
 */

import { Animated, Easing, Platform } from 'react-native';

// Animation durations (in milliseconds)
export const ANIMATION_DURATION = {
  instant: 0,
  fast: 150,
  normal: 300,
  slow: 500,
  extra_slow: 800,
} as const;

// Easing functions
export const EASING = {
  // Standard curves
  linear: Easing.linear,
  ease: Easing.ease,
  easeIn: Easing.in(Easing.ease),
  easeOut: Easing.out(Easing.ease),
  easeInOut: Easing.inOut(Easing.ease),
  
  // Bezier curves (Material Design)
  standard: Easing.bezier(0.4, 0.0, 0.2, 1),
  decelerate: Easing.bezier(0.0, 0.0, 0.2, 1),
  accelerate: Easing.bezier(0.4, 0.0, 1, 1),
  accelerateDecelerate: Easing.bezier(0.4, 0.0, 0.6, 1),
  
  // Bounce and elastic
  bounce: Easing.bounce,
  elastic: Easing.elastic(1),
  
  // Back curves
  backIn: Easing.in(Easing.back(1.5)),
  backOut: Easing.out(Easing.back(1.5)),
  backInOut: Easing.inOut(Easing.back(1.5)),
} as const;

// Animation configuration presets
export const ANIMATION_CONFIGS = {
  // Fade animations
  fadeIn: {
    duration: ANIMATION_DURATION.normal,
    easing: EASING.easeOut,
    useNativeDriver: true,
  },
  fadeOut: {
    duration: ANIMATION_DURATION.fast,
    easing: EASING.easeIn,
    useNativeDriver: true,
  },
  
  // Scale animations
  scaleIn: {
    duration: ANIMATION_DURATION.normal,
    easing: EASING.backOut,
    useNativeDriver: true,
  },
  scaleOut: {
    duration: ANIMATION_DURATION.fast,
    easing: EASING.backIn,
    useNativeDriver: true,
  },
  
  // Slide animations
  slideIn: {
    duration: ANIMATION_DURATION.normal,
    easing: EASING.decelerate,
    useNativeDriver: true,
  },
  slideOut: {
    duration: ANIMATION_DURATION.fast,
    easing: EASING.accelerate,
    useNativeDriver: true,
  },
  
  // Spring animations
  spring: {
    tension: 100,
    friction: 8,
    useNativeDriver: true,
  },
  gentleSpring: {
    tension: 50,
    friction: 10,
    useNativeDriver: true,
  },
  bouncySpring: {
    tension: 120,
    friction: 6,
    useNativeDriver: true,
  },
  
  // Layout animations (non-native driver)
  layout: {
    duration: ANIMATION_DURATION.normal,
    easing: EASING.standard,
    useNativeDriver: false,
  },
} as const;

/**
 * Create fade animation
 */
export const createFadeAnimation = (
  animatedValue: Animated.Value,
  toValue: number,
  duration: number = ANIMATION_DURATION.normal,
  easing: (value: number) => number = EASING.easeOut,
  delay: number = 0
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing,
    delay,
    useNativeDriver: true,
  });
};

/**
 * Create scale animation
 */
export const createScaleAnimation = (
  animatedValue: Animated.Value,
  toValue: number,
  duration: number = ANIMATION_DURATION.normal,
  easing: (value: number) => number = EASING.backOut,
  delay: number = 0
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing,
    delay,
    useNativeDriver: true,
  });
};

/**
 * Create slide animation
 */
export const createSlideAnimation = (
  animatedValue: Animated.Value,
  toValue: number,
  duration: number = ANIMATION_DURATION.normal,
  easing: (value: number) => number = EASING.decelerate,
  delay: number = 0
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing,
    delay,
    useNativeDriver: true,
  });
};

/**
 * Create spring animation
 */
export const createSpringAnimation = (
  animatedValue: Animated.Value,
  toValue: number,
  tension: number = 100,
  friction: number = 8,
  delay: number = 0
): Animated.CompositeAnimation => {
  return Animated.spring(animatedValue, {
    toValue,
    tension,
    friction,
    delay,
    useNativeDriver: true,
  });
};

/**
 * Create rotation animation
 */
export const createRotationAnimation = (
  animatedValue: Animated.Value,
  toValue: number,
  duration: number = ANIMATION_DURATION.normal,
  easing: (value: number) => number = EASING.linear,
  loop: boolean = false
): Animated.CompositeAnimation => {
  const animation = Animated.timing(animatedValue, {
    toValue,
    duration,
    easing,
    useNativeDriver: true,
  });

  return loop ? Animated.loop(animation) : animation;
};

/**
 * Create staggered animation sequence
 */
export const createStaggeredAnimation = (
  animations: Animated.CompositeAnimation[],
  stagger: number = 100
): Animated.CompositeAnimation => {
  return Animated.stagger(stagger, animations);
};

/**
 * Create parallel animation
 */
export const createParallelAnimation = (
  animations: Animated.CompositeAnimation[]
): Animated.CompositeAnimation => {
  return Animated.parallel(animations);
};

/**
 * Create sequence animation
 */
export const createSequenceAnimation = (
  animations: Animated.CompositeAnimation[]
): Animated.CompositeAnimation => {
  return Animated.sequence(animations);
};

/**
 * Create pulse animation (heartbeat effect)
 */
export const createPulseAnimation = (
  scaleValue: Animated.Value,
  minScale: number = 0.95,
  maxScale: number = 1.05,
  duration: number = ANIMATION_DURATION.slow
): Animated.CompositeAnimation => {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: maxScale,
        duration: duration / 2,
        easing: EASING.easeInOut,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: minScale,
        duration: duration / 2,
        easing: EASING.easeInOut,
        useNativeDriver: true,
      }),
    ])
  );
};

/**
 * Create shake animation
 */
export const createShakeAnimation = (
  translateValue: Animated.Value,
  amplitude: number = 10,
  duration: number = ANIMATION_DURATION.fast
): Animated.CompositeAnimation => {
  return Animated.sequence([
    Animated.timing(translateValue, {
      toValue: amplitude,
      duration: duration / 4,
      easing: EASING.linear,
      useNativeDriver: true,
    }),
    Animated.timing(translateValue, {
      toValue: -amplitude,
      duration: duration / 2,
      easing: EASING.linear,
      useNativeDriver: true,
    }),
    Animated.timing(translateValue, {
      toValue: 0,
      duration: duration / 4,
      easing: EASING.linear,
      useNativeDriver: true,
    }),
  ]);
};

/**
 * Create wave animation (for loading indicators)
 */
export const createWaveAnimation = (
  animatedValues: Animated.Value[],
  duration: number = ANIMATION_DURATION.slow,
  stagger: number = 100
): Animated.CompositeAnimation => {
  const animations = animatedValues.map((value) =>
    Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1,
          duration: duration / 2,
          easing: EASING.easeInOut,
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: duration / 2,
          easing: EASING.easeInOut,
          useNativeDriver: true,
        }),
      ])
    )
  );

  return createStaggeredAnimation(animations, stagger);
};

/**
 * Create morphing animation (for shape changes)
 */
export const createMorphAnimation = (
  animatedValue: Animated.Value,
  keyframes: number[],
  duration: number = ANIMATION_DURATION.slow,
  easing: (value: number) => number = EASING.easeInOut
): Animated.CompositeAnimation => {
  const stepDuration = duration / (keyframes.length - 1);
  
  const animations = keyframes.slice(1).map((keyframe, index) => 
    Animated.timing(animatedValue, {
      toValue: keyframe,
      duration: stepDuration,
      easing,
      useNativeDriver: true,
    })
  );

  return createSequenceAnimation(animations);
};

/**
 * Platform-specific animation adjustments
 */
export const getPlatformAnimationConfig = (baseConfig: any) => {
  if (Platform.OS === 'ios') {
    return baseConfig;
  } else {
    // Android optimizations
    return {
      ...baseConfig,
      duration: Math.min(baseConfig.duration, 300), // Shorter durations on Android
    };
  }
};

/**
 * Accessibility-aware animation helpers
 */
export const createAccessibleAnimation = (
  animation: Animated.CompositeAnimation,
  shouldReduceMotion: boolean,
  fallbackDuration: number = ANIMATION_DURATION.fast
): Animated.CompositeAnimation => {
  if (shouldReduceMotion) {
    // Create a simplified version with shorter duration
    return createFadeAnimation(
      new Animated.Value(0),
      1,
      fallbackDuration,
      EASING.linear
    );
  }
  
  return animation;
};

/**
 * Interactive animation helpers
 */
export const createPressAnimation = (
  scaleValue: Animated.Value,
  pressScale: number = 0.95,
  pressDuration: number = ANIMATION_DURATION.fast
) => ({
  onPressIn: () => {
    createScaleAnimation(
      scaleValue,
      pressScale,
      pressDuration,
      EASING.easeOut
    ).start();
  },
  onPressOut: () => {
    createScaleAnimation(
      scaleValue,
      1,
      pressDuration,
      EASING.easeOut
    ).start();
  },
});

/**
 * Gesture-based animation helpers
 */
export const createSwipeAnimation = (
  translateValue: Animated.Value,
  direction: 'left' | 'right' | 'up' | 'down',
  distance: number,
  duration: number = ANIMATION_DURATION.normal
): Animated.CompositeAnimation => {
  const directionMap = {
    left: -distance,
    right: distance,
    up: -distance,
    down: distance,
  };

  return createSlideAnimation(
    translateValue,
    directionMap[direction],
    duration,
    EASING.decelerate
  );
};

/**
 * Loading animation patterns
 */
export const createLoadingDots = (
  dotValues: Animated.Value[],
  duration: number = ANIMATION_DURATION.normal
): Animated.CompositeAnimation => {
  const dotAnimations = dotValues.map((value, index) =>
    Animated.loop(
      Animated.sequence([
        Animated.delay(index * 100),
        Animated.timing(value, {
          toValue: 1,
          duration: duration / 2,
          easing: EASING.easeInOut,
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0.3,
          duration: duration / 2,
          easing: EASING.easeInOut,
          useNativeDriver: true,
        }),
      ])
    )
  );

  return createParallelAnimation(dotAnimations);
};

/**
 * Page transition animations
 */
export const createPageTransition = (
  type: 'slide' | 'fade' | 'scale' | 'push',
  animatedValue: Animated.Value,
  direction: 'in' | 'out' = 'in',
  duration: number = ANIMATION_DURATION.normal
): Animated.CompositeAnimation => {
  switch (type) {
    case 'slide':
      return createSlideAnimation(
        animatedValue,
        direction === 'in' ? 0 : 100,
        duration,
        direction === 'in' ? EASING.decelerate : EASING.accelerate
      );
    
    case 'fade':
      return createFadeAnimation(
        animatedValue,
        direction === 'in' ? 1 : 0,
        duration,
        direction === 'in' ? EASING.easeOut : EASING.easeIn
      );
    
    case 'scale':
      return createScaleAnimation(
        animatedValue,
        direction === 'in' ? 1 : 0,
        duration,
        direction === 'in' ? EASING.backOut : EASING.backIn
      );
    
    case 'push':
      return createSlideAnimation(
        animatedValue,
        direction === 'in' ? 0 : -100,
        duration,
        EASING.decelerate
      );
    
    default:
      return createFadeAnimation(animatedValue, direction === 'in' ? 1 : 0, duration);
  }
};