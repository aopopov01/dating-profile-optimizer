import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
  Platform,
  Linking,
  PermissionsAndroid,
  Image,
  ScrollView,
  Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { Canvas, Skia, useFont, Text as SkiaText } from '@shopify/react-native-skia';
import LinearGradient from 'react-native-linear-gradient';
import { useAnalytics } from '../../contexts/AnalyticsContext';
import { useTheme } from '../../contexts/ThemeContext';

interface ProfileData {
  id: string;
  username: string;
  bio: string;
  photos: string[];
  analytics: {
    score: number;
    improvements: string[];
    strengths: string[];
  };
  metadata: {
    createdAt: string;
    lastUpdated: string;
  };
}

interface SharingOptions {
  includeBio: boolean;
  includePhotos: boolean;
  includeAnalytics: boolean;
  includeRecommendations: boolean;
  customMessage: string;
  platform: 'instagram' | 'linkedin' | 'twitter' | 'facebook' | 'whatsapp' | 'email' | 'sms';
}

const ProfileSharingManager: React.FC<{ profileData: ProfileData }> = ({ profileData }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [sharingOptions, setSharingOptions] = useState<SharingOptions>({
    includeBio: true,
    includePhotos: false,
    includeAnalytics: true,
    includeRecommendations: true,
    customMessage: '',
    platform: 'instagram'
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  
  const { trackEvent } = useAnalytics();
  const { theme, colors } = useTheme();

  // Generate shareable content based on options
  const generateShareableContent = useCallback(async () => {
    setIsGenerating(true);
    
    try {
      let content = '';
      
      if (sharingOptions.customMessage) {
        content += sharingOptions.customMessage + '\n\n';
      }
      
      content += `🚀 Just optimized my dating profile with AI!\n\n`;
      
      if (sharingOptions.includeBio && profileData.bio) {
        content += `✨ New Bio:\n"${profileData.bio}"\n\n`;
      }
      
      if (sharingOptions.includeAnalytics) {
        content += `📊 Profile Score: ${profileData.analytics.score}/100\n`;
        
        if (profileData.analytics.strengths.length > 0) {
          content += `💪 Strengths: ${profileData.analytics.strengths.slice(0, 3).join(', ')}\n`;
        }
        
        if (profileData.analytics.improvements.length > 0) {
          content += `🎯 Areas to improve: ${profileData.analytics.improvements.slice(0, 2).join(', ')}\n\n`;
        }
      }
      
      if (sharingOptions.includeRecommendations) {
        content += `🔥 Ready to level up your dating game? Try the Dating Profile Optimizer app!\n`;
        content += `#DatingProfileOptimizer #DatingTips #OnlineDating #AI`;
      }
      
      setGeneratedContent(content);
      
      // Track sharing preparation
      trackEvent('profile_share_generated', {
        profile_id: profileData.id,
        includes_bio: sharingOptions.includeBio,
        includes_analytics: sharingOptions.includeAnalytics,
        platform: sharingOptions.platform
      });
      
    } catch (error) {
      console.error('Error generating shareable content:', error);
      Alert.alert('Error', 'Failed to generate shareable content');
    } finally {
      setIsGenerating(false);
    }
  }, [sharingOptions, profileData, trackEvent]);

  // Generate visual report for sharing
  const generateVisualReport = useCallback(async () => {
    try {
      const reportData = {
        username: profileData.username,
        score: profileData.analytics.score,
        strengths: profileData.analytics.strengths.slice(0, 3),
        improvements: profileData.analytics.improvements.slice(0, 2),
        timestamp: new Date().toLocaleDateString()
      };

      // Create a canvas-based visual report
      const svg = Skia.SVG.MakeFromString(`
        <svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#FF6B6B;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#4ECDC4;stop-opacity:1" />
            </linearGradient>
          </defs>
          
          <!-- Background -->
          <rect width="400" height="600" fill="url(#grad1)"/>
          
          <!-- Header -->
          <text x="200" y="60" text-anchor="middle" fill="white" font-size="28" font-weight="bold">
            Dating Profile Report
          </text>
          
          <!-- Score Circle -->
          <circle cx="200" cy="150" r="50" fill="none" stroke="white" stroke-width="4"/>
          <text x="200" y="160" text-anchor="middle" fill="white" font-size="36" font-weight="bold">
            ${reportData.score}
          </text>
          <text x="200" y="185" text-anchor="middle" fill="white" font-size="16">
            Profile Score
          </text>
          
          <!-- Strengths -->
          <text x="40" y="280" fill="white" font-size="20" font-weight="bold">Strengths:</text>
          ${reportData.strengths.map((strength, index) => 
            `<text x="40" y="${310 + index * 25}" fill="white" font-size="16">• ${strength}</text>`
          ).join('')}
          
          <!-- Improvements -->
          <text x="40" y="420" fill="white" font-size="20" font-weight="bold">Areas to Improve:</text>
          ${reportData.improvements.map((improvement, index) => 
            `<text x="40" y="${450 + index * 25}" fill="white" font-size="16">• ${improvement}</text>`
          ).join('')}
          
          <!-- Footer -->
          <text x="200" y="550" text-anchor="middle" fill="white" font-size="14">
            Generated on ${reportData.timestamp}
          </text>
        </svg>
      `);

      // Save as image
      const imagePath = `${RNFS.CachesDirectoryPath}/profile-report-${Date.now()}.png`;
      
      // Convert SVG to PNG (simplified approach)
      // In a real implementation, you'd use a library like react-native-svg to create the image
      
      return imagePath;
    } catch (error) {
      console.error('Error generating visual report:', error);
      return null;
    }
  }, [profileData]);

  // Share to specific platform
  const shareToPhone = useCallback(async (platform: string) => {
    try {
      if (!generatedContent) {
        await generateShareableContent();
        return;
      }

      let shareOptions = {
        title: 'My Dating Profile Report',
        message: generatedContent,
        url: undefined as string | undefined
      };

      // Add visual report if photos are included
      if (sharingOptions.includePhotos) {
        const imagePath = await generateVisualReport();
        if (imagePath) {
          shareOptions.url = `file://${imagePath}`;
        }
      }

      switch (platform) {
        case 'instagram':
          // Instagram Stories sharing (requires Instagram app)
          if (await Linking.canOpenURL('instagram://')) {
            const instagramUrl = `instagram://library?AssetPath=${shareOptions.url}`;
            await Linking.openURL(instagramUrl);
          } else {
            Alert.alert('Instagram not installed', 'Please install Instagram to share');
          }
          break;
          
        case 'linkedin':
          const linkedInText = encodeURIComponent(shareOptions.message);
          const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=https://datingprofileoptimizer.com&text=${linkedInText}`;
          await Linking.openURL(linkedInUrl);
          break;
          
        case 'twitter':
          const twitterText = encodeURIComponent(shareOptions.message);
          const twitterUrl = `https://twitter.com/intent/tweet?text=${twitterText}`;
          await Linking.openURL(twitterUrl);
          break;
          
        case 'whatsapp':
          const whatsappText = encodeURIComponent(shareOptions.message);
          const whatsappUrl = `whatsapp://send?text=${whatsappText}`;
          await Linking.openURL(whatsappUrl);
          break;
          
        default:
          // Use React Native Share for generic sharing
          await Share.share(shareOptions);
      }

      // Track successful share
      trackEvent('profile_shared', {
        profile_id: profileData.id,
        platform: platform,
        content_type: sharingOptions.includePhotos ? 'visual' : 'text'
      });

      setIsModalVisible(false);
      Alert.alert('Success', `Profile shared to ${platform}!`);
      
    } catch (error) {
      console.error('Error sharing profile:', error);
      Alert.alert('Error', 'Failed to share profile');
    }
  }, [generatedContent, sharingOptions, generateShareableContent, generateVisualReport, trackEvent, profileData.id]);

  // Request permissions for sharing
  const requestPermissions = useCallback(async () => {
    if (Platform.OS === 'android') {
      try {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
      } catch (error) {
        console.warn('Permission request failed:', error);
      }
    }
  }, []);

  useEffect(() => {
    requestPermissions();
  }, [requestPermissions]);

  // Generate content when options change
  useEffect(() => {
    if (isModalVisible) {
      generateShareableContent();
    }
  }, [sharingOptions, isModalVisible, generateShareableContent]);

  const styles = StyleSheet.create({
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
      width: '90%',
      maxHeight: '80%'
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 20
    },
    optionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border
    },
    optionLabel: {
      fontSize: 16,
      color: colors.text,
      flex: 1
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center'
    },
    checkboxChecked: {
      backgroundColor: colors.primary
    },
    platformGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginVertical: 20
    },
    platformButton: {
      width: '48%',
      padding: 15,
      borderRadius: 12,
      backgroundColor: colors.surface,
      alignItems: 'center',
      marginBottom: 10
    },
    platformButtonSelected: {
      backgroundColor: colors.primary
    },
    platformText: {
      color: colors.text,
      fontWeight: '600',
      marginTop: 8
    },
    platformTextSelected: {
      color: 'white'
    },
    previewContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginVertical: 16
    },
    previewTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8
    },
    previewText: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20
    },
    actionButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20
    },
    button: {
      flex: 1,
      padding: 15,
      borderRadius: 12,
      alignItems: 'center',
      marginHorizontal: 5
    },
    primaryButton: {
      backgroundColor: colors.primary
    },
    secondaryButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600'
    },
    primaryButtonText: {
      color: 'white'
    },
    secondaryButtonText: {
      color: colors.text
    }
  });

  return (
    <View>
      <TouchableOpacity
        style={[styles.primaryButton, { padding: 12, borderRadius: 8 }]}
        onPress={() => setIsModalVisible(true)}
      >
        <Text style={styles.primaryButtonText}>Share Profile</Text>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>Share Your Profile</Text>

            {/* Sharing Options */}
            <View>
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => setSharingOptions(prev => ({ ...prev, includeBio: !prev.includeBio }))}
              >
                <Text style={styles.optionLabel}>Include Bio</Text>
                <View style={[styles.checkbox, sharingOptions.includeBio && styles.checkboxChecked]}>
                  {sharingOptions.includeBio && <Text style={{ color: 'white' }}>✓</Text>}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => setSharingOptions(prev => ({ ...prev, includeAnalytics: !prev.includeAnalytics }))}
              >
                <Text style={styles.optionLabel}>Include Analytics</Text>
                <View style={[styles.checkbox, sharingOptions.includeAnalytics && styles.checkboxChecked]}>
                  {sharingOptions.includeAnalytics && <Text style={{ color: 'white' }}>✓</Text>}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => setSharingOptions(prev => ({ ...prev, includePhotos: !prev.includePhotos }))}
              >
                <Text style={styles.optionLabel}>Include Visual Report</Text>
                <View style={[styles.checkbox, sharingOptions.includePhotos && styles.checkboxChecked]}>
                  {sharingOptions.includePhotos && <Text style={{ color: 'white' }}>✓</Text>}
                </View>
              </TouchableOpacity>
            </View>

            {/* Platform Selection */}
            <Text style={[styles.modalTitle, { fontSize: 18, marginTop: 20 }]}>Choose Platform</Text>
            <View style={styles.platformGrid}>
              {['instagram', 'linkedin', 'twitter', 'whatsapp'].map((platform) => (
                <TouchableOpacity
                  key={platform}
                  style={[
                    styles.platformButton,
                    sharingOptions.platform === platform && styles.platformButtonSelected
                  ]}
                  onPress={() => setSharingOptions(prev => ({ ...prev, platform: platform as any }))}
                >
                  <Text style={platform === 'instagram' ? '📸' : 
                              platform === 'linkedin' ? '💼' : 
                              platform === 'twitter' ? '🐦' : '💬'}>
                    {platform === 'instagram' ? '📸' : 
                     platform === 'linkedin' ? '💼' : 
                     platform === 'twitter' ? '🐦' : '💬'}
                  </Text>
                  <Text style={[
                    styles.platformText,
                    sharingOptions.platform === platform && styles.platformTextSelected
                  ]}>
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Content Preview */}
            {generatedContent && (
              <View style={styles.previewContainer}>
                <Text style={styles.previewTitle}>Preview</Text>
                <Text style={styles.previewText} numberOfLines={10}>
                  {generatedContent}
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={() => shareToPhone(sharingOptions.platform)}
                disabled={isGenerating}
              >
                <Text style={[styles.buttonText, styles.primaryButtonText]}>
                  {isGenerating ? 'Generating...' : 'Share'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

export default ProfileSharingManager;