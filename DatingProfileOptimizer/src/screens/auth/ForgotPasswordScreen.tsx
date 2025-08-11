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
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface ForgotPasswordScreenProps {
  navigation: any;
}

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleResetPassword = async () => {
    if (!email) {
      setEmailError('Email is required');
      return;
    }
    
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    
    setEmailError('');
    setIsLoading(true);
    
    try {
      const response = await fetch('http://localhost:3004/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setEmailSent(true);
        Alert.alert(
          'Reset Link Sent!',
          'If an account with this email exists, you will receive a password reset link shortly.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Error',
          data.message || 'Unable to send reset link. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      Alert.alert(
        'Connection Error',
        'Unable to connect to server. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.goBack();
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
            <Icon name="lock-reset" size={48} color="#e91e63" />
            <Text variant="headlineMedium" style={styles.title}>
              Reset Password
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Enter your email address and we'll send you a link to reset your password
            </Text>
          </View>

          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              {!emailSent ? (
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

                  <Button
                    mode="contained"
                    onPress={handleResetPassword}
                    style={styles.resetButton}
                    disabled={isLoading || !email}
                    loading={isLoading}
                  >
                    {isLoading ? 'Sending Link...' : 'Send Reset Link'}
                  </Button>
                </View>
              ) : (
                <View style={styles.successContainer}>
                  <Icon name="check-circle" size={64} color="#4caf50" />
                  <Text variant="headlineSmall" style={styles.successTitle}>
                    Reset Link Sent!
                  </Text>
                  <Text variant="bodyMedium" style={styles.successText}>
                    Check your email inbox for a password reset link. Don't forget to check your spam folder.
                  </Text>
                </View>
              )}

              <Button
                mode="text"
                onPress={handleBackToLogin}
                style={styles.backButton}
                disabled={isLoading}
              >
                Back to Sign In
              </Button>
            </Card.Content>
          </Card>

          <Surface style={styles.footer}>
            <Text variant="bodySmall" style={styles.footerText}>
              Remember your password?{' '}
              <Text style={styles.linkText} onPress={handleBackToLogin}>
                Sign in instead
              </Text>
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
    lineHeight: 22,
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
  resetButton: {
    marginTop: 16,
    paddingVertical: 8,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successTitle: {
    color: '#4caf50',
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  successText: {
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  backButton: {
    marginTop: 24,
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
  },
  linkText: {
    color: '#e91e63',
    fontWeight: 'bold',
  },
});

export default ForgotPasswordScreen;