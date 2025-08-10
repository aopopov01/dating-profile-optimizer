const path = require('path');
require('dotenv').config();

/**
 * Optimized Knex Configuration for Dating Profile Optimizer
 * Tailored for dating app database workloads with high concurrency and AI processing
 */
module.exports = {
  development: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'dating_optimizer_dev',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      charset: 'utf8',
      timezone: 'UTC',
      // Development optimizations
      options: {
        encrypt: false,
        enableArithAbort: true,
        trustServerCertificate: true
      }
    },
    migrations: {
      directory: path.join(__dirname, 'migrations'),
      tableName: 'knex_migrations',
      schemaName: 'public',
      disableTransactions: false
    },
    seeds: {
      directory: path.join(__dirname, 'seeds')
    },
    // Optimized pool configuration for development
    pool: {
      min: 2,
      max: 15, // Increased for dating app concurrent operations
      acquireTimeoutMillis: 10000, // 10 second timeout
      idleTimeoutMillis: 300000,   // 5 minutes idle timeout
      createTimeoutMillis: 10000,  // 10 second create timeout
      destroyTimeoutMillis: 5000,  // 5 second destroy timeout
      createRetryIntervalMillis: 200,
      // Dating app specific optimizations
      propagateCreateError: false,
      afterCreate: function (conn, done) {
        // Optimize for dating app queries
        conn.query('SET timezone="UTC";', function (err) {
          if (err) return done(err, conn);
          conn.query('SET statement_timeout = 30000;', function (err) { // 30s statement timeout
            if (err) return done(err, conn);
            conn.query('SET idle_in_transaction_session_timeout = 60000;', function (err) { // 1min idle timeout
              done(err, conn);
            });
          });
        });
      }
    },
    // Development debugging and performance
    debug: process.env.DB_DEBUG === 'true',
    asyncStackTraces: true,
    log: {
      warn(message) {
        console.warn('Knex Warning:', message);
      },
      error(message) {
        console.error('Knex Error:', message);
      },
      debug(message) {
        if (process.env.DB_DEBUG === 'true') {
          console.log('Knex Debug:', message);
        }
      }
    }
  },

  testing: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME_TEST || 'dating_optimizer_test',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      charset: 'utf8',
      timezone: 'UTC',
      options: {
        encrypt: false,
        enableArithAbort: true
      }
    },
    migrations: {
      directory: path.join(__dirname, 'migrations'),
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: path.join(__dirname, 'seeds')
    },
    // Minimal pool for testing
    pool: {
      min: 1,
      max: 3, // Slightly increased for parallel test execution
      acquireTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      createTimeoutMillis: 5000,
      destroyTimeoutMillis: 2000,
      afterCreate: function (conn, done) {
        // Fast setup for testing
        conn.query('SET timezone="UTC";', function (err) {
          if (err) return done(err, conn);
          conn.query('SET statement_timeout = 10000;', done); // 10s for testing
        });
      }
    },
    debug: false,
    asyncStackTraces: false
  },

  staging: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      charset: 'utf8',
      timezone: 'UTC',
      ssl: process.env.DB_SSL === 'true' ? { 
        rejectUnauthorized: false,
        ca: process.env.DB_SSL_CA,
        key: process.env.DB_SSL_KEY,
        cert: process.env.DB_SSL_CERT
      } : false,
      options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        enableArithAbort: true
      }
    },
    migrations: {
      directory: path.join(__dirname, 'migrations'),
      tableName: 'knex_migrations'
    },
    // Staging pool configuration - moderate scaling
    pool: {
      min: 3,
      max: 25, // Moderate scaling for staging
      acquireTimeoutMillis: 15000,
      idleTimeoutMillis: 600000,  // 10 minutes
      createTimeoutMillis: 15000,
      destroyTimeoutMillis: 5000,
      createRetryIntervalMillis: 500,
      propagateCreateError: false,
      afterCreate: function (conn, done) {
        // Staging optimizations
        conn.query('SET timezone="UTC";', function (err) {
          if (err) return done(err, conn);
          conn.query('SET statement_timeout = 45000;', function (err) { // 45s timeout
            if (err) return done(err, conn);
            conn.query('SET idle_in_transaction_session_timeout = 120000;', function (err) { // 2min idle
              if (err) return done(err, conn);
              // Enable query planning optimizations
              conn.query('SET enable_seqscan = on;', function (err) {
                if (err) return done(err, conn);
                conn.query('SET random_page_cost = 1.1;', done); // SSD optimization
              });
            });
          });
        });
      }
    },
    debug: process.env.DB_DEBUG === 'true',
    log: {
      warn(message) {
        console.warn('Knex Staging Warning:', message);
      },
      error(message) {
        console.error('Knex Staging Error:', message);
      }
    }
  },

  production: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL || {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      charset: 'utf8',
      timezone: 'UTC',
      ssl: process.env.DB_SSL === 'true' ? { 
        rejectUnauthorized: false,
        ca: process.env.DB_SSL_CA,
        key: process.env.DB_SSL_KEY,
        cert: process.env.DB_SSL_CERT
      } : false,
      options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        enableArithAbort: true,
        trustServerCertificate: false
      },
      // Production connection optimizations
      application_name: 'dating-optimizer-backend',
      keepAlive: true,
      keepAliveInitialDelayMillis: 0
    },
    migrations: {
      directory: path.join(__dirname, 'migrations'),
      tableName: 'knex_migrations',
      disableTransactions: false
    },
    // Production-optimized pool configuration for dating app
    pool: {
      min: 5, // Always maintain minimum connections for availability
      max: 50, // High max for dating app concurrent users
      acquireTimeoutMillis: 30000, // 30 second timeout for high load
      idleTimeoutMillis: 600000,   // 10 minutes idle timeout
      createTimeoutMillis: 20000,  // 20 second create timeout
      destroyTimeoutMillis: 5000,  // 5 second destroy timeout
      createRetryIntervalMillis: 1000, // Retry every second
      propagateCreateError: false,
      // Advanced pool management
      evictionRunIntervalMillis: 10000, // Check for eviction every 10s
      numTestsPerEvictionRun: 3,
      softIdleTimeoutMillis: 300000, // 5 minutes soft idle
      // Production connection setup
      afterCreate: function (conn, done) {
        // Production database optimizations
        conn.query('SET timezone="UTC";', function (err) {
          if (err) return done(err, conn);
          conn.query('SET statement_timeout = 60000;', function (err) { // 1 minute statement timeout
            if (err) return done(err, conn);
            conn.query('SET idle_in_transaction_session_timeout = 300000;', function (err) { // 5 min idle timeout
              if (err) return done(err, conn);
              // Dating app specific optimizations
              conn.query('SET work_mem = "16MB";', function (err) { // Increased work memory for complex queries
                if (err) return done(err, conn);
                conn.query('SET shared_preload_libraries = "pg_stat_statements";', function (err) {
                  if (err) return done(err, conn);
                  conn.query('SET log_min_duration_statement = 1000;', function (err) { // Log slow queries
                    if (err) return done(err, conn);
                    // Enable query optimizations
                    conn.query('SET enable_seqscan = on;', function (err) {
                      if (err) return done(err, conn);
                      conn.query('SET random_page_cost = 1.1;', function (err) { // SSD optimization
                        if (err) return done(err, conn);
                        conn.query('SET effective_cache_size = "1GB";', done); // Cache size hint
                      });
                    });
                  });
                });
              });
            });
          });
        });
      }
    },
    // Production monitoring and error handling
    debug: false,
    asyncStackTraces: false,
    log: {
      warn(message) {
        console.warn(`[${new Date().toISOString()}] Knex Production Warning:`, message);
      },
      error(message) {
        console.error(`[${new Date().toISOString()}] Knex Production Error:`, message);
      }
    },
    // Production performance monitoring
    postProcessResponse: (result, queryContext) => {
      // Log slow queries in production
      if (queryContext.queryStartTime) {
        const duration = Date.now() - queryContext.queryStartTime;
        if (duration > 1000) { // Log queries over 1 second
          console.warn(`Slow query detected (${duration}ms):`, queryContext.sql?.substring(0, 100));
        }
      }
      return result;
    },
    wrapIdentifier: (value, origImpl, queryContext) => {
      return origImpl(value);
    }
  },

  // Read replica configuration for dating app scaling
  production_read: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_READ_HOST || process.env.DB_HOST,
      port: process.env.DB_READ_PORT || process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_READ_USER || process.env.DB_USER,
      password: process.env.DB_READ_PASSWORD || process.env.DB_PASSWORD,
      charset: 'utf8',
      timezone: 'UTC',
      ssl: process.env.DB_SSL === 'true' ? { 
        rejectUnauthorized: false,
        ca: process.env.DB_SSL_CA,
        key: process.env.DB_SSL_KEY,
        cert: process.env.DB_SSL_CERT
      } : false,
      application_name: 'dating-optimizer-backend-read',
      keepAlive: true
    },
    // Read replica optimized pool
    pool: {
      min: 3,
      max: 40, // More connections for read operations
      acquireTimeoutMillis: 20000,
      idleTimeoutMillis: 300000, // 5 minutes
      createTimeoutMillis: 15000,
      destroyTimeoutMillis: 3000,
      afterCreate: function (conn, done) {
        // Read replica optimizations
        conn.query('SET timezone="UTC";', function (err) {
          if (err) return done(err, conn);
          conn.query('SET default_transaction_isolation = "read committed";', function (err) {
            if (err) return done(err, conn);
            conn.query('SET statement_timeout = 30000;', function (err) { // 30s for read queries
              if (err) return done(err, conn);
              // Optimize for read performance
              conn.query('SET work_mem = "32MB";', function (err) { // Higher work memory for complex reads
                if (err) return done(err, conn);
                conn.query('SET effective_cache_size = "2GB";', done); // Larger cache size for reads
              });
            });
          });
        });
      }
    },
    debug: false,
    log: {
      error(message) {
        console.error(`[${new Date().toISOString()}] Knex Read Replica Error:`, message);
      }
    }
  }
};