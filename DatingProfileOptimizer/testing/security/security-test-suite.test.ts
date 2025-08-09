/**
 * Security Testing Suite
 * Comprehensive security testing for both Dating Profile Optimizer and LinkedIn Headshot Generator
 */

import { SecurityManager } from '../../src/security/SecurityManager';
import { CryptoService } from '../../src/security/CryptoService';
import { AuthService } from '../../src/security/AuthService';
import { SecureStorage } from '../../src/security/SecureStorage';
import { BiometricAuth } from '../../src/security/BiometricAuth';
import { DataProtectionService } from '../../src/security/DataProtectionService';

describe('Security Test Suite', () => {
  let securityManager: SecurityManager;
  let cryptoService: CryptoService;
  let authService: AuthService;
  let secureStorage: SecureStorage;
  let biometricAuth: BiometricAuth;
  let dataProtection: DataProtectionService;

  beforeEach(() => {
    securityManager = SecurityManager.getInstance();
    cryptoService = CryptoService.getInstance();
    authService = AuthService.getInstance();
    secureStorage = SecureStorage.getInstance();
    biometricAuth = BiometricAuth.getInstance();
    dataProtection = DataProtectionService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Security', () => {
    describe('User Registration Security', () => {
      test('should enforce strong password requirements', async () => {
        const weakPasswords = [
          '123456',
          'password',
          'qwerty',
          '12345678',
          'abc123',
          'password123'
        ];

        for (const weakPassword of weakPasswords) {
          try {
            await authService.register('test@example.com', weakPassword);
            fail(`Weak password "${weakPassword}" should have been rejected`);
          } catch (error: any) {
            expect(error.message).toContain('password');
          }
        }
      });

      test('should validate email format properly', async () => {
        const invalidEmails = [
          'invalid-email',
          '@domain.com',
          'user@',
          'user..double.dot@domain.com',
          'user@domain',
          'user@domain..com'
        ];

        for (const invalidEmail of invalidEmails) {
          try {
            await authService.register(invalidEmail, 'SecurePass123!');
            fail(`Invalid email "${invalidEmail}" should have been rejected`);
          } catch (error: any) {
            expect(error.message).toContain('email');
          }
        }
      });

      test('should prevent duplicate registrations', async () => {
        const email = 'test@example.com';
        const password = 'SecurePass123!';

        await authService.register(email, password);

        try {
          await authService.register(email, password);
          fail('Duplicate registration should have been prevented');
        } catch (error: any) {
          expect(error.message).toContain('already exists');
        }
      });

      test('should hash passwords properly', async () => {
        const password = 'SecurePass123!';
        const user = await authService.register('test@example.com', password);

        // Password should never be stored in plain text
        expect(user.password).not.toBe(password);
        expect(user.password).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt format
      });
    });

    describe('Authentication Process', () => {
      test('should authenticate valid credentials', async () => {
        const email = 'auth-test@example.com';
        const password = 'SecurePass123!';

        await authService.register(email, password);
        const result = await authService.login(email, password);

        expect(result.success).toBe(true);
        expect(result.token).toBeTruthy();
        expect(result.user.email).toBe(email);
      });

      test('should reject invalid credentials', async () => {
        const email = 'invalid-test@example.com';
        const correctPassword = 'SecurePass123!';
        const wrongPassword = 'WrongPass123!';

        await authService.register(email, correctPassword);

        const result = await authService.login(email, wrongPassword);
        expect(result.success).toBe(false);
        expect(result.token).toBeNull();
      });

      test('should implement rate limiting for failed login attempts', async () => {
        const email = 'ratelimit-test@example.com';
        const correctPassword = 'SecurePass123!';
        const wrongPassword = 'WrongPass123!';

        await authService.register(email, correctPassword);

        // Attempt multiple failed logins
        const maxAttempts = 5;
        for (let i = 0; i < maxAttempts; i++) {
          await authService.login(email, wrongPassword);
        }

        // Next attempt should be rate limited
        try {
          await authService.login(email, correctPassword);
          fail('Account should be temporarily locked');
        } catch (error: any) {
          expect(error.message).toContain('rate limit');
        }
      });

      test('should generate secure JWT tokens', async () => {
        const email = 'jwt-test@example.com';
        const password = 'SecurePass123!';

        await authService.register(email, password);
        const result = await authService.login(email, password);

        expect(result.token).toBeTruthy();
        expect(result.token.split('.')).toHaveLength(3); // JWT format: header.payload.signature

        // Verify token contains expected claims
        const decoded = await authService.verifyToken(result.token!);
        expect(decoded.email).toBe(email);
        expect(decoded.iat).toBeTruthy();
        expect(decoded.exp).toBeTruthy();
      });
    });

    describe('Session Management', () => {
      test('should handle token expiration properly', async () => {
        const email = 'expiry-test@example.com';
        const password = 'SecurePass123!';

        await authService.register(email, password);
        const result = await authService.login(email, password);

        // Mock token expiration
        jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 25 * 60 * 60 * 1000); // 25 hours later

        try {
          await authService.verifyToken(result.token!);
          fail('Expired token should be rejected');
        } catch (error: any) {
          expect(error.message).toContain('expired');
        }
      });

      test('should invalidate tokens on logout', async () => {
        const email = 'logout-test@example.com';
        const password = 'SecurePass123!';

        await authService.register(email, password);
        const result = await authService.login(email, password);

        await authService.logout(result.token!);

        try {
          await authService.verifyToken(result.token!);
          fail('Logged out token should be invalid');
        } catch (error: any) {
          expect(error.message).toContain('invalid');
        }
      });
    });
  });

  describe('Data Protection and Encryption', () => {
    describe('Cryptographic Security', () => {
      test('should encrypt data using AES-256', async () => {
        const plaintext = 'Sensitive user data';
        const encrypted = await cryptoService.encrypt(plaintext);

        expect(encrypted).not.toBe(plaintext);
        expect(encrypted).toContain(':'); // Format: iv:encryptedData
        
        const decrypted = await cryptoService.decrypt(encrypted);
        expect(decrypted).toBe(plaintext);
      });

      test('should generate secure random keys', () => {
        const key1 = cryptoService.generateSecureKey();
        const key2 = cryptoService.generateSecureKey();

        expect(key1).not.toBe(key2);
        expect(key1.length).toBeGreaterThanOrEqual(64); // At least 256 bits
        expect(key2.length).toBeGreaterThanOrEqual(64);
      });

      test('should hash data securely', async () => {
        const data = 'Data to hash';
        const hash1 = await cryptoService.hash(data);
        const hash2 = await cryptoService.hash(data);

        expect(hash1).toBe(hash2); // Same input should produce same hash
        expect(hash1).not.toBe(data);
        expect(hash1.length).toBe(64); // SHA-256 produces 64 character hex
      });

      test('should verify data integrity', async () => {
        const originalData = 'Important data';
        const hash = await cryptoService.hash(originalData);

        const isValid = await cryptoService.verifyHash(originalData, hash);
        expect(isValid).toBe(true);

        const tamperedData = 'Important data modified';
        const isInvalid = await cryptoService.verifyHash(tamperedData, hash);
        expect(isInvalid).toBe(false);
      });
    });

    describe('Secure Storage', () => {
      test('should store sensitive data securely', async () => {
        const key = 'user-token';
        const value = 'jwt-token-value';

        await secureStorage.setItem(key, value);
        const retrieved = await secureStorage.getItem(key);

        expect(retrieved).toBe(value);
      });

      test('should encrypt stored data', async () => {
        const key = 'sensitive-key';
        const value = 'very-sensitive-data';

        await secureStorage.setItem(key, value);

        // Mock storage to check if data is encrypted
        const mockStorage = require('@react-native-async-storage/async-storage').__STORAGE__;
        const storedValue = mockStorage[key];

        expect(storedValue).not.toBe(value);
        expect(storedValue).toContain(':'); // Encrypted format
      });

      test('should handle storage errors gracefully', async () => {
        // Mock storage failure
        jest.spyOn(require('@react-native-async-storage/async-storage'), 'setItem')
          .mockRejectedValueOnce(new Error('Storage error'));

        try {
          await secureStorage.setItem('test-key', 'test-value');
          fail('Storage error should propagate');
        } catch (error: any) {
          expect(error.message).toContain('Storage error');
        }
      });

      test('should clear sensitive data on app uninstall', async () => {
        await secureStorage.setItem('user-data', 'sensitive-info');
        await secureStorage.clear();

        const retrieved = await secureStorage.getItem('user-data');
        expect(retrieved).toBeNull();
      });
    });

    describe('Photo Data Protection', () => {
      test('should encrypt photo data before storage', async () => {
        const photoData = 'base64-photo-data';
        const userId = 'user-123';

        const encryptedPhoto = await dataProtection.encryptPhotoData(photoData, userId);

        expect(encryptedPhoto).not.toBe(photoData);
        expect(encryptedPhoto).toContain(':'); // Encrypted format

        const decryptedPhoto = await dataProtection.decryptPhotoData(encryptedPhoto, userId);
        expect(decryptedPhoto).toBe(photoData);
      });

      test('should implement secure photo deletion', async () => {
        const photoId = 'photo-456';
        const photoData = 'photo-data-to-delete';

        await dataProtection.storeSecurePhoto(photoId, photoData);
        await dataProtection.secureDeletePhoto(photoId);

        const retrieved = await dataProtection.retrieveSecurePhoto(photoId);
        expect(retrieved).toBeNull();
      });

      test('should validate photo metadata', async () => {
        const validMetadata = {
          userId: 'user-123',
          timestamp: Date.now(),
          size: 1024000,
          format: 'jpeg'
        };

        const isValid = await dataProtection.validatePhotoMetadata(validMetadata);
        expect(isValid).toBe(true);

        const invalidMetadata = {
          userId: '',
          timestamp: 0,
          size: -1,
          format: 'invalid'
        };

        const isInvalid = await dataProtection.validatePhotoMetadata(invalidMetadata);
        expect(isInvalid).toBe(false);
      });
    });
  });

  describe('Biometric Authentication Security', () => {
    test('should check biometric availability', async () => {
      const isAvailable = await biometricAuth.isAvailable();
      expect(typeof isAvailable).toBe('boolean');

      if (isAvailable) {
        const biometryType = await biometricAuth.getBiometryType();
        expect(['TouchID', 'FaceID', 'Biometrics']).toContain(biometryType);
      }
    });

    test('should authenticate using biometrics when available', async () => {
      const isAvailable = await biometricAuth.isAvailable();
      
      if (isAvailable) {
        const result = await biometricAuth.authenticate('Access your account');
        expect(result.success).toBe(true);
      } else {
        // Skip test if biometrics not available
        expect(true).toBe(true);
      }
    });

    test('should handle biometric authentication failure', async () => {
      const isAvailable = await biometricAuth.isAvailable();
      
      if (isAvailable) {
        // Mock biometric failure
        jest.spyOn(require('react-native-biometrics'), 'simplePrompt')
          .mockResolvedValueOnce({ success: false, error: 'User cancelled' });

        const result = await biometricAuth.authenticate('Test authentication');
        expect(result.success).toBe(false);
        expect(result.error).toBeTruthy();
      } else {
        expect(true).toBe(true);
      }
    });

    test('should fallback to PIN/password when biometric fails', async () => {
      const result = await biometricAuth.authenticateWithFallback(
        'Access your account',
        'Enter your PIN'
      );

      // Should either succeed with biometric or request fallback
      expect(typeof result.success).toBe('boolean');
      if (!result.success) {
        expect(result.requiresFallback).toBe(true);
      }
    });
  });

  describe('API Security', () => {
    describe('Input Validation', () => {
      test('should sanitize user inputs', () => {
        const maliciousInputs = [
          '<script>alert("XSS")</script>',
          "'; DROP TABLE users; --",
          '${process.env.SECRET_KEY}',
          '../../../etc/passwd'
        ];

        maliciousInputs.forEach(input => {
          const sanitized = securityManager.sanitizeInput(input);
          expect(sanitized).not.toContain('<script>');
          expect(sanitized).not.toContain('DROP TABLE');
          expect(sanitized).not.toContain('${');
          expect(sanitized).not.toContain('../');
        });
      });

      test('should validate API request parameters', () => {
        const validRequest = {
          userId: 'user-123',
          email: 'test@example.com',
          age: 25,
          photos: ['photo1.jpg', 'photo2.jpg']
        };

        const isValid = securityManager.validateApiRequest(validRequest);
        expect(isValid).toBe(true);

        const invalidRequest = {
          userId: '',
          email: 'invalid-email',
          age: -1,
          photos: null
        };

        const isInvalid = securityManager.validateApiRequest(invalidRequest);
        expect(isInvalid).toBe(false);
      });
    });

    describe('Rate Limiting', () => {
      test('should implement API rate limiting', async () => {
        const userId = 'rate-limit-user';
        const endpoint = '/api/analyze-photo';

        // Simulate multiple requests
        for (let i = 0; i < 10; i++) {
          const allowed = await securityManager.checkRateLimit(userId, endpoint);
          expect(typeof allowed).toBe('boolean');
        }

        // After too many requests, should be rate limited
        const rateLimited = await securityManager.checkRateLimit(userId, endpoint);
        expect(rateLimited).toBe(false);
      });

      test('should reset rate limit after time window', async () => {
        const userId = 'reset-user';
        const endpoint = '/api/generate-bio';

        // Exhaust rate limit
        for (let i = 0; i < 15; i++) {
          await securityManager.checkRateLimit(userId, endpoint);
        }

        // Mock time passage
        jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 61000); // 61 seconds

        const allowed = await securityManager.checkRateLimit(userId, endpoint);
        expect(allowed).toBe(true);
      });
    });

    describe('HTTPS and SSL Security', () => {
      test('should enforce HTTPS for API calls', () => {
        const httpUrl = 'http://api.example.com/endpoint';
        const httpsUrl = 'https://api.example.com/endpoint';

        expect(() => securityManager.validateApiUrl(httpUrl)).toThrow('HTTPS required');
        expect(() => securityManager.validateApiUrl(httpsUrl)).not.toThrow();
      });

      test('should validate SSL certificates', async () => {
        // Mock certificate validation
        const validCert = {
          issuer: 'Valid CA',
          valid_from: new Date(Date.now() - 86400000), // Yesterday
          valid_to: new Date(Date.now() + 86400000), // Tomorrow
          subject: 'api.example.com'
        };

        const isValid = await securityManager.validateSSLCertificate(validCert);
        expect(isValid).toBe(true);

        const expiredCert = {
          ...validCert,
          valid_to: new Date(Date.now() - 86400000) // Yesterday
        };

        const isExpired = await securityManager.validateSSLCertificate(expiredCert);
        expect(isExpired).toBe(false);
      });
    });
  });

  describe('Privacy and GDPR Compliance', () => {
    test('should implement data minimization', async () => {
      const userData = {
        email: 'user@example.com',
        password: 'SecurePass123!',
        age: 25,
        location: 'New York',
        preferences: ['music', 'sports'],
        sensitiveData: 'should-be-removed',
        internalId: 'internal-123'
      };

      const minimized = await dataProtection.minimizeUserData(userData);
      
      expect(minimized).toHaveProperty('email');
      expect(minimized).toHaveProperty('age');
      expect(minimized).toHaveProperty('preferences');
      expect(minimized).not.toHaveProperty('password');
      expect(minimized).not.toHaveProperty('sensitiveData');
      expect(minimized).not.toHaveProperty('internalId');
    });

    test('should provide data export functionality', async () => {
      const userId = 'export-user';
      const userData = {
        photos: ['photo1.jpg', 'photo2.jpg'],
        preferences: { platform: 'tinder' },
        analysisResults: [{ score: 85 }]
      };

      await dataProtection.storeUserData(userId, userData);
      const exportedData = await dataProtection.exportUserData(userId);

      expect(exportedData).toHaveProperty('photos');
      expect(exportedData).toHaveProperty('preferences');
      expect(exportedData).toHaveProperty('analysisResults');
      expect(exportedData).toHaveProperty('exportDate');
    });

    test('should implement secure data deletion', async () => {
      const userId = 'delete-user';
      const userData = {
        photos: ['photo1.jpg'],
        preferences: { theme: 'dark' }
      };

      await dataProtection.storeUserData(userId, userData);
      await dataProtection.secureDeleteUserData(userId);

      const retrievedData = await dataProtection.getUserData(userId);
      expect(retrievedData).toBeNull();
    });

    test('should handle data retention policies', async () => {
      const userId = 'retention-user';
      const oldData = {
        createdAt: new Date(Date.now() - 366 * 24 * 60 * 60 * 1000), // 366 days ago
        photos: ['old-photo.jpg']
      };

      await dataProtection.storeUserData(userId, oldData);
      await dataProtection.applyRetentionPolicy();

      const retrievedData = await dataProtection.getUserData(userId);
      expect(retrievedData).toBeNull(); // Should be auto-deleted
    });
  });

  describe('Security Monitoring and Logging', () => {
    test('should log security events', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      await securityManager.logSecurityEvent('login_attempt', {
        userId: 'user-123',
        success: true,
        timestamp: new Date().toISOString()
      });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('SECURITY_EVENT'),
        expect.objectContaining({ event: 'login_attempt' })
      );

      logSpy.mockRestore();
    });

    test('should detect suspicious activity', async () => {
      const suspiciousActivity = {
        userId: 'suspicious-user',
        rapidApiCalls: 100,
        differentLocations: ['US', 'RU', 'CN'],
        timeWindow: 60000 // 1 minute
      };

      const isSuspicious = await securityManager.detectSuspiciousActivity(suspiciousActivity);
      expect(isSuspicious).toBe(true);
    });

    test('should trigger security alerts', async () => {
      const alertSpy = jest.fn();
      securityManager.setAlertHandler(alertSpy);

      await securityManager.triggerSecurityAlert({
        level: 'HIGH',
        type: 'MULTIPLE_FAILED_LOGINS',
        userId: 'alert-user',
        details: 'Multiple failed login attempts detected'
      });

      expect(alertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'HIGH',
          type: 'MULTIPLE_FAILED_LOGINS'
        })
      );
    });
  });

  describe('Penetration Testing Scenarios', () => {
    test('should resist SQL injection attempts', async () => {
      const maliciousEmail = "admin'; DROP TABLE users; --";
      const password = 'password';

      try {
        await authService.login(maliciousEmail, password);
        // Should not execute SQL injection
      } catch (error: any) {
        expect(error.message).not.toContain('table');
        expect(error.message).toContain('invalid');
      }
    });

    test('should prevent XSS attacks', () => {
      const xssPayload = '<img src="x" onerror="alert(\'XSS\')">';
      const sanitized = securityManager.sanitizeInput(xssPayload);

      expect(sanitized).not.toContain('<img');
      expect(sanitized).not.toContain('onerror');
      expect(sanitized).not.toContain('alert');
    });

    test('should prevent CSRF attacks', async () => {
      const validToken = 'valid-csrf-token';
      const invalidToken = 'invalid-csrf-token';

      const validRequest = {
        csrfToken: validToken,
        action: 'delete-photo',
        photoId: 'photo-123'
      };

      const invalidRequest = {
        csrfToken: invalidToken,
        action: 'delete-photo',
        photoId: 'photo-123'
      };

      const isValidRequest = await securityManager.validateCSRFToken(validRequest);
      expect(isValidRequest).toBe(true);

      const isInvalidRequest = await securityManager.validateCSRFToken(invalidRequest);
      expect(isInvalidRequest).toBe(false);
    });

    test('should handle directory traversal attempts', () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
      ];

      maliciousPaths.forEach(path => {
        expect(() => securityManager.validateFilePath(path)).toThrow('Invalid file path');
      });

      const validPath = 'user-photos/photo-123.jpg';
      expect(() => securityManager.validateFilePath(validPath)).not.toThrow();
    });
  });
});