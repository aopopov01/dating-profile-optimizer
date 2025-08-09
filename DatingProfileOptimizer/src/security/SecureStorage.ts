/**
 * Secure Storage Service for Dating Profile Optimizer
 * Handles encrypted storage, keychain integration, and sensitive data protection
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Keychain from 'react-native-keychain';
import { Platform } from 'react-native';
import { cryptoService } from './CryptoService';
import { securityLogger } from './SecurityLogger';
import { SECURITY_CONFIG, SENSITIVE_DATA_FIELDS, PII_DATA_FIELDS } from './SecurityConfig';

export interface SecureStorageOptions {
  encryptData?: boolean;
  useKeychain?: boolean;
  service?: string;
  accessGroup?: string;
  accessibilityLevel?: 'whenUnlocked' | 'whenUnlockedThisDeviceOnly' | 'afterFirstUnlock' | 'afterFirstUnlockThisDeviceOnly';
  requireBiometric?: boolean;
  expirationTime?: number; // milliseconds
}

export interface StoredData {
  data: any;
  encrypted: boolean;
  timestamp: number;
  expiresAt?: number;
  checksum: string;
}

export interface KeychainCredentials {
  username: string;
  password: string;
  service?: string;
}

export class SecureStorage {
  private static instance: SecureStorage;
  private encryptionKey: string | null = null;
  private defaultOptions: SecureStorageOptions;

  private constructor() {
    this.defaultOptions = {
      encryptData: SECURITY_CONFIG.storage.encryptSensitiveData,
      useKeychain: true,
      service: 'DatingProfileOptimizer',
      accessibilityLevel: 'whenUnlockedThisDeviceOnly',
      requireBiometric: false,
    };
  }

  public static getInstance(): SecureStorage {
    if (!SecureStorage.instance) {
      SecureStorage.instance = new SecureStorage();
    }
    return SecureStorage.instance;
  }

  /**
   * Initialize secure storage with encryption key
   */
  async initialize(): Promise<void> {
    try {
      // Get or generate encryption key
      this.encryptionKey = await this.getOrCreateEncryptionKey();
      
      // Perform integrity checks
      await this.performIntegrityCheck();
      
      securityLogger.info('secure_storage_initialized');
    } catch (error) {
      securityLogger.error('Secure storage initialization failed', { error });
      throw new Error('Failed to initialize secure storage');
    }
  }

  /**
   * Store data securely
   */
  async setItem(
    key: string,
    value: any,
    options?: SecureStorageOptions
  ): Promise<void> {
    try {
      const opts = { ...this.defaultOptions, ...options };
      const isSensitiveData = this.isSensitiveData(key, value);
      
      // Prepare data for storage
      const storedData: StoredData = {
        data: value,
        encrypted: opts.encryptData || isSensitiveData,
        timestamp: Date.now(),
        checksum: '',
      };

      // Set expiration if specified
      if (opts.expirationTime) {
        storedData.expiresAt = Date.now() + opts.expirationTime;
      }

      // Encrypt data if required
      if (storedData.encrypted) {
        storedData.data = await cryptoService.encrypt(JSON.stringify(value));
      }

      // Generate checksum for integrity
      storedData.checksum = this.generateChecksum(storedData);

      // Store in keychain for highly sensitive data
      if (opts.useKeychain && isSensitiveData) {
        await this.storeInKeychain(key, storedData, opts);
      } else {
        // Store in AsyncStorage
        await AsyncStorage.setItem(key, JSON.stringify(storedData));
      }

      // Log data access for audit trail
      securityLogger.logDataAccess('store', this.getDataType(key), 'system', {
        key,
        encrypted: storedData.encrypted,
        useKeychain: opts.useKeychain && isSensitiveData,
      });
    } catch (error) {
      securityLogger.error('Secure storage set failed', { key, error });
      throw new Error('Failed to store data securely');
    }
  }

  /**
   * Retrieve data securely
   */
  async getItem(
    key: string,
    options?: SecureStorageOptions
  ): Promise<any> {
    try {
      const opts = { ...this.defaultOptions, ...options };
      const isSensitiveData = this.isSensitiveData(key);
      
      let storedDataStr: string | null = null;

      // Retrieve from keychain for sensitive data
      if (opts.useKeychain && isSensitiveData) {
        storedDataStr = await this.getFromKeychain(key, opts);
      } else {
        // Retrieve from AsyncStorage
        storedDataStr = await AsyncStorage.getItem(key);
      }

      if (!storedDataStr) {
        return null;
      }

      const storedData: StoredData = JSON.parse(storedDataStr);

      // Check expiration
      if (storedData.expiresAt && Date.now() > storedData.expiresAt) {
        await this.removeItem(key, options);
        return null;
      }

      // Verify integrity
      const expectedChecksum = this.generateChecksum(storedData);
      if (storedData.checksum !== expectedChecksum) {
        securityLogger.warn('data_integrity_violation', { key });
        await this.removeItem(key, options);
        throw new Error('Data integrity check failed');
      }

      // Decrypt data if encrypted
      let data = storedData.data;
      if (storedData.encrypted) {
        const decrypted = await cryptoService.decrypt(storedData.data);
        data = JSON.parse(decrypted);
      }

      // Log data access
      securityLogger.logDataAccess('retrieve', this.getDataType(key), 'system', {
        key,
        encrypted: storedData.encrypted,
        useKeychain: opts.useKeychain && isSensitiveData,
      });

      return data;
    } catch (error) {
      securityLogger.error('Secure storage get failed', { key, error });
      throw new Error('Failed to retrieve data securely');
    }
  }

  /**
   * Remove data securely
   */
  async removeItem(
    key: string,
    options?: SecureStorageOptions
  ): Promise<void> {
    try {
      const opts = { ...this.defaultOptions, ...options };
      const isSensitiveData = this.isSensitiveData(key);

      // Remove from keychain
      if (opts.useKeychain && isSensitiveData) {
        await this.removeFromKeychain(key, opts);
      }

      // Remove from AsyncStorage
      await AsyncStorage.removeItem(key);

      // Log data deletion
      securityLogger.logDataAccess('delete', this.getDataType(key), 'system', { key });
    } catch (error) {
      securityLogger.error('Secure storage remove failed', { key, error });
      throw new Error('Failed to remove data securely');
    }
  }

  /**
   * Check if key exists
   */
  async hasItem(key: string, options?: SecureStorageOptions): Promise<boolean> {
    try {
      const value = await this.getItem(key, options);
      return value !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all keys (non-sensitive only for security)
   */
  async getAllKeys(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      // Filter out sensitive keys for security
      return keys.filter(key => !this.isSensitiveData(key));
    } catch (error) {
      securityLogger.error('Failed to get storage keys', { error });
      return [];
    }
  }

  /**
   * Clear all data (with confirmation)
   */
  async clearAll(): Promise<void> {
    try {
      // Clear AsyncStorage
      await AsyncStorage.clear();
      
      // Clear keychain items
      await this.clearKeychain();
      
      securityLogger.warn('secure_storage_cleared', {
        timestamp: Date.now(),
      });
    } catch (error) {
      securityLogger.error('Failed to clear secure storage', { error });
      throw new Error('Failed to clear secure storage');
    }
  }

  /**
   * Store authentication credentials securely
   */
  async storeCredentials(
    username: string,
    password: string,
    service?: string
  ): Promise<void> {
    try {
      const options: Keychain.Options = {
        service: service || this.defaultOptions.service,
        accessGroup: this.defaultOptions.accessGroup,
        accessControl: Platform.select({
          ios: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
          android: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
        }),
        authenticatePrompt: 'Authenticate to save credentials',
      };

      if (Platform.OS === 'ios') {
        options.accessibility = Keychain.ACCESSIBILITY.WHEN_UNLOCKED_THIS_DEVICE_ONLY;
      }

      await Keychain.setCredentials(username, password, options);
      
      securityLogger.info('credentials_stored', { username, service });
    } catch (error) {
      securityLogger.error('Failed to store credentials', { username, service, error });
      throw new Error('Failed to store credentials');
    }
  }

  /**
   * Retrieve authentication credentials securely
   */
  async getCredentials(service?: string): Promise<KeychainCredentials | null> {
    try {
      const options: Keychain.Options = {
        service: service || this.defaultOptions.service,
        authenticatePrompt: 'Authenticate to access credentials',
      };

      const credentials = await Keychain.getCredentials(options);
      
      if (credentials && credentials.username && credentials.password) {
        securityLogger.info('credentials_retrieved', {
          username: credentials.username,
          service,
        });

        return {
          username: credentials.username,
          password: credentials.password,
          service,
        };
      }

      return null;
    } catch (error) {
      securityLogger.error('Failed to retrieve credentials', { service, error });
      return null;
    }
  }

  /**
   * Remove stored credentials
   */
  async removeCredentials(service?: string): Promise<void> {
    try {
      const options: Keychain.Options = {
        service: service || this.defaultOptions.service,
      };

      await Keychain.resetCredentials(options);
      
      securityLogger.info('credentials_removed', { service });
    } catch (error) {
      securityLogger.error('Failed to remove credentials', { service, error });
      throw new Error('Failed to remove credentials');
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalKeys: number;
    encryptedKeys: number;
    keychainKeys: number;
    totalSize: number;
    oldestItem: number;
    newestItem: number;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const values = await AsyncStorage.multiGet(keys);
      
      let encryptedCount = 0;
      let keychainCount = 0;
      let totalSize = 0;
      let oldestTimestamp = Date.now();
      let newestTimestamp = 0;

      for (const [key, value] of values) {
        if (value) {
          totalSize += value.length;
          
          try {
            const storedData: StoredData = JSON.parse(value);
            if (storedData.encrypted) encryptedCount++;
            if (this.isSensitiveData(key)) keychainCount++;
            
            if (storedData.timestamp < oldestTimestamp) {
              oldestTimestamp = storedData.timestamp;
            }
            if (storedData.timestamp > newestTimestamp) {
              newestTimestamp = storedData.timestamp;
            }
          } catch (error) {
            // Skip invalid data
          }
        }
      }

      return {
        totalKeys: keys.length,
        encryptedKeys: encryptedCount,
        keychainKeys: keychainCount,
        totalSize,
        oldestItem: oldestTimestamp,
        newestItem: newestTimestamp,
      };
    } catch (error) {
      securityLogger.error('Failed to get storage stats', { error });
      return {
        totalKeys: 0,
        encryptedKeys: 0,
        keychainKeys: 0,
        totalSize: 0,
        oldestItem: 0,
        newestItem: 0,
      };
    }
  }

  /**
   * Clean up expired data
   */
  async cleanupExpiredData(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const expiredKeys: string[] = [];
      
      for (const key of keys) {
        try {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            const storedData: StoredData = JSON.parse(value);
            if (storedData.expiresAt && Date.now() > storedData.expiresAt) {
              expiredKeys.push(key);
            }
          }
        } catch (error) {
          // Invalid data, mark for removal
          expiredKeys.push(key);
        }
      }

      // Remove expired keys
      await AsyncStorage.multiRemove(expiredKeys);
      
      if (expiredKeys.length > 0) {
        securityLogger.info('expired_data_cleaned', {
          count: expiredKeys.length,
          keys: expiredKeys,
        });
      }

      return expiredKeys.length;
    } catch (error) {
      securityLogger.error('Failed to cleanup expired data', { error });
      return 0;
    }
  }

  // Private methods

  private async getOrCreateEncryptionKey(): Promise<string> {
    try {
      // Try to get existing key from keychain
      const credentials = await this.getCredentials('encryption_key');
      if (credentials?.password) {
        return credentials.password;
      }

      // Generate new key
      const newKey = await cryptoService.generateSecureKey();
      await this.storeCredentials('encryption', newKey, 'encryption_key');
      
      return newKey;
    } catch (error) {
      throw new Error('Failed to get or create encryption key');
    }
  }

  private isSensitiveData(key: string, value?: any): boolean {
    // Check if key indicates sensitive data
    const sensitiveKeyPatterns = [
      'password', 'token', 'secret', 'key', 'credential',
      'biometric', 'mfa', 'auth', 'payment', 'card',
    ];

    const lowerKey = key.toLowerCase();
    if (sensitiveKeyPatterns.some(pattern => lowerKey.includes(pattern))) {
      return true;
    }

    // Check if value contains sensitive fields
    if (value && typeof value === 'object') {
      const fields = Object.keys(value);
      return fields.some(field => 
        SENSITIVE_DATA_FIELDS.includes(field) || PII_DATA_FIELDS.includes(field)
      );
    }

    return false;
  }

  private getDataType(key: string): string {
    if (key.includes('auth')) return 'authentication';
    if (key.includes('payment')) return 'payment';
    if (key.includes('profile')) return 'profile';
    if (key.includes('photo')) return 'photo';
    if (key.includes('bio')) return 'bio';
    return 'general';
  }

  private generateChecksum(data: StoredData): string {
    const content = JSON.stringify({
      data: data.data,
      timestamp: data.timestamp,
      encrypted: data.encrypted,
    });
    
    return cryptoService.hash(content);
  }

  private async storeInKeychain(
    key: string,
    data: StoredData,
    options: SecureStorageOptions
  ): Promise<void> {
    const service = `${options.service}_${key}`;
    const dataStr = JSON.stringify(data);
    
    await this.storeCredentials('data', dataStr, service);
  }

  private async getFromKeychain(
    key: string,
    options: SecureStorageOptions
  ): Promise<string | null> {
    const service = `${options.service}_${key}`;
    const credentials = await this.getCredentials(service);
    
    return credentials?.password || null;
  }

  private async removeFromKeychain(
    key: string,
    options: SecureStorageOptions
  ): Promise<void> {
    const service = `${options.service}_${key}`;
    await this.removeCredentials(service);
  }

  private async clearKeychain(): Promise<void> {
    try {
      // This would clear all keychain items for the app
      // Implementation depends on specific requirements
      await Keychain.resetCredentials();
    } catch (error) {
      // Continue even if keychain clear fails
    }
  }

  private async performIntegrityCheck(): Promise<void> {
    // Verify stored data integrity
    const keys = await AsyncStorage.getAllKeys();
    let corruptedKeys = 0;

    for (const key of keys) {
      try {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          const storedData: StoredData = JSON.parse(value);
          if (storedData.checksum) {
            const expectedChecksum = this.generateChecksum(storedData);
            if (storedData.checksum !== expectedChecksum) {
              await AsyncStorage.removeItem(key);
              corruptedKeys++;
            }
          }
        }
      } catch (error) {
        // Remove corrupted data
        await AsyncStorage.removeItem(key);
        corruptedKeys++;
      }
    }

    if (corruptedKeys > 0) {
      securityLogger.warn('data_corruption_detected', {
        corruptedKeys,
        cleaned: true,
      });
    }
  }
}

// Export singleton instance
export const secureStorage = SecureStorage.getInstance();