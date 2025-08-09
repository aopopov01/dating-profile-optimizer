import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import screens (these would be created)
import PhotoUploader from '../upload/PhotoUploader';
import ProfileForm from '../upload/ProfileForm';
import PhotoScorer from '../analysis/PhotoScorer';
import BioGenerator from '../bio/BioGenerator';
import OptimizedProfile from '../results/OptimizedProfile';

// Screen components placeholders
const HomeScreen = () => <PhotoUploader onPhotosSelected={() => {}} />;
const AnalysisScreen = () => <PhotoScorer photoScores={[]} />;
const BioScreen = () => <BioGenerator userProfile={{}} photoAnalysis={{}} onBioSelected={() => {}} />;
const ResultsScreen = () => <OptimizedProfile photos={[]} bio={{ text: '', style: 'casual', score: 85 }} improvements={{ expectedMatches: 10, improvementPercentage: 200, strongPoints: [], platformTips: {} }} />;
const ProfileScreen = () => <ProfileForm onProfileComplete={() => {}} />;

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'home';
          
          switch (route.name) {
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
        name="Upload" 
        component={HomeScreen} 
        options={{ 
          title: 'Photos',
          headerTitle: 'Upload Photos'
        }} 
      />
      <Tab.Screen 
        name="Analysis" 
        component={AnalysisScreen} 
        options={{ 
          title: 'Analysis',
          headerTitle: 'Photo Analysis'
        }} 
      />
      <Tab.Screen 
        name="Bio" 
        component={BioScreen} 
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

const AppNavigation: React.FC = () => {
  return (
    <NavigationContainer>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#c2185b" 
        translucent={false}
      />
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
          component={ProfileScreen} // Placeholder
          options={{
            presentation: 'modal',
            headerTitle: 'Choose Your Plan',
            headerLeft: () => null,
          }}
        />
        
        <Stack.Screen
          name="SuccessStories"
          component={ResultsScreen} // Placeholder
          options={{
            headerTitle: 'Success Stories',
            headerBackTitle: 'Back',
          }}
        />
        
        <Stack.Screen
          name="PhotoEditor"
          component={HomeScreen} // Placeholder
          options={{
            headerTitle: 'Edit Photo',
            headerBackTitle: 'Back',
          }}
        />
        
        <Stack.Screen
          name="BioCustomizer"
          component={BioScreen} // Placeholder
          options={{
            headerTitle: 'Customize Bio',
            headerBackTitle: 'Back',
          }}
        />
        
        <Stack.Screen
          name="PlatformExport"
          component={ResultsScreen} // Placeholder
          options={{
            headerTitle: 'Export to Platform',
            headerBackTitle: 'Back',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigation;