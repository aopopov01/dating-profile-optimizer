# Dating Profile Optimizer - Developer Setup Guide

## 🎯 Quick Start for New Developers

This comprehensive guide will get you from zero to a fully functional development environment in under 30 minutes.

## 📋 Prerequisites

### System Requirements
- **Operating System**: macOS 10.15+, Windows 10+, or Ubuntu 18.04+
- **Node.js**: 18.x or 20.x (LTS versions recommended)
- **Package Manager**: npm 8+ or Yarn 1.22+
- **Git**: 2.25+ with SSH keys configured
- **Docker**: 20.10+ with Docker Compose 2.0+

### Development Tools
- **Code Editor**: VS Code with recommended extensions
- **Database Tools**: pgAdmin, DBeaver, or VS Code PostgreSQL extension
- **API Testing**: Postman, Insomnia, or VS Code REST Client
- **Terminal**: macOS Terminal, Windows Terminal, or iTerm2

### Mobile Development Environment

#### For Android Development
- **Java Development Kit (JDK)**: Version 11
- **Android Studio**: Latest stable version with Android SDK
- **Android SDK**: API levels 31, 32, 33
- **Android NDK**: Latest version
- **Android Emulator**: Pixel device with API 31+

#### For iOS Development (macOS only)
- **Xcode**: 13.0+ with iOS SDK 15+
- **CocoaPods**: Latest version via RubyGems
- **iOS Simulator**: iOS 15.0+
- **Apple Developer Account**: For device testing and distribution

## 🚀 Environment Setup

### Step 1: Clone Repository and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/yourusername/dating-profile-optimizer.git
cd dating-profile-optimizer

# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install mobile app dependencies
cd ../DatingProfileOptimizer
npm install

# Install CocoaPods dependencies (iOS/macOS only)
cd ios
pod install
cd ..
```

### Step 2: Development Environment Configuration

#### Backend Environment Variables
Create `/backend/.env`:

```env
# Development Configuration
NODE_ENV=development
PORT=3002
API_BASE_URL=http://localhost:3002
DEBUG=dating-optimizer:*

# Database Configuration
DATABASE_URL=postgresql://dating_dev:dating_dev_password@localhost:5432/dating_optimizer_dev
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
REDIS_URL=redis://localhost:6379/0

# AI Services
OPENAI_API_KEY=sk-proj-your_openai_api_key_here
OPENAI_ORG_ID=org-your_openai_org_id_here
COMPUTER_VISION_API_KEY=your_azure_computer_vision_key
COMPUTER_VISION_ENDPOINT=https://your-region.cognitiveservices.azure.com/

# Development Payment Keys (Stripe Test Mode)
STRIPE_PUBLISHABLE_KEY=pk_test_51your_stripe_test_key
STRIPE_SECRET_KEY=sk_test_51your_stripe_test_secret
STRIPE_WEBHOOK_SECRET=whsec_your_test_webhook_secret

# Cloud Storage (Development)
CLOUDINARY_CLOUD_NAME=your_dev_cloudinary_name
CLOUDINARY_API_KEY=your_dev_api_key
CLOUDINARY_API_SECRET=your_dev_api_secret
CLOUDINARY_UPLOAD_PRESET=dating_optimizer_dev

# Analytics (Development)
MIXPANEL_TOKEN=your_dev_mixpanel_token
MIXPANEL_DEBUG=true

# Security (Development Keys - Generate New for Production)
JWT_SECRET=your_development_jwt_secret_min_32_chars
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_SECRET=your_refresh_token_secret_min_32_chars
REFRESH_TOKEN_EXPIRES_IN=7d
ENCRYPTION_KEY=your_32_character_encryption_key_here
BCRYPT_ROUNDS=10

# Rate Limiting (Relaxed for Development)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_SKIP_SUCCESSFUL=true

# File Upload
MAX_FILE_SIZE_MB=10
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/heic
TEMP_UPLOAD_DIR=./temp/uploads

# Logging
LOG_LEVEL=debug
LOG_FILE=./logs/app.log
LOG_MAX_SIZE=10mb
LOG_MAX_FILES=5

# Email (Development - Use Ethereal or MailHog)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your_ethereal_user
SMTP_PASS=your_ethereal_pass
EMAIL_FROM=noreply@datingoptimizer.com

# Development Features
ENABLE_DEBUG_ROUTES=true
ENABLE_MOCK_AI_RESPONSES=false
ENABLE_DEVELOPMENT_CORS=true
DISABLE_RATE_LIMITING=false
```

#### Mobile App Environment Variables
Create `/DatingProfileOptimizer/.env`:

```env
# API Configuration
API_BASE_URL=http://localhost:3002
API_TIMEOUT_MS=30000
API_RETRY_ATTEMPTS=3

# Platform Configuration
ANDROID_BUILD_VARIANT=debug
IOS_BUILD_CONFIGURATION=Debug

# Stripe Configuration (Test Keys)
STRIPE_PUBLISHABLE_KEY=pk_test_51your_stripe_test_key

# Analytics Configuration
MIXPANEL_TOKEN=your_dev_mixpanel_token
AMPLITUDE_API_KEY=your_dev_amplitude_key
ENABLE_ANALYTICS=true
ANALYTICS_DEBUG=true

# Feature Flags
ENABLE_BIOMETRIC_AUTH=true
ENABLE_ANALYTICS=true
ENABLE_CRASH_REPORTING=true
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_DEEPLINKS=true

# Development Configuration
DEBUG_MODE=true
LOG_LEVEL=debug
ENABLE_FLIPPER=true
ENABLE_REACTOTRON=true
SHOW_PERFORMANCE_OVERLAY=false

# Security Configuration
ENABLE_SSL_PINNING=false
TRUST_ALL_CERTIFICATES=true
ENABLE_ROOT_DETECTION=false

# Storage Configuration
ASYNC_STORAGE_SIZE_MB=50
ENABLE_STORAGE_ENCRYPTION=true
CACHE_TTL_HOURS=24

# Push Notifications (Development)
FCM_SERVER_KEY=your_fcm_server_key
APNS_KEY_ID=your_apns_key_id
APNS_TEAM_ID=your_apns_team_id

# Deep Linking
URL_SCHEME=datingoptimizer
UNIVERSAL_LINK_DOMAIN=dev.datingoptimizer.com
```

### Step 3: Database Setup

#### Using Docker (Recommended for Development)
```bash
# Start PostgreSQL and Redis containers
cd backend
docker-compose -f docker-compose.dev.yml up -d

# Wait for containers to be ready
docker-compose logs -f postgres

# Run database migrations
npm run migrate

# Optional: Seed with sample data
npm run seed
```

#### Using Local Installation
```bash
# Install PostgreSQL and Redis locally
# macOS
brew install postgresql redis
brew services start postgresql
brew services start redis

# Ubuntu
sudo apt update
sudo apt install postgresql postgresql-contrib redis-server
sudo systemctl start postgresql
sudo systemctl start redis-server

# Create database and user
sudo -u postgres psql
postgres=# CREATE DATABASE dating_optimizer_dev;
postgres=# CREATE USER dating_dev WITH PASSWORD 'dating_dev_password';
postgres=# GRANT ALL PRIVILEGES ON DATABASE dating_optimizer_dev TO dating_dev;
postgres=# \q

# Run migrations
cd backend
npm run migrate
```

### Step 4: External Service Configuration

#### OpenAI API Setup
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Create account and generate API key
3. Add credit to account (minimum $5 recommended)
4. Copy API key to `.env` file

#### Azure Computer Vision Setup
1. Visit [Azure Portal](https://portal.azure.com/)
2. Create Computer Vision resource
3. Copy API key and endpoint to `.env` file

#### Stripe Setup (Test Mode)
1. Visit [Stripe Dashboard](https://dashboard.stripe.com/)
2. Switch to "Test Mode"
3. Get publishable and secret keys from API keys section
4. Set up webhook endpoint for local development:
   ```bash
   # Install Stripe CLI
   brew install stripe/stripe-cli/stripe
   
   # Login to Stripe
   stripe login
   
   # Forward webhook events to local server
   stripe listen --forward-to localhost:3002/api/v1/webhooks/stripe
   ```

#### Cloudinary Setup
1. Visit [Cloudinary Console](https://cloudinary.com/console)
2. Create account and get API credentials
3. Create upload preset for development
4. Copy credentials to `.env` file

### Step 5: Development Tools Configuration

#### VS Code Extensions (Recommended)
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-json",
    "ms-python.python",
    "ms-vscode.vscode-docker",
    "humao.rest-client",
    "ckolkman.vscode-postgres",
    "ms-vscode-remote.remote-containers"
  ]
}
```

#### VS Code Settings
Create `.vscode/settings.json`:
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/android/build/**": true,
    "**/ios/build/**": true,
    "**/ios/Pods/**": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/android/build": true,
    "**/ios/build": true,
    "**/ios/Pods": true
  },
  "emmet.includeLanguages": {
    "javascript": "javascriptreact",
    "typescript": "typescriptreact"
  }
}
```

#### Flipper Configuration (React Native Debugging)
```bash
# Install Flipper
# macOS
brew install --cask flipper

# Windows/Linux
# Download from https://fbflipper.com/

# Enable Flipper in your React Native app (already configured)
# Start Flipper and connect your device/emulator
```

## 🔧 Development Workflow

### Daily Development Commands

#### Backend Development
```bash
# Start backend in development mode
cd backend
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run database migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback

# Reset database and reseed
npm run db:reset
npm run seed

# Check code quality
npm run lint
npm run type-check

# Generate API documentation
npm run docs:generate
```

#### Mobile App Development
```bash
# Start Metro bundler
cd DatingProfileOptimizer
npm start

# Run on iOS simulator (macOS only)
npm run ios

# Run on specific iOS simulator
npm run ios -- --simulator="iPhone 14 Pro"

# Run on Android emulator
npm run android

# Run on physical device
npm run android -- --device

# Clear Metro cache
npm start -- --reset-cache

# Generate APK for testing
cd android
./gradlew assembleDebug

# Build iOS for device testing (requires Apple Developer account)
npx react-native run-ios --device --configuration Debug
```

### Testing Workflow

#### Backend Testing
```bash
cd backend

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- --testPathPattern=auth.test.js

# Run tests in watch mode
npm run test:watch

# Run integration tests
npm run test:integration

# Run security tests
npm run test:security

# Run performance tests
npm run test:performance
```

#### Mobile App Testing
```bash
cd DatingProfileOptimizer

# Run unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Run E2E tests (iOS)
npm run test:e2e:ios

# Run E2E tests (Android)
npm run test:e2e:android

# Run component tests
npm run test:component

# Run specific test
npm test -- PhotoAnalysisScreen.test.tsx
```

### Debugging Setup

#### Backend Debugging
```bash
# Debug with VS Code
# Add to .vscode/launch.json:
{
  "type": "node",
  "request": "launch",
  "name": "Debug Backend",
  "program": "${workspaceFolder}/backend/src/app.js",
  "env": {
    "NODE_ENV": "development"
  },
  "envFile": "${workspaceFolder}/backend/.env",
  "console": "integratedTerminal",
  "restart": true,
  "runtimeExecutable": "nodemon",
  "skipFiles": ["<node_internals>/**"]
}
```

#### React Native Debugging
```bash
# Enable debugging in development builds
# Shake device or Cmd+D (iOS) / Cmd+M (Android)
# Select "Debug" -> "Open Debugger"

# Use React Developer Tools
npm install -g react-devtools
react-devtools

# Use Flipper for network debugging, databases, etc.
# Flipper is automatically configured
```

### Code Quality and Standards

#### Pre-commit Hooks Setup
```bash
# Install Husky and lint-staged (already configured)
# Hooks will run automatically on git commit

# Manual code quality checks
npm run lint
npm run type-check
npm run test:coverage
npm run audit:security
```

#### Code Formatting
```bash
# Format all files
npm run format

# Check formatting
npm run format:check

# Lint and fix
npm run lint:fix
```

## 🐳 Docker Development Environment

### Complete Docker Setup
```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose logs -f backend

# Rebuild containers after changes
docker-compose build backend

# Reset volumes and restart
docker-compose down -v
docker-compose up -d

# Execute commands in containers
docker-compose exec backend npm run migrate
docker-compose exec postgres psql -U dating_dev -d dating_optimizer_dev
```

### Docker Development Configuration
Create `docker-compose.dev.yml`:
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:13-alpine
    environment:
      POSTGRES_DB: dating_optimizer_dev
      POSTGRES_USER: dating_dev
      POSTGRES_PASSWORD: dating_dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data
      - ./backend/db/init.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_dev_data:/data

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=development
    volumes:
      - ./backend:/app
      - /app/node_modules
    depends_on:
      - postgres
      - redis
    command: npm run dev

volumes:
  postgres_dev_data:
  redis_dev_data:
```

## 🔍 Monitoring and Debugging

### Development Monitoring Tools

#### Application Monitoring
```bash
# Monitor API requests
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3002/api/v1/health

# Monitor database connections
docker exec -it dating-postgres psql -U dating_dev -d dating_optimizer_dev -c "SELECT * FROM pg_stat_activity;"

# Monitor Redis
docker exec -it dating-redis redis-cli monitor
```

#### Performance Monitoring
```bash
# Check memory usage
docker stats --no-stream

# Monitor file changes
cd backend
npx nodemon --inspect src/app.js

# Profile React Native performance
# Use Flipper's Performance plugin
```

### Logging Configuration

#### Backend Logging
```javascript
// backend/src/config/logger.js is configured for development
// Logs are output to console and file
// Log levels: error, warn, info, debug
```

#### Mobile App Logging
```javascript
// Using react-native-logs for development
// Logs are visible in Metro console and Flipper
```

## 🚀 Production Deployment Preparation

### Environment-Specific Configurations

#### Staging Environment
```bash
# Create staging environment file
cp .env .env.staging

# Update staging-specific values
NODE_ENV=staging
API_BASE_URL=https://staging-api.datingoptimizer.com
```

#### Production Checklist
- [ ] Replace all development API keys with production keys
- [ ] Configure production database with SSL
- [ ] Set up production CDN for image storage
- [ ] Configure production analytics
- [ ] Enable SSL certificate
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategies
- [ ] Review security configurations
- [ ] Test all payment flows
- [ ] Verify mobile app signing certificates

### Build and Deploy Commands

#### Backend Production Build
```bash
# Build for production
npm run build

# Test production build locally
NODE_ENV=production node dist/app.js

# Docker production build
docker build -t dating-optimizer-backend -f Dockerfile.prod .
```

#### Mobile App Production Build
```bash
# Android production build
cd android
./gradlew assembleRelease

# iOS production build (macOS only)
cd ios
xcodebuild -workspace DatingProfileOptimizer.xcworkspace \
           -scheme DatingProfileOptimizer \
           -configuration Release \
           archive
```

## 📞 Development Support

### Troubleshooting Common Issues

#### Node.js Version Issues
```bash
# Use Node Version Manager (nvm)
# Install nvm first, then:
nvm install 18
nvm use 18
nvm alias default 18
```

#### Port Conflicts
```bash
# Find and kill processes using ports
lsof -ti:3002 | xargs kill -9
lsof -ti:5432 | xargs kill -9
```

#### React Native Metro Issues
```bash
# Clear all caches
cd DatingProfileOptimizer
rm -rf node_modules
npm install
npx react-native start --reset-cache
cd ios && rm -rf Pods && pod install && cd ..
```

### Getting Help

- **Internal Documentation**: Check `/docs` directory
- **Team Chat**: Slack #dating-optimizer-dev
- **Code Reviews**: Create PR and request review
- **Technical Issues**: Create GitHub issue with detailed description
- **Architecture Questions**: Schedule meeting with tech lead

### Development Resources

- **API Documentation**: http://localhost:3002/docs
- **Database Schema**: Available in `/docs/database`
- **Component Library**: Storybook at http://localhost:6006
- **Testing Guidelines**: `/docs/testing.md`
- **Security Guidelines**: `/docs/security.md`

---

## ✅ Setup Verification Checklist

Run this checklist to verify your development environment:

```bash
# 1. Check Node.js version
node --version  # Should be 18.x or 20.x

# 2. Check npm version
npm --version   # Should be 8.x+

# 3. Verify React Native CLI
npx react-native --version

# 4. Test database connection
cd backend && npm run migrate

# 5. Start backend server
npm run dev  # Should start on port 3002

# 6. Test API endpoint
curl http://localhost:3002/api/v1/health

# 7. Start mobile app
cd ../DatingProfileOptimizer
npm start

# 8. Run tests
npm test

# 9. Check code formatting
npm run lint

# 10. Verify Docker setup (optional)
docker-compose -f docker-compose.dev.yml up -d
```

🎉 **Congratulations! Your development environment is ready for building amazing dating profile optimization features!**