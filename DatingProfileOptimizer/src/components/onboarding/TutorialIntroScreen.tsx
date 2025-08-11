/**
 * Tutorial Introduction Screen
 * Interactive introduction to key app features with guided tutorials
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Image,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../utils/designSystem';
import { PrimaryButton, SecondaryButton } from '../shared/Button';
import Card from '../shared/Card';

interface Tutorial {
  id: string;
  title: string;
  description: string;
  icon: string;
  duration: string;
  difficulty: 'Easy' | 'Medium' | 'Advanced';
  benefits: string[];
  preview: string;
  completed: boolean;
}

interface TutorialIntroScreenProps {
  onNext: (data?: any) => void;
  onBack: () => void;
}

const TutorialIntroScreen: React.FC<TutorialIntroScreenProps> = ({
  onNext,
  onBack,
}) => {
  const [selectedTutorials, setSelectedTutorials] = useState<string[]>([]);
  const [fadeAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const tutorials: Tutorial[] = [
    {
      id: 'photo-analysis',
      title: 'Photo Analysis Tutorial',
      description: 'Learn how to use AI to score and improve your photos',
      icon: '📸',
      duration: '3 min',
      difficulty: 'Easy',
      benefits: [
        'Understand photo scoring',
        'Learn composition tips',
        'Get lighting advice',
        'Platform optimization'
      ],
      preview: 'Upload a photo → Get instant AI score → See improvement tips',
      completed: false,
    },
    {
      id: 'bio-generation',
      title: 'Bio Writing Masterclass',
      description: 'Master the art of writing compelling dating bios',
      icon: '✍️',
      duration: '4 min',
      difficulty: 'Medium',
      benefits: [
        'Bio writing strategies',
        'Personality matching',
        'Platform-specific tips',
        'A/B testing bios'
      ],
      preview: 'Share interests → Generate multiple bios → Test and optimize',
      completed: false,
    },
    {
      id: 'profile-optimization',
      title: 'Profile Optimization Guide',
      description: 'Complete walkthrough of creating winning profiles',
      icon: '🎯',
      duration: '5 min',
      difficulty: 'Medium',
      benefits: [
        'Complete profile strategy',
        'Photo sequence planning',
        'Bio and photo harmony',
        'Success tracking'
      ],
      preview: 'Analyze current profile → Get recommendations → Implement changes',
      completed: false,
    },
    {
      id: 'conversation-starters',
      title: 'Conversation Starter Secrets',
      description: 'Turn matches into meaningful conversations',
      icon: '💬',
      duration: '3 min',
      difficulty: 'Easy',
      benefits: [
        'Personalized ice breakers',
        'Response rate tips',
        'Conversation flow',
        'Match analysis'
      ],
      preview: 'Analyze match → Generate starters → Track responses',
      completed: false,
    },
    {
      id: 'advanced-features',
      title: 'Advanced Features Deep Dive',
      description: 'Unlock the full potential of the app',
      icon: '🚀',
      duration: '6 min',
      difficulty: 'Advanced',
      benefits: [
        'Analytics dashboard',
        'A/B testing tools',
        'Success predictions',
        'Export features'
      ],
      preview: 'Explore dashboard → Set up tests → Track improvements',
      completed: false,
    },
  ];

  const toggleTutorial = (tutorialId: string) => {
    setSelectedTutorials(prev => {
      if (prev.includes(tutorialId)) {
        return prev.filter(id => id !== tutorialId);
      } else {
        return [...prev, tutorialId];
      }
    });
  };

  const getDifficultyColor = (difficulty: Tutorial['difficulty']) => {
    switch (difficulty) {
      case 'Easy': return COLORS.semantic.success;
      case 'Medium': return COLORS.semantic.warning;
      case 'Advanced': return COLORS.semantic.error;
      default: return COLORS.neutral[500];
    }
  };

  const handleStartTutorials = () => {
    if (selectedTutorials.length === 0) {
      // Skip tutorials
      onNext({ skipTutorials: true });
    } else {
      // Start selected tutorials
      onNext({ 
        selectedTutorials,
        startTutorials: true 
      });
    }
  };

  const renderTutorialCard = (tutorial: Tutorial) => {
    const isSelected = selectedTutorials.includes(tutorial.id);
    
    return (
      <TouchableOpacity
        key={tutorial.id}
        onPress={() => toggleTutorial(tutorial.id)}
        activeOpacity={0.7}
      >
        <Card 
          style={[
            styles.tutorialCard,
            isSelected && styles.tutorialCardSelected
          ]}
          variant="elevated"
        >
          <View style={styles.tutorialHeader}>
            <View style={styles.tutorialIconContainer}>
              <Text style={styles.tutorialIcon}>{tutorial.icon}</Text>
              {isSelected && (
                <View style={styles.selectedIndicator}>
                  <Text style={styles.selectedIcon}>✓</Text>
                </View>
              )}
            </View>
            
            <View style={styles.tutorialInfo}>
              <Text style={styles.tutorialTitle}>{tutorial.title}</Text>
              <Text style={styles.tutorialDescription}>{tutorial.description}</Text>
              
              <View style={styles.tutorialMeta}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaIcon}>⏱️</Text>
                  <Text style={styles.metaText}>{tutorial.duration}</Text>
                </View>
                
                <View style={[
                  styles.difficultyBadge,
                  { backgroundColor: getDifficultyColor(tutorial.difficulty) }
                ]}>
                  <Text style={styles.difficultyText}>{tutorial.difficulty}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>What you'll learn:</Text>
            <View style={styles.benefitsList}>
              {tutorial.benefits.slice(0, 2).map((benefit, index) => (
                <View key={index} style={styles.benefitItem}>
                  <Text style={styles.benefitIcon}>•</Text>
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
              {tutorial.benefits.length > 2 && (
                <Text style={styles.moreBenefits}>
                  +{tutorial.benefits.length - 2} more
                </Text>
              )}
            </View>
          </View>

          <View style={styles.previewFlow}>
            <Text style={styles.previewFlowTitle}>Tutorial Flow:</Text>
            <Text style={styles.previewFlowText}>{tutorial.preview}</Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quick Learning Tutorials</Text>
        <Text style={styles.headerSubtitle}>
          Choose tutorials to master the app features that matter most to you
        </Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>5</Text>
            <Text style={styles.statLabel}>Tutorials</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>15-25</Text>
            <Text style={styles.statLabel}>Minutes</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>∞</Text>
            <Text style={styles.statLabel}>Re-watch</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {tutorials.map(renderTutorialCard)}
        
        <View style={styles.skipOption}>
          <Text style={styles.skipTitle}>Not interested in tutorials?</Text>
          <Text style={styles.skipDescription}>
            You can access all tutorials anytime from the Help section
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bottomActions}>
        <View style={styles.selectionSummary}>
          <Text style={styles.selectionText}>
            {selectedTutorials.length === 0 
              ? "No tutorials selected"
              : `${selectedTutorials.length} tutorial${selectedTutorials.length > 1 ? 's' : ''} selected`
            }
          </Text>
          {selectedTutorials.length > 0 && (
            <Text style={styles.estimatedTime}>
              Est. time: {selectedTutorials.length * 4} minutes
            </Text>
          )}
        </View>

        <View style={styles.actionButtons}>
          <SecondaryButton
            title="Back"
            onPress={onBack}
            size="medium"
            style={styles.backButton}
          />

          <PrimaryButton
            title={selectedTutorials.length === 0 ? "Skip Tutorials" : "Start Learning"}
            onPress={handleStartTutorials}
            size="large"
            style={styles.startButton}
            icon={
              <Text style={styles.buttonIcon}>
                {selectedTutorials.length === 0 ? "⏭️" : "🎓"}
              </Text>
            }
            iconPosition="left"
          />
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },

  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    alignItems: 'center',
  },

  headerTitle: {
    ...TYPOGRAPHY.headline.small,
    color: COLORS.text.primary,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },

  headerSubtitle: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    textAlign: 'center',
    maxWidth: 300,
    marginBottom: SPACING.lg,
  },

  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: COLORS.primary[50],
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
  },

  statItem: {
    alignItems: 'center',
    flex: 1,
  },

  statNumber: {
    ...TYPOGRAPHY.title.large,
    color: COLORS.primary[700],
    fontWeight: 'bold',
  },

  statLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },

  scrollView: {
    flex: 1,
  },

  contentContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },

  tutorialCard: {
    marginBottom: SPACING.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },

  tutorialCardSelected: {
    borderColor: COLORS.primary[500],
    backgroundColor: COLORS.primary[50],
  },

  tutorialHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },

  tutorialIconContainer: {
    position: 'relative',
    marginRight: SPACING.md,
  },

  tutorialIcon: {
    fontSize: 40,
  },

  selectedIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },

  selectedIcon: {
    color: COLORS.text.inverse,
    fontSize: 12,
    fontWeight: 'bold',
  },

  tutorialInfo: {
    flex: 1,
  },

  tutorialTitle: {
    ...TYPOGRAPHY.title.medium,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },

  tutorialDescription: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },

  tutorialMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },

  difficultyBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },

  difficultyText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.inverse,
    fontWeight: 'bold',
  },

  previewSection: {
    marginBottom: SPACING.md,
  },

  previewTitle: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },

  benefitsList: {
    paddingLeft: SPACING.sm,
  },

  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 2,
  },

  benefitIcon: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.primary[500],
    marginRight: SPACING.sm,
    marginTop: 2,
  },

  benefitText: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.secondary,
    flex: 1,
  },

  moreBenefits: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.primary[600],
    fontWeight: '600',
    marginLeft: SPACING.lg,
    marginTop: SPACING.xs,
  },

  previewFlow: {
    backgroundColor: COLORS.neutral[50],
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
  },

  previewFlowTitle: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },

  previewFlowText: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.secondary,
    lineHeight: 16,
  },

  skipOption: {
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.neutral[50],
    borderRadius: RADIUS.lg,
    marginTop: SPACING.lg,
  },

  skipTitle: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },

  skipDescription: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },

  bottomActions: {
    backgroundColor: COLORS.surface.primary,
    ...SHADOWS.light,
  },

  selectionSummary: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },

  selectionText: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
    fontWeight: '600',
  },

  estimatedTime: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },

  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },

  backButton: {
    flex: 1,
    marginRight: SPACING.md,
  },

  startButton: {
    flex: 2,
  },

  buttonIcon: {
    fontSize: 16,
  },
});

export default TutorialIntroScreen;