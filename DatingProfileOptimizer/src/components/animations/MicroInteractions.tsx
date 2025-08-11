/**
 * Micro Interactions Components
 * Small delightful animations for user interactions
 */

import React, { useRef, useEffect } from 'react';
import {
  Animated,
  TouchableOpacity,
  View,
  ViewStyle,
  StyleProp,
  Platform,
  Haptics,
} from 'react-native';
import {
  createScaleAnimation,
  createShakeAnimation,
  createPulseAnimation,
  createFadeAnimation,
  createParallelAnimation,
  ANIMATION_DURATION,
  EASING,
} from '../../utils/animations';
import { useAccessibility } from '../../contexts/AccessibilityContext';

// Floating Action Button with expand animation
interface FloatingActionButtonProps {
  onPress: () => void;
  icon: React.ReactNode;
  expandedItems?: Array<{
    icon: React.ReactNode;
    onPress: () => void;
    label: string;
  }>;
  style?: StyleProp<ViewStyle>;
  expanded?: boolean;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
  icon,
  expandedItems = [],
  style,
  expanded = false,
}) => {
  const { shouldReduceMotion, getAnimationDuration, state } = useAccessibility();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;

  const duration = shouldReduceMotion() 
    ? getAnimationDuration(ANIMATION_DURATION.fast)
    : ANIMATION_DURATION.fast;

  useEffect(() => {
    const expandAnimation = Animated.timing(expandAnim, {
      toValue: expanded ? 1 : 0,
      duration: duration * 1.5,
      easing: EASING.backOut,
      useNativeDriver: true,
    });

    expandAnimation.start();
  }, [expanded]);

  const handlePress = () => {
    // Haptic feedback
    if (state.settings.hapticFeedback && Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Scale animation
    if (!shouldReduceMotion()) {
      createParallelAnimation([
        createScaleAnimation(scaleAnim, 0.9, duration / 2, EASING.easeOut),
        createScaleAnimation(rotateAnim, 1, duration / 2, EASING.easeOut),
      ]).start(() => {
        createScaleAnimation(scaleAnim, 1, duration / 2, EASING.easeOut).start();
      });
    }

    onPress();
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <View style={[{ position: 'relative' }, style]}>
      {/* Expanded Items */}
      {expandedItems.map((item, index) => (
        <Animated.View
          key={index}
          style={{
            position: 'absolute',
            bottom: 70 + index * 60,
            right: 0,
            transform: [
              {
                translateY: expandAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
              },
              {
                scale: expandAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            ],
            opacity: expandAnim,
          }}
        >
          <TouchableOpacity
            onPress={item.onPress}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: 'white',
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}
            accessibilityLabel={item.label}
          >
            {item.icon}
          </TouchableOpacity>
        </Animated.View>
      ))}

      {/* Main FAB */}
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Animated.View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: '#e91e63',
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
            transform: [
              { scale: scaleAnim },
              { rotate: shouldReduceMotion() ? '0deg' : rotation },
            ],
          }}
        >
          {icon}
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

// Shake animation for form errors
interface ShakeViewProps {
  children: React.ReactNode;
  shouldShake: boolean;
  onShakeComplete?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const ShakeView: React.FC<ShakeViewProps> = ({
  children,
  shouldShake,
  onShakeComplete,
  style,
}) => {
  const { shouldReduceMotion, getAnimationDuration, state } = useAccessibility();
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const duration = shouldReduceMotion() 
    ? getAnimationDuration(ANIMATION_DURATION.fast)
    : ANIMATION_DURATION.fast;

  useEffect(() => {
    if (shouldShake) {
      // Haptic feedback for error
      if (state.settings.hapticFeedback && Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      if (shouldReduceMotion()) {
        // Flash opacity instead of shake for reduced motion
        createFadeAnimation(shakeAnim, 0.5, duration / 4, EASING.linear).start(() => {
          createFadeAnimation(shakeAnim, 1, duration / 4, EASING.linear).start(() => {
            onShakeComplete?.();
          });
        });
      } else {
        const shakeAnimation = createShakeAnimation(shakeAnim, 10, duration);
        shakeAnimation.start((finished) => {
          if (finished && onShakeComplete) {
            onShakeComplete();
          }
        });
      }
    }
  }, [shouldShake]);

  return (
    <Animated.View
      style={[
        style,
        {
          transform: shouldReduceMotion() 
            ? [] 
            : [{ translateX: shakeAnim }],
          opacity: shouldReduceMotion() ? shakeAnim : 1,
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

// Heartbeat animation for likes/favorites
interface HeartbeatViewProps {
  children: React.ReactNode;
  isActive: boolean;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

export const HeartbeatView: React.FC<HeartbeatViewProps> = ({
  children,
  isActive,
  style,
  onPress,
}) => {
  const { shouldReduceMotion, getAnimationDuration, state } = useAccessibility();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const duration = shouldReduceMotion() 
    ? getAnimationDuration(ANIMATION_DURATION.normal)
    : ANIMATION_DURATION.normal;

  useEffect(() => {
    if (isActive && !shouldReduceMotion()) {
      const heartbeatAnimation = createPulseAnimation(
        pulseAnim,
        1,
        1.2,
        duration
      );
      heartbeatAnimation.start();
      
      return () => heartbeatAnimation.stop();
    }
  }, [isActive]);

  const handlePress = () => {
    if (!onPress) return;

    // Haptic feedback
    if (state.settings.hapticFeedback && Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Bounce animation
    if (!shouldReduceMotion()) {
      createScaleAnimation(scaleAnim, 1.3, duration / 2, EASING.easeOut).start(() => {
        createScaleAnimation(scaleAnim, 1, duration / 2, EASING.easeOut).start();
      });
    }

    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={!onPress}
    >
      <Animated.View
        style={[
          style,
          {
            transform: shouldReduceMotion() 
              ? [{ scale: scaleAnim }]
              : [{ scale: Animated.multiply(pulseAnim, scaleAnim) }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

// Count animation for notifications/badges
interface CounterAnimationProps {
  count: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
  renderCount: (count: number) => React.ReactNode;
}

export const CounterAnimation: React.FC<CounterAnimationProps> = ({
  count,
  duration = ANIMATION_DURATION.normal,
  style,
  renderCount,
}) => {
  const { shouldReduceMotion, getAnimationDuration } = useAccessibility();
  const animatedCount = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const adjustedDuration = shouldReduceMotion() 
    ? getAnimationDuration(duration)
    : duration;

  useEffect(() => {
    if (shouldReduceMotion()) {
      animatedCount.setValue(count);
    } else {
      // Scale up briefly when count changes
      createScaleAnimation(scaleAnim, 1.2, adjustedDuration / 4, EASING.easeOut).start(() => {
        createScaleAnimation(scaleAnim, 1, adjustedDuration / 4, EASING.easeOut).start();
      });

      // Animate count value
      Animated.timing(animatedCount, {
        toValue: count,
        duration: adjustedDuration,
        easing: EASING.easeOut,
        useNativeDriver: false,
      }).start();
    }
  }, [count]);

  return (
    <Animated.View
      style={[
        style,
        {
          transform: shouldReduceMotion() ? [] : [{ scale: scaleAnim }],
        },
      ]}
    >
      <Animated.View>
        {shouldReduceMotion() ? (
          renderCount(count)
        ) : (
          <Animated.View>
            {renderCount(Math.round(animatedCount._value || 0))}
          </Animated.View>
        )}
      </Animated.View>
    </Animated.View>
  );
};

// Swipe gesture feedback
interface SwipeIndicatorProps {
  direction: 'left' | 'right' | 'up' | 'down';
  progress: number; // 0 to 1
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export const SwipeIndicator: React.FC<SwipeIndicatorProps> = ({
  direction,
  progress,
  style,
  children,
}) => {
  const { shouldReduceMotion } = useAccessibility();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (shouldReduceMotion()) {
      fadeAnim.setValue(progress > 0.5 ? 1 : 0);
      scaleAnim.setValue(1);
    } else {
      fadeAnim.setValue(progress);
      scaleAnim.setValue(0.8 + (progress * 0.2));
    }
  }, [progress]);

  const getIndicatorPosition = () => {
    const positions = {
      left: { left: 20, top: '50%', marginTop: -20 },
      right: { right: 20, top: '50%', marginTop: -20 },
      up: { top: 20, left: '50%', marginLeft: -20 },
      down: { bottom: 20, left: '50%', marginLeft: -20 },
    };
    return positions[direction];
  };

  const getArrowRotation = () => {
    const rotations = {
      left: '180deg',
      right: '0deg',
      up: '270deg',
      down: '90deg',
    };
    return rotations[direction];
  };

  if (progress === 0) {
    return null;
  }

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          justifyContent: 'center',
          alignItems: 'center',
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
        getIndicatorPosition(),
        style,
      ]}
    >
      {children || (
        <Animated.Text
          style={{
            color: 'white',
            fontSize: 20,
            transform: [{ rotate: getArrowRotation() }],
          }}
        >
          →
        </Animated.Text>
      )}
    </Animated.View>
  );
};

export default {
  FloatingActionButton,
  ShakeView,
  HeartbeatView,
  CounterAnimation,
  SwipeIndicator,
};