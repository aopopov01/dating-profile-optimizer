const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * SSL/TLS Configuration for Production
 * This module handles SSL certificate loading and HTTPS server setup
 */

/**
 * Load SSL certificates for HTTPS server
 * @returns {Object|null} SSL options or null if certificates not found
 */
function loadSSLCertificates() {
  try {
    const sslPath = process.env.SSL_CERT_PATH || '/etc/ssl/certs/dating-optimizer';
    
    // Try to load certificates from environment paths
    const certPath = process.env.SSL_CERT_FILE || path.join(sslPath, 'fullchain.pem');
    const keyPath = process.env.SSL_KEY_FILE || path.join(sslPath, 'privkey.pem');
    const caPath = process.env.SSL_CA_FILE || path.join(sslPath, 'chain.pem');
    
    // Check if certificate files exist
    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
      logger.warn('SSL certificates not found, running in HTTP mode', {
        certPath,
        keyPath,
        environment: process.env.NODE_ENV
      });
      return null;
    }
    
    const sslOptions = {
      key: fs.readFileSync(keyPath, 'utf8'),
      cert: fs.readFileSync(certPath, 'utf8'),
      // Add intermediate certificate if available
      ...(fs.existsSync(caPath) && { ca: fs.readFileSync(caPath, 'utf8') }),
      // Security settings
      secureProtocol: 'TLSv1_2_method',
      honorCipherOrder: true,
      ciphers: [
        'ECDHE-RSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES128-SHA256',
        'ECDHE-RSA-AES256-SHA384'
      ].join(':'),
      secureOptions: require('constants').SSL_OP_NO_SSLv2 | require('constants').SSL_OP_NO_SSLv3
    };
    
    logger.info('SSL certificates loaded successfully', {
      certPath,
      keyPath,
      hasCA: fs.existsSync(caPath)
    });
    
    return sslOptions;
    
  } catch (error) {
    logger.error('Failed to load SSL certificates', {
      error: error.message,
      stack: error.stack
    });
    return null;
  }
}

/**
 * Create HTTPS redirect middleware for production
 * Redirects HTTP requests to HTTPS
 */
function createHTTPSRedirectMiddleware() {
  return (req, res, next) => {
    // Skip redirect in development
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }
    
    // Skip redirect if already HTTPS
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      return next();
    }
    
    // Skip redirect for health checks and webhooks
    const skipPaths = ['/health', '/api/webhooks'];
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }
    
    // Redirect to HTTPS
    const httpsUrl = `https://${req.headers.host}${req.url}`;
    logger.info('Redirecting HTTP to HTTPS', {
      originalUrl: req.url,
      httpsUrl,
      ip: req.ip
    });
    
    res.redirect(301, httpsUrl);
  };
}

/**
 * HSTS (HTTP Strict Transport Security) middleware
 * Tells browsers to always use HTTPS for this domain
 */
function createHSTSMiddleware() {
  return (req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
      // HSTS for 1 year, include subdomains, allow preloading
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    next();
  };
}

/**
 * Let's Encrypt certificate renewal check
 * Validates certificate expiration and logs warnings
 */
function checkCertificateExpiration() {
  try {
    const sslOptions = loadSSLCertificates();
    if (!sslOptions) return;
    
    const crypto = require('crypto');
    const cert = crypto.X509Certificate ? 
      new crypto.X509Certificate(sslOptions.cert) :
      null;
    
    if (cert && cert.validTo) {
      const expirationDate = new Date(cert.validTo);
      const now = new Date();
      const daysUntilExpiration = Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiration <= 30) {
        logger.warn('SSL certificate expires soon', {
          expirationDate: expirationDate.toISOString(),
          daysUntilExpiration,
          subject: cert.subject
        });
      } else {
        logger.info('SSL certificate is valid', {
          expirationDate: expirationDate.toISOString(),
          daysUntilExpiration,
          subject: cert.subject
        });
      }
    }
    
  } catch (error) {
    logger.error('Failed to check certificate expiration', {
      error: error.message,
      stack: error.stack
    });
  }
}

/**
 * Setup SSL configuration for production deployment
 * Instructions for obtaining Let's Encrypt certificates:
 * 
 * 1. Install Certbot:
 *    sudo apt update && sudo apt install certbot
 * 
 * 2. Obtain certificate (replace yourdomain.com):
 *    sudo certbot certonly --standalone -d api.yourdomain.com
 * 
 * 3. Set environment variables:
 *    SSL_CERT_PATH=/etc/letsencrypt/live/api.yourdomain.com
 *    SSL_CERT_FILE=/etc/letsencrypt/live/api.yourdomain.com/fullchain.pem
 *    SSL_KEY_FILE=/etc/letsencrypt/live/api.yourdomain.com/privkey.pem
 * 
 * 4. Setup automatic renewal:
 *    sudo crontab -e
 *    Add: 0 12 * * * /usr/bin/certbot renew --quiet
 */

module.exports = {
  loadSSLCertificates,
  createHTTPSRedirectMiddleware,
  createHSTSMiddleware,
  checkCertificateExpiration
};