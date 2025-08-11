import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  TextInput,
  Surface,
  Chip,
  ActivityIndicator,
  IconButton,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Clipboard from '@react-native-clipboard/clipboard';
import { useAuth } from '../contexts/AuthContext';

interface BioGenerationScreenProps {
  navigation: any;
}

interface GeneratedBio {
  text: string;
  style: string;
  platform: string;
  score: number;
  tips: string[];
}

interface UserProfile {
  age?: number;
  interests?: string[];
  occupation?: string;
  location?: string;
  relationship_goal?: string;
  personality_traits?: string[];
}

const BioGenerationScreen: React.FC<BioGenerationScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const [generatedBios, setGeneratedBios] = useState<GeneratedBio[]>([]);
  const [selectedStyle, setSelectedStyle] = useState('casual');
  const [selectedPlatform, setPlatform] = useState('tinder');
  const [customPrompt, setCustomPrompt] = useState('');
  const [hasGenerated, setHasGenerated] = useState(false);
  const [currentInterest, setCurrentInterest] = useState('');

  const bioStyles = [
    { key: 'casual', label: 'Casual & Fun', icon: 'sentiment-very-satisfied' },
    { key: 'professional', label: 'Professional', icon: 'business-center' },
    { key: 'romantic', label: 'Romantic', icon: 'favorite' },
    { key: 'humorous', label: 'Funny', icon: 'mood' },
    { key: 'adventurous', label: 'Adventurous', icon: 'explore' },
    { key: 'intellectual', label: 'Intellectual', icon: 'school' },
  ];

  const platforms = [
    { key: 'tinder', label: 'Tinder', icon: 'local-fire-department' },
    { key: 'bumble', label: 'Bumble', icon: 'pets' },
    { key: 'hinge', label: 'Hinge', icon: 'link' },
    { key: 'match', label: 'Match.com', icon: 'favorite' },
    { key: 'okcupid', label: 'OkCupid', icon: 'quiz' },
    { key: 'general', label: 'General', icon: 'public' },
  ];

  const suggestedInterests = [
    'Travel', 'Photography', 'Cooking', 'Fitness', 'Reading', 'Music',
    'Movies', 'Hiking', 'Coffee', 'Wine', 'Art', 'Dancing', 'Yoga',
    'Gaming', 'Sports', 'Netflix', 'Concerts', 'Foodie', 'Beach',
    'Dogs', 'Cats', 'Adventure', 'Nature', 'Technology', 'Fashion'
  ];

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const response = await fetch('http://localhost:3004/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Extract profile info for bio generation
        const profile: UserProfile = {
          age: data.user.date_of_birth ? calculateAge(data.user.date_of_birth) : undefined,
        };
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const updateProfileField = (field: keyof UserProfile, value: any) => {
    setUserProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerateBio = async () => {
    if (!userProfile.interests || userProfile.interests.length === 0) {
      Alert.alert(
        'Profile Incomplete',
        'Please add at least some interests to generate a personalized bio.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsLoading(true);
    
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const response = await fetch('http://localhost:3004/api/bio/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userProfile: {
            ...userProfile,
            name: user?.first_name,
          },
          preferences: {
            style: selectedStyle,
            platform: selectedPlatform,
            customPrompt: customPrompt.trim() || undefined,
          },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setGeneratedBios(data.bios || [data.bio]);
        setHasGenerated(true);
      } else {
        Alert.alert(
          'Generation Failed',
          data.message || 'Failed to generate bio. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Bio generation error:', error);
      Alert.alert(
        'Connection Error',
        'Unable to connect to server. Please check your internet connection.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBio = (bio: GeneratedBio) => {
    Alert.alert(
      'Bio Saved!',
      'Your bio has been saved to your profile. You can edit it anytime.',
      [
        { text: 'OK' },
        { 
          text: 'View Profile', 
          onPress: () => navigation.navigate('Profile') 
        }
      ]
    );
  };

  const handleRegenerateBio = () => {
    setGeneratedBios([]);
    setHasGenerated(false);
  };

  const handleCopyBio = async (bioText: string) => {
    try {
      await Clipboard.setString(bioText);
      Alert.alert(
        'Copied!',
        'Bio has been copied to clipboard. You can now paste it in your dating app profile.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      Alert.alert(
        'Copy Failed',
        'Unable to copy to clipboard. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const addInterest = (interest: string) => {
    if (interest.trim()) {
      const currentInterests = userProfile.interests || [];
      if (!currentInterests.includes(interest.trim())) {
        const updatedInterests = [...currentInterests, interest.trim()];
        updateProfileField('interests', updatedInterests);
        setCurrentInterest('');
      }
    }
  };

  const handleAddInterest = () => {
    if (currentInterest.trim()) {
      addInterest(currentInterest);
    }
  };

  const removeInterest = (index: number) => {
    if (userProfile.interests) {
      const updatedInterests = userProfile.interests.filter((_, i) => i !== index);
      updateProfileField('interests', updatedInterests);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!hasGenerated ? (
            <>
              {/* Profile Setup */}
              <Surface style={styles.section}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  📝 Tell Us About Yourself
                </Text>

                <TextInput
                  label="Age"
                  value={userProfile.age?.toString() || ''}
                  onChangeText={(text) => updateProfileField('age', parseInt(text) || undefined)}
                  keyboardType="numeric"
                  style={styles.input}
                  mode="outlined"
                />

                <TextInput
                  label="Occupation"
                  value={userProfile.occupation || ''}
                  onChangeText={(text) => updateProfileField('occupation', text)}
                  style={styles.input}
                  mode="outlined"
                  placeholder="Software Engineer, Teacher, etc."
                />

                <TextInput
                  label="Location (City)"
                  value={userProfile.location || ''}
                  onChangeText={(text) => updateProfileField('location', text)}
                  style={styles.input}
                  mode="outlined"
                  placeholder="New York, London, etc."
                />

                {/* Interests Section */}
                <View style={styles.interestsSection}>
                  <Text variant="titleSmall" style={styles.fieldLabel}>
                    Your Interests & Hobbies
                  </Text>
                  <TextInput
                    label="Add an interest"
                    value={currentInterest}
                    onChangeText={setCurrentInterest}
                    style={styles.input}
                    mode="outlined"
                    onSubmitEditing={handleAddInterest}
                    returnKeyType="done"
                    right={
                      <TextInput.Icon 
                        icon="add" 
                        onPress={handleAddInterest}
                        disabled={!currentInterest.trim()}
                      />
                    }
                    placeholder="Travel, Photography, Cooking, etc."
                  />
                  
                  <View style={styles.chipsContainer}>
                    {userProfile.interests?.map((interest, index) => (
                      <Chip
                        key={index}
                        onClose={() => removeInterest(index)}
                        style={styles.interestChip}
                        textStyle={styles.interestChipText}
                      >
                        {interest}
                      </Chip>
                    ))}
                  </View>

                  {/* Suggested Interests */}
                  {suggestedInterests.filter(suggestion => 
                    !userProfile.interests?.includes(suggestion)
                  ).length > 0 && (
                    <View style={styles.suggestedSection}>
                      <Text variant="bodySmall" style={styles.suggestedTitle}>
                        Quick suggestions:
                      </Text>
                      <View style={styles.suggestedChipsContainer}>
                        {suggestedInterests
                          .filter(suggestion => !userProfile.interests?.includes(suggestion))
                          .slice(0, 12)
                          .map((interest) => (
                          <Chip
                            key={interest}
                            onPress={() => addInterest(interest)}
                            style={styles.suggestedChip}
                            textStyle={styles.suggestedChipText}
                            mode="outlined"
                          >
                            {interest}
                          </Chip>
                        ))}
                      </View>
                    </View>
                  )}
                </View>

                <TextInput
                  label="Relationship Goal"
                  value={userProfile.relationship_goal || ''}
                  onChangeText={(text) => updateProfileField('relationship_goal', text)}
                  style={styles.input}
                  mode="outlined"
                  placeholder="Long-term relationship, Casual dating, etc."
                />
              </Surface>

              {/* Bio Style Selection */}
              <Surface style={styles.section}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  🎨 Choose Your Style
                </Text>
                <View style={styles.optionsGrid}>
                  {bioStyles.map((style) => (
                    <Card
                      key={style.key}
                      style={[
                        styles.optionCard,
                        selectedStyle === style.key && styles.selectedCard
                      ]}
                      onPress={() => setSelectedStyle(style.key)}
                    >
                      <Card.Content style={styles.optionContent}>
                        <Icon 
                          name={style.icon} 
                          size={24} 
                          color={selectedStyle === style.key ? '#e91e63' : '#666'} 
                        />
                        <Text 
                          variant="bodySmall" 
                          style={[
                            styles.optionText,
                            selectedStyle === style.key && styles.selectedText
                          ]}
                        >
                          {style.label}
                        </Text>
                      </Card.Content>
                    </Card>
                  ))}
                </View>
              </Surface>

              {/* Platform Selection */}
              <Surface style={styles.section}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  📱 Target Platform
                </Text>
                <View style={styles.optionsGrid}>
                  {platforms.map((platform) => (
                    <Card
                      key={platform.key}
                      style={[
                        styles.optionCard,
                        selectedPlatform === platform.key && styles.selectedCard
                      ]}
                      onPress={() => setPlatform(platform.key)}
                    >
                      <Card.Content style={styles.optionContent}>
                        <Icon 
                          name={platform.icon} 
                          size={20} 
                          color={selectedPlatform === platform.key ? '#e91e63' : '#666'} 
                        />
                        <Text 
                          variant="bodySmall" 
                          style={[
                            styles.optionText,
                            selectedPlatform === platform.key && styles.selectedText
                          ]}
                        >
                          {platform.label}
                        </Text>
                      </Card.Content>
                    </Card>
                  ))}
                </View>
              </Surface>

              {/* Custom Prompt */}
              <Surface style={styles.section}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  ✨ Custom Instructions (Optional)
                </Text>
                <TextInput
                  label="Special requests for your bio"
                  value={customPrompt}
                  onChangeText={setCustomPrompt}
                  multiline
                  numberOfLines={3}
                  style={styles.input}
                  mode="outlined"
                  placeholder="e.g., 'Mention my dog', 'Include something about my love for hiking', etc."
                />
              </Surface>

              {/* Generate Button */}
              <View style={styles.generateSection}>
                <Button
                  mode="contained"
                  onPress={handleGenerateBio}
                  style={styles.generateButton}
                  disabled={isLoading}
                  loading={isLoading}
                  icon="auto-awesome"
                >
                  {isLoading ? 'Generating...' : 'Generate My Bio'}
                </Button>
              </View>
            </>
          ) : (
            <>
              {/* Generated Bios */}
              <Surface style={styles.section}>
                <View style={styles.resultsHeader}>
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    🎉 Your Generated Bios
                  </Text>
                  <IconButton
                    icon="refresh"
                    size={24}
                    onPress={handleRegenerateBio}
                  />
                </View>
                
                {generatedBios.map((bio, index) => (
                  <Card key={index} style={styles.bioCard}>
                    <Card.Content>
                      <View style={styles.bioHeader}>
                        <View style={styles.bioInfo}>
                          <Chip style={styles.styleChip}>
                            {bioStyles.find(s => s.key === bio.style)?.label || bio.style}
                          </Chip>
                          <Chip style={styles.platformChip}>
                            {platforms.find(p => p.key === bio.platform)?.label || bio.platform}
                          </Chip>
                        </View>
                        <View style={styles.scoreContainer}>
                          <Icon name="star" size={16} color="#ff9800" />
                          <Text variant="bodySmall" style={styles.scoreText}>
                            {bio.score}/100
                          </Text>
                        </View>
                      </View>
                      
                      <Text variant="bodyMedium" style={styles.bioText}>
                        {bio.text}
                      </Text>
                      
                      {bio.tips && bio.tips.length > 0 && (
                        <>
                          <Divider style={styles.divider} />
                          <Text variant="titleSmall" style={styles.tipsTitle}>
                            💡 Optimization Tips:
                          </Text>
                          {bio.tips.map((tip, tipIndex) => (
                            <Text key={tipIndex} variant="bodySmall" style={styles.tipText}>
                              • {tip}
                            </Text>
                          ))}
                        </>
                      )}
                      
                      <View style={styles.bioActions}>
                        <Button
                          mode="outlined"
                          onPress={() => handleCopyBio(bio.text)}
                          style={styles.actionButton}
                          icon="content-copy"
                        >
                          Copy
                        </Button>
                        <Button
                          mode="contained"
                          onPress={() => handleSaveBio(bio)}
                          style={styles.actionButton}
                          icon="save"
                        >
                          Save Bio
                        </Button>
                      </View>
                    </Card.Content>
                  </Card>
                ))}
                
                <Button
                  mode="outlined"
                  onPress={handleRegenerateBio}
                  style={styles.regenerateButton}
                  icon="refresh"
                >
                  Generate New Bios
                </Button>
              </Surface>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  keyboardContainer: {
    flex: 1,
  },
  section: {
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
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
    marginBottom: 16,
    color: '#212121',
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'white',
  },
  fieldLabel: {
    marginBottom: 8,
    color: '#212121',
    fontWeight: '600',
  },
  interestsSection: {
    marginBottom: 12,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  interestChip: {
    backgroundColor: '#e3f2fd',
  },
  interestChipText: {
    color: '#1976d2',
  },
  suggestedSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  suggestedTitle: {
    color: '#666',
    marginBottom: 8,
  },
  suggestedChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestedChip: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  suggestedChipText: {
    color: '#666',
    fontSize: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionCard: {
    width: '47%',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  selectedCard: {
    borderColor: '#e91e63',
    borderWidth: 2,
    elevation: 4,
  },
  optionContent: {
    alignItems: 'center',
    padding: 12,
    minHeight: 70,
    justifyContent: 'center',
  },
  optionText: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
  selectedText: {
    color: '#e91e63',
    fontWeight: 'bold',
  },
  generateSection: {
    margin: 16,
    marginTop: 8,
  },
  generateButton: {
    paddingVertical: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bioCard: {
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  bioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bioInfo: {
    flexDirection: 'row',
    gap: 8,
  },
  styleChip: {
    backgroundColor: '#e8f5e8',
    height: 28,
  },
  platformChip: {
    backgroundColor: '#fff3e0',
    height: 28,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreText: {
    color: '#ff9800',
    fontWeight: 'bold',
  },
  bioText: {
    lineHeight: 22,
    color: '#212121',
    marginBottom: 12,
    fontSize: 15,
  },
  divider: {
    marginVertical: 12,
  },
  tipsTitle: {
    color: '#4caf50',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tipText: {
    color: '#666',
    marginBottom: 4,
    marginLeft: 8,
    lineHeight: 18,
  },
  bioActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
  },
  regenerateButton: {
    marginTop: 8,
    borderColor: '#e91e63',
  },
});

export default BioGenerationScreen;