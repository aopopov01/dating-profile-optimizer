/**
 * Profile Setup Screen
 * Initial profile creation with guided steps and validation
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, SIZES } from '../../utils/designSystem';
import { PrimaryButton, SecondaryButton } from '../shared/Button';
import Card from '../shared/Card';
import Input from '../shared/Input';

interface ProfileData {
  firstName: string;
  age: string;
  location: string;
  occupation: string;
  interests: string[];
  bio: string;
}

interface ProfileSetupScreenProps {
  onNext: (data?: any) => void;
  onBack: () => void;
  userPreferences?: any;
}

const ProfileSetupScreen: React.FC<ProfileSetupScreenProps> = ({
  onNext,
  onBack,
  userPreferences,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    age: '',
    location: '',
    occupation: '',
    interests: [],
    bio: '',
  });
  const [errors, setErrors] = useState<Partial<ProfileData>>({});

  const scrollViewRef = useRef<ScrollView>(null);

  const steps = [
    'Basic Info',
    'Location & Career',
    'Interests',
    'Bio Preview'
  ];

  const interestOptions = [
    'Travel', 'Photography', 'Fitness', 'Cooking', 'Music', 'Movies',
    'Books', 'Art', 'Dancing', 'Hiking', 'Gaming', 'Yoga',
    'Wine', 'Coffee', 'Sports', 'Fashion', 'Technology', 'Food',
    'Animals', 'Nature', 'Adventure', 'Comedy', 'Learning', 'Volunteer'
  ];

  const validateCurrentStep = (): boolean => {
    const newErrors: Partial<ProfileData> = {};

    switch (currentStep) {
      case 0: // Basic Info
        if (!profileData.firstName.trim()) {
          newErrors.firstName = 'First name is required';
        } else if (profileData.firstName.trim().length < 2) {
          newErrors.firstName = 'Name must be at least 2 characters';
        }

        if (!profileData.age.trim()) {
          newErrors.age = 'Age is required';
        } else {
          const age = parseInt(profileData.age);
          if (isNaN(age) || age < 18 || age > 99) {
            newErrors.age = 'Please enter a valid age (18-99)';
          }
        }
        break;

      case 1: // Location & Career
        if (!profileData.location.trim()) {
          newErrors.location = 'Location is required';
        }
        if (!profileData.occupation.trim()) {
          newErrors.occupation = 'Occupation is required';
        }
        break;

      case 2: // Interests
        if (profileData.interests.length < 3) {
          Alert.alert('Select Interests', 'Please select at least 3 interests to help us create a better profile for you.');
          return false;
        }
        break;

      case 3: // Bio Preview
        // Optional step, no validation needed
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      // Complete profile setup
      onNext({
        profileData,
        setupCompleted: true,
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      onBack();
    }
  };

  const updateProfileData = (field: keyof ProfileData, value: string | string[]) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const toggleInterest = (interest: string) => {
    const currentInterests = profileData.interests;
    if (currentInterests.includes(interest)) {
      updateProfileData('interests', currentInterests.filter(i => i !== interest));
    } else if (currentInterests.length < 8) {
      updateProfileData('interests', [...currentInterests, interest]);
    } else {
      Alert.alert('Maximum Interests', 'You can select up to 8 interests.');
    }
  };

  const generateBasicBio = () => {
    const { firstName, age, occupation, location, interests } = profileData;
    const interestString = interests.slice(0, 3).join(', ');
    
    const bioTemplates = [
      `${firstName}, ${age} • ${occupation} in ${location}\n\nPassionate about ${interestString}. Looking for meaningful connections and great conversations!`,
      `${age}-year-old ${occupation} from ${location}.\n\nWhen I'm not working, you'll find me enjoying ${interestString}. Let's explore life together!`,
      `Hi! I'm ${firstName} 👋\n\n${occupation} by day, ${interests[0]} enthusiast by night. Based in ${location} and always up for new adventures!`,
    ];
    
    const selectedBio = bioTemplates[Math.floor(Math.random() * bioTemplates.length)];
    updateProfileData('bio', selectedBio);
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
        Step {currentStep + 1} of {steps.length}: {steps[currentStep]}
      </Text>
    </View>
  );

  const renderBasicInfoStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Tell us about yourself</Text>
      <Text style={styles.stepSubtitle}>
        We'll use this information to create your optimized dating profile
      </Text>

      <Input
        label="First Name"
        placeholder="Enter your first name"
        value={profileData.firstName}
        onChangeText={(text) => updateProfileData('firstName', text)}
        error={errors.firstName}
        maxLength={50}
        autoCapitalize="words"
        autoCorrect={false}
        style={styles.input}
      />

      <Input
        label="Age"
        placeholder="Enter your age"
        value={profileData.age}
        onChangeText={(text) => updateProfileData('age', text)}
        error={errors.age}
        keyboardType="numeric"
        maxLength={2}
        style={styles.input}
      />

      <View style={styles.tipContainer}>
        <Text style={styles.tipIcon}>💡</Text>
        <Text style={styles.tipText}>
          Using your real first name and age helps create authentic connections
        </Text>
      </View>
    </View>
  );

  const renderLocationCareerStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Where are you from?</Text>
      <Text style={styles.stepSubtitle}>
        Help potential matches find you and understand your lifestyle
      </Text>

      <Input
        label="Location"
        placeholder="City, State"
        value={profileData.location}
        onChangeText={(text) => updateProfileData('location', text)}
        error={errors.location}
        autoCapitalize="words"
        style={styles.input}
      />

      <Input
        label="Occupation"
        placeholder="What do you do for work?"
        value={profileData.occupation}
        onChangeText={(text) => updateProfileData('occupation', text)}
        error={errors.occupation}
        autoCapitalize="words"
        style={styles.input}
      />

      <View style={styles.tipContainer}>
        <Text style={styles.tipIcon}>🎯</Text>
        <Text style={styles.tipText}>
          Be specific but keep it positive. "Marketing Manager" works better than "Unemployed"
        </Text>
      </View>
    </View>
  );

  const renderInterestsStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What do you enjoy?</Text>
      <Text style={styles.stepSubtitle}>
        Select 3-8 interests that best represent you ({profileData.interests.length}/8)
      </Text>

      <View style={styles.interestsContainer}>
        {interestOptions.map((interest) => {
          const isSelected = profileData.interests.includes(interest);
          return (
            <TouchableOpacity
              key={interest}
              style={[
                styles.interestChip,
                isSelected && styles.interestChipSelected,
              ]}
              onPress={() => toggleInterest(interest)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.interestText,
                  isSelected && styles.interestTextSelected,
                ]}
              >
                {interest}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.tipContainer}>
        <Text style={styles.tipIcon}>✨</Text>
        <Text style={styles.tipText}>
          Choose interests that you genuinely enjoy - they'll be great conversation starters!
        </Text>
      </View>
    </View>
  );

  const renderBioPreviewStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Bio Preview</Text>
      <Text style={styles.stepSubtitle}>
        We've created a basic bio for you. You can customize it later!
      </Text>

      <Card style={styles.bioPreviewCard}>
        <Text style={styles.bioPreviewTitle}>Your Generated Bio:</Text>
        <TextInput
          style={styles.bioInput}
          multiline
          numberOfLines={6}
          value={profileData.bio}
          onChangeText={(text) => updateProfileData('bio', text)}
          placeholder="Your bio will appear here..."
          placeholderTextColor={COLORS.text.tertiary}
          maxLength={500}
        />
        <Text style={styles.bioCounter}>
          {profileData.bio.length}/500 characters
        </Text>
      </Card>

      {!profileData.bio && (
        <SecondaryButton
          title="Generate Bio for Me"
          onPress={generateBasicBio}
          style={styles.generateBioButton}
          icon={<Text style={styles.buttonIcon}>✨</Text>}
          iconPosition="left"
        />
      )}

      <View style={styles.tipContainer}>
        <Text style={styles.tipIcon}>📝</Text>
        <Text style={styles.tipText}>
          Don't worry - you can always edit your bio later. Our AI will help you optimize it!
        </Text>
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return renderBasicInfoStep();
      case 1:
        return renderLocationCareerStep();
      case 2:
        return renderInterestsStep();
      case 3:
        return renderBioPreviewStep();
      default:
        return renderBasicInfoStep();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      {renderProgressBar()}

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderCurrentStep()}
      </ScrollView>

      <View style={styles.bottomActions}>
        <SecondaryButton
          title="Back"
          onPress={handleBack}
          size="medium"
          style={styles.backButton}
        />

        <PrimaryButton
          title={currentStep === steps.length - 1 ? "Complete Setup" : "Continue"}
          onPress={handleNext}
          size="large"
          style={styles.continueButton}
          icon={
            <Text style={styles.buttonIcon}>
              {currentStep === steps.length - 1 ? '🎉' : '→'}
            </Text>
          }
          iconPosition="right"
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },

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
    fontWeight: '600',
  },

  scrollView: {
    flex: 1,
  },

  contentContainer: {
    paddingBottom: SPACING.xxxl,
  },

  stepContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },

  stepTitle: {
    ...TYPOGRAPHY.headline.small,
    color: COLORS.text.primary,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },

  stepSubtitle: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    maxWidth: 280,
    alignSelf: 'center',
  },

  input: {
    marginBottom: SPACING.lg,
  },

  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },

  interestChip: {
    backgroundColor: COLORS.neutral[100],
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.sm,
    minWidth: '30%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },

  interestChipSelected: {
    backgroundColor: COLORS.primary[100],
    borderColor: COLORS.primary[500],
  },

  interestText: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.secondary,
    fontWeight: '500',
    textAlign: 'center',
  },

  interestTextSelected: {
    color: COLORS.primary[700],
    fontWeight: '600',
  },

  bioPreviewCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },

  bioPreviewTitle: {
    ...TYPOGRAPHY.title.medium,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },

  bioInput: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
    backgroundColor: COLORS.background.secondary,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: COLORS.neutral[300],
  },

  bioCounter: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },

  generateBioButton: {
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },

  tipContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.secondary[50],
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.secondary[200],
    marginTop: SPACING.lg,
  },

  tipIcon: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },

  tipText: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.secondary,
    flex: 1,
    lineHeight: 18,
  },

  bottomActions: {
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

export default ProfileSetupScreen;