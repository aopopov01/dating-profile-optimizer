const admin = require('firebase-admin');
const logger = require('./logger');

class FirebaseConfig {
  constructor() {
    this.initialized = false;
    this.app = null;
  }

  initialize() {
    try {
      if (this.initialized) {
        return this.app;
      }

      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      const projectId = process.env.FIREBASE_PROJECT_ID || 'dating-profile-optimizer';

      if (!serviceAccountKey) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is required');
      }

      let serviceAccount;
      try {
        // Try to parse as JSON string first
        serviceAccount = JSON.parse(serviceAccountKey);
      } catch (error) {
        // If not JSON, assume it's a file path
        serviceAccount = require(serviceAccountKey);
      }

      this.app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId,
        databaseURL: `https://${projectId}-default-rtdb.firebaseio.com`
      });

      this.initialized = true;
      logger.info('Firebase Admin SDK initialized successfully');
      return this.app;
    } catch (error) {
      logger.error('Failed to initialize Firebase Admin SDK:', error);
      throw error;
    }
  }

  getMessaging() {
    if (!this.initialized) {
      this.initialize();
    }
    return admin.messaging();
  }

  getAuth() {
    if (!this.initialized) {
      this.initialize();
    }
    return admin.auth();
  }

  getFirestore() {
    if (!this.initialized) {
      this.initialize();
    }
    return admin.firestore();
  }

  // Validate FCM token format
  isValidFCMToken(token) {
    if (!token || typeof token !== 'string') {
      return false;
    }
    
    // FCM tokens are typically 152+ characters long and contain only alphanumeric chars and certain symbols
    const fcmTokenRegex = /^[a-zA-Z0-9_:/-]{140,}$/;
    return fcmTokenRegex.test(token);
  }

  // Test connection to Firebase
  async testConnection() {
    try {
      const messaging = this.getMessaging();
      // Try to validate a dummy token to test the connection
      await messaging.send({
        token: 'dummy_token_for_testing',
        notification: {
          title: 'Test',
          body: 'Test'
        }
      }, true); // dry run
    } catch (error) {
      if (error.code === 'messaging/invalid-registration-token') {
        // This is expected with a dummy token, connection is working
        logger.info('Firebase connection test successful');
        return true;
      }
      logger.error('Firebase connection test failed:', error);
      return false;
    }
  }
}

// Singleton instance
const firebaseConfig = new FirebaseConfig();

module.exports = firebaseConfig;