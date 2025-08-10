import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';

/**
 * Age Verification Service for Dating Profile Optimizer
 * Ensures COPPA compliance and proper age verification for dating app requirements
 */

export interface AgeVerificationData {
  userId: string;
  dateOfBirth: string;
  verificationMethod: 'self_declared' | 'document' | 'biometric' | 'parent_consent';
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'expired';
  verifiedAt?: string;
  expiresAt?: string;
  documentType?: string;
  parentalConsent?: ParentalConsentRecord;
}

export interface ParentalConsentRecord {
  parentName: string;
  parentEmail: string;
  consentGiven: boolean;
  consentDate: string;
  verificationToken: string;
  ipAddress: string;
}

export interface AgeCheckResult {
  isVerified: boolean;
  age: number;
  canUseApp: boolean;
  requiresParentalConsent: boolean;
  restrictions: string[];
}

class AgeVerificationService {
  private readonly MINIMUM_AGE = 18; // Dating apps require 18+
  private readonly STORAGE_KEY = 'age_verification';
  private readonly CONSENT_STORAGE_KEY = 'parental_consent';

  /**
   * Verify user age during onboarding
   */
  async verifyAge(
    userId: string,
    dateOfBirth: string,
    verificationMethod: 'self_declared' | 'document' = 'self_declared'
  ): Promise<AgeCheckResult> {
    try {
      const age = this.calculateAge(dateOfBirth);
      const canUseApp = age >= this.MINIMUM_AGE;
      const requiresParentalConsent = age < 13; // COPPA requirement
      
      // Create verification record
      const verificationData: AgeVerificationData = {
        userId,
        dateOfBirth: this.hashSensitiveData(dateOfBirth), // Hash for privacy
        verificationMethod,
        verificationStatus: canUseApp ? 'verified' : 'rejected',
        verifiedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
      };

      await this.storeVerificationData(verificationData);

      // Log verification attempt for compliance
      await this.logAgeVerification(userId, age, canUseApp, verificationMethod);

      const restrictions = this.getAgeBasedRestrictions(age);

      return {
        isVerified: canUseApp,
        age,
        canUseApp,
        requiresParentalConsent,
        restrictions
      };
    } catch (error) {
      console.error('Age verification failed:', error);
      throw new Error('Age verification could not be completed');
    }
  }

  /**
   * Handle cases where user is under 13 (COPPA compliance)
   */
  async handleUnderageUser(userId: string, age: number): Promise<{
    action: 'block' | 'request_consent' | 'redirect';
    message: string;
    parentalConsentRequired: boolean;
  }> {
    if (age < 13) {
      // COPPA - users under 13 cannot use dating services
      await this.blockUser(userId, 'under_13_coppa');
      
      return {
        action: 'block',
        message: 'Users under 13 cannot create accounts on dating platforms. This is required by COPPA law.',
        parentalConsentRequired: false // Even with consent, dating apps are 18+
      };
    } else if (age < 18) {
      // Under 18 but over 13 - still blocked for dating app
      await this.blockUser(userId, 'under_18_dating');
      
      return {
        action: 'block',
        message: 'You must be 18 or older to use dating services. Please return when you reach the minimum age.',
        parentalConsentRequired: false
      };
    }

    return {
      action: 'redirect',
      message: 'Age verification successful',
      parentalConsentRequired: false
    };
  }

  /**
   * Request parental consent (though not applicable for dating apps)
   */
  async requestParentalConsent(
    userId: string,
    childAge: number,
    parentEmail: string,
    parentName: string
  ): Promise<{
    consentToken: string;
    expiresAt: string;
    instructions: string;
  }> {
    // Note: This is implemented for COPPA compliance completeness,
    // but dating apps cannot accept users under 18 even with parental consent
    
    if (childAge >= 13) {
      throw new Error('Parental consent not required for users 13 and older');
    }

    const consentToken = this.generateConsentToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    const consentRecord: ParentalConsentRecord = {
      parentName,
      parentEmail,
      consentGiven: false,
      consentDate: new Date().toISOString(),
      verificationToken: consentToken,
      ipAddress: 'masked_for_privacy'
    };

    await this.storeParentalConsent(userId, consentRecord);

    // Note: In a real implementation, you would send an email to the parent
    // However, for dating apps, this would still result in account rejection

    return {
      consentToken,
      expiresAt,
      instructions: 'IMPORTANT: Even with parental consent, users must be 18+ to use dating services. This consent system is for COPPA compliance only.'
    };
  }

  /**
   * Verify parental consent response
   */
  async verifyParentalConsent(
    consentToken: string,
    parentConfirmation: boolean
  ): Promise<{
    valid: boolean;
    userId: string;
    finalDecision: 'approved' | 'rejected';
    message: string;
  }> {
    try {
      const consentRecord = await this.getParentalConsentByToken(consentToken);
      
      if (!consentRecord) {
        return {
          valid: false,
          userId: '',
          finalDecision: 'rejected',
          message: 'Invalid consent token'
        };
      }

      // Update consent record
      consentRecord.consentGiven = parentConfirmation;
      await this.updateParentalConsent(consentToken, consentRecord);

      // Even with parental consent, dating apps require 18+
      return {
        valid: true,
        userId: consentRecord.userId || '',
        finalDecision: 'rejected',
        message: 'Parental consent received, but users must be 18+ for dating services. Account cannot be activated.'
      };
    } catch (error) {
      console.error('Parental consent verification failed:', error);
      return {
        valid: false,
        userId: '',
        finalDecision: 'rejected',
        message: 'Consent verification failed'
      };
    }
  }

  /**
   * Get age verification status for existing user
   */
  async getVerificationStatus(userId: string): Promise<AgeVerificationData | null> {
    try {
      const key = `${this.STORAGE_KEY}_${userId}`;
      const encrypted = await AsyncStorage.getItem(key);
      
      if (!encrypted) {
        return null;
      }

      const decrypted = this.decryptData(encrypted);
      const verificationData: AgeVerificationData = JSON.parse(decrypted);

      // Check if verification has expired
      if (verificationData.expiresAt && new Date(verificationData.expiresAt) < new Date()) {
        verificationData.verificationStatus = 'expired';
        await this.storeVerificationData(verificationData);
      }

      return verificationData;
    } catch (error) {
      console.error('Failed to get verification status:', error);
      return null;
    }
  }

  /**
   * Re-verify age (annual requirement for dating apps)
   */
  async reverifyAge(userId: string): Promise<{
    required: boolean;
    reason: string;
    dueDate?: string;
  }> {
    const verification = await this.getVerificationStatus(userId);
    
    if (!verification) {
      return {
        required: true,
        reason: 'No age verification record found'
      };
    }

    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const verifiedAt = new Date(verification.verifiedAt || 0);

    if (verifiedAt < oneYearAgo) {
      return {
        required: true,
        reason: 'Age verification expired (annual renewal required)',
        dueDate: new Date(verifiedAt.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()
      };
    }

    return {
      required: false,
      reason: 'Age verification is current'
    };
  }

  /**
   * Generate age compliance report
   */
  async generateComplianceReport(): Promise<{
    totalUsers: number;
    verifiedUsers: number;
    blockedUsers: number;
    expiredVerifications: number;
    copaViolations: number;
    complianceRate: number;
  }> {
    // Mock implementation - in production, query actual database
    return {
      totalUsers: 1000,
      verifiedUsers: 950,
      blockedUsers: 50,
      expiredVerifications: 25,
      copaViolations: 0, // Should always be 0 for proper dating app
      complianceRate: 95.0
    };
  }

  /**
   * COPPA compliance check
   */
  async checkCoppaCompliance(): Promise<{
    compliant: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for any users under 13 in the system
    const under13Users = await this.getUsersUnder13();
    
    if (under13Users.length > 0) {
      issues.push(`Found ${under13Users.length} users under 13 in system`);
      recommendations.push('Immediately terminate accounts of users under 13');
    }

    // Check verification completeness
    const unverifiedUsers = await this.getUnverifiedUsers();
    
    if (unverifiedUsers.length > 0) {
      issues.push(`${unverifiedUsers.length} users without age verification`);
      recommendations.push('Require age verification for all active users');
    }

    return {
      compliant: issues.length === 0,
      issues,
      recommendations
    };
  }

  // Private helper methods

  private calculateAge(dateOfBirth: string): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  private getAgeBasedRestrictions(age: number): string[] {
    const restrictions: string[] = [];

    if (age < 13) {
      restrictions.push('Account creation blocked (COPPA)');
      restrictions.push('Cannot access any dating features');
    } else if (age < 18) {
      restrictions.push('Account creation blocked (Dating app minimum age)');
      restrictions.push('Cannot access dating services');
    } else if (age < 21) {
      restrictions.push('Enhanced age verification may be required');
      restrictions.push('Additional photo review may apply');
    }

    return restrictions;
  }

  private hashSensitiveData(data: string): string {
    return CryptoJS.SHA256(data + 'dpo_salt_2024').toString();
  }

  private encryptData(data: string): string {
    return CryptoJS.AES.encrypt(data, 'dpo_age_verification_key').toString();
  }

  private decryptData(encryptedData: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedData, 'dpo_age_verification_key');
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  private generateConsentToken(): string {
    return 'consent_' + CryptoJS.lib.WordArray.random(16).toString();
  }

  private async storeVerificationData(data: AgeVerificationData): Promise<void> {
    const key = `${this.STORAGE_KEY}_${data.userId}`;
    const encrypted = this.encryptData(JSON.stringify(data));
    await AsyncStorage.setItem(key, encrypted);
  }

  private async storeParentalConsent(userId: string, consent: ParentalConsentRecord): Promise<void> {
    const key = `${this.CONSENT_STORAGE_KEY}_${userId}`;
    const consentWithUserId = { ...consent, userId };
    const encrypted = this.encryptData(JSON.stringify(consentWithUserId));
    await AsyncStorage.setItem(key, encrypted);
  }

  private async getParentalConsentByToken(token: string): Promise<(ParentalConsentRecord & { userId?: string }) | null> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const consentKeys = keys.filter(key => key.startsWith(this.CONSENT_STORAGE_KEY));
      
      for (const key of consentKeys) {
        const encrypted = await AsyncStorage.getItem(key);
        if (encrypted) {
          const decrypted = this.decryptData(encrypted);
          const consent = JSON.parse(decrypted);
          if (consent.verificationToken === token) {
            return consent;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get parental consent by token:', error);
      return null;
    }
  }

  private async updateParentalConsent(token: string, consent: ParentalConsentRecord): Promise<void> {
    const existingConsent = await this.getParentalConsentByToken(token);
    if (existingConsent && existingConsent.userId) {
      await this.storeParentalConsent(existingConsent.userId, consent);
    }
  }

  private async blockUser(userId: string, reason: string): Promise<void> {
    const blockRecord = {
      userId,
      reason,
      blockedAt: new Date().toISOString(),
      permanent: true
    };
    
    const key = `blocked_user_${userId}`;
    const encrypted = this.encryptData(JSON.stringify(blockRecord));
    await AsyncStorage.setItem(key, encrypted);
    
    console.log('User blocked:', { userId: userId.substring(0, 8) + '...', reason });
  }

  private async logAgeVerification(
    userId: string,
    age: number,
    approved: boolean,
    method: string
  ): Promise<void> {
    const logEntry = {
      userId: userId.substring(0, 8) + '...',
      age,
      approved,
      method,
      timestamp: new Date().toISOString()
    };
    
    console.log('Age verification logged:', logEntry);
  }

  private async getUsersUnder13(): Promise<string[]> {
    // Mock implementation - in production, query database
    return []; // Should always be empty for dating apps
  }

  private async getUnverifiedUsers(): Promise<string[]> {
    // Mock implementation - in production, query database
    return [];
  }
}

// Export singleton instance
export const ageVerificationService = new AgeVerificationService();

// Export class for custom configurations
export { AgeVerificationService };