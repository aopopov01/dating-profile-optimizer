/**
 * Loading Animation Components
 * Various loading indicators with smooth animations
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Animated,
  ViewStyle,
  StyleProp,
  StyleSheet,
} from 'react-native';
import {
  createWaveAnimation,
  createLoadingDots,
  createRotationAnimation,
  createPulseAnimation,
  ANIMATION_DURATION,
  EASING,
} from '../../utils/animations';
import { COLORS, SPACING } from '../../utils/designSystem';
import { useAccessibility } from '../../contexts/AccessibilityContext';

interface LoadingProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  style?: StyleProp<ViewStyle>;
}

// Spinning Circle Loader
export const SpinnerLoader: React.FC<LoadingProps> = ({
  size = 'medium',
  color = COLORS.primary[500],
  style,
}) => {
  const { shouldReduceMotion, getAnimationDuration } = useAccessibility();
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const sizeMap = {
    small: 20,
    medium: 40,
    large: 60,
  };

  const spinnerSize = sizeMap[size];
  const duration = shouldReduceMotion() 
    ? getAnimationDuration(ANIMATION_DURATION.slow) 
    : ANIMATION_DURATION.slow;

  useEffect(() => {
    if (shouldReduceMotion()) {
      // Static loading indicator for reduced motion
      return;
    }

    const spinAnimation = createRotationAnimation(
      rotateAnim,
      1,
      duration,
      EASING.linear,
      true
    );

    spinAnimation.start();
    return () => spinAnimation.stop();
  }, [shouldReduceMotion()]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.spinner,
          {
            width: spinnerSize,
            height: spinnerSize,
            borderColor: `${color}20`,
            borderTopColor: color,
            transform: shouldReduceMotion() ? [] : [{ rotate: rotation }],
          },
        ]}
      />
    </View>
  );
};

// Bouncing Dots Loader
export const DotsLoader: React.FC<LoadingProps> = ({
  size = 'medium',
  color = COLORS.primary[500],
  style,
}) => {
  const { shouldReduceMotion, getAnimationDuration } = useAccessibility();
  
  const dot1Anim = useRef(new Animated.Value(0.3)).current;
  const dot2Anim = useRef(new Animated.Value(0.3)).current;
  const dot3Anim = useRef(new Animated.Value(0.3)).current;

  const sizeMap = {
    small: 8,
    medium: 12,
    large: 16,
  };

  const dotSize = sizeMap[size];
  const duration = shouldReduceMotion() 
    ? getAnimationDuration(ANIMATION_DURATION.normal) 
    : ANIMATION_DURATION.normal;

  useEffect(() => {
    if (shouldReduceMotion()) {
      // Static dots for reduced motion
      dot1Anim.setValue(1);
      dot2Anim.setValue(0.6);
      dot3Anim.setValue(0.3);
      return;
    }

    const dotsAnimation = createLoadingDots(
      [dot1Anim, dot2Anim, dot3Anim],
      duration
    );

    dotsAnimation.start();
    return () => dotsAnimation.stop();
  }, [shouldReduceMotion()]);

  return (
    <View style={[styles.dotsContainer, style]}>
      <Animated.View
        style={[
          styles.dot,
          {
            width: dotSize,
            height: dotSize,
            backgroundColor: color,
            opacity: dot1Anim,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          {
            width: dotSize,
            height: dotSize,
            backgroundColor: color,
            opacity: dot2Anim,
            marginHorizontal: dotSize / 2,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          {
            width: dotSize,
            height: dotSize,
            backgroundColor: color,
            opacity: dot3Anim,
          },
        ]}
      />
    </View>
  );
};

// Pulsing Circle Loader
export const PulseLoader: React.FC<LoadingProps> = ({
  size = 'medium',
  color = COLORS.primary[500],
  style,
}) => {
  const { shouldReduceMotion, getAnimationDuration } = useAccessibility();
  const pulseAnim = useRef(new Animated.Value(0.8)).current;

  const sizeMap = {
    small: 30,
    medium: 50,
    large: 70,
  };

  const pulseSize = sizeMap[size];
  const duration = shouldReduceMotion() 
    ? getAnimationDuration(ANIMATION_DURATION.slow) 
    : ANIMATION_DURATION.slow;

  useEffect(() => {
    if (shouldReduceMotion()) {
      // Static pulse for reduced motion
      pulseAnim.setValue(1);
      return;
    }

    const pulseAnimation = createPulseAnimation(
      pulseAnim,
      0.8,
      1.2,
      duration
    );

    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, [shouldReduceMotion()]);

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.pulse,
          {
            width: pulseSize,
            height: pulseSize,
            backgroundColor: `${color}30`,
            borderColor: color,
            transform: shouldReduceMotion() ? [] : [{ scale: pulseAnim }],
          },
        ]}
      />
    </View>
  );
};

// Wave Loader
export const WaveLoader: React.FC<LoadingProps> = ({
  size = 'medium',
  color = COLORS.primary[500],
  style,
}) => {
  const { shouldReduceMotion, getAnimationDuration } = useAccessibility();
  
  const wave1Anim = useRef(new Animated.Value(0)).current;
  const wave2Anim = useRef(new Animated.Value(0)).current;
  const wave3Anim = useRef(new Animated.Value(0)).current;
  const wave4Anim = useRef(new Animated.Value(0)).current;

  const sizeMap = {
    small: { width: 4, height: 20 },
    medium: { width: 6, height: 30 },
    large: { width: 8, height: 40 },
  };

  const { width: barWidth, height: maxHeight } = sizeMap[size];
  const duration = shouldReduceMotion() 
    ? getAnimationDuration(ANIMATION_DURATION.slow) 
    : ANIMATION_DURATION.slow;

  useEffect(() => {
    if (shouldReduceMotion()) {
      // Static wave for reduced motion
      wave1Anim.setValue(0.8);
      wave2Anim.setValue(0.6);
      wave3Anim.setValue(0.4);
      wave4Anim.setValue(0.2);
      return;
    }

    const waveAnimation = createWaveAnimation(
      [wave1Anim, wave2Anim, wave3Anim, wave4Anim],
      duration,
      150
    );

    waveAnimation.start();
    return () => waveAnimation.stop();
  }, [shouldReduceMotion()]);

  return (
    <View style={[styles.waveContainer, style]}>
      {[wave1Anim, wave2Anim, wave3Anim, wave4Anim].map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.waveBar,
            {
              width: barWidth,
              height: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [maxHeight * 0.3, maxHeight],
              }),
              backgroundColor: color,
              marginHorizontal: barWidth / 2,
            },
          ]}
        />
      ))}
    </View>
  );
};

// Progress Bar Loader
interface ProgressLoaderProps extends LoadingProps {
  progress: number; // 0 to 1
  showPercentage?: boolean;
  animated?: boolean;
}

export const ProgressLoader: React.FC<ProgressLoaderProps> = ({
  size = 'medium',
  color = COLORS.primary[500],
  style,
  progress,
  showPercentage = false,
  animated = true,
}) => {
  const { shouldReduceMotion, getAnimationDuration } = useAccessibility();
  const progressAnim = useRef(new Animated.Value(0)).current;

  const sizeMap = {
    small: { width: 100, height: 4 },
    medium: { width: 200, height: 6 },
    large: { width: 300, height: 8 },
  };

  const { width: barWidth, height: barHeight } = sizeMap[size];
  const duration = shouldReduceMotion() 
    ? getAnimationDuration(ANIMATION_DURATION.fast) 
    : ANIMATION_DURATION.fast;

  useEffect(() => {
    if (animated && !shouldReduceMotion()) {
      Animated.timing(progressAnim, {
        toValue: progress,
        duration,
        easing: EASING.easeOut,
        useNativeDriver: false,
      }).start();
    } else {
      progressAnim.setValue(progress);
    }
  }, [progress, animated, shouldReduceMotion()]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.progressContainer, style]}>
      <View
        style={[
          styles.progressTrack,
          {
            width: barWidth,
            height: barHeight,
            backgroundColor: `${color}20`,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progressWidth,
              height: '100%',
              backgroundColor: color,
            },
          ]}
        />
      </View>
      {showPercentage && (
        <Animated.Text style={styles.progressText}>
          {progressAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 100],
            extrapolate: 'clamp',
          }).toString().split('.')[0]}%
        </Animated.Text>
      )}
    </View>
  );
};

// Skeleton Loader
interface SkeletonLoaderProps extends LoadingProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const { shouldReduceMotion, getAnimationDuration } = useAccessibility();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  const duration = shouldReduceMotion() 
    ? getAnimationDuration(ANIMATION_DURATION.normal) 
    : ANIMATION_DURATION.normal;

  useEffect(() => {
    if (shouldReduceMotion()) {
      // Static skeleton for reduced motion
      shimmerAnim.setValue(0.5);
      return;
    }

    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration,
          easing: EASING.easeInOut,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration,
          easing: EASING.easeInOut,
          useNativeDriver: true,
        }),
      ])
    );

    shimmerAnimation.start();
    return () => shimmerAnimation.stop();
  }, [shouldReduceMotion()]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity: shouldReduceMotion() ? 0.5 : opacity,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  spinner: {
    borderWidth: 3,
    borderRadius: 1000,
  },

  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  dot: {
    borderRadius: 1000,
  },

  pulse: {
    borderRadius: 1000,
    borderWidth: 2,
  },

  waveContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  waveBar: {
    borderRadius: 2,
  },

  progressContainer: {
    alignItems: 'center',
  },

  progressTrack: {
    borderRadius: 1000,
    overflow: 'hidden',
  },

  progressFill: {
    borderRadius: 1000,
  },

  progressText: {
    marginTop: SPACING.sm,
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },

  skeleton: {
    backgroundColor: COLORS.neutral[200],
  },
});

export default {
  SpinnerLoader,
  DotsLoader,
  PulseLoader,
  WaveLoader,
  ProgressLoader,
  SkeletonLoader,
};