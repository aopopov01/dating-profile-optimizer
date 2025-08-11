/**
 * Onboarding Progress Component
 * Visual progress indicator for onboarding steps
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../../utils/designSystem';

interface OnboardingProgressProps {
  currentStep: string;
  completedSteps: string[];
  onStepPress?: (stepId: string) => void;
}

const stepDefinitions = [
  { id: 'welcome', title: 'Welcome', short: 'Hi' },
  { id: 'features', title: 'Features', short: 'Tour' },
  { id: 'permissions', title: 'Permissions', short: 'Allow' },
  { id: 'goals', title: 'Your Goals', short: 'Goals' },
  { id: 'profile-setup', title: 'Profile Setup', short: 'Setup' },
  { id: 'tutorial-intro', title: 'Tutorials', short: 'Learn' },
  { id: 'complete', title: 'Complete', short: 'Done' },
];

const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  currentStep,
  completedSteps,
  onStepPress,
}) => {
  const getCurrentStepIndex = () => {
    return stepDefinitions.findIndex(step => step.id === currentStep);
  };

  const getStepStatus = (stepId: string, index: number) => {
    const currentIndex = getCurrentStepIndex();
    
    if (completedSteps.includes(stepId)) {
      return 'completed';
    } else if (stepId === currentStep) {
      return 'current';
    } else if (index < currentIndex) {
      return 'completed';
    } else {
      return 'upcoming';
    }
  };

  const renderStep = (step: any, index: number) => {
    const status = getStepStatus(step.id, index);
    const isInteractive = onStepPress && status === 'completed';

    const stepComponent = (
      <View key={step.id} style={styles.stepContainer}>
        <View
          style={[
            styles.stepCircle,
            status === 'completed' && styles.stepCompleted,
            status === 'current' && styles.stepCurrent,
            status === 'upcoming' && styles.stepUpcoming,
          ]}
        >
          {status === 'completed' ? (
            <Text style={styles.stepCheckmark}>✓</Text>
          ) : (
            <Text
              style={[
                styles.stepNumber,
                status === 'current' && styles.stepNumberCurrent,
                status === 'upcoming' && styles.stepNumberUpcoming,
              ]}
            >
              {index + 1}
            </Text>
          )}
        </View>
        
        <Text
          style={[
            styles.stepTitle,
            status === 'current' && styles.stepTitleCurrent,
            status === 'upcoming' && styles.stepTitleUpcoming,
          ]}
        >
          {step.short}
        </Text>

        {index < stepDefinitions.length - 1 && (
          <View
            style={[
              styles.stepConnector,
              status === 'completed' && styles.stepConnectorCompleted,
            ]}
          />
        )}
      </View>
    );

    if (isInteractive) {
      return (
        <TouchableOpacity
          key={step.id}
          onPress={() => onStepPress(step.id)}
          activeOpacity={0.7}
        >
          {stepComponent}
        </TouchableOpacity>
      );
    }

    return stepComponent;
  };

  const currentIndex = getCurrentStepIndex();
  const progress = ((currentIndex + 1) / stepDefinitions.length) * 100;

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.max(progress, 0)}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {currentIndex + 1} of {stepDefinitions.length}
        </Text>
      </View>

      {/* Step Indicators */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stepsScrollContainer}
        style={styles.stepsScroll}
      >
        {stepDefinitions.map(renderStep)}
      </ScrollView>

      {/* Current Step Info */}
      <View style={styles.currentStepInfo}>
        <Text style={styles.currentStepTitle}>
          {stepDefinitions[currentIndex]?.title || 'Getting Started'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface.primary,
    paddingVertical: SPACING.md,
  },

  progressBarContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },

  progressBar: {
    height: 3,
    backgroundColor: COLORS.neutral[200],
    borderRadius: 2,
    marginBottom: SPACING.xs,
  },

  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary[500],
    borderRadius: 2,
    minWidth: 3,
  },

  progressText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    textAlign: 'right',
    fontWeight: '600',
  },

  stepsScroll: {
    marginBottom: SPACING.sm,
  },

  stepsScrollContainer: {
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },

  stepContainer: {
    alignItems: 'center',
    marginRight: SPACING.md,
    position: 'relative',
  },

  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    borderWidth: 2,
  },

  stepCompleted: {
    backgroundColor: COLORS.primary[500],
    borderColor: COLORS.primary[500],
  },

  stepCurrent: {
    backgroundColor: COLORS.primary[100],
    borderColor: COLORS.primary[500],
  },

  stepUpcoming: {
    backgroundColor: COLORS.neutral[100],
    borderColor: COLORS.neutral[300],
  },

  stepCheckmark: {
    color: COLORS.text.inverse,
    fontSize: 16,
    fontWeight: 'bold',
  },

  stepNumber: {
    ...TYPOGRAPHY.body.small,
    fontWeight: 'bold',
  },

  stepNumberCurrent: {
    color: COLORS.primary[700],
  },

  stepNumberUpcoming: {
    color: COLORS.text.tertiary,
  },

  stepTitle: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
    minWidth: 40,
  },

  stepTitleCurrent: {
    color: COLORS.primary[700],
    fontWeight: '600',
  },

  stepTitleUpcoming: {
    color: COLORS.text.tertiary,
  },

  stepConnector: {
    position: 'absolute',
    top: 16,
    left: 40,
    right: -SPACING.md + 16,
    height: 2,
    backgroundColor: COLORS.neutral[300],
    zIndex: -1,
  },

  stepConnectorCompleted: {
    backgroundColor: COLORS.primary[300],
  },

  currentStepInfo: {
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },

  currentStepTitle: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default OnboardingProgress;