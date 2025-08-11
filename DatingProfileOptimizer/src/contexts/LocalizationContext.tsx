import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { I18nManager, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNLocalize from 'react-native-localize';
import { useAnalytics } from './AnalyticsContext';

// Supported languages
export type SupportedLanguage = 
  | 'en' // English
  | 'es' // Spanish
  | 'fr' // French
  | 'de' // German
  | 'it' // Italian
  | 'pt' // Portuguese
  | 'ru' // Russian
  | 'ja' // Japanese
  | 'ko' // Korean
  | 'zh' // Chinese (Simplified)
  | 'ar' // Arabic
  | 'he' // Hebrew
  | 'hi' // Hindi
  | 'th' // Thai
  | 'vi'; // Vietnamese

// RTL languages
export const RTL_LANGUAGES: SupportedLanguage[] = ['ar', 'he'];

// Language configurations
export interface LanguageConfig {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  isRTL: boolean;
  flag: string;
  region: string;
  currency: string;
  dateFormat: string;
  timeFormat: string;
  weekStartDay: number; // 0 = Sunday, 1 = Monday
}

export const LANGUAGE_CONFIGS: Record<SupportedLanguage, LanguageConfig> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    isRTL: false,
    flag: '🇺🇸',
    region: 'US',
    currency: 'USD',
    dateFormat: 'MM/dd/yyyy',
    timeFormat: '12h',
    weekStartDay: 0
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    isRTL: false,
    flag: '🇪🇸',
    region: 'ES',
    currency: 'EUR',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '24h',
    weekStartDay: 1
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    isRTL: false,
    flag: '🇫🇷',
    region: 'FR',
    currency: 'EUR',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '24h',
    weekStartDay: 1
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    isRTL: false,
    flag: '🇩🇪',
    region: 'DE',
    currency: 'EUR',
    dateFormat: 'dd.MM.yyyy',
    timeFormat: '24h',
    weekStartDay: 1
  },
  it: {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    isRTL: false,
    flag: '🇮🇹',
    region: 'IT',
    currency: 'EUR',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '24h',
    weekStartDay: 1
  },
  pt: {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    isRTL: false,
    flag: '🇧🇷',
    region: 'BR',
    currency: 'BRL',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '24h',
    weekStartDay: 0
  },
  ru: {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    isRTL: false,
    flag: '🇷🇺',
    region: 'RU',
    currency: 'RUB',
    dateFormat: 'dd.MM.yyyy',
    timeFormat: '24h',
    weekStartDay: 1
  },
  ja: {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    isRTL: false,
    flag: '🇯🇵',
    region: 'JP',
    currency: 'JPY',
    dateFormat: 'yyyy/MM/dd',
    timeFormat: '24h',
    weekStartDay: 0
  },
  ko: {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    isRTL: false,
    flag: '🇰🇷',
    region: 'KR',
    currency: 'KRW',
    dateFormat: 'yyyy.MM.dd',
    timeFormat: '12h',
    weekStartDay: 0
  },
  zh: {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    isRTL: false,
    flag: '🇨🇳',
    region: 'CN',
    currency: 'CNY',
    dateFormat: 'yyyy/MM/dd',
    timeFormat: '24h',
    weekStartDay: 1
  },
  ar: {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    isRTL: true,
    flag: '🇸🇦',
    region: 'SA',
    currency: 'SAR',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '12h',
    weekStartDay: 6
  },
  he: {
    code: 'he',
    name: 'Hebrew',
    nativeName: 'עברית',
    isRTL: true,
    flag: '🇮🇱',
    region: 'IL',
    currency: 'ILS',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '24h',
    weekStartDay: 0
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    isRTL: false,
    flag: '🇮🇳',
    region: 'IN',
    currency: 'INR',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '12h',
    weekStartDay: 0
  },
  th: {
    code: 'th',
    name: 'Thai',
    nativeName: 'ไทย',
    isRTL: false,
    flag: '🇹🇭',
    region: 'TH',
    currency: 'THB',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '24h',
    weekStartDay: 0
  },
  vi: {
    code: 'vi',
    name: 'Vietnamese',
    nativeName: 'Tiếng Việt',
    isRTL: false,
    flag: '🇻🇳',
    region: 'VN',
    currency: 'VND',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '24h',
    weekStartDay: 1
  }
};

// Translation keys interface
export interface TranslationKeys {
  // Common
  'common.ok': string;
  'common.cancel': string;
  'common.yes': string;
  'common.no': string;
  'common.save': string;
  'common.delete': string;
  'common.edit': string;
  'common.add': string;
  'common.loading': string;
  'common.error': string;
  'common.success': string;
  'common.retry': string;
  'common.back': string;
  'common.next': string;
  'common.skip': string;
  'common.done': string;
  'common.close': string;
  'common.search': string;
  'common.settings': string;
  'common.help': string;
  'common.share': string;
  
  // Authentication
  'auth.login': string;
  'auth.register': string;
  'auth.logout': string;
  'auth.forgotPassword': string;
  'auth.email': string;
  'auth.password': string;
  'auth.confirmPassword': string;
  'auth.loginButton': string;
  'auth.registerButton': string;
  'auth.loginSuccess': string;
  'auth.loginError': string;
  'auth.passwordResetSent': string;
  
  // Profile
  'profile.title': string;
  'profile.editProfile': string;
  'profile.uploadPhoto': string;
  'profile.bio': string;
  'profile.age': string;
  'profile.location': string;
  'profile.interests': string;
  'profile.saveProfile': string;
  'profile.profileSaved': string;
  
  // Photo Analysis
  'analysis.title': string;
  'analysis.analyzing': string;
  'analysis.score': string;
  'analysis.recommendations': string;
  'analysis.strengths': string;
  'analysis.improvements': string;
  'analysis.retakePhoto': string;
  'analysis.shareResults': string;
  
  // Bio Generation
  'bio.title': string;
  'bio.generating': string;
  'bio.generated': string;
  'bio.regenerate': string;
  'bio.useBio': string;
  'bio.customizeBio': string;
  
  // Settings
  'settings.title': string;
  'settings.language': string;
  'settings.theme': string;
  'settings.notifications': string;
  'settings.accessibility': string;
  'settings.privacy': string;
  'settings.about': string;
  'settings.version': string;
  
  // Accessibility
  'accessibility.title': string;
  'accessibility.highContrast': string;
  'accessibility.largeText': string;
  'accessibility.voiceGuidance': string;
  'accessibility.screenReader': string;
  'accessibility.reducedMotion': string;
  
  // Errors
  'error.networkError': string;
  'error.serverError': string;
  'error.validationError': string;
  'error.photoUploadError': string;
  'error.bioGenerationError': string;
  'error.analysisError': string;
  
  // Success Messages
  'success.profileUpdated': string;
  'success.photoUploaded': string;
  'success.bioGenerated': string;
  'success.settingsSaved': string;
  
  // Onboarding
  'onboarding.welcome': string;
  'onboarding.getStarted': string;
  'onboarding.step1Title': string;
  'onboarding.step1Description': string;
  'onboarding.step2Title': string;
  'onboarding.step2Description': string;
  'onboarding.step3Title': string;
  'onboarding.step3Description': string;
}

// Localization state
interface LocalizationState {
  currentLanguage: SupportedLanguage;
  isRTL: boolean;
  translations: Partial<TranslationKeys>;
  isLoading: boolean;
  availableLanguages: LanguageConfig[];
}

// Localization actions
type LocalizationAction = 
  | { type: 'SET_LANGUAGE'; payload: SupportedLanguage }
  | { type: 'SET_TRANSLATIONS'; payload: Partial<TranslationKeys> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_RTL'; payload: boolean };

// Localization context interface
interface LocalizationContextType extends LocalizationState {
  setLanguage: (language: SupportedLanguage) => Promise<void>;
  t: (key: keyof TranslationKeys, params?: Record<string, string>) => string;
  formatDate: (date: Date) => string;
  formatTime: (date: Date) => string;
  formatCurrency: (amount: number) => string;
  formatNumber: (number: number) => string;
  getLanguageConfig: (language?: SupportedLanguage) => LanguageConfig;
  detectSystemLanguage: () => SupportedLanguage;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

// Default translations (English)
const defaultTranslations: TranslationKeys = {
  // Common
  'common.ok': 'OK',
  'common.cancel': 'Cancel',
  'common.yes': 'Yes',
  'common.no': 'No',
  'common.save': 'Save',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.add': 'Add',
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.success': 'Success',
  'common.retry': 'Retry',
  'common.back': 'Back',
  'common.next': 'Next',
  'common.skip': 'Skip',
  'common.done': 'Done',
  'common.close': 'Close',
  'common.search': 'Search',
  'common.settings': 'Settings',
  'common.help': 'Help',
  'common.share': 'Share',
  
  // Authentication
  'auth.login': 'Log In',
  'auth.register': 'Sign Up',
  'auth.logout': 'Log Out',
  'auth.forgotPassword': 'Forgot Password?',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.confirmPassword': 'Confirm Password',
  'auth.loginButton': 'Log In',
  'auth.registerButton': 'Create Account',
  'auth.loginSuccess': 'Successfully logged in!',
  'auth.loginError': 'Invalid email or password',
  'auth.passwordResetSent': 'Password reset email sent',
  
  // Profile
  'profile.title': 'Profile',
  'profile.editProfile': 'Edit Profile',
  'profile.uploadPhoto': 'Upload Photo',
  'profile.bio': 'Bio',
  'profile.age': 'Age',
  'profile.location': 'Location',
  'profile.interests': 'Interests',
  'profile.saveProfile': 'Save Profile',
  'profile.profileSaved': 'Profile saved successfully!',
  
  // Photo Analysis
  'analysis.title': 'Photo Analysis',
  'analysis.analyzing': 'Analyzing your photo...',
  'analysis.score': 'Score',
  'analysis.recommendations': 'Recommendations',
  'analysis.strengths': 'Strengths',
  'analysis.improvements': 'Areas to Improve',
  'analysis.retakePhoto': 'Retake Photo',
  'analysis.shareResults': 'Share Results',
  
  // Bio Generation
  'bio.title': 'Bio Generator',
  'bio.generating': 'Generating your bio...',
  'bio.generated': 'Bio Generated!',
  'bio.regenerate': 'Generate New Bio',
  'bio.useBio': 'Use This Bio',
  'bio.customizeBio': 'Customize Bio',
  
  // Settings
  'settings.title': 'Settings',
  'settings.language': 'Language',
  'settings.theme': 'Theme',
  'settings.notifications': 'Notifications',
  'settings.accessibility': 'Accessibility',
  'settings.privacy': 'Privacy',
  'settings.about': 'About',
  'settings.version': 'Version',
  
  // Accessibility
  'accessibility.title': 'Accessibility',
  'accessibility.highContrast': 'High Contrast',
  'accessibility.largeText': 'Large Text',
  'accessibility.voiceGuidance': 'Voice Guidance',
  'accessibility.screenReader': 'Screen Reader',
  'accessibility.reducedMotion': 'Reduce Motion',
  
  // Errors
  'error.networkError': 'Network connection error. Please check your internet connection.',
  'error.serverError': 'Server error. Please try again later.',
  'error.validationError': 'Please check your input and try again.',
  'error.photoUploadError': 'Failed to upload photo. Please try again.',
  'error.bioGenerationError': 'Failed to generate bio. Please try again.',
  'error.analysisError': 'Failed to analyze photo. Please try again.',
  
  // Success Messages
  'success.profileUpdated': 'Profile updated successfully!',
  'success.photoUploaded': 'Photo uploaded successfully!',
  'success.bioGenerated': 'Bio generated successfully!',
  'success.settingsSaved': 'Settings saved successfully!',
  
  // Onboarding
  'onboarding.welcome': 'Welcome to Dating Profile Optimizer!',
  'onboarding.getStarted': 'Get Started',
  'onboarding.step1Title': 'Upload Your Photo',
  'onboarding.step1Description': 'Start by uploading your best dating photo for AI analysis.',
  'onboarding.step2Title': 'Get AI Analysis',
  'onboarding.step2Description': 'Our AI will analyze your photo and provide personalized feedback.',
  'onboarding.step3Title': 'Generate Perfect Bio',
  'onboarding.step3Description': 'Create the perfect bio based on your photo and personality.'
};

// Localization reducer
const localizationReducer = (state: LocalizationState, action: LocalizationAction): LocalizationState => {
  switch (action.type) {
    case 'SET_LANGUAGE':
      const config = LANGUAGE_CONFIGS[action.payload];
      return {
        ...state,
        currentLanguage: action.payload,
        isRTL: config.isRTL
      };
    case 'SET_TRANSLATIONS':
      return {
        ...state,
        translations: action.payload
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
    case 'SET_RTL':
      return {
        ...state,
        isRTL: action.payload
      };
    default:
      return state;
  }
};

// Translation loading function
const loadTranslations = async (language: SupportedLanguage): Promise<Partial<TranslationKeys>> => {
  try {
    // In a real app, you'd load from files or API
    // For now, return default translations for all languages
    // You would implement actual translation loading here
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return appropriate translations based on language
    // This is where you'd load from your translation files
    return defaultTranslations;
    
  } catch (error) {
    console.error('Error loading translations:', error);
    return defaultTranslations;
  }
};

// Localization provider component
interface LocalizationProviderProps {
  children: ReactNode;
}

export const LocalizationProvider: React.FC<LocalizationProviderProps> = ({ children }) => {
  const { trackEvent } = useAnalytics();
  
  const [state, dispatch] = useReducer(localizationReducer, {
    currentLanguage: 'en',
    isRTL: false,
    translations: defaultTranslations,
    isLoading: false,
    availableLanguages: Object.values(LANGUAGE_CONFIGS)
  });

  // Detect system language
  const detectSystemLanguage = (): SupportedLanguage => {
    const deviceLocales = RNLocalize.getLocales();
    
    for (const locale of deviceLocales) {
      const languageCode = locale.languageCode as SupportedLanguage;
      if (LANGUAGE_CONFIGS[languageCode]) {
        return languageCode;
      }
    }
    
    // Fallback to English
    return 'en';
  };

  // Load saved language on app start
  useEffect(() => {
    const loadSavedLanguage = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        const savedLanguage = await AsyncStorage.getItem('userLanguage');
        const language: SupportedLanguage = savedLanguage as SupportedLanguage || detectSystemLanguage();
        
        // Load translations
        const translations = await loadTranslations(language);
        
        // Set language and RTL
        dispatch({ type: 'SET_LANGUAGE', payload: language });
        dispatch({ type: 'SET_TRANSLATIONS', payload: translations });
        
        // Configure RTL if needed
        const config = LANGUAGE_CONFIGS[language];
        if (config.isRTL !== I18nManager.isRTL) {
          I18nManager.forceRTL(config.isRTL);
          
          // Show restart prompt for RTL change
          if (Platform.OS === 'android') {
            Alert.alert(
              'Language Changed',
              'Please restart the app for the language change to take effect.',
              [{ text: 'OK' }]
            );
          }
        }
        
        dispatch({ type: 'SET_RTL', payload: config.isRTL });
        
      } catch (error) {
        console.error('Error loading saved language:', error);
        dispatch({ type: 'SET_TRANSLATIONS', payload: defaultTranslations });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadSavedLanguage();
  }, []);

  // Set language
  const setLanguage = async (language: SupportedLanguage) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Save to storage
      await AsyncStorage.setItem('userLanguage', language);
      
      // Load translations
      const translations = await loadTranslations(language);
      
      // Update state
      dispatch({ type: 'SET_LANGUAGE', payload: language });
      dispatch({ type: 'SET_TRANSLATIONS', payload: translations });
      
      // Configure RTL
      const config = LANGUAGE_CONFIGS[language];
      if (config.isRTL !== I18nManager.isRTL) {
        I18nManager.forceRTL(config.isRTL);
        
        // Show restart prompt for RTL change
        Alert.alert(
          'Language Changed',
          'Please restart the app for the language change to take effect.',
          [{ text: 'OK' }]
        );
      }
      
      dispatch({ type: 'SET_RTL', payload: config.isRTL });
      
      // Track language change
      trackEvent('language_changed', {
        from_language: state.currentLanguage,
        to_language: language,
        is_rtl: config.isRTL,
        user_initiated: true
      });
      
    } catch (error) {
      console.error('Error setting language:', error);
      Alert.alert('Error', 'Failed to change language');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Translation function with parameter support
  const t = (key: keyof TranslationKeys, params?: Record<string, string>): string => {
    let translation = state.translations[key] || defaultTranslations[key] || key;
    
    // Replace parameters
    if (params) {
      Object.keys(params).forEach(paramKey => {
        translation = translation.replace(`{${paramKey}}`, params[paramKey]);
      });
    }
    
    return translation;
  };

  // Format date according to current locale
  const formatDate = (date: Date): string => {
    const config = LANGUAGE_CONFIGS[state.currentLanguage];
    const locale = `${state.currentLanguage}-${config.region}`;
    
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  };

  // Format time according to current locale
  const formatTime = (date: Date): string => {
    const config = LANGUAGE_CONFIGS[state.currentLanguage];
    const locale = `${state.currentLanguage}-${config.region}`;
    
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: config.timeFormat === '12h'
    }).format(date);
  };

  // Format currency according to current locale
  const formatCurrency = (amount: number): string => {
    const config = LANGUAGE_CONFIGS[state.currentLanguage];
    const locale = `${state.currentLanguage}-${config.region}`;
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: config.currency
    }).format(amount);
  };

  // Format number according to current locale
  const formatNumber = (number: number): string => {
    const config = LANGUAGE_CONFIGS[state.currentLanguage];
    const locale = `${state.currentLanguage}-${config.region}`;
    
    return new Intl.NumberFormat(locale).format(number);
  };

  // Get language configuration
  const getLanguageConfig = (language?: SupportedLanguage): LanguageConfig => {
    return LANGUAGE_CONFIGS[language || state.currentLanguage];
  };

  const contextValue: LocalizationContextType = {
    ...state,
    setLanguage,
    t,
    formatDate,
    formatTime,
    formatCurrency,
    formatNumber,
    getLanguageConfig,
    detectSystemLanguage
  };

  return (
    <LocalizationContext.Provider value={contextValue}>
      {children}
    </LocalizationContext.Provider>
  );
};

// Custom hook for using localization
export const useLocalization = (): LocalizationContextType => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
};

// Utility hooks
export const useTranslation = () => {
  const { t } = useLocalization();
  return { t };
};

export const useRTL = () => {
  const { isRTL } = useLocalization();
  return { 
    isRTL,
    rtlStyle: (ltrStyle: any, rtlStyle: any) => isRTL ? rtlStyle : ltrStyle,
    flipHorizontally: (style: any) => isRTL ? { ...style, transform: [{ scaleX: -1 }] } : style
  };
};

export const useLocaleFormatting = () => {
  const { formatDate, formatTime, formatCurrency, formatNumber } = useLocalization();
  return {
    formatDate,
    formatTime,
    formatCurrency,
    formatNumber
  };
};

export default LocalizationContext;