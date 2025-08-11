/**
 * Feature Discovery Modal
 * Celebrates new feature unlocks with engaging animations
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../utils/designSystem';
import { PrimaryButton, SecondaryButton } from '../shared/Button';
import { useProgressiveDisclosure, Feature } from '../../contexts/ProgressiveDisclosureContext';

interface FeatureDiscoveryModalProps {
  visible: boolean;
  feature: Feature | null;
  onTryNow: () => void;
  onDismiss: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

const FeatureDiscoveryModal: React.FC<FeatureDiscoveryModalProps> = ({
  visible,
  feature,
  onTryNow,
  onDismiss,
}) => {
  const { markFeatureDiscovered } = useProgressiveDisclosure();
  
  const [animationStep, setAnimationStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && feature) {
      startAnimation();
      markFeatureDiscovered(feature.id);
    } else {
      resetAnimation();
    }
  }, [visible, feature]);

  const startAnimation = () => {
    setAnimationStep(1);
    
    // Step 1: Fade in background
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setAnimationStep(2);
      
      // Step 2: Scale in modal with confetti
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 150,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(confettiAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setAnimationStep(3);
        
        // Step 3: Glow effect
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        ).start();
      });
    });
  };

  const resetAnimation = () => {
    setAnimationStep(0);
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.8);
    confettiAnim.setValue(0);
    glowAnim.setValue(0);
  };

  const handleTryNow = () => {
    onTryNow();
    onDismiss();
  };

  const getFeatureIcon = (category: string): string => {
    switch (category) {
      case 'basic': return '🎯';
      case 'advanced': return '🚀';
      case 'content': return '✍️';
      case 'analytics': return '📊';
      case 'social': return '💬';
      default: return '✨';
    }
  };

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'basic': return COLORS.semantic.success;
      case 'advanced': return COLORS.primary[500];
      case 'content': return COLORS.secondary[500];
      case 'analytics': return COLORS.semantic.info;
      case 'social': return COLORS.platform.bumble;
      default: return COLORS.neutral[500];
    }
  };

  const renderConfetti = () => {
    const confettiPieces = Array.from({ length: 20 }, (_, i) => (
      <Animated.View
        key={i}
        style={[
          styles.confettiPiece,
          {
            left: `${(i * 5) % 100}%`,
            backgroundColor: [
              COLORS.primary[500],
              COLORS.secondary[500],
              COLORS.semantic.success,
              '#FFD700',
              '#FF69B4',
            ][i % 5],
            transform: [
              {
                translateY: confettiAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-50, screenWidth],
                }),
              },
              {
                rotate: confettiAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                }),
              },
            ],
            opacity: confettiAnim.interpolate({
              inputRange: [0, 0.1, 0.9, 1],
              outputRange: [0, 1, 1, 0],
            }),
          },
        ]}
      />
    ));

    return <View style={styles.confettiContainer}>{confettiPieces}</View>;
  };

  const renderFeaturePreview = () => {
    if (!feature) return null;

    return (
      <View style={styles.featurePreview}>
        <Animated.View
          style={[
            styles.featureIconContainer,
            {
              transform: [
                {
                  scale: glowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.1],
                  }),
                },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.featureIconBackground,
              { backgroundColor: getCategoryColor(feature.category) + '20' },
            ]}
          >
            <Text style={styles.featureIcon}>
              {getFeatureIcon(feature.category)}
            </Text>
          </View>
          
          <Animated.View
            style={[
              styles.glowRing,
              {
                borderColor: getCategoryColor(feature.category),
                opacity: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.6],
                }),
                transform: [
                  {
                    scale: glowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.3],
                    }),
                  },
                ],
              },
            ]}
          />
        </Animated.View>

        <View
          style={[
            styles.categoryBadge,
            { backgroundColor: getCategoryColor(feature.category) },
          ]}
        >
          <Text style={styles.categoryText}>
            {feature.category.charAt(0).toUpperCase() + feature.category.slice(1)}
          </Text>
        </View>
      </View>
    );
  };

  if (!feature) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
    >
      <Animated.View
        style={[
          styles.overlay,
          { opacity: fadeAnim },
        ]}
      >
        {renderConfetti()}
        
        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.unlockBadge}>🎉 UNLOCKED</Text>
              <Text style={styles.title}>New Feature Available!</Text>
            </View>

            {/* Feature Preview */}
            {renderFeaturePreview()}

            {/* Feature Info */}
            <View style={styles.featureInfo}>
              <Text style={styles.featureName}>{feature.name}</Text>
              <Text style={styles.featureDescription}>
                {feature.description}
              </Text>

              {feature.isNew && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              )}
            </View>

            {/* Benefits */}
            <View style={styles.benefitsSection}>
              <Text style={styles.benefitsTitle}>What you can do:</Text>
              <View style={styles.benefitsList}>
                {getBenefitsForFeature(feature.id).map((benefit, index) => (
                  <View key={index} style={styles.benefitItem}>
                    <Text style={styles.benefitIcon}>✓</Text>
                    <Text style={styles.benefitText}>{benefit}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <PrimaryButton
                title={`Try ${feature.name}`}
                onPress={handleTryNow}
                size="large"
                style={styles.tryButton}
                icon={<Text style={styles.buttonIcon}>→</Text>}
                iconPosition="right"
              />
              
              <SecondaryButton
                title="Maybe Later"
                onPress={onDismiss}
                size="medium"
                style={styles.laterButton}
                variant="ghost"
              />
            </View>

            {/* Tutorial hint */}
            {feature.tutorialId && (
              <View style={styles.tutorialHint}>
                <Text style={styles.tutorialHintText}>
                  💡 New to this feature? We'll show you how it works!
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// Helper function to get benefits for a feature
const getBenefitsForFeature = (featureId: string): string[] => {
  const benefitsMap: Record<string, string[]> = {
    'advanced-analysis': [
      'Get detailed photo breakdowns',
      'Receive specific improvement tips',
      'Compare multiple photos side-by-side',
    ],
    'bio-generator': [
      'Create compelling bios instantly',
      'Match your personality and goals',
      'Optimize for different platforms',
    ],
    'conversation-starters': [
      'Get personalized ice breakers',
      'Match-specific conversation tips',
      'Improve response rates',
    ],
    'success-tracking': [
      'Track your dating app performance',
      'Monitor profile improvements',
      'See your success metrics',
    ],
  };

  return benefitsMap[featureId] || [
    'Enhance your dating profile',
    'Improve your success rate',
    'Get personalized insights',
  ];
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },

  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    pointerEvents: 'none',
  },

  confettiPiece: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  modalContainer: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.surface.modal,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.intense,
  },

  modalContent: {
    padding: SPACING.xl,
    alignItems: 'center',
  },

  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },

  unlockBadge: {
    ...TYPOGRAPHY.label.small,
    color: COLORS.semantic.success,
    backgroundColor: COLORS.semantic.success + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },

  title: {
    ...TYPOGRAPHY.headline.small,
    color: COLORS.text.primary,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  featurePreview: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    position: 'relative',
  },

  featureIconContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },

  featureIconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },

  featureIcon: {
    fontSize: 40,
  },

  glowRing: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
  },

  categoryBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },

  categoryText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.inverse,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },

  featureInfo: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    position: 'relative',
  },

  featureName: {
    ...TYPOGRAPHY.title.large,
    color: COLORS.text.primary,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },

  featureDescription: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },

  newBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.secondary[500],
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },

  newBadgeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.inverse,
    fontWeight: 'bold',
    fontSize: 10,
  },

  benefitsSection: {
    width: '100%',
    marginBottom: SPACING.xl,
  },

  benefitsTitle: {
    ...TYPOGRAPHY.title.small,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },

  benefitsList: {
    gap: SPACING.sm,
  },

  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  benefitIcon: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.semantic.success,
    fontWeight: 'bold',
    marginRight: SPACING.sm,
    marginTop: 2,
  },

  benefitText: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
    flex: 1,
    lineHeight: 20,
  },

  actions: {
    width: '100%',
    alignItems: 'center',
    gap: SPACING.md,
  },

  tryButton: {
    width: '100%',
  },

  laterButton: {
    width: '100%',
  },

  buttonIcon: {
    fontSize: 16,
  },

  tutorialHint: {
    backgroundColor: COLORS.primary[50],
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.md,
    width: '100%',
  },

  tutorialHintText: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.primary[700],
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default FeatureDiscoveryModal;