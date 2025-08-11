import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Switch,
  TextInput,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useAnalytics } from '../../contexts/AnalyticsContext';
import { useTheme } from '../../contexts/ThemeContext';

interface SocialAccount {
  platform: 'instagram' | 'linkedin' | 'twitter' | 'facebook' | 'tiktok';
  username: string;
  connected: boolean;
  lastSync: string;
  autoPost: boolean;
  accessToken?: string;
}

interface SuccessStory {
  id: string;
  title: string;
  content: string;
  beforeScore: number;
  afterScore: number;
  improvementTime: string;
  platform: string;
  isPublic: boolean;
  likes: number;
  shares: number;
  createdAt: string;
}

const SocialIntegrationHub: React.FC = () => {
  const [connectedAccounts, setConnectedAccounts] = useState<SocialAccount[]>([]);
  const [successStories, setSuccessStories] = useState<SuccessStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newStory, setNewStory] = useState({
    title: '',
    content: '',
    beforeScore: 0,
    afterScore: 0,
    improvementTime: ''
  });
  const [showStoryForm, setShowStoryForm] = useState(false);
  
  const { trackEvent } = useAnalytics();
  const { theme, colors } = useTheme();

  // Load connected accounts and success stories
  useFocusEffect(
    useCallback(() => {
      loadSocialData();
    }, [])
  );

  const loadSocialData = async () => {
    try {
      setIsLoading(true);
      
      const [accountsData, storiesData] = await Promise.all([
        AsyncStorage.getItem('connectedSocialAccounts'),
        AsyncStorage.getItem('userSuccessStories')
      ]);

      if (accountsData) {
        setConnectedAccounts(JSON.parse(accountsData));
      } else {
        // Initialize default social accounts
        const defaultAccounts: SocialAccount[] = [
          { platform: 'instagram', username: '', connected: false, lastSync: '', autoPost: false },
          { platform: 'linkedin', username: '', connected: false, lastSync: '', autoPost: false },
          { platform: 'twitter', username: '', connected: false, lastSync: '', autoPost: false },
          { platform: 'facebook', username: '', connected: false, lastSync: '', autoPost: false },
          { platform: 'tiktok', username: '', connected: false, lastSync: '', autoPost: false }
        ];
        setConnectedAccounts(defaultAccounts);
      }

      if (storiesData) {
        setSuccessStories(JSON.parse(storiesData));
      }
    } catch (error) {
      console.error('Error loading social data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Connect social account
  const connectAccount = async (platform: string) => {
    try {
      // In a real implementation, this would open OAuth flow
      Alert.prompt(
        `Connect ${platform}`,
        'Enter your username:',
        async (username) => {
          if (username) {
            const updatedAccounts = connectedAccounts.map(account =>
              account.platform === platform
                ? { ...account, username, connected: true, lastSync: new Date().toISOString() }
                : account
            );
            
            setConnectedAccounts(updatedAccounts);
            await AsyncStorage.setItem('connectedSocialAccounts', JSON.stringify(updatedAccounts));
            
            trackEvent('social_account_connected', { platform, username });
            Alert.alert('Success', `${platform} account connected successfully!`);
          }
        }
      );
    } catch (error) {
      console.error('Error connecting account:', error);
      Alert.alert('Error', 'Failed to connect account');
    }
  };

  // Disconnect social account
  const disconnectAccount = async (platform: string) => {
    try {
      Alert.alert(
        'Disconnect Account',
        `Are you sure you want to disconnect your ${platform} account?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disconnect',
            style: 'destructive',
            onPress: async () => {
              const updatedAccounts = connectedAccounts.map(account =>
                account.platform === platform
                  ? { ...account, username: '', connected: false, autoPost: false, accessToken: undefined }
                  : account
              );
              
              setConnectedAccounts(updatedAccounts);
              await AsyncStorage.setItem('connectedSocialAccounts', JSON.stringify(updatedAccounts));
              
              trackEvent('social_account_disconnected', { platform });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error disconnecting account:', error);
    }
  };

  // Toggle auto-post setting
  const toggleAutoPost = async (platform: string, value: boolean) => {
    try {
      const updatedAccounts = connectedAccounts.map(account =>
        account.platform === platform
          ? { ...account, autoPost: value }
          : account
      );
      
      setConnectedAccounts(updatedAccounts);
      await AsyncStorage.setItem('connectedSocialAccounts', JSON.stringify(updatedAccounts));
      
      trackEvent('auto_post_toggled', { platform, enabled: value });
    } catch (error) {
      console.error('Error updating auto-post setting:', error);
    }
  };

  // Submit success story
  const submitSuccessStory = async () => {
    try {
      if (!newStory.title.trim() || !newStory.content.trim()) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }

      const story: SuccessStory = {
        id: Date.now().toString(),
        ...newStory,
        platform: 'app',
        isPublic: true,
        likes: 0,
        shares: 0,
        createdAt: new Date().toISOString()
      };

      const updatedStories = [...successStories, story];
      setSuccessStories(updatedStories);
      await AsyncStorage.setItem('userSuccessStories', JSON.stringify(updatedStories));

      // Reset form
      setNewStory({
        title: '',
        content: '',
        beforeScore: 0,
        afterScore: 0,
        improvementTime: ''
      });
      setShowStoryForm(false);

      trackEvent('success_story_submitted', {
        story_id: story.id,
        improvement: story.afterScore - story.beforeScore
      });

      Alert.alert('Success', 'Your success story has been shared!');
    } catch (error) {
      console.error('Error submitting success story:', error);
      Alert.alert('Error', 'Failed to submit success story');
    }
  };

  // Cross-post content to connected platforms
  const crossPostContent = async (content: string) => {
    try {
      const connectedPlatforms = connectedAccounts.filter(account => account.connected && account.autoPost);
      
      if (connectedPlatforms.length === 0) {
        Alert.alert('No Accounts', 'No social accounts are connected for auto-posting');
        return;
      }

      // Simulate posting to each platform
      for (const account of connectedPlatforms) {
        // In a real implementation, this would use platform-specific APIs
        console.log(`Posting to ${account.platform}:`, content);
        
        // Update last sync time
        const updatedAccounts = connectedAccounts.map(acc =>
          acc.platform === account.platform
            ? { ...acc, lastSync: new Date().toISOString() }
            : acc
        );
        setConnectedAccounts(updatedAccounts);
        await AsyncStorage.setItem('connectedSocialAccounts', JSON.stringify(updatedAccounts));
      }

      trackEvent('content_cross_posted', {
        platforms: connectedPlatforms.map(acc => acc.platform),
        content_length: content.length
      });

      Alert.alert('Success', `Content posted to ${connectedPlatforms.length} platform(s)!`);
    } catch (error) {
      console.error('Error cross-posting content:', error);
      Alert.alert('Error', 'Failed to post content');
    }
  };

  const getSocialIcon = (platform: string) => {
    const icons = {
      instagram: '📸',
      linkedin: '💼',
      twitter: '🐦',
      facebook: '📘',
      tiktok: '🎵'
    };
    return icons[platform as keyof typeof icons] || '🔗';
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background
    },
    scrollView: {
      flex: 1,
      padding: 16
    },
    section: {
      marginBottom: 24
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 16
    },
    accountCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    accountInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1
    },
    accountIcon: {
      fontSize: 24,
      marginRight: 12
    },
    accountDetails: {
      flex: 1
    },
    accountName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text
    },
    accountStatus: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2
    },
    accountActions: {
      alignItems: 'flex-end'
    },
    connectButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      marginBottom: 8
    },
    disconnectButton: {
      backgroundColor: colors.error,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      marginBottom: 8
    },
    buttonText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '600'
    },
    autoPostContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8
    },
    autoPostLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginRight: 8
    },
    storyCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12
    },
    storyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8
    },
    storyTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      flex: 1
    },
    storyMetrics: {
      flexDirection: 'row',
      alignItems: 'center'
    },
    metricText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginLeft: 8
    },
    storyContent: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
      marginBottom: 12
    },
    storyStats: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border
    },
    statItem: {
      alignItems: 'center'
    },
    statValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.primary
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2
    },
    addStoryButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginBottom: 16
    },
    addStoryText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600'
    },
    formContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16
    },
    input: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border
    },
    textArea: {
      height: 100,
      textAlignVertical: 'top'
    },
    formButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16
    },
    cancelButton: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 12,
      flex: 1,
      marginRight: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border
    },
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 12,
      flex: 1,
      marginLeft: 8,
      alignItems: 'center'
    },
    cancelButtonText: {
      color: colors.text,
      fontWeight: '600'
    },
    submitButtonText: {
      color: 'white',
      fontWeight: '600'
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center'
    },
    emptyState: {
      alignItems: 'center',
      padding: 32
    },
    emptyStateText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 16
    }
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Connected Accounts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connected Accounts</Text>
          
          {connectedAccounts.map((account) => (
            <View key={account.platform} style={styles.accountCard}>
              <View style={styles.accountInfo}>
                <Text style={styles.accountIcon}>{getSocialIcon(account.platform)}</Text>
                <View style={styles.accountDetails}>
                  <Text style={styles.accountName}>
                    {account.platform.charAt(0).toUpperCase() + account.platform.slice(1)}
                  </Text>
                  <Text style={styles.accountStatus}>
                    {account.connected ? `@${account.username}` : 'Not connected'}
                  </Text>
                </View>
              </View>

              <View style={styles.accountActions}>
                {account.connected ? (
                  <>
                    <TouchableOpacity
                      style={styles.disconnectButton}
                      onPress={() => disconnectAccount(account.platform)}
                    >
                      <Text style={styles.buttonText}>Disconnect</Text>
                    </TouchableOpacity>
                    
                    <View style={styles.autoPostContainer}>
                      <Text style={styles.autoPostLabel}>Auto-post</Text>
                      <Switch
                        value={account.autoPost}
                        onValueChange={(value) => toggleAutoPost(account.platform, value)}
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor={account.autoPost ? 'white' : colors.textSecondary}
                      />
                    </View>
                  </>
                ) : (
                  <TouchableOpacity
                    style={styles.connectButton}
                    onPress={() => connectAccount(account.platform)}
                  >
                    <Text style={styles.buttonText}>Connect</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Success Stories Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Success Stories</Text>
          
          <TouchableOpacity
            style={styles.addStoryButton}
            onPress={() => setShowStoryForm(true)}
          >
            <Text style={styles.addStoryText}>Share Your Success Story</Text>
          </TouchableOpacity>

          {showStoryForm && (
            <View style={styles.formContainer}>
              <TextInput
                style={styles.input}
                placeholder="Story title"
                placeholderTextColor={colors.textSecondary}
                value={newStory.title}
                onChangeText={(text) => setNewStory(prev => ({ ...prev, title: text }))}
              />
              
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tell your success story..."
                placeholderTextColor={colors.textSecondary}
                value={newStory.content}
                onChangeText={(text) => setNewStory(prev => ({ ...prev, content: text }))}
                multiline
              />
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: 8 }]}
                  placeholder="Before score"
                  placeholderTextColor={colors.textSecondary}
                  value={newStory.beforeScore.toString()}
                  onChangeText={(text) => setNewStory(prev => ({ ...prev, beforeScore: parseInt(text) || 0 }))}
                  keyboardType="numeric"
                />
                
                <TextInput
                  style={[styles.input, { flex: 1, marginLeft: 8 }]}
                  placeholder="After score"
                  placeholderTextColor={colors.textSecondary}
                  value={newStory.afterScore.toString()}
                  onChangeText={(text) => setNewStory(prev => ({ ...prev, afterScore: parseInt(text) || 0 }))}
                  keyboardType="numeric"
                />
              </View>
              
              <TextInput
                style={styles.input}
                placeholder="Time to improvement (e.g., 2 weeks)"
                placeholderTextColor={colors.textSecondary}
                value={newStory.improvementTime}
                onChangeText={(text) => setNewStory(prev => ({ ...prev, improvementTime: text }))}
              />

              <View style={styles.formButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowStoryForm(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={submitSuccessStory}
                >
                  <Text style={styles.submitButtonText}>Share Story</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {successStories.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 48 }}>📖</Text>
              <Text style={styles.emptyStateText}>
                No success stories yet.{'\n'}Share your dating profile transformation!
              </Text>
            </View>
          ) : (
            successStories.map((story) => (
              <View key={story.id} style={styles.storyCard}>
                <View style={styles.storyHeader}>
                  <Text style={styles.storyTitle}>{story.title}</Text>
                  <View style={styles.storyMetrics}>
                    <Text style={styles.metricText}>❤️ {story.likes}</Text>
                    <Text style={styles.metricText}>📤 {story.shares}</Text>
                  </View>
                </View>
                
                <Text style={styles.storyContent} numberOfLines={4}>
                  {story.content}
                </Text>
                
                <View style={styles.storyStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{story.beforeScore}</Text>
                    <Text style={styles.statLabel}>Before</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>+{story.afterScore - story.beforeScore}</Text>
                    <Text style={styles.statLabel}>Improvement</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{story.afterScore}</Text>
                    <Text style={styles.statLabel}>After</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{story.improvementTime}</Text>
                    <Text style={styles.statLabel}>Time</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default SocialIntegrationHub;