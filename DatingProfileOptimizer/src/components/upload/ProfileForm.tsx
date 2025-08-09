import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  Title,
  RadioButton,
  Chip,
  HelperText,
} from 'react-native-paper';

interface UserProfile {
  age: string;
  gender: string;
  location: string;
  profession: string;
  interests: string[];
  personalityType: string;
  lookingFor: string;
  bio: string;
}

interface ProfileFormProps {
  onProfileComplete: (profile: UserProfile) => void;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ onProfileComplete }) => {
  const [profile, setProfile] = useState<UserProfile>({
    age: '',
    gender: '',
    location: '',
    profession: '',
    interests: [],
    personalityType: '',
    lookingFor: '',
    bio: '',
  });

  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const interestOptions = [
    'Travel', 'Photography', 'Fitness', 'Cooking', 'Music',
    'Art', 'Reading', 'Movies', 'Sports', 'Gaming',
    'Hiking', 'Dancing', 'Wine', 'Coffee', 'Fashion',
    'Technology', 'Business', 'Animals', 'Yoga', 'Writing'
  ];

  const personalityTypes = [
    { label: 'Outgoing & Social', value: 'extrovert' },
    { label: 'Thoughtful & Quiet', value: 'introvert' },
    { label: 'Adventurous', value: 'adventurous' },
    { label: 'Creative', value: 'creative' },
    { label: 'Professional', value: 'professional' },
    { label: 'Laid-back', value: 'casual' },
  ];

  const toggleInterest = (interest: string) => {
    const newInterests = selectedInterests.includes(interest)
      ? selectedInterests.filter(i => i !== interest)
      : [...selectedInterests, interest];
    
    setSelectedInterests(newInterests);
    setProfile(prev => ({ ...prev, interests: newInterests }));
  };

  const handleSubmit = () => {
    // Basic validation
    if (!profile.age || !profile.gender || !profile.profession) {
      Alert.alert('Incomplete Profile', 'Please fill in all required fields.');
      return;
    }

    if (profile.interests.length < 3) {
      Alert.alert('Add More Interests', 'Please select at least 3 interests for better bio generation.');
      return;
    }

    onProfileComplete(profile);
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Tell Us About Yourself</Title>
          <Text style={styles.subtitle}>
            This information helps our AI create a personalized bio that attracts your ideal matches.
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.formCard}>
        <Card.Content>
          <TextInput
            label="Age *"
            value={profile.age}
            onChangeText={(age) => setProfile(prev => ({ ...prev, age }))}
            keyboardType="numeric"
            style={styles.input}
            mode="outlined"
            maxLength={2}
          />

          <View style={styles.genderContainer}>
            <Text style={styles.sectionTitle}>Gender *</Text>
            <RadioButton.Group
              onValueChange={(gender) => setProfile(prev => ({ ...prev, gender }))}
              value={profile.gender}
            >
              <View style={styles.radioRow}>
                <RadioButton.Item label="Male" value="male" />
                <RadioButton.Item label="Female" value="female" />
              </View>
            </RadioButton.Group>
          </View>

          <TextInput
            label="Location"
            value={profile.location}
            onChangeText={(location) => setProfile(prev => ({ ...prev, location }))}
            style={styles.input}
            mode="outlined"
            placeholder="e.g., New York, NY"
          />

          <TextInput
            label="Profession *"
            value={profile.profession}
            onChangeText={(profession) => setProfile(prev => ({ ...prev, profession }))}
            style={styles.input}
            mode="outlined"
            placeholder="e.g., Software Engineer, Teacher, Artist"
          />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interests & Hobbies</Text>
            <Text style={styles.sectionSubtitle}>Select at least 3 (max 8)</Text>
            <View style={styles.chipsContainer}>
              {interestOptions.map((interest) => (
                <Chip
                  key={interest}
                  selected={selectedInterests.includes(interest)}
                  onPress={() => toggleInterest(interest)}
                  style={[
                    styles.interestChip,
                    selectedInterests.includes(interest) && styles.selectedChip
                  ]}
                  textStyle={selectedInterests.includes(interest) && styles.selectedChipText}
                >
                  {interest}
                </Chip>
              ))}
            </View>
            <HelperText type="info">
              {selectedInterests.length}/8 selected
            </HelperText>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personality Type</Text>
            <RadioButton.Group
              onValueChange={(personalityType) => setProfile(prev => ({ ...prev, personalityType }))}
              value={profile.personalityType}
            >
              {personalityTypes.map((type) => (
                <RadioButton.Item
                  key={type.value}
                  label={type.label}
                  value={type.value}
                />
              ))}
            </RadioButton.Group>
          </View>

          <TextInput
            label="What are you looking for?"
            value={profile.lookingFor}
            onChangeText={(lookingFor) => setProfile(prev => ({ ...prev, lookingFor }))}
            style={styles.input}
            mode="outlined"
            placeholder="e.g., Long-term relationship, Dating, Casual"
          />

          <TextInput
            label="Current Bio (optional)"
            value={profile.bio}
            onChangeText={(bio) => setProfile(prev => ({ ...prev, bio }))}
            style={styles.input}
            mode="outlined"
            multiline
            numberOfLines={4}
            placeholder="Share your current bio or leave blank for AI generation"
          />
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={handleSubmit}
        style={styles.submitButton}
        contentStyle={styles.submitButtonContent}
        disabled={!profile.age || !profile.gender || !profile.profession || profile.interests.length < 3}
      >
        Continue to Photo Analysis
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 16,
    elevation: 4,
  },
  formCard: {
    margin: 16,
    elevation: 2,
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
    marginTop: 8,
  },
  input: {
    marginBottom: 16,
  },
  genderContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  radioRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  section: {
    marginBottom: 24,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  selectedChip: {
    backgroundColor: '#e91e63',
  },
  selectedChipText: {
    color: 'white',
  },
  submitButton: {
    margin: 16,
    backgroundColor: '#e91e63',
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
});

export default ProfileForm;