import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  TextInput,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalization, SupportedLanguage, LANGUAGE_CONFIGS } from '../../contexts/LocalizationContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { useAnalytics } from '../../contexts/AnalyticsContext';

const { width: screenWidth } = Dimensions.get('window');

const LanguageSelector: React.FC = () => {
  const { 
    currentLanguage, 
    availableLanguages, 
    setLanguage, 
    isLoading, 
    t, 
    getLanguageConfig,
    detectSystemLanguage,
    isRTL 
  } = useLocalization();
  const { theme, colors } = useTheme();
  const { getAdjustedFontSize, announceForAccessibility } = useAccessibility();
  const { trackEvent } = useAnalytics();
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(currentLanguage);
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);

  // Filter languages based on search query
  const filteredLanguages = availableLanguages.filter(lang => 
    lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lang.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle language selection
  const handleLanguageSelect = useCallback((language: SupportedLanguage) => {
    setSelectedLanguage(language);
    
    // Announce selection for screen readers
    const config = LANGUAGE_CONFIGS[language];
    announceForAccessibility(`Selected ${config.name} language`);
  }, [announceForAccessibility]);

  // Apply language change
  const applyLanguageChange = useCallback(async () => {
    if (selectedLanguage === currentLanguage) {
      setIsModalVisible(false);
      return;
    }

    try {
      setIsChangingLanguage(true);
      
      const config = LANGUAGE_CONFIGS[selectedLanguage];
      
      // Show RTL warning if applicable
      if (config.isRTL !== isRTL) {
        Alert.alert(
          t('settings.language'),
          `Changing to ${config.name} will ${config.isRTL ? 'enable' : 'disable'} right-to-left layout. The app will need to restart to apply this change.`,
          [
            { 
              text: t('common.cancel'), 
              style: 'cancel',
              onPress: () => setIsChangingLanguage(false)
            },
            {
              text: t('common.ok'),
              onPress: async () => {
                await setLanguage(selectedLanguage);
                setIsModalVisible(false);
                setIsChangingLanguage(false);
                
                announceForAccessibility(`Language changed to ${config.name}`);
              }
            }
          ]
        );
      } else {
        await setLanguage(selectedLanguage);
        setIsModalVisible(false);
        setIsChangingLanguage(false);
        
        announceForAccessibility(`Language changed to ${config.name}`);
      }
      
    } catch (error) {
      console.error('Error changing language:', error);
      setIsChangingLanguage(false);
      Alert.alert(t('common.error'), 'Failed to change language');
    }
  }, [selectedLanguage, currentLanguage, setLanguage, t, isRTL, announceForAccessibility]);

  // Use system language
  const useSystemLanguage = useCallback(async () => {
    const systemLanguage = detectSystemLanguage();
    setSelectedLanguage(systemLanguage);
    
    trackEvent('language_system_detected', {
      detected_language: systemLanguage,
      current_language: currentLanguage
    });
    
    announceForAccessibility(`System language detected: ${LANGUAGE_CONFIGS[systemLanguage].name}`);
  }, [detectSystemLanguage, currentLanguage, trackEvent, announceForAccessibility]);

  // Open modal
  const openModal = useCallback(() => {
    setIsModalVisible(true);
    setSelectedLanguage(currentLanguage);
    setSearchQuery('');
    
    announceForAccessibility('Language selection modal opened');
  }, [currentLanguage, announceForAccessibility]);

  // Close modal
  const closeModal = useCallback(() => {
    setIsModalVisible(false);
    setSearchQuery('');
    setSelectedLanguage(currentLanguage);
    
    announceForAccessibility('Language selection modal closed');
  }, [currentLanguage, announceForAccessibility]);

  // Language item component
  const LanguageItem: React.FC<{ language: typeof availableLanguages[0] }> = ({ language }) => {
    const isSelected = selectedLanguage === language.code;
    const isCurrent = currentLanguage === language.code;
    
    return (
      <TouchableOpacity
        style={[
          styles.languageItem,
          { borderColor: colors.border },
          isSelected && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
        ]}
        onPress={() => handleLanguageSelect(language.code)}
        accessibilityRole="button"
        accessibilityLabel={`Select ${language.name} language. Native name: ${language.nativeName}. ${language.isRTL ? 'Right-to-left language.' : ''} ${isCurrent ? 'Currently selected.' : ''}`}
        accessibilityState={{ selected: isSelected }}
      >
        <View style={styles.languageFlag}>
          <Text style={styles.flagEmoji}>{language.flag}</Text>
        </View>
        
        <View style={[styles.languageInfo, isRTL && { alignItems: 'flex-end' }]}>
          <Text style={[
            styles.languageName, 
            { color: colors.text },
            isSelected && { fontWeight: 'bold' }
          ]}>
            {language.name}
          </Text>
          <Text style={[
            styles.languageNative, 
            { color: colors.textSecondary },
            isSelected && { color: colors.primary }
          ]}>
            {language.nativeName}
          </Text>
          {language.isRTL && (
            <Text style={[styles.rtlIndicator, { color: colors.primary }]}>
              RTL
            </Text>
          )}
        </View>
        
        <View style={styles.languageActions}>
          {isCurrent && (
            <View style={[styles.currentIndicator, { backgroundColor: colors.success }]}>
              <Text style={styles.currentText}>Current</Text>
            </View>
          )}
          
          {isSelected && (
            <View style={[styles.selectedIndicator, { backgroundColor: colors.primary }]}>
              <Text style={styles.selectedText}>✓</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const currentConfig = getLanguageConfig();

  const styles = StyleSheet.create({
    selectorButton: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border
    },
    flagContainer: {
      marginRight: isRTL ? 0 : 12,
      marginLeft: isRTL ? 12 : 0
    },
    flagEmoji: {
      fontSize: 24
    },
    selectorInfo: {
      flex: 1,
      alignItems: isRTL ? 'flex-end' : 'flex-start'
    },
    selectorText: {
      fontSize: getAdjustedFontSize(16),
      fontWeight: '600',
      color: colors.text
    },
    selectorSubtext: {
      fontSize: getAdjustedFontSize(14),
      color: colors.textSecondary,
      marginTop: 2
    },
    chevron: {
      fontSize: 16,
      color: colors.textSecondary,
      transform: [{ scaleX: isRTL ? -1 : 1 }]
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
      padding: 20,
      width: '95%',
      maxWidth: 500,
      maxHeight: '90%'
    },
    modalHeader: {
      alignItems: 'center',
      marginBottom: 20
    },
    modalTitle: {
      fontSize: getAdjustedFontSize(24),
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8
    },
    modalSubtitle: {
      fontSize: getAdjustedFontSize(16),
      color: colors.textSecondary,
      textAlign: 'center'
    },
    searchContainer: {
      marginBottom: 16
    },
    searchInput: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      fontSize: getAdjustedFontSize(16),
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      textAlign: isRTL ? 'right' : 'left'
    },
    systemLanguageButton: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 12,
      alignItems: 'center',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border
    },
    systemLanguageText: {
      fontSize: getAdjustedFontSize(14),
      fontWeight: '600',
      color: colors.primary
    },
    languagesList: {
      maxHeight: screenWidth * 0.8
    },
    languageItem: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 8
    },
    languageFlag: {
      marginRight: isRTL ? 0 : 12,
      marginLeft: isRTL ? 12 : 0
    },
    languageInfo: {
      flex: 1,
      alignItems: isRTL ? 'flex-end' : 'flex-start'
    },
    languageName: {
      fontSize: getAdjustedFontSize(16),
      fontWeight: '600'
    },
    languageNative: {
      fontSize: getAdjustedFontSize(14),
      marginTop: 2
    },
    rtlIndicator: {
      fontSize: getAdjustedFontSize(12),
      fontWeight: '600',
      marginTop: 4
    },
    languageActions: {
      alignItems: 'center'
    },
    currentIndicator: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginBottom: 4
    },
    currentText: {
      color: 'white',
      fontSize: getAdjustedFontSize(10),
      fontWeight: '600'
    },
    selectedIndicator: {
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center'
    },
    selectedText: {
      color: 'white',
      fontSize: getAdjustedFontSize(14),
      fontWeight: 'bold'
    },
    modalActions: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      marginTop: 20
    },
    actionButton: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginHorizontal: 6
    },
    cancelButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border
    },
    applyButton: {
      backgroundColor: colors.primary
    },
    buttonText: {
      fontSize: getAdjustedFontSize(16),
      fontWeight: '600'
    },
    cancelButtonText: {
      color: colors.text
    },
    applyButtonText: {
      color: 'white'
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center'
    },
    loadingText: {
      marginLeft: isRTL ? 0 : 12,
      marginRight: isRTL ? 12 : 0,
      fontSize: getAdjustedFontSize(14),
      color: colors.text
    },
    emptyState: {
      alignItems: 'center',
      padding: 32
    },
    emptyStateText: {
      fontSize: getAdjustedFontSize(16),
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 16
    }
  });

  // Focus effect for screen reader announcement
  useFocusEffect(
    useCallback(() => {
      if (isModalVisible) {
        announceForAccessibility(`Language selector opened. Current language: ${currentConfig.name}. ${filteredLanguages.length} languages available.`);
      }
    }, [isModalVisible, currentConfig.name, filteredLanguages.length, announceForAccessibility])
  );

  return (
    <View>
      {/* Language Selector Button */}
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={openModal}
        accessibilityRole="button"
        accessibilityLabel={`Current language: ${currentConfig.name}. Tap to change language.`}
        accessibilityHint="Opens language selection menu"
      >
        <View style={styles.flagContainer}>
          <Text style={styles.flagEmoji}>{currentConfig.flag}</Text>
        </View>
        
        <View style={styles.selectorInfo}>
          <Text style={styles.selectorText}>
            {currentConfig.name}
          </Text>
          <Text style={styles.selectorSubtext}>
            {currentConfig.nativeName}
            {currentConfig.isRTL && ' • RTL'}
          </Text>
        </View>
        
        <Text style={styles.chevron}>▶</Text>
      </TouchableOpacity>

      {/* Language Selection Modal */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
        accessibilityViewIsModal
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t('settings.language')}
              </Text>
              <Text style={styles.modalSubtitle}>
                Choose your preferred language
              </Text>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder={t('common.search')}
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                accessibilityLabel="Search languages"
                accessibilityHint="Type to filter available languages"
              />
            </View>

            {/* System Language Button */}
            <TouchableOpacity
              style={styles.systemLanguageButton}
              onPress={useSystemLanguage}
              accessibilityRole="button"
              accessibilityLabel="Use system language"
              accessibilityHint="Automatically detect and use your device's language"
            >
              <Text style={styles.systemLanguageText}>
                🔍 Use System Language
              </Text>
            </TouchableOpacity>

            {/* Languages List */}
            {filteredLanguages.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 48 }}>🔍</Text>
                <Text style={styles.emptyStateText}>
                  No languages found matching "{searchQuery}"
                </Text>
              </View>
            ) : (
              <ScrollView 
                style={styles.languagesList}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 16 }}
              >
                {filteredLanguages.map((language) => (
                  <LanguageItem key={language.code} language={language} />
                ))}
              </ScrollView>
            )}

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={closeModal}
                accessibilityRole="button"
                accessibilityLabel="Cancel language selection"
              >
                <Text style={[styles.buttonText, styles.cancelButtonText]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.applyButton]}
                onPress={applyLanguageChange}
                disabled={selectedLanguage === currentLanguage || isChangingLanguage}
                accessibilityRole="button"
                accessibilityLabel={`Apply ${LANGUAGE_CONFIGS[selectedLanguage]?.name} language`}
              >
                {isChangingLanguage ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="white" />
                    <Text style={[styles.buttonText, styles.applyButtonText, styles.loadingText]}>
                      Changing...
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.buttonText, styles.applyButtonText]}>
                    {selectedLanguage === currentLanguage ? 'Selected' : 'Apply'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0, 0, 0, 0.3)', justifyContent: 'center', alignItems: 'center' }]}>
          <View style={{ backgroundColor: colors.background, borderRadius: 12, padding: 20, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: 12, fontSize: getAdjustedFontSize(16), color: colors.text }}>
              Loading translations...
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default LanguageSelector;