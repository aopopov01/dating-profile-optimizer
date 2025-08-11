const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const { createServer } = require('http');
require('dotenv').config();

// Import configuration
const logger = require('./config/logger');
const db = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const bioRoutes = require('./routes/bio');
const photoAnalysisRoutes = require('./routes/photoAnalysis');
const paymentsRoutes = require('./routes/payments');
const pushNotificationRoutes = require('./routes/pushNotifications');
const securityRoutes = require('./routes/security');
const securityDashboardRoutes = require('./routes/securityDashboard');
const analyticsRoutes = require('./routes/analytics');
const analyticsEnhancedRoutes = require('./routes/analyticsEnhanced');
const contentModerationRoutes = require('./routes/contentModeration');
const moderationDashboardRoutes = require('./routes/moderationDashboard');
const authMiddleware = require('./middleware/auth');

// Import analytics services
const errorTrackingService = require('./services/errorTrackingService');
const performanceMonitoringService = require('./services/performanceMonitoringService');
const analyticsDashboardService = require('./services/analyticsDashboardService');
const userBehaviorAnalyticsService = require('./services/userBehaviorAnalyticsService');
const analyticsAlertingService = require('./services/analyticsAlertingService');

const app = express();
const server = createServer(app);

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: [\"'self'\"],
      styleSrc: [\"'self'\", \"'unsafe-inline'\"],
      scriptSrc: [\"'self'\"],
      imgSrc: [\"'self'\", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(compression());
app.use(globalLimiter);
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Performance monitoring middleware
app.use(performanceMonitoringService.getHTTPMonitoringMiddleware());

// Trust proxy for accurate IP addresses
app.set('trust proxy', true);

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// API versioning
const API_VERSION = '/api/v1';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/bio', bioRoutes);
app.use('/api/photo-analysis', photoAnalysisRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/push-notifications', pushNotificationRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/security/dashboard', securityDashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/analytics/enhanced', analyticsEnhancedRoutes);
app.use('/api/content-moderation', contentModerationRoutes);
app.use('/api/moderation-dashboard', moderationDashboardRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Dating Profile Optimizer API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    company: {
      name: 'Xciterr Ltd',
      registration: '206478710',
      vat: 'BG206478710',
      jurisdiction: 'Bulgaria, Sofia',
      director: 'Alexander Popov',
      contact: 'info@xciterr.com'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

// Error tracking middleware
app.use(errorTrackingService.getMiddleware());

// Error handler
app.use((err, req, res, next) => {
  logger.error('Error:', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    ip: req.ip
  });

  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    timestamp: new Date().toISOString()
  });
});

// Initialize services
async function initializeServices() {
  try {
    // Initialize Firebase and notification services
    const firebaseConfig = require('./config/firebase');
    await firebaseConfig.initialize();
    
    // Initialize notification scheduler
    const notificationSchedulerService = require('./services/notificationSchedulerService');
    await notificationSchedulerService.initialize();
    
    // Initialize analytics services
    logger.info('Initializing analytics services...');
    await errorTrackingService.init();
    await performanceMonitoringService.init();
    await analyticsDashboardService.init();
    await userBehaviorAnalyticsService.init();
    await analyticsAlertingService.init();
    
    logger.info('All analytics services initialized successfully');
    
    // Initialize notification templates
    const notificationTemplateService = require('./services/notificationTemplateService');
    await notificationTemplateService.initializeDefaultTemplates();
    
    // Initialize security monitoring service
    const securityMonitoringService = require('./services/securityMonitoringService');
    logger.info('Security monitoring service initialized');
    
    // Initialize data protection service
    const dataProtectionService = require('./services/dataProtectionService');
    logger.info('Data protection service initialized');
    
    // Initialize moderation scheduler service
    const moderationSchedulerService = require('./services/moderationSchedulerService');
    await moderationSchedulerService.initialize();
    logger.info('Moderation scheduler service initialized');
    
    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    throw error;
  }
}

// Initialize services and start server
const PORT = process.env.PORT || 3002;
const HOST = process.env.HOST || '0.0.0.0';

async function startServer() {
  try {
    // Initialize database connection
    await db.raw('SELECT 1');
    logger.info('Database connection established');

    // Initialize external services
    await initializeServices();
    logger.info('External services initialized');

    // Start server
    server.listen(PORT, HOST, () => {
      logger.info(`Dating Profile Optimizer Backend server running on ${HOST}:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    await db.destroy();
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(async () => {
    await db.destroy();
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = { app, server };