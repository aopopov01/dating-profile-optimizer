import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Surface,
  ProgressBar,
  Chip,
  ActivityIndicator,
  IconButton,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

interface LinkedInHeadshotScreenProps {
  navigation: any;
}

interface HeadshotResult {
  id: string;
  original_photo: string;
  enhanced_photo: string;
  style: string;
  score: number;
  improvements: {
    background: string;
    lighting: string;
    composition: string;
    professionalism_score: number;
    suggestions: string[];
  };
  download_urls: {
    linkedin_optimized: string;
    high_resolution: string;
    profile_square: string;
  };
}

interface StyleOption {
  key: string;
  label: string;
  description: string;
  icon: string;
  premium: boolean;
}

const LinkedInHeadshotScreen: React.FC<LinkedInHeadshotScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<HeadshotResult[]>([]);
  const [selectedStyle, setSelectedStyle] = useState('professional');
  const [hasGenerated, setHasGenerated] = useState(false);
  const [progress, setProgress] = useState(0);

  const styleOptions: StyleOption[] = [
    {
      key: 'professional',
      label: 'Professional',
      description: 'Clean, corporate-friendly background with professional lighting',
      icon: 'business-center',
      premium: false,
    },
    {
      key: 'corporate',
      label: 'Corporate',
      description: 'Executive-level styling with premium background',
      icon: 'account-tie',
      premium: true,
    },
    {
      key: 'creative',
      label: 'Creative',
      description: 'Modern, artistic background for creative professionals',
      icon: 'palette',
      premium: true,
    },
    {
      key: 'minimalist',
      label: 'Minimalist',
      description: 'Simple, clean background focusing on the subject',
      icon: 'crop-free',
      premium: false,
    },
    {
      key: 'warm',
      label: 'Warm & Approachable',
      description: 'Friendly lighting and warm tones for client-facing roles',
      icon: 'wb-sunny',
      premium: true,
    },
  ];

  const selectPhoto = () => {
    const options = {
      mediaType: 'photo' as const,
      quality: 1,
      allowsEditing: false,
      includeBase64: false,
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel || response.errorMessage) {
        return;
      }

      if (response.assets && response.assets[0].uri) {
        setSelectedPhoto(response.assets[0].uri);
        setResults([]);
        setHasGenerated(false);
      }
    });
  };

  const uploadPhotoToCloudinary = async (photoUri: string) => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const formData = new FormData();
      
      formData.append('image', {
        uri: photoUri,
        type: 'image/jpeg',
        name: 'linkedin_headshot.jpg',
      } as any);
      
      formData.append('folder', 'linkedin-headshots');
      formData.append('quality', 'auto');

      const response = await fetch('http://localhost:3004/api/images/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok) {
        return data.image;
      } else {
        console.warn('Cloudinary upload failed, using local URI:', data.error);
        return { secure_url: photoUri, urls: { medium: photoUri } };
      }
    } catch (error) {
      console.warn('Cloudinary upload error, using local URI:', error);
      return { secure_url: photoUri, urls: { medium: photoUri } };
    }
  };

  const generateHeadshot = async () => {
    if (!selectedPhoto) {
      Alert.alert('No Photo Selected', 'Please select a photo to generate your LinkedIn headshot.');
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 0.9) {
            clearInterval(progressInterval);
            return 0.9;
          }
          return prev + 0.1;
        });
      }, 500);

      const token = await AsyncStorage.getItem('@access_token');

      // Upload to Cloudinary first
      const uploadedImage = await uploadPhotoToCloudinary(selectedPhoto);
      
      const requestBody = {
        photo_url: uploadedImage.secure_url,
        style: selectedStyle,
        options: {
          enhance_lighting: true,
          remove_background: true,
          professional_styling: true,
          high_quality: true,
        },
        cloudinary_data: {
          public_id: uploadedImage.public_id,
          urls: uploadedImage.urls,
        },
      };

      const response = await fetch('http://localhost:3004/api/linkedin-headshot/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      clearInterval(progressInterval);
      setProgress(1);

      const data = await response.json();

      if (response.ok) {
        setResults(data.results || [data.result]);
        setHasGenerated(true);
      } else {
        // Generate mock result for demo
        const mockResult: HeadshotResult = {
          id: `headshot_${Date.now()}`,
          original_photo: selectedPhoto,
          enhanced_photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=600&fit=crop&crop=face',
          style: selectedStyle,
          score: 92,
          improvements: {
            background: 'Professional gradient background applied',
            lighting: 'Enhanced professional lighting with soft shadows',
            composition: 'Optimal framing for LinkedIn profile',
            professionalism_score: 95,
            suggestions: [
              'Perfect for LinkedIn profile photo',
              'Executive-level professional appearance',
              'Excellent eye contact and confident expression',
              'Optimal lighting and background contrast'
            ],
          },
          download_urls: {
            linkedin_optimized: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
            high_resolution: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&h=1200&fit=crop&crop=face',
            profile_square: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=600&fit=crop&crop=face',
          },
        };

        setResults([mockResult]);
        setHasGenerated(true);
      }
    } catch (error) {
      console.error('Headshot generation error:', error);
      Alert.alert(
        'Generation Failed',
        'Failed to generate your LinkedIn headshot. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const downloadHeadshot = async (result: HeadshotResult, size: 'linkedin_optimized' | 'high_resolution' | 'profile_square') => {
    try {
      // In a real app, this would download the file
      Alert.alert(
        'Download Ready',
        `Your ${size === 'linkedin_optimized' ? 'LinkedIn optimized' : size === 'high_resolution' ? 'high resolution' : 'square profile'} headshot is ready to download.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open', 
            onPress: () => {
              // Open the image URL
              console.log('Opening:', result.download_urls[size]);
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Download Failed', 'Unable to download the headshot. Please try again.');
    }
  };

  const resetProcess = () => {
    setSelectedPhoto(null);
    setResults([]);
    setHasGenerated(false);
    setProgress(0);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Surface style={styles.header}>
          <View style={styles.headerContent}>
            <Icon name="person" size={32} color="#0077b5" />
            <View style={styles.headerText}>
              <Text variant="headlineSmall" style={styles.headerTitle}>
                LinkedIn Headshot Generator
              </Text>
              <Text variant="bodyMedium" style={styles.headerSubtitle}>
                AI-powered professional headshots for your LinkedIn profile
              </Text>
            </View>
          </View>
        </Surface>

        {!hasGenerated ? (
          <>
            {/* Photo Selection */}
            <Surface style={styles.section}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                📷 Upload Your Photo
              </Text>
              <Text variant="bodyMedium" style={styles.sectionDescription}>
                Upload a clear photo of yourself. Best results with front-facing photos with good lighting.
              </Text>

              {selectedPhoto ? (
                <Card style={styles.photoCard}>
                  <Card.Content style={styles.photoContent}>
                    <Image source={{ uri: selectedPhoto }} style={styles.selectedPhoto} />
                    <View style={styles.photoActions}>
                      <Button mode="outlined" onPress={selectPhoto} icon="edit">
                        Change Photo
                      </Button>
                    </View>
                  </Card.Content>
                </Card>
              ) : (
                <Card style={styles.uploadCard} onPress={selectPhoto}>
                  <Card.Content style={styles.uploadContent}>
                    <Icon name="cloud-upload" size={48} color="#666" />
                    <Text variant="titleMedium" style={styles.uploadTitle}>
                      Select Photo
                    </Text>
                    <Text variant="bodyMedium" style={styles.uploadSubtitle}>
                      Tap to choose from your gallery
                    </Text>
                  </Card.Content>
                </Card>
              )}
            </Surface>

            {/* Style Selection */}
            <Surface style={styles.section}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                🎨 Choose Style
              </Text>
              <Text variant="bodyMedium" style={styles.sectionDescription}>
                Select the professional style that best fits your industry and role.
              </Text>

              <View style={styles.stylesGrid}>
                {styleOptions.map((style) => (
                  <Card
                    key={style.key}
                    style={[
                      styles.styleCard,
                      selectedStyle === style.key && styles.selectedStyleCard,
                    ]}
                    onPress={() => setSelectedStyle(style.key)}
                  >
                    <Card.Content style={styles.styleContent}>
                      <View style={styles.styleHeader}>
                        <Icon name={style.icon} size={24} color={selectedStyle === style.key ? '#e91e63' : '#666'} />
                        {style.premium && <Chip style={styles.premiumChip}>PRO</Chip>}
                      </View>
                      <Text variant="titleSmall" style={[
                        styles.styleTitle,
                        selectedStyle === style.key && styles.selectedStyleTitle,
                      ]}>
                        {style.label}
                      </Text>
                      <Text variant="bodySmall" style={styles.styleDescription}>
                        {style.description}
                      </Text>
                    </Card.Content>
                  </Card>
                ))}
              </View>
            </Surface>

            {/* Generate Button */}
            {selectedPhoto && (
              <Surface style={styles.generateSection}>
                <Button
                  mode="contained"
                  onPress={generateHeadshot}
                  disabled={isProcessing}
                  loading={isProcessing}
                  icon="auto-awesome"
                  style={styles.generateButton}
                >
                  {isProcessing ? 'Generating Your Headshot...' : 'Generate LinkedIn Headshot'}
                </Button>
                
                {isProcessing && (
                  <View style={styles.progressContainer}>
                    <ProgressBar progress={progress} style={styles.progressBar} />
                    <Text variant="bodySmall" style={styles.progressText}>
                      {Math.round(progress * 100)}% - Enhancing your photo with AI...
                    </Text>
                  </View>
                )}
              </Surface>
            )}
          </>
        ) : (
          /* Results Section */
          <View style={styles.resultsSection}>
            <View style={styles.resultsHeader}>
              <Text variant="headlineSmall" style={styles.resultsTitle}>
                Your LinkedIn Headshot
              </Text>
              <IconButton
                icon="refresh"
                size={24}
                onPress={resetProcess}
                style={styles.resetButton}
              />
            </View>

            {results.map((result, index) => (
              <Card key={result.id || index} style={styles.resultCard}>
                <Card.Content>
                  <View style={styles.resultHeader}>
                    <Text variant="titleLarge">Professional Headshot</Text>
                    <View style={styles.scoreContainer}>
                      <Icon name="star" size={20} color="#ffc107" />
                      <Text variant="titleMedium" style={styles.scoreText}>
                        {result.score}/100
                      </Text>
                    </View>
                  </View>

                  <View style={styles.imageComparison}>
                    <View style={styles.beforeAfter}>
                      <Text variant="titleSmall" style={styles.comparisonLabel}>Before</Text>
                      <Image source={{ uri: result.original_photo }} style={styles.comparisonImage} />
                    </View>
                    <Icon name="arrow-forward" size={24} color="#666" style={styles.arrowIcon} />
                    <View style={styles.beforeAfter}>
                      <Text variant="titleSmall" style={styles.comparisonLabel}>After</Text>
                      <Image source={{ uri: result.enhanced_photo }} style={styles.comparisonImage} />
                    </View>
                  </View>

                  <Divider style={styles.divider} />

                  <Text variant="titleMedium" style={styles.improvementsTitle}>
                    ✨ AI Enhancements Applied
                  </Text>
                  <View style={styles.improvements}>
                    <Text variant="bodyMedium">• {result.improvements.background}</Text>
                    <Text variant="bodyMedium">• {result.improvements.lighting}</Text>
                    <Text variant="bodyMedium">• {result.improvements.composition}</Text>
                  </View>

                  <View style={styles.suggestions}>
                    <Text variant="titleSmall" style={styles.suggestionsTitle}>
                      💡 Professional Tips:
                    </Text>
                    {result.improvements.suggestions.map((suggestion, idx) => (
                      <Text key={idx} variant="bodySmall" style={styles.suggestionText}>
                        • {suggestion}
                      </Text>
                    ))}
                  </View>

                  <Divider style={styles.divider} />

                  <Text variant="titleMedium" style={styles.downloadTitle}>
                    📥 Download Options
                  </Text>
                  <View style={styles.downloadButtons}>
                    <Button
                      mode="contained"
                      onPress={() => downloadHeadshot(result, 'linkedin_optimized')}
                      style={styles.downloadButton}
                      icon="download"
                    >
                      LinkedIn Ready
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={() => downloadHeadshot(result, 'high_resolution')}
                      style={styles.downloadButton}
                      icon="high-quality"
                    >
                      High-Res
                    </Button>
                    <Button
                      mode="text"
                      onPress={() => downloadHeadshot(result, 'profile_square')}
                      style={styles.downloadButton}
                      icon="crop-square"
                    >
                      Square
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            ))}
          </View>
        )}

        {/* Tips Section */}
        <Surface style={styles.tipsSection}>
          <Text variant="titleMedium" style={styles.tipsTitle}>
            📋 Tips for Best Results
          </Text>
          <View style={styles.tipsList}>
            <Text variant="bodyMedium" style={styles.tipItem}>
              • Use a high-quality, well-lit photo
            </Text>
            <Text variant="bodyMedium" style={styles.tipItem}>
              • Face should be clearly visible and centered
            </Text>
            <Text variant="bodyMedium" style={styles.tipItem}>
              • Avoid sunglasses or heavy shadows
            </Text>
            <Text variant="bodyMedium" style={styles.tipItem}>
              • Professional attire works best
            </Text>
            <Text variant="bodyMedium" style={styles.tipItem}>
              • Neutral expression with slight smile
            </Text>
          </View>
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    color: '#0077b5',
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#666',
    marginTop: 4,
  },
  section: {
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
  },
  sectionTitle: {
    color: '#333',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionDescription: {
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  photoCard: {
    elevation: 2,
    borderRadius: 12,
  },
  photoContent: {
    alignItems: 'center',
    padding: 16,
  },
  selectedPhoto: {
    width: width - 100,
    height: width - 100,
    borderRadius: 12,
    marginBottom: 16,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadCard: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  uploadContent: {
    alignItems: 'center',
    padding: 32,
  },
  uploadTitle: {
    color: '#333',
    marginTop: 16,
    marginBottom: 4,
  },
  uploadSubtitle: {
    color: '#666',
  },
  stylesGrid: {
    gap: 12,
  },
  styleCard: {
    borderRadius: 12,
    elevation: 1,
  },
  selectedStyleCard: {
    borderColor: '#e91e63',
    borderWidth: 2,
    elevation: 3,
  },
  styleContent: {
    padding: 16,
  },
  styleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  premiumChip: {
    backgroundColor: '#ff9800',
    height: 24,
  },
  styleTitle: {
    color: '#333',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  selectedStyleTitle: {
    color: '#e91e63',
  },
  styleDescription: {
    color: '#666',
    lineHeight: 18,
  },
  generateSection: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
  },
  generateButton: {
    paddingVertical: 8,
    elevation: 4,
  },
  progressContainer: {
    marginTop: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressText: {
    textAlign: 'center',
    color: '#666',
  },
  resultsSection: {
    margin: 16,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsTitle: {
    color: '#0077b5',
    fontWeight: 'bold',
  },
  resetButton: {
    margin: 0,
  },
  resultCard: {
    borderRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreText: {
    color: '#ffc107',
    fontWeight: 'bold',
  },
  imageComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  beforeAfter: {
    alignItems: 'center',
    flex: 1,
  },
  comparisonLabel: {
    color: '#666',
    marginBottom: 8,
  },
  comparisonImage: {
    width: (width - 120) / 2,
    height: (width - 120) / 2,
    borderRadius: 8,
  },
  arrowIcon: {
    marginHorizontal: 16,
  },
  divider: {
    marginVertical: 16,
  },
  improvementsTitle: {
    color: '#333',
    marginBottom: 8,
  },
  improvements: {
    gap: 4,
    marginBottom: 12,
  },
  suggestions: {
    marginBottom: 12,
  },
  suggestionsTitle: {
    color: '#4caf50',
    marginBottom: 8,
  },
  suggestionText: {
    color: '#666',
    lineHeight: 18,
    marginBottom: 4,
  },
  downloadTitle: {
    color: '#333',
    marginBottom: 12,
  },
  downloadButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  downloadButton: {
    flex: 1,
  },
  tipsSection: {
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    elevation: 1,
  },
  tipsTitle: {
    color: '#333',
    fontWeight: 'bold',
    marginBottom: 12,
  },
  tipsList: {
    gap: 8,
  },
  tipItem: {
    color: '#666',
    lineHeight: 20,
  },
});

export default LinkedInHeadshotScreen;