const knex = require('knex');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

// Database configuration
const config = {
  development: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'dating_optimizer_dev',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'dating_dev_password'
    },
    migrations: {
      directory: path.join(__dirname, '../../../migrations'),
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: path.join(__dirname, '../../../seeds')
    },
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200
    },
    debug: process.env.NODE_ENV === 'development' && process.env.DB_DEBUG === 'true'
  },
  
  test: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME_TEST || 'dating_optimizer_test',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'dating_dev_password'
    },
    migrations: {
      directory: path.join(__dirname, '../../../migrations')
    },
    pool: {
      min: 1,
      max: 2
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
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    },
    migrations: {
      directory: path.join(__dirname, '../../../migrations')
    },
    pool: {
      min: 2,
      max: 20
    }
  }
};

const environment = process.env.NODE_ENV || 'development';
const db = knex(config[environment]);

// Test database connection
db.raw('SELECT 1')
  .then(() => {
    console.log('✅ Database connection successful');
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
  });

module.exports = db;