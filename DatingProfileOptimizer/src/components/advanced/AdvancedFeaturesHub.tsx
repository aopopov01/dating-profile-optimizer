import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  ActivityIndicator,
  Dimensions,
  Platform
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';

// Import all our advanced contexts and components
import { useTheme } from '../../contexts/ThemeContext';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { usePersonalization, useRecommendations } from '../../contexts/PersonalizationContext';
import { useAnalytics } from '../../contexts/AnalyticsContext';

// Import advanced components
import ProfileSharingManager from '../social/ProfileSharingManager';
import SocialIntegrationHub from '../social/SocialIntegrationHub';
import ThemeSelector from '../theme/ThemeSelector';
import AccessibilitySettingsScreen from '../accessibility/AccessibilitySettingsScreen';
import LanguageSelector from '../localization/LanguageSelector';
import OfflineIndicator from '../offline/OfflineIndicator';
import AdvancedSearchEngine from '../search/AdvancedSearchEngine';

// Import services
import OfflineManager from '../../services/OfflineManager';
import CrossPlatformSyncManager from '../../services/CrossPlatformSync';

const { width: screenWidth } = Dimensions.get('window');

interface FeatureCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'social' | 'accessibility' | 'personalization' | 'productivity' | 'system';
  status: 'enabled' | 'disabled' | 'beta' | 'premium';
  component?: React.ComponentType<any>;
  action?: () => void;
  toggle?: boolean;
}

const AdvancedFeaturesHub: React.FC = () => {
  const { theme, colors, setTheme } = useTheme();
  const { 
    getAdjustedFontSize, 
    announceForAccessibility,
    settings: accessibilitySettings 
  } = useAccessibility();
  const { t, currentLanguage, setLanguage } = useLocalization();
  const { 
    preferences, 
    updatePreferences, 
    trackFeatureUsage,
    calculatePersonalizationScore 
  } = usePersonalization();
  const { recommendations } = useRecommendations();
  const { trackEvent } = useAnalytics();

  // State management
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [featureStates, setFeatureStates] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [personalizationScore, setPersonalizationScore] = useState(0);

  // Services
  const offlineManager = OfflineManager.getInstance();
  const syncManager = CrossPlatformSyncManager.getInstance();

  // Advanced features configuration
  const advancedFeatures: FeatureCard[] = [
    {
      id: 'profile_sharing',
      title: 'Profile Sharing',
      description: 'Share your optimized profiles and analytics to social media',
      icon: '📤',
      category: 'social',
      status: 'enabled',
      component: ProfileSharingManager,
      action: () => openFeatureModal('profile_sharing')
    },
    {
      id: 'social_integration',
      title: 'Social Integration',
      description: 'Connect social accounts and share success stories',
      icon: '🔗',
      category: 'social',
      status: 'enabled',
      component: SocialIntegrationHub,
      action: () => openFeatureModal('social_integration')
    },
    {
      id: 'dark_mode',
      title: 'Theme System',
      description: 'Customize app appearance with themes and dark mode',
      icon: '🌙',
      category: 'accessibility',
      status: 'enabled',
      component: ThemeSelector,
      toggle: true,
      action: () => toggleDarkMode()
    },
    {
      id: 'accessibility',
      title: 'Accessibility Features',
      description: 'Screen reader, high contrast, voice guidance, and more',
      icon: '♿',
      category: 'accessibility',
      status: 'enabled',
      component: AccessibilitySettingsScreen,
      action: () => openFeatureModal('accessibility')
    },
    {
      id: 'internationalization',
      title: 'Multi-Language Support',
      description: 'Support for 15+ languages with RTL layout support',
      icon: '🌍',
      category: 'accessibility',
      status: 'enabled',
      component: LanguageSelector,
      action: () => openFeatureModal('language_selector')
    },
    {
      id: 'offline_mode',
      title: 'Offline Functionality',
      description: 'Work offline with automatic sync when connected',
      icon: '📱',
      category: 'system',
      status: 'enabled',
      toggle: true,
      action: () => toggleOfflineMode()
    },
    {
      id: 'advanced_search',
      title: 'Smart Search & Filters',
      description: 'Advanced search with filters, suggestions, and saved searches',
      icon: '🔍',
      category: 'productivity',
      status: 'enabled',
      component: AdvancedSearchEngine,
      action: () => openFeatureModal('advanced_search')
    },
    {
      id: 'personalization',
      title: 'AI Personalization',
      description: 'Adaptive recommendations and personalized experience',
      icon: '🤖',
      category: 'personalization',
      status: 'enabled',
      toggle: true,
      action: () => togglePersonalization()
    },
    {
      id: 'cross_platform_sync',
      title: 'Cross-Platform Sync',
      description: 'Sync data across all your devices securely',
      icon: '☁️',
      category: 'system',
      status: 'beta',
      toggle: true,
      action: () => toggleCrossSync()
    },
    {
      id: 'voice_commands',
      title: 'Voice Commands',
      description: 'Navigate the app using voice commands',
      icon: '🎤',
      category: 'accessibility',
      status: 'beta',
      toggle: true,
      action: () => toggleVoiceCommands()
    },
    {
      id: 'gesture_navigation',
      title: 'Advanced Gestures',
      description: 'Custom gestures for power users',
      icon: '👆',
      category: 'productivity',
      status: 'beta',
      toggle: true,
      action: () => toggleGestureNav()
    },
    {
      id: 'analytics_dashboard',
      title: 'Advanced Analytics',
      description: 'Deep insights into your dating profile performance',
      icon: '📊',
      category: 'productivity',
      status: 'premium',
      action: () => showPremiumPrompt('analytics_dashboard')
    }
  ];

  // Initialize component
  useEffect(() => {
    initializeAdvancedFeatures();
    loadSyncStatus();
    calculatePersonalizationMetrics();
  }, []);

  // Focus effect for announcements
  useFocusEffect(
    useCallback(() => {
      announceForAccessibility(`Advanced Features Hub. ${advancedFeatures.length} features available.`);
    }, [announceForAccessibility, advancedFeatures.length])
  );

  // Initialize advanced features
  const initializeAdvancedFeatures = async () => {
    try {
      setIsLoading(true);
      
      // Load feature states from preferences
      const states: Record<string, boolean> = {
        dark_mode: theme.scheme === 'dark',
        offline_mode: preferences.offlineMode,
        personalization: preferences.smartSuggestions,
        voice_commands: accessibilitySettings.voiceCommandsEnabled,
        gesture_navigation: !accessibilitySettings.simplifiedUIEnabled
      };
      
      setFeatureStates(states);
      
    } catch (error) {
      console.error('Error initializing advanced features:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load sync status
  const loadSyncStatus = async () => {
    try {
      const status = syncManager.getSyncStatus();
      setSyncStatus(status);
      
      // Add sync status listener
      syncManager.addSyncListener(setSyncStatus);
      
    } catch (error) {
      console.error('Error loading sync status:', error);
    }
  };

  // Calculate personalization metrics
  const calculatePersonalizationMetrics = () => {
    const score = calculatePersonalizationScore();
    setPersonalizationScore(score);
  };

  // Open feature modal
  const openFeatureModal = (featureId: string) => {
    setActiveModal(featureId);
    trackFeatureUsage(`advanced_feature_${featureId}`);
    
    trackEvent('advanced_feature_opened', {
      feature_id: featureId,
      timestamp: new Date().toISOString()
    });
  };

  // Close modal
  const closeModal = () => {
    setActiveModal(null);
  };

  // Toggle dark mode
  const toggleDarkMode = async () => {
    const newMode = theme.scheme === 'dark' ? 'light' : 'dark';
    await setTheme(newMode);
    
    setFeatureStates(prev => ({ ...prev, dark_mode: newMode === 'dark' }));
    
    announceForAccessibility(`${newMode} mode enabled`);
    
    trackEvent('dark_mode_toggled', {
      new_mode: newMode,
      source: 'advanced_features_hub'
    });
  };

  // Toggle offline mode
  const toggleOfflineMode = async () => {
    const newState = !featureStates.offline_mode;
    
    await updatePreferences({ offlineMode: newState });
    setFeatureStates(prev => ({ ...prev, offline_mode: newState }));
    
    announceForAccessibility(`Offline mode ${newState ? 'enabled' : 'disabled'}`);
    
    trackEvent('offline_mode_toggled', {
      enabled: newState,
      source: 'advanced_features_hub'
    });
  };

  // Toggle personalization
  const togglePersonalization = async () => {
    const newState = !featureStates.personalization;
    
    await updatePreferences({ smartSuggestions: newState });
    setFeatureStates(prev => ({ ...prev, personalization: newState }));
    
    announceForAccessibility(`AI personalization ${newState ? 'enabled' : 'disabled'}`);
    
    if (newState) {
      calculatePersonalizationMetrics();
    }
    
    trackEvent('personalization_toggled', {
      enabled: newState,
      source: 'advanced_features_hub'
    });
  };

  // Toggle cross-platform sync
  const toggleCrossSync = async () => {
    const newState = !featureStates.cross_platform_sync;
    
    if (newState) {
      Alert.alert(
        'Enable Cross-Platform Sync',
        'This will sync your data across all your devices. Your data will be encrypted and stored securely.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            onPress: async () => {
              try {
                await syncManager.setUser('user_' + Date.now()); // In real app, use actual user ID
                await syncManager.performFullSync();
                
                setFeatureStates(prev => ({ ...prev, cross_platform_sync: true }));
                
                announceForAccessibility('Cross-platform sync enabled');
                
                trackEvent('cross_sync_enabled', {
                  source: 'advanced_features_hub'
                });
              } catch (error) {
                Alert.alert('Error', 'Failed to enable cross-platform sync');
              }
            }
          }
        ]
      );
    } else {
      setFeatureStates(prev => ({ ...prev, cross_platform_sync: false }));
      announceForAccessibility('Cross-platform sync disabled');
    }
  };

  // Toggle voice commands
  const toggleVoiceCommands = async () => {
    const newState = !featureStates.voice_commands;
    
    // This would integrate with the accessibility context
    setFeatureStates(prev => ({ ...prev, voice_commands: newState }));
    
    announceForAccessibility(`Voice commands ${newState ? 'enabled' : 'disabled'}`);
    
    trackEvent('voice_commands_toggled', {
      enabled: newState,
      source: 'advanced_features_hub'
    });
  };

  // Toggle gesture navigation
  const toggleGestureNav = async () => {
    const newState = !featureStates.gesture_navigation;
    
    setFeatureStates(prev => ({ ...prev, gesture_navigation: newState }));
    
    announceForAccessibility(`Advanced gestures ${newState ? 'enabled' : 'disabled'}`);
    
    trackEvent('gesture_nav_toggled', {
      enabled: newState,
      source: 'advanced_features_hub'
    });
  };

  // Show premium prompt
  const showPremiumPrompt = (featureId: string) => {
    Alert.alert(
      'Premium Feature',
      'This feature is available with Dating Profile Optimizer Premium. Upgrade now to unlock advanced analytics and insights.',
      [
        { text: 'Later', style: 'cancel' },
        {
          text: 'Upgrade',
          onPress: () => {
            // Navigate to premium screen
            trackEvent('premium_prompt_shown', {
              feature_id: featureId,
              source: 'advanced_features_hub'
            });
          }
        }
      ]
    );
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'enabled': return colors.success;
      case 'disabled': return colors.textSecondary;
      case 'beta': return colors.warning;
      case 'premium': return colors.primary;
      default: return colors.textSecondary;
    }
  };

  // Get category color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'social': return '#FF6B6B';
      case 'accessibility': return '#4ECDC4';
      case 'personalization': return '#45B7D1';
      case 'productivity': return '#96CEB4';
      case 'system': return '#FFEAA7';
      default: return colors.primary;
    }
  };

  // Render feature card
  const renderFeatureCard = (feature: FeatureCard) => (
    <TouchableOpacity
      key={feature.id}
      style={[styles.featureCard, { 
        backgroundColor: colors.surface,
        borderColor: getCategoryColor(feature.category) + '40'
      }]}
      onPress={feature.action}
      accessibilityRole="button"
      accessibilityLabel={`${feature.title}. ${feature.description}. Status: ${feature.status}`}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.featureIcon}>{feature.icon}</Text>
        
        <View style={styles.cardHeaderText}>
          <Text style={[styles.featureTitle, { color: colors.text }]}>
            {feature.title}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(feature.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(feature.status) }]}>
              {feature.status.toUpperCase()}
            </Text>
          </View>
        </View>
        
        {feature.toggle && (
          <Switch
            value={featureStates[feature.id] || false}
            onValueChange={() => feature.action?.()}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={featureStates[feature.id] ? 'white' : colors.textSecondary}
            accessibilityLabel={`Toggle ${feature.title}`}
          />
        )}
      </View>
      
      <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
        {feature.description}
      </Text>
      
      <View style={[styles.categoryTag, { backgroundColor: getCategoryColor(feature.category) }]}>
        <Text style={styles.categoryText}>{feature.category.replace('_', ' ')}</Text>
      </View>
    </TouchableOpacity>
  );

  // Group features by category
  const featuresByCategory = advancedFeatures.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, FeatureCard[]>);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background
    },
    header: {
      padding: 20,
      backgroundColor: colors.surface
    },
    headerGradient: {
      borderRadius: 16,
      padding: 20,
      marginBottom: 16
    },
    headerTitle: {
      fontSize: getAdjustedFontSize(28),
      fontWeight: 'bold',
      color: 'white',
      marginBottom: 8
    },
    headerSubtitle: {
      fontSize: getAdjustedFontSize(16),
      color: 'rgba(255, 255, 255, 0.9)',
      marginBottom: 16
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between'
    },
    statItem: {
      alignItems: 'center'
    },
    statValue: {
      fontSize: getAdjustedFontSize(24),
      fontWeight: 'bold',
      color: 'white'
    },
    statLabel: {
      fontSize: getAdjustedFontSize(12),
      color: 'rgba(255, 255, 255, 0.8)',
      marginTop: 4
    },
    recommendationsCard: {
      backgroundColor: colors.info + '10',
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.info + '30'
    },
    recommendationsTitle: {
      fontSize: getAdjustedFontSize(16),
      fontWeight: '600',
      color: colors.info,
      marginBottom: 8
    },
    recommendationItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4
    },
    recommendationText: {
      fontSize: getAdjustedFontSize(14),
      color: colors.text,
      marginLeft: 8,
      flex: 1
    },
    scrollView: {
      flex: 1
    },
    content: {
      padding: 16
    },
    categorySection: {
      marginBottom: 24
    },
    categoryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12
    },
    categoryTitle: {
      fontSize: getAdjustedFontSize(20),
      fontWeight: 'bold',
      color: colors.text,
      marginLeft: 12
    },
    categoryIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center'
    },
    featureCard: {
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8
    },
    featureIcon: {
      fontSize: 32,
      marginRight: 12
    },
    cardHeaderText: {
      flex: 1
    },
    featureTitle: {
      fontSize: getAdjustedFontSize(18),
      fontWeight: '600',
      marginBottom: 4
    },
    statusBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12
    },
    statusText: {
      fontSize: getAdjustedFontSize(10),
      fontWeight: 'bold'
    },
    featureDescription: {
      fontSize: getAdjustedFontSize(14),
      lineHeight: getAdjustedFontSize(20),
      marginBottom: 12
    },
    categoryTag: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16
    },
    categoryText: {
      fontSize: getAdjustedFontSize(12),
      fontWeight: '600',
      color: 'white',
      textTransform: 'capitalize'
    },
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center'
    },
    modalContent: {
      backgroundColor: colors.background,
      borderRadius: 20,
      width: '95%',
      maxWidth: 600,
      maxHeight: '90%',
      overflow: 'hidden'
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      backgroundColor: colors.surface
    },
    modalTitle: {
      fontSize: getAdjustedFontSize(20),
      fontWeight: 'bold',
      color: colors.text
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center'
    },
    closeButtonText: {
      fontSize: getAdjustedFontSize(18),
      color: colors.text
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32
    },
    loadingText: {
      marginTop: 16,
      fontSize: getAdjustedFontSize(16),
      color: colors.text
    }
  });

  const categoryIcons = {
    social: '👥',
    accessibility: '♿',
    personalization: '🎯',
    productivity: '⚡',
    system: '⚙️'
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading Advanced Features...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={[colors.primary, colors.primaryVariant]}
          style={styles.headerGradient}
        >
          <Text style={styles.headerTitle}>Advanced Features</Text>
          <Text style={styles.headerSubtitle}>
            Unlock powerful tools and customizations
          </Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{Object.values(featureStates).filter(Boolean).length}</Text>
              <Text style={styles.statLabel}>Active Features</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{personalizationScore}%</Text>
              <Text style={styles.statLabel}>Personalized</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{recommendations.length}</Text>
              <Text style={styles.statLabel}>Suggestions</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <View style={styles.recommendationsCard}>
            <Text style={styles.recommendationsTitle}>💡 Personalized Suggestions</Text>
            {recommendations.slice(0, 2).map((rec, index) => (
              <View key={rec.id} style={styles.recommendationItem}>
                <Text style={styles.recommendationText}>{rec.title}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Offline Indicator */}
      <OfflineIndicator />

      {/* Features List */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {Object.entries(featuresByCategory).map(([category, features]) => (
            <View key={category} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <View style={[styles.categoryIcon, { backgroundColor: getCategoryColor(category) }]}>
                  <Text style={{ fontSize: 20 }}>{categoryIcons[category as keyof typeof categoryIcons] || '⭐'}</Text>
                </View>
                <Text style={styles.categoryTitle}>
                  {category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')}
                </Text>
              </View>
              
              {features.map(renderFeatureCard)}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Feature Modals */}
      {activeModal && (
        <Modal
          visible={!!activeModal}
          transparent
          animationType="slide"
          onRequestClose={closeModal}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {advancedFeatures.find(f => f.id === activeModal)?.title}
                </Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={closeModal}
                  accessibilityRole="button"
                  accessibilityLabel="Close modal"
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              
              {/* Render appropriate component based on active modal */}
              {activeModal === 'profile_sharing' && <ProfileSharingManager profileData={{ id: '1', username: 'demo', bio: 'demo bio', photos: [], analytics: { score: 85, improvements: [], strengths: [] }, metadata: { createdAt: '', lastUpdated: '' } }} />}
              {activeModal === 'social_integration' && <SocialIntegrationHub />}
              {activeModal === 'accessibility' && <AccessibilitySettingsScreen />}
              {activeModal === 'language_selector' && <LanguageSelector />}
              {activeModal === 'advanced_search' && <AdvancedSearchEngine />}
            </View>
          </View>
        )}
      )}
    </View>
  );
};

export default AdvancedFeaturesHub;