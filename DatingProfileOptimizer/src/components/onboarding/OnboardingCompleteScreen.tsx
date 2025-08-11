/**
 * Onboarding Complete Screen
 * Celebration screen with personalized welcome and next steps
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../utils/designSystem';
import { PrimaryButton, SecondaryButton } from '../shared/Button';
import Card from '../shared/Card';

interface OnboardingCompleteScreenProps {
  onContinue: () => void;
  userPreferences?: any;
}

const { width: screenWidth } = Dimensions.get('window');

const OnboardingCompleteScreen: React.FC<OnboardingCompleteScreenProps> = ({
  onContinue,
  userPreferences = {},
}) => {
  const [confettiAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Start celebration animation sequence
    Animated.sequence([
      Animated.timing(confettiAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const getPersonalizedMessage = () => {
    const { relationshipType, platforms = [], priorities = [] } = userPreferences;
    
    let message = "You're all set to transform your dating success! ";
    
    if (relationshipType === 'serious') {
      message += "We'll help you find meaningful connections that could lead to something special.";
    } else if (relationshipType === 'casual') {
      message += "We'll help you have fun and meet interesting people without the pressure.";
    } else {
      message += "We'll help you navigate the dating world with confidence.";
    }

    return message;
  };

  const getRecommendedNextSteps = () => {
    const { priorities = [], platforms = [] } = userPreferences;
    const steps = [];

    if (priorities.includes('photos')) {
      steps.push({
        icon: '📸',
        title: 'Upload Your Best Photos',
        description: 'Start by uploading 3-5 photos for AI analysis',
        action: 'Upload Photos',
        primary: true,
      });
    }

    if (priorities.includes('bio')) {
      steps.push({
        icon: '✍️',
        title: 'Generate Your Perfect Bio',
        description: 'Let AI create a compelling bio based on your interests',
        action: 'Generate Bio',
        primary: priorities.length === 1,
      });
    }

    if (platforms.length > 0) {
      steps.push({
        icon: '📱',
        title: 'Choose Your Platform',
        description: `Optimize for ${platforms[0]} or compare across platforms`,
        action: 'Select Platform',
        primary: priorities.length === 0,
      });
    }

    // Default step if no specific priorities
    if (steps.length === 0) {
      steps.push({
        icon: '🚀',
        title: 'Start Photo Analysis',
        description: 'Begin your journey with our AI photo analyzer',
        action: 'Get Started',
        primary: true,
      });
    }

    return steps.slice(0, 3); // Limit to 3 steps
  };

  const achievements = [
    {
      icon: '✅',
      title: 'Profile Created',
      description: 'Basic profile information set up',
    },
    {
      icon: '🎯',
      title: 'Goals Defined',
      description: 'Dating preferences and priorities selected',
    },
    {
      icon: '🔧',
      title: 'App Configured',
      description: 'Permissions granted and settings optimized',
    },
  ];

  const stats = [
    { number: '3x', label: 'More Matches', description: 'Average improvement' },
    { number: '15min', label: 'Setup Time', description: 'Quick optimization' },
    { number: '24/7', label: 'AI Support', description: 'Always available' },
  ];

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
          },
        ]}
      />
    ));

    return <View style={styles.confettiContainer}>{confettiPieces}</View>;
  };

  const renderHeader = () => (
    <Animated.View
      style={[
        styles.header,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={styles.congratsIcon}>🎉</Text>
      <Text style={styles.congratsTitle}>Congratulations!</Text>
      <Text style={styles.congratsSubtitle}>
        Your dating profile is ready for optimization
      </Text>
      <Text style={styles.personalizedMessage}>
        {getPersonalizedMessage()}
      </Text>
    </Animated.View>
  );

  const renderAchievements = () => (
    <Animated.View
      style={[
        styles.achievementsSection,
        { opacity: fadeAnim },
      ]}
    >
      <Text style={styles.sectionTitle}>What You've Accomplished</Text>
      <View style={styles.achievementsList}>
        {achievements.map((achievement, index) => (
          <View key={index} style={styles.achievementItem}>
            <Text style={styles.achievementIcon}>{achievement.icon}</Text>
            <View style={styles.achievementInfo}>
              <Text style={styles.achievementTitle}>{achievement.title}</Text>
              <Text style={styles.achievementDescription}>
                {achievement.description}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  );

  const renderStats = () => (
    <Card style={styles.statsCard} variant="elevated">
      <Text style={styles.statsTitle}>What to Expect</Text>
      <View style={styles.statsContainer}>
        {stats.map((stat, index) => (
          <View key={index} style={styles.statItem}>
            <Text style={styles.statNumber}>{stat.number}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
            <Text style={styles.statDescription}>{stat.description}</Text>
          </View>
        ))}
      </View>
    </Card>
  );

  const renderNextSteps = () => {
    const steps = getRecommendedNextSteps();
    
    return (
      <Animated.View
        style={[
          styles.nextStepsSection,
          { opacity: fadeAnim },
        ]}
      >
        <Text style={styles.sectionTitle}>Recommended Next Steps</Text>
        {steps.map((step, index) => (
          <Card key={index} style={styles.stepCard} variant="outlined">
            <View style={styles.stepHeader}>
              <Text style={styles.stepIcon}>{step.icon}</Text>
              <View style={styles.stepInfo}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>
              {step.primary && (
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>Recommended</Text>
                </View>
              )}
            </View>
          </Card>
        ))}
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {renderConfetti()}
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}
        {renderAchievements()}
        {renderStats()}
        {renderNextSteps()}
      </ScrollView>

      <View style={styles.bottomActions}>
        <PrimaryButton
          title="Start Optimizing"
          onPress={onContinue}
          size="large"
          style={styles.startButton}
          icon={<Text style={styles.buttonIcon}>🚀</Text>}
          iconPosition="left"
        />
        
        <Text style={styles.supportText}>
          Need help? Our AI assistant is here 24/7 to guide you!
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },

  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    pointerEvents: 'none',
  },

  confettiPiece: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  scrollView: {
    flex: 1,
  },

  contentContainer: {
    paddingBottom: SPACING.xxxl,
  },

  header: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxxl,
    paddingBottom: SPACING.xl,
  },

  congratsIcon: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },

  congratsTitle: {
    ...TYPOGRAPHY.headline.medium,
    color: COLORS.text.primary,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },

  congratsSubtitle: {
    ...TYPOGRAPHY.title.medium,
    color: COLORS.primary[600],
    textAlign: 'center',
    marginBottom: SPACING.lg,
    fontWeight: '600',
  },

  personalizedMessage: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 22,
  },

  achievementsSection: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },

  sectionTitle: {
    ...TYPOGRAPHY.title.large,
    color: COLORS.text.primary,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },

  achievementsList: {
    backgroundColor: COLORS.semantic.success + '10',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.semantic.success + '30',
  },

  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },

  achievementIcon: {
    fontSize: 24,
    marginRight: SPACING.md,
  },

  achievementInfo: {
    flex: 1,
  },

  achievementTitle: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },

  achievementDescription: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.secondary,
  },

  statsCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    padding: SPACING.lg,
  },

  statsTitle: {
    ...TYPOGRAPHY.title.medium,
    color: COLORS.text.primary,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },

  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  statItem: {
    alignItems: 'center',
    flex: 1,
  },

  statNumber: {
    ...TYPOGRAPHY.headline.small,
    color: COLORS.primary[600],
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },

  statLabel: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },

  statDescription: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },

  nextStepsSection: {
    paddingHorizontal: SPACING.lg,
  },

  stepCard: {
    marginBottom: SPACING.md,
    padding: SPACING.lg,
  },

  stepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  stepIcon: {
    fontSize: 32,
    marginRight: SPACING.md,
  },

  stepInfo: {
    flex: 1,
  },

  stepTitle: {
    ...TYPOGRAPHY.title.medium,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },

  stepDescription: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },

  recommendedBadge: {
    backgroundColor: COLORS.primary[500],
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
  },

  recommendedText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.inverse,
    fontWeight: 'bold',
  },

  bottomActions: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.surface.primary,
    ...SHADOWS.light,
  },

  startButton: {
    marginBottom: SPACING.md,
  },

  supportText: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },

  buttonIcon: {
    fontSize: 20,
  },
});

export default OnboardingCompleteScreen;