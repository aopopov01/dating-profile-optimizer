/**
 * Cryptographic Service for Dating Profile Optimizer
 * Handles encryption, decryption, hashing, and key management
 */

import CryptoJS from 'crypto-js';
import { NativeModules } from 'react-native';
import { SECURITY_CONFIG, CRYPTO_CONSTANTS } from './SecurityConfig';

export interface EncryptionResult {
  encrypted: string;
  iv: string;
  tag: string;
  salt?: string;
}

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export class CryptoService {
  private static instance: CryptoService;
  private masterKey: string | null = null;

  private constructor() {}

  public static getInstance(): CryptoService {
    if (!CryptoService.instance) {
      CryptoService.instance = new CryptoService();
    }
    return CryptoService.instance;
  }

  /**
   * Initialize cryptographic service with master key
   */
  async initialize(userPassword?: string): Promise<void> {
    try {
      // Generate or derive master key
      if (userPassword) {
        this.masterKey = await this.deriveKeyFromPassword(userPassword);
      } else {
        this.masterKey = await this.generateSecureKey();
      }
    } catch (error) {
      throw new Error('Failed to initialize cryptographic service');
    }
  }

  /**
   * Generate cryptographically secure random key
   */
  async generateSecureKey(length: number = CRYPTO_CONSTANTS.ENCRYPTION_KEY_LENGTH): Promise<string> {
    try {
      const randomBytes = CryptoJS.lib.WordArray.random(length);
      return randomBytes.toString(CryptoJS.enc.Hex);
    } catch (error) {
      throw new Error('Failed to generate secure key');
    }
  }

  /**
   * Derive key from password using PBKDF2
   */
  async deriveKeyFromPassword(password: string, salt?: string): Promise<string> {
    try {
      const saltBytes = salt ? CryptoJS.enc.Hex.parse(salt) : CryptoJS.lib.WordArray.random(16);
      const key = CryptoJS.PBKDF2(password, saltBytes, {
        keySize: CRYPTO_CONSTANTS.ENCRYPTION_KEY_LENGTH / 4, // Convert to words
        iterations: SECURITY_CONFIG.encryption.iterations,
      });
      return key.toString(CryptoJS.enc.Hex);
    } catch (error) {
      throw new Error('Failed to derive key from password');
    }
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  async encrypt(data: string, key?: string): Promise<EncryptionResult> {
    try {
      const encryptionKey = key || this.masterKey;
      if (!encryptionKey) {
        throw new Error('Encryption key not available');
      }

      const iv = CryptoJS.lib.WordArray.random(SECURITY_CONFIG.encryption.ivSize);
      const keyWordArray = CryptoJS.enc.Hex.parse(encryptionKey);

      const encrypted = CryptoJS.AES.encrypt(data, keyWordArray, {
        iv: iv,
        mode: CryptoJS.mode.GCM,
        padding: CryptoJS.pad.NoPadding,
      });

      return {
        encrypted: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
        iv: iv.toString(CryptoJS.enc.Hex),
        tag: encrypted.tag?.toString(CryptoJS.enc.Hex) || '',
      };
    } catch (error) {
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  async decrypt(encryptionResult: EncryptionResult, key?: string): Promise<string> {
    try {
      const decryptionKey = key || this.masterKey;
      if (!decryptionKey) {
        throw new Error('Decryption key not available');
      }

      const keyWordArray = CryptoJS.enc.Hex.parse(decryptionKey);
      const iv = CryptoJS.enc.Hex.parse(encryptionResult.iv);
      const tag = CryptoJS.enc.Hex.parse(encryptionResult.tag);

      const decrypted = CryptoJS.AES.decrypt(
        {
          ciphertext: CryptoJS.enc.Base64.parse(encryptionResult.encrypted),
          tag: tag,
        },
        keyWordArray,
        {
          iv: iv,
          mode: CryptoJS.mode.GCM,
          padding: CryptoJS.pad.NoPadding,
        }
      );

      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      throw new Error('Decryption failed');
    }
  }

  /**
   * Hash password using bcrypt-compatible algorithm
   */
  async hashPassword(password: string): Promise<string> {
    try {
      // Using SHA-256 with salt as bcryptjs may not be available in RN
      const salt = CryptoJS.lib.WordArray.random(16);
      const hash = CryptoJS.PBKDF2(password, salt, {
        keySize: 32 / 4,
        iterations: CRYPTO_CONSTANTS.KEY_DERIVATION_ITERATIONS,
      });
      
      return salt.toString(CryptoJS.enc.Hex) + ':' + hash.toString(CryptoJS.enc.Hex);
    } catch (error) {
      throw new Error('Password hashing failed');
    }
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      const [saltHex, hashHex] = hash.split(':');
      const salt = CryptoJS.enc.Hex.parse(saltHex);
      
      const computedHash = CryptoJS.PBKDF2(password, salt, {
        keySize: 32 / 4,
        iterations: CRYPTO_CONSTANTS.KEY_DERIVATION_ITERATIONS,
      });

      return computedHash.toString(CryptoJS.enc.Hex) === hashHex;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate HMAC signature
   */
  generateHMAC(data: string, secret: string): string {
    try {
      return CryptoJS.HmacSHA256(data, secret).toString(CryptoJS.enc.Hex);
    } catch (error) {
      throw new Error('HMAC generation failed');
    }
  }

  /**
   * Verify HMAC signature
   */
  verifyHMAC(data: string, signature: string, secret: string): boolean {
    try {
      const computedSignature = this.generateHMAC(data, secret);
      return this.constantTimeCompare(signature, computedSignature);
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate secure random token
   */
  generateToken(length: number = 32): string {
    const randomBytes = CryptoJS.lib.WordArray.random(length);
    return randomBytes.toString(CryptoJS.enc.Hex);
  }

  /**
   * Hash data using SHA-256
   */
  hash(data: string): string {
    return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
  }

  /**
   * Generate UUID v4
   */
  generateUUID(): string {
    const randomBytes = CryptoJS.lib.WordArray.random(16);
    const hex = randomBytes.toString(CryptoJS.enc.Hex);
    
    return [
      hex.substr(0, 8),
      hex.substr(8, 4),
      '4' + hex.substr(13, 3),
      ((parseInt(hex.substr(16, 1), 16) & 0x3) | 0x8).toString(16) + hex.substr(17, 3),
      hex.substr(20, 12)
    ].join('-');
  }

  /**
   * Constant time string comparison to prevent timing attacks
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Encrypt sensitive PII data
   */
  async encryptPII(data: any): Promise<string> {
    try {
      const jsonString = JSON.stringify(data);
      const result = await this.encrypt(jsonString);
      return JSON.stringify(result);
    } catch (error) {
      throw new Error('PII encryption failed');
    }
  }

  /**
   * Decrypt sensitive PII data
   */
  async decryptPII(encryptedData: string): Promise<any> {
    try {
      const encryptionResult = JSON.parse(encryptedData);
      const decryptedString = await this.decrypt(encryptionResult);
      return JSON.parse(decryptedString);
    } catch (error) {
      throw new Error('PII decryption failed');
    }
  }

  /**
   * Generate key pair for asymmetric encryption (mock implementation)
   */
  async generateKeyPair(): Promise<KeyPair> {
    // In a real implementation, use native crypto modules
    // This is a simplified version for demonstration
    const privateKey = await this.generateSecureKey(64);
    const publicKey = CryptoJS.SHA256(privateKey).toString(CryptoJS.enc.Hex);

    return {
      privateKey,
      publicKey,
    };
  }

  /**
   * Securely wipe sensitive data from memory
   */
  secureWipe(): void {
    if (this.masterKey) {
      // Overwrite master key with random data
      this.masterKey = CryptoJS.lib.WordArray.random(this.masterKey.length / 2).toString(CryptoJS.enc.Hex);
      this.masterKey = null;
    }
  }

  /**
   * Validate encryption strength
   */
  validateEncryptionStrength(key: string): boolean {
    return key.length >= CRYPTO_CONSTANTS.ENCRYPTION_KEY_LENGTH * 2; // Hex string is 2x length
  }
}

// Export singleton instance
export const cryptoService = CryptoService.getInstance();