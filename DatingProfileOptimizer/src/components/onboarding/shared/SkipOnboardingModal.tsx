/**
 * Skip Onboarding Modal
 * Confirmation modal for skipping the onboarding process
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../../utils/designSystem';
import { PrimaryButton, SecondaryButton } from '../../shared/Button';

interface SkipOnboardingModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const SkipOnboardingModal: React.FC<SkipOnboardingModalProps> = ({
  visible,
  onConfirm,
  onCancel,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 150,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, scaleAnim]);

  const benefits = [
    {
      icon: '📸',
      title: 'Photo Analysis',
      description: 'Learn which photos work best',
    },
    {
      icon: '✍️',
      title: 'Bio Generation',
      description: 'Get help writing compelling bios',
    },
    {
      icon: '📊',
      title: 'Success Tracking',
      description: 'Monitor your dating progress',
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCancel}
    >
      <Animated.View
        style={[
          styles.overlay,
          { opacity: fadeAnim },
        ]}
      >
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onCancel}
        />
        
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
              <Text style={styles.emoji}>⚠️</Text>
              <Text style={styles.title}>Skip Setup?</Text>
              <Text style={styles.subtitle}>
                You'll miss out on personalized features that could significantly improve your dating success
              </Text>
            </View>

            {/* What you'll miss */}
            <View style={styles.benefitsSection}>
              <Text style={styles.benefitsTitle}>What you'll miss:</Text>
              {benefits.map((benefit, index) => (
                <View key={index} style={styles.benefitItem}>
                  <Text style={styles.benefitIcon}>{benefit.icon}</Text>
                  <View style={styles.benefitContent}>
                    <Text style={styles.benefitTitle}>{benefit.title}</Text>
                    <Text style={styles.benefitDescription}>{benefit.description}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Options */}
            <View style={styles.optionsSection}>
              <Text style={styles.optionsTitle}>You can always:</Text>
              <View style={styles.option}>
                <Text style={styles.optionBullet}>•</Text>
                <Text style={styles.optionText}>
                  Complete setup later in Settings
                </Text>
              </View>
              <View style={styles.option}>
                <Text style={styles.optionBullet}>•</Text>
                <Text style={styles.optionText}>
                  Access tutorials from the Help section
                </Text>
              </View>
              <View style={styles.option}>
                <Text style={styles.optionBullet}>•</Text>
                <Text style={styles.optionText}>
                  Start using basic features immediately
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <SecondaryButton
                title="Continue Setup"
                onPress={onCancel}
                size="large"
                style={styles.continueButton}
                icon={<Text style={styles.buttonIcon}>←</Text>}
                iconPosition="left"
              />
              
              <PrimaryButton
                title="Skip for Now"
                onPress={onConfirm}
                size="large"
                style={styles.skipButton}
                variant="outline"
              />
            </View>

            {/* Fine print */}
            <Text style={styles.finePrint}>
              Recommended: Complete the 2-minute setup for best results
            </Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  overlayTouchable: {
    ...StyleSheet.absoluteFillObject,
  },

  modalContainer: {
    width: screenWidth - (SPACING.lg * 2),
    maxHeight: screenHeight * 0.8,
    backgroundColor: COLORS.surface.modal,
    borderRadius: RADIUS.xl,
    ...SHADOWS.intense,
  },

  modalContent: {
    padding: SPACING.xl,
  },

  header: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },

  emoji: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },

  title: {
    ...TYPOGRAPHY.title.large,
    color: COLORS.text.primary,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },

  subtitle: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },

  benefitsSection: {
    marginBottom: SPACING.lg,
  },

  benefitsTitle: {
    ...TYPOGRAPHY.title.small,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },

  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },

  benefitIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
    marginTop: 2,
  },

  benefitContent: {
    flex: 1,
  },

  benefitTitle: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: 2,
  },

  benefitDescription: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.secondary,
    lineHeight: 16,
  },

  optionsSection: {
    backgroundColor: COLORS.neutral[50],
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
  },

  optionsTitle: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },

  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },

  optionBullet: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.primary[500],
    marginRight: SPACING.sm,
    marginTop: 2,
    fontWeight: 'bold',
  },

  optionText: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.secondary,
    flex: 1,
    lineHeight: 18,
  },

  actions: {
    marginBottom: SPACING.md,
  },

  continueButton: {
    marginBottom: SPACING.md,
  },

  skipButton: {
    borderColor: COLORS.semantic.warning,
    borderWidth: 1,
  },

  buttonIcon: {
    fontSize: 16,
  },

  finePrint: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default SkipOnboardingModal;