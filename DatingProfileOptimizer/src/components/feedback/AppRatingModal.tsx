/**
 * App Rating Modal
 * Smart rating prompt with contextual messaging
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  TextInput,
  Linking,
  Platform,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../utils/designSystem';
import { PrimaryButton, SecondaryButton } from '../shared/Button';
import { useFeedback } from '../../contexts/FeedbackContext';

interface AppRatingModalProps {
  visible: boolean;
  context: string;
  onClose: () => void;
  onComplete?: (rating: number) => void;
}

const AppRatingModal: React.FC<AppRatingModalProps> = ({
  visible,
  context,
  onClose,
  onComplete,
}) => {
  const { submitAppRating } = useFeedback();
  const [step, setStep] = useState<'rating' | 'feedback' | 'store' | 'thanks'>('rating');
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      setStep('rating');
      setRating(0);
      setHoveredStar(0);
      setFeedback('');
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
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
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible]);

  const handleStarPress = (star: number) => {
    setRating(star);
    
    // Automatically move to next step after short delay
    setTimeout(() => {
      if (star >= 4) {
        setStep('store');
      } else {
        setStep('feedback');
      }
    }, 500);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      await submitAppRating(rating, feedback, context);
      
      if (rating >= 4) {
        setStep('store');
      } else {
        setStep('thanks');
      }
      
      onComplete?.(rating);
    } catch (error) {
      console.error('Failed to submit rating:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAppStore = () => {
    const appStoreUrl = Platform.OS === 'ios' 
      ? 'https://apps.apple.com/app/dating-profile-optimizer/id123456789'
      : 'https://play.google.com/store/apps/details?id=com.datingprofileoptimizer';
    
    Linking.openURL(appStoreUrl);
    setStep('thanks');
  };

  const getContextualMessage = () => {
    switch (context) {
      case 'photo_analysis_complete':
        return "How was your photo analysis experience?";
      case 'profile_optimized':
        return "How do you feel about your optimized profile?";
      case 'successful_match':
        return "Great news about your match! How's the app working for you?";
      case 'feature_used_frequently':
        return "You've been actively using the app! How would you rate your experience?";
      default:
        return "How would you rate your experience with Dating Profile Optimizer?";
    }
  };

  const renderStars = () => (
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          style={styles.starButton}
          onPress={() => handleStarPress(star)}
          onPressIn={() => setHoveredStar(star)}
          onPressOut={() => setHoveredStar(0)}
        >
          <Text
            style={[
              styles.star,
              {
                color: star <= (hoveredStar || rating) 
                  ? COLORS.secondary[500] 
                  : COLORS.neutral[300],
              },
            ]}
          >
            ⭐
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderRatingStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepIcon}>⭐</Text>
      <Text style={styles.stepTitle}>Rate Your Experience</Text>
      <Text style={styles.stepDescription}>
        {getContextualMessage()}
      </Text>
      
      {renderStars()}
      
      <View style={styles.ratingLabels}>
        <Text style={styles.ratingLabel}>Poor</Text>
        <Text style={styles.ratingLabel}>Excellent</Text>
      </View>
    </View>
  );

  const renderFeedbackStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepIcon}>💬</Text>
      <Text style={styles.stepTitle}>Help Us Improve</Text>
      <Text style={styles.stepDescription}>
        We'd love to know how we can make your experience better.
      </Text>
      
      <View style={styles.selectedRating}>
        <Text style={styles.selectedRatingText}>Your Rating:</Text>
        <View style={styles.selectedStars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Text
              key={star}
              style={[
                styles.selectedStar,
                { color: star <= rating ? COLORS.secondary[500] : COLORS.neutral[300] },
              ]}
            >
              ⭐
            </Text>
          ))}
        </View>
      </View>
      
      <TextInput
        style={styles.feedbackInput}
        placeholder="Tell us what went wrong or how we can improve..."
        placeholderTextColor={COLORS.text.tertiary}
        multiline
        numberOfLines={4}
        value={feedback}
        onChangeText={setFeedback}
        textAlignVertical="top"
      />
      
      <View style={styles.feedbackActions}>
        <SecondaryButton
          title="Skip"
          onPress={() => setStep('thanks')}
          size="medium"
          style={styles.skipButton}
        />
        
        <PrimaryButton
          title="Submit Feedback"
          onPress={handleSubmit}
          loading={isSubmitting}
          size="medium"
          style={styles.submitButton}
        />
      </View>
    </View>
  );

  const renderStoreStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepIcon}>🎉</Text>
      <Text style={styles.stepTitle}>Thanks for the Great Rating!</Text>
      <Text style={styles.stepDescription}>
        Would you mind sharing your experience with others by rating us on the {Platform.OS === 'ios' ? 'App Store' : 'Play Store'}?
      </Text>
      
      <View style={styles.selectedRating}>
        <View style={styles.selectedStars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Text
              key={star}
              style={[
                styles.selectedStar,
                { color: star <= rating ? COLORS.secondary[500] : COLORS.neutral[300] },
              ]}
            >
              ⭐
            </Text>
          ))}
        </View>
      </View>
      
      <View style={styles.storeActions}>
        <SecondaryButton
          title="Maybe Later"
          onPress={() => setStep('thanks')}
          size="medium"
          style={styles.laterButton}
        />
        
        <PrimaryButton
          title={`Rate on ${Platform.OS === 'ios' ? 'App Store' : 'Play Store'}`}
          onPress={openAppStore}
          size="medium"
          style={styles.storeButton}
          icon={<Text style={styles.buttonIcon}>⭐</Text>}
          iconPosition="left"
        />
      </View>
    </View>
  );

  const renderThanksStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepIcon}>🙏</Text>
      <Text style={styles.stepTitle}>Thank You!</Text>
      <Text style={styles.stepDescription}>
        {rating >= 4 
          ? "Your feedback helps us continue improving the app for everyone!"
          : "Thanks for your feedback! We'll use it to make the app even better."
        }
      </Text>
      
      <PrimaryButton
        title="Close"
        onPress={onClose}
        size="large"
        style={styles.closeButton}
      />
    </View>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 'rating':
        return renderRatingStep();
      case 'feedback':
        return renderFeedbackStep();
      case 'store':
        return renderStoreStep();
      case 'thanks':
        return renderThanksStep();
      default:
        return renderRatingStep();
    }
  };

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
            styles.modalContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.modalContent}>
            {renderCurrentStep()}
          </View>
          
          {step === 'rating' && (
            <TouchableOpacity style={styles.dismissButton} onPress={onClose}>
              <Text style={styles.dismissButtonText}>Not now</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },

  modalContainer: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: COLORS.surface.modal,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.intense,
  },

  modalContent: {
    padding: SPACING.xl,
  },

  stepContainer: {
    alignItems: 'center',
    minHeight: 300,
  },

  stepIcon: {
    fontSize: 48,
    marginBottom: SPACING.lg,
  },

  stepTitle: {
    ...TYPOGRAPHY.title.large,
    color: COLORS.text.primary,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },

  stepDescription: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },

  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },

  starButton: {
    padding: SPACING.sm,
    marginHorizontal: SPACING.xs,
  },

  star: {
    fontSize: 32,
  },

  ratingLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: SPACING.md,
  },

  ratingLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },

  selectedRating: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },

  selectedRatingText: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },

  selectedStars: {
    flexDirection: 'row',
  },

  selectedStar: {
    fontSize: 20,
    marginHorizontal: 2,
  },

  feedbackInput: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
    backgroundColor: COLORS.background.secondary,
    borderWidth: 1,
    borderColor: COLORS.neutral[300],
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    minHeight: 100,
    width: '100%',
    marginBottom: SPACING.lg,
  },

  feedbackActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },

  skipButton: {
    flex: 1,
    marginRight: SPACING.sm,
  },

  submitButton: {
    flex: 1,
    marginLeft: SPACING.sm,
  },

  storeActions: {
    width: '100%',
    marginTop: SPACING.lg,
  },

  laterButton: {
    marginBottom: SPACING.md,
  },

  storeButton: {
    marginBottom: SPACING.sm,
  },

  closeButton: {
    marginTop: SPACING.lg,
    minWidth: 120,
  },

  buttonIcon: {
    fontSize: 16,
  },

  dismissButton: {
    alignSelf: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },

  dismissButtonText: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.inverse,
    textAlign: 'center',
  },
});

export default AppRatingModal;