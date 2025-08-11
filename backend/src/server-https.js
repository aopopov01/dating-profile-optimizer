const https = require('https');
const http = require('http');
const app = require('./server');
const logger = require('./config/logger');
const { 
  loadSSLCertificates, 
  createHTTPSRedirectMiddleware, 
  createHSTSMiddleware,
  checkCertificateExpiration 
} = require('./config/ssl');

/**
 * Production HTTPS Server Setup
 * This file creates both HTTP and HTTPS servers for production deployment
 */

// Add HTTPS redirect and HSTS middleware
app.use(createHTTPSRedirectMiddleware());
app.use(createHSTSMiddleware());

// Load SSL certificates
const sslOptions = loadSSLCertificates();

// Server configuration
const HTTP_PORT = process.env.HTTP_PORT || 80;
const HTTPS_PORT = process.env.HTTPS_PORT || 443;
const HOST = process.env.HOST || '0.0.0.0';

let httpServer, httpsServer;

/**
 * Start HTTP server (for redirects and Let's Encrypt challenges)
 */
function startHTTPServer() {
  httpServer = http.createServer(app);
  
  httpServer.listen(HTTP_PORT, HOST, () => {
    logger.info('HTTP server started (redirect only)', {
      port: HTTP_PORT,
      host: HOST,
      environment: process.env.NODE_ENV
    });
  });
  
  httpServer.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`HTTP port ${HTTP_PORT} is already in use`);
    } else {
      logger.error('HTTP server error', { error: error.message });
    }
  });
}

/**
 * Start HTTPS server with SSL certificates
 */
function startHTTPSServer() {
  if (!sslOptions) {
    logger.warn('SSL certificates not available, HTTPS server not started');
    return;
  }
  
  httpsServer = https.createServer(sslOptions, app);
  
  httpsServer.listen(HTTPS_PORT, HOST, () => {
    logger.info('HTTPS server started', {
      port: HTTPS_PORT,
      host: HOST,
      environment: process.env.NODE_ENV
    });
    
    // Check certificate expiration
    checkCertificateExpiration();
  });
  
  httpsServer.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`HTTPS port ${HTTPS_PORT} is already in use`);
    } else {
      logger.error('HTTPS server error', { error: error.message });
    }
  });
}

/**
 * Graceful shutdown for both servers
 */
function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  
  const shutdownPromises = [];
  
  if (httpServer) {
    shutdownPromises.push(new Promise((resolve) => {
      httpServer.close(() => {
        logger.info('HTTP server closed');
        resolve();
      });
    }));
  }
  
  if (httpsServer) {
    shutdownPromises.push(new Promise((resolve) => {
      httpsServer.close(() => {
        logger.info('HTTPS server closed');
        resolve();
      });
    }));
  }
  
  Promise.all(shutdownPromises).then(() => {
    logger.info('All servers closed. Shutting down database connection...');
    
    const db = require('./config/database');
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

// Start servers
if (process.env.NODE_ENV === 'production') {
  // In production, start both HTTP (for redirects) and HTTPS servers
  startHTTPServer();
  startHTTPSServer();
} else {
  // In development, start only HTTPS if certificates are available
  if (sslOptions) {
    startHTTPSServer();
  } else {
    logger.info('Running in development mode without SSL certificates');
    // The main server.js will handle the HTTP server
  }
}

// Graceful shutdown handling
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

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
  
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

module.exports = { httpServer, httpsServer };