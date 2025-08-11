/**
 * Dating Profile Optimizer - Main Application Entry Point
 * Production-ready React Native app with mock services
 */

import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';

// Mock Services
import { MockServiceCoordinator } from './src/services/mock/MockServiceIntegrator';
import { MOCK_CONFIG, MOCK_FEATURE_FLAGS } from './src/config/mock.config';

// Theme and Styles
const theme = {
  colors: {
    primary: '#8B5CF6',
    secondary: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    background: '#FFFFFF',
    surface: '#F8FAFC',
    text: '#1F2937',
    textSecondary: '#6B7280',
  },
  fonts: {
    primary: 'System',
  },
};

function App(): JSX.Element {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('🚀 Starting Dating Profile Optimizer...');
      
      // Initialize mock services for API-free functionality
      if (MOCK_CONFIG.enabled) {
        console.log('📱 Initializing mock services...');
        await MockServiceCoordinator.initializeMockServices();
        console.log('✅ Mock services initialized successfully');
      }

      // Verify feature availability
      const enabledFeatures = Object.entries(MOCK_FEATURE_FLAGS)
        .filter(([_, enabled]) => enabled)
        .map(([feature, _]) => feature);
      
      console.log('🎯 Enabled features:', enabledFeatures);

      // App initialization complete
      setIsInitialized(true);
      console.log('✨ Dating Profile Optimizer ready!');
      
    } catch (error) {
      console.error('❌ App initialization failed:', error);
      setInitializationError(error instanceof Error ? error.message : 'Unknown initialization error');
      
      Alert.alert(
        'Initialization Error',
        'The app encountered an error during startup. Please restart the app.',
        [{ text: 'OK' }]
      );
    }
  };

  if (initializationError) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={theme.colors.error}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Initialization Failed</Text>
          <Text style={styles.errorMessage}>{initializationError}</Text>
          <Text style={styles.errorSubtitle}>Please restart the app</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isInitialized) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={theme.colors.primary}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingTitle}>Dating Profile Optimizer</Text>
          <Text style={styles.loadingSubtitle}>Initializing AI services...</Text>
          
          {MOCK_CONFIG.enabled && (
            <View style={styles.mockModeIndicator}>
              <Text style={styles.mockModeText}>Demo Mode Active</Text>
              <Text style={styles.mockModeSubtext}>Full functionality without API keys</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <PaperProvider>
      <NavigationContainer>
        <SafeAreaView style={styles.container}>
          <StatusBar
            barStyle="dark-content"
            backgroundColor={theme.colors.background}
          />
          
          {/* Main App Content */}
          <View style={styles.appContainer}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Dating Profile Optimizer</Text>
              <Text style={styles.headerSubtitle}>AI-Powered Dating Success</Text>
            </View>
            
            <View style={styles.content}>
              <Text style={styles.welcomeTitle}>Welcome to Dating Profile Optimizer!</Text>
              <Text style={styles.welcomeDescription}>
                Your AI-powered dating success app is ready to help you create amazing profiles 
                and get more matches. All features are available in demo mode.
              </Text>
              
              <View style={styles.featureList}>
                <FeatureItem 
                  icon="🤖" 
                  title="AI Photo Analysis" 
                  description="Get detailed feedback on your dating photos"
                  enabled={MOCK_FEATURE_FLAGS.photo_optimization}
                />
                <FeatureItem 
                  icon="✍️" 
                  title="Bio Generator" 
                  description="Create compelling bios that get responses"
                  enabled={MOCK_FEATURE_FLAGS.bio_generator}
                />
                <FeatureItem 
                  icon="📱" 
                  title="Social Integration" 
                  description="Connect your Instagram and other social accounts"
                  enabled={MOCK_FEATURE_FLAGS.social_integration}
                />
                <FeatureItem 
                  icon="📊" 
                  title="Success Tracking" 
                  description="Monitor your dating app performance"
                  enabled={MOCK_FEATURE_FLAGS.success_tracking}
                />
                <FeatureItem 
                  icon="💎" 
                  title="Premium Features" 
                  description="Advanced insights and unlimited generations"
                  enabled={MOCK_FEATURE_FLAGS.premium_analysis}
                />
              </View>
              
              {MOCK_CONFIG.enabled && (
                <View style={styles.demoNotice}>
                  <Text style={styles.demoNoticeText}>
                    🎯 Demo Mode: All features work without API keys or payment integration
                  </Text>
                </View>
              )}
            </View>
          </View>
        </SafeAreaView>
      </NavigationContainer>
    </PaperProvider>
  );
}

// Feature Item Component
interface FeatureItemProps {
  icon: string;
  title: string;
  description: string;
  enabled: boolean;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, title, description, enabled }) => (
  <View style={[styles.featureItem, { opacity: enabled ? 1 : 0.5 }]}>
    <Text style={styles.featureIcon}>{icon}</Text>
    <View style={styles.featureTextContainer}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
    {enabled && <Text style={styles.featureEnabled}>✓</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  
  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    padding: 20,
  },
  loadingTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 20,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 16,
    color: '#E0E7FF',
    marginTop: 8,
    textAlign: 'center',
  },
  mockModeIndicator: {
    marginTop: 40,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    alignItems: 'center',
  },
  mockModeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  mockModeSubtext: {
    color: '#E0E7FF',
    fontSize: 14,
    marginTop: 4,
  },
  
  // Error States
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#FEE2E2',
  },
  
  // Main App
  appContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#8B5CF6',
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#E0E7FF',
    marginTop: 4,
  },
  
  content: {
    flex: 1,
    padding: 20,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  welcomeDescription: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 32,
  },
  
  // Features
  featureList: {
    flex: 1,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  featureEnabled: {
    fontSize: 18,
    color: '#10B981',
    fontWeight: 'bold',
  },
  
  // Demo Notice
  demoNotice: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginTop: 20,
  },
  demoNoticeText: {
    fontSize: 14,
    color: '#1E40AF',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default App;