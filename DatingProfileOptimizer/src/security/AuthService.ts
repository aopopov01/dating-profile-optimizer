/**
 * Authentication Service for Dating Profile Optimizer
 * Handles JWT tokens, MFA, session management, and OAuth2
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { SECURITY_CONFIG, SECURITY_EVENTS, ERROR_MESSAGES } from './SecurityConfig';
import { cryptoService } from './CryptoService';
import { securityLogger } from './SecurityLogger';
import { biometricAuth } from './BiometricAuth';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface UserCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface MFASetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  tokens: AuthTokens | null;
  mfaRequired: boolean;
  accountLocked: boolean;
  lockoutExpiry: number | null;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
  mfaEnabled: boolean;
  lastLoginAt: string;
  createdAt: string;
}

export interface LoginAttempt {
  email: string;
  timestamp: number;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export class AuthService {
  private static instance: AuthService;
  private authState: AuthState;
  private loginAttempts: Map<string, LoginAttempt[]> = new Map();
  private refreshTokenTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.authState = {
      isAuthenticated: false,
      user: null,
      tokens: null,
      mfaRequired: false,
      accountLocked: false,
      lockoutExpiry: null,
    };
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Initialize authentication service
   */
  async initialize(): Promise<void> {
    try {
      // Restore authentication state from secure storage
      await this.restoreAuthState();
      
      // Set up automatic token refresh
      if (this.authState.tokens) {
        this.scheduleTokenRefresh();
      }
    } catch (error) {
      securityLogger.error('AuthService initialization failed', { error });
    }
  }

  /**
   * Login user with email/password
   */
  async login(credentials: UserCredentials): Promise<{
    success: boolean;
    requiresMFA?: boolean;
    error?: string;
  }> {
    try {
      const { email, password, rememberMe } = credentials;

      // Check if account is locked
      if (await this.isAccountLocked(email)) {
        securityLogger.warn(SECURITY_EVENTS.LOGIN_LOCKED, { email });
        return {
          success: false,
          error: ERROR_MESSAGES.ACCOUNT_LOCKED,
        };
      }

      // Validate credentials (mock implementation)
      const authResult = await this.validateCredentials(email, password);
      
      if (!authResult.valid) {
        await this.recordFailedLogin(email);
        securityLogger.warn(SECURITY_EVENTS.LOGIN_FAILURE, { email });
        
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      // Check if MFA is required
      if (authResult.user.mfaEnabled) {
        // Store temporary auth state for MFA completion
        await this.storePendingMFA(authResult.user);
        
        return {
          success: true,
          requiresMFA: true,
        };
      }

      // Complete login
      await this.completeLogin(authResult.user, rememberMe);
      
      return { success: true };
    } catch (error) {
      securityLogger.error('Login failed', { error });
      return {
        success: false,
        error: 'Login failed. Please try again.',
      };
    }
  }

  /**
   * Complete MFA verification
   */
  async verifyMFA(token: string, backupCode?: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const pendingAuth = await this.getPendingMFA();
      if (!pendingAuth) {
        return {
          success: false,
          error: 'No pending MFA verification',
        };
      }

      let isValid = false;

      if (backupCode) {
        isValid = await this.verifyBackupCode(pendingAuth.email, backupCode);
      } else {
        isValid = await this.verifyTOTPToken(pendingAuth.email, token);
      }

      if (!isValid) {
        securityLogger.warn('MFA verification failed', {
          email: pendingAuth.email,
          method: backupCode ? 'backup_code' : 'totp',
        });
        
        return {
          success: false,
          error: 'Invalid verification code',
        };
      }

      // Complete login after successful MFA
      await this.completeLogin(pendingAuth);
      await this.clearPendingMFA();

      return { success: true };
    } catch (error) {
      securityLogger.error('MFA verification failed', { error });
      return {
        success: false,
        error: 'MFA verification failed',
      };
    }
  }

  /**
   * Setup Multi-Factor Authentication
   */
  async setupMFA(userId: string): Promise<MFASetup> {
    try {
      const secret = speakeasy.generateSecret({
        name: 'Dating Profile Optimizer',
        account: userId,
        issuer: 'DPO',
        length: 32,
      });

      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);
      const backupCodes = this.generateBackupCodes();

      // Store MFA secret securely
      await this.storeMFASecret(userId, secret.base32, backupCodes);

      securityLogger.info(SECURITY_EVENTS.MFA_ENABLED, { userId });

      return {
        secret: secret.base32,
        qrCodeUrl,
        backupCodes,
      };
    } catch (error) {
      securityLogger.error('MFA setup failed', { userId, error });
      throw new Error('Failed to setup MFA');
    }
  }

  /**
   * Disable Multi-Factor Authentication
   */
  async disableMFA(userId: string, currentPassword: string): Promise<boolean> {
    try {
      // Verify current password before disabling MFA
      const user = await this.getUserById(userId);
      if (!user || !(await this.validatePassword(currentPassword, user.passwordHash))) {
        return false;
      }

      await this.removeMFASecret(userId);
      securityLogger.info(SECURITY_EVENTS.MFA_DISABLED, { userId });

      return true;
    } catch (error) {
      securityLogger.error('MFA disable failed', { userId, error });
      return false;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<boolean> {
    try {
      const tokens = this.authState.tokens;
      if (!tokens?.refreshToken) {
        await this.logout();
        return false;
      }

      // Verify refresh token
      const payload = await this.verifyToken(tokens.refreshToken, 'refresh');
      if (!payload) {
        await this.logout();
        return false;
      }

      // Generate new tokens
      const user = await this.getUserById(payload.sub);
      if (!user) {
        await this.logout();
        return false;
      }

      const newTokens = await this.generateTokens(user);
      await this.updateTokens(newTokens);
      
      this.scheduleTokenRefresh();

      return true;
    } catch (error) {
      securityLogger.error('Token refresh failed', { error });
      await this.logout();
      return false;
    }
  }

  /**
   * Logout user and clear session
   */
  async logout(): Promise<void> {
    try {
      const userId = this.authState.user?.id;

      // Clear refresh token timer
      if (this.refreshTokenTimer) {
        clearTimeout(this.refreshTokenTimer);
        this.refreshTokenTimer = null;
      }

      // Clear stored tokens
      await AsyncStorage.multiRemove([
        'auth_tokens',
        'auth_user',
        'pending_mfa',
      ]);

      // Reset auth state
      this.authState = {
        isAuthenticated: false,
        user: null,
        tokens: null,
        mfaRequired: false,
        accountLocked: false,
        lockoutExpiry: null,
      };

      securityLogger.info(SECURITY_EVENTS.LOGOUT, { userId });
    } catch (error) {
      securityLogger.error('Logout failed', { error });
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate password strength
      const passwordValidation = this.validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        return {
          success: false,
          error: passwordValidation.error,
        };
      }

      // Verify current password
      const user = await this.getUserById(userId);
      if (!user || !(await this.validatePassword(currentPassword, user.passwordHash))) {
        return {
          success: false,
          error: 'Current password is incorrect',
        };
      }

      // Hash new password
      const newPasswordHash = await cryptoService.hashPassword(newPassword);
      
      // Update password in database (mock)
      await this.updateUserPassword(userId, newPasswordHash);

      securityLogger.info(SECURITY_EVENTS.PASSWORD_CHANGE, { userId });

      return { success: true };
    } catch (error) {
      securityLogger.error('Password change failed', { userId, error });
      return {
        success: false,
        error: 'Password change failed',
      };
    }
  }

  /**
   * Get current authentication state
   */
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  /**
   * Check if user has permission
   */
  hasPermission(permission: string): boolean {
    return this.authState.user?.permissions?.includes(permission) || false;
  }

  /**
   * Check if user has role
   */
  hasRole(role: string): boolean {
    return this.authState.user?.roles?.includes(role) || false;
  }

  // Private methods

  private async validateCredentials(email: string, password: string): Promise<{
    valid: boolean;
    user?: AuthUser;
  }> {
    // Mock credential validation - replace with actual implementation
    const mockUser: AuthUser = {
      id: '12345',
      email,
      firstName: 'John',
      lastName: 'Doe',
      roles: ['user'],
      permissions: ['read', 'write'],
      mfaEnabled: true,
      lastLoginAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    // In real implementation, validate against hashed password in database
    return {
      valid: password.length > 0, // Mock validation
      user: mockUser,
    };
  }

  private async generateTokens(user: AuthUser): Promise<AuthTokens> {
    const now = Math.floor(Date.now() / 1000);
    const accessTokenExpiry = now + (15 * 60); // 15 minutes
    const refreshTokenExpiry = now + (7 * 24 * 60 * 60); // 7 days

    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        roles: user.roles,
        permissions: user.permissions,
        type: 'access',
        iat: now,
        exp: accessTokenExpiry,
        iss: SECURITY_CONFIG.jwt.issuer,
        aud: SECURITY_CONFIG.jwt.audience,
      },
      'mock-secret-key', // Use proper secret in production
      { algorithm: 'HS256' }
    );

    const refreshToken = jwt.sign(
      {
        sub: user.id,
        type: 'refresh',
        iat: now,
        exp: refreshTokenExpiry,
        iss: SECURITY_CONFIG.jwt.issuer,
        aud: SECURITY_CONFIG.jwt.audience,
      },
      'mock-refresh-secret-key', // Use proper secret in production
      { algorithm: 'HS256' }
    );

    return {
      accessToken,
      refreshToken,
      expiresAt: accessTokenExpiry * 1000,
    };
  }

  private async verifyToken(token: string, type: 'access' | 'refresh'): Promise<any> {
    try {
      const secret = type === 'access' ? 'mock-secret-key' : 'mock-refresh-secret-key';
      const payload = jwt.verify(token, secret) as any;
      
      if (payload.type !== type) {
        return null;
      }

      return payload;
    } catch (error) {
      return null;
    }
  }

  private async completeLogin(user: AuthUser, rememberMe?: boolean): Promise<void> {
    const tokens = await this.generateTokens(user);
    
    this.authState = {
      isAuthenticated: true,
      user,
      tokens,
      mfaRequired: false,
      accountLocked: false,
      lockoutExpiry: null,
    };

    // Store tokens securely
    if (rememberMe) {
      await AsyncStorage.setItem('auth_tokens', JSON.stringify(tokens));
      await AsyncStorage.setItem('auth_user', JSON.stringify(user));
    }

    this.scheduleTokenRefresh();
    this.clearFailedLogins(user.email);
    
    securityLogger.info(SECURITY_EVENTS.LOGIN_SUCCESS, {
      userId: user.id,
      email: user.email,
    });
  }

  private scheduleTokenRefresh(): void {
    if (this.refreshTokenTimer) {
      clearTimeout(this.refreshTokenTimer);
    }

    const tokens = this.authState.tokens;
    if (!tokens) return;

    const refreshTime = tokens.expiresAt - Date.now() - (5 * 60 * 1000); // 5 minutes before expiry
    
    if (refreshTime > 0) {
      this.refreshTokenTimer = setTimeout(() => {
        this.refreshAccessToken();
      }, refreshTime);
    }
  }

  private async restoreAuthState(): Promise<void> {
    try {
      const [tokensStr, userStr] = await AsyncStorage.multiGet(['auth_tokens', 'auth_user']);
      
      if (tokensStr[1] && userStr[1]) {
        const tokens = JSON.parse(tokensStr[1]);
        const user = JSON.parse(userStr[1]);
        
        // Verify token is still valid
        if (tokens.expiresAt > Date.now()) {
          this.authState = {
            isAuthenticated: true,
            user,
            tokens,
            mfaRequired: false,
            accountLocked: false,
            lockoutExpiry: null,
          };
        }
      }
    } catch (error) {
      // Clear invalid stored data
      await AsyncStorage.multiRemove(['auth_tokens', 'auth_user']);
    }
  }

  private async recordFailedLogin(email: string): Promise<void> {
    const attempts = this.loginAttempts.get(email) || [];
    attempts.push({
      email,
      timestamp: Date.now(),
      success: false,
    });

    // Keep only recent attempts
    const recentAttempts = attempts.filter(
      attempt => Date.now() - attempt.timestamp < SECURITY_CONFIG.auth.lockoutDurationMinutes * 60 * 1000
    );

    this.loginAttempts.set(email, recentAttempts);

    // Lock account if too many failed attempts
    if (recentAttempts.length >= SECURITY_CONFIG.auth.maxLoginAttempts) {
      await this.lockAccount(email);
    }
  }

  private async isAccountLocked(email: string): Promise<boolean> {
    const attempts = this.loginAttempts.get(email) || [];
    const recentFailures = attempts.filter(
      attempt => !attempt.success && Date.now() - attempt.timestamp < SECURITY_CONFIG.auth.lockoutDurationMinutes * 60 * 1000
    );

    return recentFailures.length >= SECURITY_CONFIG.auth.maxLoginAttempts;
  }

  private async lockAccount(email: string): Promise<void> {
    // In production, store lockout state in database
    securityLogger.warn(SECURITY_EVENTS.LOGIN_LOCKED, { email });
  }

  private clearFailedLogins(email: string): void {
    this.loginAttempts.delete(email);
  }

  private validatePasswordStrength(password: string): { valid: boolean; error?: string } {
    if (password.length < SECURITY_CONFIG.auth.passwordMinLength) {
      return {
        valid: false,
        error: `Password must be at least ${SECURITY_CONFIG.auth.passwordMinLength} characters long`,
      };
    }

    if (SECURITY_CONFIG.auth.passwordRequireUppercase && !/[A-Z]/.test(password)) {
      return {
        valid: false,
        error: 'Password must contain at least one uppercase letter',
      };
    }

    if (SECURITY_CONFIG.auth.passwordRequireNumber && !/\d/.test(password)) {
      return {
        valid: false,
        error: 'Password must contain at least one number',
      };
    }

    if (SECURITY_CONFIG.auth.passwordRequireSpecialChar && !/[!@#$%^&*(),.?\":{}|<>]/.test(password)) {
      return {
        valid: false,
        error: 'Password must contain at least one special character',
      };
    }

    return { valid: true };
  }

  private generateBackupCodes(): string[] {
    return Array.from({ length: 8 }, () => cryptoService.generateToken(4).toUpperCase());
  }

  // Mock implementations - replace with actual database operations

  private async getUserById(userId: string): Promise<any> {
    // Mock implementation
    return {
      id: userId,
      passwordHash: 'mock-hash',
    };
  }

  private async validatePassword(password: string, hash: string): Promise<boolean> {
    // Mock implementation
    return password.length > 0;
  }

  private async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    // Mock implementation
  }

  private async updateTokens(tokens: AuthTokens): Promise<void> {
    this.authState.tokens = tokens;
    await AsyncStorage.setItem('auth_tokens', JSON.stringify(tokens));
  }

  private async storePendingMFA(user: AuthUser): Promise<void> {
    await AsyncStorage.setItem('pending_mfa', JSON.stringify(user));
  }

  private async getPendingMFA(): Promise<AuthUser | null> {
    const data = await AsyncStorage.getItem('pending_mfa');
    return data ? JSON.parse(data) : null;
  }

  private async clearPendingMFA(): Promise<void> {
    await AsyncStorage.removeItem('pending_mfa');
  }

  private async storeMFASecret(userId: string, secret: string, backupCodes: string[]): Promise<void> {
    // Store encrypted MFA data
    const data = { secret, backupCodes };
    const encrypted = await cryptoService.encryptPII(data);
    await AsyncStorage.setItem(`mfa_${userId}`, encrypted);
  }

  private async removeMFASecret(userId: string): Promise<void> {
    await AsyncStorage.removeItem(`mfa_${userId}`);
  }

  private async verifyTOTPToken(email: string, token: string): Promise<boolean> {
    // Mock implementation - in production, verify against stored secret
    return token.length === 6 && /^\d+$/.test(token);
  }

  private async verifyBackupCode(email: string, backupCode: string): Promise<boolean> {
    // Mock implementation - in production, verify and invalidate backup code
    return backupCode.length === 4 && /^[A-Z0-9]+$/.test(backupCode);
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();