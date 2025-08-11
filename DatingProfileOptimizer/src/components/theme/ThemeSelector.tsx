import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Switch,
  Alert,
  Animated,
  Dimensions
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme, ThemeMode } from '../../contexts/ThemeContext';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { useAnalytics } from '../../contexts/AnalyticsContext';

const { width: screenWidth } = Dimensions.get('window');

interface ThemeOption {
  mode: ThemeMode;
  name: string;
  description: string;
  preview: {
    background: string;
    surface: string;
    text: string;
    primary: string;
  };
  icon: string;
  accessibility: string;
}

const ThemeSelector: React.FC = () => {
  const { mode, theme, setTheme, toggleTheme } = useTheme();
  const { accessibilitySettings, updateAccessibilitySettings } = useAccessibility();
  const { trackEvent } = useAnalytics();
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemeMode>(mode);
  const [animationValue] = useState(new Animated.Value(0));

  const themeOptions: ThemeOption[] = [
    {
      mode: 'light',
      name: 'Light',
      description: 'Clean and bright interface',
      preview: {
        background: '#FFFFFF',
        surface: '#F8F9FA',
        text: '#212121',
        primary: '#FF6B6B'
      },
      icon: '☀️',
      accessibility: 'Light theme with standard contrast'
    },
    {
      mode: 'dark',
      name: 'Dark',
      description: 'Easy on the eyes in low light',
      preview: {
        background: '#121212',
        surface: '#1E1E1E',
        text: '#FFFFFF',
        primary: '#FF6B6B'
      },
      icon: '🌙',
      accessibility: 'Dark theme with reduced brightness'
    },
    {
      mode: 'auto',
      name: 'Auto',
      description: 'Follows system setting',
      preview: {
        background: theme.scheme === 'dark' ? '#121212' : '#FFFFFF',
        surface: theme.scheme === 'dark' ? '#1E1E1E' : '#F8F9FA',
        text: theme.scheme === 'dark' ? '#FFFFFF' : '#212121',
        primary: '#FF6B6B'
      },
      icon: '🔄',
      accessibility: 'Automatic theme switching based on system settings'
    },
    {
      mode: 'high_contrast_light',
      name: 'High Contrast Light',
      description: 'Maximum readability for light theme',
      preview: {
        background: '#FFFFFF',
        surface: '#FFFFFF',
        text: '#000000',
        primary: '#000000'
      },
      icon: '🔆',
      accessibility: 'High contrast light theme for better visibility'
    },
    {
      mode: 'high_contrast_dark',
      name: 'High Contrast Dark',
      description: 'Maximum readability for dark theme',
      preview: {
        background: '#000000',
        surface: '#000000',
        text: '#FFFFFF',
        primary: '#FFFFFF'
      },
      icon: '🌑',
      accessibility: 'High contrast dark theme for better visibility'
    }
  ];

  const openModal = () => {
    setIsModalVisible(true);
    Animated.spring(animationValue, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8
    }).start();
  };

  const closeModal = () => {
    Animated.spring(animationValue, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8
    }).start(() => {
      setIsModalVisible(false);
    });
  };

  const selectTheme = (themeMode: ThemeMode) => {
    setSelectedTheme(themeMode);
  };

  const applyTheme = async () => {
    try {
      await setTheme(selectedTheme);
      
      // Track theme change
      trackEvent('theme_changed', {
        previous_theme: mode,
        new_theme: selectedTheme,
        user_initiated: true
      });

      // Show confirmation
      const selectedOption = themeOptions.find(option => option.mode === selectedTheme);
      Alert.alert(
        'Theme Applied',
        `${selectedOption?.name} theme has been applied successfully.`,
        [{ text: 'OK', onPress: closeModal }]
      );
    } catch (error) {
      console.error('Error applying theme:', error);
      Alert.alert('Error', 'Failed to apply theme. Please try again.');
    }
  };

  const toggleHighContrast = (enabled: boolean) => {
    updateAccessibilitySettings({ highContrastEnabled: enabled });
    
    trackEvent('accessibility_setting_changed', {
      setting: 'high_contrast',
      enabled,
      current_theme: mode
    });
  };

  const ThemePreview: React.FC<{ option: ThemeOption; isSelected: boolean }> = ({ 
    option, 
    isSelected 
  }) => (
    <TouchableOpacity
      style={[
        styles.themeOption,
        { borderColor: theme.colors.border },
        isSelected && { borderColor: theme.colors.primary, borderWidth: 3 }
      ]}
      onPress={() => selectTheme(option.mode)}
      accessibilityRole="button"
      accessibilityLabel={`Select ${option.name} theme. ${option.accessibility}`}
      accessibilityState={{ selected: isSelected }}
    >
      <View style={styles.themePreviewContainer}>
        {/* Theme Preview Visual */}
        <View style={[styles.themePreview, { backgroundColor: option.preview.background }]}>
          <View style={[styles.previewHeader, { backgroundColor: option.preview.surface }]}>
            <View style={[styles.previewCircle, { backgroundColor: option.preview.primary }]} />
            <View style={styles.previewLines}>
              <View style={[styles.previewLine, { backgroundColor: option.preview.text }]} />
              <View style={[styles.previewLine, { backgroundColor: option.preview.text, opacity: 0.6, width: '60%' }]} />
            </View>
          </View>
          <View style={styles.previewContent}>
            <View style={[styles.previewBar, { backgroundColor: option.preview.primary }]} />
            <View style={styles.previewText}>
              <View style={[styles.previewLine, { backgroundColor: option.preview.text, width: '80%' }]} />
              <View style={[styles.previewLine, { backgroundColor: option.preview.text, opacity: 0.6, width: '50%' }]} />
              <View style={[styles.previewLine, { backgroundColor: option.preview.text, opacity: 0.4, width: '70%' }]} />
            </View>
          </View>
        </View>

        {/* Theme Info */}
        <View style={styles.themeInfo}>
          <View style={styles.themeHeader}>
            <Text style={styles.themeIcon}>{option.icon}</Text>
            <Text style={[styles.themeName, { color: theme.colors.text }]}>
              {option.name}
            </Text>
          </View>
          <Text style={[styles.themeDescription, { color: theme.colors.textSecondary }]}>
            {option.description}
          </Text>
        </View>

        {/* Selection Indicator */}
        {isSelected && (
          <View style={[styles.selectionIndicator, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.selectionIcon}>✓</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const modalScale = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1]
  });

  const modalOpacity = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1]
  });

  const styles = StyleSheet.create({
    selectorButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    selectorButtonText: {
      marginLeft: 12,
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      flex: 1
    },
    selectorIcon: {
      fontSize: 20
    },
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16
    },
    modalContent: {
      backgroundColor: theme.colors.background,
      borderRadius: 20,
      padding: 24,
      width: '100%',
      maxWidth: 500,
      maxHeight: '90%'
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 8
    },
    modalSubtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24
    },
    themeGrid: {
      marginBottom: 24
    },
    themeOption: {
      borderRadius: 16,
      borderWidth: 2,
      marginBottom: 16,
      overflow: 'hidden'
    },
    themePreviewContainer: {
      position: 'relative'
    },
    themePreview: {
      height: 120,
      borderRadius: 14,
      padding: 12,
      marginBottom: 12
    },
    previewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 32,
      borderRadius: 8,
      paddingHorizontal: 8,
      marginBottom: 8
    },
    previewCircle: {
      width: 16,
      height: 16,
      borderRadius: 8,
      marginRight: 8
    },
    previewLines: {
      flex: 1
    },
    previewLine: {
      height: 3,
      borderRadius: 1.5,
      marginBottom: 4
    },
    previewContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-start'
    },
    previewBar: {
      width: 24,
      height: '100%',
      borderRadius: 4,
      marginRight: 8
    },
    previewText: {
      flex: 1,
      paddingTop: 8
    },
    themeInfo: {
      paddingHorizontal: 16,
      paddingBottom: 16
    },
    themeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4
    },
    themeIcon: {
      fontSize: 20,
      marginRight: 8
    },
    themeName: {
      fontSize: 18,
      fontWeight: '600'
    },
    themeDescription: {
      fontSize: 14,
      lineHeight: 20
    },
    selectionIndicator: {
      position: 'absolute',
      top: 12,
      right: 12,
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center'
    },
    selectionIcon: {
      color: 'white',
      fontSize: 14,
      fontWeight: 'bold'
    },
    accessibilitySection: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 24
    },
    accessibilityTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12
    },
    accessibilityOption: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8
    },
    accessibilityLabel: {
      fontSize: 16,
      color: theme.colors.text,
      flex: 1,
      marginRight: 12
    },
    accessibilityDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 4
    },
    actionButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between'
    },
    button: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginHorizontal: 6
    },
    cancelButton: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    applyButton: {
      backgroundColor: theme.colors.primary
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600'
    },
    cancelButtonText: {
      color: theme.colors.text
    },
    applyButtonText: {
      color: 'white'
    },
    quickToggle: {
      position: 'absolute',
      right: 0,
      top: 0
    },
    toggleButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.colors.border
    },
    toggleIcon: {
      fontSize: 20
    }
  });

  const currentThemeOption = themeOptions.find(option => option.mode === mode);

  return (
    <View>
      {/* Theme Selector Button */}
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={openModal}
        accessibilityRole="button"
        accessibilityLabel={`Current theme: ${currentThemeOption?.name}. Tap to change theme`}
      >
        <Text style={styles.selectorIcon}>{currentThemeOption?.icon}</Text>
        <Text style={styles.selectorButtonText}>
          Theme: {currentThemeOption?.name}
        </Text>
        <Text style={styles.selectorIcon}>⚙️</Text>
      </TouchableOpacity>

      {/* Quick Toggle Button */}
      <View style={styles.quickToggle}>
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={toggleTheme}
          accessibilityRole="button"
          accessibilityLabel="Quick toggle between light and dark theme"
        >
          <Text style={styles.toggleIcon}>
            {theme.scheme === 'dark' ? '☀️' : '🌙'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Theme Selection Modal */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="none"
        onRequestClose={closeModal}
        accessibilityViewIsModal
      >
        <View style={styles.modalContainer}>
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [{ scale: modalScale }],
                opacity: modalOpacity
              }
            ]}
          >
            <Text style={styles.modalTitle}>Choose Theme</Text>
            <Text style={styles.modalSubtitle}>
              Customize your app's appearance
            </Text>

            <ScrollView 
              style={styles.themeGrid}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {themeOptions.map((option) => (
                <ThemePreview
                  key={option.mode}
                  option={option}
                  isSelected={selectedTheme === option.mode}
                />
              ))}
            </ScrollView>

            {/* Accessibility Options */}
            <View style={styles.accessibilitySection}>
              <Text style={styles.accessibilityTitle}>Accessibility</Text>
              
              <View style={styles.accessibilityOption}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.accessibilityLabel}>High Contrast</Text>
                  <Text style={styles.accessibilityDescription}>
                    Enhance text readability with higher contrast colors
                  </Text>
                </View>
                <Switch
                  value={accessibilitySettings.highContrastEnabled}
                  onValueChange={toggleHighContrast}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={accessibilitySettings.highContrastEnabled ? 'white' : theme.colors.textSecondary}
                  accessibilityLabel="Toggle high contrast mode"
                />
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={closeModal}
                accessibilityRole="button"
                accessibilityLabel="Cancel theme selection"
              >
                <Text style={[styles.buttonText, styles.cancelButtonText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.applyButton]}
                onPress={applyTheme}
                disabled={selectedTheme === mode}
                accessibilityRole="button"
                accessibilityLabel={`Apply ${themeOptions.find(o => o.mode === selectedTheme)?.name} theme`}
              >
                <Text style={[styles.buttonText, styles.applyButtonText]}>
                  Apply Theme
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

export default ThemeSelector;