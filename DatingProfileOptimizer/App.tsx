/**
 * Dating Profile Optimizer
 * AI-Powered Dating Success App
 *
 * @format
 */

import React, { useEffect, useState } from 'react';
import {
  Platform,
  PermissionsAndroid,
  Alert,
  LogBox,
} from 'react-native';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-gesture-handler';

// Import our navigation
import AppNavigation from './src/components/shared/Navigation';

// Import services for initialization
import { paymentService } from './src/services/paymentService';

// Configure Material Design theme for dating app
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#e91e63',
    primaryContainer: '#fce4ec',
    secondary: '#ff5722',
    secondaryContainer: '#ffebee',
    surface: '#ffffff',
    surfaceVariant: '#f5f5f5',
    background: '#fafafa',
    error: '#f44336',
    onPrimary: '#ffffff',
    onSecondary: '#ffffff',
    onSurface: '#212121',
    onBackground: '#212121',
  },
};

// Suppress common warnings for demo
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'VirtualizedLists should never be nested inside plain ScrollViews',
]);

function App(): JSX.Element {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Request Android permissions
      if (Platform.OS === 'android') {
        await requestAndroidPermissions();
      }

      // Initialize services
      await initializeServices();

      setIsInitialized(true);
    } catch (error) {
      console.error('App initialization failed:', error);
      Alert.alert(
        'Initialization Error',
        'Failed to initialize the app. Please restart the application.',
        [{ text: 'OK' }]
      );
    }
  };

  const requestAndroidPermissions = async () => {
    try {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.CAMERA,
      ];

      if (Platform.Version >= 33) {
        // Android 13+ requires different permissions
        permissions.push(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO
        );
      }

      const granted = await PermissionsAndroid.requestMultiple(permissions);
      
      const allGranted = Object.values(granted).every(
        permission => permission === PermissionsAndroid.RESULTS.GRANTED
      );

      if (!allGranted) {
        Alert.alert(
          'Permissions Required',
          'This app needs camera and storage permissions to analyze your photos. Please grant permissions in your device settings.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Permission request failed:', error);
    }
  };

  const initializeServices = async () => {
    try {
      // Initialize Stripe for payments
      await paymentService.initialize();
      
      // Initialize analytics (in production)
      // await analyticsService.initialize();
      
      // Initialize crash reporting (in production)
      // await crashReportingService.initialize();
      
      console.log('All services initialized successfully');
    } catch (error) {
      console.error('Service initialization failed:', error);
      throw error;
    }
  };

  if (!isInitialized) {
    // In production, show a proper loading screen
    return <></>;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={theme}>
        <AppNavigation />
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

export default App;
