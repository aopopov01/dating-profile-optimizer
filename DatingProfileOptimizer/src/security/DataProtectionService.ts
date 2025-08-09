/**
 * Data Protection Service for Dating Profile Optimizer
 * Handles GDPR/CCPA compliance, PII protection, data retention, and user privacy rights
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { securityLogger } from './SecurityLogger';
import { cryptoService } from './CryptoService';
import { secureStorage } from './SecureStorage';
import { SECURITY_CONFIG, PII_DATA_FIELDS, SENSITIVE_DATA_FIELDS } from './SecurityConfig';

export interface ConsentRecord {
  userId: string;
  consentType: 'data_processing' | 'marketing' | 'analytics' | 'cookies' | 'photos';
  granted: boolean;
  timestamp: string;
  version: string;
  ipAddress?: string;
  userAgent?: string;
  withdrawnAt?: string;
}

export interface DataSubject {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
  lastActive: string;
  dataRetentionPeriod: number; // days
  consentRecords: ConsentRecord[];
}

export interface PIIField {
  name: string;
  value: any;
  category: 'personal' | 'sensitive' | 'special';
  encrypted: boolean;
  purpose: string[];
  retention: number; // days
  consent: boolean;
}

export interface DataRequest {
  id: string;
  userId: string;
  type: 'access' | 'export' | 'delete' | 'rectification' | 'portability';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: string;
  completedAt?: string;
  details?: any;
  requesterInfo: {
    email: string;
    ipAddress?: string;
    verification: boolean;
  };
}

export interface DataRetentionPolicy {
  dataType: string;
  retentionPeriod: number; // days
  autoDelete: boolean;
  archiveBeforeDelete: boolean;
  legalBasis: string;
  exceptions: string[];
}

export interface PrivacySettings {
  userId: string;
  dataMinimization: boolean;
  anonymousAnalytics: boolean;
  thirdPartySharing: boolean;
  marketingCommunications: boolean;
  profileVisibility: 'public' | 'private' | 'limited';
  photoSharing: boolean;
  locationTracking: boolean;
  lastUpdated: string;
}

export class DataProtectionService {
  private static instance: DataProtectionService;
  private retentionPolicies: Map<string, DataRetentionPolicy> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeRetentionPolicies();
  }

  public static getInstance(): DataProtectionService {
    if (!DataProtectionService.instance) {
      DataProtectionService.instance = new DataProtectionService();
    }
    return DataProtectionService.instance;
  }

  /**
   * Initialize data protection service
   */
  async initialize(): Promise<void> {
    try {
      if (SECURITY_CONFIG.compliance.gdprEnabled || SECURITY_CONFIG.compliance.ccpaEnabled) {
        // Start automatic data cleanup
        this.startAutomaticCleanup();
        
        // Perform initial compliance check
        await this.performComplianceAudit();
      }

      securityLogger.info('data_protection_initialized', {
        gdprEnabled: SECURITY_CONFIG.compliance.gdprEnabled,
        ccpaEnabled: SECURITY_CONFIG.compliance.ccpaEnabled,
        dataMinimization: SECURITY_CONFIG.compliance.dataMinimizationEnabled,
      });
    } catch (error) {
      securityLogger.error('Data protection initialization failed', { error });
      throw new Error('Failed to initialize data protection service');
    }
  }

  /**
   * Record user consent
   */
  async recordConsent(
    userId: string,
    consentType: ConsentRecord['consentType'],
    granted: boolean,
    version: string = '1.0',
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    try {
      const consentRecord: ConsentRecord = {
        userId,
        consentType,
        granted,
        timestamp: new Date().toISOString(),
        version,
        ...metadata,
      };

      // Store consent record
      const existingConsents = await this.getConsentRecords(userId);
      const updatedConsents = [...existingConsents, consentRecord];
      
      await secureStorage.setItem(
        `consent_${userId}`,
        updatedConsents,
        { encryptData: true, useKeychain: true }
      );

      securityLogger.logDataAccess('consent_recorded', 'consent', userId, {
        consentType,
        granted,
        version,
      });

      // Update privacy settings based on consent
      await this.updatePrivacySettingsFromConsent(userId, consentType, granted);
    } catch (error) {
      securityLogger.error('Failed to record consent', { userId, consentType, error });
      throw new Error('Failed to record user consent');
    }
  }

  /**
   * Get user consent status
   */
  async getConsentStatus(
    userId: string,
    consentType?: ConsentRecord['consentType']
  ): Promise<ConsentRecord[]> {
    try {
      const consents = await this.getConsentRecords(userId);
      
      if (consentType) {
        return consents.filter(c => c.consentType === consentType);
      }
      
      return consents;
    } catch (error) {
      securityLogger.error('Failed to get consent status', { userId, consentType, error });
      return [];
    }
  }

  /**
   * Check if user has granted specific consent
   */
  async hasConsent(
    userId: string,
    consentType: ConsentRecord['consentType']
  ): Promise<boolean> {
    try {
      const consents = await this.getConsentRecords(userId);
      const latestConsent = consents
        .filter(c => c.consentType === consentType)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

      return latestConsent ? latestConsent.granted : false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Withdraw consent
   */
  async withdrawConsent(
    userId: string,
    consentType: ConsentRecord['consentType']
  ): Promise<void> {
    try {
      await this.recordConsent(userId, consentType, false, '1.0');
      
      securityLogger.info('consent_withdrawn', {
        userId,
        consentType,
        timestamp: new Date().toISOString(),
      });

      // Handle data deletion based on consent withdrawal
      await this.handleConsentWithdrawal(userId, consentType);
    } catch (error) {
      securityLogger.error('Failed to withdraw consent', { userId, consentType, error });
      throw new Error('Failed to withdraw consent');
    }
  }

  /**
   * Process data subject request (GDPR Article 15-22)
   */
  async processDataSubjectRequest(request: Omit<DataRequest, 'id' | 'status' | 'requestedAt'>): Promise<string> {
    try {
      const requestId = cryptoService.generateUUID();
      
      const dataRequest: DataRequest = {
        id: requestId,
        status: 'pending',
        requestedAt: new Date().toISOString(),
        ...request,
      };

      // Store request
      await secureStorage.setItem(
        `data_request_${requestId}`,
        dataRequest,
        { encryptData: true }
      );

      // Verify user identity
      if (!dataRequest.requesterInfo.verification) {
        await this.requestIdentityVerification(requestId);
      } else {
        await this.processVerifiedRequest(dataRequest);
      }

      securityLogger.info('data_subject_request_created', {
        requestId,
        userId: request.userId,
        type: request.type,
      });

      return requestId;
    } catch (error) {
      securityLogger.error('Failed to process data subject request', { request, error });
      throw new Error('Failed to process data request');
    }
  }

  /**
   * Export user data (GDPR Article 20 - Right to Data Portability)
   */
  async exportUserData(userId: string): Promise<{
    personalData: any;
    activityData: any;
    consentRecords: ConsentRecord[];
    exportDate: string;
  }> {
    try {
      // Collect all user data
      const personalData = await this.collectPersonalData(userId);
      const activityData = await this.collectActivityData(userId);
      const consentRecords = await this.getConsentRecords(userId);

      const exportData = {
        personalData: this.sanitizeExportData(personalData),
        activityData: this.sanitizeExportData(activityData),
        consentRecords,
        exportDate: new Date().toISOString(),
      };

      securityLogger.logDataAccess('export', 'all', userId, {
        recordCount: Object.keys(exportData.personalData).length,
      });

      return exportData;
    } catch (error) {
      securityLogger.error('Failed to export user data', { userId, error });
      throw new Error('Failed to export user data');
    }
  }

  /**
   * Delete user data (GDPR Article 17 - Right to Erasure)
   */
  async deleteUserData(
    userId: string,
    dataTypes?: string[],
    retainForLegal: boolean = true
  ): Promise<{
    deleted: string[];
    retained: string[];
    reason?: string;
  }> {
    try {
      const allDataTypes = await this.getUserDataTypes(userId);
      const typesToDelete = dataTypes || allDataTypes;
      
      const deleted: string[] = [];
      const retained: string[] = [];

      for (const dataType of typesToDelete) {
        const policy = this.retentionPolicies.get(dataType);
        
        if (retainForLegal && policy?.exceptions.includes('legal_obligation')) {
          retained.push(dataType);
          continue;
        }

        try {
          await this.deleteDataType(userId, dataType);
          deleted.push(dataType);
        } catch (error) {
          securityLogger.error(`Failed to delete ${dataType}`, { userId, error });
          retained.push(dataType);
        }
      }

      // Anonymize data that cannot be deleted
      if (retained.length > 0) {
        await this.anonymizeUserData(userId, retained);
      }

      securityLogger.info('user_data_deleted', {
        userId,
        deleted,
        retained,
        totalRequested: typesToDelete.length,
      });

      return {
        deleted,
        retained,
        reason: retained.length > 0 ? 'Some data retained for legal compliance' : undefined,
      };
    } catch (error) {
      securityLogger.error('Failed to delete user data', { userId, error });
      throw new Error('Failed to delete user data');
    }
  }

  /**
   * Anonymize user data
   */
  async anonymizeUserData(userId: string, dataTypes: string[]): Promise<void> {
    try {
      for (const dataType of dataTypes) {
        const data = await this.getUserDataByType(userId, dataType);
        
        if (data) {
          const anonymized = this.anonymizeData(data);
          await this.storeAnonymizedData(anonymized, dataType);
          await this.deleteUserDataByType(userId, dataType);
        }
      }

      securityLogger.info('user_data_anonymized', { userId, dataTypes });
    } catch (error) {
      securityLogger.error('Failed to anonymize user data', { userId, error });
      throw new Error('Failed to anonymize user data');
    }
  }

  /**
   * Get user privacy settings
   */
  async getPrivacySettings(userId: string): Promise<PrivacySettings> {
    try {
      const settings = await secureStorage.getItem(`privacy_${userId}`);
      
      if (!settings) {
        // Return default privacy settings
        return this.getDefaultPrivacySettings(userId);
      }

      return settings;
    } catch (error) {
      return this.getDefaultPrivacySettings(userId);
    }
  }

  /**
   * Update user privacy settings
   */
  async updatePrivacySettings(
    userId: string,
    settings: Partial<PrivacySettings>
  ): Promise<void> {
    try {
      const currentSettings = await this.getPrivacySettings(userId);
      const updatedSettings: PrivacySettings = {
        ...currentSettings,
        ...settings,
        lastUpdated: new Date().toISOString(),
      };

      await secureStorage.setItem(
        `privacy_${userId}`,
        updatedSettings,
        { encryptData: true }
      );

      securityLogger.info('privacy_settings_updated', {
        userId,
        changes: Object.keys(settings),
      });
    } catch (error) {
      securityLogger.error('Failed to update privacy settings', { userId, error });
      throw new Error('Failed to update privacy settings');
    }
  }

  /**
   * Check data retention compliance
   */
  async checkRetentionCompliance(): Promise<{
    compliant: boolean;
    issues: Array<{
      userId: string;
      dataType: string;
      issue: string;
      severity: 'low' | 'medium' | 'high';
    }>;
    recommendations: string[];
  }> {
    try {
      const issues = [];
      const users = await this.getAllDataSubjects();

      for (const user of users) {
        const userDataTypes = await this.getUserDataTypes(user.userId);
        
        for (const dataType of userDataTypes) {
          const policy = this.retentionPolicies.get(dataType);
          if (!policy) continue;

          const dataAge = await this.getDataAge(user.userId, dataType);
          
          if (dataAge > policy.retentionPeriod) {
            issues.push({
              userId: user.userId,
              dataType,
              issue: `Data retained beyond policy limit (${dataAge} > ${policy.retentionPeriod} days)`,
              severity: 'high',
            });
          }
        }
      }

      const recommendations = this.generateComplianceRecommendations(issues);

      return {
        compliant: issues.length === 0,
        issues,
        recommendations,
      };
    } catch (error) {
      securityLogger.error('Retention compliance check failed', { error });
      throw new Error('Failed to check retention compliance');
    }
  }

  /**
   * Generate privacy notice
   */
  generatePrivacyNotice(): {
    dataCollected: string[];
    purposes: string[];
    retention: string[];
    rights: string[];
    contact: string;
  } {
    return {
      dataCollected: [
        'Profile information (name, age, photos)',
        'Usage data (app interactions, preferences)',
        'Device information (device type, OS version)',
        'Location data (if enabled)',
        'Payment information (processed by secure third parties)',
      ],
      purposes: [
        'Provide dating profile optimization services',
        'Generate personalized recommendations',
        'Improve app functionality and user experience',
        'Ensure security and prevent fraud',
        'Comply with legal obligations',
      ],
      retention: [
        'Profile data: Retained while account is active + 90 days',
        'Usage data: Retained for 12 months for analytics',
        'Payment data: Retained as required by law (typically 7 years)',
        'Photos: Deleted immediately upon request or account deletion',
      ],
      rights: [
        'Access your data',
        'Correct inaccurate data',
        'Delete your data',
        'Object to processing',
        'Data portability',
        'Withdraw consent',
      ],
      contact: 'privacy@datingprofileoptimizer.com',
    };
  }

  // Private methods

  private initializeRetentionPolicies(): void {
    const policies: DataRetentionPolicy[] = [
      {
        dataType: 'profile',
        retentionPeriod: SECURITY_CONFIG.storage.dataRetentionDays,
        autoDelete: true,
        archiveBeforeDelete: true,
        legalBasis: 'Contract',
        exceptions: ['active_subscription'],
      },
      {
        dataType: 'photos',
        retentionPeriod: 90,
        autoDelete: true,
        archiveBeforeDelete: false,
        legalBasis: 'Consent',
        exceptions: [],
      },
      {
        dataType: 'analytics',
        retentionPeriod: 365,
        autoDelete: true,
        archiveBeforeDelete: true,
        legalBasis: 'Legitimate Interest',
        exceptions: [],
      },
      {
        dataType: 'payment',
        retentionPeriod: 2557, // 7 years
        autoDelete: false,
        archiveBeforeDelete: true,
        legalBasis: 'Legal Obligation',
        exceptions: ['legal_obligation'],
      },
      {
        dataType: 'security_logs',
        retentionPeriod: SECURITY_CONFIG.monitoring.logRetentionDays,
        autoDelete: true,
        archiveBeforeDelete: true,
        legalBasis: 'Legitimate Interest',
        exceptions: ['security_incident'],
      },
    ];

    for (const policy of policies) {
      this.retentionPolicies.set(policy.dataType, policy);
    }
  }

  private async getConsentRecords(userId: string): Promise<ConsentRecord[]> {
    try {
      const records = await secureStorage.getItem(`consent_${userId}`);
      return records || [];
    } catch (error) {
      return [];
    }
  }

  private getDefaultPrivacySettings(userId: string): PrivacySettings {
    return {
      userId,
      dataMinimization: SECURITY_CONFIG.compliance.dataMinimizationEnabled,
      anonymousAnalytics: true,
      thirdPartySharing: false,
      marketingCommunications: false,
      profileVisibility: 'private',
      photoSharing: false,
      locationTracking: false,
      lastUpdated: new Date().toISOString(),
    };
  }

  private async updatePrivacySettingsFromConsent(
    userId: string,
    consentType: ConsentRecord['consentType'],
    granted: boolean
  ): Promise<void> {
    const settings = await this.getPrivacySettings(userId);
    const updates: Partial<PrivacySettings> = {};

    switch (consentType) {
      case 'analytics':
        updates.anonymousAnalytics = granted;
        break;
      case 'marketing':
        updates.marketingCommunications = granted;
        break;
      case 'photos':
        updates.photoSharing = granted;
        break;
    }

    if (Object.keys(updates).length > 0) {
      await this.updatePrivacySettings(userId, updates);
    }
  }

  private async handleConsentWithdrawal(
    userId: string,
    consentType: ConsentRecord['consentType']
  ): Promise<void> {
    switch (consentType) {
      case 'photos':
        await this.deleteUserDataByType(userId, 'photos');
        break;
      case 'analytics':
        await this.anonymizeUserData(userId, ['analytics']);
        break;
      case 'marketing':
        await this.deleteUserDataByType(userId, 'marketing_data');
        break;
    }
  }

  private async requestIdentityVerification(requestId: string): Promise<void> {
    // In production, send email verification
    securityLogger.info('identity_verification_requested', { requestId });
  }

  private async processVerifiedRequest(request: DataRequest): Promise<void> {
    request.status = 'processing';
    await secureStorage.setItem(`data_request_${request.id}`, request);

    try {
      switch (request.type) {
        case 'access':
        case 'export':
          await this.handleDataExportRequest(request);
          break;
        case 'delete':
          await this.handleDataDeletionRequest(request);
          break;
        case 'rectification':
          await this.handleDataRectificationRequest(request);
          break;
        default:
          throw new Error(`Unsupported request type: ${request.type}`);
      }

      request.status = 'completed';
      request.completedAt = new Date().toISOString();
    } catch (error) {
      request.status = 'rejected';
      securityLogger.error('Data request processing failed', { request, error });
    }

    await secureStorage.setItem(`data_request_${request.id}`, request);
  }

  private async handleDataExportRequest(request: DataRequest): Promise<void> {
    const exportData = await this.exportUserData(request.userId);
    // In production, send secure download link via email
    securityLogger.info('data_export_completed', {
      requestId: request.id,
      userId: request.userId,
    });
  }

  private async handleDataDeletionRequest(request: DataRequest): Promise<void> {
    await this.deleteUserData(request.userId);
    securityLogger.info('data_deletion_completed', {
      requestId: request.id,
      userId: request.userId,
    });
  }

  private async handleDataRectificationRequest(request: DataRequest): Promise<void> {
    // Handle data correction request
    securityLogger.info('data_rectification_completed', {
      requestId: request.id,
      userId: request.userId,
    });
  }

  private async collectPersonalData(userId: string): Promise<any> {
    const data: any = {};
    const dataTypes = await this.getUserDataTypes(userId);

    for (const dataType of dataTypes) {
      if (PII_DATA_FIELDS.some(field => dataType.includes(field))) {
        data[dataType] = await this.getUserDataByType(userId, dataType);
      }
    }

    return data;
  }

  private async collectActivityData(userId: string): Promise<any> {
    // Collect non-PII activity data
    return {
      loginHistory: await this.getUserDataByType(userId, 'login_history'),
      usageStats: await this.getUserDataByType(userId, 'usage_stats'),
      preferences: await this.getUserDataByType(userId, 'preferences'),
    };
  }

  private sanitizeExportData(data: any): any {
    // Remove internal system fields from export
    const sanitized = { ...data };
    
    const internalFields = ['passwordHash', 'salt', 'internalId', 'systemFlags'];
    
    for (const field of internalFields) {
      delete sanitized[field];
    }

    return sanitized;
  }

  private async getUserDataTypes(userId: string): Promise<string[]> {
    // Mock implementation - get all data types for user
    return ['profile', 'photos', 'analytics', 'preferences', 'login_history'];
  }

  private async getUserDataByType(userId: string, dataType: string): Promise<any> {
    return await secureStorage.getItem(`${dataType}_${userId}`);
  }

  private async deleteDataType(userId: string, dataType: string): Promise<void> {
    await secureStorage.removeItem(`${dataType}_${userId}`);
  }

  private async deleteUserDataByType(userId: string, dataType: string): Promise<void> {
    await this.deleteDataType(userId, dataType);
  }

  private anonymizeData(data: any): any {
    const anonymized = { ...data };
    
    // Remove direct identifiers
    delete anonymized.email;
    delete anonymized.firstName;
    delete anonymized.lastName;
    delete anonymized.phone;
    
    // Hash indirect identifiers
    if (anonymized.userId) {
      anonymized.userId = cryptoService.hash(anonymized.userId);
    }

    return anonymized;
  }

  private async storeAnonymizedData(data: any, dataType: string): Promise<void> {
    const anonymizedKey = `anonymous_${dataType}_${Date.now()}`;
    await secureStorage.setItem(anonymizedKey, data);
  }

  private async getAllDataSubjects(): Promise<DataSubject[]> {
    // Mock implementation - get all users from database
    return [];
  }

  private async getDataAge(userId: string, dataType: string): Promise<number> {
    const data = await this.getUserDataByType(userId, dataType);
    if (!data || !data.createdAt) return 0;
    
    const createdAt = new Date(data.createdAt);
    const now = new Date();
    
    return Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  }

  private generateComplianceRecommendations(issues: any[]): string[] {
    const recommendations: string[] = [];
    
    if (issues.length > 0) {
      recommendations.push('Implement automated data deletion for expired data');
      recommendations.push('Review and update data retention policies');
      recommendations.push('Set up regular compliance monitoring');
    }

    return recommendations;
  }

  private async performComplianceAudit(): Promise<void> {
    const compliance = await this.checkRetentionCompliance();
    
    if (!compliance.compliant) {
      securityLogger.warn('compliance_issues_detected', {
        issueCount: compliance.issues.length,
        issues: compliance.issues,
      });
    }
  }

  private startAutomaticCleanup(): void {
    // Run cleanup daily
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.performAutomaticDataCleanup();
      } catch (error) {
        securityLogger.error('Automatic data cleanup failed', { error });
      }
    }, 24 * 60 * 60 * 1000);
  }

  private async performAutomaticDataCleanup(): Promise<void> {
    const users = await this.getAllDataSubjects();
    let deletedCount = 0;

    for (const user of users) {
      const userDataTypes = await this.getUserDataTypes(user.userId);
      
      for (const dataType of userDataTypes) {
        const policy = this.retentionPolicies.get(dataType);
        if (!policy || !policy.autoDelete) continue;

        const dataAge = await this.getDataAge(user.userId, dataType);
        
        if (dataAge > policy.retentionPeriod) {
          if (policy.archiveBeforeDelete) {
            await this.archiveUserData(user.userId, dataType);
          }
          
          await this.deleteUserDataByType(user.userId, dataType);
          deletedCount++;
        }
      }
    }

    if (deletedCount > 0) {
      securityLogger.info('automatic_cleanup_completed', {
        deletedRecords: deletedCount,
      });
    }
  }

  private async archiveUserData(userId: string, dataType: string): Promise<void> {
    // Archive data before deletion for compliance
    const data = await this.getUserDataByType(userId, dataType);
    if (data) {
      const archiveKey = `archive_${dataType}_${userId}_${Date.now()}`;
      await secureStorage.setItem(archiveKey, data, { encryptData: true });
    }
  }
}

// Export singleton instance
export const dataProtectionService = DataProtectionService.getInstance();