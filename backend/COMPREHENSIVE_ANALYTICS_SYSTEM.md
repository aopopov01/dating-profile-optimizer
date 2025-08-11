# Comprehensive Analytics & Monitoring System

This document outlines the complete analytics and monitoring system implemented for the Dating Profile Optimizer application, providing comprehensive tracking, analysis, and business intelligence capabilities.

## System Overview

The analytics system consists of multiple integrated services that provide end-to-end monitoring, tracking, and analysis of user behavior, system performance, business metrics, and operational health.

### Core Components

1. **Error Tracking & Logging** - Real-time error monitoring with Sentry integration
2. **Performance Monitoring** - APM with Prometheus metrics and system health tracking
3. **User Behavior Analytics** - User journey tracking, segmentation, and engagement analysis
4. **A/B Testing Framework** - Statistical testing with automated analysis
5. **Business Intelligence Dashboard** - KPI tracking and data visualization
6. **Real-time Monitoring** - Live metrics and alerting system
7. **Data Pipeline & ETL** - Data processing and warehouse integration
8. **Custom Analytics Events** - Application-specific metrics and tracking

## Service Architecture

### 1. Error Tracking Service (`errorTrackingService.js`)
- **Purpose**: Comprehensive error monitoring and analysis
- **Features**:
  - Sentry integration for error tracking
  - Custom error classification and severity levels
  - Error aggregation and trend analysis
  - Real-time error notifications
  - Error resolution tracking
- **Endpoints**: Automatic middleware integration
- **Configuration**: `SENTRY_DSN`, error classification patterns

### 2. Performance Monitoring Service (`performanceMonitoringService.js`)
- **Purpose**: Application performance monitoring and optimization
- **Features**:
  - Prometheus metrics collection
  - HTTP request/response time tracking
  - Database query performance monitoring
  - System resource monitoring (CPU, memory)
  - Custom business metrics tracking
- **Endpoints**: `/api/analytics/enhanced/metrics` (Prometheus format)
- **Configuration**: Prometheus integration, metric collection intervals

### 3. Analytics Dashboard Service (`analyticsDashboardService.js`)
- **Purpose**: Business intelligence and data visualization
- **Features**:
  - Real-time KPI tracking
  - Chart generation and visualization
  - Conversion funnel analysis
  - Revenue and growth metrics
  - User engagement scoring
- **Endpoints**: `/api/analytics/enhanced/dashboard`
- **Configuration**: Dashboard refresh rates, KPI targets

### 4. User Behavior Analytics Service (`userBehaviorAnalyticsService.js`)
- **Purpose**: User journey tracking and behavioral insights
- **Features**:
  - Session management and tracking
  - User segmentation and classification
  - Journey pattern analysis
  - Cohort analysis and retention tracking
  - User flow optimization
- **Endpoints**: Integrated event tracking
- **Configuration**: Session timeouts, segmentation rules

### 5. Analytics Alerting Service (`analyticsAlertingService.js`)
- **Purpose**: Real-time monitoring and notification system
- **Features**:
  - Configurable alert rules and thresholds
  - Multi-channel notifications (email, Slack, webhooks)
  - Alert escalation and cooldown management
  - Business metric alerting
  - Performance threshold monitoring
- **Endpoints**: `/api/analytics/enhanced/alerts`
- **Configuration**: Alert thresholds, notification channels

### 6. Enhanced A/B Testing Service (Enhanced `abTestingService.js`)
- **Purpose**: Statistical testing and optimization
- **Features**:
  - Automated test creation and management
  - Statistical significance testing
  - Multi-variant testing support
  - Feature flag integration
  - Results analysis and recommendations
- **Endpoints**: `/api/analytics/enhanced/ab-test/*`
- **Configuration**: Confidence levels, sample sizes

## Database Schema

### Core Analytics Tables

#### `error_logs`
- Comprehensive error tracking with context
- Error classification and severity levels
- Resolution status and notes
- Request correlation and user context

#### `performance_metrics`
- System and application performance data
- HTTP request metrics
- Database query performance
- Resource utilization metrics

#### `user_behavior_events`
- User interaction tracking
- Session-based event sequences
- Platform and device information
- Geographic and referrer data

#### `user_sessions`
- Session lifecycle management
- Duration and engagement tracking
- Device and platform analytics
- Activity status monitoring

#### `business_metrics`
- KPI and business intelligence data
- Revenue and conversion tracking
- Time-series business data
- Custom metric definitions

#### `feature_usage`
- Feature adoption and usage analytics
- Success and failure tracking
- Performance scoring
- Feature-specific contexts

#### `ab_tests` & `ab_test_interactions`
- A/B test configuration and management
- Variant performance tracking
- Statistical analysis results
- User interaction recording

#### `analytics_alerts` & `alert_history`
- Alert rule configuration
- Trigger history and status
- Notification tracking
- Alert performance analytics

## API Endpoints

### Basic Analytics (`/api/analytics`)
- `POST /track` - Track analytics events
- `POST /batch` - Batch event tracking
- `POST /identify` - Update user properties
- `GET /report` - Generate analytics reports
- `GET /health` - Service health status
- `GET /events` - Available event types

### Enhanced Analytics (`/api/analytics/enhanced`)
- `GET /dashboard` - Comprehensive dashboard data
- `GET /realtime` - Real-time metrics stream (SSE)
- `GET /errors` - Error analytics dashboard
- `GET /performance` - Performance monitoring dashboard
- `GET /metrics` - Prometheus metrics endpoint
- `GET /business-intelligence` - BI reports (admin)
- `GET /export` - Data export functionality
- `GET /health` - System health overview

### A/B Testing
- `POST /ab-test` - Create new A/B test
- `GET /ab-test/:id/results` - Get test results
- `POST /ab-test/:id/interaction` - Record test interaction
- `GET /ab-tests` - User's A/B test dashboard

## Integration Guide

### 1. Environment Configuration

```bash
# Error Tracking
ENABLE_ERROR_TRACKING=true
SENTRY_DSN=your-sentry-dsn
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1

# Performance Monitoring
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_PROMETHEUS_METRICS=true
METRICS_COLLECTION_INTERVAL_MS=30000

# User Analytics
ENABLE_USER_ANALYTICS=true
MIXPANEL_TOKEN=your-mixpanel-token
GOOGLE_ANALYTICS_ID=your-ga-id
SESSION_TIMEOUT_MS=1800000

# Alerting
ENABLE_ALERTING=true
ENABLE_EMAIL_ALERTS=true
ALERT_RECIPIENTS=admin@example.com,ops@example.com
SMTP_HOST=your-smtp-host
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password

# Dashboard
ENABLE_ANALYTICS_DASHBOARD=true
DASHBOARD_REFRESH_INTERVAL_MS=30000
ENABLE_CHART_GENERATION=true

# Thresholds
RESPONSE_TIME_WARNING_MS=1000
RESPONSE_TIME_CRITICAL_MS=5000
ERROR_RATE_WARNING=0.05
ERROR_RATE_CRITICAL=0.1
```

### 2. Database Migration

```bash
npm run migrate
npm run seed
```

### 3. Service Initialization

The analytics services are automatically initialized in `app.js`:

```javascript
// Initialize analytics services
await errorTrackingService.init();
await performanceMonitoringService.init();
await analyticsDashboardService.init();
await userBehaviorAnalyticsService.init();
await analyticsAlertingService.init();
```

### 4. Client-Side Integration

#### Event Tracking
```javascript
// Track user events
fetch('/api/analytics/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event: 'bio_generated',
    properties: {
      bio_length: 150,
      interests_count: 5,
      platform: 'tinder',
      generation_time_ms: 2500
    }
  })
});
```

#### Real-time Dashboard
```javascript
// Real-time metrics stream
const eventSource = new EventSource('/api/analytics/enhanced/realtime');
eventSource.onmessage = function(event) {
  const data = JSON.parse(event.data);
  updateDashboard(data);
};
```

## Key Performance Indicators (KPIs)

### User Acquisition
- Daily/Weekly/Monthly registrations
- User acquisition cost (UAC)
- Registration conversion rate
- Traffic source analysis

### User Engagement
- Daily/Monthly active users (DAU/MAU)
- Session duration and frequency
- Feature usage rates
- User retention rates

### Conversion Funnel
- Registration → Profile completion
- Profile → Bio generation
- Bio → Photo analysis
- Photo → Subscription upgrade

### Revenue Metrics
- Daily/Monthly recurring revenue (MRR)
- Customer lifetime value (CLV)
- Average revenue per user (ARPU)
- Subscription conversion rates

### Content Quality
- Bio satisfaction scores
- Photo analysis accuracy
- AI success rates
- User feedback metrics

### System Performance
- Average response times
- Error rates and types
- System uptime
- Resource utilization

## Alert Configuration

### Default Alert Rules

1. **High Error Rate** (>5% in 5 minutes) - HIGH severity
2. **Slow Response Time** (>2 seconds avg in 10 minutes) - MEDIUM severity
3. **Low User Registrations** (<5 per hour) - MEDIUM severity
4. **Bio Generation Failures** (>15% failure rate) - HIGH severity
5. **Database Issues** (>10 connection errors in 5 minutes) - CRITICAL severity
6. **Memory Usage** (>90% for 5 minutes) - CRITICAL severity
7. **Payment Failures** (>5% failure rate) - CRITICAL severity
8. **Security Violations** (>20 per hour) - CRITICAL severity

### Notification Channels
- Email notifications to ops team
- Slack integration (optional)
- Webhook notifications for external systems
- In-app dashboard alerts

## Data Retention and Compliance

### Retention Policies
- **Error Logs**: 90 days (configurable)
- **Performance Metrics**: 30 days (configurable)
- **User Events**: 365 days (configurable)
- **A/B Test Data**: 365 days (configurable)

### Privacy Compliance
- GDPR compliance features
- Data anonymization options
- PII scrubbing capabilities
- User consent management
- Data export/deletion capabilities

## Monitoring and Maintenance

### Regular Tasks
1. **Database Cleanup**: Automated retention policy enforcement
2. **Alert Review**: Weekly review of alert performance and thresholds
3. **Performance Analysis**: Monthly performance trend analysis
4. **A/B Test Review**: Ongoing test result analysis and implementation
5. **Dashboard Updates**: Regular KPI target and threshold updates

### Health Checks
- Service initialization status
- Database connectivity
- External service integration status
- Alert rule validation
- Data pipeline health

## Scaling Considerations

### Performance Optimization
- Event batching for high-volume tracking
- Database query optimization
- Metric aggregation and pre-computation
- Caching strategies for dashboard data

### Infrastructure Scaling
- Horizontal scaling for analytics services
- Database sharding for large datasets
- CDN integration for dashboard assets
- Message queue integration for event processing

### Cost Management
- Sampling strategies for high-volume events
- Data archival for historical analytics
- External service usage optimization
- Resource monitoring and rightsizing

## Troubleshooting

### Common Issues
1. **High Memory Usage**: Check event batching and data retention
2. **Slow Dashboard Loading**: Review query optimization and caching
3. **Missing Events**: Verify client-side tracking implementation
4. **Alert Fatigue**: Adjust thresholds and cooldown periods
5. **Integration Failures**: Check external service credentials and connectivity

### Debug Mode
Enable verbose logging with:
```bash
VERBOSE_ANALYTICS_LOGGING=true
LOG_ALL_ANALYTICS_EVENTS=true
```

## Support and Documentation

For additional support:
1. Check service health endpoints: `/api/analytics/enhanced/health`
2. Review application logs for detailed error information
3. Use dashboard export functionality for data analysis
4. Monitor alert history for trend analysis

This comprehensive analytics system provides the foundation for data-driven decision making, user experience optimization, and business growth tracking for the Dating Profile Optimizer application.