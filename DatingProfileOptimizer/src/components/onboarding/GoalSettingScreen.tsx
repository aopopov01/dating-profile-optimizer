/**
 * Goal Setting Screen - Dating Profile Optimizer
 * Personalization-focused onboarding step with user intent capture
 * Research-driven approach to understanding user needs
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../utils/designSystem';
import { PrimaryButton, TertiaryButton } from '../shared/Button';
import Card from '../shared/Card';

interface GoalSettingScreenProps {
  onGoalSelected: (goals: UserGoals) => void;
  onBack: () => void;
}

interface UserGoals {
  relationshipType: 'serious' | 'casual' | 'friends' | 'open';
  platforms: string[];
  experience: 'beginner' | 'intermediate' | 'experienced';
  priorities: string[];
  ageRange: [number, number];
}

interface GoalOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  popular?: boolean;
}

interface Platform {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

const GoalSettingScreen: React.FC<GoalSettingScreenProps> = ({
  onGoalSelected,
  onBack,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedGoals, setSelectedGoals] = useState<Partial<UserGoals>>({
    platforms: [],
    priorities: [],
    ageRange: [25, 35],
  });
  const [fadeAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [currentStep]);

  const relationshipOptions: GoalOption[] = [
    {
      id: 'serious',
      title: 'Long-term Relationship',
      description: 'Looking for someone special to build a future with',
      icon: '💕',
      popular: true,
    },
    {
      id: 'casual',
      title: 'Casual Dating',
      description: 'Meeting new people and having fun experiences',
      icon: '😊',
    },
    {
      id: 'friends',
      title: 'Friends & Networking',
      description: 'Expanding social circle and making connections',
      icon: '👥',
    },
    {
      id: 'open',
      title: 'Open to Anything',
      description: "Seeing what's out there and going with the flow",
      icon: '🌟',
    },
  ];

  const platforms: Platform[] = [
    {
      id: 'tinder',
      name: 'Tinder',
      icon: '🔥',
      color: COLORS.platform.tinder,
      description: 'Most popular, broad audience',
    },
    {
      id: 'bumble',
      name: 'Bumble',
      icon: '🐝',
      color: COLORS.platform.bumble,
      description: 'Women make the first move',
    },
    {
      id: 'hinge',
      name: 'Hinge',
      icon: '💙',
      color: COLORS.platform.hinge,
      description: 'Designed to be deleted',
    },
    {
      id: 'match',
      name: 'Match.com',
      icon: '💘',
      color: COLORS.platform.match,
      description: 'Serious relationships',
    },
    {
      id: 'other',
      name: 'Other Platforms',
      icon: '📱',
      color: COLORS.neutral[600],
      description: 'POF, OkCupid, etc.',
    },
  ];

  const experienceOptions: GoalOption[] = [
    {
      id: 'beginner',
      title: 'New to Dating Apps',
      description: 'Just starting out and learning the ropes',
      icon: '🌱',
    },
    {
      id: 'intermediate',
      title: 'Some Experience',
      description: 'Used dating apps before with mixed results',
      icon: '📈',
      popular: true,
    },
    {
      id: 'experienced',
      title: 'Dating App Veteran',
      description: 'Familiar with apps but want to optimize',
      icon: '🎯',
    },
  ];

  const priorityOptions: GoalOption[] = [
    {
      id: 'photos',
      title: 'Better Photos',
      description: 'Improve photo selection and quality',
      icon: '📸',
      popular: true,
    },
    {
      id: 'bio',
      title: 'Compelling Bio',
      description: 'Write bios that attract the right matches',
      icon: '✍️',
      popular: true,
    },
    {
      id: 'conversations',
      title: 'Better Conversations',
      description: 'Get help starting and maintaining chats',
      icon: '💬',
    },
    {
      id: 'matching',
      title: 'More Matches',
      description: 'Increase overall match quantity',
      icon: '🔥',
    },
    {
      id: 'quality',
      title: 'Quality Matches',
      description: 'Attract people who are truly compatible',
      icon: '⭐',
      popular: true,
    },
    {
      id: 'confidence',
      title: 'Dating Confidence',
      description: 'Feel more confident in the dating process',
      icon: '💪',
    },
  ];

  const steps = [
    'Relationship Goals',
    'Dating Platforms',
    'Experience Level',
    'Priorities',
  ];

  const handleOptionSelect = (option: string, multiSelect: boolean = false) => {
    const stepKey = ['relationshipType', 'platforms', 'experience', 'priorities'][currentStep];
    
    if (multiSelect) {
      const currentValues = selectedGoals[stepKey as keyof UserGoals] as string[] || [];
      const newValues = currentValues.includes(option)
        ? currentValues.filter(v => v !== option)
        : [...currentValues, option];
      
      setSelectedGoals(prev => ({
        ...prev,
        [stepKey]: newValues,
      }));
    } else {
      setSelectedGoals(prev => ({
        ...prev,
        [stepKey]: option,
      }));
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      onGoalSelected(selectedGoals as UserGoals);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      onBack();
    }
  };

  const isStepComplete = () => {
    switch (currentStep) {
      case 0:
        return selectedGoals.relationshipType !== undefined;
      case 1:
        return selectedGoals.platforms && selectedGoals.platforms.length > 0;
      case 2:
        return selectedGoals.experience !== undefined;
      case 3:
        return selectedGoals.priorities && selectedGoals.priorities.length > 0;
      default:
        return false;
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${((currentStep + 1) / steps.length) * 100}%` },
          ]}
        />
      </View>
      <Text style={styles.progressText}>
        Step {currentStep + 1} of {steps.length}
      </Text>
    </View>
  );

  const renderStepHeader = () => (
    <View style={styles.stepHeader}>
      <Text style={styles.stepTitle}>{steps[currentStep]}</Text>
      <Text style={styles.stepSubtitle}>
        {currentStep === 0 && "What are you hoping to find?"}
        {currentStep === 1 && "Which apps do you use or plan to use?"}
        {currentStep === 2 && "How familiar are you with dating apps?"}
        {currentStep === 3 && "What areas would you like to improve?"}
      </Text>
    </View>
  );

  const renderRelationshipGoals = () => (
    <View style={styles.optionsContainer}>
      {relationshipOptions.map((option) => (
        <TouchableOpacity
          key={option.id}
          style={[
            styles.optionCard,
            selectedGoals.relationshipType === option.id && styles.selectedCard,
          ]}
          onPress={() => handleOptionSelect(option.id)}
          activeOpacity={0.7}
        >
          <View style={styles.optionHeader}>
            <Text style={styles.optionIcon}>{option.icon}</Text>
            {option.popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>Popular</Text>
              </View>
            )}
          </View>
          <Text style={[
            styles.optionTitle,
            selectedGoals.relationshipType === option.id && styles.selectedText,
          ]}>
            {option.title}
          </Text>
          <Text style={styles.optionDescription}>{option.description}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderPlatforms = () => (
    <View style={styles.optionsContainer}>
      {platforms.map((platform) => {
        const isSelected = selectedGoals.platforms?.includes(platform.id);
        return (
          <TouchableOpacity
            key={platform.id}
            style={[
              styles.platformCard,
              isSelected && styles.selectedCard,
            ]}
            onPress={() => handleOptionSelect(platform.id, true)}
            activeOpacity={0.7}
          >
            <View style={styles.platformHeader}>
              <Text style={styles.platformIcon}>{platform.icon}</Text>
              <View style={styles.platformInfo}>
                <Text style={[
                  styles.platformName,
                  isSelected && styles.selectedText,
                ]}>
                  {platform.name}
                </Text>
                <Text style={styles.platformDescription}>
                  {platform.description}
                </Text>
              </View>
              {isSelected && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderExperience = () => (
    <View style={styles.optionsContainer}>
      {experienceOptions.map((option) => (
        <TouchableOpacity
          key={option.id}
          style={[
            styles.optionCard,
            selectedGoals.experience === option.id && styles.selectedCard,
          ]}
          onPress={() => handleOptionSelect(option.id)}
          activeOpacity={0.7}
        >
          <View style={styles.optionHeader}>
            <Text style={styles.optionIcon}>{option.icon}</Text>
            {option.popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>Most Common</Text>
              </View>
            )}
          </View>
          <Text style={[
            styles.optionTitle,
            selectedGoals.experience === option.id && styles.selectedText,
          ]}>
            {option.title}
          </Text>
          <Text style={styles.optionDescription}>{option.description}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderPriorities = () => (
    <View style={styles.optionsContainer}>
      <Text style={styles.multiSelectHint}>
        Select all that apply (you can choose multiple)
      </Text>
      {priorityOptions.map((option) => {
        const isSelected = selectedGoals.priorities?.includes(option.id);
        return (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.priorityCard,
              isSelected && styles.selectedCard,
            ]}
            onPress={() => handleOptionSelect(option.id, true)}
            activeOpacity={0.7}
          >
            <View style={styles.priorityContent}>
              <Text style={styles.priorityIcon}>{option.icon}</Text>
              <View style={styles.priorityInfo}>
                <Text style={[
                  styles.priorityTitle,
                  isSelected && styles.selectedText,
                ]}>
                  {option.title}
                  {option.popular && <Text style={styles.popularIndicator}> ⭐</Text>}
                </Text>
                <Text style={styles.priorityDescription}>
                  {option.description}
                </Text>
              </View>
              {isSelected && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return renderRelationshipGoals();
      case 1:
        return renderPlatforms();
      case 2:
        return renderExperience();
      case 3:
        return renderPriorities();
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {renderProgressBar()}
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {renderStepHeader()}
        
        <Animated.View
          style={[
            styles.animatedContainer,
            { opacity: fadeAnim },
          ]}
        >
          {renderCurrentStep()}
        </Animated.View>
      </ScrollView>
      
      <View style={styles.buttonContainer}>
        <TertiaryButton
          title="Back"
          onPress={handleBack}
          style={styles.backButton}
        />
        
        <PrimaryButton
          title={currentStep === steps.length - 1 ? "Let's Get Started!" : "Continue"}
          onPress={handleNext}
          disabled={!isStepComplete()}
          style={styles.continueButton}
          icon={currentStep === steps.length - 1 ? 
            <Text style={styles.buttonIcon}>🚀</Text> : 
            <Text style={styles.buttonIcon}>→</Text>
          }
          iconPosition="right"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  
  // Progress Bar
  progressContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface.primary,
    ...SHADOWS.light,
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
  },
  
  // Content
  scrollView: {
    flex: 1,
  },
  
  contentContainer: {
    paddingBottom: SPACING.xxxl,
  },
  
  stepHeader: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  
  stepTitle: {
    ...TYPOGRAPHY.headline.small,
    color: COLORS.text.primary,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  
  stepSubtitle: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  
  animatedContainer: {
    flex: 1,
  },
  
  optionsContainer: {
    paddingHorizontal: SPACING.lg,
  },
  
  multiSelectHint: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    fontStyle: 'italic',
  },
  
  // Option Cards
  optionCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: 'transparent',
    ...SHADOWS.light,
  },
  
  selectedCard: {
    borderColor: COLORS.primary[500],
    backgroundColor: COLORS.primary[50],
  },
  
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  
  optionIcon: {
    fontSize: 32,
  },
  
  popularBadge: {
    backgroundColor: COLORS.secondary[500],
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  
  popularText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.inverse,
    fontWeight: 'bold',
  },
  
  optionTitle: {
    ...TYPOGRAPHY.title.medium,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  
  selectedText: {
    color: COLORS.primary[700],
  },
  
  optionDescription: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  
  // Platform Cards
  platformCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    ...SHADOWS.light,
  },
  
  platformHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  platformIcon: {
    fontSize: 24,
    marginRight: SPACING.md,
  },
  
  platformInfo: {
    flex: 1,
  },
  
  platformName: {
    ...TYPOGRAPHY.title.small,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  
  platformDescription: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.secondary,
  },
  
  // Priority Cards
  priorityCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    ...SHADOWS.light,
  },
  
  priorityContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  priorityIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  
  priorityInfo: {
    flex: 1,
  },
  
  priorityTitle: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  
  popularIndicator: {
    color: COLORS.secondary[500],
  },
  
  priorityDescription: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.secondary,
  },
  
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  checkmarkText: {
    color: COLORS.text.inverse,
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // Buttons
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.surface.primary,
    ...SHADOWS.light,
  },
  
  backButton: {
    flex: 1,
    marginRight: SPACING.md,
  },
  
  continueButton: {
    flex: 2,
  },
  
  buttonIcon: {
    fontSize: 16,
  },
});

export default GoalSettingScreen;