/**
 * Onboarding Navigator
 * Handles the complete onboarding flow with smooth transitions and progress tracking
 */

import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  BackHandler,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { COLORS, SPACING, SHADOWS } from '../../utils/designSystem';

// Import onboarding screens
import WelcomeScreen from './WelcomeScreen';
import FeatureTourScreen from './FeatureTourScreen';
import PermissionsScreen from './PermissionsScreen';
import GoalSettingScreen from './GoalSettingScreen';
import ProfileSetupScreen from './ProfileSetupScreen';
import TutorialIntroScreen from './TutorialIntroScreen';
import OnboardingCompleteScreen from './OnboardingCompleteScreen';

// Import shared components
import OnboardingProgress from './shared/OnboardingProgress';
import SkipOnboardingModal from './shared/SkipOnboardingModal';

const { width: screenWidth } = Dimensions.get('window');

interface OnboardingNavigatorProps {
  onComplete: () => void;
}

const OnboardingNavigator: React.FC<OnboardingNavigatorProps> = ({ onComplete }) => {
  const {
    state,
    nextStep,
    previousStep,
    skipOnboarding,
    completeOnboarding,
    completeStep,
    updateStepData,
  } = useOnboarding();

  const [slideAnim] = React.useState(new Animated.Value(0));
  const [fadeAnim] = React.useState(new Animated.Value(1));
  const [showSkipModal, setShowSkipModal] = React.useState(false);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, [state.currentStep]);

  // Animate step transitions
  useEffect(() => {
    animateStepTransition();
  }, [state.currentStep]);

  const handleBackPress = (): boolean => {
    if (state.currentStep === 'welcome') {
      Alert.alert(
        'Exit Onboarding',
        'Are you sure you want to exit? You can always complete this later.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Exit', style: 'destructive', onPress: () => setShowSkipModal(true) },
        ]
      );
      return true;
    } else {
      previousStep();
      return true;
    }
  };

  const animateStepTransition = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -20,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
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
    });
  };

  const handleStepComplete = (stepId: string, data?: any) => {
    completeStep(stepId);
    if (data) {
      updateStepData(stepId, data);
    }
    
    if (stepId === 'complete') {
      completeOnboarding();
      onComplete();
    } else {
      nextStep();
    }
  };

  const handleSkipConfirm = () => {
    skipOnboarding();
    setShowSkipModal(false);
    onComplete();
  };

  const renderCurrentScreen = () => {
    const screenProps = {
      onNext: (data?: any) => handleStepComplete(state.currentStep, data),
      onBack: previousStep,
      onSkip: () => setShowSkipModal(true),
      userPreferences: state.userPreferences,
    };

    switch (state.currentStep) {
      case 'welcome':
        return (
          <WelcomeScreen
            onGetStarted={() => handleStepComplete('welcome')}
            onSkipOnboarding={() => setShowSkipModal(true)}
          />
        );

      case 'features':
        return (
          <FeatureTourScreen
            {...screenProps}
          />
        );

      case 'permissions':
        return (
          <PermissionsScreen
            {...screenProps}
            permissions={state.permissions}
          />
        );

      case 'goals':
        return (
          <GoalSettingScreen
            onGoalSelected={(goals) => handleStepComplete('goals', goals)}
            onBack={previousStep}
          />
        );

      case 'profile-setup':
        return (
          <ProfileSetupScreen
            {...screenProps}
          />
        );

      case 'tutorial-intro':
        return (
          <TutorialIntroScreen
            {...screenProps}
          />
        );

      case 'complete':
        return (
          <OnboardingCompleteScreen
            onContinue={() => {
              completeOnboarding();
              onComplete();
            }}
            userPreferences={state.userPreferences}
          />
        );

      default:
        return (
          <WelcomeScreen
            onGetStarted={() => handleStepComplete('welcome')}
            onSkipOnboarding={() => setShowSkipModal(true)}
          />
        );
    }
  };

  const shouldShowProgress = !['welcome', 'complete'].includes(state.currentStep);

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.primary[700]}
        translucent={false}
      />
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {shouldShowProgress && (
          <OnboardingProgress
            currentStep={state.currentStep}
            completedSteps={state.completedSteps}
            onStepPress={(stepId) => {
              // Allow going back to completed steps
              if (state.completedSteps.includes(stepId)) {
                // goToStep(stepId); // Uncomment if you want to allow jumping to completed steps
              }
            }}
          />
        )}

        <Animated.View
          style={[
            styles.screenContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {renderCurrentScreen()}
        </Animated.View>

        {/* Skip Onboarding Modal */}
        <SkipOnboardingModal
          visible={showSkipModal}
          onConfirm={handleSkipConfirm}
          onCancel={() => setShowSkipModal(false)}
        />
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },

  screenContainer: {
    flex: 1,
  },
});

export default OnboardingNavigator;