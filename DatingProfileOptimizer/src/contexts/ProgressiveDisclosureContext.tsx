/**
 * Progressive Disclosure Context
 * Manages feature discovery, achievements, and progressive app experience
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Feature {
  id: string;
  name: string;
  description: string;
  category: string;
  unlockCriteria: UnlockCriteria;
  unlocked: boolean;
  discoveredAt?: string;
  usageCount: number;
  isNew: boolean;
  priority: 'low' | 'medium' | 'high';
  tutorialId?: string;
}

export interface UnlockCriteria {
  type: 'usage' | 'achievement' | 'time' | 'manual' | 'condition';
  threshold?: number;
  dependencies?: string[];
  conditions?: Record<string, any>;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  points: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  unlockCriteria: UnlockCriteria;
  unlocked: boolean;
  unlockedAt?: string;
  progress: number;
  maxProgress: number;
  rewards?: Reward[];
}

export interface Reward {
  type: 'feature' | 'discount' | 'content' | 'badge';
  value: string;
  description: string;
}

export interface UserMilestone {
  id: string;
  title: string;
  description: string;
  icon: string;
  completedAt: string;
  celebrationShown: boolean;
}

export interface FeatureDiscoveryHint {
  id: string;
  featureId: string;
  title: string;
  description: string;
  triggerCondition: string;
  priority: 'low' | 'medium' | 'high';
  shown: boolean;
  dismissed: boolean;
}

interface ProgressiveDisclosureState {
  userLevel: number;
  totalPoints: number;
  unlockedFeatures: string[];
  discoveredFeatures: string[];
  completedAchievements: string[];
  milestones: UserMilestone[];
  featureUsage: Record<string, number>;
  discoveryHints: FeatureDiscoveryHint[];
  preferences: {
    enableFeatureDiscovery: boolean;
    enableAchievements: boolean;
    enableCelebrations: boolean;
    discoveryFrequency: 'minimal' | 'normal' | 'frequent';
  };
}

interface ProgressiveDisclosureContextType {
  state: ProgressiveDisclosureState;
  
  // Feature management
  getAllFeatures: () => Feature[];
  getUnlockedFeatures: () => Feature[];
  getLockedFeatures: () => Feature[];
  unlockFeature: (featureId: string) => Promise<void>;
  markFeatureDiscovered: (featureId: string) => Promise<void>;
  incrementFeatureUsage: (featureId: string) => Promise<void>;
  isFeatureUnlocked: (featureId: string) => boolean;
  
  // Achievements
  getAllAchievements: () => Achievement[];
  getUnlockedAchievements: () => Achievement[];
  checkAchievements: () => Promise<Achievement[]>;
  unlockAchievement: (achievementId: string) => Promise<void>;
  updateAchievementProgress: (achievementId: string, progress: number) => Promise<void>;
  
  // Discovery system
  getDiscoveryHints: () => FeatureDiscoveryHint[];
  showDiscoveryHint: (hintId: string) => void;
  dismissDiscoveryHint: (hintId: string) => void;
  triggerFeatureDiscovery: (context: string) => Promise<FeatureDiscoveryHint[]>;
  
  // Milestones and progression
  getMilestones: () => UserMilestone[];
  checkForMilestones: () => Promise<UserMilestone[]>;
  celebrateMilestone: (milestoneId: string) => Promise<void>;
  
  // User progression
  addPoints: (points: number, source: string) => Promise<void>;
  getCurrentLevel: () => number;
  getPointsToNextLevel: () => number;
  
  // Preferences
  updatePreferences: (preferences: Partial<ProgressiveDisclosureState['preferences']>) => Promise<void>;
  
  // Data management
  loadProgressiveData: () => Promise<void>;
  saveProgressiveData: () => Promise<void>;
  resetProgress: () => Promise<void>;
}

const defaultState: ProgressiveDisclosureState = {
  userLevel: 1,
  totalPoints: 0,
  unlockedFeatures: ['photo-upload', 'basic-analysis'],
  discoveredFeatures: [],
  completedAchievements: [],
  milestones: [],
  featureUsage: {},
  discoveryHints: [],
  preferences: {
    enableFeatureDiscovery: true,
    enableAchievements: true,
    enableCelebrations: true,
    discoveryFrequency: 'normal',
  },
};

// Feature definitions - in production, this would come from a configuration service
const features: Feature[] = [
  {
    id: 'photo-upload',
    name: 'Photo Upload',
    description: 'Upload photos for analysis',
    category: 'basic',
    unlockCriteria: { type: 'manual' },
    unlocked: true,
    usageCount: 0,
    isNew: false,
    priority: 'high',
  },
  {
    id: 'basic-analysis',
    name: 'Basic Photo Analysis',
    description: 'Get AI scores for your photos',
    category: 'basic',
    unlockCriteria: { type: 'manual' },
    unlocked: true,
    usageCount: 0,
    isNew: false,
    priority: 'high',
  },
  {
    id: 'advanced-analysis',
    name: 'Advanced Photo Analysis',
    description: 'Detailed breakdowns and improvement tips',
    category: 'advanced',
    unlockCriteria: { 
      type: 'usage',
      threshold: 5,
      dependencies: ['basic-analysis']
    },
    unlocked: false,
    usageCount: 0,
    isNew: true,
    priority: 'medium',
    tutorialId: 'advanced-analysis-tutorial',
  },
  {
    id: 'bio-generator',
    name: 'Bio Generator',
    description: 'AI-powered bio creation',
    category: 'content',
    unlockCriteria: {
      type: 'achievement',
      dependencies: ['first-analysis'],
    },
    unlocked: false,
    usageCount: 0,
    isNew: true,
    priority: 'high',
  },
  {
    id: 'conversation-starters',
    name: 'Conversation Starters',
    description: 'Personalized ice breakers',
    category: 'content',
    unlockCriteria: {
      type: 'condition',
      conditions: { profileCompleted: true, photosAnalyzed: 3 }
    },
    unlocked: false,
    usageCount: 0,
    isNew: true,
    priority: 'medium',
  },
  {
    id: 'success-tracking',
    name: 'Success Tracking',
    description: 'Track your dating app performance',
    category: 'analytics',
    unlockCriteria: {
      type: 'time',
      threshold: 7, // days
    },
    unlocked: false,
    usageCount: 0,
    isNew: true,
    priority: 'low',
  },
];

// Achievement definitions
const achievements: Achievement[] = [
  {
    id: 'first-analysis',
    title: 'First Steps',
    description: 'Complete your first photo analysis',
    icon: '🎯',
    category: 'getting-started',
    points: 10,
    rarity: 'common',
    unlockCriteria: { type: 'usage', threshold: 1, dependencies: ['basic-analysis'] },
    unlocked: false,
    progress: 0,
    maxProgress: 1,
    rewards: [{ type: 'feature', value: 'bio-generator', description: 'Unlock Bio Generator' }],
  },
  {
    id: 'photo-expert',
    title: 'Photo Expert',
    description: 'Analyze 25 photos',
    icon: '📸',
    category: 'engagement',
    points: 50,
    rarity: 'uncommon',
    unlockCriteria: { type: 'usage', threshold: 25, dependencies: ['basic-analysis'] },
    unlocked: false,
    progress: 0,
    maxProgress: 25,
  },
  {
    id: 'profile-perfectionist',
    title: 'Profile Perfectionist',
    description: 'Complete all profile sections',
    icon: '✨',
    category: 'completion',
    points: 25,
    rarity: 'uncommon',
    unlockCriteria: { type: 'condition', conditions: { profileCompleted: true } },
    unlocked: false,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: 'daily-improver',
    title: 'Daily Improver',
    description: 'Use the app for 7 consecutive days',
    icon: '🔥',
    category: 'consistency',
    points: 35,
    rarity: 'rare',
    unlockCriteria: { type: 'condition', conditions: { consecutiveDays: 7 } },
    unlocked: false,
    progress: 0,
    maxProgress: 7,
  },
];

const ProgressiveDisclosureContext = createContext<ProgressiveDisclosureContextType | undefined>(undefined);

export const useProgressiveDisclosure = () => {
  const context = useContext(ProgressiveDisclosureContext);
  if (!context) {
    throw new Error('useProgressiveDisclosure must be used within a ProgressiveDisclosureProvider');
  }
  return context;
};

export const ProgressiveDisclosureProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const [state, setState] = useState<ProgressiveDisclosureState>(defaultState);

  const getAllFeatures = useCallback((): Feature[] => {
    return features.map(feature => ({
      ...feature,
      unlocked: state.unlockedFeatures.includes(feature.id),
      usageCount: state.featureUsage[feature.id] || 0,
    }));
  }, [state.unlockedFeatures, state.featureUsage]);

  const getUnlockedFeatures = useCallback((): Feature[] => {
    return getAllFeatures().filter(feature => feature.unlocked);
  }, [getAllFeatures]);

  const getLockedFeatures = useCallback((): Feature[] => {
    return getAllFeatures().filter(feature => !feature.unlocked);
  }, [getAllFeatures]);

  const checkUnlockCriteria = useCallback((criteria: UnlockCriteria, featureId: string): boolean => {
    switch (criteria.type) {
      case 'manual':
        return true;
      
      case 'usage':
        if (!criteria.dependencies || !criteria.threshold) return false;
        return criteria.dependencies.every(depId => {
          const usage = state.featureUsage[depId] || 0;
          return usage >= (criteria.threshold || 0);
        });
      
      case 'achievement':
        if (!criteria.dependencies) return false;
        return criteria.dependencies.every(achievementId => 
          state.completedAchievements.includes(achievementId)
        );
      
      case 'time':
        // In a real app, you'd track installation date and compare
        return true;
      
      case 'condition':
        // Custom condition checking - would be implemented based on app state
        return false;
      
      default:
        return false;
    }
  }, [state.featureUsage, state.completedAchievements]);

  const unlockFeature = useCallback(async (featureId: string) => {
    const feature = features.find(f => f.id === featureId);
    if (!feature || state.unlockedFeatures.includes(featureId)) return;

    if (checkUnlockCriteria(feature.unlockCriteria, featureId)) {
      setState(prev => ({
        ...prev,
        unlockedFeatures: [...prev.unlockedFeatures, featureId],
      }));
      await saveProgressiveData();
    }
  }, [state.unlockedFeatures, checkUnlockCriteria]);

  const markFeatureDiscovered = useCallback(async (featureId: string) => {
    if (!state.discoveredFeatures.includes(featureId)) {
      setState(prev => ({
        ...prev,
        discoveredFeatures: [...prev.discoveredFeatures, featureId],
      }));
      await saveProgressiveData();
    }
  }, [state.discoveredFeatures]);

  const incrementFeatureUsage = useCallback(async (featureId: string) => {
    setState(prev => ({
      ...prev,
      featureUsage: {
        ...prev.featureUsage,
        [featureId]: (prev.featureUsage[featureId] || 0) + 1,
      },
    }));

    // Check if this usage unlocks new features
    const lockedFeatures = getLockedFeatures();
    for (const feature of lockedFeatures) {
      if (checkUnlockCriteria(feature.unlockCriteria, feature.id)) {
        await unlockFeature(feature.id);
      }
    }

    await saveProgressiveData();
  }, [state.featureUsage, getLockedFeatures, checkUnlockCriteria, unlockFeature]);

  const isFeatureUnlocked = useCallback((featureId: string): boolean => {
    return state.unlockedFeatures.includes(featureId);
  }, [state.unlockedFeatures]);

  const getAllAchievements = useCallback((): Achievement[] => {
    return achievements.map(achievement => {
      const userAchievement = state.completedAchievements.includes(achievement.id);
      return {
        ...achievement,
        unlocked: userAchievement,
        // Progress would be calculated based on current state
        progress: userAchievement ? achievement.maxProgress : 0,
      };
    });
  }, [state.completedAchievements]);

  const getUnlockedAchievements = useCallback((): Achievement[] => {
    return getAllAchievements().filter(achievement => achievement.unlocked);
  }, [getAllAchievements]);

  const checkAchievements = useCallback(async (): Promise<Achievement[]> => {
    const newAchievements: Achievement[] = [];
    
    for (const achievement of achievements) {
      if (state.completedAchievements.includes(achievement.id)) continue;
      
      let shouldUnlock = false;
      
      switch (achievement.unlockCriteria.type) {
        case 'usage':
          if (achievement.unlockCriteria.dependencies && achievement.unlockCriteria.threshold) {
            const featureId = achievement.unlockCriteria.dependencies[0];
            const usage = state.featureUsage[featureId] || 0;
            shouldUnlock = usage >= achievement.unlockCriteria.threshold;
          }
          break;
        
        case 'condition':
          // Custom condition checking
          break;
      }
      
      if (shouldUnlock) {
        newAchievements.push(achievement);
        await unlockAchievement(achievement.id);
      }
    }
    
    return newAchievements;
  }, [state.completedAchievements, state.featureUsage]);

  const unlockAchievement = useCallback(async (achievementId: string) => {
    const achievement = achievements.find(a => a.id === achievementId);
    if (!achievement || state.completedAchievements.includes(achievementId)) return;

    setState(prev => ({
      ...prev,
      completedAchievements: [...prev.completedAchievements, achievementId],
      totalPoints: prev.totalPoints + achievement.points,
    }));

    // Process rewards
    if (achievement.rewards) {
      for (const reward of achievement.rewards) {
        if (reward.type === 'feature') {
          await unlockFeature(reward.value);
        }
      }
    }

    await saveProgressiveData();
  }, [state.completedAchievements, unlockFeature]);

  const updateAchievementProgress = useCallback(async (
    achievementId: string, 
    progress: number
  ) => {
    // In a real implementation, you'd track progress for each achievement
    // This is a simplified version
  }, []);

  const getDiscoveryHints = useCallback((): FeatureDiscoveryHint[] => {
    return state.discoveryHints.filter(hint => !hint.shown && !hint.dismissed);
  }, [state.discoveryHints]);

  const showDiscoveryHint = useCallback((hintId: string) => {
    setState(prev => ({
      ...prev,
      discoveryHints: prev.discoveryHints.map(hint =>
        hint.id === hintId ? { ...hint, shown: true } : hint
      ),
    }));
  }, []);

  const dismissDiscoveryHint = useCallback((hintId: string) => {
    setState(prev => ({
      ...prev,
      discoveryHints: prev.discoveryHints.map(hint =>
        hint.id === hintId ? { ...hint, dismissed: true } : hint
      ),
    }));
  }, []);

  const triggerFeatureDiscovery = useCallback(async (
    context: string
  ): Promise<FeatureDiscoveryHint[]> => {
    // Logic to determine which features to suggest based on context
    const hints: FeatureDiscoveryHint[] = [];
    
    // Example: suggest bio generator after first analysis
    if (context === 'analysis_complete' && !isFeatureUnlocked('bio-generator')) {
      const hint: FeatureDiscoveryHint = {
        id: 'discover-bio-generator',
        featureId: 'bio-generator',
        title: 'New Feature Available!',
        description: 'You can now create AI-powered bios. Try the Bio Generator!',
        triggerCondition: context,
        priority: 'high',
        shown: false,
        dismissed: false,
      };
      hints.push(hint);
    }
    
    return hints;
  }, [isFeatureUnlocked]);

  const getMilestones = useCallback((): UserMilestone[] => {
    return state.milestones;
  }, [state.milestones]);

  const checkForMilestones = useCallback(async (): Promise<UserMilestone[]> => {
    const newMilestones: UserMilestone[] = [];
    
    // Example milestone checks
    const totalUsage = Object.values(state.featureUsage).reduce((sum, count) => sum + count, 0);
    
    if (totalUsage >= 10 && !state.milestones.find(m => m.id === 'power-user')) {
      newMilestones.push({
        id: 'power-user',
        title: 'Power User',
        description: 'You\'ve used the app 10 times!',
        icon: '💪',
        completedAt: new Date().toISOString(),
        celebrationShown: false,
      });
    }
    
    // Add new milestones to state
    if (newMilestones.length > 0) {
      setState(prev => ({
        ...prev,
        milestones: [...prev.milestones, ...newMilestones],
      }));
      await saveProgressiveData();
    }
    
    return newMilestones;
  }, [state.featureUsage, state.milestones]);

  const celebrateMilestone = useCallback(async (milestoneId: string) => {
    setState(prev => ({
      ...prev,
      milestones: prev.milestones.map(milestone =>
        milestone.id === milestoneId 
          ? { ...milestone, celebrationShown: true }
          : milestone
      ),
    }));
    await saveProgressiveData();
  }, []);

  const addPoints = useCallback(async (points: number, source: string) => {
    setState(prev => {
      const newTotal = prev.totalPoints + points;
      const newLevel = Math.floor(newTotal / 100) + 1; // 100 points per level
      
      return {
        ...prev,
        totalPoints: newTotal,
        userLevel: Math.max(prev.userLevel, newLevel),
      };
    });
    await saveProgressiveData();
  }, []);

  const getCurrentLevel = useCallback((): number => {
    return state.userLevel;
  }, [state.userLevel]);

  const getPointsToNextLevel = useCallback((): number => {
    const pointsForNextLevel = state.userLevel * 100;
    return Math.max(0, pointsForNextLevel - state.totalPoints);
  }, [state.userLevel, state.totalPoints]);

  const updatePreferences = useCallback(async (
    preferences: Partial<ProgressiveDisclosureState['preferences']>
  ) => {
    setState(prev => ({
      ...prev,
      preferences: { ...prev.preferences, ...preferences },
    }));
    await saveProgressiveData();
  }, []);

  const loadProgressiveData = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('progressive_disclosure_data');
      if (stored) {
        const loadedState = JSON.parse(stored);
        setState(prev => ({ ...prev, ...loadedState }));
      }
    } catch (error) {
      console.error('Failed to load progressive disclosure data:', error);
    }
  }, []);

  const saveProgressiveData = useCallback(async () => {
    try {
      await AsyncStorage.setItem('progressive_disclosure_data', JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save progressive disclosure data:', error);
    }
  }, [state]);

  const resetProgress = useCallback(async () => {
    setState(defaultState);
    try {
      await AsyncStorage.removeItem('progressive_disclosure_data');
    } catch (error) {
      console.error('Failed to reset progress:', error);
    }
  }, []);

  // Load data on mount
  React.useEffect(() => {
    loadProgressiveData();
  }, [loadProgressiveData]);

  const contextValue: ProgressiveDisclosureContextType = {
    state,
    getAllFeatures,
    getUnlockedFeatures,
    getLockedFeatures,
    unlockFeature,
    markFeatureDiscovered,
    incrementFeatureUsage,
    isFeatureUnlocked,
    getAllAchievements,
    getUnlockedAchievements,
    checkAchievements,
    unlockAchievement,
    updateAchievementProgress,
    getDiscoveryHints,
    showDiscoveryHint,
    dismissDiscoveryHint,
    triggerFeatureDiscovery,
    getMilestones,
    checkForMilestones,
    celebrateMilestone,
    addPoints,
    getCurrentLevel,
    getPointsToNextLevel,
    updatePreferences,
    loadProgressiveData,
    saveProgressiveData,
    resetProgress,
  };

  return (
    <ProgressiveDisclosureContext.Provider value={contextValue}>
      {children}
    </ProgressiveDisclosureContext.Provider>
  );
};

export default ProgressiveDisclosureProvider;