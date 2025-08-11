/**
 * Feature Tour Screen
 * Interactive showcase of app features with engaging animations
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  Image,
  TouchableOpacity,
  PanGestureHandler,
  State,
} from 'react-native';
import { PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../utils/designSystem';
import { PrimaryButton, TertiaryButton } from '../shared/Button';
import Card from '../shared/Card';

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: string;
  image: string;
  benefits: string[];
  demoAction?: string;
}

interface FeatureTourScreenProps {
  onNext: (data?: any) => void;
  onBack: () => void;
  onSkip: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const FeatureTourScreen: React.FC<FeatureTourScreenProps> = ({
  onNext,
  onBack,
  onSkip,
}) => {
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  const features: Feature[] = [
    {
      id: 'ai-analysis',
      title: 'AI Photo Analysis',
      description: 'Get instant feedback on which photos work best for dating apps with advanced AI technology.',
      icon: '🤖',
      image: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=400',
      benefits: [
        'Score each photo 1-100',
        'Detailed feedback on lighting, pose, and more',
        'Platform-specific recommendations',
        'Instant results in seconds'
      ],
      demoAction: 'Try Photo Analysis',
    },
    {
      id: 'bio-generator',
      title: 'Smart Bio Generator',
      description: 'Create compelling bios that match your personality and attract the right people.',
      icon: '✍️',
      image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400',
      benefits: [
        'Personalized to your interests',
        'Platform-optimized length',
        'Multiple style options',
        'Proven conversion patterns'
      ],
      demoAction: 'Generate Bio',
    },
    {
      id: 'success-prediction',
      title: 'Success Prediction',
      description: 'See your potential match rates before updating your profiles with predictive analytics.',
      icon: '📈',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400',
      benefits: [
        'Predict match rates',
        'Compare photo combinations',
        'Track improvements over time',
        'Data-driven insights'
      ],
      demoAction: 'View Predictions',
    },
    {
      id: 'conversation-starters',
      title: 'Conversation Starters',
      description: 'Get personalized ice breakers that lead to meaningful conversations.',
      icon: '💬',
      image: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=400',
      benefits: [
        'Tailored to each match',
        'High response rates',
        'Natural conversation flow',
        'Constantly updated library'
      ],
      demoAction: 'See Examples',
    },
    {
      id: 'platform-optimization',
      title: 'Platform Optimization',
      description: 'Optimize your profile for specific dating platforms with tailored strategies.',
      icon: '📱',
      image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400',
      benefits: [
        'Tinder, Bumble, Hinge ready',
        'Platform-specific tips',
        'Algorithm insights',
        'Cross-platform analytics'
      ],
      demoAction: 'Choose Platform',
    },
  ];

  // Auto-advance timer
  useEffect(() => {
    if (!isAutoPlaying) return;

    const timer = setInterval(() => {
      setCurrentFeatureIndex((prev) => {
        const next = (prev + 1) % features.length;
        scrollToFeature(next);
        return next;
      });
    }, 4000);

    return () => clearInterval(timer);
  }, [isAutoPlaying, features.length]);

  const scrollToFeature = (index: number) => {
    scrollViewRef.current?.scrollTo({
      x: index * screenWidth,
      animated: true,
    });
  };

  const handleFeaturePress = (index: number) => {
    setIsAutoPlaying(false);
    setCurrentFeatureIndex(index);
    scrollToFeature(index);
  };

  const handleDemoAction = (feature: Feature) => {
    // Here you could show a mini demo or preview
    setIsAutoPlaying(false);
    // For now, just continue to next
    setTimeout(() => {
      if (currentFeatureIndex < features.length - 1) {
        handleFeaturePress(currentFeatureIndex + 1);
      }
    }, 1000);
  };

  const renderFeatureCard = (feature: Feature, index: number) => (
    <View key={feature.id} style={[styles.featureCard, { width: screenWidth }]}>
      <View style={styles.featureContent}>
        {/* Feature Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: feature.image }}
            style={styles.featureImage}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay}>
            <Text style={styles.featureIcon}>{feature.icon}</Text>
          </View>
        </View>

        {/* Feature Info */}
        <View style={styles.featureInfo}>
          <Text style={styles.featureTitle}>{feature.title}</Text>
          <Text style={styles.featureDescription}>{feature.description}</Text>

          {/* Benefits List */}
          <View style={styles.benefitsList}>
            {feature.benefits.map((benefit, benefitIndex) => (
              <View key={benefitIndex} style={styles.benefitItem}>
                <Text style={styles.benefitIcon}>✓</Text>
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>

          {/* Demo Action Button */}
          {feature.demoAction && (
            <TouchableOpacity
              style={styles.demoButton}
              onPress={() => handleDemoAction(feature)}
              activeOpacity={0.7}
            >
              <Text style={styles.demoButtonText}>{feature.demoAction}</Text>
              <Text style={styles.demoButtonIcon}>→</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  const renderFeatureIndicators = () => (
    <View style={styles.indicatorContainer}>
      {features.map((_, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.indicator,
            {
              backgroundColor: index === currentFeatureIndex
                ? COLORS.primary[500]
                : COLORS.neutral[300],
              width: index === currentFeatureIndex ? 24 : 8,
            },
          ]}
          onPress={() => handleFeaturePress(index)}
          activeOpacity={0.7}
        />
      ))}
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Discover Your Dating Success</Text>
      <Text style={styles.headerSubtitle}>
        See what makes our app the #1 choice for dating optimization
      </Text>
    </View>
  );

  const renderControls = () => (
    <View style={styles.controlsContainer}>
      {/* Auto-play toggle */}
      <TouchableOpacity
        style={styles.autoPlayToggle}
        onPress={() => setIsAutoPlaying(!isAutoPlaying)}
        activeOpacity={0.7}
      >
        <Text style={styles.autoPlayIcon}>
          {isAutoPlaying ? '⏸️' : '▶️'}
        </Text>
        <Text style={styles.autoPlayText}>
          {isAutoPlaying ? 'Pause Tour' : 'Play Tour'}
        </Text>
      </TouchableOpacity>

      {/* Progress counter */}
      <Text style={styles.progressCounter}>
        {currentFeatureIndex + 1} of {features.length}
      </Text>
    </View>
  );

  const renderBottomActions = () => (
    <View style={styles.bottomActions}>
      <TertiaryButton
        title="Skip Tour"
        onPress={onSkip}
        variant="ghost"
        size="medium"
        style={styles.skipButton}
      />

      <PrimaryButton
        title={currentFeatureIndex === features.length - 1 ? "Let's Start!" : "Next Feature"}
        onPress={() => {
          if (currentFeatureIndex === features.length - 1) {
            onNext({ completedFeatureTour: true });
          } else {
            handleFeaturePress(currentFeatureIndex + 1);
          }
        }}
        size="large"
        style={styles.nextButton}
        icon={
          <Text style={styles.buttonIcon}>
            {currentFeatureIndex === features.length - 1 ? '🚀' : '→'}
          </Text>
        }
        iconPosition="right"
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      <View style={styles.tourContainer}>
        {renderControls()}
        
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
            setCurrentFeatureIndex(index);
          }}
          onScrollBeginDrag={() => setIsAutoPlaying(false)}
          style={styles.scrollView}
        >
          {features.map(renderFeatureCard)}
        </ScrollView>

        {renderFeatureIndicators()}
      </View>

      {renderBottomActions()}
    </View>
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
    maxWidth: 280,
  },

  tourContainer: {
    flex: 1,
    marginBottom: SPACING.xl,
  },

  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },

  autoPlayToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral[100],
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },

  autoPlayIcon: {
    fontSize: 14,
    marginRight: SPACING.xs,
  },

  autoPlayText: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },

  progressCounter: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },

  scrollView: {
    flex: 1,
  },

  featureCard: {
    paddingHorizontal: SPACING.lg,
  },

  featureContent: {
    flex: 1,
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.medium,
  },

  imageContainer: {
    position: 'relative',
    height: 200,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },

  featureImage: {
    width: '100%',
    height: '100%',
  },

  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(233, 30, 99, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  featureIcon: {
    fontSize: 48,
  },

  featureInfo: {
    flex: 1,
  },

  featureTitle: {
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
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },

  benefitsList: {
    marginBottom: SPACING.lg,
  },

  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },

  benefitIcon: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.semantic.success,
    fontWeight: 'bold',
    marginRight: SPACING.sm,
    width: 16,
  },

  benefitText: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
    flex: 1,
  },

  demoButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary[50],
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary[200],
  },

  demoButtonText: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.primary[700],
    fontWeight: '600',
    marginRight: SPACING.sm,
  },

  demoButtonIcon: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.primary[700],
    fontWeight: 'bold',
  },

  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
  },

  indicator: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    transition: 'all 0.3s ease',
  },

  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.surface.primary,
    ...SHADOWS.light,
  },

  skipButton: {
    flex: 1,
    marginRight: SPACING.md,
  },

  nextButton: {
    flex: 2,
  },

  buttonIcon: {
    fontSize: 16,
  },
});

export default FeatureTourScreen;