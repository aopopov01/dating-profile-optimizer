/**
 * Onboarding Context
 * Manages onboarding state, progress tracking, and user preferences
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
  dependencies?: string[];
}

export interface UserPreferences {
  relationshipType: 'serious' | 'casual' | 'friends' | 'open';
  platforms: string[];
  experience: 'beginner' | 'intermediate' | 'experienced';
  priorities: string[];
  ageRange: [number, number];
  notifications: {
    push: boolean;
    email: boolean;
    marketing: boolean;
  };
  accessibility: {
    highContrast: boolean;
    largeText: boolean;
    voiceGuidance: boolean;
    reducedMotion: boolean;
  };
}

export interface OnboardingState {
  isFirstLaunch: boolean;
  currentStep: string;
  completedSteps: string[];
  skipOnboarding: boolean;
  userPreferences: Partial<UserPreferences>;
  permissions: {
    camera: 'granted' | 'denied' | 'pending';
    storage: 'granted' | 'denied' | 'pending';
    notifications: 'granted' | 'denied' | 'pending';
  };
  tutorial: {
    enabled: boolean;
    currentFeature: string | null;
    completedTutorials: string[];
  };
}

interface OnboardingContextType {
  state: OnboardingState;
  steps: OnboardingStep[];
  
  // Navigation methods
  goToStep: (stepId: string) => void;
  nextStep: () => void;
  previousStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
  
  // Step management
  completeStep: (stepId: string) => void;
  updateStepData: (stepId: string, data: any) => void;
  canProceedToStep: (stepId: string) => boolean;
  
  // Preferences
  updateUserPreferences: (preferences: Partial<UserPreferences>) => void;
  updatePermissionStatus: (permission: keyof OnboardingState['permissions'], status: 'granted' | 'denied' | 'pending') => void;
  
  // Tutorial system
  startTutorial: (featureId: string) => void;
  completeTutorial: (tutorialId: string) => void;
  enableTutorialMode: () => void;
  disableTutorialMode: () => void;
  
  // Persistence
  saveProgress: () => Promise<void>;
  loadProgress: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

const defaultState: OnboardingState = {
  isFirstLaunch: true,
  currentStep: 'welcome',
  completedSteps: [],
  skipOnboarding: false,
  userPreferences: {
    ageRange: [25, 35],
    platforms: [],
    priorities: [],
    notifications: {
      push: true,
      email: true,
      marketing: false,
    },
    accessibility: {
      highContrast: false,
      largeText: false,
      voiceGuidance: false,
      reducedMotion: false,
    },
  },
  permissions: {
    camera: 'pending',
    storage: 'pending',
    notifications: 'pending',
  },
  tutorial: {
    enabled: false,
    currentFeature: null,
    completedTutorials: [],
  },
};

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome',
    description: 'Welcome to Dating Profile Optimizer',
    completed: false,
    required: true,
  },
  {
    id: 'features',
    title: 'Feature Tour',
    description: 'Discover what makes our app special',
    completed: false,
    required: true,
    dependencies: ['welcome'],
  },
  {
    id: 'permissions',
    title: 'Permissions',
    description: 'Grant necessary permissions',
    completed: false,
    required: true,
    dependencies: ['features'],
  },
  {
    id: 'goals',
    title: 'Your Goals',
    description: 'Tell us what you\'re looking for',
    completed: false,
    required: true,
    dependencies: ['permissions'],
  },
  {
    id: 'profile-setup',
    title: 'Profile Setup',
    description: 'Set up your basic profile',
    completed: false,
    required: true,
    dependencies: ['goals'],
  },
  {
    id: 'tutorial-intro',
    title: 'Quick Tutorial',
    description: 'Learn how to use key features',
    completed: false,
    required: false,
    dependencies: ['profile-setup'],
  },
  {
    id: 'complete',
    title: 'Complete',
    description: 'You\'re all set!',
    completed: false,
    required: true,
    dependencies: ['profile-setup'],
  },
];

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<OnboardingState>(defaultState);
  const [steps] = useState<OnboardingStep[]>(onboardingSteps);

  // Initialize onboarding state
  useEffect(() => {
    loadProgress();
  }, []);

  const goToStep = useCallback((stepId: string) => {
    if (canProceedToStep(stepId)) {
      setState(prev => ({ ...prev, currentStep: stepId }));
      saveProgress();
    }
  }, []);

  const nextStep = useCallback(() => {
    const currentIndex = steps.findIndex(step => step.id === state.currentStep);
    if (currentIndex < steps.length - 1) {
      const nextStepId = steps[currentIndex + 1].id;
      goToStep(nextStepId);
    }
  }, [state.currentStep, steps, goToStep]);

  const previousStep = useCallback(() => {
    const currentIndex = steps.findIndex(step => step.id === state.currentStep);
    if (currentIndex > 0) {
      const previousStepId = steps[currentIndex - 1].id;
      goToStep(previousStepId);
    }
  }, [state.currentStep, steps, goToStep]);

  const skipOnboarding = useCallback(() => {
    setState(prev => ({
      ...prev,
      skipOnboarding: true,
      currentStep: 'complete',
      completedSteps: steps.map(step => step.id),
    }));
    saveProgress();
  }, [steps]);

  const completeOnboarding = useCallback(() => {
    setState(prev => ({
      ...prev,
      isFirstLaunch: false,
      currentStep: 'complete',
      completedSteps: steps.map(step => step.id),
    }));
    saveProgress();
  }, [steps]);

  const completeStep = useCallback((stepId: string) => {
    setState(prev => ({
      ...prev,
      completedSteps: [...new Set([...prev.completedSteps, stepId])],
    }));
    saveProgress();
  }, []);

  const updateStepData = useCallback((stepId: string, data: any) => {
    // Update step-specific data
    setState(prev => ({
      ...prev,
      userPreferences: { ...prev.userPreferences, ...data },
    }));
    saveProgress();
  }, []);

  const canProceedToStep = useCallback((stepId: string) => {
    const step = steps.find(s => s.id === stepId);
    if (!step || !step.dependencies) return true;
    
    return step.dependencies.every(depId => 
      state.completedSteps.includes(depId)
    );
  }, [steps, state.completedSteps]);

  const updateUserPreferences = useCallback((preferences: Partial<UserPreferences>) => {
    setState(prev => ({
      ...prev,
      userPreferences: { ...prev.userPreferences, ...preferences },
    }));
    saveProgress();
  }, []);

  const updatePermissionStatus = useCallback((
    permission: keyof OnboardingState['permissions'],
    status: 'granted' | 'denied' | 'pending'
  ) => {
    setState(prev => ({
      ...prev,
      permissions: { ...prev.permissions, [permission]: status },
    }));
    saveProgress();
  }, []);

  const startTutorial = useCallback((featureId: string) => {
    setState(prev => ({
      ...prev,
      tutorial: {
        ...prev.tutorial,
        enabled: true,
        currentFeature: featureId,
      },
    }));
  }, []);

  const completeTutorial = useCallback((tutorialId: string) => {
    setState(prev => ({
      ...prev,
      tutorial: {
        ...prev.tutorial,
        completedTutorials: [...new Set([...prev.tutorial.completedTutorials, tutorialId])],
        currentFeature: null,
      },
    }));
    saveProgress();
  }, []);

  const enableTutorialMode = useCallback(() => {
    setState(prev => ({
      ...prev,
      tutorial: { ...prev.tutorial, enabled: true },
    }));
  }, []);

  const disableTutorialMode = useCallback(() => {
    setState(prev => ({
      ...prev,
      tutorial: { ...prev.tutorial, enabled: false, currentFeature: null },
    }));
  }, []);

  const saveProgress = useCallback(async () => {
    try {
      await AsyncStorage.setItem('onboarding_state', JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save onboarding progress:', error);
    }
  }, [state]);

  const loadProgress = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('onboarding_state');
      if (stored) {
        const loadedState = JSON.parse(stored);
        setState(prev => ({ ...prev, ...loadedState }));
      }
    } catch (error) {
      console.error('Failed to load onboarding progress:', error);
    }
  }, []);

  const resetOnboarding = useCallback(async () => {
    setState(defaultState);
    try {
      await AsyncStorage.removeItem('onboarding_state');
    } catch (error) {
      console.error('Failed to reset onboarding:', error);
    }
  }, []);

  const contextValue: OnboardingContextType = {
    state,
    steps,
    goToStep,
    nextStep,
    previousStep,
    skipOnboarding,
    completeOnboarding,
    completeStep,
    updateStepData,
    canProceedToStep,
    updateUserPreferences,
    updatePermissionStatus,
    startTutorial,
    completeTutorial,
    enableTutorialMode,
    disableTutorialMode,
    saveProgress,
    loadProgress,
    resetOnboarding,
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  );
};

export default OnboardingProvider;