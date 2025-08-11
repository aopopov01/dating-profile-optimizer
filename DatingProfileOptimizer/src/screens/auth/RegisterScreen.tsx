import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Card,
  Surface,
  Checkbox,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface RegisterScreenProps {
  navigation: any;
}

interface RegisterData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  date_of_birth: string;
  interested_in: string;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const [formData, setFormData] = useState<RegisterData>({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    date_of_birth: '',
    interested_in: '',
  });
  
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState<Partial<RegisterData & { confirmPassword: string; terms: string }>>({});

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 8 && 
           /[A-Z]/.test(password) && 
           /[a-z]/.test(password) && 
           /\d/.test(password);
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

  const validateForm = () => {
    const newErrors: Partial<RegisterData & { confirmPassword: string; terms: string }> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!validatePassword(formData.password)) {
      newErrors.password = 'Password must be at least 8 characters with uppercase, lowercase, and number';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.date_of_birth) {
      newErrors.date_of_birth = 'Date of birth is required';
    } else {
      const age = calculateAge(formData.date_of_birth);
      if (age < 18) {
        newErrors.date_of_birth = 'You must be at least 18 years old';
      } else if (age > 100) {
        newErrors.date_of_birth = 'Please enter a valid date of birth';
      }
    }

    if (!formData.interested_in) {
      newErrors.interested_in = 'Please select who you are interested in';
    }

    if (!agreedToTerms) {
      newErrors.terms = 'You must agree to the Terms of Service and Privacy Policy';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('http://localhost:3004/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
          firstName: formData.first_name.trim(),
          lastName: formData.last_name.trim(),
          dateOfBirth: formData.date_of_birth,
          gender: formData.interested_in || "other",
          agreeToTerms: "true",
          agreeToPrivacy: "true"
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Registration Successful!',
          'Welcome to Dating Profile Optimizer! Please check your email to verify your account.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
      } else {
        Alert.alert(
          'Registration Failed',
          data.message || 'Unable to create account. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert(
        'Connection Error',
        'Unable to connect to server. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const updateFormData = (field: keyof RegisterData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Icon name="favorite" size={40} color="#e91e63" />
            <Text variant="headlineSmall" style={styles.title}>
              Join Dating Profile Optimizer
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Create your account to start optimizing your dating profile
            </Text>
          </View>

          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.form}>
                <View style={styles.nameContainer}>
                  <TextInput
                    label="First Name"
                    value={formData.first_name}
                    onChangeText={(value) => updateFormData('first_name', value)}
                    error={!!errors.first_name}
                    autoCapitalize="words"
                    autoComplete="given-name"
                    textContentType="givenName"
                    style={[styles.input, styles.halfInput]}
                    mode="outlined"
                    disabled={isLoading}
                  />
                  <TextInput
                    label="Last Name"
                    value={formData.last_name}
                    onChangeText={(value) => updateFormData('last_name', value)}
                    error={!!errors.last_name}
                    autoCapitalize="words"
                    autoComplete="family-name"
                    textContentType="familyName"
                    style={[styles.input, styles.halfInput]}
                    mode="outlined"
                    disabled={isLoading}
                  />
                </View>
                {(errors.first_name || errors.last_name) && (
                  <Text variant="bodySmall" style={styles.errorText}>
                    {errors.first_name || errors.last_name}
                  </Text>
                )}

                <TextInput
                  label="Email"
                  value={formData.email}
                  onChangeText={(value) => updateFormData('email', value)}
                  error={!!errors.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  left={<TextInput.Icon icon="email" />}
                  style={styles.input}
                  mode="outlined"
                  disabled={isLoading}
                />
                {errors.email && (
                  <Text variant="bodySmall" style={styles.errorText}>
                    {errors.email}
                  </Text>
                )}
              </View>
            </Card.Content>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};                <TextInput
                  label="Password"
                  value={formData.password}
                  onChangeText={(value) => updateFormData('password', value)}
                  error={!!errors.password}
                  secureTextEntry={!showPassword}
                  autoComplete="password-new"
                  textContentType="newPassword"
                  left={<TextInput.Icon icon="lock" />}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'visibility-off' : 'visibility'}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                  style={styles.input}
                  mode="outlined"
                  disabled={isLoading}
                />
                {errors.password && (
                  <Text variant="bodySmall" style={styles.errorText}>
                    {errors.password}
                  </Text>
                )}

                <TextInput
                  label="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  error={!!errors.confirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoComplete="password-new"
                  textContentType="newPassword"
                  left={<TextInput.Icon icon="lock-outline" />}
                  right={
                    <TextInput.Icon
                      icon={showConfirmPassword ? 'visibility-off' : 'visibility'}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    />
                  }
                  style={styles.input}
                  mode="outlined"
                  disabled={isLoading}
                />
                {errors.confirmPassword && (
                  <Text variant="bodySmall" style={styles.errorText}>
                    {errors.confirmPassword}
                  </Text>
                )}

                <TextInput
                  label="Date of Birth (YYYY-MM-DD)"
                  value={formData.date_of_birth}
                  onChangeText={(value) => updateFormData('date_of_birth', value)}
                  error={!!errors.date_of_birth}
                  placeholder="1990-01-15"
                  left={<TextInput.Icon icon="calendar" />}
                  style={styles.input}
                  mode="outlined"
                  disabled={isLoading}
                />
                {errors.date_of_birth && (
                  <Text variant="bodySmall" style={styles.errorText}>
                    {errors.date_of_birth}
                  </Text>
                )}

                <TextInput
                  label="Interested In"
                  value={formData.interested_in}
                  onChangeText={(value) => updateFormData('interested_in', value)}
                  error={!!errors.interested_in}
                  placeholder="men, women, everyone"
                  left={<TextInput.Icon icon="people" />}
                  style={styles.input}
                  mode="outlined"
                  disabled={isLoading}
                />
                {errors.interested_in && (
                  <Text variant="bodySmall" style={styles.errorText}>
                    {errors.interested_in}
                  </Text>
                )}

                <View style={styles.checkboxContainer}>
                  <Checkbox
                    status={agreedToTerms ? 'checked' : 'unchecked'}
                    onPress={() => setAgreedToTerms(!agreedToTerms)}
                    disabled={isLoading}
                  />
                  <Text variant="bodyMedium" style={styles.checkboxText}>
                    I agree to the{' '}
                    <Text style={styles.linkText}>Terms of Service</Text>
                    {' '}and{' '}
                    <Text style={styles.linkText}>Privacy Policy</Text>
                  </Text>
                </View>
                {errors.terms && (
                  <Text variant="bodySmall" style={styles.errorText}>
                    {errors.terms}
                  </Text>
                )}

                <Button
                  mode="contained"
                  onPress={handleRegister}
                  style={styles.registerButton}
                  disabled={isLoading}
                  loading={isLoading}
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>

                <View style={styles.loginContainer}>
                  <Text variant="bodyMedium" style={styles.loginText}>
                    Already have an account?{' '}
                  </Text>
                  <Button
                    mode="text"
                    onPress={handleLogin}
                    style={styles.loginButton}
                    disabled={isLoading}
                  >
                    Sign In
                  </Button>
                </View>
              </View>
            </Card.Content>
          </Card>

          <Surface style={styles.footer}>
            <Text variant="bodySmall" style={styles.footerText}>
              By creating an account, you're joining thousands of users who have improved their dating success with AI-powered optimization.
            </Text>
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 20,
  },
  title: {
    color: '#e91e63',
    fontWeight: 'bold',
    marginTop: 12,
    textAlign: 'center',
  },
  subtitle: {
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  card: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cardContent: {
    padding: 20,
  },
  form: {
    gap: 12,
  },
  nameContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    backgroundColor: 'white',
  },
  halfInput: {
    flex: 1,
  },
  errorText: {
    color: '#f44336',
    marginTop: -8,
    marginLeft: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  checkboxText: {
    flex: 1,
    marginLeft: 8,
    color: '#666',
    lineHeight: 20,
  },
  linkText: {
    color: '#e91e63',
    fontWeight: 'bold',
  },
  registerButton: {
    marginTop: 24,
    paddingVertical: 8,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  loginText: {
    color: '#666',
  },
  loginButton: {
    marginLeft: -8,
  },
  footer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 8,
  },
  footerText: {
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default RegisterScreen;