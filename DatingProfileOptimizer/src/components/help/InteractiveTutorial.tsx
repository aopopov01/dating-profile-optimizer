/**
 * Interactive Tutorial Component
 * Step-by-step guided tutorials with highlights and instructions
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Modal,
  Dimensions,
  ScrollView,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../utils/designSystem';
import { useHelp, Tutorial, TutorialStep } from '../../contexts/HelpContext';
import { PrimaryButton, SecondaryButton } from '../shared/Button';

interface InteractiveTutorialProps {
  tutorialId: string;
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const InteractiveTutorial: React.FC<InteractiveTutorialProps> = ({
  tutorialId,
  visible,
  onClose,
  onComplete,
}) => {
  const {
    state,
    getTutorials,
    nextStep,
    previousStep,
    goToStep,
    pauseTutorial,
    completeTutorial,
  } = useHelp();

  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [currentStepData, setCurrentStepData] = useState<TutorialStep | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Load tutorial data
  useEffect(() => {
    const tutorials = getTutorials();
    const foundTutorial = tutorials.find(t => t.id === tutorialId);
    
    if (foundTutorial) {
      setTutorial(foundTutorial);
      setCurrentStepData(foundTutorial.steps[state.currentStep] || null);
    }
  }, [tutorialId, getTutorials]);

  // Update current step when state changes
  useEffect(() => {
    if (tutorial && state.currentTutorial === tutorialId) {
      const step = tutorial.steps[state.currentStep];
      setCurrentStepData(step || null);
      animateStepChange();
      updateProgress();
    }
  }, [state.currentStep, state.currentTutorial, tutorial, tutorialId]);

  // Animate tutorial entrance
  useEffect(() => {
    if (visible && tutorial) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, tutorial]);

  const animateStepChange = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: -10,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setIsAnimating(false));
  };

  const updateProgress = () => {
    if (!tutorial) return;
    
    const progress = (state.currentStep + 1) / tutorial.steps.length;
    
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const handleNext = () => {
    if (!tutorial || !currentStepData) return;
    
    if (state.currentStep >= tutorial.steps.length - 1) {
      // Tutorial completed
      completeTutorial(tutorialId);
      onComplete();
    } else {
      nextStep();
    }
  };

  const handlePrevious = () => {
    if (state.currentStep > 0) {
      previousStep();
    }
  };

  const handleSkip = () => {
    pauseTutorial();
    onClose();
  };

  const handleStepJump = (stepIndex: number) => {
    goToStep(stepIndex);
  };

  const renderProgressBar = () => {
    if (!tutorial) return null;
    
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
        
        <Text style={styles.progressText}>
          Step {state.currentStep + 1} of {tutorial.steps.length}
        </Text>
      </View>
    );
  };

  const renderStepIndicators = () => {
    if (!tutorial) return null;
    
    return (
      <ScrollView 
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.indicatorsContainer}
        style={styles.indicatorsScroll}
      >
        {tutorial.steps.map((step, index) => (
          <TouchableOpacity
            key={step.id}
            style={[
              styles.stepIndicator,
              index === state.currentStep && styles.stepIndicatorActive,
              index < state.currentStep && styles.stepIndicatorCompleted,
            ]}
            onPress={() => handleStepJump(index)}
            disabled={index > state.currentStep}
          >
            {index < state.currentStep ? (
              <Text style={styles.stepIndicatorText}>✓</Text>
            ) : (
              <Text
                style={[
                  styles.stepIndicatorText,
                  index === state.currentStep && styles.stepIndicatorTextActive,
                ]}
              >
                {index + 1}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderStepContent = () => {
    if (!currentStepData) return null;
    
    return (
      <Animated.View
        style={[
          styles.stepContent,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>{currentStepData.title}</Text>
          <Text style={styles.stepDescription}>{currentStepData.description}</Text>
        </View>
        
        <View style={styles.stepBody}>
          <Text style={styles.stepContentText}>{currentStepData.content}</Text>
          
          {currentStepData.type === 'action' && (
            <View style={styles.actionHint}>
              <Text style={styles.actionHintIcon}>👆</Text>
              <Text style={styles.actionHintText}>
                Interact with the highlighted element to continue
              </Text>
            </View>
          )}
          
          {currentStepData.type === 'highlight' && (
            <View style={styles.highlightHint}>
              <Text style={styles.highlightHintIcon}>✨</Text>
              <Text style={styles.highlightHintText}>
                Pay attention to the highlighted area
              </Text>
            </View>
          )}
        </View>
        
        {currentStepData.videoUrl && (
          <TouchableOpacity style={styles.videoButton}>
            <Text style={styles.videoButtonIcon}>▶️</Text>
            <Text style={styles.videoButtonText}>Watch Video Guide</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  };

  const renderControls = () => {
    if (!tutorial) return null;
    
    const isFirstStep = state.currentStep === 0;
    const isLastStep = state.currentStep >= tutorial.steps.length - 1;
    
    return (
      <View style={styles.controlsContainer}>
        <View style={styles.controlsRow}>
          {!isFirstStep && (
            <SecondaryButton
              title="Previous"
              onPress={handlePrevious}
              size="medium"
              style={styles.previousButton}
              icon={<Text style={styles.buttonIcon}>←</Text>}
              iconPosition="left"
            />
          )}
          
          <View style={styles.controlsSpacer} />
          
          <SecondaryButton
            title="Skip Tutorial"
            onPress={handleSkip}
            size="small"
            variant="ghost"
            style={styles.skipButton}
          />
          
          <PrimaryButton
            title={isLastStep ? "Complete" : "Next"}
            onPress={handleNext}
            size="medium"
            style={styles.nextButton}
            icon={
              <Text style={styles.buttonIcon}>
                {isLastStep ? "✓" : "→"}
              </Text>
            }
            iconPosition="right"
          />
        </View>
      </View>
    );
  };

  const renderTutorialOverview = () => {
    if (!tutorial) return null;
    
    return (
      <View style={styles.overviewContainer}>
        <Text style={styles.tutorialTitle}>{tutorial.title}</Text>
        <Text style={styles.tutorialDescription}>{tutorial.description}</Text>
        
        <View style={styles.tutorialMeta}>
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>⏱️</Text>
            <Text style={styles.metaText}>{tutorial.estimatedTime}</Text>
          </View>
          
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>📊</Text>
            <Text style={styles.metaText}>{tutorial.difficulty}</Text>
          </View>
          
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>📝</Text>
            <Text style={styles.metaText}>{tutorial.steps.length} steps</Text>
          </View>
        </View>
      </View>
    );
  };

  if (!tutorial || !visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.tutorialContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {renderTutorialOverview()}
          {renderProgressBar()}
          {renderStepIndicators()}
          
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.contentScrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {renderStepContent()}
          </ScrollView>
          
          {renderControls()}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },

  tutorialContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    backgroundColor: COLORS.surface.modal,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.intense,
  },

  overviewContainer: {
    padding: SPACING.lg,
    backgroundColor: COLORS.primary[50],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary[200],
  },

  tutorialTitle: {
    ...TYPOGRAPHY.title.large,
    color: COLORS.text.primary,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },

  tutorialDescription: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
    lineHeight: 20,
  },

  tutorialMeta: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  metaIcon: {
    fontSize: 14,
    marginRight: SPACING.xs,
  },

  metaText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },

  progressContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface.primary,
  },

  progressBar: {
    height: 4,
    backgroundColor: COLORS.neutral[200],
    borderRadius: 2,
    marginBottom: SPACING.xs,
  },

  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary[500],
    borderRadius: 2,
  },

  progressText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    textAlign: 'center',
    fontWeight: '600',
  },

  indicatorsScroll: {
    backgroundColor: COLORS.surface.secondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral[200],
  },

  indicatorsContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },

  stepIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },

  stepIndicatorActive: {
    backgroundColor: COLORS.primary[500],
  },

  stepIndicatorCompleted: {
    backgroundColor: COLORS.semantic.success,
  },

  stepIndicatorText: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.tertiary,
    fontWeight: 'bold',
  },

  stepIndicatorTextActive: {
    color: COLORS.text.inverse,
  },

  contentScroll: {
    flex: 1,
  },

  contentScrollContainer: {
    padding: SPACING.lg,
  },

  stepContent: {
    flex: 1,
  },

  stepHeader: {
    marginBottom: SPACING.lg,
  },

  stepTitle: {
    ...TYPOGRAPHY.title.medium,
    color: COLORS.text.primary,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },

  stepDescription: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    lineHeight: 22,
  },

  stepBody: {
    marginBottom: SPACING.lg,
  },

  stepContentText: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
    lineHeight: 22,
    marginBottom: SPACING.md,
  },

  actionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary[50],
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary[200],
    marginBottom: SPACING.md,
  },

  actionHintIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },

  actionHintText: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.primary[700],
    flex: 1,
    fontWeight: '600',
  },

  highlightHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary[50],
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.secondary[200],
    marginBottom: SPACING.md,
  },

  highlightHintIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },

  highlightHintText: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.secondary[700],
    flex: 1,
    fontWeight: '600',
  },

  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neutral[100],
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.neutral[300],
  },

  videoButtonIcon: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },

  videoButtonText: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
    fontWeight: '600',
  },

  controlsContainer: {
    backgroundColor: COLORS.surface.primary,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral[200],
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },

  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  controlsSpacer: {
    flex: 1,
  },

  previousButton: {
    minWidth: 80,
  },

  skipButton: {
    marginRight: SPACING.md,
  },

  nextButton: {
    minWidth: 100,
  },

  buttonIcon: {
    fontSize: 16,
  },
});

export default InteractiveTutorial;