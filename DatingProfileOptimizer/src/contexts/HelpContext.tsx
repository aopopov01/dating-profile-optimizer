/**
 * Help Context
 * Manages in-app help system, tutorials, and contextual assistance
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface HelpTopic {
  id: string;
  title: string;
  description: string;
  category: string;
  content: string;
  videoUrl?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  tags: string[];
  relatedTopics: string[];
  lastUpdated: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  votes: number;
  tags: string[];
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  steps: TutorialStep[];
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  prerequisites: string[];
  completed: boolean;
}

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  type: 'instruction' | 'action' | 'highlight' | 'modal';
  targetElement?: string;
  content: string;
  videoUrl?: string;
  completed: boolean;
}

export interface ContextualHelp {
  screenId: string;
  elementId: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  priority: 'low' | 'medium' | 'high';
  showOnce?: boolean;
  shown: boolean;
}

interface HelpState {
  isHelpMode: boolean;
  currentTutorial: string | null;
  currentStep: number;
  completedTutorials: string[];
  shownTooltips: string[];
  helpHistory: string[];
  searchHistory: string[];
  preferences: {
    showTooltips: boolean;
    autoPlayVideos: boolean;
    tutorialSpeed: 'slow' | 'normal' | 'fast';
    helpLanguage: string;
  };
}

interface HelpContextType {
  state: HelpState;
  
  // Tutorial management
  startTutorial: (tutorialId: string) => Promise<void>;
  pauseTutorial: () => void;
  resumeTutorial: () => void;
  completeTutorial: (tutorialId: string) => Promise<void>;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (stepIndex: number) => void;
  
  // Help mode
  enableHelpMode: () => void;
  disableHelpMode: () => void;
  toggleHelpMode: () => void;
  
  // Contextual help
  showTooltip: (elementId: string, force?: boolean) => boolean;
  hideTooltip: (elementId: string) => void;
  markTooltipShown: (elementId: string) => void;
  
  // Search and navigation
  searchHelp: (query: string) => Promise<HelpTopic[]>;
  getHelpTopic: (topicId: string) => HelpTopic | undefined;
  getFAQs: (category?: string) => FAQ[];
  getTutorials: (category?: string) => Tutorial[];
  
  // User interactions
  rateHelpful: (itemId: string, helpful: boolean) => Promise<void>;
  reportIssue: (issue: string) => Promise<void>;
  requestHelp: (context: string) => Promise<void>;
  
  // Preferences
  updatePreferences: (preferences: Partial<HelpState['preferences']>) => void;
  
  // Data management
  loadHelpData: () => Promise<void>;
  saveHelpState: () => Promise<void>;
  resetHelp: () => Promise<void>;
}

const defaultState: HelpState = {
  isHelpMode: false,
  currentTutorial: null,
  currentStep: 0,
  completedTutorials: [],
  shownTooltips: [],
  helpHistory: [],
  searchHistory: [],
  preferences: {
    showTooltips: true,
    autoPlayVideos: false,
    tutorialSpeed: 'normal',
    helpLanguage: 'en',
  },
};

// Sample help data - in production, this would come from an API
const helpTopics: HelpTopic[] = [
  {
    id: 'photo-analysis-basics',
    title: 'Understanding Photo Analysis',
    description: 'Learn how AI analyzes your photos and provides scores',
    category: 'photos',
    content: 'Our AI analyzes multiple factors including lighting, composition, facial expression, and background to give you a comprehensive score...',
    videoUrl: 'https://example.com/video1',
    difficulty: 'beginner',
    estimatedTime: '3 minutes',
    tags: ['photos', 'AI', 'analysis', 'scoring'],
    relatedTopics: ['photo-tips', 'lighting-guide'],
    lastUpdated: '2024-01-15',
  },
  {
    id: 'bio-writing-tips',
    title: 'Writing Compelling Bios',
    description: 'Master the art of writing bios that attract matches',
    category: 'profile',
    content: 'A great bio tells a story, shows personality, and creates intrigue. Here are the key elements...',
    difficulty: 'intermediate',
    estimatedTime: '5 minutes',
    tags: ['bio', 'writing', 'profile', 'personality'],
    relatedTopics: ['conversation-starters', 'profile-optimization'],
    lastUpdated: '2024-01-20',
  },
];

const faqs: FAQ[] = [
  {
    id: 'why-photo-score-low',
    question: 'Why is my photo score low?',
    answer: 'Photo scores depend on factors like lighting, composition, facial visibility, and background. Check our photo tips guide for specific improvement suggestions.',
    category: 'photos',
    votes: 45,
    tags: ['photos', 'scoring', 'improvement'],
  },
  {
    id: 'bio-length-optimal',
    question: 'How long should my bio be?',
    answer: 'The optimal bio length varies by platform: Tinder allows up to 500 characters, Bumble and Hinge prefer 200-300 characters. Our AI will suggest the right length for your chosen platform.',
    category: 'profile',
    votes: 32,
    tags: ['bio', 'length', 'platforms'],
  },
];

const tutorials: Tutorial[] = [
  {
    id: 'first-photo-analysis',
    title: 'Your First Photo Analysis',
    description: 'Learn how to upload and analyze your first photo',
    category: 'photos',
    difficulty: 'beginner',
    estimatedTime: '2 minutes',
    prerequisites: [],
    completed: false,
    steps: [
      {
        id: 'upload-step',
        title: 'Upload a Photo',
        description: 'Tap the upload button to select a photo from your gallery',
        type: 'action',
        targetElement: 'upload-button',
        content: 'Choose a clear, well-lit photo of yourself for the best analysis results.',
        completed: false,
      },
      {
        id: 'review-results',
        title: 'Review Results',
        description: 'Understand your photo analysis results',
        type: 'instruction',
        content: 'The AI will provide a score and detailed feedback on various aspects of your photo.',
        completed: false,
      },
    ],
  },
];

const HelpContext = createContext<HelpContextType | undefined>(undefined);

export const useHelp = () => {
  const context = useContext(HelpContext);
  if (!context) {
    throw new Error('useHelp must be used within a HelpProvider');
  }
  return context;
};

export const HelpProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<HelpState>(defaultState);

  const startTutorial = useCallback(async (tutorialId: string) => {
    const tutorial = tutorials.find(t => t.id === tutorialId);
    if (!tutorial) return;

    setState(prev => ({
      ...prev,
      currentTutorial: tutorialId,
      currentStep: 0,
      isHelpMode: true,
    }));

    await saveHelpState();
  }, []);

  const pauseTutorial = useCallback(() => {
    setState(prev => ({ ...prev, isHelpMode: false }));
  }, []);

  const resumeTutorial = useCallback(() => {
    setState(prev => ({ ...prev, isHelpMode: true }));
  }, []);

  const completeTutorial = useCallback(async (tutorialId: string) => {
    setState(prev => ({
      ...prev,
      completedTutorials: [...new Set([...prev.completedTutorials, tutorialId])],
      currentTutorial: null,
      currentStep: 0,
      isHelpMode: false,
    }));

    await saveHelpState();
  }, []);

  const nextStep = useCallback(() => {
    setState(prev => {
      if (!prev.currentTutorial) return prev;
      
      const tutorial = tutorials.find(t => t.id === prev.currentTutorial);
      if (!tutorial) return prev;
      
      const nextStepIndex = prev.currentStep + 1;
      if (nextStepIndex >= tutorial.steps.length) {
        // Tutorial completed
        completeTutorial(prev.currentTutorial);
        return prev;
      }
      
      return { ...prev, currentStep: nextStepIndex };
    });
  }, [completeTutorial]);

  const previousStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(0, prev.currentStep - 1),
    }));
  }, []);

  const goToStep = useCallback((stepIndex: number) => {
    setState(prev => ({ ...prev, currentStep: stepIndex }));
  }, []);

  const enableHelpMode = useCallback(() => {
    setState(prev => ({ ...prev, isHelpMode: true }));
  }, []);

  const disableHelpMode = useCallback(() => {
    setState(prev => ({ ...prev, isHelpMode: false }));
  }, []);

  const toggleHelpMode = useCallback(() => {
    setState(prev => ({ ...prev, isHelpMode: !prev.isHelpMode }));
  }, []);

  const showTooltip = useCallback((elementId: string, force: boolean = false): boolean => {
    if (!state.preferences.showTooltips && !force) return false;
    if (state.shownTooltips.includes(elementId) && !force) return false;
    
    return true;
  }, [state.preferences.showTooltips, state.shownTooltips]);

  const hideTooltip = useCallback((elementId: string) => {
    // Implementation would hide the tooltip UI
  }, []);

  const markTooltipShown = useCallback((elementId: string) => {
    setState(prev => ({
      ...prev,
      shownTooltips: [...new Set([...prev.shownTooltips, elementId])],
    }));
    saveHelpState();
  }, []);

  const searchHelp = useCallback(async (query: string): Promise<HelpTopic[]> => {
    const lowercaseQuery = query.toLowerCase();
    
    // Add to search history
    setState(prev => ({
      ...prev,
      searchHistory: [query, ...prev.searchHistory.filter(h => h !== query)].slice(0, 10),
    }));

    // Simple search implementation - in production, use proper search
    return helpTopics.filter(topic =>
      topic.title.toLowerCase().includes(lowercaseQuery) ||
      topic.description.toLowerCase().includes(lowercaseQuery) ||
      topic.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
      topic.content.toLowerCase().includes(lowercaseQuery)
    );
  }, []);

  const getHelpTopic = useCallback((topicId: string): HelpTopic | undefined => {
    return helpTopics.find(topic => topic.id === topicId);
  }, []);

  const getFAQs = useCallback((category?: string): FAQ[] => {
    if (!category) return faqs;
    return faqs.filter(faq => faq.category === category);
  }, []);

  const getTutorials = useCallback((category?: string): Tutorial[] => {
    if (!category) return tutorials;
    return tutorials.filter(tutorial => tutorial.category === category);
  }, []);

  const rateHelpful = useCallback(async (itemId: string, helpful: boolean) => {
    // Implementation would send feedback to analytics
    console.log(`Item ${itemId} rated as ${helpful ? 'helpful' : 'not helpful'}`);
  }, []);

  const reportIssue = useCallback(async (issue: string) => {
    // Implementation would send issue report
    console.log('Issue reported:', issue);
  }, []);

  const requestHelp = useCallback(async (context: string) => {
    // Implementation would create help request
    console.log('Help requested for:', context);
  }, []);

  const updatePreferences = useCallback((preferences: Partial<HelpState['preferences']>) => {
    setState(prev => ({
      ...prev,
      preferences: { ...prev.preferences, ...preferences },
    }));
    saveHelpState();
  }, []);

  const loadHelpData = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('help_state');
      if (stored) {
        const loadedState = JSON.parse(stored);
        setState(prev => ({ ...prev, ...loadedState }));
      }
    } catch (error) {
      console.error('Failed to load help data:', error);
    }
  }, []);

  const saveHelpState = useCallback(async () => {
    try {
      await AsyncStorage.setItem('help_state', JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save help state:', error);
    }
  }, [state]);

  const resetHelp = useCallback(async () => {
    setState(defaultState);
    try {
      await AsyncStorage.removeItem('help_state');
    } catch (error) {
      console.error('Failed to reset help:', error);
    }
  }, []);

  // Load help data on mount
  React.useEffect(() => {
    loadHelpData();
  }, [loadHelpData]);

  const contextValue: HelpContextType = {
    state,
    startTutorial,
    pauseTutorial,
    resumeTutorial,
    completeTutorial,
    nextStep,
    previousStep,
    goToStep,
    enableHelpMode,
    disableHelpMode,
    toggleHelpMode,
    showTooltip,
    hideTooltip,
    markTooltipShown,
    searchHelp,
    getHelpTopic,
    getFAQs,
    getTutorials,
    rateHelpful,
    reportIssue,
    requestHelp,
    updatePreferences,
    loadHelpData,
    saveHelpState,
    resetHelp,
  };

  return (
    <HelpContext.Provider value={contextValue}>
      {children}
    </HelpContext.Provider>
  );
};

export default HelpProvider;