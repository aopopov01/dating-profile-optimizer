import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Button,
  ActivityIndicator,
  RadioButton,
  IconButton,
} from 'react-native-paper';

interface GeneratedBio {
  id: string;
  text: string;
  style: 'professional' | 'casual' | 'witty' | 'adventurous';
  score: number;
  personalityMatch: number;
}

interface BioGeneratorProps {
  userProfile: any;
  photoAnalysis: any;
  onBioSelected: (bio: GeneratedBio) => void;
}

const BioGenerator: React.FC<BioGeneratorProps> = ({
  userProfile,
  photoAnalysis,
  onBioSelected,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBios, setGeneratedBios] = useState<GeneratedBio[]>([]);
  const [selectedBio, setSelectedBio] = useState<string>('');
  const [regenerationCount, setRegenerationCount] = useState(0);

  const bioStyles = [
    { label: 'Professional', value: 'professional', icon: 'briefcase' },
    { label: 'Casual & Fun', value: 'casual', icon: 'emoticon-happy' },
    { label: 'Witty & Clever', value: 'witty', icon: 'lightbulb' },
    { label: 'Adventurous', value: 'adventurous', icon: 'mountain' },
  ];

  useEffect(() => {
    generateInitialBios();
  }, []);

  const generateInitialBios = async () => {
    setIsGenerating(true);
    try {
      // Simulate API call to generate bios
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const mockBios: GeneratedBio[] = [
        {
          id: '1',
          text: "Software engineer by day, adventure seeker by weekend. I can debug your code and find the best hiking trails. Looking for someone who appreciates good coffee and spontaneous road trips. Let's build something amazing together! 🚀",
          style: 'professional',
          score: 89,
          personalityMatch: 92,
        },
        {
          id: '2',
          text: "Just a guy who loves good food, great music, and even better conversations. I make a mean pasta and terrible dad jokes. If you're into authentic connections and laughing until your cheeks hurt, swipe right! 😄",
          style: 'casual',
          score: 85,
          personalityMatch: 88,
        },
        {
          id: '3',
          text: "Professional overthinker with a PhD in Netflix recommendations. I can solve complex problems but still need GPS to find the nearest Starbucks. Seeking a partner in crime for life's greatest adventures (and grocery shopping). 🧠✨",
          style: 'witty',
          score: 91,
          personalityMatch: 85,
        },
        {
          id: '4',
          text: "Mountain climber, ocean swimmer, city explorer. Life's too short for boring conversations and indoor weekends. If you're ready to discover hidden gems and chase sunsets around the world, let's start with coffee! 🏔️🌊",
          style: 'adventurous',
          score: 87,
          personalityMatch: 90,
        },
      ];
      
      setGeneratedBios(mockBios);
      setSelectedBio(mockBios[0].id);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate bios. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateBio = async (style: string) => {
    if (regenerationCount >= 3) {
      Alert.alert('Limit Reached', 'You can regenerate up to 3 times. Consider upgrading for unlimited regenerations.');
      return;
    }

    setIsGenerating(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newBio: GeneratedBio = {
        id: `${Date.now()}`,
        text: `New ${style} bio generated based on your preferences and photo analysis...`,
        style: style as any,
        score: Math.floor(Math.random() * 20) + 80,
        personalityMatch: Math.floor(Math.random() * 15) + 85,
      };
      
      setGeneratedBios(prev => prev.map(bio => 
        bio.style === style ? newBio : bio
      ));
      setRegenerationCount(prev => prev + 1);
    } catch (error) {
      Alert.alert('Error', 'Failed to regenerate bio. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleContinue = () => {
    const selected = generatedBios.find(bio => bio.id === selectedBio);
    if (selected) {
      onBioSelected(selected);
    }
  };

  const getStyleColor = (style: string): string => {
    switch (style) {
      case 'professional': return '#2196F3';
      case 'casual': return '#4CAF50';
      case 'witty': return '#FF9800';
      case 'adventurous': return '#e91e63';
      default: return '#666';
    }
  };

  if (isGenerating && generatedBios.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e91e63" />
        <Text style={styles.loadingText}>Generating personalized bios...</Text>
        <Text style={styles.loadingSubtext}>
          Analyzing your profile and photos to create the perfect bio
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.headerCard}>
        <Card.Content>
          <Title style={styles.title}>Your Personalized Bios</Title>
          <Text style={styles.subtitle}>
            AI-generated bios based on your personality and photos
          </Text>
        </Card.Content>
      </Card>

      <RadioButton.Group
        onValueChange={(value) => setSelectedBio(value)}
        value={selectedBio}
      >
        {generatedBios.map((bio) => {
          const styleInfo = bioStyles.find(s => s.value === bio.style);
          return (
            <Card key={bio.id} style={styles.bioCard}>
              <Card.Content>
                <View style={styles.bioHeader}>
                  <View style={styles.bioTitleContainer}>
                    <Text style={[styles.bioStyle, { color: getStyleColor(bio.style) }]}>
                      {styleInfo?.label}
                    </Text>
                    <View style={styles.scoresContainer}>
                      <Text style={styles.score}>Match: {bio.personalityMatch}%</Text>
                      <Text style={styles.score}>Appeal: {bio.score}%</Text>
                    </View>
                  </View>
                  <View style={styles.bioActions}>
                    <IconButton
                      icon="refresh"
                      size={20}
                      onPress={() => regenerateBio(bio.style)}
                      disabled={isGenerating}
                    />
                    <RadioButton value={bio.id} />
                  </View>
                </View>

                <Text style={styles.bioText}>{bio.text}</Text>

                <View style={styles.bioFooter}>
                  <Text style={styles.bioLength}>
                    {bio.text.length} characters
                  </Text>
                  {bio.personalityMatch >= 90 && (
                    <Text style={styles.recommendedBadge}>✨ Recommended</Text>
                  )}
                </View>
              </Card.Content>
            </Card>
          );
        })}
      </RadioButton.Group>

      <View style={styles.regenerationInfo}>
        <Text style={styles.regenerationText}>
          Regenerations used: {regenerationCount}/3
        </Text>
        {regenerationCount >= 3 && (
          <Text style={styles.upgradeText}>
            Need more? Upgrade to Premium for unlimited regenerations
          </Text>
        )}
      </View>

      <Button
        mode="contained"
        onPress={handleContinue}
        disabled={!selectedBio}
        style={styles.continueButton}
        contentStyle={styles.continueButtonContent}
      >
        Continue with Selected Bio
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  headerCard: {
    margin: 16,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#e91e63',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginTop: 4,
  },
  bioCard: {
    margin: 16,
    elevation: 2,
  },
  bioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bioTitleContainer: {
    flex: 1,
  },
  bioStyle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  scoresContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  score: {
    fontSize: 12,
    color: '#666',
  },
  bioActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bioText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 12,
  },
  bioFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bioLength: {
    fontSize: 12,
    color: '#666',
  },
  recommendedBadge: {
    fontSize: 12,
    color: '#e91e63',
    fontWeight: 'bold',
  },
  regenerationInfo: {
    padding: 16,
    alignItems: 'center',
  },
  regenerationText: {
    fontSize: 14,
    color: '#666',
  },
  upgradeText: {
    fontSize: 12,
    color: '#e91e63',
    marginTop: 4,
    fontStyle: 'italic',
  },
  continueButton: {
    margin: 16,
    backgroundColor: '#e91e63',
  },
  continueButtonContent: {
    paddingVertical: 8,
  },
});

export default BioGenerator;