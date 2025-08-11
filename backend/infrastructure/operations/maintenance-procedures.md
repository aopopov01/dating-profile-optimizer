# Maintenance Procedures - Dating Profile Optimizer

## Overview

This document outlines routine and scheduled maintenance procedures for the Dating Profile Optimizer platform. Regular maintenance ensures optimal performance, security, and reliability of the production environment.

## Table of Contents

1. [Maintenance Schedule](#maintenance-schedule)
2. [System Updates](#system-updates)
3. [Database Maintenance](#database-maintenance)
4. [Security Maintenance](#security-maintenance)
5. [Performance Optimization](#performance-optimization)
6. [Monitoring and Alerting](#monitoring-and-alerting)
7. [Capacity Planning](#capacity-planning)
8. [Documentation Updates](#documentation-updates)

## Maintenance Schedule

### Daily Maintenance (Automated)

#### System Health Checks (06:00 UTC)
```bash
#!/bin/bash
# daily-health-check.sh

LOG_FILE="/var/log/maintenance/daily-$(date +%Y%m%d).log"
exec > >(tee -a $LOG_FILE) 2>&1

echo "=== Daily Health Check - $(date) ==="

# Application Health
echo "Checking application health..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://api.datingoptimizer.com/health)
if [ $API_STATUS -eq 200 ]; then
    echo "✅ API is healthy"
else
    echo "❌ API health check failed (HTTP $API_STATUS)"
    # Send alert
    curl -X POST $SLACK_WEBHOOK_URL \
        -H 'Content-type: application/json' \
        --data '{"text":"❌ Daily health check failed: API returning '$API_STATUS'"}'
fi

# Database Health
echo "Checking database health..."
DB_CONNECTIONS=$(kubectl exec -n production deployment/postgres-master -- \
    psql -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null | tr -d ' ')
echo "Active database connections: $DB_CONNECTIONS"

if [ "$DB_CONNECTIONS" -gt 150 ]; then
    echo "⚠️ High database connection count: $DB_CONNECTIONS"
fi

# Redis Health
echo "Checking Redis health..."
REDIS_MEMORY=$(kubectl exec -n production deployment/redis-master -- \
    redis-cli info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
echo "Redis memory usage: $REDIS_MEMORY"

# Storage Usage
echo "Checking storage usage..."
kubectl exec -n production deployment/postgres-master -- \
    df -h /var/lib/postgresql/data | tail -1

# SSL Certificate Expiry
echo "Checking SSL certificate expiry..."
CERT_EXPIRY=$(openssl s_client -servername api.datingoptimizer.com \
    -connect api.datingoptimizer.com:443 </dev/null 2>/dev/null | \
    openssl x509 -noout -dates | grep "notAfter" | cut -d= -f2)
echo "SSL certificate expires: $CERT_EXPIRY"

echo "=== Daily Health Check Complete ==="
```

#### Log Rotation and Cleanup (02:00 UTC)
```bash
#!/bin/bash
# log-cleanup.sh

echo "=== Starting log cleanup - $(date) ==="

# Application logs
find /var/log/dating-optimizer -name "*.log" -mtime +7 -exec gzip {} \;
find /var/log/dating-optimizer -name "*.log.gz" -mtime +30 -delete

# System logs
journalctl --vacuum-time=30d
journalctl --vacuum-size=1G

# Docker logs
docker system prune -f --volumes --filter "until=24h"

# Nginx logs
find /var/log/nginx -name "*.log" -mtime +14 -exec gzip {} \;
find /var/log/nginx -name "*.log.gz" -mtime +90 -delete

echo "Log cleanup completed"
```

#### Backup Verification (03:00 UTC)
```bash
#!/bin/bash
# backup-verification.sh

echo "=== Backup Verification - $(date) ==="

# Check latest database backup
LATEST_BACKUP=$(aws s3 ls s3://dating-optimizer-backups/database/ | sort | tail -1)
echo "Latest database backup: $LATEST_BACKUP"

# Verify backup integrity
BACKUP_FILE=$(echo $LATEST_BACKUP | awk '{print $4}')
aws s3 cp "s3://dating-optimizer-backups/database/$BACKUP_FILE" /tmp/
pg_restore --list "/tmp/$BACKUP_FILE" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Backup integrity verified"
    rm "/tmp/$BACKUP_FILE"
else
    echo "❌ Backup integrity check failed"
    # Alert operations team
    curl -X POST $PAGERDUTY_URL \
        -H "Content-Type: application/json" \
        -d '{"service_key":"'$PAGERDUTY_BACKUP_KEY'","event_type":"trigger","description":"Backup integrity check failed"}'
fi

echo "Backup verification completed"
```

### Weekly Maintenance (Sunday 04:00 UTC)

#### Security Updates
```bash
#!/bin/bash
# weekly-security-updates.sh

echo "=== Weekly Security Updates - $(date) ==="

# Update package lists
apt update

# List available security updates
SECURITY_UPDATES=$(apt list --upgradable 2>/dev/null | grep -i security | wc -l)
echo "Available security updates: $SECURITY_UPDATES"

if [ $SECURITY_UPDATES -gt 0 ]; then
    echo "Security updates available:"
    apt list --upgradable 2>/dev/null | grep -i security
    
    # Apply security updates during maintenance window
    if [ "$(date +%u)" -eq 7 ] && [ "$(date +%H)" -eq 4 ]; then
        echo "Applying security updates..."
        unattended-upgrade
        
        # Restart services if required
        if [ -f /var/run/reboot-required ]; then
            echo "Reboot required - scheduling maintenance reboot"
            # Schedule controlled restart
            kubectl drain $NODE_NAME --ignore-daemonsets --delete-emptydir-data
            reboot
        fi
    fi
fi

echo "Security update check completed"
```

#### Performance Analysis
```bash
#!/bin/bash
# weekly-performance-analysis.sh

echo "=== Weekly Performance Analysis - $(date) ==="

REPORT_FILE="/tmp/performance-report-$(date +%Y%m%d).json"

# Collect metrics from the past week
cat > /tmp/prometheus-queries.txt << EOF
# Average response time
avg_response_time=avg_over_time(histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))[7d:1h])
# Error rate
error_rate=avg_over_time((rate(http_requests_total{code!~"2.."}[5m]) / rate(http_requests_total[5m]))[7d:1h]) * 100
# Request volume
request_volume=avg_over_time(rate(http_requests_total[5m])[7d:1h])
# Database response time
db_response_time=avg_over_time(postgres_query_duration_seconds[7d:1h])
# Memory utilization
memory_utilization=avg_over_time((nodejs_memory_usage_bytes / nodejs_memory_limit_bytes)[7d:1h]) * 100
EOF

# Query Prometheus and generate report
{
    echo "{"
    echo "  \"week_ending\": \"$(date -d 'last sunday' +%Y-%m-%d)\","
    echo "  \"metrics\": {"
    
    while IFS='=' read -r metric_name query; do
        if [[ $metric_name =~ ^#.*$ ]]; then continue; fi
        value=$(curl -s "http://prometheus:9090/api/v1/query" \
            --data-urlencode "query=$query" | jq -r '.data.result[0].value[1] // "null"')
        echo "    \"$metric_name\": $value,"
    done < /tmp/prometheus-queries.txt | sed '$ s/,$//'
    
    echo "  }"
    echo "}"
} > $REPORT_FILE

# Analyze trends
CURRENT_RESPONSE_TIME=$(jq -r '.metrics.avg_response_time' $REPORT_FILE)
CURRENT_ERROR_RATE=$(jq -r '.metrics.error_rate' $REPORT_FILE)

if (( $(echo "$CURRENT_RESPONSE_TIME > 1.0" | bc -l) )); then
    echo "⚠️ High average response time: ${CURRENT_RESPONSE_TIME}s"
fi

if (( $(echo "$CURRENT_ERROR_RATE > 1.0" | bc -l) )); then
    echo "⚠️ High error rate: ${CURRENT_ERROR_RATE}%"
fi

# Archive report
aws s3 cp $REPORT_FILE s3://dating-optimizer-reports/performance/

echo "Performance analysis completed"
```

### Monthly Maintenance (First Sunday 02:00 UTC)

#### Certificate Renewal Check
```bash
#!/bin/bash
# monthly-certificate-check.sh

echo "=== Monthly Certificate Check - $(date) ==="

# Check all SSL certificates
DOMAINS=(
    "api.datingoptimizer.com"
    "monitoring.datingoptimizer.com"
    "admin.datingoptimizer.com"
)

for domain in "${DOMAINS[@]}"; do
    echo "Checking certificate for $domain..."
    
    expiry_date=$(echo | openssl s_client -servername $domain -connect $domain:443 2>/dev/null | \
        openssl x509 -noout -enddate | cut -d= -f2)
    
    expiry_epoch=$(date -d "$expiry_date" +%s)
    current_epoch=$(date +%s)
    days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))
    
    echo "  Certificate expires in $days_until_expiry days"
    
    if [ $days_until_expiry -lt 30 ]; then
        echo "  ⚠️ Certificate expires soon!"
        # Trigger renewal
        certbot renew --cert-name $domain
    fi
done

echo "Certificate check completed"
```

#### Database Statistics Update
```bash
#!/bin/bash
# monthly-database-maintenance.sh

echo "=== Monthly Database Maintenance - $(date) ==="

# Update statistics
kubectl exec -n production deployment/postgres-master -- \
    psql -c "ANALYZE;"

# Reindex if fragmentation is high
FRAGMENTATION=$(kubectl exec -n production deployment/postgres-master -- \
    psql -t -c "SELECT schemaname,tablename,attname,n_distinct,correlation 
                FROM pg_stats 
                WHERE schemaname = 'public';" | wc -l)

if [ $FRAGMENTATION -gt 1000 ]; then
    echo "High table fragmentation detected, running REINDEX..."
    kubectl exec -n production deployment/postgres-master -- \
        psql -c "REINDEX DATABASE dating_optimizer;"
fi

# Vacuum full on large tables (during maintenance window)
MAINTENANCE_WINDOW=$(date +%u-%H)
if [ "$MAINTENANCE_WINDOW" = "7-02" ]; then
    echo "Running VACUUM FULL during maintenance window..."
    kubectl exec -n production deployment/postgres-master -- \
        psql -c "VACUUM FULL;"
fi

# Check for unused indexes
echo "Checking for unused indexes..."
kubectl exec -n production deployment/postgres-master -- \
    psql -c "
    SELECT 
        schemaname,
        tablename,
        indexname,
        idx_tup_read,
        idx_tup_fetch
    FROM pg_stat_user_indexes 
    WHERE idx_tup_read = 0 
    AND idx_tup_fetch = 0;"

echo "Database maintenance completed"
```

## System Updates

### Container Image Updates

#### Automated Image Scanning
```bash
#!/bin/bash
# image-security-scan.sh

echo "=== Container Image Security Scan ==="

IMAGES=(
    "dating-optimizer-backend:latest"
    "nginx:1.25-alpine"
    "postgres:15-alpine"
    "redis:7-alpine"
)

for image in "${IMAGES[@]}"; do
    echo "Scanning $image..."
    
    # Scan with Trivy
    trivy image --severity HIGH,CRITICAL --format json $image > /tmp/scan-$image.json
    
    CRITICAL_COUNT=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity == "CRITICAL")] | length' /tmp/scan-$image.json)
    HIGH_COUNT=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity == "HIGH")] | length' /tmp/scan-$image.json)
    
    echo "  Critical vulnerabilities: $CRITICAL_COUNT"
    echo "  High vulnerabilities: $HIGH_COUNT"
    
    if [ $CRITICAL_COUNT -gt 0 ]; then
        echo "  ❌ Critical vulnerabilities found in $image"
        # Create Jira ticket or send alert
        curl -X POST $JIRA_API_URL \
            -H "Authorization: Bearer $JIRA_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
                "fields": {
                    "project": {"key": "SEC"},
                    "summary": "Critical vulnerabilities in '$image'",
                    "description": "Found '$CRITICAL_COUNT' critical vulnerabilities",
                    "issuetype": {"name": "Security"}
                }
            }'
    fi
done

echo "Image security scan completed"
```

#### Staged Image Updates
```bash
#!/bin/bash
# staged-image-updates.sh

echo "=== Staged Image Updates ==="

# Update staging environment first
echo "Updating staging environment..."
helm upgrade dating-optimizer-staging ./infrastructure/helm \
    --namespace staging \
    --set image.tag=latest \
    --wait --timeout=600s

# Run integration tests on staging
echo "Running integration tests on staging..."
npm run test:integration:staging

if [ $? -eq 0 ]; then
    echo "✅ Staging tests passed"
    
    # Schedule production update during next maintenance window
    echo "Scheduling production update..."
    kubectl create job production-update-$(date +%Y%m%d) \
        --from=cronjob/production-updates \
        --schedule="0 4 * * 0"  # Next Sunday at 4 AM
else
    echo "❌ Staging tests failed - production update cancelled"
fi
```

### Operating System Updates

#### Automated Security Patching
```bash
#!/bin/bash
# automated-security-patching.sh

echo "=== Automated Security Patching ==="

# Configure unattended-upgrades
cat > /etc/apt/apt.conf.d/50unattended-upgrades << EOF
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}-security";
    "\${distro_id}ESMApps:\${distro_codename}-apps-security";
    "\${distro_id}ESM:\${distro_codename}-infra-security";
};

Unattended-Upgrade::Package-Blacklist {
    "kernel*";
    "docker*";
    "kubernetes*";
};

Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Remove-New-Unused-Dependencies "true";

Unattended-Upgrade::Mail "devops@datingoptimizer.com";
Unattended-Upgrade::MailOnlyOnError "true";
EOF

# Enable automatic updates
systemctl enable unattended-upgrades
systemctl start unattended-upgrades

echo "Automated security patching configured"
```

## Database Maintenance

### Daily Database Tasks

#### Connection Monitoring
```bash
#!/bin/bash
# db-connection-monitoring.sh

echo "=== Database Connection Monitoring ==="

# Check connection count
CURRENT_CONNECTIONS=$(kubectl exec -n production deployment/postgres-master -- \
    psql -t -c "SELECT count(*) FROM pg_stat_activity;" | tr -d ' ')
    
MAX_CONNECTIONS=$(kubectl exec -n production deployment/postgres-master -- \
    psql -t -c "SHOW max_connections;" | tr -d ' ')
    
CONNECTION_PERCENTAGE=$((CURRENT_CONNECTIONS * 100 / MAX_CONNECTIONS))

echo "Current connections: $CURRENT_CONNECTIONS / $MAX_CONNECTIONS ($CONNECTION_PERCENTAGE%)"

if [ $CONNECTION_PERCENTAGE -gt 80 ]; then
    echo "⚠️ High connection usage: $CONNECTION_PERCENTAGE%"
    
    # List top connection consumers
    kubectl exec -n production deployment/postgres-master -- \
        psql -c "
        SELECT 
            application_name, 
            count(*) as connections 
        FROM pg_stat_activity 
        GROUP BY application_name 
        ORDER BY connections DESC 
        LIMIT 10;"
fi

# Check for long-running queries
LONG_QUERIES=$(kubectl exec -n production deployment/postgres-master -- \
    psql -t -c "
    SELECT count(*) 
    FROM pg_stat_activity 
    WHERE state = 'active' 
    AND query_start < now() - interval '5 minutes';" | tr -d ' ')

if [ $LONG_QUERIES -gt 0 ]; then
    echo "⚠️ Long-running queries detected: $LONG_QUERIES"
    
    kubectl exec -n production deployment/postgres-master -- \
        psql -c "
        SELECT 
            pid,
            usename,
            application_name,
            query_start,
            query 
        FROM pg_stat_activity 
        WHERE state = 'active' 
        AND query_start < now() - interval '5 minutes'
        ORDER BY query_start;"
fi

echo "Database connection monitoring completed"
```

#### Slow Query Analysis
```bash
#!/bin/bash
# slow-query-analysis.sh

echo "=== Slow Query Analysis ==="

# Enable pg_stat_statements if not already enabled
kubectl exec -n production deployment/postgres-master -- \
    psql -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"

# Get top 10 slowest queries
echo "Top 10 slowest queries (by mean execution time):"
kubectl exec -n production deployment/postgres-master -- \
    psql -c "
    SELECT 
        query,
        calls,
        total_exec_time,
        mean_exec_time,
        rows
    FROM pg_stat_statements 
    ORDER BY mean_exec_time DESC 
    LIMIT 10;"

# Get most frequently executed queries
echo "Most frequently executed queries:"
kubectl exec -n production deployment/postgres-master -- \
    psql -c "
    SELECT 
        query,
        calls,
        total_exec_time,
        mean_exec_time
    FROM pg_stat_statements 
    ORDER BY calls DESC 
    LIMIT 10;"

# Reset statistics (weekly)
if [ "$(date +%u)" -eq 7 ]; then
    echo "Resetting pg_stat_statements (weekly reset)..."
    kubectl exec -n production deployment/postgres-master -- \
        psql -c "SELECT pg_stat_statements_reset();"
fi

echo "Slow query analysis completed"
```

### Weekly Database Tasks

#### Index Usage Analysis
```bash
#!/bin/bash
# index-usage-analysis.sh

echo "=== Index Usage Analysis ==="

# Check unused indexes
echo "Unused indexes (candidates for removal):"
kubectl exec -n production deployment/postgres-master -- \
    psql -c "
    SELECT 
        schemaname,
        tablename,
        indexname,
        idx_tup_read,
        idx_tup_fetch,
        pg_size_pretty(pg_relation_size(indexrelid)) as size
    FROM pg_stat_user_indexes 
    WHERE idx_tup_read = 0 
    AND idx_tup_fetch = 0
    AND pg_relation_size(indexrelid) > 1024*1024  -- Only show indexes > 1MB
    ORDER BY pg_relation_size(indexrelid) DESC;"

# Check index efficiency
echo "Index efficiency analysis:"
kubectl exec -n production deployment/postgres-master -- \
    psql -c "
    SELECT 
        schemaname,
        tablename,
        indexname,
        idx_tup_read,
        idx_tup_fetch,
        CASE 
            WHEN idx_tup_read = 0 THEN 0
            ELSE round((idx_tup_fetch::numeric / idx_tup_read::numeric) * 100, 2)
        END as hit_rate_percent
    FROM pg_stat_user_indexes
    WHERE idx_tup_read > 0
    ORDER BY hit_rate_percent DESC;"

# Check for duplicate indexes
echo "Checking for duplicate indexes..."
kubectl exec -n production deployment/postgres-master -- \
    psql -c "
    SELECT 
        pg_size_pretty(sum(pg_relation_size(idx))::bigint) as size,
        (array_agg(idx))[1] as idx1, 
        (array_agg(idx))[2] as idx2,
        (array_agg(idx))[3] as idx3,
        (array_agg(idx))[4] as idx4
    FROM (
        SELECT 
            indexrelid::regclass as idx, 
            (indrelid::regclass)::text as tbl,
            array_to_string(array_agg(attname), ',') as cols
        FROM pg_index 
        JOIN pg_attribute ON attrelid = indrelid AND attnum = ANY(indkey) 
        WHERE indrelid::regclass::text NOT LIKE 'pg_%'
        GROUP BY indexrelid, indrelid, indkey
    ) sub
    GROUP BY tbl, cols 
    HAVING count(*) > 1
    ORDER BY sum(pg_relation_size(idx)) DESC;"

echo "Index analysis completed"
```

#### Table Maintenance
```bash
#!/bin/bash
# table-maintenance.sh

echo "=== Table Maintenance ==="

# Check table sizes
echo "Largest tables:"
kubectl exec -n production deployment/postgres-master -- \
    psql -c "
    SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
        pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as indexes_size
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC 
    LIMIT 10;"

# Check table bloat
echo "Checking table bloat..."
kubectl exec -n production deployment/postgres-master -- \
    psql -c "
    SELECT 
        schemaname, 
        tablename, 
        n_dead_tup,
        n_live_tup,
        CASE 
            WHEN n_live_tup = 0 THEN 0
            ELSE round((n_dead_tup::numeric / n_live_tup::numeric) * 100, 2)
        END as bloat_percentage
    FROM pg_stat_user_tables 
    WHERE n_dead_tup > 1000
    ORDER BY bloat_percentage DESC;"

# Auto-vacuum settings check
echo "Auto-vacuum statistics:"
kubectl exec -n production deployment/postgres-master -- \
    psql -c "
    SELECT 
        schemaname,
        tablename,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze,
        vacuum_count,
        autovacuum_count
    FROM pg_stat_user_tables 
    ORDER BY last_autovacuum DESC NULLS LAST 
    LIMIT 10;"

echo "Table maintenance completed"
```

## Security Maintenance

### Daily Security Tasks

#### Security Event Monitoring
```bash
#!/bin/bash
# security-event-monitoring.sh

echo "=== Security Event Monitoring ==="

# Check for failed login attempts
echo "Failed login attempts (last 24 hours):"
FAILED_LOGINS=$(kubectl logs -n production deployment/dating-optimizer-production --since=24h | \
    grep -i "authentication failed" | wc -l)
echo "Total failed login attempts: $FAILED_LOGINS"

if [ $FAILED_LOGINS -gt 100 ]; then
    echo "⚠️ High number of failed login attempts detected"
    
    # Extract top attacking IPs
    kubectl logs -n production deployment/dating-optimizer-production --since=24h | \
        grep -i "authentication failed" | \
        grep -oE '\b[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\b' | \
        sort | uniq -c | sort -nr | head -10
fi

# Check for rate limiting events
echo "Rate limiting events (last 24 hours):"
RATE_LIMITED=$(kubectl logs -n production deployment/nginx --since=24h | \
    grep -i "rate.*limit" | wc -l)
echo "Total rate limiting events: $RATE_LIMITED"

# Check for suspicious user agent strings
echo "Suspicious user agents (last 24 hours):"
kubectl logs -n production deployment/nginx --since=24h | \
    grep -E "(bot|crawler|scanner|exploit)" | \
    grep -v "Googlebot\|Bingbot" | \
    wc -l

echo "Security event monitoring completed"
```

#### Vulnerability Scanning
```bash
#!/bin/bash
# daily-vulnerability-scan.sh

echo "=== Daily Vulnerability Scan ==="

# Scan running containers
echo "Scanning running containers..."
RUNNING_CONTAINERS=$(kubectl get pods -n production -o jsonpath='{.items[*].spec.containers[*].image}' | tr ' ' '\n' | sort -u)

for container in $RUNNING_CONTAINERS; do
    echo "Scanning $container..."
    trivy image --severity HIGH,CRITICAL --quiet $container | \
        grep -E "(HIGH|CRITICAL)" | wc -l
done

# Check for security updates
echo "Checking for security updates..."
apt list --upgradable 2>/dev/null | grep -i security | wc -l

# SSL certificate validation
echo "Validating SSL certificates..."
DOMAINS=("api.datingoptimizer.com" "monitoring.datingoptimizer.com")

for domain in "${DOMAINS[@]}"; do
    echo "Checking $domain..."
    echo | openssl s_client -servername $domain -connect $domain:443 2>/dev/null | \
        openssl x509 -noout -dates | grep "notAfter"
done

echo "Vulnerability scan completed"
```

### Weekly Security Tasks

#### Access Review
```bash
#!/bin/bash
# weekly-access-review.sh

echo "=== Weekly Access Review ==="

# Review Kubernetes RBAC
echo "Current RBAC bindings:"
kubectl get rolebindings,clusterrolebindings -A -o wide

# Review AWS IAM access (if using AWS)
echo "Checking AWS access..."
aws iam list-users --query 'Users[*].[UserName,CreateDate]' --output table

# Review database user access
echo "Database users and their privileges:"
kubectl exec -n production deployment/postgres-master -- \
    psql -c "
    SELECT 
        usename,
        usesuper,
        usecreatedb,
        usebypassrls,
        valuntil
    FROM pg_user 
    ORDER BY usename;"

# Check for inactive users (last 30 days)
echo "Checking for inactive users..."
kubectl exec -n production deployment/postgres-master -- \
    psql -c "
    SELECT 
        usename,
        last_login
    FROM (
        SELECT 
            usename,
            max(backend_start) as last_login
        FROM pg_stat_activity 
        GROUP BY usename
    ) t
    WHERE last_login < now() - interval '30 days'
    OR last_login IS NULL;"

echo "Access review completed"
```

#### Security Configuration Audit
```bash
#!/bin/bash
# security-configuration-audit.sh

echo "=== Security Configuration Audit ==="

# Check firewall rules
echo "Current firewall rules:"
iptables -L -n

# Check SSH configuration
echo "SSH security settings:"
grep -E "^(PermitRootLogin|PasswordAuthentication|PubkeyAuthentication|MaxAuthTries)" /etc/ssh/sshd_config

# Check file permissions on sensitive files
echo "Checking sensitive file permissions..."
stat -c "%a %n" /etc/passwd /etc/shadow /etc/ssh/sshd_config

# Check running services
echo "Running services:"
systemctl list-units --type=service --state=running

# Check for setuid/setgid files
echo "Checking for new setuid/setgid files..."
find / -type f \( -perm -4000 -o -perm -2000 \) -exec ls -la {} \; 2>/dev/null | \
    grep -v -f /etc/security/known-setuid-files.txt

echo "Security configuration audit completed"
```

## Performance Optimization

### Daily Performance Monitoring
```bash
#!/bin/bash
# daily-performance-monitoring.sh

echo "=== Daily Performance Monitoring ==="

# Collect key metrics
RESPONSE_TIME_P95=$(curl -s "http://prometheus:9090/api/v1/query" \
    --data-urlencode 'query=histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))' | \
    jq -r '.data.result[0].value[1]')

ERROR_RATE=$(curl -s "http://prometheus:9090/api/v1/query" \
    --data-urlencode 'query=(rate(http_requests_total{code!~"2.."}[5m]) / rate(http_requests_total[5m])) * 100' | \
    jq -r '.data.result[0].value[1]')

REQUEST_RATE=$(curl -s "http://prometheus:9090/api/v1/query" \
    --data-urlencode 'query=rate(http_requests_total[5m])' | \
    jq -r '.data.result[0].value[1]')

echo "Performance Metrics:"
echo "  95th percentile response time: ${RESPONSE_TIME_P95}s"
echo "  Error rate: ${ERROR_RATE}%"
echo "  Request rate: ${REQUEST_RATE} RPS"

# Check if metrics exceed thresholds
if (( $(echo "$RESPONSE_TIME_P95 > 2.0" | bc -l) )); then
    echo "⚠️ High response time detected"
fi

if (( $(echo "$ERROR_RATE > 1.0" | bc -l) )); then
    echo "⚠️ High error rate detected"
fi

# Log to performance tracking file
echo "$(date),$RESPONSE_TIME_P95,$ERROR_RATE,$REQUEST_RATE" >> /var/log/performance-daily.csv

echo "Performance monitoring completed"
```

### Weekly Performance Analysis
```bash
#!/bin/bash
# weekly-performance-analysis.sh

echo "=== Weekly Performance Analysis ==="

# Generate performance report
REPORT_DATE=$(date +%Y-%m-%d)
REPORT_FILE="/tmp/performance-report-$REPORT_DATE.md"

cat > $REPORT_FILE << EOF
# Performance Report - Week Ending $REPORT_DATE

## Summary
This report covers performance metrics for the week ending $REPORT_DATE.

## Key Metrics
EOF

# Add metrics to report
echo "### Response Time Trends" >> $REPORT_FILE
curl -s "http://prometheus:9090/api/v1/query_range" \
    --data-urlencode 'query=histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))' \
    --data-urlencode 'start='$(date -d '7 days ago' '+%s') \
    --data-urlencode 'end='$(date '+%s') \
    --data-urlencode 'step=3600' | \
    jq -r '.data.result[0].values[] | "- " + (.[0] | strftime("%Y-%m-%d %H:%M")) + ": " + (.[1] | tonumber | . * 1000 | floor | tostring) + "ms"' \
    >> $REPORT_FILE

echo "### Error Rate Trends" >> $REPORT_FILE
curl -s "http://prometheus:9090/api/v1/query_range" \
    --data-urlencode 'query=(rate(http_requests_total{code!~"2.."}[5m]) / rate(http_requests_total[5m])) * 100' \
    --data-urlencode 'start='$(date -d '7 days ago' '+%s') \
    --data-urlencode 'end='$(date '+%s') \
    --data-urlencode 'step=3600' | \
    jq -r '.data.result[0].values[] | "- " + (.[0] | strftime("%Y-%m-%d %H:%M")) + ": " + (.[1] | tonumber | . | tostring) + "%"' \
    >> $REPORT_FILE

# Add recommendations
echo "### Recommendations" >> $REPORT_FILE
echo "Based on this week's analysis:" >> $REPORT_FILE

# Check for performance issues and add recommendations
CURRENT_P95=$(curl -s "http://prometheus:9090/api/v1/query" \
    --data-urlencode 'query=histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))' | \
    jq -r '.data.result[0].value[1]')

if (( $(echo "$CURRENT_P95 > 1.5" | bc -l) )); then
    echo "- Consider optimizing slow endpoints" >> $REPORT_FILE
    echo "- Review database query performance" >> $REPORT_FILE
fi

# Send report
aws s3 cp $REPORT_FILE s3://dating-optimizer-reports/performance/
echo "Performance report generated and uploaded"
```

## Monitoring and Alerting

### Alert Rule Validation
```bash
#!/bin/bash
# alert-rule-validation.sh

echo "=== Alert Rule Validation ==="

# Check Prometheus alert rules
echo "Validating Prometheus alert rules..."
promtool check rules /etc/prometheus/rules/*.yml

if [ $? -eq 0 ]; then
    echo "✅ Alert rules syntax is valid"
else
    echo "❌ Alert rules have syntax errors"
fi

# Test alert manager configuration
echo "Validating AlertManager configuration..."
amtool config check /etc/alertmanager/alertmanager.yml

if [ $? -eq 0 ]; then
    echo "✅ AlertManager configuration is valid"
else
    echo "❌ AlertManager configuration has errors"
fi

# Test notification channels
echo "Testing notification channels..."
# Send test alert to Slack
curl -X POST $SLACK_WEBHOOK_URL \
    -H 'Content-type: application/json' \
    --data '{"text":"Test alert from maintenance script - ' $(date) '"}'

echo "Alert validation completed"
```

### Dashboard Health Check
```bash
#!/bin/bash
# dashboard-health-check.sh

echo "=== Dashboard Health Check ==="

# Check Grafana health
GRAFANA_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://grafana:3000/api/health)

if [ $GRAFANA_HEALTH -eq 200 ]; then
    echo "✅ Grafana is healthy"
else
    echo "❌ Grafana health check failed (HTTP $GRAFANA_HEALTH)"
fi

# Check dashboard availability
DASHBOARDS=(
    "api-overview"
    "database-metrics"
    "system-metrics"
    "business-metrics"
)

for dashboard in "${DASHBOARDS[@]}"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $GRAFANA_API_TOKEN" \
        "http://grafana:3000/api/dashboards/db/$dashboard")
    
    if [ $STATUS -eq 200 ]; then
        echo "✅ Dashboard '$dashboard' is accessible"
    else
        echo "❌ Dashboard '$dashboard' is not accessible (HTTP $STATUS)"
    fi
done

echo "Dashboard health check completed"
```

## Capacity Planning

### Resource Utilization Analysis
```bash
#!/bin/bash
# resource-utilization-analysis.sh

echo "=== Resource Utilization Analysis ==="

# CPU utilization
CPU_USAGE=$(kubectl top nodes --no-headers | awk '{sum+=$2} END {print sum/NR}' | sed 's/%//')
echo "Average CPU usage across nodes: ${CPU_USAGE}%"

# Memory utilization
MEMORY_USAGE=$(kubectl top nodes --no-headers | awk '{gsub(/[GMK]i?/,"",$4); gsub(/[GMK]i?/,"",$6); sum+=$4; total+=$6} END {print (sum/total)*100}')
echo "Average memory usage across nodes: ${MEMORY_USAGE}%"

# Storage utilization
echo "Storage utilization per node:"
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.capacity.storage}{"\n"}{end}'

# Pod resource usage
echo "Top 10 CPU consuming pods:"
kubectl top pods -A --sort-by=cpu | head -10

echo "Top 10 memory consuming pods:"
kubectl top pods -A --sort-by=memory | head -10

# Predict resource needs
if (( $(echo "$CPU_USAGE > 70" | bc -l) )); then
    echo "⚠️ CPU usage is high - consider scaling"
fi

if (( $(echo "$MEMORY_USAGE > 80" | bc -l) )); then
    echo "⚠️ Memory usage is high - consider scaling"
fi

echo "Resource utilization analysis completed"
```

### Growth Trend Analysis
```bash
#!/bin/bash
# growth-trend-analysis.sh

echo "=== Growth Trend Analysis ==="

# Query historical data for growth trends
END_TIME=$(date +%s)
START_TIME=$((END_TIME - 86400 * 30))  # 30 days ago

# User growth
USER_GROWTH=$(curl -s "http://prometheus:9090/api/v1/query_range" \
    --data-urlencode 'query=user_registrations_total' \
    --data-urlencode "start=$START_TIME" \
    --data-urlencode "end=$END_TIME" \
    --data-urlencode 'step=86400' | \
    jq -r '.data.result[0].values | first[1], last[1]' | \
    awk 'NR==1{first=$1} NR==2{last=$1} END{print ((last-first)/first)*100}')

echo "User growth over last 30 days: ${USER_GROWTH}%"

# Request volume growth
REQUEST_GROWTH=$(curl -s "http://prometheus:9090/api/v1/query_range" \
    --data-urlencode 'query=rate(http_requests_total[1h])' \
    --data-urlencode "start=$START_TIME" \
    --data-urlencode "end=$END_TIME" \
    --data-urlencode 'step=86400' | \
    jq -r '.data.result[0].values | first[1], last[1]' | \
    awk 'NR==1{first=$1} NR==2{last=$1} END{print ((last-first)/first)*100}')

echo "Request volume growth over last 30 days: ${REQUEST_GROWTH}%"

# Predict future needs based on growth trends
echo "Capacity planning recommendations:"
if (( $(echo "$USER_GROWTH > 20" | bc -l) )); then
    echo "- Plan for increased user capacity (${USER_GROWTH}% growth)"
fi

if (( $(echo "$REQUEST_GROWTH > 30" | bc -l) )); then
    echo "- Plan for increased API capacity (${REQUEST_GROWTH}% growth)"
fi

echo "Growth trend analysis completed"
```

## Documentation Updates

### Infrastructure Documentation
```bash
#!/bin/bash
# update-infrastructure-docs.sh

echo "=== Updating Infrastructure Documentation ==="

# Generate current infrastructure inventory
cat > /tmp/infrastructure-inventory.md << EOF
# Infrastructure Inventory - $(date +%Y-%m-%d)

## Kubernetes Resources
### Deployments
$(kubectl get deployments -A -o wide)

### Services
$(kubectl get services -A -o wide)

### Ingresses
$(kubectl get ingresses -A -o wide)

## Database Information
### PostgreSQL
$(kubectl exec -n production deployment/postgres-master -- psql -c "SELECT version();")

Connection info:
$(kubectl exec -n production deployment/postgres-master -- psql -c "SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active';")

### Redis
$(kubectl exec -n production deployment/redis-master -- redis-cli info server | grep redis_version)

Memory usage:
$(kubectl exec -n production deployment/redis-master -- redis-cli info memory | grep used_memory_human)

## Load Balancers
$(aws elbv2 describe-load-balancers --query 'LoadBalancers[*].[LoadBalancerName,DNSName,State.Code]' --output table)

## SSL Certificates
$(echo | openssl s_client -servername api.datingoptimizer.com -connect api.datingoptimizer.com:443 2>/dev/null | openssl x509 -noout -dates)

## Monitoring Stack
- Prometheus: $(curl -s http://prometheus:9090/api/v1/status/buildinfo | jq -r '.data.version')
- Grafana: $(curl -s http://grafana:3000/api/health | jq -r '.version')
- AlertManager: $(curl -s http://alertmanager:9093/api/v1/status | jq -r '.data.versionInfo.version')
EOF

# Upload to documentation repository
aws s3 cp /tmp/infrastructure-inventory.md s3://dating-optimizer-docs/infrastructure/

echo "Infrastructure documentation updated"
```

### Runbook Updates
```bash
#!/bin/bash
# update-runbooks.sh

echo "=== Updating Runbooks ==="

# Check for outdated procedures
echo "Checking runbook currency..."
find /opt/runbooks -name "*.md" -mtime +90 -exec echo "Outdated runbook: {}" \;

# Validate runbook procedures
echo "Validating runbook procedures..."
for runbook in /opt/runbooks/*.md; do
    echo "Checking $runbook..."
    # Check for broken links
    grep -oE 'https?://[^)]*' "$runbook" | while read url; do
        if ! curl -s --head "$url" | head -1 | grep -q "200 OK"; then
            echo "  ❌ Broken link: $url"
        fi
    done
done

echo "Runbook updates completed"
```

---

**Document Information:**
- **Version:** 2.0  
- **Last Updated:** January 2024
- **Owner:** DevOps Team
- **Review Frequency:** Monthly
- **Next Review Date:** February 2024