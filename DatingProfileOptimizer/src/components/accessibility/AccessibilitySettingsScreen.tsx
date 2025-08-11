import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Slider,
  Alert,
  Modal,
  Dimensions,
  Platform,
  Vibration,
  Animated
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAccessibility, AccessibilitySettings } from '../../contexts/AccessibilityContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAnalytics } from '../../contexts/AnalyticsContext';
import { useScreenReader } from '../../contexts/AccessibilityContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface SettingCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  settings: SettingItem[];
}

interface SettingItem {
  key: keyof AccessibilitySettings;
  title: string;
  description: string;
  type: 'boolean' | 'slider' | 'select';
  options?: { value: any; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  accessibilityLabel?: string;
  testAction?: () => void;
}

const AccessibilitySettingsScreen: React.FC = () => {
  const { 
    settings, 
    updateAccessibilitySettings, 
    resetAccessibilitySettings,
    systemInfo,
    announceForAccessibility,
    getAdjustedFontSize,
    shouldReduceMotion,
    getColorAdjusted
  } = useAccessibility();
  const { theme, colors } = useTheme();
  const { trackEvent } = useAnalytics();
  const { announce, isEnabled: screenReaderEnabled } = useScreenReader();
  
  const [expandedCategory, setExpandedCategory] = useState<string | null>('visual');
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [currentTestSetting, setCurrentTestSetting] = useState<string | null>(null);
  const [animationValue] = useState(new Animated.Value(0));

  const settingCategories: SettingCategory[] = [
    {
      id: 'visual',
      title: 'Visual Accessibility',
      description: 'Customize visual elements for better readability',
      icon: '👁️',
      settings: [
        {
          key: 'highContrastEnabled',
          title: 'High Contrast',
          description: 'Enhance text and UI element contrast for better visibility',
          type: 'boolean',
          accessibilityLabel: 'Toggle high contrast mode',
          testAction: () => testHighContrast()
        },
        {
          key: 'largeTextEnabled',
          title: 'Large Text',
          description: 'Use larger text sizes throughout the app',
          type: 'boolean',
          accessibilityLabel: 'Enable larger text sizes'
        },
        {
          key: 'boldTextEnabled',
          title: 'Bold Text',
          description: 'Make text bolder for improved readability',
          type: 'boolean',
          accessibilityLabel: 'Enable bold text weight'
        },
        {
          key: 'fontSize',
          title: 'Font Size Scale',
          description: 'Adjust the overall text size (0.8x to 2.0x)',
          type: 'slider',
          min: 0.8,
          max: 2.0,
          step: 0.1,
          accessibilityLabel: 'Adjust font size scaling'
        },
        {
          key: 'lineHeight',
          title: 'Line Spacing',
          description: 'Adjust spacing between lines of text',
          type: 'slider',
          min: 1.0,
          max: 1.8,
          step: 0.1,
          accessibilityLabel: 'Adjust line height spacing'
        },
        {
          key: 'colorBlindnessType',
          title: 'Color Vision',
          description: 'Adjust colors for different types of color vision',
          type: 'select',
          options: [
            { value: 'none', label: 'Normal Vision' },
            { value: 'protanopia', label: 'Protanopia (Red-blind)' },
            { value: 'deuteranopia', label: 'Deuteranopia (Green-blind)' },
            { value: 'tritanopia', label: 'Tritanopia (Blue-blind)' },
            { value: 'monochromacy', label: 'Monochromacy (Color-blind)' }
          ],
          accessibilityLabel: 'Select color vision type'
        }
      ]
    },
    {
      id: 'audio',
      title: 'Audio & Voice',
      description: 'Configure audio feedback and voice guidance',
      icon: '🔊',
      settings: [
        {
          key: 'screenReaderEnabled',
          title: 'Screen Reader Support',
          description: 'Enable enhanced support for screen readers',
          type: 'boolean',
          accessibilityLabel: 'Toggle screen reader support'
        },
        {
          key: 'voiceGuidanceEnabled',
          title: 'Voice Guidance',
          description: 'Provide spoken feedback for actions and navigation',
          type: 'boolean',
          accessibilityLabel: 'Enable voice guidance announcements',
          testAction: () => testVoiceGuidance()
        },
        {
          key: 'soundEffectsEnabled',
          title: 'Sound Effects',
          description: 'Play audio feedback for interactions',
          type: 'boolean',
          accessibilityLabel: 'Toggle sound effects'
        },
        {
          key: 'hapticFeedbackEnabled',
          title: 'Haptic Feedback',
          description: 'Provide vibration feedback for interactions',
          type: 'boolean',
          accessibilityLabel: 'Toggle haptic feedback',
          testAction: () => testHapticFeedback()
        }
      ]
    },
    {
      id: 'motion',
      title: 'Motion & Animation',
      description: 'Control animations and motion effects',
      icon: '🎬',
      settings: [
        {
          key: 'reducedMotionEnabled',
          title: 'Reduce Motion',
          description: 'Minimize or disable animations and transitions',
          type: 'boolean',
          accessibilityLabel: 'Reduce motion and animations'
        },
        {
          key: 'slowAnimationsEnabled',
          title: 'Slow Animations',
          description: 'Make animations play at half speed',
          type: 'boolean',
          accessibilityLabel: 'Enable slower animations'
        }
      ]
    },
    {
      id: 'interaction',
      title: 'Interaction & Navigation',
      description: 'Customize how you interact with the app',
      icon: '👆',
      settings: [
        {
          key: 'touchAccommodationsEnabled',
          title: 'Touch Accommodations',
          description: 'Adjust touch sensitivity and timing',
          type: 'boolean',
          accessibilityLabel: 'Enable touch accommodations'
        },
        {
          key: 'focusIndicatorEnhanced',
          title: 'Enhanced Focus',
          description: 'Show stronger visual focus indicators',
          type: 'boolean',
          accessibilityLabel: 'Enable enhanced focus indicators'
        },
        {
          key: 'tabNavigationOnly',
          title: 'Tab Navigation Only',
          description: 'Navigate using keyboard/switch controls only',
          type: 'boolean',
          accessibilityLabel: 'Enable tab-only navigation'
        },
        {
          key: 'gestureAlternatives',
          title: 'Gesture Alternatives',
          description: 'Provide button alternatives to gesture controls',
          type: 'boolean',
          accessibilityLabel: 'Enable gesture alternatives'
        },
        {
          key: 'simplifiedUIEnabled',
          title: 'Simplified Interface',
          description: 'Use a simplified UI with fewer visual elements',
          type: 'boolean',
          accessibilityLabel: 'Enable simplified user interface'
        }
      ]
    },
    {
      id: 'content',
      title: 'Content & Reading',
      description: 'Adjust content presentation and filtering',
      icon: '📖',
      settings: [
        {
          key: 'readingTimeExtended',
          title: 'Extended Reading Time',
          description: 'Allow more time for reading content',
          type: 'boolean',
          accessibilityLabel: 'Enable extended reading time'
        },
        {
          key: 'contentFiltering',
          title: 'Content Filtering',
          description: 'Filter potentially sensitive content',
          type: 'select',
          options: [
            { value: 'none', label: 'No filtering' },
            { value: 'basic', label: 'Basic filtering' },
            { value: 'strict', label: 'Strict filtering' }
          ],
          accessibilityLabel: 'Select content filtering level'
        }
      ]
    }
  ];

  // Test functions for settings
  const testHighContrast = useCallback(() => {
    setCurrentTestSetting('high_contrast');
    setTestModalVisible(true);
    announce('High contrast test mode activated. Colors will be enhanced for better visibility.');
  }, [announce]);

  const testVoiceGuidance = useCallback(() => {
    announce('Voice guidance is working. You will hear spoken feedback when this feature is enabled.');
  }, [announce]);

  const testHapticFeedback = useCallback(() => {
    if (settings.hapticFeedbackEnabled) {
      Vibration.vibrate([0, 200, 100, 200]);
      announce('Haptic feedback activated. You should feel a vibration pattern.');
    } else {
      announce('Haptic feedback is currently disabled.');
    }
  }, [settings.hapticFeedbackEnabled, announce]);

  // Handle setting change
  const handleSettingChange = useCallback(async (key: keyof AccessibilitySettings, value: any) => {
    try {
      await updateAccessibilitySettings({ [key]: value });
      
      // Provide feedback based on the setting
      let feedbackMessage = '';
      switch (key) {
        case 'highContrastEnabled':
          feedbackMessage = value ? 'High contrast enabled' : 'High contrast disabled';
          break;
        case 'voiceGuidanceEnabled':
          feedbackMessage = value ? 'Voice guidance enabled' : 'Voice guidance disabled';
          break;
        case 'screenReaderEnabled':
          feedbackMessage = value ? 'Screen reader support enabled' : 'Screen reader support disabled';
          break;
        default:
          feedbackMessage = `${key} ${value ? 'enabled' : 'disabled'}`;
      }
      
      announce(feedbackMessage);
      
      // Haptic feedback if enabled
      if (settings.hapticFeedbackEnabled) {
        Vibration.vibrate(50);
      }
      
    } catch (error) {
      console.error('Error updating accessibility setting:', error);
      Alert.alert('Error', 'Failed to update accessibility setting');
    }
  }, [updateAccessibilitySettings, announce, settings.hapticFeedbackEnabled]);

  // Reset all settings
  const handleResetSettings = useCallback(() => {
    Alert.alert(
      'Reset Accessibility Settings',
      'This will reset all accessibility settings to their default values. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetAccessibilitySettings();
            announce('All accessibility settings have been reset to default values');
            
            trackEvent('accessibility_settings_reset', {
              user_initiated: true,
              timestamp: new Date().toISOString()
            });
          }
        }
      ]
    );
  }, [resetAccessibilitySettings, announce, trackEvent]);

  // Toggle category expansion
  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
    announce(`${categoryId} category ${expandedCategory === categoryId ? 'collapsed' : 'expanded'}`);
  }, [expandedCategory, announce]);

  // Render setting item
  const renderSettingItem = useCallback((setting: SettingItem) => {
    const currentValue = settings[setting.key];
    
    return (
      <View key={setting.key} style={styles.settingItem}>
        <View style={styles.settingHeader}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>
              {setting.title}
            </Text>
            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
              {setting.description}
            </Text>
          </View>
          
          {setting.type === 'boolean' && (
            <View style={styles.settingControl}>
              <Switch
                value={currentValue as boolean}
                onValueChange={(value) => handleSettingChange(setting.key, value)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={currentValue ? 'white' : colors.textSecondary}
                accessibilityLabel={setting.accessibilityLabel}
              />
              {setting.testAction && (
                <TouchableOpacity
                  style={[styles.testButton, { backgroundColor: colors.surface }]}
                  onPress={setting.testAction}
                  accessibilityLabel={`Test ${setting.title}`}
                  accessibilityRole="button"
                >
                  <Text style={[styles.testButtonText, { color: colors.primary }]}>Test</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
        
        {setting.type === 'slider' && (
          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={setting.min}
              maximumValue={setting.max}
              step={setting.step}
              value={currentValue as number}
              onValueChange={(value) => handleSettingChange(setting.key, value)}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
              accessibilityLabel={setting.accessibilityLabel}
            />
            <View style={styles.sliderLabels}>
              <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>
                {setting.min}x
              </Text>
              <Text style={[styles.sliderValue, { color: colors.text }]}>
                {(currentValue as number).toFixed(1)}x
              </Text>
              <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>
                {setting.max}x
              </Text>
            </View>
          </View>
        )}
        
        {setting.type === 'select' && setting.options && (
          <View style={styles.selectContainer}>
            {setting.options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.selectOption,
                  { backgroundColor: colors.surface },
                  currentValue === option.value && { backgroundColor: colors.primary }
                ]}
                onPress={() => handleSettingChange(setting.key, option.value)}
                accessibilityLabel={`Select ${option.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected: currentValue === option.value }}
              >
                <Text style={[
                  styles.selectOptionText,
                  { color: currentValue === option.value ? 'white' : colors.text }
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  }, [settings, colors, handleSettingChange]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background
    },
    header: {
      padding: 20,
      backgroundColor: colors.surface
    },
    headerTitle: {
      fontSize: getAdjustedFontSize(24),
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8
    },
    headerSubtitle: {
      fontSize: getAdjustedFontSize(16),
      color: colors.textSecondary,
      marginBottom: 16
    },
    systemInfo: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12
    },
    systemInfoText: {
      fontSize: getAdjustedFontSize(14),
      color: colors.textSecondary
    },
    scrollView: {
      flex: 1,
      padding: 16
    },
    category: {
      marginBottom: 20
    },
    categoryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: 8
    },
    categoryIcon: {
      fontSize: 24,
      marginRight: 12
    },
    categoryInfo: {
      flex: 1
    },
    categoryTitle: {
      fontSize: getAdjustedFontSize(18),
      fontWeight: '600',
      color: colors.text
    },
    categoryDescription: {
      fontSize: getAdjustedFontSize(14),
      color: colors.textSecondary,
      marginTop: 4
    },
    expandIcon: {
      fontSize: 16,
      color: colors.textSecondary
    },
    categoryContent: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16
    },
    settingItem: {
      marginBottom: 20,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider
    },
    settingHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start'
    },
    settingInfo: {
      flex: 1,
      marginRight: 16
    },
    settingTitle: {
      fontSize: getAdjustedFontSize(16),
      fontWeight: settings.boldTextEnabled ? 'bold' : '600',
      marginBottom: 4
    },
    settingDescription: {
      fontSize: getAdjustedFontSize(14),
      lineHeight: getAdjustedFontSize(18)
    },
    settingControl: {
      alignItems: 'center'
    },
    testButton: {
      marginTop: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6
    },
    testButtonText: {
      fontSize: getAdjustedFontSize(12),
      fontWeight: '600'
    },
    sliderContainer: {
      marginTop: 16
    },
    slider: {
      width: '100%',
      height: 40
    },
    sliderLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8
    },
    sliderLabel: {
      fontSize: getAdjustedFontSize(12)
    },
    sliderValue: {
      fontSize: getAdjustedFontSize(14),
      fontWeight: '600'
    },
    selectContainer: {
      marginTop: 12,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8
    },
    selectOption: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      marginBottom: 8
    },
    selectOptionText: {
      fontSize: getAdjustedFontSize(14),
      fontWeight: '500'
    },
    resetButton: {
      backgroundColor: colors.error,
      marginHorizontal: 16,
      marginBottom: 16,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center'
    },
    resetButtonText: {
      color: 'white',
      fontSize: getAdjustedFontSize(16),
      fontWeight: '600'
    },
    testModal: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      justifyContent: 'center',
      alignItems: 'center'
    },
    testModalContent: {
      backgroundColor: colors.background,
      borderRadius: 20,
      padding: 24,
      width: '90%',
      maxWidth: 400
    },
    testModalTitle: {
      fontSize: getAdjustedFontSize(20),
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 16
    },
    testModalText: {
      fontSize: getAdjustedFontSize(16),
      color: colors.text,
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: getAdjustedFontSize(22)
    },
    testModalButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center'
    },
    testModalButtonText: {
      color: 'white',
      fontSize: getAdjustedFontSize(16),
      fontWeight: '600'
    }
  });

  // Focus effect for screen reader announcement
  useFocusEffect(
    useCallback(() => {
      announce('Accessibility Settings screen. Configure accessibility features to customize your experience.');
    }, [announce])
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Accessibility Settings</Text>
        <Text style={styles.headerSubtitle}>
          Customize your experience for better accessibility
        </Text>
        
        {/* System Info */}
        <View style={styles.systemInfo}>
          <Text style={styles.systemInfoText}>
            System: Screen Reader {systemInfo.screenReaderEnabled ? 'ON' : 'OFF'} • 
            Reduce Motion {systemInfo.isReduceMotionEnabled ? 'ON' : 'OFF'}
          </Text>
        </View>
      </View>

      {/* Settings Categories */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {settingCategories.map((category) => (
          <View key={category.id} style={styles.category}>
            <TouchableOpacity
              style={styles.categoryHeader}
              onPress={() => toggleCategory(category.id)}
              accessibilityRole="button"
              accessibilityLabel={`${category.title}. ${category.description}. ${expandedCategory === category.id ? 'Expanded' : 'Collapsed'}`}
              accessibilityState={{ expanded: expandedCategory === category.id }}
            >
              <Text style={styles.categoryIcon}>{category.icon}</Text>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <Text style={styles.categoryDescription}>{category.description}</Text>
              </View>
              <Text style={styles.expandIcon}>
                {expandedCategory === category.id ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>
            
            {expandedCategory === category.id && (
              <View style={styles.categoryContent}>
                {category.settings.map(renderSettingItem)}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Reset Button */}
      <TouchableOpacity
        style={styles.resetButton}
        onPress={handleResetSettings}
        accessibilityRole="button"
        accessibilityLabel="Reset all accessibility settings to default values"
      >
        <Text style={styles.resetButtonText}>Reset All Settings</Text>
      </TouchableOpacity>

      {/* Test Modal */}
      <Modal
        visible={testModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTestModalVisible(false)}
      >
        <View style={styles.testModal}>
          <View style={styles.testModalContent}>
            <Text style={styles.testModalTitle}>Accessibility Test</Text>
            <Text style={styles.testModalText}>
              This is a test of the high contrast feature. Notice how the text and interface elements 
              have enhanced contrast for better visibility.
            </Text>
            <TouchableOpacity
              style={styles.testModalButton}
              onPress={() => setTestModalVisible(false)}
              accessibilityLabel="Close test modal"
              accessibilityRole="button"
            >
              <Text style={styles.testModalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default AccessibilitySettingsScreen;