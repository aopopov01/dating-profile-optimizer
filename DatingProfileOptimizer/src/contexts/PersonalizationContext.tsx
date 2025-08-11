import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { useAnalytics } from './AnalyticsContext';

// User preferences interface
export interface UserPreferences {
  // Dashboard customization
  dashboardLayout: 'grid' | 'list' | 'cards';
  widgetOrder: string[];
  hiddenWidgets: string[];
  quickActions: string[];
  
  // Content preferences
  bioStyle: 'casual' | 'professional' | 'humorous' | 'romantic' | 'adventurous';
  contentLength: 'short' | 'medium' | 'long';
  toneOfVoice: 'friendly' | 'confident' | 'playful' | 'sincere';
  
  // Notification preferences
  pushNotifications: boolean;
  emailNotifications: boolean;
  reminderFrequency: 'daily' | 'weekly' | 'monthly' | 'never';
  analysisReminders: boolean;
  tipNotifications: boolean;
  
  // Feature preferences
  autoGenerateBios: boolean;
  smartSuggestions: boolean;
  photoAnalysisAutoRun: boolean;
  shareDataForImprovement: boolean;
  
  // UI customization
  compactMode: boolean;
  showScores: boolean;
  animationsEnabled: boolean;
  soundEffectsEnabled: boolean;
  
  // Privacy settings
  dataCollection: 'minimal' | 'standard' | 'full';
  analytics: boolean;
  crashReporting: boolean;
  
  // Advanced settings
  betaFeatures: boolean;
  debugMode: boolean;
  offlineMode: boolean;
}

// User behavior data
export interface UserBehaviorData {
  // Usage patterns
  mostUsedFeatures: Record<string, number>;
  sessionDuration: number[];
  timeOfDayUsage: Record<string, number>;
  dayOfWeekUsage: Record<string, number>;
  
  // Content interaction
  bioGenerationCount: number;
  photoAnalysisCount: number;
  profileViews: number;
  shareCount: number;
  
  // Preferences learned from behavior
  preferredContentTypes: string[];
  successfulStrategies: string[];
  rejectedSuggestions: string[];
  
  // Engagement metrics
  averageSessionTime: number;
  featureAdoptionRate: Record<string, number>;
  retentionScore: number;
  satisfactionRatings: number[];
}

// Recommendation data
export interface PersonalizedRecommendation {
  id: string;
  type: 'bio_improvement' | 'photo_suggestion' | 'profile_tip' | 'feature_discovery';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  actionText: string;
  category: string;
  confidence: number; // 0-1
  personalizedReason: string;
  dismissible: boolean;
  expiresAt?: string;
  metadata: Record<string, any>;
}

// Customization options
export interface DashboardWidget {
  id: string;
  type: 'analytics' | 'recent_bios' | 'photo_score' | 'tips' | 'achievements' | 'quick_actions';
  title: string;
  description: string;
  enabled: boolean;
  position: number;
  size: 'small' | 'medium' | 'large';
  refreshInterval?: number;
}

// Personalization state
interface PersonalizationState {
  preferences: UserPreferences;
  behaviorData: UserBehaviorData;
  recommendations: PersonalizedRecommendation[];
  dashboardWidgets: DashboardWidget[];
  isLoading: boolean;
  lastUpdated: string;
}

// Personalization actions
type PersonalizationAction = 
  | { type: 'LOAD_PREFERENCES'; payload: UserPreferences }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<UserPreferences> }
  | { type: 'UPDATE_BEHAVIOR'; payload: Partial<UserBehaviorData> }
  | { type: 'SET_RECOMMENDATIONS'; payload: PersonalizedRecommendation[] }
  | { type: 'DISMISS_RECOMMENDATION'; payload: string }
  | { type: 'UPDATE_WIDGETS'; payload: DashboardWidget[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'TRACK_FEATURE_USAGE'; payload: { feature: string; data?: any } };

// Default preferences
const defaultPreferences: UserPreferences = {
  dashboardLayout: 'cards',
  widgetOrder: ['analytics', 'recent_bios', 'photo_score', 'tips', 'achievements'],
  hiddenWidgets: [],
  quickActions: ['generate_bio', 'analyze_photo', 'view_profile'],
  bioStyle: 'casual',
  contentLength: 'medium',
  toneOfVoice: 'friendly',
  pushNotifications: true,
  emailNotifications: false,
  reminderFrequency: 'weekly',
  analysisReminders: true,
  tipNotifications: true,
  autoGenerateBios: false,
  smartSuggestions: true,
  photoAnalysisAutoRun: false,
  shareDataForImprovement: true,
  compactMode: false,
  showScores: true,
  animationsEnabled: true,
  soundEffectsEnabled: true,
  dataCollection: 'standard',
  analytics: true,
  crashReporting: true,
  betaFeatures: false,
  debugMode: false,
  offlineMode: false
};

const defaultBehaviorData: UserBehaviorData = {
  mostUsedFeatures: {},
  sessionDuration: [],
  timeOfDayUsage: {},
  dayOfWeekUsage: {},
  bioGenerationCount: 0,
  photoAnalysisCount: 0,
  profileViews: 0,
  shareCount: 0,
  preferredContentTypes: [],
  successfulStrategies: [],
  rejectedSuggestions: [],
  averageSessionTime: 0,
  featureAdoptionRate: {},
  retentionScore: 0,
  satisfactionRatings: []
};

const defaultDashboardWidgets: DashboardWidget[] = [
  {
    id: 'analytics',
    type: 'analytics',
    title: 'Profile Analytics',
    description: 'View your profile performance metrics',
    enabled: true,
    position: 0,
    size: 'large'
  },
  {
    id: 'recent_bios',
    type: 'recent_bios',
    title: 'Recent Bios',
    description: 'Your latest generated bios',
    enabled: true,
    position: 1,
    size: 'medium'
  },
  {
    id: 'photo_score',
    type: 'photo_score',
    title: 'Photo Score',
    description: 'Latest photo analysis results',
    enabled: true,
    position: 2,
    size: 'small'
  },
  {
    id: 'tips',
    type: 'tips',
    title: 'Personalized Tips',
    description: 'Tips based on your profile',
    enabled: true,
    position: 3,
    size: 'medium'
  },
  {
    id: 'achievements',
    type: 'achievements',
    title: 'Achievements',
    description: 'Your dating profile milestones',
    enabled: false,
    position: 4,
    size: 'small'
  }
];

// Personalization context interface
interface PersonalizationContextType extends PersonalizationState {
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  trackFeatureUsage: (feature: string, data?: any) => void;
  dismissRecommendation: (id: string) => void;
  generatePersonalizedRecommendations: () => Promise<void>;
  updateDashboardWidgets: (widgets: DashboardWidget[]) => Promise<void>;
  resetPersonalization: () => Promise<void>;
  getPersonalizedContent: (type: string, options?: any) => any[];
  calculatePersonalizationScore: () => number;
}

const PersonalizationContext = createContext<PersonalizationContextType | undefined>(undefined);

// Personalization reducer
const personalizationReducer = (state: PersonalizationState, action: PersonalizationAction): PersonalizationState => {
  switch (action.type) {
    case 'LOAD_PREFERENCES':
      return {
        ...state,
        preferences: { ...defaultPreferences, ...action.payload },
        isLoading: false
      };
    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        preferences: { ...state.preferences, ...action.payload },
        lastUpdated: new Date().toISOString()
      };
    case 'UPDATE_BEHAVIOR':
      return {
        ...state,
        behaviorData: { ...state.behaviorData, ...action.payload }
      };
    case 'SET_RECOMMENDATIONS':
      return {
        ...state,
        recommendations: action.payload
      };
    case 'DISMISS_RECOMMENDATION':
      return {
        ...state,
        recommendations: state.recommendations.filter(r => r.id !== action.payload)
      };
    case 'UPDATE_WIDGETS':
      return {
        ...state,
        dashboardWidgets: action.payload
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
    case 'TRACK_FEATURE_USAGE':
      const { feature, data } = action.payload;
      const updatedUsage = { ...state.behaviorData.mostUsedFeatures };
      updatedUsage[feature] = (updatedUsage[feature] || 0) + 1;
      
      return {
        ...state,
        behaviorData: {
          ...state.behaviorData,
          mostUsedFeatures: updatedUsage
        }
      };
    default:
      return state;
  }
};

// Personalization provider component
interface PersonalizationProviderProps {
  children: ReactNode;
}

export const PersonalizationProvider: React.FC<PersonalizationProviderProps> = ({ children }) => {
  const { trackEvent } = useAnalytics();
  
  const [state, dispatch] = useReducer(personalizationReducer, {
    preferences: defaultPreferences,
    behaviorData: defaultBehaviorData,
    recommendations: [],
    dashboardWidgets: defaultDashboardWidgets,
    isLoading: true,
    lastUpdated: new Date().toISOString()
  });

  // Load personalization data on app start
  useEffect(() => {
    loadPersonalizationData();
  }, []);

  // Auto-generate recommendations when behavior changes
  useEffect(() => {
    if (!state.isLoading) {
      generatePersonalizedRecommendations();
    }
  }, [state.behaviorData, state.preferences]);

  // Load personalization data from storage
  const loadPersonalizationData = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const [preferencesData, behaviorData, widgetsData] = await Promise.all([
        AsyncStorage.getItem('@user_preferences'),
        AsyncStorage.getItem('@user_behavior'),
        AsyncStorage.getItem('@dashboard_widgets')
      ]);

      if (preferencesData) {
        const preferences = JSON.parse(preferencesData);
        dispatch({ type: 'LOAD_PREFERENCES', payload: preferences });
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }

      if (behaviorData) {
        const behavior = JSON.parse(behaviorData);
        dispatch({ type: 'UPDATE_BEHAVIOR', payload: behavior });
      }

      if (widgetsData) {
        const widgets = JSON.parse(widgetsData);
        dispatch({ type: 'UPDATE_WIDGETS', payload: widgets });
      }

    } catch (error) {
      console.error('Error loading personalization data:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Update user preferences
  const updatePreferences = async (newPreferences: Partial<UserPreferences>) => {
    try {
      const updatedPreferences = { ...state.preferences, ...newPreferences };
      
      await AsyncStorage.setItem('@user_preferences', JSON.stringify(updatedPreferences));
      dispatch({ type: 'UPDATE_PREFERENCES', payload: newPreferences });

      // Track preference changes
      Object.keys(newPreferences).forEach(key => {
        trackEvent('preference_changed', {
          setting: key,
          value: newPreferences[key as keyof UserPreferences],
          source: 'user'
        });
      });

    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  };

  // Track feature usage
  const trackFeatureUsage = (feature: string, data?: any) => {
    dispatch({ type: 'TRACK_FEATURE_USAGE', payload: { feature, data } });
    
    // Also track with analytics
    trackEvent('feature_used', {
      feature,
      timestamp: new Date().toISOString(),
      ...data
    });

    // Save behavior data
    saveBehaviorData();
  };

  // Save behavior data to storage
  const saveBehaviorData = async () => {
    try {
      await AsyncStorage.setItem('@user_behavior', JSON.stringify(state.behaviorData));
    } catch (error) {
      console.error('Error saving behavior data:', error);
    }
  };

  // Generate personalized recommendations
  const generatePersonalizedRecommendations = async () => {
    try {
      const recommendations: PersonalizedRecommendation[] = [];
      
      // Analyze user behavior to generate recommendations
      const { mostUsedFeatures, bioGenerationCount, photoAnalysisCount } = state.behaviorData;
      
      // Bio improvement recommendations
      if (bioGenerationCount > 5 && mostUsedFeatures['bio_generation']) {
        recommendations.push({
          id: 'bio_advanced_tips',
          type: 'bio_improvement',
          priority: 'medium',
          title: 'Advanced Bio Tips',
          description: 'You\'ve generated several bios! Here are advanced tips to make them even better.',
          actionText: 'View Tips',
          category: 'improvement',
          confidence: 0.8,
          personalizedReason: 'Based on your frequent bio generation activity',
          dismissible: true,
          metadata: { source: 'usage_pattern' }
        });
      }

      // Photo analysis suggestions
      if (photoAnalysisCount < 3) {
        recommendations.push({
          id: 'try_photo_analysis',
          type: 'feature_discovery',
          priority: 'high',
          title: 'Analyze Your Photos',
          description: 'Get AI-powered insights on your profile photos to improve your dating success.',
          actionText: 'Analyze Photos',
          category: 'discovery',
          confidence: 0.9,
          personalizedReason: 'You haven\'t explored photo analysis yet',
          dismissible: false,
          metadata: { feature: 'photo_analysis' }
        });
      }

      // Smart suggestions based on preferences
      if (state.preferences.bioStyle === 'humorous' && bioGenerationCount > 0) {
        recommendations.push({
          id: 'humor_tips',
          type: 'profile_tip',
          priority: 'low',
          title: 'Humor in Dating Profiles',
          description: 'Since you prefer humorous bios, here are tips on using humor effectively.',
          actionText: 'Read Tips',
          category: 'tips',
          confidence: 0.7,
          personalizedReason: 'Based on your humorous bio style preference',
          dismissible: true,
          metadata: { style: 'humorous' }
        });
      }

      // Time-based recommendations
      const now = new Date();
      const hour = now.getHours();
      
      if (hour >= 19 && hour <= 22) { // Evening hours
        recommendations.push({
          id: 'peak_time_optimization',
          type: 'profile_tip',
          priority: 'medium',
          title: 'Peak Dating Hours',
          description: 'You\'re using the app during peak dating hours! Make sure your profile is optimized.',
          actionText: 'Optimize Profile',
          category: 'timing',
          confidence: 0.6,
          personalizedReason: 'You\'re active during prime dating hours',
          dismissible: true,
          expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
          metadata: { time_sensitive: true }
        });
      }

      // Device-specific recommendations
      const deviceType = await DeviceInfo.getDeviceType();
      if (deviceType === 'Tablet') {
        recommendations.push({
          id: 'tablet_features',
          type: 'feature_discovery',
          priority: 'low',
          title: 'Tablet Features',
          description: 'Discover features optimized for your tablet experience.',
          actionText: 'Explore',
          category: 'discovery',
          confidence: 0.5,
          personalizedReason: 'Optimized for your tablet device',
          dismissible: true,
          metadata: { device_type: 'tablet' }
        });
      }

      // Filter out dismissed recommendations and sort by priority
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const sortedRecommendations = recommendations
        .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
        .slice(0, 5); // Limit to 5 recommendations

      dispatch({ type: 'SET_RECOMMENDATIONS', payload: sortedRecommendations });

    } catch (error) {
      console.error('Error generating recommendations:', error);
    }
  };

  // Dismiss recommendation
  const dismissRecommendation = (id: string) => {
    dispatch({ type: 'DISMISS_RECOMMENDATION', payload: id });
    
    // Track dismissal
    trackEvent('recommendation_dismissed', {
      recommendation_id: id,
      timestamp: new Date().toISOString()
    });

    // Add to rejected suggestions for learning
    const updatedBehavior = {
      ...state.behaviorData,
      rejectedSuggestions: [...state.behaviorData.rejectedSuggestions, id]
    };
    
    dispatch({ type: 'UPDATE_BEHAVIOR', payload: updatedBehavior });
  };

  // Update dashboard widgets
  const updateDashboardWidgets = async (widgets: DashboardWidget[]) => {
    try {
      await AsyncStorage.setItem('@dashboard_widgets', JSON.stringify(widgets));
      dispatch({ type: 'UPDATE_WIDGETS', payload: widgets });

      trackEvent('dashboard_customized', {
        widget_count: widgets.filter(w => w.enabled).length,
        layout: state.preferences.dashboardLayout
      });

    } catch (error) {
      console.error('Error updating dashboard widgets:', error);
      throw error;
    }
  };

  // Reset personalization data
  const resetPersonalization = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem('@user_preferences'),
        AsyncStorage.removeItem('@user_behavior'),
        AsyncStorage.removeItem('@dashboard_widgets')
      ]);

      // Reset state to defaults
      dispatch({ type: 'LOAD_PREFERENCES', payload: defaultPreferences });
      dispatch({ type: 'UPDATE_BEHAVIOR', payload: defaultBehaviorData });
      dispatch({ type: 'UPDATE_WIDGETS', payload: defaultDashboardWidgets });
      dispatch({ type: 'SET_RECOMMENDATIONS', payload: [] });

      trackEvent('personalization_reset', {
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error resetting personalization:', error);
      throw error;
    }
  };

  // Get personalized content
  const getPersonalizedContent = (type: string, options?: any): any[] => {
    // This would implement logic to return personalized content
    // based on user preferences and behavior
    
    const { preferences, behaviorData } = state;
    
    switch (type) {
      case 'bio_suggestions':
        return getBioSuggestions(preferences, behaviorData, options);
      case 'photo_tips':
        return getPhotoTips(preferences, behaviorData, options);
      case 'dashboard_widgets':
        return state.dashboardWidgets.filter(w => w.enabled).sort((a, b) => a.position - b.position);
      default:
        return [];
    }
  };

  // Calculate personalization score (0-100)
  const calculatePersonalizationScore = (): number => {
    const { preferences, behaviorData } = state;
    let score = 0;
    let maxScore = 100;

    // Preferences completion (40 points)
    const preferenceKeys = Object.keys(preferences);
    const completedPreferences = preferenceKeys.filter(key => 
      preferences[key as keyof UserPreferences] !== defaultPreferences[key as keyof UserPreferences]
    );
    score += (completedPreferences.length / preferenceKeys.length) * 40;

    // Usage diversity (30 points)
    const usedFeatures = Object.keys(behaviorData.mostUsedFeatures).length;
    const totalFeatures = 10; // Approximate number of main features
    score += Math.min(usedFeatures / totalFeatures, 1) * 30;

    // Engagement level (30 points)
    const totalUsage = Object.values(behaviorData.mostUsedFeatures).reduce((sum, count) => sum + count, 0);
    const engagementScore = Math.min(totalUsage / 50, 1) * 30; // 50 interactions = full engagement
    score += engagementScore;

    return Math.round(score);
  };

  const contextValue: PersonalizationContextType = {
    ...state,
    updatePreferences,
    trackFeatureUsage,
    dismissRecommendation,
    generatePersonalizedRecommendations,
    updateDashboardWidgets,
    resetPersonalization,
    getPersonalizedContent,
    calculatePersonalizationScore
  };

  return (
    <PersonalizationContext.Provider value={contextValue}>
      {children}
    </PersonalizationContext.Provider>
  );
};

// Helper functions for personalized content
const getBioSuggestions = (preferences: UserPreferences, behavior: UserBehaviorData, options?: any): any[] => {
  // Implementation would analyze preferences and behavior to suggest bio styles/content
  return [];
};

const getPhotoTips = (preferences: UserPreferences, behavior: UserBehaviorData, options?: any): any[] => {
  // Implementation would provide personalized photo tips
  return [];
};

// Custom hook for using personalization
export const usePersonalization = (): PersonalizationContextType => {
  const context = useContext(PersonalizationContext);
  if (!context) {
    throw new Error('usePersonalization must be used within a PersonalizationProvider');
  }
  return context;
};

// Utility hooks
export const useRecommendations = () => {
  const { recommendations, dismissRecommendation } = usePersonalization();
  return {
    recommendations: recommendations.filter(r => !r.expiresAt || new Date(r.expiresAt) > new Date()),
    dismissRecommendation
  };
};

export const useDashboard = () => {
  const { dashboardWidgets, preferences, updateDashboardWidgets } = usePersonalization();
  return {
    widgets: dashboardWidgets.filter(w => w.enabled).sort((a, b) => a.position - b.position),
    layout: preferences.dashboardLayout,
    updateWidgets: updateDashboardWidgets
  };
};

export const useUserBehavior = () => {
  const { behaviorData, trackFeatureUsage } = usePersonalization();
  return {
    behaviorData,
    trackFeatureUsage,
    getMostUsedFeature: () => {
      const features = behaviorData.mostUsedFeatures;
      return Object.keys(features).reduce((a, b) => features[a] > features[b] ? a : b, '');
    }
  };
};

export default PersonalizationContext;