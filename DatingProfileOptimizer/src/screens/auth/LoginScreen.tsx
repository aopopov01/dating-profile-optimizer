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
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import analytics, { ANALYTICS_EVENTS } from '../../services/analytics';

interface LoginScreenProps {
  navigation: any;
}

interface LoginResponse {
  message: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    email_verified: boolean;
  };
  tokens: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    let isValid = true;
    
    if (!email) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    } else {
      setEmailError('');
    }

    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    } else {
      setPasswordError('');
    }

    return isValid;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('http://localhost:3004/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const loginData: LoginResponse = data;
        
        // Store tokens securely
        await AsyncStorage.multiSet([
          ['@access_token', loginData.tokens.access_token],
          ['@refresh_token', loginData.tokens.refresh_token],
          ['@user_data', JSON.stringify(loginData.user)],
        ]);

        // Navigate to main app
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      } else {
        Alert.alert(
          'Login Failed',
          data.message || 'Invalid email or password. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert(
        'Connection Error',
        'Unable to connect to server. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleRegister = () => {
    navigation.navigate('Register');
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
        >
          <View style={styles.header}>
            <Icon name="favorite" size={48} color="#e91e63" />
            <Text variant="headlineMedium" style={styles.title}>
              Dating Profile Optimizer
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              AI-powered profile optimization for better matches
            </Text>
          </View>

          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Text variant="headlineSmall" style={styles.formTitle}>
                Welcome Back
              </Text>
              
              <View style={styles.form}>
                <TextInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  error={!!emailError}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  left={<TextInput.Icon icon="email" />}
                  style={styles.input}
                  mode="outlined"
                  disabled={isLoading}
                />
                {emailError ? (
                  <Text variant="bodySmall" style={styles.errorText}>
                    {emailError}
                  </Text>
                ) : null}

                <TextInput
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  error={!!passwordError}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  textContentType="password"
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
                {passwordError ? (
                  <Text variant="bodySmall" style={styles.errorText}>
                    {passwordError}
                  </Text>
                ) : null}

                <Button
                  mode="text"
                  onPress={handleForgotPassword}
                  style={styles.forgotButton}
                  disabled={isLoading}
                >
                  Forgot Password?
                </Button>

                <Button
                  mode="contained"
                  onPress={handleLogin}
                  style={styles.loginButton}
                  disabled={isLoading || !email || !password}
                  loading={isLoading}
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Button>

                <Divider style={styles.divider} />

                <View style={styles.registerContainer}>
                  <Text variant="bodyMedium" style={styles.registerText}>
                    Don't have an account?{' '}
                  </Text>
                  <Button
                    mode="text"
                    onPress={handleRegister}
                    style={styles.registerButton}
                    disabled={isLoading}
                  >
                    Sign Up
                  </Button>
                </View>
              </View>
            </Card.Content>
          </Card>

          <Surface style={styles.footer}>
            <Text variant="bodySmall" style={styles.footerText}>
              By signing in, you agree to our Terms of Service and Privacy Policy
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
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    color: '#e91e63',
    fontWeight: 'bold',
    marginTop: 16,
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
    padding: 24,
  },
  formTitle: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#212121',
    fontWeight: 'bold',
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: 'white',
  },
  errorText: {
    color: '#f44336',
    marginTop: -12,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -8,
  },
  loginButton: {
    marginTop: 16,
    paddingVertical: 8,
  },
  divider: {
    marginVertical: 24,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    color: '#666',
  },
  registerButton: {
    marginLeft: -8,
  },
  footer: {
    marginTop: 32,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 8,
  },
  footerText: {
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default LoginScreen;