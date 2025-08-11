const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs').promises;

// Load environment variables
require('dotenv').config();

// Import configuration and utilities
const logger = require('./config/logger');
const db = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const bioRoutes = require('./routes/bio');
const photoAnalysisRoutes = require('./routes/photoAnalysis');
const paymentsRoutes = require('./routes/payments');
const userRoutes = require('./routes/user');
const resultsRoutes = require('./routes/results');
const imageRoutes = require('./routes/images');
const linkedInHeadshotRoutes = require('./routes/linkedInHeadshot');
const analyticsRoutes = require('./routes/analytics');
const emailRoutes = require('./routes/email');

// Create Express app
const app = express();

// Trust proxy (for deployment behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://api.cloudinary.com"],
      frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:19006').split(',');
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with', 'x-forwarded-for']
};

app.use(cors(corsOptions));

// Compression middleware
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024
}));

// Body parsing middleware
app.use(express.json({ 
  limit: process.env.MAX_UPLOAD_SIZE || '10mb',
  strict: true
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.MAX_UPLOAD_SIZE || '10mb'
}));

// Request logging
app.use(morgan('combined', {
  stream: logger.stream,
  skip: (req, res) => {
    // Skip logging for health checks and static files in production
    if (process.env.NODE_ENV === 'production') {
      return req.url === '/health' || req.url.startsWith('/uploads/');
    }
    return false;
  }
}));

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    error: 'Too many requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Global rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('User-Agent')
    });
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }
});

app.use(globalLimiter);

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '7d',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Security headers for uploaded files
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Only serve image files
    const ext = path.extname(filePath).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    
    if (!allowedExtensions.includes(ext)) {
      res.status(403).end();
      return;
    }
  }
}));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await db.raw('SELECT 1');
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      database: 'connected',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      },
      services: {
        stripe: process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_your_stripe_secret_key',
        openai: process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-your-openai-api-key',
        cloudinary: process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_CLOUD_NAME !== 'your-cloud-name'
      }
    };
    
    res.json(healthData);
  } catch (error) {
    logger.error('Health check failed', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/bio', bioRoutes);
app.use('/api/photo-analysis', photoAnalysisRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/user', userRoutes);
app.use('/api', resultsRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/linkedin-headshot', linkedInHeadshotRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/email', emailRoutes);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Dating Profile Optimizer API',
    version: process.env.npm_package_version || '1.0.0',
    description: 'AI-powered dating profile optimization service',
    company: {
      name: 'Xciterr Ltd',
      registration: '206478710',
      vat: 'BG206478710',
      jurisdiction: 'Bulgaria, Sofia',
      director: 'Alexander Popov',
      contact: 'info@xciterr.com'
    },
    documentation: '/api/docs',
    endpoints: {
      auth: '/api/auth',
      profile: '/api/profile',
      bioGeneration: '/api/bio',
      photoAnalysis: '/api/photo-analysis',
      payments: '/api/payments',
      linkedInHeadshot: '/api/linkedin-headshot',
      analytics: '/api/analytics',
      email: '/api/email',
      health: '/health'
    },
    features: {
      aiPoweredBioGeneration: true,
      photoAnalysis: true,
      profileOptimization: true,
      linkedInHeadshots: true,
      subscriptionManagement: true,
      securePayments: true,
      analytics: true
    },
    status: 'operational',
    environment: process.env.NODE_ENV || 'development'
  });
});

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

// Handle favicon requests
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  logger.warn('API endpoint not found', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    code: 'ENDPOINT_NOT_FOUND',
    path: req.path,
    method: req.method,
    availableEndpoints: [
      '/api/auth',
      '/api/profile',
      '/api/bio',
      '/api/photo-analysis',
      '/api/payments',
      '/api/linkedin-headshot',
      '/api/analytics',
      '/api/email'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  // Log error
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method !== 'GET' ? req.body : undefined
  });

  // Handle specific error types
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'Request entity too large',
      code: 'PAYLOAD_TOO_LARGE',
      maxSize: process.env.MAX_UPLOAD_SIZE || '10mb'
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: err.details || err.message
    });
  }

  if (err.name === 'UnauthorizedError' || err.status === 401) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      code: 'UNAUTHORIZED'
    });
  }

  if (err.name === 'MulterError') {
    let message = 'File upload error';
    let code = 'UPLOAD_ERROR';
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File too large';
      code = 'FILE_TOO_LARGE';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files';
      code = 'TOO_MANY_FILES';
    }
    
    return res.status(400).json({
      success: false,
      error: message,
      code,
      maxSize: process.env.MAX_UPLOAD_SIZE || '10mb',
      maxFiles: process.env.MAX_PHOTOS_PER_ANALYSIS || 10
    });
  }

  // Default error response
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    success: false,
    error: isDevelopment ? err.message : 'Internal server error',
    code: 'INTERNAL_SERVER_ERROR',
    ...(isDevelopment && { 
      stack: err.stack,
      details: err 
    })
  });
});

// Start server
const PORT = process.env.PORT || 3002;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, async () => {
  try {
    // Test database connection
    await db.raw('SELECT 1');
    logger.info('Dating Profile Optimizer API server started', {
      environment: process.env.NODE_ENV || 'development',
      address: HOST,
      port: PORT,
      pid: process.pid,
      nodeVersion: process.version,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Database connection failed on startup', {
      error: error.message,
      stack: error.stack
    });
  }
});

// Graceful shutdown handling
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  
  server.close(() => {
    logger.info('Server closed. Shutting down database connection...');
    
    db.destroy().then(() => {
      logger.info('Database connection closed. Process exiting.');
      process.exit(0);
    }).catch((err) => {
      logger.error('Error during database shutdown:', err);
      process.exit(1);
    });
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at Promise', {
    promise,
    reason: reason.stack || reason
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception thrown', {
    error: err.message,
    stack: err.stack
  });
  
  // Graceful shutdown
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

module.exports = app;