const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
require('dotenv').config();

// Import configuration
const logger = require('./config/logger');
const db = require('./config/database');

// Import middleware
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/auth');
const securityMiddleware = require('./middleware/security');

// Import routes
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profiles');
const photoRoutes = require('./routes/photos');
const bioRoutes = require('./routes/bios');
const analyticsRoutes = require('./routes/analytics');
const paymentRoutes = require('./routes/payments');

// Import services
const { initializeServices } = require('./services');

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
app.use('/health', healthRoutes);
app.use(`${API_VERSION}/auth`, authRoutes);
app.use(`${API_VERSION}/profiles`, authMiddleware.authenticate, profileRoutes);
app.use(`${API_VERSION}/photos`, authMiddleware.authenticate, photoRoutes);
app.use(`${API_VERSION}/bios`, authMiddleware.authenticate, bioRoutes);
app.use(`${API_VERSION}/analytics`, authMiddleware.authenticate, analyticsRoutes);
app.use(`${API_VERSION}/payments`, authMiddleware.authenticate, paymentRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Dating Profile Optimizer API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

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