# Dating Profile Optimizer - Production Infrastructure

## Overview

This directory contains the complete production deployment infrastructure for the Dating Profile Optimizer platform. The infrastructure is designed for high availability, scalability, and security in cloud environments (AWS/DigitalOcean).

## Architecture

The Dating Profile Optimizer uses a modern, cloud-native architecture:

```
Internet
    │
    ▼
┌───────────────┐
│  Cloudflare   │ ← CDN & DDoS Protection
│     (CDN)     │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│   Load        │ ← SSL Termination & Load Balancing
│  Balancer     │
│  (Nginx)      │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  API Layer    │ ← Node.js Application (3+ instances)
│ (Dating API)  │
└───────┬───────┘
        │
    ┌───┴────┬──────────────┐
    ▼        ▼              ▼
┌─────────┐ ┌──────────┐ ┌─────────────┐
│Database │ │  Cache   │ │   External  │
│(Postgres│ │ (Redis)  │ │  Services   │
│ Master  │ │ Cluster  │ │ (OpenAI,    │
│ + Replica)│ │         │ │ Stripe, etc)│
└─────────┘ └──────────┘ └─────────────┘
```

## Infrastructure Components

### 1. Docker Configuration (`/docker/`)
- **docker-compose.prod.yml**: Production Docker Compose with all services
- **Dockerfile.prod**: Multi-stage optimized Node.js Dockerfile
- **nginx.conf**: High-performance Nginx reverse proxy configuration

### 2. CI/CD Pipeline (`/ci-cd/`)
- **github-actions-production.yml**: Complete CI/CD pipeline with security scanning
- **deployment-config.yml**: Environment-specific deployment configurations

### 3. Monitoring Stack (`/monitoring/`)
- **Prometheus**: Metrics collection and alerting engine
- **Grafana**: Visualization dashboards and analytics
- **ELK Stack**: Centralized logging (Elasticsearch, Logstash, Kibana)
- **AlertManager**: Intelligent alert routing and notification

### 4. Backup & Recovery (`/backup-recovery/`)
- **Automated Backups**: Daily database and file backups to multiple cloud providers
- **Point-in-Time Recovery**: 15-minute RPO with automated WAL archiving
- **Disaster Recovery**: Multi-region failover with 4-hour RTO
- **Backup Verification**: Automated integrity checks and restore testing

### 5. Security (`/security/`)
- **SSL Automation**: Let's Encrypt integration with auto-renewal
- **Security Hardening**: Comprehensive security configurations
- **Secrets Management**: AWS Secrets Manager integration with rotation
- **Network Security**: Firewall rules, VPN access, and intrusion detection

### 6. Scaling & Performance (`/scaling/`)
- **Auto-scaling**: HPA and VPA for Kubernetes deployments
- **Load Balancing**: Multi-tier load balancing with health checks
- **Performance Optimization**: Caching strategies, CDN integration, database tuning

### 7. Operations (`/operations/`)
- **Deployment Runbook**: Step-by-step deployment procedures
- **Maintenance Procedures**: Scheduled maintenance tasks and health checks

## Quick Start

### Prerequisites

1. **Docker & Docker Compose**: Latest versions
2. **Kubernetes Cluster**: EKS, GKE, or managed Kubernetes
3. **Cloud Provider Account**: AWS or DigitalOcean with appropriate permissions
4. **Domain Name**: Configured with DNS pointing to load balancer
5. **SSL Certificate**: Let's Encrypt or commercial certificate

### Initial Deployment

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd backend/infrastructure
   ```

2. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your specific values
   ```

3. **Deploy Infrastructure**
   ```bash
   # Deploy to production
   docker-compose -f docker/docker-compose.prod.yml up -d
   
   # Or using Kubernetes
   kubectl apply -f k8s/production/
   ```

4. **Verify Deployment**
   ```bash
   # Check application health
   curl https://api.datingoptimizer.com/health
   
   # Check monitoring
   open https://monitoring.datingoptimizer.com/grafana
   ```

## Environment Configuration

### Production Environment Variables

Create a `.env` file with the following variables:

```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@postgres-master:5432/dating_optimizer
DATABASE_READ_URL=postgresql://user:password@postgres-replica:5432/dating_optimizer

# Redis Configuration
REDIS_URL=redis://redis-cluster:6379
REDIS_CLUSTER_NODES=redis-1:6379,redis-2:6379,redis-3:6379

# External Services
OPENAI_API_KEY=sk-your-openai-key
STRIPE_SECRET_KEY=sk_live_your-stripe-key
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-key
CLOUDINARY_API_SECRET=your-cloudinary-secret

# Security
JWT_SECRET=your-super-secure-jwt-secret
SESSION_SECRET=your-session-secret

# Monitoring
MIXPANEL_TOKEN=your-mixpanel-token
SLACK_WEBHOOK_URL=https://hooks.slack.com/your-webhook
PAGERDUTY_SERVICE_KEY=your-pagerduty-key

# AWS Configuration (for backups and scaling)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=dating-optimizer-backups

# Performance
NODE_ENV=production
PORT=3000
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

## Monitoring & Observability

### Key Metrics Dashboards

1. **API Overview** - Response times, error rates, request volume
2. **Database Metrics** - Connection pools, query performance, replication lag
3. **System Metrics** - CPU, memory, disk usage across all nodes
4. **Business Metrics** - User registrations, photo analyses, revenue

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| API Response Time (P95) | 1s | 2s |
| Error Rate | 2% | 5% |
| Database Connections | 80% | 90% |
| Memory Usage | 80% | 90% |
| Disk Space | 80% | 90% |

### Accessing Monitoring

- **Grafana**: https://monitoring.datingoptimizer.com/grafana
- **Prometheus**: https://monitoring.datingoptimizer.com/prometheus
- **Kibana**: https://monitoring.datingoptimizer.com/kibana
- **AlertManager**: https://monitoring.datingoptimizer.com/alertmanager

## Security Features

### Network Security
- **Firewall**: Only necessary ports exposed (80, 443, 22 for admin)
- **VPN Access**: Administrative access through VPN only
- **DDoS Protection**: Cloudflare and AWS Shield integration
- **Rate Limiting**: API endpoints protected with intelligent rate limiting

### Application Security
- **HTTPS Everywhere**: All traffic encrypted with TLS 1.3
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Comprehensive request validation and sanitization
- **Security Headers**: HSTS, CSP, and other security headers configured

### Data Security
- **Encryption at Rest**: Database and file storage encrypted
- **Encryption in Transit**: All communications use TLS
- **Backup Encryption**: All backups encrypted with AES-256
- **Secrets Management**: Environment variables and secrets properly managed

## Backup & Recovery

### Backup Strategy
- **Database**: Daily full backups + continuous WAL archiving (15min RPO)
- **Files**: Daily incremental backups of user-uploaded content
- **Configuration**: Version-controlled infrastructure-as-code
- **Cross-Region**: Backups replicated to multiple geographic regions

### Recovery Procedures
- **Point-in-Time Recovery**: Restore to any point within 30 days
- **Automated Failover**: 4-hour RTO for regional failures
- **Data Verification**: All backups verified for integrity
- **Documented Procedures**: Step-by-step recovery runbooks

## Scaling & Performance

### Auto-scaling Configuration
- **Horizontal Pod Autoscaler**: Scale based on CPU, memory, and custom metrics
- **Cluster Autoscaler**: Automatically add/remove nodes based on demand
- **Database Read Replicas**: Scale database reads across multiple replicas
- **CDN Integration**: Global content delivery for static assets

### Performance Optimizations
- **Multi-layer Caching**: In-memory, Redis, and CDN caching
- **Database Optimization**: Proper indexing and query optimization
- **Connection Pooling**: Efficient database connection management
- **Image Optimization**: Automatic image compression and format conversion

## Maintenance

### Automated Maintenance
- **Daily**: Health checks, log rotation, backup verification
- **Weekly**: Security updates, performance analysis, certificate checks
- **Monthly**: Full system audit, capacity planning, documentation updates

### Manual Maintenance Windows
- **Schedule**: First Sunday of each month, 02:00-06:00 UTC
- **Procedures**: Major updates, infrastructure changes, disaster recovery testing
- **Notifications**: Users notified 48 hours in advance

## Troubleshooting

### Common Issues

#### Application Not Starting
```bash
# Check container logs
kubectl logs deployment/dating-api -n production

# Check resource usage
kubectl top pods -n production

# Check configuration
kubectl describe deployment/dating-api -n production
```

#### Database Connection Issues
```bash
# Check database health
kubectl exec -n production deployment/postgres-master -- pg_isready

# Check connection count
kubectl exec -n production deployment/postgres-master -- \
  psql -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
kubectl exec -n production deployment/postgres-master -- \
  psql -c "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

#### High Response Times
```bash
# Check system metrics
kubectl top nodes

# Check application metrics
curl "http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"

# Check external service status
curl -I https://api.openai.com
```

### Getting Help

1. **Check Runbooks**: `/operations/` directory contains detailed procedures
2. **Review Logs**: Centralized logging in Kibana
3. **Monitor Metrics**: Grafana dashboards show system health
4. **Emergency Contacts**: See deployment runbook for escalation procedures

## Development & Testing

### Local Development
```bash
# Use development Docker Compose
docker-compose -f docker-compose.dev.yml up

# Or use the existing development setup
npm run dev
```

### Staging Environment
- **Purpose**: Pre-production testing and validation
- **Configuration**: Mirrors production with reduced resources
- **Access**: https://api-staging.datingoptimizer.com
- **Deployment**: Automatic from `develop` branch

### Performance Testing
```bash
# Run load tests
k6 run performance-tests/load-test.js

# Run stress tests
k6 run performance-tests/stress-test.js

# Continuous performance monitoring
npm run test:performance:continuous
```

## Cost Optimization

### Resource Right-sizing
- **CPU/Memory**: Monitored and adjusted based on actual usage
- **Storage**: Lifecycle policies for automated tiering
- **Network**: CDN reduces bandwidth costs
- **Reserved Instances**: Long-term commitments for predictable workloads

### Cost Monitoring
- **Budget Alerts**: Configured for unexpected spending spikes
- **Resource Tagging**: All resources tagged for cost allocation
- **Regular Reviews**: Monthly cost optimization reviews
- **Automated Scaling**: Resources scale down during low-usage periods

## Compliance & Audit

### Security Compliance
- **SOC 2 Type II**: Annual compliance audit
- **GDPR**: Data privacy and user rights compliance
- **PCI DSS**: Payment processing security (through Stripe)

### Audit Trails
- **System Logs**: All system activities logged and retained
- **Application Logs**: User actions and API calls logged
- **Infrastructure Changes**: All changes tracked in version control
- **Access Logs**: Administrative access logged and monitored

## Support & Maintenance

### Team Contacts
- **DevOps Team**: devops@datingoptimizer.com
- **Security Team**: security@datingoptimizer.com
- **On-Call Engineer**: +1-555-ONCALL

### Service Level Agreements
- **Uptime**: 99.9% availability target
- **Response Time**: P95 < 1 second
- **Support**: 24/7 monitoring with on-call rotation

### Documentation
- **Infrastructure**: This repository contains all infrastructure code
- **API Documentation**: Available at https://api.datingoptimizer.com/docs
- **Runbooks**: Detailed operational procedures in `/operations/`
- **Change Log**: All changes documented in CHANGELOG.md

---

## File Structure

```
infrastructure/
├── docker/                     # Docker configuration
│   ├── docker-compose.prod.yml
│   ├── Dockerfile.prod
│   └── nginx.conf
├── ci-cd/                      # CI/CD pipeline
│   ├── github-actions-production.yml
│   └── deployment-config.yml
├── monitoring/                 # Monitoring stack
│   ├── prometheus/
│   ├── grafana/
│   ├── elk/
│   └── alertmanager/
├── backup-recovery/            # Backup & DR
│   ├── backup-strategy.yml
│   ├── disaster-recovery-plan.md
│   └── backup-scripts/
├── security/                   # Security configuration
│   ├── ssl-automation.yml
│   ├── security-hardening.yml
│   └── secrets-management.yml
├── scaling/                    # Auto-scaling & performance
│   ├── autoscaling-config.yml
│   ├── performance-optimization.yml
│   └── load-balancing.yml
├── operations/                 # Operational procedures
│   ├── deployment-runbook.md
│   └── maintenance-procedures.md
└── docs/                      # Documentation
    └── README.md (this file)
```

---

**Last Updated**: January 2024  
**Version**: 2.1.0  
**Owner**: DevOps Team  
**Review Schedule**: Monthly