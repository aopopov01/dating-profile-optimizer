# Deployment Runbook - Dating Profile Optimizer

## Overview

This runbook provides step-by-step procedures for deploying the Dating Profile Optimizer platform to production. It covers pre-deployment checks, deployment procedures, post-deployment validation, and rollback procedures.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Procedures](#deployment-procedures)
3. [Post-Deployment Validation](#post-deployment-validation)
4. [Rollback Procedures](#rollback-procedures)
5. [Troubleshooting](#troubleshooting)
6. [Emergency Procedures](#emergency-procedures)

## Pre-Deployment Checklist

### Code and Configuration Verification

#### 1. Code Review and Approval
- [ ] All code changes have been peer-reviewed
- [ ] Pull request has been approved by at least 2 reviewers
- [ ] Branch has been merged to `main` branch
- [ ] All CI/CD checks are passing
- [ ] Security scan results are clean (no critical/high vulnerabilities)

```bash
# Verify CI/CD status
gh workflow list --repo dating-profile-optimizer
gh run list --workflow="Production CI/CD Pipeline" --status=success --limit=1
```

#### 2. Database Migration Verification
- [ ] Migration scripts have been reviewed
- [ ] Migrations tested in staging environment
- [ ] Database backup scheduled before migration
- [ ] Migration rollback plan documented

```bash
# Check migration status
npm run migrate:dry-run
npm run migrate:status
```

#### 3. Environment Configuration
- [ ] Environment variables updated in secrets management
- [ ] Configuration changes documented
- [ ] Feature flags configured appropriately
- [ ] Third-party service integrations tested

```bash
# Verify environment configuration
kubectl get secrets -n production
kubectl get configmaps -n production
```

#### 4. Dependencies and External Services
- [ ] All external service dependencies are healthy
- [ ] API rate limits checked and sufficient
- [ ] CDN configuration updated if needed
- [ ] DNS changes propagated (if applicable)

```bash
# Check external service health
curl -f https://api.openai.com/v1/models
curl -f https://api.stripe.com/v1/charges
curl -f https://api.cloudinary.com/v1_1/health
```

### Infrastructure Readiness

#### 1. Resource Availability
- [ ] Sufficient compute resources available
- [ ] Storage capacity adequate for expected growth
- [ ] Database connections within limits
- [ ] Memory and CPU headroom confirmed

```bash
# Check resource utilization
kubectl top nodes
kubectl top pods -n production
```

#### 2. Monitoring and Alerting
- [ ] Monitoring systems are operational
- [ ] Alert channels are working
- [ ] On-call engineer identified and available
- [ ] Incident response team notified

```bash
# Verify monitoring stack health
curl -f http://prometheus:9090/-/healthy
curl -f http://grafana:3000/api/health
curl -f http://alertmanager:9093/-/healthy
```

#### 3. Load Balancing and Traffic Management
- [ ] Load balancers are healthy
- [ ] Target groups have healthy instances
- [ ] SSL certificates are valid and not expiring
- [ ] CDN configuration is optimal

```bash
# Check load balancer health
aws elbv2 describe-target-health --target-group-arn <TARGET_GROUP_ARN>
curl -I https://api.datingoptimizer.com/health
```

## Deployment Procedures

### Standard Deployment (Blue-Green)

#### Phase 1: Pre-Deployment (15 minutes)

1. **Notify Stakeholders**
```bash
# Send deployment start notification
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-type: application/json' \
  --data '{
    "text": "🚀 Starting production deployment",
    "attachments": [{
      "color": "warning",
      "fields": [
        {"title": "Version", "value": "'$BUILD_VERSION'", "short": true},
        {"title": "Engineer", "value": "'$DEPLOYER_NAME'", "short": true},
        {"title": "Expected Duration", "value": "30 minutes", "short": true}
      ]
    }]
  }'
```

2. **Create Database Backup**
```bash
# Create pre-deployment backup
kubectl create job backup-pre-deploy-$(date +%Y%m%d-%H%M%S) \
  --from=cronjob/postgres-backup -n production

# Wait for backup completion
kubectl wait --for=condition=complete job/backup-pre-deploy-$(date +%Y%m%d-%H%M%S) \
  -n production --timeout=600s
```

3. **Scale Up Resources (if needed)**
```bash
# Scale up for zero-downtime deployment
kubectl scale deployment dating-api --replicas=6 -n production
```

#### Phase 2: Deployment Execution (10 minutes)

1. **Deploy to Green Environment**
```bash
# Deploy new version to green environment
helm upgrade --install dating-optimizer-green ./infrastructure/helm \
  --namespace production \
  --set image.tag=$BUILD_VERSION \
  --set deployment.color=green \
  --set replicaCount=3 \
  --wait --timeout=600s
```

2. **Wait for Green Environment Readiness**
```bash
# Wait for green deployment to be ready
kubectl rollout status deployment/dating-optimizer-green -n production --timeout=300s
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=dating-optimizer-green \
  -n production --timeout=300s
```

3. **Run Health Checks on Green Environment**
```bash
# Internal health check
kubectl exec -n production deployment/dating-optimizer-green -- \
  curl -f http://localhost:3000/health

# Detailed health check
kubectl exec -n production deployment/dating-optimizer-green -- \
  curl -f http://localhost:3000/health/detailed
```

#### Phase 3: Traffic Cutover (5 minutes)

1. **Smoke Test Green Environment**
```bash
# Port forward for testing
kubectl port-forward -n production service/dating-optimizer-green 8080:80 &
KUBECTL_PID=$!

# Run smoke tests
curl -f http://localhost:8080/health
curl -f http://localhost:8080/api/health

# Clean up port forward
kill $KUBECTL_PID
```

2. **Update Load Balancer to Point to Green**
```bash
# Update ingress to point to green deployment
kubectl patch service dating-optimizer-production -n production \
  -p '{"spec":{"selector":{"app.kubernetes.io/instance":"dating-optimizer-green"}}}'

# Update ingress controller
kubectl patch ingress dating-optimizer-ingress -n production \
  -p '{"spec":{"rules":[{"host":"api.datingoptimizer.com","http":{"paths":[{"path":"/","pathType":"Prefix","backend":{"service":{"name":"dating-optimizer-green","port":{"number":80}}}}]}}]}}'
```

3. **Verify Traffic is Routing to Green**
```bash
# Check load balancer targets
aws elbv2 describe-target-health --target-group-arn $GREEN_TARGET_GROUP_ARN

# Test external access
for i in {1..5}; do
  curl -s -o /dev/null -w "%{http_code}" https://api.datingoptimizer.com/health
  echo " - Request $i"
  sleep 2
done
```

### Hot Fix Deployment

#### Emergency Hot Fix Procedure

1. **Assess Severity and Impact**
```bash
# Document the issue
ISSUE_ID=$(date +%Y%m%d-%H%M%S)
echo "HOTFIX-$ISSUE_ID: [Description]" >> /var/log/deployments.log
```

2. **Create Hot Fix Branch**
```bash
git checkout main
git pull origin main
git checkout -b hotfix/HOTFIX-$ISSUE_ID
# Make necessary changes
git add .
git commit -m "hotfix: [Description]"
git push origin hotfix/HOTFIX-$ISSUE_ID
```

3. **Fast-Track Deployment**
```bash
# Trigger emergency deployment workflow
gh workflow run "Emergency Hotfix Deployment" \
  -f branch=hotfix/HOTFIX-$ISSUE_ID \
  -f severity=critical
```

## Post-Deployment Validation

### Automated Validation

#### 1. System Health Checks
```bash
#!/bin/bash
# comprehensive-health-check.sh

echo "=== Running Post-Deployment Health Checks ==="

# API Health Check
echo "Checking API health..."
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://api.datingoptimizer.com/health)
if [ $API_HEALTH -eq 200 ]; then
  echo "✅ API health check passed"
else
  echo "❌ API health check failed (HTTP $API_HEALTH)"
  exit 1
fi

# Database Connectivity
echo "Checking database connectivity..."
DB_HEALTH=$(kubectl exec -n production deployment/dating-optimizer-production -- \
  node -e "
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    pool.query('SELECT 1')
      .then(() => { console.log('200'); process.exit(0); })
      .catch(() => { console.log('500'); process.exit(1); });
  " 2>/dev/null)
  
if [ "$DB_HEALTH" = "200" ]; then
  echo "✅ Database connectivity check passed"
else
  echo "❌ Database connectivity check failed"
  exit 1
fi

# Redis Connectivity
echo "Checking Redis connectivity..."
REDIS_HEALTH=$(kubectl exec -n production deployment/dating-optimizer-production -- \
  node -e "
    const Redis = require('ioredis');
    const redis = new Redis(process.env.REDIS_URL);
    redis.ping()
      .then(() => { console.log('200'); process.exit(0); })
      .catch(() => { console.log('500'); process.exit(1); });
  " 2>/dev/null)
  
if [ "$REDIS_HEALTH" = "200" ]; then
  echo "✅ Redis connectivity check passed"
else
  echo "❌ Redis connectivity check failed"
  exit 1
fi

# External Services
echo "Checking external service connectivity..."
OPENAI_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models)
  
if [ $OPENAI_STATUS -eq 200 ]; then
  echo "✅ OpenAI API connectivity check passed"
else
  echo "⚠️ OpenAI API connectivity check failed (HTTP $OPENAI_STATUS)"
fi

echo "=== Health checks completed ==="
```

#### 2. Performance Validation
```bash
#!/bin/bash
# performance-validation.sh

echo "=== Running Performance Validation ==="

# Response time check
echo "Measuring API response time..."
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" https://api.datingoptimizer.com/health)
RESPONSE_TIME_MS=$(echo "$RESPONSE_TIME * 1000" | bc)

if (( $(echo "$RESPONSE_TIME_MS < 1000" | bc -l) )); then
  echo "✅ Response time check passed (${RESPONSE_TIME_MS}ms)"
else
  echo "⚠️ Response time check warning (${RESPONSE_TIME_MS}ms > 1000ms)"
fi

# Load test
echo "Running basic load test..."
k6 run --vus 10 --duration 2m --quiet \
  /opt/scripts/production-load-test.js > load_test_results.json

SUCCESS_RATE=$(jq -r '.metrics.http_req_failed.rate' load_test_results.json)
AVG_RESPONSE_TIME=$(jq -r '.metrics.http_req_duration.avg' load_test_results.json)

if (( $(echo "$SUCCESS_RATE < 0.01" | bc -l) )); then
  echo "✅ Load test passed (${SUCCESS_RATE}% error rate)"
else
  echo "❌ Load test failed (${SUCCESS_RATE}% error rate)"
  exit 1
fi

echo "=== Performance validation completed ==="
```

### Manual Validation

#### 1. Critical User Flows
- [ ] User registration flow
- [ ] User login flow
- [ ] Photo upload and analysis
- [ ] Bio generation
- [ ] Subscription payment flow

#### 2. API Endpoint Testing
```bash
# Test critical endpoints
ACCESS_TOKEN="your-test-token"

# User profile endpoint
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  https://api.datingoptimizer.com/api/user/profile

# Photo analysis endpoint
curl -X POST -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "photo=@test-image.jpg" \
  https://api.datingoptimizer.com/api/photos/analyze

# Bio generation endpoint
curl -X POST -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"preferences": {"tone": "casual", "length": "medium"}}' \
  https://api.datingoptimizer.com/api/bio/generate
```

#### 3. Monitor Key Metrics
```bash
# Check key metrics via Prometheus API
PROMETHEUS_URL="http://prometheus:9090"

# Response time P95
P95_RESPONSE_TIME=$(curl -s "$PROMETHEUS_URL/api/v1/query" \
  --data-urlencode 'query=histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))' \
  | jq -r '.data.result[0].value[1]')

# Error rate
ERROR_RATE=$(curl -s "$PROMETHEUS_URL/api/v1/query" \
  --data-urlencode 'query=(rate(http_requests_total{code!~"2.."}[5m]) / rate(http_requests_total[5m])) * 100' \
  | jq -r '.data.result[0].value[1]')

# Request rate
REQUEST_RATE=$(curl -s "$PROMETHEUS_URL/api/v1/query" \
  --data-urlencode 'query=rate(http_requests_total[5m])' \
  | jq -r '.data.result[0].value[1]')

echo "P95 Response Time: ${P95_RESPONSE_TIME}s"
echo "Error Rate: ${ERROR_RATE}%"
echo "Request Rate: ${REQUEST_RATE} RPS"
```

## Rollback Procedures

### Automated Rollback

#### 1. Immediate Rollback (Emergency)
```bash
#!/bin/bash
# emergency-rollback.sh

echo "=== EMERGENCY ROLLBACK INITIATED ==="

# Get previous deployment
PREVIOUS_VERSION=$(helm history dating-optimizer-production -n production -o json | \
  jq -r '.[1].app_version')

echo "Rolling back to version: $PREVIOUS_VERSION"

# Rollback using Helm
helm rollback dating-optimizer-production -n production --wait --timeout=300s

# Verify rollback
kubectl rollout status deployment/dating-optimizer-production -n production --timeout=300s

# Switch traffic back to blue environment
kubectl patch service dating-optimizer-production -n production \
  -p '{"spec":{"selector":{"app.kubernetes.io/instance":"dating-optimizer-production"}}}'

echo "=== ROLLBACK COMPLETED ==="

# Notify team
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-type: application/json' \
  --data '{
    "text": "⚠️ EMERGENCY ROLLBACK EXECUTED",
    "attachments": [{
      "color": "danger",
      "fields": [
        {"title": "Rolled back to", "value": "'$PREVIOUS_VERSION'", "short": true},
        {"title": "Executed by", "value": "'$(whoami)'", "short": true}
      ]
    }]
  }'
```

#### 2. Database Rollback
```bash
#!/bin/bash
# database-rollback.sh

echo "=== DATABASE ROLLBACK INITIATED ==="

# Stop application traffic
kubectl scale deployment dating-optimizer-production --replicas=0 -n production

# Restore from backup
BACKUP_NAME="backup-pre-deploy-$(date +%Y%m%d)"
kubectl create job database-restore-$(date +%H%M%S) \
  --from=cronjob/postgres-restore -n production \
  --dry-run=client -o yaml | \
  sed "s/BACKUP_NAME_PLACEHOLDER/$BACKUP_NAME/" | \
  kubectl apply -f -

# Wait for restore completion
kubectl wait --for=condition=complete job/database-restore-$(date +%H%M%S) \
  -n production --timeout=1800s

# Restart application
kubectl scale deployment dating-optimizer-production --replicas=3 -n production

echo "=== DATABASE ROLLBACK COMPLETED ==="
```

### Manual Rollback Steps

#### 1. Identify Rollback Point
```bash
# List recent deployments
helm history dating-optimizer-production -n production

# Check Git history
git log --oneline -10 main

# Identify target version
TARGET_VERSION="v1.2.3"
```

#### 2. Execute Rollback
```bash
# Rollback application
helm rollback dating-optimizer-production $TARGET_REVISION -n production

# Verify application health
kubectl get pods -n production
kubectl rollout status deployment/dating-optimizer-production -n production

# Run health checks
curl -f https://api.datingoptimizer.com/health
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Deployment Stuck in Pending State

**Symptoms:**
- Pods remain in `Pending` state
- New instances not becoming healthy

**Diagnosis:**
```bash
kubectl describe pod <POD_NAME> -n production
kubectl get events -n production --sort-by=.metadata.creationTimestamp
```

**Solutions:**
1. Check resource constraints
2. Verify node availability
3. Check image pull secrets
4. Review resource quotas

#### 2. Health Checks Failing

**Symptoms:**
- Load balancer showing targets as unhealthy
- High error rates in monitoring

**Diagnosis:**
```bash
# Check application logs
kubectl logs deployment/dating-optimizer-production -n production --tail=100

# Check health endpoint directly
kubectl exec -n production deployment/dating-optimizer-production -- \
  curl -v http://localhost:3000/health
```

**Solutions:**
1. Review application startup time
2. Check database connectivity
3. Verify environment variables
4. Review dependency services

#### 3. Database Migration Issues

**Symptoms:**
- Migration jobs failing
- Database connection errors

**Diagnosis:**
```bash
# Check migration job logs
kubectl logs job/database-migration-$(date +%Y%m%d) -n production

# Test database connectivity
kubectl exec -n production deployment/dating-optimizer-production -- \
  psql $DATABASE_URL -c "SELECT version();"
```

**Solutions:**
1. Verify database credentials
2. Check migration syntax
3. Review database locks
4. Consider manual migration

### Performance Issues

#### 1. High Response Times

**Investigation Steps:**
```bash
# Check system metrics
kubectl top nodes
kubectl top pods -n production

# Check application metrics
curl -s "http://prometheus:9090/api/v1/query" \
  --data-urlencode 'query=histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))'

# Check database performance
kubectl exec -n production deployment/postgres-master -- \
  psql -c "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

#### 2. High Error Rates

**Investigation Steps:**
```bash
# Check error logs
kubectl logs deployment/dating-optimizer-production -n production --tail=100 | grep -i error

# Check external service status
curl -I https://api.openai.com
curl -I https://api.stripe.com

# Check rate limits
grep -i "rate limit" /var/log/nginx/error.log
```

## Emergency Procedures

### Incident Response

#### 1. Severity Classification

**Critical (P0):**
- Complete service outage
- Data corruption
- Security breach

**High (P1):**
- Significant degradation
- Core features unavailable
- Payment processing issues

**Medium (P2):**
- Partial feature degradation
- Performance issues
- Non-critical bugs

#### 2. Response Timeline

**P0 - Critical (15 minutes):**
1. Acknowledge incident (2 min)
2. Assemble incident team (5 min)
3. Initial assessment (8 min)

**P1 - High (30 minutes):**
1. Acknowledge incident (5 min)
2. Initial investigation (25 min)

**P2 - Medium (4 hours):**
1. Acknowledge incident (1 hour)
2. Scheduled investigation (3 hours)

#### 3. Emergency Contacts

```bash
# Emergency notification script
#!/bin/bash
SEVERITY="$1"
MESSAGE="$2"

case $SEVERITY in
  P0)
    # Critical - Call everyone
    curl -X POST $PAGERDUTY_CRITICAL_URL -d "{\"incident_key\":\"$(date +%s)\",\"description\":\"$MESSAGE\"}"
    curl -X POST $SLACK_EMERGENCY_WEBHOOK -d "{\"text\":\"🚨 CRITICAL: $MESSAGE\"}"
    ;;
  P1)
    # High - Slack + PagerDuty
    curl -X POST $PAGERDUTY_HIGH_URL -d "{\"incident_key\":\"$(date +%s)\",\"description\":\"$MESSAGE\"}"
    curl -X POST $SLACK_ALERTS_WEBHOOK -d "{\"text\":\"⚠️ HIGH: $MESSAGE\"}"
    ;;
  P2)
    # Medium - Slack only
    curl -X POST $SLACK_ALERTS_WEBHOOK -d "{\"text\":\"⚡ MEDIUM: $MESSAGE\"}"
    ;;
esac
```

### Communication Templates

#### Incident Notification
```
INCIDENT ALERT: Dating Profile Optimizer

Severity: [P0/P1/P2]
Status: [Investigating/Identified/Monitoring/Resolved]
Impact: [Description of user impact]

Current Status:
[Brief description of current situation]

Next Update: [Time]

Incident Commander: [Name]
```

#### Resolution Notification
```
INCIDENT RESOLVED: Dating Profile Optimizer

Duration: [Start time] - [End time]
Root Cause: [Brief description]

Resolution:
[What was done to resolve]

Post-Incident Actions:
- [ ] Post-mortem scheduled
- [ ] Documentation updates
- [ ] Process improvements

Thank you for your patience during this incident.
```

---

**Document Information:**
- **Version:** 2.0
- **Last Updated:** January 2024
- **Owner:** DevOps Team
- **Review Frequency:** Monthly