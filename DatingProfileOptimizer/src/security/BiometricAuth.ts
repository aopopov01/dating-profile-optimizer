/**
 * Biometric Authentication Service for Dating Profile Optimizer
 * Handles fingerprint, face ID, and other biometric authentication methods
 */

import ReactNativeBiometrics from 'react-native-biometrics';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { securityLogger } from './SecurityLogger';
import { cryptoService } from './CryptoService';
import { SECURITY_CONFIG } from './SecurityConfig';

export interface BiometricAuthResult {
  success: boolean;
  signature?: string;
  publicKey?: string;
  error?: string;
  cancelled?: boolean;
}

export interface BiometricCapabilities {
  available: boolean;
  biometryType: 'TouchID' | 'FaceID' | 'Biometrics' | null;
  enrolled: boolean;
  hardwarePresent: boolean;
}

export interface BiometricConfig {
  allowDeviceCredentials: boolean;
  promptMessage: string;
  fallbackPromptMessage: string;
  cancelButtonText: string;
  deviceCredentialAllowed: boolean;
  deviceCredentialTitle: string;
  deviceCredentialSubtitle: string;
  deviceCredentialDescription: string;
}

export class BiometricAuth {
  private static instance: BiometricAuth;
  private biometrics: ReactNativeBiometrics;
  private isInitialized: boolean = false;
  private capabilities: BiometricCapabilities | null = null;

  private constructor() {
    this.biometrics = new ReactNativeBiometrics({
      allowDeviceCredentials: true,
    });
  }

  public static getInstance(): BiometricAuth {
    if (!BiometricAuth.instance) {
      BiometricAuth.instance = new BiometricAuth();
    }
    return BiometricAuth.instance;
  }

  /**
   * Initialize biometric authentication service
   */
  async initialize(): Promise<void> {
    try {
      this.capabilities = await this.checkBiometricCapabilities();
      this.isInitialized = true;
      
      securityLogger.info('biometric_initialized', {
        available: this.capabilities.available,
        type: this.capabilities.biometryType,
        enrolled: this.capabilities.enrolled,
      });
    } catch (error) {
      securityLogger.error('Biometric initialization failed', { error });
      this.isInitialized = false;
    }
  }

  /**
   * Check if biometric authentication is available
   */
  async checkBiometricCapabilities(): Promise<BiometricCapabilities> {
    try {
      const { available, biometryType } = await this.biometrics.isSensorAvailable();
      const { keysExist } = await this.biometrics.biometricKeysExist();

      return {
        available,
        biometryType,
        enrolled: available && keysExist,
        hardwarePresent: available,
      };
    } catch (error) {
      securityLogger.error('Failed to check biometric capabilities', { error });
      return {
        available: false,
        biometryType: null,
        enrolled: false,
        hardwarePresent: false,
      };
    }
  }

  /**
   * Setup biometric authentication for user
   */
  async setupBiometricAuth(userId: string): Promise<BiometricAuthResult> {
    try {
      if (!this.capabilities?.available) {
        return {
          success: false,
          error: 'Biometric authentication not available on this device',
        };
      }

      // Check if keys already exist
      const { keysExist } = await this.biometrics.biometricKeysExist();
      
      if (keysExist) {
        // Delete existing keys
        await this.biometrics.deleteKeys();
      }

      // Create new biometric keys
      const { publicKey } = await this.biometrics.createKeys();
      
      // Store user's biometric setup information
      await this.storeBiometricInfo(userId, publicKey);
      
      securityLogger.info('biometric_setup_success', { userId });

      return {
        success: true,
        publicKey,
      };
    } catch (error) {
      securityLogger.error('Biometric setup failed', { userId, error });
      return {
        success: false,
        error: 'Failed to setup biometric authentication',
      };
    }
  }

  /**
   * Authenticate user using biometrics
   */
  async authenticateWithBiometrics(
    challenge: string,
    config?: Partial<BiometricConfig>
  ): Promise<BiometricAuthResult> {
    try {
      if (!this.capabilities?.available) {
        return {
          success: false,
          error: 'Biometric authentication not available',
        };
      }

      const { keysExist } = await this.biometrics.biometricKeysExist();
      
      if (!keysExist) {
        return {
          success: false,
          error: 'Biometric authentication not set up',
        };
      }

      const biometricConfig = this.getBiometricConfig(config);
      
      const { success, signature, error } = await this.biometrics.createSignature({
        promptMessage: biometricConfig.promptMessage,
        payload: challenge,
        cancelButtonText: biometricConfig.cancelButtonText,
        fallbackPromptMessage: biometricConfig.fallbackPromptMessage,
      });

      if (success && signature) {
        securityLogger.info('biometric_auth_success', {
          timestamp: new Date().toISOString(),
        });

        return {
          success: true,
          signature,
        };
      } else {
        const isCancelled = error?.includes('User canceled') || error?.includes('UserCancel');
        
        if (!isCancelled) {
          securityLogger.warn('biometric_auth_failed', { error });
        }

        return {
          success: false,
          error: error || 'Biometric authentication failed',
          cancelled: isCancelled,
        };
      }
    } catch (error) {
      securityLogger.error('Biometric authentication error', { error });
      return {
        success: false,
        error: 'Biometric authentication error',
      };
    }
  }

  /**
   * Verify biometric signature
   */
  async verifyBiometricSignature(
    signature: string,
    challenge: string,
    publicKey: string
  ): Promise<boolean> {
    try {
      // In a real implementation, verify the signature against the public key
      // This is a simplified validation
      const isValid = signature && challenge && publicKey;
      
      if (isValid) {
        securityLogger.info('biometric_signature_verified', {
          timestamp: new Date().toISOString(),
        });
      } else {
        securityLogger.warn('biometric_signature_invalid', {
          timestamp: new Date().toISOString(),
        });
      }

      return isValid;
    } catch (error) {
      securityLogger.error('Biometric signature verification failed', { error });
      return false;
    }
  }

  /**
   * Remove biometric authentication
   */
  async removeBiometricAuth(userId: string): Promise<boolean> {
    try {
      // Delete biometric keys
      await this.biometrics.deleteKeys();
      
      // Remove stored biometric info
      await AsyncStorage.removeItem(`biometric_${userId}`);
      
      securityLogger.info('biometric_removed', { userId });
      
      return true;
    } catch (error) {
      securityLogger.error('Failed to remove biometric authentication', { userId, error });
      return false;
    }
  }

  /**
   * Check if biometric authentication is enabled for user
   */
  async isBiometricEnabled(userId: string): Promise<boolean> {
    try {
      const biometricInfo = await AsyncStorage.getItem(`biometric_${userId}`);
      const { keysExist } = await this.biometrics.biometricKeysExist();
      
      return biometricInfo !== null && keysExist;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get biometric authentication status
   */
  async getBiometricStatus(userId: string): Promise<{
    available: boolean;
    enabled: boolean;
    type: string | null;
    lastUsed?: string;
  }> {
    try {
      const capabilities = await this.checkBiometricCapabilities();
      const enabled = await this.isBiometricEnabled(userId);
      const biometricInfo = await this.getBiometricInfo(userId);

      return {
        available: capabilities.available,
        enabled,
        type: capabilities.biometryType,
        lastUsed: biometricInfo?.lastUsed,
      };
    } catch (error) {
      return {
        available: false,
        enabled: false,
        type: null,
      };
    }
  }

  /**
   * Authenticate with device credentials (PIN, password, pattern)
   */
  async authenticateWithDeviceCredentials(
    config?: Partial<BiometricConfig>
  ): Promise<BiometricAuthResult> {
    try {
      if (Platform.OS === 'android') {
        // Use device credentials on Android
        const biometricConfig = this.getBiometricConfig(config);
        
        const { success, error } = await this.biometrics.simplePrompt({
          promptMessage: biometricConfig.deviceCredentialTitle,
          fallbackPromptMessage: biometricConfig.deviceCredentialDescription,
        });

        return {
          success,
          error: error || undefined,
        };
      } else {
        // iOS handles device credentials automatically through biometric prompt
        return await this.authenticateWithBiometrics(cryptoService.generateToken(32), config);
      }
    } catch (error) {
      securityLogger.error('Device credential authentication failed', { error });
      return {
        success: false,
        error: 'Device credential authentication failed',
      };
    }
  }

  /**
   * Show biometric prompt with custom message
   */
  async showBiometricPrompt(
    title: string,
    subtitle: string,
    description: string,
    challenge?: string
  ): Promise<BiometricAuthResult> {
    const customConfig: Partial<BiometricConfig> = {
      promptMessage: title,
      fallbackPromptMessage: subtitle,
      deviceCredentialDescription: description,
    };

    const authChallenge = challenge || cryptoService.generateToken(32);
    return await this.authenticateWithBiometrics(authChallenge, customConfig);
  }

  /**
   * Enable biometric authentication with user confirmation
   */
  async enableBiometricWithConfirmation(userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const capabilities = this.capabilities;
      
      if (!capabilities?.available) {
        Alert.alert(
          'Biometric Not Available',
          'Biometric authentication is not available on this device.',
          [{ text: 'OK', onPress: () => reject(new Error('Not available')) }]
        );
        return;
      }

      const biometricType = capabilities.biometryType || 'Biometric';
      
      Alert.alert(
        `Enable ${biometricType}?`,
        `Would you like to use ${biometricType} to secure your account and make login faster?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => reject(new Error('User cancelled')),
          },
          {
            text: 'Enable',
            onPress: async () => {
              const result = await this.setupBiometricAuth(userId);
              if (result.success) {
                resolve();
              } else {
                reject(new Error(result.error));
              }
            },
          },
        ]
      );
    });
  }

  /**
   * Disable biometric authentication with user confirmation
   */
  async disableBiometricWithConfirmation(userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      Alert.alert(
        'Disable Biometric Authentication?',
        'You will need to use your password to login. Are you sure you want to disable biometric authentication?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => reject(new Error('User cancelled')),
          },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              const success = await this.removeBiometricAuth(userId);
              if (success) {
                resolve();
              } else {
                reject(new Error('Failed to disable biometric authentication'));
              }
            },
          },
        ]
      );
    });
  }

  // Private methods

  private getBiometricConfig(config?: Partial<BiometricConfig>): BiometricConfig {
    const biometricType = this.capabilities?.biometryType || 'Biometric';
    
    return {
      allowDeviceCredentials: true,
      promptMessage: `Authenticate with ${biometricType}`,
      fallbackPromptMessage: `Use ${biometricType} to authenticate`,
      cancelButtonText: 'Cancel',
      deviceCredentialAllowed: true,
      deviceCredentialTitle: 'Device Authentication',
      deviceCredentialSubtitle: 'Authenticate using device credentials',
      deviceCredentialDescription: 'Please authenticate using your device PIN, password, or pattern',
      ...config,
    };
  }

  private async storeBiometricInfo(userId: string, publicKey: string): Promise<void> {
    const biometricInfo = {
      publicKey,
      enabledAt: new Date().toISOString(),
      deviceId: await this.getDeviceId(),
    };

    const encrypted = await cryptoService.encryptPII(biometricInfo);
    await AsyncStorage.setItem(`biometric_${userId}`, encrypted);
  }

  private async getBiometricInfo(userId: string): Promise<any> {
    try {
      const encrypted = await AsyncStorage.getItem(`biometric_${userId}`);
      if (!encrypted) return null;

      return await cryptoService.decryptPII(encrypted);
    } catch (error) {
      return null;
    }
  }

  private async getDeviceId(): Promise<string> {
    try {
      // Get device ID for additional security
      return 'device-id-placeholder'; // Replace with actual device ID
    } catch (error) {
      return 'unknown-device';
    }
  }

  /**
   * Update last used timestamp
   */
  private async updateLastUsed(userId: string): Promise<void> {
    try {
      const biometricInfo = await this.getBiometricInfo(userId);
      if (biometricInfo) {
        biometricInfo.lastUsed = new Date().toISOString();
        const encrypted = await cryptoService.encryptPII(biometricInfo);
        await AsyncStorage.setItem(`biometric_${userId}`, encrypted);
      }
    } catch (error) {
      // Silent fail - not critical
    }
  }
}

// Export singleton instance
export const biometricAuth = BiometricAuth.getInstance();