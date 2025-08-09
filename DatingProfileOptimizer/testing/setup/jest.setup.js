/**
 * Jest Test Environment Setup
 * Global configuration for both Dating Profile Optimizer and LinkedIn Headshot Generator testing
 */

import 'react-native-gesture-handler/jestSetup';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

// Mock React Native modules
jest.mock('react-native', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    ...ReactNative,
    Platform: {
      ...ReactNative.Platform,
      OS: 'android', // Can be overridden in specific tests
      Version: 33,
      select: jest.fn((obj) => obj.android || obj.default)
    },
    Dimensions: {
      get: jest.fn(() => ({
        width: 375,
        height: 812,
        scale: 2,
        fontScale: 1
      }))
    },
    PermissionsAndroid: {
      request: jest.fn(() => Promise.resolve('granted')),
      requestMultiple: jest.fn(() => Promise.resolve({
        'android.permission.CAMERA': 'granted',
        'android.permission.READ_EXTERNAL_STORAGE': 'granted',
        'android.permission.WRITE_EXTERNAL_STORAGE': 'granted'
      })),
      PERMISSIONS: {
        CAMERA: 'android.permission.CAMERA',
        READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE',
        WRITE_EXTERNAL_STORAGE: 'android.permission.WRITE_EXTERNAL_STORAGE',
        READ_MEDIA_IMAGES: 'android.permission.READ_MEDIA_IMAGES',
        READ_MEDIA_VIDEO: 'android.permission.READ_MEDIA_VIDEO'
      },
      RESULTS: {
        GRANTED: 'granted',
        DENIED: 'denied',
        NEVER_ASK_AGAIN: 'never_ask_again'
      }
    },
    Alert: {
      alert: jest.fn()
    },
    NativeModules: {
      ...ReactNative.NativeModules,
      RNCNetInfo: {
        getCurrentState: jest.fn(() => Promise.resolve({
          type: 'wifi',
          isConnected: true,
          isInternetReachable: true
        }))
      }
    }
  };
});

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock React Navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      dispatch: jest.fn(),
      reset: jest.fn(),
      goBack: jest.fn(),
      isFocused: jest.fn(() => true),
      addListener: jest.fn(),
      removeListener: jest.fn()
    }),
    useRoute: () => ({
      key: 'test-route',
      name: 'Test',
      params: {}
    }),
    useFocusEffect: jest.fn()
  };
});

// Mock React Native Paper
jest.mock('react-native-paper', () => {
  const actual = jest.requireActual('react-native-paper');
  return {
    ...actual,
    Portal: ({ children }) => children
  };
});

// Mock React Native Vector Icons
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

// Mock Image Picker
jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn((options, callback) => {
    callback({
      assets: [{
        uri: 'file://test-image.jpg',
        width: 1000,
        height: 1000,
        fileSize: 500000,
        type: 'image/jpeg'
      }]
    });
  }),
  launchImageLibrary: jest.fn((options, callback) => {
    callback({
      assets: [{
        uri: 'file://test-image.jpg',
        width: 1000,
        height: 1000,
        fileSize: 500000,
        type: 'image/jpeg'
      }]
    });
  }),
  MediaType: {
    photo: 'photo',
    video: 'video'
  },
  ImageQuality: {
    low: 0.3,
    medium: 0.5,
    high: 0.8
  }
}));

// Mock Image Crop Picker
jest.mock('react-native-image-crop-picker', () => ({
  openPicker: jest.fn(() => Promise.resolve({
    path: 'file://cropped-image.jpg',
    width: 1000,
    height: 1000,
    size: 500000,
    mime: 'image/jpeg'
  })),
  openCamera: jest.fn(() => Promise.resolve({
    path: 'file://camera-image.jpg',
    width: 1000,
    height: 1000,
    size: 500000,
    mime: 'image/jpeg'
  })),
  clean: jest.fn(() => Promise.resolve())
}));

// Mock Stripe
jest.mock('@stripe/stripe-react-native', () => ({
  initStripe: jest.fn(() => Promise.resolve()),
  useStripe: () => ({
    confirmPayment: jest.fn(() => Promise.resolve({ paymentIntent: { status: 'succeeded' } })),
    createPaymentMethod: jest.fn(() => Promise.resolve({ paymentMethod: { id: 'pm_test' } }))
  }),
  useConfirmPayment: () => ({
    confirmPayment: jest.fn(() => Promise.resolve({ paymentIntent: { status: 'succeeded' } }))
  }),
  CardField: 'CardField',
  StripeProvider: ({ children }) => children
}));

// Mock Analytics
jest.mock('mixpanel-react-native', () => ({
  init: jest.fn(),
  track: jest.fn(),
  identify: jest.fn(),
  registerSuperProperties: jest.fn(),
  timeEvent: jest.fn(),
  flush: jest.fn()
}));

jest.mock('@amplitude/analytics-react-native', () => ({
  init: jest.fn(),
  track: jest.fn(),
  identify: jest.fn(),
  setUserId: jest.fn(),
  setUserProperties: jest.fn(),
  flush: jest.fn()
}));

// Mock Firebase
jest.mock('@react-native-firebase/analytics', () => ({
  default: () => ({
    logEvent: jest.fn(),
    setUserId: jest.fn(),
    setUserProperties: jest.fn(),
    setCurrentScreen: jest.fn()
  })
}));

jest.mock('@react-native-firebase/auth', () => ({
  default: () => ({
    createUserWithEmailAndPassword: jest.fn(() => Promise.resolve({
      user: { uid: 'test-uid', email: 'test@example.com' }
    })),
    signInWithEmailAndPassword: jest.fn(() => Promise.resolve({
      user: { uid: 'test-uid', email: 'test@example.com' }
    })),
    signOut: jest.fn(() => Promise.resolve()),
    onAuthStateChanged: jest.fn()
  })
}));

// Mock Device Info
jest.mock('react-native-device-info', () => ({
  getDeviceId: jest.fn(() => 'test-device-id'),
  getSystemVersion: jest.fn(() => '13.0'),
  getBrand: jest.fn(() => 'Apple'),
  getModel: jest.fn(() => 'iPhone'),
  getDeviceType: jest.fn(() => 'Handset'),
  getUsedMemory: jest.fn(() => Promise.resolve(100000000)),
  getTotalMemory: jest.fn(() => Promise.resolve(1000000000)),
  getBatteryLevel: jest.fn(() => Promise.resolve(0.85)),
  hasNotch: jest.fn(() => true),
  getApiLevel: jest.fn(() => Promise.resolve(33))
}));

// Mock Network Info
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
    details: {
      isConnectionExpensive: false,
      cellularGeneration: null,
      carrier: null
    }
  })),
  addEventListener: jest.fn(() => jest.fn())
}));

// Mock Keychain
jest.mock('react-native-keychain', () => ({
  setInternetCredentials: jest.fn(() => Promise.resolve(true)),
  getInternetCredentials: jest.fn(() => Promise.resolve({
    username: 'test@example.com',
    password: 'test-token'
  })),
  resetInternetCredentials: jest.fn(() => Promise.resolve(true)),
  canImplyAuthentication: jest.fn(() => Promise.resolve(true)),
  getSupportedBiometryType: jest.fn(() => Promise.resolve('TouchID'))
}));

// Mock Biometrics
jest.mock('react-native-biometrics', () => ({
  isSensorAvailable: jest.fn(() => Promise.resolve({ available: true, biometryType: 'TouchID' })),
  simplePrompt: jest.fn(() => Promise.resolve({ success: true })),
  createKeys: jest.fn(() => Promise.resolve({ publicKey: 'test-public-key' })),
  deleteKeys: jest.fn(() => Promise.resolve({ keysDeleted: true }))
}));

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(() => Promise.resolve({
          choices: [{
            message: {
              content: 'Test AI response for bio generation or photo analysis'
            }
          }]
        }))
      }
    },
    images: {
      generate: jest.fn(() => Promise.resolve({
        data: [{
          url: 'https://example.com/generated-headshot.jpg'
        }]
      }))
    }
  }));
});

// Mock Permissions
jest.mock('react-native-permissions', () => ({
  request: jest.fn(() => Promise.resolve('granted')),
  check: jest.fn(() => Promise.resolve('granted')),
  PERMISSIONS: {
    ANDROID: {
      CAMERA: 'android.permission.CAMERA',
      READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE',
      WRITE_EXTERNAL_STORAGE: 'android.permission.WRITE_EXTERNAL_STORAGE'
    },
    IOS: {
      CAMERA: 'ios.permission.CAMERA',
      PHOTO_LIBRARY: 'ios.permission.PHOTO_LIBRARY'
    }
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    BLOCKED: 'blocked',
    LIMITED: 'limited',
    UNAVAILABLE: 'unavailable'
  }
}));

// Global test utilities
global.mockFetch = (response, options = {}) => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: options.ok !== false,
      status: options.status || 200,
      statusText: options.statusText || 'OK',
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
      headers: new Map(Object.entries(options.headers || {}))
    })
  );
};

global.mockNetworkError = (error = 'Network Error') => {
  global.fetch = jest.fn(() => Promise.reject(new Error(error)));
};

// Test data generators
global.generateMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  createdAt: new Date().toISOString(),
  ...overrides
});

global.generateMockPhoto = (overrides = {}) => ({
  uri: 'file://test-photo.jpg',
  width: 1000,
  height: 1000,
  fileSize: 500000,
  type: 'image/jpeg',
  ...overrides
});

global.generateMockAnalysisResult = (overrides = {}) => ({
  uri: 'file://test-photo.jpg',
  qualityScore: 85,
  attractivenessScore: 78,
  backgroundScore: 90,
  outfitScore: 82,
  expressionScore: 88,
  overallScore: 84,
  recommendations: ['Great lighting', 'Good composition'],
  strengths: ['Natural smile', 'Clear image'],
  improvements: ['Try different angle'],
  technicalIssues: [],
  ...overrides
});

// Test environment indicators
process.env.NODE_ENV = 'test';
process.env.JEST_WORKER_ID = '1';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Suppress console warnings in tests unless debugging
if (!process.env.DEBUG_TESTS) {
  console.warn = jest.fn();
  console.error = jest.fn();
}

// Performance monitoring for tests
global.performance = global.performance || {
  now: () => Date.now(),
  mark: () => {},
  measure: () => {}
};

console.log('Jest setup completed for Dating Profile Optimizer and LinkedIn Headshot Generator testing');