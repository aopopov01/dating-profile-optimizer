const crypto = require('crypto');
const db = require('../config/database');
const logger = require('../config/logger');

class DataProtectionService {
  constructor() {
    this.masterKey = this.deriveMasterKey();
    this.encryptionAlgorithm = 'aes-256-gcm';
    this.keyDerivationRounds = 100000;
    this.dataRetentionPeriods = {
      'user_data': 730, // 2 years
      'security_logs': 365, // 1 year
      'analytics_data': 90, // 3 months
      'session_data': 30, // 1 month
      'temp_data': 7 // 1 week
    };
  }

  /**
   * Initialize encryption keys for user
   */
  async initializeUserEncryption(userId) {
    try {
      // Generate user-specific encryption key
      const userKey = crypto.randomBytes(32);
      const encryptedUserKey = this.encryptWithMasterKey(userKey);

      // Store encrypted key
      await db('encryption_keys')
        .insert({
          user_id: userId,
          key_type: 'data_encryption',
          encrypted_key: encryptedUserKey,
          key_version: '1',
          is_active: true
        })
        .onConflict(['user_id', 'key_type'])
        .ignore();

      logger.info('User encryption initialized', { userId });
      return true;

    } catch (error) {
      logger.error('Error initializing user encryption', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Encrypt sensitive user data
   */
  async encryptUserData(userId, data, dataType = 'personal') {
    try {
      const userKey = await this.getUserEncryptionKey(userId);
      if (!userKey) {
        await this.initializeUserEncryption(userId);
        return await this.encryptUserData(userId, data, dataType);
      }

      const encrypted = this.encryptData(JSON.stringify(data), userKey);
      
      return {
        encrypted: encrypted.encryptedData,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        dataType,
        keyVersion: '1'
      };

    } catch (error) {
      logger.error('Error encrypting user data', {
        userId,
        dataType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Decrypt sensitive user data
   */
  async decryptUserData(userId, encryptedData, iv, authTag, keyVersion = '1') {
    try {
      const userKey = await this.getUserEncryptionKey(userId, keyVersion);
      if (!userKey) {
        throw new Error('User encryption key not found');
      }

      const decryptedData = this.decryptData(encryptedData, userKey, iv, authTag);
      return JSON.parse(decryptedData);

    } catch (error) {
      logger.error('Error decrypting user data', {
        userId,
        keyVersion,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Encrypt data in transit (additional layer)
   */
  encryptForTransmission(data) {
    try {
      const transmissionKey = crypto.randomBytes(32);
      const encrypted = this.encryptData(JSON.stringify(data), transmissionKey);
      
      // Encrypt the transmission key with master key
      const encryptedKey = this.encryptWithMasterKey(transmissionKey);

      return {
        data: encrypted.encryptedData,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        key: encryptedKey
      };

    } catch (error) {
      logger.error('Error encrypting for transmission', { error: error.message });
      throw error;
    }
  }

  /**
   * Decrypt data from transmission
   */
  decryptFromTransmission(encryptedPackage) {
    try {
      // Decrypt the transmission key
      const transmissionKey = this.decryptWithMasterKey(encryptedPackage.key);
      
      // Decrypt the data
      const decryptedData = this.decryptData(
        encryptedPackage.data,
        transmissionKey,
        encryptedPackage.iv,
        encryptedPackage.authTag
      );

      return JSON.parse(decryptedData);

    } catch (error) {
      logger.error('Error decrypting from transmission', { error: error.message });
      throw error;
    }
  }

  /**
   * Anonymize user data for analytics
   */
  async anonymizeUserData(userData) {
    try {
      const anonymizedData = {
        // Replace identifiable fields with hashed versions
        userHash: this.hashForAnonymization(userData.id),
        ageRange: this.getAgeRange(userData.age),
        locationRegion: this.getRegionFromLocation(userData.location),
        accountAge: this.getAccountAgeCategory(userData.createdAt),
        subscriptionType: userData.subscriptionType,
        // Remove or hash other PII
        timestamp: new Date()
      };

      return anonymizedData;

    } catch (error) {
      logger.error('Error anonymizing user data', { error: error.message });
      throw error;
    }
  }

  /**
   * Pseudonymize data (reversible anonymization)
   */
  async pseudonymizeUserData(userId, userData) {
    try {
      const pseudonymizationKey = await this.getPseudonymizationKey(userId);
      const pseudonym = this.generatePseudonym(userId, pseudonymizationKey);

      const pseudonymizedData = {
        ...userData,
        id: pseudonym,
        email: this.pseudonymizeEmail(userData.email, pseudonymizationKey),
        phone: this.pseudonymizePhone(userData.phone, pseudonymizationKey),
        // Keep non-identifying data as-is
        timestamp: new Date()
      };

      return pseudonymizedData;

    } catch (error) {
      logger.error('Error pseudonymizing user data', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Secure data deletion (crypto-shredding)
   */
  async secureDeleteUserData(userId) {
    try {
      // Step 1: Delete/invalidate encryption keys (crypto-shredding)
      await db('encryption_keys')
        .where({ user_id: userId })
        .update({
          is_active: false,
          encrypted_key: null,
          updated_at: new Date()
        });

      // Step 2: Overwrite sensitive data in database
      await this.overwriteSensitiveFields(userId);

      // Step 3: Log the deletion
      await this.logDataDeletion(userId, 'user_requested');

      logger.info('User data securely deleted', { userId });
      return true;

    } catch (error) {
      logger.error('Error in secure data deletion', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Export user data (GDPR compliance)
   */
  async exportUserData(userId, format = 'json') {
    try {
      // Collect all user data from various tables
      const userData = await this.collectUserData(userId);
      
      // Decrypt encrypted fields
      const decryptedData = await this.decryptUserDataForExport(userId, userData);

      // Format data based on request
      let exportData;
      switch (format.toLowerCase()) {
        case 'json':
          exportData = JSON.stringify(decryptedData, null, 2);
          break;
        case 'csv':
          exportData = this.convertToCSV(decryptedData);
          break;
        default:
          exportData = JSON.stringify(decryptedData, null, 2);
      }

      // Log the export
      await this.logDataExport(userId, format);

      return {
        format,
        data: exportData,
        exportedAt: new Date(),
        userId
      };

    } catch (error) {
      logger.error('Error exporting user data', {
        userId,
        format,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Implement data retention policies
   */
  async enforceDataRetention() {
    try {
      let deletedRecords = 0;

      for (const [dataType, retentionDays] of Object.entries(this.dataRetentionPeriods)) {
        const cutoffDate = new Date(Date.now() - (retentionDays * 24 * 60 * 60 * 1000));
        
        switch (dataType) {
          case 'security_logs':
            deletedRecords += await this.cleanupSecurityLogs(cutoffDate);
            break;
          case 'analytics_data':
            deletedRecords += await this.cleanupAnalyticsData(cutoffDate);
            break;
          case 'session_data':
            deletedRecords += await this.cleanupSessionData(cutoffDate);
            break;
          case 'temp_data':
            deletedRecords += await this.cleanupTempData(cutoffDate);
            break;
        }
      }

      logger.info('Data retention enforcement completed', {
        deletedRecords,
        timestamp: new Date()
      });

      return deletedRecords;

    } catch (error) {
      logger.error('Error enforcing data retention', { error: error.message });
      throw error;
    }
  }

  /**
   * Validate data integrity
   */
  async validateDataIntegrity(userId) {
    try {
      const issues = [];

      // Check encryption key availability
      const encryptionKeys = await db('encryption_keys')
        .where({ user_id: userId, is_active: true });

      if (encryptionKeys.length === 0) {
        issues.push('Missing active encryption keys');
      }

      // Verify encrypted data can be decrypted
      try {
        const testData = { test: 'integrity_check' };
        const encrypted = await this.encryptUserData(userId, testData);
        const decrypted = await this.decryptUserData(
          userId, 
          encrypted.encrypted, 
          encrypted.iv, 
          encrypted.authTag
        );
        
        if (JSON.stringify(testData) !== JSON.stringify(decrypted)) {
          issues.push('Data encryption/decryption integrity failure');
        }
      } catch (error) {
        issues.push(`Encryption test failed: ${error.message}`);
      }

      return {
        isValid: issues.length === 0,
        issues,
        checkedAt: new Date()
      };

    } catch (error) {
      logger.error('Error validating data integrity', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Core encryption/decryption methods
   */
  encryptData(plaintext, key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.encryptionAlgorithm, key, { iv });
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
      authTag: cipher.getAuthTag().toString('hex')
    };
  }

  decryptData(encryptedData, key, iv, authTag) {
    const decipher = crypto.createDecipher(this.encryptionAlgorithm, key, {
      iv: Buffer.from(iv, 'hex')
    });
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  encryptWithMasterKey(data) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.encryptionAlgorithm, this.masterKey, { iv });
    
    let encrypted;
    if (Buffer.isBuffer(data)) {
      encrypted = cipher.update(data);
    } else {
      encrypted = cipher.update(data, 'utf8', 'hex');
    }
    encrypted += cipher.final('hex');
    
    return {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
      authTag: cipher.getAuthTag().toString('hex')
    };
  }

  decryptWithMasterKey(encryptedPackage) {
    const decipher = crypto.createDecipher(this.encryptionAlgorithm, this.masterKey, {
      iv: Buffer.from(encryptedPackage.iv, 'hex')
    });
    
    decipher.setAuthTag(Buffer.from(encryptedPackage.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedPackage.encryptedData, 'hex');
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted;
  }

  /**
   * Helper methods
   */
  deriveMasterKey() {
    const password = process.env.MASTER_ENCRYPTION_PASSWORD || 'default-master-key-change-in-production';
    const salt = process.env.ENCRYPTION_SALT || 'default-salt';
    
    return crypto.pbkdf2Sync(password, salt, this.keyDerivationRounds, 32, 'sha256');
  }

  async getUserEncryptionKey(userId, keyVersion = '1') {
    try {
      const keyRecord = await db('encryption_keys')
        .where({
          user_id: userId,
          key_type: 'data_encryption',
          key_version: keyVersion,
          is_active: true
        })
        .first();

      if (!keyRecord) return null;

      const encryptedKey = JSON.parse(keyRecord.encrypted_key);
      return this.decryptWithMasterKey(encryptedKey);

    } catch (error) {
      logger.error('Error getting user encryption key', {
        userId,
        keyVersion,
        error: error.message
      });
      return null;
    }
  }

  async getPseudonymizationKey(userId) {
    // Use a deterministic key for pseudonymization (allows re-identification)
    const seed = `${userId}-${process.env.PSEUDONYM_SALT || 'default-pseudonym-salt'}`;
    return crypto.createHash('sha256').update(seed).digest();
  }

  hashForAnonymization(data) {
    const salt = process.env.ANONYMIZATION_SALT || 'default-anonymization-salt';
    return crypto.createHash('sha256').update(data + salt).digest('hex').substring(0, 16);
  }

  generatePseudonym(userId, key) {
    return crypto.createHmac('sha256', key).update(userId).digest('hex').substring(0, 16);
  }

  pseudonymizeEmail(email, key) {
    if (!email) return null;
    const [localPart, domain] = email.split('@');
    const pseudonym = crypto.createHmac('sha256', key).update(localPart).digest('hex').substring(0, 8);
    return `${pseudonym}@${domain}`;
  }

  pseudonymizePhone(phone, key) {
    if (!phone) return null;
    return crypto.createHmac('sha256', key).update(phone).digest('hex').substring(0, 12);
  }

  getAgeRange(age) {
    if (age < 18) return 'under-18';
    if (age < 25) return '18-24';
    if (age < 35) return '25-34';
    if (age < 45) return '35-44';
    if (age < 55) return '45-54';
    return '55+';
  }

  getRegionFromLocation(location) {
    // Extract region from location data while preserving privacy
    if (!location) return 'unknown';
    // Return only country or state-level information
    return location.country || 'unknown';
  }

  getAccountAgeCategory(createdAt) {
    const ageMs = Date.now() - new Date(createdAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    
    if (ageDays < 7) return 'new';
    if (ageDays < 30) return 'recent';
    if (ageDays < 90) return 'established';
    return 'veteran';
  }

  async overwriteSensitiveFields(userId) {
    // Overwrite sensitive data with random data before deletion
    const randomData = crypto.randomBytes(32).toString('hex');
    
    await db('users')
      .where({ id: userId })
      .update({
        email: `deleted_${randomData}@deleted.com`,
        phone_number: null,
        first_name: 'DELETED',
        last_name: 'DELETED'
      });
  }

  async collectUserData(userId) {
    // Collect all user data from various tables
    const [
      user,
      photoAnalyses,
      generatedBios,
      purchases,
      analyticsEvents,
      securityEvents
    ] = await Promise.all([
      db('users').where({ id: userId }).first(),
      db('photo_analyses').where({ user_id: userId }),
      db('generated_bios').where({ user_id: userId }),
      db('purchases').where({ user_id: userId }),
      db('analytics_events').where({ user_id: userId }),
      db('security_events').where({ user_id: userId })
    ]);

    return {
      personalInfo: user,
      photoAnalyses,
      generatedBios,
      purchases,
      analyticsEvents,
      securityEvents
    };
  }

  async decryptUserDataForExport(userId, userData) {
    // Decrypt any encrypted fields in the collected data
    const decrypted = { ...userData };
    
    // Add decryption logic for specific encrypted fields
    // This would depend on which fields are encrypted in your schema
    
    return decrypted;
  }

  convertToCSV(data) {
    // Convert complex data structure to CSV format
    // This is a simplified implementation
    const flattenedData = this.flattenObject(data);
    const headers = Object.keys(flattenedData);
    const values = Object.values(flattenedData);
    
    return headers.join(',') + '\n' + values.join(',');
  }

  flattenObject(obj, prefix = '') {
    let flattened = {};
    
    for (let key in obj) {
      if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        Object.assign(flattened, this.flattenObject(obj[key], prefix + key + '_'));
      } else {
        flattened[prefix + key] = obj[key];
      }
    }
    
    return flattened;
  }

  async logDataDeletion(userId, reason) {
    await db('security_events').insert({
      user_id: userId,
      event_type: 'data_deleted',
      severity: 'low',
      event_data: JSON.stringify({ reason, timestamp: new Date() })
    });
  }

  async logDataExport(userId, format) {
    await db('security_events').insert({
      user_id: userId,
      event_type: 'data_exported',
      severity: 'low',
      event_data: JSON.stringify({ format, timestamp: new Date() })
    });
  }

  async cleanupSecurityLogs(cutoffDate) {
    return await db('security_events')
      .where('created_at', '<', cutoffDate)
      .where('severity', 'low')
      .del();
  }

  async cleanupAnalyticsData(cutoffDate) {
    return await db('analytics_events')
      .where('created_at', '<', cutoffDate)
      .del();
  }

  async cleanupSessionData(cutoffDate) {
    return await db('enhanced_sessions')
      .where('created_at', '<', cutoffDate)
      .where('is_active', false)
      .del();
  }

  async cleanupTempData(cutoffDate) {
    // Clean up temporary files, cache, etc.
    // Implementation would depend on your temporary data storage
    return 0;
  }

  /**
   * Privacy-preserving analytics
   */
  async generatePrivacyPreservingAnalytics(userId, analyticsData) {
    try {
      // Use differential privacy techniques
      const noise = this.generateDifferentialPrivacyNoise();
      
      const privateAnalytics = {
        userSegment: this.getPrivateUserSegment(userId),
        behaviorMetrics: this.addNoiseToMetrics(analyticsData.behaviorMetrics, noise),
        aggregatedStats: this.aggregateWithPrivacy(analyticsData.stats),
        timestamp: new Date()
      };

      return privateAnalytics;

    } catch (error) {
      logger.error('Error generating privacy-preserving analytics', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  generateDifferentialPrivacyNoise() {
    // Generate noise for differential privacy
    const epsilon = 0.1; // Privacy parameter
    const sensitivity = 1; // Data sensitivity
    
    return crypto.randomBytes(4).readFloatLE(0) * (sensitivity / epsilon);
  }

  getPrivateUserSegment(userId) {
    // Return user segment without revealing identity
    return this.hashForAnonymization(userId).substring(0, 4);
  }

  addNoiseToMetrics(metrics, noise) {
    // Add differential privacy noise to metrics
    return Object.keys(metrics).reduce((noisy, key) => {
      if (typeof metrics[key] === 'number') {
        noisy[key] = Math.max(0, metrics[key] + noise);
      } else {
        noisy[key] = metrics[key];
      }
      return noisy;
    }, {});
  }

  aggregateWithPrivacy(stats) {
    // Aggregate statistics while preserving privacy
    return {
      count: Math.max(1, stats.count || 0),
      // Other aggregated metrics with privacy preservation
    };
  }
}

module.exports = new DataProtectionService();