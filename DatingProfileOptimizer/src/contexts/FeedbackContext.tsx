/**
 * Feedback Context
 * Manages user feedback, ratings, bug reports, and feature requests
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export interface FeedbackRating {
  id: string;
  featureId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  timestamp: string;
  context?: string;
}

export interface BugReport {
  id: string;
  title: string;
  description: string;
  category: 'crash' | 'ui' | 'functionality' | 'performance' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  steps: string[];
  deviceInfo: {
    platform: string;
    version: string;
    model: string;
  };
  screenshots?: string[];
  timestamp: string;
  status: 'submitted' | 'acknowledged' | 'investigating' | 'resolved';
}

export interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  votes: number;
  userVoted: boolean;
  timestamp: string;
  status: 'submitted' | 'under_review' | 'planned' | 'in_progress' | 'completed';
}

export interface AppRating {
  id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  timestamp: string;
  prompted: boolean;
  context: string;
}

export interface UserSatisfactionSurvey {
  id: string;
  responses: Record<string, any>;
  npsScore: number;
  completedAt: string;
}

interface FeedbackState {
  hasRatedApp: boolean;
  lastRatingPrompt: string | null;
  ratingPromptCount: number;
  feedbackHistory: FeedbackRating[];
  bugReports: BugReport[];
  featureRequests: FeatureRequest[];
  appRatings: AppRating[];
  surveys: UserSatisfactionSurvey[];
  preferences: {
    enableRatingPrompts: boolean;
    enableSurveyPrompts: boolean;
    enableFeedbackRequests: boolean;
    feedbackFrequency: 'minimal' | 'normal' | 'frequent';
  };
}

interface FeedbackContextType {
  state: FeedbackState;
  
  // App rating
  shouldShowRatingPrompt: () => boolean;
  showRatingPrompt: (context: string) => Promise<boolean>;
  submitAppRating: (rating: number, comment?: string, context?: string) => Promise<void>;
  
  // Feature feedback
  rateFeature: (featureId: string, rating: 1 | 2 | 3 | 4 | 5, comment?: string) => Promise<void>;
  getFeedbackForFeature: (featureId: string) => FeedbackRating[];
  
  // Bug reporting
  submitBugReport: (report: Omit<BugReport, 'id' | 'timestamp' | 'status' | 'deviceInfo'>) => Promise<void>;
  getBugReports: () => BugReport[];
  
  // Feature requests
  submitFeatureRequest: (request: Omit<FeatureRequest, 'id' | 'timestamp' | 'votes' | 'userVoted' | 'status'>) => Promise<void>;
  voteForFeature: (requestId: string) => Promise<void>;
  getFeatureRequests: () => FeatureRequest[];
  
  // Surveys
  triggerSatisfactionSurvey: () => Promise<boolean>;
  submitSurvey: (responses: Record<string, any>, npsScore: number) => Promise<void>;
  
  // Analytics
  trackFeedbackEvent: (event: string, properties?: Record<string, any>) => void;
  
  // Preferences
  updatePreferences: (preferences: Partial<FeedbackState['preferences']>) => Promise<void>;
  
  // Data management
  loadFeedbackData: () => Promise<void>;
  saveFeedbackData: () => Promise<void>;
  exportFeedbackData: () => Promise<string>;
}

const defaultState: FeedbackState = {
  hasRatedApp: false,
  lastRatingPrompt: null,
  ratingPromptCount: 0,
  feedbackHistory: [],
  bugReports: [],
  featureRequests: [],
  appRatings: [],
  surveys: [],
  preferences: {
    enableRatingPrompts: true,
    enableSurveyPrompts: true,
    enableFeedbackRequests: true,
    feedbackFrequency: 'normal',
  },
};

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
};

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<FeedbackState>(defaultState);

  // App rating logic
  const shouldShowRatingPrompt = useCallback((): boolean => {
    if (!state.preferences.enableRatingPrompts || state.hasRatedApp) {
      return false;
    }

    // Don't show too frequently
    if (state.lastRatingPrompt) {
      const lastPrompt = new Date(state.lastRatingPrompt);
      const daysSinceLastPrompt = (Date.now() - lastPrompt.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceLastPrompt < 7) {
        return false;
      }
    }

    // Limit prompt frequency based on user preferences
    const maxPrompts = state.preferences.feedbackFrequency === 'minimal' ? 2 :
                      state.preferences.feedbackFrequency === 'normal' ? 3 : 5;
    
    return state.ratingPromptCount < maxPrompts;
  }, [state]);

  const showRatingPrompt = useCallback(async (context: string): Promise<boolean> => {
    return new Promise((resolve) => {
      Alert.alert(
        'Enjoying the app?',
        'Help us improve by rating your experience. It only takes a moment!',
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => {
              setState(prev => ({
                ...prev,
                lastRatingPrompt: new Date().toISOString(),
                ratingPromptCount: prev.ratingPromptCount + 1,
              }));
              resolve(false);
            },
          },
          {
            text: 'Never',
            style: 'destructive',
            onPress: () => {
              setState(prev => ({
                ...prev,
                preferences: {
                  ...prev.preferences,
                  enableRatingPrompts: false,
                },
                lastRatingPrompt: new Date().toISOString(),
              }));
              resolve(false);
            },
          },
          {
            text: 'Rate App',
            onPress: () => {
              setState(prev => ({
                ...prev,
                lastRatingPrompt: new Date().toISOString(),
                ratingPromptCount: prev.ratingPromptCount + 1,
              }));
              resolve(true);
            },
          },
        ]
      );
    });
  }, []);

  const submitAppRating = useCallback(async (
    rating: number,
    comment?: string,
    context?: string
  ) => {
    const newRating: AppRating = {
      id: Date.now().toString(),
      rating: rating as 1 | 2 | 3 | 4 | 5,
      comment,
      timestamp: new Date().toISOString(),
      prompted: !!context,
      context: context || 'manual',
    };

    setState(prev => ({
      ...prev,
      hasRatedApp: true,
      appRatings: [...prev.appRatings, newRating],
    }));

    trackFeedbackEvent('app_rated', {
      rating,
      hasComment: !!comment,
      context,
    });

    await saveFeedbackData();
  }, []);

  const rateFeature = useCallback(async (
    featureId: string,
    rating: 1 | 2 | 3 | 4 | 5,
    comment?: string
  ) => {
    const newRating: FeedbackRating = {
      id: Date.now().toString(),
      featureId,
      rating,
      comment,
      timestamp: new Date().toISOString(),
    };

    setState(prev => ({
      ...prev,
      feedbackHistory: [...prev.feedbackHistory, newRating],
    }));

    trackFeedbackEvent('feature_rated', {
      featureId,
      rating,
      hasComment: !!comment,
    });

    await saveFeedbackData();
  }, []);

  const getFeedbackForFeature = useCallback((featureId: string): FeedbackRating[] => {
    return state.feedbackHistory.filter(f => f.featureId === featureId);
  }, [state.feedbackHistory]);

  const submitBugReport = useCallback(async (
    report: Omit<BugReport, 'id' | 'timestamp' | 'status' | 'deviceInfo'>
  ) => {
    // Get device info (in a real app, you'd use a library like react-native-device-info)
    const deviceInfo = {
      platform: 'unknown',
      version: 'unknown',
      model: 'unknown',
    };

    const newReport: BugReport = {
      ...report,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      status: 'submitted',
      deviceInfo,
    };

    setState(prev => ({
      ...prev,
      bugReports: [...prev.bugReports, newReport],
    }));

    trackFeedbackEvent('bug_reported', {
      category: report.category,
      severity: report.severity,
    });

    await saveFeedbackData();

    // In a real app, send to your bug tracking system
    console.log('Bug report submitted:', newReport);
  }, []);

  const getBugReports = useCallback((): BugReport[] => {
    return state.bugReports.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [state.bugReports]);

  const submitFeatureRequest = useCallback(async (
    request: Omit<FeatureRequest, 'id' | 'timestamp' | 'votes' | 'userVoted' | 'status'>
  ) => {
    const newRequest: FeatureRequest = {
      ...request,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      votes: 1,
      userVoted: true,
      status: 'submitted',
    };

    setState(prev => ({
      ...prev,
      featureRequests: [...prev.featureRequests, newRequest],
    }));

    trackFeedbackEvent('feature_requested', {
      category: request.category,
      priority: request.priority,
    });

    await saveFeedbackData();
  }, []);

  const voteForFeature = useCallback(async (requestId: string) => {
    setState(prev => ({
      ...prev,
      featureRequests: prev.featureRequests.map(req => 
        req.id === requestId 
          ? { ...req, votes: req.votes + 1, userVoted: true }
          : req
      ),
    }));

    trackFeedbackEvent('feature_voted', { requestId });
    await saveFeedbackData();
  }, []);

  const getFeatureRequests = useCallback((): FeatureRequest[] => {
    return state.featureRequests.sort((a, b) => b.votes - a.votes);
  }, [state.featureRequests]);

  const triggerSatisfactionSurvey = useCallback(async (): Promise<boolean> => {
    if (!state.preferences.enableSurveyPrompts) return false;

    // Check if user has taken a survey recently
    const lastSurvey = state.surveys[state.surveys.length - 1];
    if (lastSurvey) {
      const daysSinceLastSurvey = (Date.now() - new Date(lastSurvey.completedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastSurvey < 30) return false;
    }

    return new Promise((resolve) => {
      Alert.alert(
        'Quick Survey',
        'Help us improve by sharing your experience. It takes less than 2 minutes.',
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Take Survey',
            onPress: () => resolve(true),
          },
        ]
      );
    });
  }, [state]);

  const submitSurvey = useCallback(async (
    responses: Record<string, any>,
    npsScore: number
  ) => {
    const newSurvey: UserSatisfactionSurvey = {
      id: Date.now().toString(),
      responses,
      npsScore,
      completedAt: new Date().toISOString(),
    };

    setState(prev => ({
      ...prev,
      surveys: [...prev.surveys, newSurvey],
    }));

    trackFeedbackEvent('survey_completed', {
      npsScore,
      responseCount: Object.keys(responses).length,
    });

    await saveFeedbackData();
  }, []);

  const trackFeedbackEvent = useCallback((
    event: string,
    properties?: Record<string, any>
  ) => {
    // In a real app, send to analytics service
    console.log('Feedback event:', event, properties);
  }, []);

  const updatePreferences = useCallback(async (
    preferences: Partial<FeedbackState['preferences']>
  ) => {
    setState(prev => ({
      ...prev,
      preferences: { ...prev.preferences, ...preferences },
    }));
    await saveFeedbackData();
  }, []);

  const loadFeedbackData = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('feedback_data');
      if (stored) {
        const loadedState = JSON.parse(stored);
        setState(prev => ({ ...prev, ...loadedState }));
      }
    } catch (error) {
      console.error('Failed to load feedback data:', error);
    }
  }, []);

  const saveFeedbackData = useCallback(async () => {
    try {
      await AsyncStorage.setItem('feedback_data', JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save feedback data:', error);
    }
  }, [state]);

  const exportFeedbackData = useCallback(async (): Promise<string> => {
    const exportData = {
      ...state,
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(exportData, null, 2);
  }, [state]);

  // Load data on mount
  React.useEffect(() => {
    loadFeedbackData();
  }, [loadFeedbackData]);

  const contextValue: FeedbackContextType = {
    state,
    shouldShowRatingPrompt,
    showRatingPrompt,
    submitAppRating,
    rateFeature,
    getFeedbackForFeature,
    submitBugReport,
    getBugReports,
    submitFeatureRequest,
    voteForFeature,
    getFeatureRequests,
    triggerSatisfactionSurvey,
    submitSurvey,
    trackFeedbackEvent,
    updatePreferences,
    loadFeedbackData,
    saveFeedbackData,
    exportFeedbackData,
  };

  return (
    <FeedbackContext.Provider value={contextValue}>
      {children}
    </FeedbackContext.Provider>
  );
};

export default FeedbackProvider;