# Push Notifications Setup Guide

This guide covers the complete setup and configuration of the push notifications system for both Dating Profile Optimizer and LinkedIn Headshot Generator mobile applications.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Backend Setup](#backend-setup)
3. [Mobile App Setup](#mobile-app-setup)
4. [Firebase Configuration](#firebase-configuration)
5. [Environment Variables](#environment-variables)
6. [Database Setup](#database-setup)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [Monitoring & Analytics](#monitoring--analytics)

## System Architecture

The push notifications system consists of:

- **Firebase Cloud Messaging (FCM)** for cross-platform delivery
- **Node.js Backend Service** with Redis queues for processing
- **React Native Mobile Apps** with notification handling
- **PostgreSQL Database** for user preferences and analytics
- **Redis** for job queuing and caching

### Key Features

✅ **Cross-platform Support** (iOS, Android, Web)  
✅ **User Preferences Management** with quiet hours and category controls  
✅ **Rich Notifications** with images, action buttons, and deep links  
✅ **Scheduled Notifications** with cron-based automation  
✅ **A/B Testing** for notification optimization  
✅ **Analytics & Tracking** for delivery and engagement metrics  
✅ **Template System** for consistent messaging  
✅ **Batch Processing** for large-scale campaigns  

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
npm install firebase-admin bull bull-board
```

### 2. Database Migration

Run the push notifications migration:

```bash
npm run migrate
```

This creates the following tables:
- `device_tokens` - User device FCM tokens
- `push_notifications` - Notification records
- `notification_recipients` - Delivery tracking
- `notification_preferences` - User settings
- `notification_templates` - Message templates
- `notification_ab_tests` - A/B testing configurations
- `notification_analytics` - Performance metrics

### 3. Seed Default Templates

```bash
npm run seed
```

This populates notification templates for:
- Welcome & onboarding messages
- Bio generation completion
- Photo analysis results
- Subscription reminders
- Security alerts
- Feature updates
- Weekly insights

### 4. Environment Configuration

Add these variables to your `.env` file:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT_KEY=/path/to/serviceAccountKey.json
# OR as JSON string:
# FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Redis Configuration (for job queues)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Notification Settings
NOTIFICATION_BATCH_SIZE=100
NOTIFICATION_RETRY_ATTEMPTS=3
NOTIFICATION_RATE_LIMIT=1000
```

### 5. Service Initialization

The notification services are automatically initialized in `src/app.js`:

```javascript
// Services are initialized on server startup
- Firebase Admin SDK
- Notification Scheduler (cron jobs)
- Notification Templates (default templates)
- Push Notification Service (Redis queues)
```

## Mobile App Setup

### 1. Install Dependencies

```bash
cd DatingProfileOptimizer
npm install @react-native-firebase/app @react-native-firebase/messaging @react-native-firebase/crashlytics react-native-push-notification @react-native-community/push-notification-ios
```

### 2. Platform Configuration

#### iOS Setup

1. **Add Firebase Configuration**
   ```bash
   # Place GoogleService-Info.plist in ios/DatingProfileOptimizer/
   ```

2. **Enable Push Notifications Capability**
   - Open `ios/DatingProfileOptimizer.xcworkspace`
   - Select project → Signing & Capabilities → Add Capability → Push Notifications

3. **Configure Info.plist**
   ```xml
   <!-- Add to ios/DatingProfileOptimizer/Info.plist -->
   <key>UIBackgroundModes</key>
   <array>
     <string>background-processing</string>
     <string>remote-notification</string>
   </array>
   ```

#### Android Setup

1. **Add Firebase Configuration**
   ```bash
   # Place google-services.json in android/app/
   ```

2. **Update Gradle Files**
   ```gradle
   // android/build.gradle
   dependencies {
     classpath 'com.google.gms:google-services:4.3.15'
   }

   // android/app/build.gradle
   apply plugin: 'com.google.gms.google-services'

   dependencies {
     implementation 'com.google.firebase:firebase-messaging:23.2.1'
     implementation 'androidx.work:work-runtime:2.8.1'
   }
   ```

3. **Update AndroidManifest.xml**
   ```xml
   <!-- android/app/src/main/AndroidManifest.xml -->
   <uses-permission android:name="android.permission.INTERNET" />
   <uses-permission android:name="android.permission.WAKE_LOCK" />
   <uses-permission android:name="android.permission.VIBRATE" />
   <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
   <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

   <service
     android:name=".MyFirebaseMessagingService"
     android:exported="false">
     <intent-filter>
       <action android:name="com.google.firebase.MESSAGING_EVENT" />
     </intent-filter>
   </service>
   ```

### 3. Service Integration

Initialize the push notification service in your app:

```typescript
// src/App.tsx
import pushNotificationService from './src/services/PushNotificationService';

export default function App() {
  useEffect(() => {
    const initializeNotifications = async () => {
      await pushNotificationService.initialize();
      
      // Set notification handler
      pushNotificationService.setNotificationHandler((notification) => {
        console.log('Notification received:', notification);
        // Handle foreground notifications
      });

      // Set deep link handler
      pushNotificationService.setDeepLinkHandler((url) => {
        console.log('Deep link:', url);
        // Navigate based on deep link
      });
    };

    initializeNotifications();
  }, []);

  // Rest of your app...
}
```

## Firebase Configuration

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create new project or select existing
3. Add iOS and Android apps
4. Download configuration files

### 2. Enable Cloud Messaging

1. Navigate to Project Settings → Cloud Messaging
2. Note down the Server Key and Sender ID
3. Configure APNs certificates for iOS (Production & Development)

### 3. Generate Service Account Key

1. Go to Project Settings → Service Accounts
2. Generate new private key
3. Download JSON file or copy content for environment variable

### 4. Test Configuration

Use the Firebase Console to send a test notification and verify setup.

## Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost/dating_optimizer
REDIS_HOST=localhost
REDIS_PORT=6379

# Firebase
FIREBASE_PROJECT_ID=dating-profile-optimizer
FIREBASE_SERVICE_ACCOUNT_KEY=./config/firebase-service-account.json

# API Configuration
API_URL=http://localhost:3002/api
NODE_ENV=development

# Notification Settings
MAX_DAILY_NOTIFICATIONS=5
QUIET_HOURS_START=22:00:00
QUIET_HOURS_END=08:00:00
NOTIFICATION_BATCH_SIZE=100
```

### Mobile App (.env)

```env
REACT_APP_API_URL=http://localhost:3002/api
REACT_APP_FIREBASE_PROJECT_ID=dating-profile-optimizer
```

## Database Setup

### Running Migrations

```bash
# Run all migrations
npm run migrate

# Run specific migration
npx knex migrate:up 011_create_push_notifications_tables.js

# Rollback migration
npx knex migrate:down
```

### Seed Data

```bash
# Seed all data
npm run seed

# Seed specific file
npx knex seed:run --specific=002_notification_templates.js
```

## Testing

### 1. Backend Testing

Test notification sending:

```bash
# Using the notification testing utilities
curl -X POST http://localhost:3002/api/push-notifications/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Test notification"}'
```

### 2. Mobile App Testing

Test features in development:

```typescript
// Test notification reception
await pushNotificationService.sendTestNotification();

// Test preferences update
await pushNotificationService.updateNotificationPreferences({
  enabled: true,
  categories: { bioCompletion: true }
});
```

### 3. Comprehensive Testing Suite

Run the complete test suite:

```javascript
// Backend
const notificationTesting = require('./src/utils/notificationTesting');

// Test all notification types
const report = await notificationTesting.runComprehensiveTest(userId);
console.log('Test Report:', report);
```

### 4. Testing Checklist

- [ ] Device token registration
- [ ] Notification delivery (foreground/background)
- [ ] Deep link handling
- [ ] Notification preferences
- [ ] Scheduled notifications
- [ ] Rich notifications (images, buttons)
- [ ] Cross-platform compatibility
- [ ] Analytics tracking

## Deployment

### 1. Production Environment Variables

```env
# Production Firebase project
FIREBASE_PROJECT_ID=dating-optimizer-prod
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Production Redis
REDIS_HOST=your-redis-cluster.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password

# Performance settings
NOTIFICATION_BATCH_SIZE=500
NOTIFICATION_WORKER_CONCURRENCY=10
```

### 2. Infrastructure Requirements

- **Redis Cluster** for job queues and caching
- **PostgreSQL** with proper indexing for analytics
- **Load Balancer** for API endpoints
- **Monitoring** for queue health and delivery rates

### 3. Security Considerations

- Store Firebase service account key securely
- Use environment-specific Firebase projects
- Implement rate limiting for notification endpoints
- Validate all user input for template variables
- Monitor for spam and abuse patterns

## Monitoring & Analytics

### 1. Built-in Analytics

The system tracks:
- Delivery rates by category and template
- Open rates and click-through rates
- User engagement patterns
- A/B test performance
- Queue processing metrics

### 2. Dashboard Access

View notification analytics:

```bash
# Access Bull Board dashboard
http://localhost:3002/admin/queues

# View notification statistics
GET /api/push-notifications/stats?startDate=2024-01-01&endDate=2024-01-31
```

### 3. Custom Monitoring

Implement custom monitoring for:
- FCM token refresh rates
- Notification bounce rates
- User preference changes
- Template performance
- Queue processing delays

## API Endpoints Reference

### Device Management
- `POST /api/push-notifications/register-token` - Register device token
- `POST /api/push-notifications/unregister-token` - Remove device token
- `GET /api/push-notifications/device-tokens` - Get user's tokens

### Notification Sending
- `POST /api/push-notifications/send` - Send immediate notification
- `POST /api/push-notifications/send-bulk` - Send to multiple users
- `POST /api/push-notifications/send-template` - Send using template

### User Preferences
- `GET /api/push-notifications/preferences` - Get user preferences
- `PUT /api/push-notifications/preferences` - Update preferences

### Analytics & Tracking
- `POST /api/push-notifications/track/:notificationId/:event` - Track events
- `GET /api/push-notifications/history` - Get notification history
- `GET /api/push-notifications/stats` - Get analytics data

### Templates & Testing
- `GET /api/push-notifications/templates` - Get available templates
- `GET /api/push-notifications/scheduler/status` - Scheduler status
- `POST /api/push-notifications/test` - Send test notification (dev only)

## Troubleshooting

### Common Issues

1. **Notifications not received**
   - Check Firebase configuration
   - Verify device token registration
   - Check user preferences and quiet hours
   - Validate FCM token format

2. **High bounce rates**
   - Clean up expired device tokens
   - Implement token refresh logic
   - Monitor FCM error responses

3. **Poor engagement**
   - A/B test notification content
   - Optimize sending times
   - Personalize message content
   - Review notification frequency

4. **Queue processing delays**
   - Scale Redis workers
   - Optimize batch sizes
   - Monitor Redis memory usage
   - Check database query performance

### Debug Logging

Enable detailed logging:

```env
LOG_LEVEL=debug
DEBUG_NOTIFICATIONS=true
```

### Health Checks

Monitor system health:

```bash
# Check notification queue status
GET /api/push-notifications/scheduler/status

# Check Firebase connectivity
# (Implemented in Firebase config service)

# Monitor Redis connection
# (Redis client health checks)
```

## Support

For additional support:

1. Check the [Firebase Documentation](https://firebase.google.com/docs/cloud-messaging)
2. Review React Native Firebase [Documentation](https://rnfirebase.io/messaging/usage)
3. Consult the application logs for detailed error information
4. Use the built-in testing utilities for debugging

---

This comprehensive push notifications system provides a robust foundation for user engagement across both Dating Profile Optimizer and LinkedIn Headshot Generator applications. The system is designed for scalability, reliability, and optimal user experience.