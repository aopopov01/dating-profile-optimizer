import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, Platform, View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import authentication context
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

// Import screens
import PhotoUploader from '../upload/PhotoUploader';
import ProfileForm from '../upload/ProfileForm';
import PhotoScorer from '../analysis/PhotoScorer';
import BioGenerator from '../bio/BioGenerator';
import OptimizedProfile from '../results/OptimizedProfile';
import ProfileScreen from '../../screens/ProfileScreen';
import HomeScreen from '../../screens/HomeScreen';
import BioGenerationScreen from '../../screens/BioGenerationScreen';
import PhotoAnalysisScreen from '../../screens/PhotoAnalysisScreen';
import SubscriptionScreen from '../../screens/SubscriptionScreen';
import ResultsScreen from '../../screens/ResultsScreen';
import LinkedInHeadshotScreen from '../../screens/LinkedInHeadshotScreen';

// Import auth screens
import LoginScreen from '../../screens/auth/LoginScreen';
import RegisterScreen from '../../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../../screens/auth/ForgotPasswordScreen';

// Screen components placeholders
const UploadScreen = () => <PhotoUploader onPhotosSelected={() => {}} />;

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'home';
          
          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Upload':
              iconName = 'cloud-upload';
              break;
            case 'Analysis':
              iconName = 'analytics';
              break;
            case 'Bio':
              iconName = 'edit';
              break;
            case 'Results':
              iconName = 'star';
              break;
            case 'Profile':
              iconName = 'person';
              break;
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#e91e63',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopColor: '#e0e0e0',
          borderTopWidth: 1,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 3.84,
          paddingBottom: Platform.OS === 'android' ? 8 : 0,
          height: Platform.OS === 'android' ? 65 : 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: Platform.OS === 'android' ? 4 : 0,
        },
        headerStyle: {
          backgroundColor: '#e91e63',
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
        headerTitleAlign: 'center',
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ 
          title: 'Home',
          headerTitle: 'Dating Profile Optimizer'
        }} 
      />
      <Tab.Screen 
        name="Upload" 
        component={UploadScreen} 
        options={{ 
          title: 'Photos',
          headerTitle: 'Upload Photos'
        }} 
      />
      <Tab.Screen 
        name="Analysis" 
        component={PhotoAnalysisScreen} 
        options={{ 
          title: 'Analysis',
          headerTitle: 'Photo Analysis'
        }} 
      />
      <Tab.Screen 
        name="Bio" 
        component={BioGenerationScreen} 
        options={{ 
          title: 'Bio',
          headerTitle: 'Bio Generator'
        }} 
      />
      <Tab.Screen 
        name="Results" 
        component={ResultsScreen} 
        options={{ 
          title: 'Results',
          headerTitle: 'Your Optimized Profile'
        }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ 
          title: 'Profile',
          headerTitle: 'Your Profile'
        }} 
      />
    </Tab.Navigator>
  );
};

// Auth Stack Navigator
const AuthStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#e91e63',
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
        headerTitleAlign: 'center',
        cardStyle: { backgroundColor: '#f5f5f5' },
      }}
    >
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
        options={{ 
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="Register" 
        component={RegisterScreen}
        options={{ 
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="ForgotPassword" 
        component={ForgotPasswordScreen}
        options={{ 
          headerShown: false 
        }} 
      />
    </Stack.Navigator>
  );
};

// Main App Stack Navigator
const MainAppStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#e91e63',
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
        headerTitleAlign: 'center',
        cardStyle: { backgroundColor: '#f5f5f5' },
      }}
    >
      <Stack.Screen 
        name="Main" 
        component={MainTabs} 
        options={{ 
          headerShown: false 
        }} 
      />
      
      {/* Additional stack screens for modal presentations */}
      <Stack.Screen
        name="PaymentModal"
        component={SubscriptionScreen}
        options={{
          presentation: 'modal',
          headerTitle: 'Choose Your Plan',
          headerLeft: () => null,
        }}
      />
      
      <Stack.Screen
        name="SuccessStories"
        component={ResultsScreen}
        options={{
          headerTitle: 'Success Stories',
          headerBackTitle: 'Back',
        }}
      />
      
      <Stack.Screen
        name="PhotoEditor"
        component={PhotoAnalysisScreen}
        options={{
          headerTitle: 'Edit Photo',
          headerBackTitle: 'Back',
        }}
      />
      
      <Stack.Screen
        name="BioCustomizer"
        component={BioGenerationScreen}
        options={{
          headerTitle: 'Customize Bio',
          headerBackTitle: 'Back',
        }}
      />
      
      <Stack.Screen
        name="PlatformExport"
        component={ResultsScreen}
        options={{
          headerTitle: 'Export to Platform',
          headerBackTitle: 'Back',
        }}
      />
      
      <Stack.Screen
        name="LinkedInHeadshot"
        component={LinkedInHeadshotScreen}
        options={{
          headerTitle: 'LinkedIn Headshot Generator',
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
};

// Loading Screen Component
const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa' }}>
    <ActivityIndicator size="large" color="#e91e63" />
  </View>
);

// Navigation Root Component
const NavigationRoot: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#c2185b" 
        translucent={false}
      />
      {isAuthenticated ? <MainAppStack /> : <AuthStack />}
    </>
  );
};

const AppNavigation: React.FC = () => {
  return (
    <AuthProvider>
      <NavigationContainer>
        <NavigationRoot />
      </NavigationContainer>
    </AuthProvider>
  );
};

export default AppNavigation;