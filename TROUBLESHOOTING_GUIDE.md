# Comprehensive Troubleshooting Guide
## Dating Profile Optimizer & LinkedIn Headshot Generator

This guide provides detailed troubleshooting procedures for both applications, covering development, deployment, and production issues.

## 📋 Table of Contents
- [Quick Diagnostics](#quick-diagnostics)
- [Development Environment Issues](#development-environment-issues)
- [Mobile App Issues](#mobile-app-issues)
- [Backend API Issues](#backend-api-issues)
- [Database Issues](#database-issues)
- [External Service Issues](#external-service-issues)
- [Production Issues](#production-issues)
- [Performance Issues](#performance-issues)
- [Security Issues](#security-issues)
- [Monitoring & Debugging](#monitoring--debugging)

## ⚡ Quick Diagnostics

### System Health Check Script
```bash
#!/bin/bash
# health-check.sh - Run this first for quick diagnostics

echo "=== System Health Check ==="

# Check Node.js version
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# Check React Native CLI
if command -v react-native &> /dev/null; then
    echo "React Native CLI: $(react-native --version)"
else
    echo "❌ React Native CLI not installed"
fi

# Check Docker
if command -v docker &> /dev/null; then
    echo "Docker: $(docker --version)"
    echo "Docker Compose: $(docker-compose --version)"
else
    echo "❌ Docker not installed"
fi

# Check backend services
echo -e "\n=== Backend Services ==="
curl -s http://localhost:3002/api/v1/health && echo "✅ Dating Profile Optimizer API" || echo "❌ Dating Profile Optimizer API"
curl -s http://localhost:3001/api/v1/health && echo "✅ LinkedIn Headshot Generator API" || echo "❌ LinkedIn Headshot Generator API"

# Check databases
echo -e "\n=== Database Connectivity ==="
if command -v psql &> /dev/null; then
    pg_isready -h localhost -p 5432 && echo "✅ PostgreSQL" || echo "❌ PostgreSQL"
else
    echo "❌ PostgreSQL client not available"
fi

if command -v redis-cli &> /dev/null; then
    redis-cli ping && echo "✅ Redis" || echo "❌ Redis"
else
    echo "❌ Redis CLI not available"
fi

# Check ports
echo -e "\n=== Port Status ==="
lsof -i :3001 > /dev/null && echo "✅ Port 3001 (LinkedIn Headshot)" || echo "❌ Port 3001"
lsof -i :3002 > /dev/null && echo "✅ Port 3002 (Dating Optimizer)" || echo "❌ Port 3002"
lsof -i :5432 > /dev/null && echo "✅ Port 5432 (PostgreSQL)" || echo "❌ Port 5432"
lsof -i :6379 > /dev/null && echo "✅ Port 6379 (Redis)" || echo "❌ Port 6379"

echo -e "\n=== Health Check Complete ==="
```

### Environment Validation
```bash
# validate-environment.sh
#!/bin/bash

echo "=== Environment Validation ==="

# Check required environment variables for Dating Profile Optimizer
DATING_REQUIRED_VARS=(
    "OPENAI_API_KEY"
    "STRIPE_SECRET_KEY"
    "DATABASE_URL"
    "JWT_SECRET"
)

echo "Dating Profile Optimizer Environment:"
for var in "${DATING_REQUIRED_VARS[@]}"; do
    if [[ -n "${!var}" ]]; then
        echo "✅ $var is set"
    else
        echo "❌ $var is missing"
    fi
done

# Check required environment variables for LinkedIn Headshot Generator
LINKEDIN_REQUIRED_VARS=(
    "REPLICATE_API_TOKEN"
    "REVENUECAT_API_KEY_IOS"
    "CLOUDINARY_API_SECRET"
    "DATABASE_URL"
)

echo -e "\nLinkedIn Headshot Generator Environment:"
for var in "${LINKEDIN_REQUIRED_VARS[@]}"; do
    if [[ -n "${!var}" ]]; then
        echo "✅ $var is set"
    else
        echo "❌ $var is missing"
    fi
done
```

## 🛠️ Development Environment Issues

### Node.js Version Issues
**Problem**: Wrong Node.js version causing build failures
```bash
# Check current version
node --version

# Expected: v18.x or v20.x
# If incorrect, install correct version:

# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
nvm alias default 18

# Verify installation
node --version
npm --version
```

### Package Installation Issues
**Problem**: npm install fails with dependency conflicts
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall dependencies
npm install

# If still failing, try legacy peer deps
npm install --legacy-peer-deps

# For iOS CocoaPods issues
cd ios
rm -rf Pods Podfile.lock
bundle install
bundle exec pod install --repo-update
cd ..
```

### Environment Variable Issues
**Problem**: Environment variables not loading
```bash
# Check if .env file exists and is properly formatted
ls -la .env
cat .env

# Ensure no spaces around = in .env file
# Wrong: API_KEY = your_key
# Correct: API_KEY=your_key

# Verify environment variables are loaded
node -e "console.log(process.env.API_KEY)"

# For React Native, ensure react-native-config is properly linked
cd ios && pod install && cd ..
```

### Metro Bundler Issues
**Problem**: Metro bundler fails to start or bundle
```bash
# Reset Metro cache
npx react-native start --reset-cache

# Clear all caches
rm -rf node_modules
npm install
rm -rf /tmp/metro-*
rm -rf /tmp/react-*

# Restart Metro with verbose logging
npx react-native start --verbose

# If watchman issues on macOS
brew install watchman
watchman watch-del-all
```

## 📱 Mobile App Issues

### iOS Build Issues

#### CocoaPods Problems
```bash
# Common CocoaPods fixes
cd ios

# Clean CocoaPods installation
rm -rf Pods Podfile.lock ~/Library/Caches/CocoaPods
rm -rf ~/Library/Developer/Xcode/DerivedData

# Reinstall CocoaPods
bundle install
bundle exec pod deintegrate
bundle exec pod install --repo-update

# If still failing, try verbose installation
bundle exec pod install --verbose

# Check for conflicts
bundle exec pod outdated
```

#### Xcode Build Errors
```bash
# Clean Xcode build
# In Xcode: Product -> Clean Build Folder (Cmd+Shift+K)

# Or via command line
cd ios
xcodebuild clean -workspace LinkedInHeadshotApp.xcworkspace -scheme LinkedInHeadshotApp

# Reset simulator
xcrun simctl erase all

# Check Xcode command line tools
xcode-select --install
```

#### iOS Simulator Issues
```bash
# Reset simulator
xcrun simctl shutdown all
xcrun simctl erase all

# List available simulators
xcrun simctl list devices

# Boot specific simulator
xcrun simctl boot "iPhone 14 Pro"

# If simulator is unresponsive
sudo killall -9 com.apple.CoreSimulator.CoreSimulatorService
```

### Android Build Issues

#### Gradle Build Failures
```bash
# Navigate to Android directory
cd android

# Clean Gradle build
./gradlew clean

# Check Gradle daemon
./gradlew --stop
./gradlew --daemon

# Rebuild project
./gradlew assembleDebug --stacktrace --debug

# Clear Gradle cache
rm -rf ~/.gradle/caches
rm -rf .gradle
```

#### Android SDK Issues
```bash
# Check Android SDK path
echo $ANDROID_HOME
echo $ANDROID_SDK_ROOT

# Should point to Android SDK location
# macOS example: /Users/username/Library/Android/sdk
# Add to ~/.zshrc or ~/.bash_profile:
export ANDROID_HOME=/path/to/android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools

# Reload shell configuration
source ~/.zshrc
```

#### Android Emulator Issues
```bash
# List available emulators
emulator -list-avds

# Start emulator from command line
emulator -avd Pixel_4_API_31 -no-boot-anim

# Check emulator status
adb devices

# If emulator not responding
adb kill-server
adb start-server

# Clear emulator data
emulator -avd Pixel_4_API_31 -wipe-data
```

### React Native Runtime Issues

#### JavaScript Bundle Issues
```bash
# Check bundle loading
npx react-native log-ios    # For iOS
npx react-native log-android # For Android

# Debug bundle loading issues
# Enable remote debugging in development menu
# Shake device/simulator -> Debug -> Debug with Chrome

# Check bundle size
npx react-native bundle \
  --platform ios \
  --dev false \
  --entry-file index.js \
  --bundle-output main.jsbundle \
  --assets-dest ./assets

ls -lh main.jsbundle
```

#### Bridge Communication Issues
```bash
# Monitor React Native bridge
# Enable Performance Monitor in dev menu
# Shake device -> Show Perf Monitor

# Check native module linking
npx react-native info

# Manually link native modules (if needed)
npx react-native link

# For auto-linking issues, check metro.config.js
```

## 🖥️ Backend API Issues

### Server Startup Issues

#### Port Already in Use
```bash
# Find process using port
lsof -ti:3001 # or 3002
lsof -i :3001

# Kill process using port
lsof -ti:3001 | xargs kill -9

# Or use fuser (Linux)
fuser -k 3001/tcp
```

#### Database Connection Issues
```bash
# Test PostgreSQL connection
psql $DATABASE_URL

# If connection fails, check:
# 1. Database server is running
docker-compose ps postgres

# 2. Connection string format
# postgresql://username:password@host:port/database

# 3. Firewall/network issues
telnet localhost 5432

# Test connection programmatically
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()', (err, res) => {
  console.log(err ? err : res.rows[0]);
  pool.end();
});
"
```

#### Environment Variables Not Loading
```bash
# Check if .env file is in correct location
ls -la backend/.env

# Test environment variable loading
node -e "
require('dotenv').config();
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
"

# Check for syntax errors in .env
cat backend/.env | grep -v '^#' | grep '='
```

### API Response Issues

#### Slow Response Times
```bash
# Monitor API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3001/api/v1/health

# Create curl-format.txt:
cat > curl-format.txt << 'EOF'
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
EOF

# Check database query performance
psql $DATABASE_URL -c "
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
"
```

#### Authentication Failures
```bash
# Test JWT token generation
node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign({ userId: 'test' }, process.env.JWT_SECRET);
console.log('Generated token:', token);
const decoded = jwt.verify(token, process.env.JWT_SECRET);
console.log('Decoded token:', decoded);
"

# Test API endpoint authentication
TOKEN="your_jwt_token_here"
curl -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     http://localhost:3001/api/v1/users/profile
```

#### Rate Limiting Issues
```bash
# Test rate limiting
for i in {1..10}; do
  echo "Request $i:"
  curl -I http://localhost:3001/api/v1/auth/login
  sleep 1
done

# Check Redis for rate limit keys
redis-cli keys "rate_limit:*"
redis-cli ttl "rate_limit:user:endpoint"
```

## 🗄️ Database Issues

### Connection Issues
```bash
# Test PostgreSQL connectivity
pg_isready -h localhost -p 5432 -U postgres

# Connect to database
psql -h localhost -p 5432 -U postgres -d dating_optimizer_dev

# Check connection limits
psql -c "SELECT * FROM pg_stat_activity;"
psql -c "SHOW max_connections;"
psql -c "SELECT count(*) FROM pg_stat_activity;"
```

### Performance Issues
```bash
# Enable slow query logging
psql -c "ALTER SYSTEM SET log_min_duration_statement = 1000;" # Log queries > 1s
psql -c "SELECT pg_reload_conf();"

# Check slow queries
tail -f /var/log/postgresql/postgresql.log | grep "slow"

# Analyze query performance
psql -c "EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';"

# Check table statistics
psql -c "SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del FROM pg_stat_user_tables;"
```

### Migration Issues
```bash
# Check migration status
npm run migrate:status

# Run pending migrations
npm run migrate:latest

# If migration fails, check the error and rollback if needed
npm run migrate:rollback

# Create new migration
npm run migrate:make migration_name

# Reset database (development only)
npm run migrate:rollback:all
npm run migrate:latest
npm run seed:run
```

### Data Corruption Issues
```bash
# Check database integrity
psql -c "SELECT pg_database.datname, pg_database_size(pg_database.datname) AS size FROM pg_database;"

# Vacuum and analyze tables
psql -c "VACUUM ANALYZE;"

# Check for table corruption
psql -c "SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public';" | while read schema table; do
  psql -c "SELECT COUNT(*) FROM $schema.$table;" > /dev/null 2>&1
  if [ $? -ne 0 ]; then
    echo "❌ Table $schema.$table may be corrupted"
  else
    echo "✅ Table $schema.$table is okay"
  fi
done
```

## 🌐 External Service Issues

### OpenAI API Issues (Dating Profile Optimizer)
```bash
# Test OpenAI API connectivity
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     -H "Content-Type: application/json" \
     https://api.openai.com/v1/models

# Test chat completion
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "model": "gpt-4",
       "messages": [{"role": "user", "content": "Hello"}],
       "max_tokens": 10
     }' \
     https://api.openai.com/v1/chat/completions

# Check rate limits
curl -I -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models

# Look for headers:
# x-ratelimit-limit-requests
# x-ratelimit-remaining-requests
```

### Replicate AI Issues (LinkedIn Headshot Generator)
```bash
# Test Replicate API connectivity
curl -H "Authorization: Token $REPLICATE_API_TOKEN" \
     https://api.replicate.com/v1/models

# Test model prediction
curl -X POST \
  -H "Authorization: Token $REPLICATE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"version": "model_version", "input": {"image": "https://example.com/image.jpg"}}' \
  https://api.replicate.com/v1/predictions

# Check account usage
curl -H "Authorization: Token $REPLICATE_API_TOKEN" \
     https://api.replicate.com/v1/account
```

### Stripe Payment Issues
```bash
# Test Stripe API connectivity
curl -u $STRIPE_SECRET_KEY: \
     https://api.stripe.com/v1/payment_methods

# Test webhook endpoint
curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"test": "webhook"}' \
     http://localhost:3001/api/v1/webhooks/stripe

# Verify webhook signatures
stripe listen --forward-to localhost:3001/api/v1/webhooks/stripe
```

### Cloudinary Issues
```bash
# Test Cloudinary API
curl -X POST \
  -F "upload_preset=your_preset" \
  -F "file=@test_image.jpg" \
  https://api.cloudinary.com/v1_1/your_cloud_name/image/upload

# Check Cloudinary account usage
curl -u $CLOUDINARY_API_KEY:$CLOUDINARY_API_SECRET \
     https://api.cloudinary.com/v1_1/your_cloud_name/usage
```

## 🚀 Production Issues

### High CPU Usage
```bash
# Check CPU usage
top -p $(pgrep -f "node")
htop

# Node.js performance profiling
node --prof app.js
# After running, process the profile
node --prof-process isolate-0x*.log > profile.txt

# Monitor with PM2 (if using)
pm2 monit
pm2 logs --lines 100
```

### High Memory Usage
```bash
# Check memory usage
free -h
ps aux | grep node | sort -k 4 -nr

# Node.js heap dump
kill -USR2 $(pgrep -f "node")
# Or use clinic.js
npm install -g clinic
clinic doctor -- node app.js

# Kubernetes memory monitoring
kubectl top pods -n your-namespace
kubectl describe pod pod-name -n your-namespace
```

### Database Connection Pool Exhaustion
```bash
# Check active connections
psql -c "
SELECT state, count(*) 
FROM pg_stat_activity 
GROUP BY state;
"

# Check connection pool settings
grep -r "pool" config/database.js

# Increase connection limits (temporarily)
psql -c "ALTER SYSTEM SET max_connections = 200;"
psql -c "SELECT pg_reload_conf();"
```

### Disk Space Issues
```bash
# Check disk usage
df -h
du -sh /var/log/*
du -sh /tmp/*

# Clean up logs
sudo journalctl --vacuum-time=7d
sudo logrotate /etc/logrotate.conf

# Clean up Docker images
docker system prune -a
docker volume prune
```

## ⚡ Performance Issues

### Slow Database Queries
```bash
# Enable query logging
psql -c "SET log_statement = 'all';"
psql -c "SET log_min_duration_statement = 100;" # Log queries > 100ms

# Analyze slow queries
psql -c "
SELECT query, calls, total_time, mean_time, max_time, stddev_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
"

# Check missing indexes
psql -c "
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY n_distinct DESC;
"
```

### API Response Optimization
```bash
# Enable API response time logging
export DEBUG=express:*
node app.js

# Test API performance
ab -n 100 -c 10 http://localhost:3001/api/v1/health

# Monitor with clinic.js
npm install -g clinic
clinic flame -- node app.js
# Visit API endpoints, then Ctrl+C
# Opens flame graph in browser
```

### Mobile App Performance
```bash
# iOS Performance Profiling
# In Xcode: Product -> Profile -> Choose Time Profiler

# Android Performance Profiling
adb shell am start -n com.yourapp/com.yourapp.MainActivity --es "ReactNativeDevSup" true

# React Native Performance Monitor
# Enable Performance Monitor in dev menu
# Shake device -> Show Perf Monitor

# Bundle size analysis
npx react-native-bundle-visualizer
```

## 🔒 Security Issues

### SSL Certificate Issues
```bash
# Check certificate validity
openssl s_client -connect api.datingoptimizer.com:443 -servername api.datingoptimizer.com

# Check certificate expiration
echo | openssl s_client -connect api.datingoptimizer.com:443 -servername api.datingoptimizer.com 2>/dev/null | openssl x509 -noout -dates

# Renew Let's Encrypt certificates
certbot renew --dry-run
certbot renew --force-renewal
```

### Authentication Issues
```bash
# Check JWT token validity
node -e "
const jwt = require('jsonwebtoken');
const token = 'your_token_here';
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log('Token valid:', decoded);
} catch (err) {
  console.log('Token invalid:', err.message);
}
"

# Test biometric authentication (iOS)
# Check system logs for authentication errors
log stream --predicate 'subsystem contains "com.apple.LocalAuthentication"'
```

### API Security Issues
```bash
# Check for SQL injection vulnerabilities
sqlmap -u "http://localhost:3001/api/v1/endpoint?param=1" --batch --risk=3 --level=5

# Check for XSS vulnerabilities
# Use OWASP ZAP or similar tools

# Test rate limiting
for i in {1..100}; do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/api/v1/auth/login
done
```

## 📊 Monitoring & Debugging

### Application Monitoring
```bash
# Check application logs
tail -f logs/app.log
journalctl -u your-app -f

# Monitor with PM2
pm2 logs --lines 100 --timestamp
pm2 monit

# Kubernetes logging
kubectl logs -f deployment/your-app -n namespace
kubectl logs --previous pod-name -n namespace
```

### Database Monitoring
```bash
# Monitor database activity
psql -c "
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
"

# Check lock waits
psql -c "
SELECT blocked_locks.pid AS blocked_pid,
       blocked_activity.usename AS blocked_user,
       blocking_locks.pid AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query AS blocked_statement,
       blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
"
```

### Network Monitoring
```bash
# Monitor network connections
netstat -tuln | grep :3001
ss -tuln | grep :3001

# Monitor network traffic
sudo iftop -i eth0
sudo nethogs

# Check DNS resolution
nslookup api.datingoptimizer.com
dig api.datingoptimizer.com
```

### Performance Profiling
```bash
# CPU profiling with Node.js
node --prof app.js
node --prof-process isolate-*.log > profile.txt

# Memory profiling
node --inspect app.js
# Open Chrome DevTools -> Memory tab

# Continuous profiling with clinic.js
clinic doctor -- node app.js    # Overall performance
clinic flame -- node app.js     # CPU profiling
clinic bubbleprof -- node app.js # Event loop delay
```

## 🆘 Emergency Procedures

### Service Recovery
```bash
#!/bin/bash
# emergency-recovery.sh

echo "Starting emergency recovery procedure..."

# 1. Stop all services
docker-compose down

# 2. Backup current state
pg_dump $DATABASE_URL > emergency-backup-$(date +%Y%m%d-%H%M%S).sql

# 3. Check disk space
df -h

# 4. Clean temporary files
rm -rf /tmp/react-*
rm -rf /tmp/metro-*
docker system prune -f

# 5. Restart services
docker-compose up -d

# 6. Wait for services to be ready
sleep 30

# 7. Run health checks
curl -f http://localhost:3001/api/v1/health || echo "LinkedIn Headshot API failed"
curl -f http://localhost:3002/api/v1/health || echo "Dating Optimizer API failed"

echo "Emergency recovery procedure completed"
```

### Rollback Procedure
```bash
#!/bin/bash
# rollback.sh

VERSION_TO_ROLLBACK=$1

if [ -z "$VERSION_TO_ROLLBACK" ]; then
    echo "Usage: $0 <version_to_rollback_to>"
    exit 1
fi

echo "Rolling back to version: $VERSION_TO_ROLLBACK"

# Kubernetes rollback
kubectl rollout undo deployment/dating-optimizer-backend -n dating-optimizer --to-revision=$VERSION_TO_ROLLBACK
kubectl rollout undo deployment/linkedin-headshot-backend -n linkedin-headshot --to-revision=$VERSION_TO_ROLLBACK

# Wait for rollback to complete
kubectl rollout status deployment/dating-optimizer-backend -n dating-optimizer
kubectl rollout status deployment/linkedin-headshot-backend -n linkedin-headshot

echo "Rollback completed successfully"
```

## 📞 Getting Help

### Support Contacts
- **DevOps Team**: devops@yourcompany.com
- **Backend Team**: backend-team@yourcompany.com  
- **Mobile Team**: mobile-team@yourcompany.com
- **24/7 Support**: +1-XXX-XXX-XXXX

### Useful Resources
- **Status Page**: https://status.yourcompany.com
- **Documentation**: https://docs.yourcompany.com
- **Internal Wiki**: https://wiki.yourcompany.com
- **Slack Channels**: #devops-support, #backend-help, #mobile-help

### Creating Support Tickets
When creating a support ticket, include:
1. **Environment**: Development, Staging, or Production
2. **Application**: Dating Profile Optimizer or LinkedIn Headshot Generator
3. **Error Message**: Full error message and stack trace
4. **Steps to Reproduce**: Detailed steps
5. **Expected vs Actual**: What should happen vs what actually happens
6. **Logs**: Relevant log excerpts
7. **System Information**: OS, browser, device type

### Log Collection Script
```bash
#!/bin/bash
# collect-logs.sh

LOG_DIR="support-logs-$(date +%Y%m%d-%H%M%S)"
mkdir -p $LOG_DIR

echo "Collecting logs for support..."

# System information
uname -a > $LOG_DIR/system-info.txt
df -h > $LOG_DIR/disk-usage.txt
free -h > $LOG_DIR/memory-usage.txt

# Application logs
cp logs/*.log $LOG_DIR/ 2>/dev/null || echo "No application logs found"

# Docker logs
docker-compose logs > $LOG_DIR/docker-logs.txt 2>&1

# Kubernetes logs (if applicable)
kubectl logs -l app=dating-optimizer --tail=1000 > $LOG_DIR/k8s-dating-logs.txt 2>/dev/null
kubectl logs -l app=linkedin-headshot --tail=1000 > $LOG_DIR/k8s-linkedin-logs.txt 2>/dev/null

# Database logs
sudo tail -1000 /var/log/postgresql/postgresql*.log > $LOG_DIR/postgres-logs.txt 2>/dev/null

# Create archive
tar -czf $LOG_DIR.tar.gz $LOG_DIR
rm -rf $LOG_DIR

echo "Logs collected in: $LOG_DIR.tar.gz"
echo "Please attach this file to your support ticket"
```

---

**Document Version**: 1.0  
**Last Updated**: February 1, 2024  
**Next Review**: March 1, 2024

This troubleshooting guide covers the most common issues you may encounter. For issues not covered here, please contact the support team with detailed information about the problem.