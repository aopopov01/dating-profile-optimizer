import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Avatar,
  Divider,
  List,
  Surface,
  Switch,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';

interface ProfileScreenProps {
  navigation: any;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    // Navigate to edit profile screen
    navigation.navigate('EditProfile');
  };

  const handleViewSubscription = () => {
    navigation.navigate('PaymentModal');
  };

  const handleSupport = () => {
    Alert.alert(
      'Contact Support',
      'Email us at support@xciterr.com or visit our help center.',
      [{ text: 'OK' }]
    );
  };

  const handlePrivacyPolicy = () => {
    Alert.alert(
      'Privacy Policy',
      'Our privacy policy can be found at xciterr.com/privacy',
      [{ text: 'OK' }]
    );
  };

  const handleTermsOfService = () => {
    Alert.alert(
      'Terms of Service',
      'Our terms of service can be found at xciterr.com/terms',
      [{ text: 'OK' }]
    );
  };

  const getUserInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* User Info Card */}
        <Card style={styles.userCard}>
          <Card.Content style={styles.userContent}>
            <View style={styles.userHeader}>
              <Avatar.Text 
                size={80} 
                label={getUserInitials()}
                style={styles.avatar}
              />
              <View style={styles.userInfo}>
                <Text variant="headlineSmall" style={styles.userName}>
                  {user?.first_name} {user?.last_name}
                </Text>
                <Text variant="bodyMedium" style={styles.userEmail}>
                  {user?.email}
                </Text>
                <View style={styles.verificationBadge}>
                  <Icon 
                    name={user?.email_verified ? 'verified' : 'warning'} 
                    size={16} 
                    color={user?.email_verified ? '#4caf50' : '#ff9800'} 
                  />
                  <Text 
                    variant="bodySmall" 
                    style={[
                      styles.verificationText,
                      { color: user?.email_verified ? '#4caf50' : '#ff9800' }
                    ]}
                  >
                    {user?.email_verified ? 'Verified' : 'Unverified'}
                  </Text>
                </View>
              </View>
            </View>
            
            <Button 
              mode="outlined" 
              onPress={handleEditProfile}
              style={styles.editButton}
            >
              Edit Profile
            </Button>
          </Card.Content>
        </Card>

        {/* Account Section */}
        <Surface style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Account
          </Text>
          
          <List.Item
            title="Subscription Plan"
            description="Manage your subscription"
            left={(props) => <List.Icon {...props} icon="credit-card" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleViewSubscription}
          />
          
          <Divider />
          
          <List.Item
            title="Usage Statistics"
            description="View your AI usage and analytics"
            left={(props) => <List.Icon {...props} icon="analytics" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('UsageStats')}
          />
        </Surface>

        {/* Settings Section */}
        <Surface style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Settings
          </Text>
          
          <List.Item
            title="Push Notifications"
            description="Get notified about matches and tips"
            left={(props) => <List.Icon {...props} icon="notifications" />}
            right={() => (
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                color="#e91e63"
              />
            )}
          />
          
          <Divider />
          
          <List.Item
            title="Marketing Emails"
            description="Receive tips and product updates"
            left={(props) => <List.Icon {...props} icon="email" />}
            right={() => (
              <Switch
                value={marketingEmails}
                onValueChange={setMarketingEmails}
                color="#e91e63"
              />
            )}
          />
          
          <Divider />
          
          <List.Item
            title="Privacy & Security"
            description="Manage your privacy settings"
            left={(props) => <List.Icon {...props} icon="security" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('PrivacySettings')}
          />
        </Surface>

        {/* Support Section */}
        <Surface style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Support & Legal
          </Text>
          
          <List.Item
            title="Help & Support"
            description="Get help or contact us"
            left={(props) => <List.Icon {...props} icon="help" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleSupport}
          />
          
          <Divider />
          
          <List.Item
            title="Privacy Policy"
            left={(props) => <List.Icon {...props} icon="privacy-tip" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={handlePrivacyPolicy}
          />
          
          <Divider />
          
          <List.Item
            title="Terms of Service"
            left={(props) => <List.Icon {...props} icon="description" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleTermsOfService}
          />
        </Surface>

        {/* Logout Section */}
        <View style={styles.logoutSection}>
          <Button
            mode="outlined"
            onPress={handleLogout}
            style={styles.logoutButton}
            buttonColor="transparent"
            textColor="#f44336"
          >
            Sign Out
          </Button>
        </View>

        {/* App Info */}
        <Surface style={styles.appInfo}>
          <Text variant="bodySmall" style={styles.appInfoText}>
            Dating Profile Optimizer v1.0.0
          </Text>
          <Text variant="bodySmall" style={styles.appInfoText}>
            © 2024 Xciterr Ltd. All rights reserved.
          </Text>
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  userCard: {
    margin: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  userContent: {
    padding: 20,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    backgroundColor: '#e91e63',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    color: '#666',
    marginBottom: 8,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verificationText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  editButton: {
    borderColor: '#e91e63',
  },
  section: {
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  sectionTitle: {
    fontWeight: 'bold',
    padding: 16,
    paddingBottom: 8,
    color: '#212121',
  },
  logoutSection: {
    margin: 16,
    marginTop: 8,
  },
  logoutButton: {
    borderColor: '#f44336',
  },
  appInfo: {
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  appInfoText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 2,
  },
});

export default ProfileScreen;