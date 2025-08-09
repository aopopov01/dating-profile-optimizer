# Production Deployment Guide
## Dating Profile Optimizer & LinkedIn Headshot Generator

This comprehensive deployment guide covers both React Native applications and their backend services for production deployment using Docker and Kubernetes.

## 🏗️ Architecture Overview

### Both Applications Share:
- **Container Orchestration**: Kubernetes with Helm charts
- **Database**: PostgreSQL 13+ with read replicas
- **Cache**: Redis 7 with clustering
- **Load Balancing**: NGINX Ingress Controller
- **Monitoring**: Prometheus + Grafana + AlertManager
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Security**: Cert-Manager with Let's Encrypt

### Application-Specific Services:
#### Dating Profile Optimizer
- **AI Services**: OpenAI GPT-4, Azure Computer Vision
- **Payment Processing**: Stripe
- **Image Storage**: Cloudinary
- **Analytics**: Mixpanel, Amplitude

#### LinkedIn Headshot Generator  
- **AI Services**: Replicate AI
- **Payment Processing**: RevenueCat + Stripe
- **Image Storage**: Cloudinary
- **Analytics**: Mixpanel

## 📋 Prerequisites

### Infrastructure Requirements
- **Kubernetes Cluster**: 1.21+ (EKS, GKE, or AKS recommended)
- **Node Pools**: Minimum 3 nodes (4 CPU, 16GB RAM each)
- **Storage**: SSD-backed persistent volumes
- **Network**: Load balancer with SSL termination
- **DNS**: Domain with wildcard SSL certificate

### Development Tools
- **kubectl**: 1.21+ configured for your cluster
- **Helm**: 3.x for package management
- **Docker**: 20.10+ for container builds
- **GitHub Actions**: CI/CD pipeline (or equivalent)

### External Services
- **Domain Registration**: Custom domains for both apps
- **SSL Certificates**: Let's Encrypt via cert-manager
- **Container Registry**: Docker Hub, AWS ECR, or Google GCR
- **Monitoring**: DataDog, New Relic, or self-hosted

## 🐳 Docker Configuration

### Dating Profile Optimizer - Backend Dockerfile
```dockerfile
# Dating Profile Optimizer Backend Production Dockerfile
FROM node:18-alpine AS base

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache dumb-init

# Create app directory and non-root user
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

FROM base AS dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM base AS build
COPY . .
COPY --from=dependencies /app/node_modules ./node_modules
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048"

COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/package*.json ./

USER nodejs
EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3002/api/v1/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/app.js"]
```

### LinkedIn Headshot Generator - Backend Dockerfile
```dockerfile
# LinkedIn Headshot Generator Backend Production Dockerfile
FROM node:18-alpine AS base

RUN apk update && apk upgrade && apk add --no-cache dumb-init curl
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

FROM base AS dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM base AS build
COPY . .
COPY --from=dependencies /app/node_modules ./node_modules
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=1536"

COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/package*.json ./

USER nodejs
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/v1/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/app.js"]
```

### Production Docker Compose
```yaml
# docker-compose.prod.yml - For single-server deployments
version: '3.8'

services:
  # Dating Profile Optimizer
  dating-optimizer-backend:
    build:
      context: ./dating-profile-optimizer/backend
      dockerfile: Dockerfile
    image: dating-optimizer-backend:latest
    container_name: dating-optimizer-api
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://dating_user:${DATING_DB_PASSWORD}@postgres:5432/dating_optimizer_prod
      REDIS_URL: redis://redis:6379/0
    depends_on:
      - postgres
      - redis
    networks:
      - dating-optimizer-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.dating-optimizer.rule=Host(\`api.datingoptimizer.com\`)"
      - "traefik.http.routers.dating-optimizer.tls=true"
      - "traefik.http.routers.dating-optimizer.tls.certresolver=letsencrypt"

  # LinkedIn Headshot Generator
  linkedin-headshot-backend:
    build:
      context: ./linkedin-headshot/backend
      dockerfile: Dockerfile
    image: linkedin-headshot-backend:latest
    container_name: linkedin-headshot-api
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://headshot_user:${HEADSHOT_DB_PASSWORD}@postgres:5432/linkedin_headshots_prod
      REDIS_URL: redis://redis:6379/1
    depends_on:
      - postgres
      - redis
    networks:
      - linkedin-headshot-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.linkedin-headshot.rule=Host(\`api.linkedinheadshots.com\`)"
      - "traefik.http.routers.linkedin-headshot.tls=true"
      - "traefik.http.routers.linkedin-headshot.tls.certresolver=letsencrypt"

  # Shared Services
  postgres:
    image: postgres:14-alpine
    container_name: postgres-prod
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/init-prod.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - dating-optimizer-network
      - linkedin-headshot-network
    
  redis:
    image: redis:7-alpine
    container_name: redis-prod
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - dating-optimizer-network
      - linkedin-headshot-network

  # Reverse Proxy
  traefik:
    image: traefik:v2.9
    container_name: traefik
    restart: unless-stopped
    command:
      - --api.dashboard=true
      - --api.debug=true
      - --entrypoints.websecure.address=:443
      - --entrypoints.web.address=:80
      - --providers.docker=true
      - --providers.docker.exposedbydefault=false
      - --certificatesresolvers.letsencrypt.acme.tlschallenge=true
      - --certificatesresolvers.letsencrypt.acme.email=${ACME_EMAIL}
      - --certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - letsencrypt_data:/letsencrypt
    networks:
      - dating-optimizer-network
      - linkedin-headshot-network

volumes:
  postgres_data:
  redis_data:
  letsencrypt_data:

networks:
  dating-optimizer-network:
    driver: bridge
  linkedin-headshot-network:
    driver: bridge
```

## ☸️ Kubernetes Deployment

### Namespace Configuration
```yaml
# namespaces.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: dating-optimizer
  labels:
    name: dating-optimizer
    environment: production
---
apiVersion: v1
kind: Namespace
metadata:
  name: linkedin-headshot
  labels:
    name: linkedin-headshot
    environment: production
---
apiVersion: v1
kind: Namespace
metadata:
  name: shared-services
  labels:
    name: shared-services
    environment: production
```

### ConfigMaps and Secrets
```yaml
# dating-optimizer-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dating-optimizer-config
  namespace: dating-optimizer
data:
  NODE_ENV: "production"
  PORT: "3002"
  API_BASE_URL: "https://api.datingoptimizer.com"
  RATE_LIMIT_WINDOW_MS: "900000"
  RATE_LIMIT_MAX_REQUESTS: "1000"
  LOG_LEVEL: "info"

---
apiVersion: v1
kind: Secret
metadata:
  name: dating-optimizer-secrets
  namespace: dating-optimizer
type: Opaque
data:
  DATABASE_URL: <base64-encoded-database-url>
  REDIS_URL: <base64-encoded-redis-url>
  JWT_SECRET: <base64-encoded-jwt-secret>
  OPENAI_API_KEY: <base64-encoded-openai-key>
  STRIPE_SECRET_KEY: <base64-encoded-stripe-key>
  CLOUDINARY_API_SECRET: <base64-encoded-cloudinary-secret>
```

### Database Deployment
```yaml
# postgres-deployment.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: shared-services
spec:
  serviceName: postgres-service
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:14-alpine
        env:
        - name: POSTGRES_USER
          value: "postgres"
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        - name: PGDATA
          value: "/var/lib/postgresql/data/pgdata"
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        - name: init-script
          mountPath: /docker-entrypoint-initdb.d
        livenessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - postgres
          initialDelaySeconds: 30
          timeoutSeconds: 5
        readinessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - postgres
          initialDelaySeconds: 5
          timeoutSeconds: 1
      volumes:
      - name: init-script
        configMap:
          name: postgres-init-script
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: "fast-ssd"
      resources:
        requests:
          storage: 100Gi

---
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  namespace: shared-services
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
  type: ClusterIP
```

### Application Deployments
```yaml
# dating-optimizer-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dating-optimizer-backend
  namespace: dating-optimizer
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 2
  selector:
    matchLabels:
      app: dating-optimizer-backend
  template:
    metadata:
      labels:
        app: dating-optimizer-backend
        version: v1
    spec:
      containers:
      - name: backend
        image: your-registry/dating-optimizer-backend:latest
        ports:
        - containerPort: 3002
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: dating-optimizer-config
              key: NODE_ENV
        - name: PORT
          valueFrom:
            configMapKeyRef:
              name: dating-optimizer-config
              key: PORT
        envFrom:
        - secretRef:
            name: dating-optimizer-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/v1/health
            port: 3002
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /api/v1/health
            port: 3002
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 1
          successThreshold: 1
          failureThreshold: 3
        securityContext:
          runAsNonRoot: true
          runAsUser: 1001
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL

---
apiVersion: v1
kind: Service
metadata:
  name: dating-optimizer-service
  namespace: dating-optimizer
spec:
  selector:
    app: dating-optimizer-backend
  ports:
  - port: 80
    targetPort: 3002
    name: http
  type: ClusterIP
```

### Ingress Configuration
```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dating-optimizer-ingress
  namespace: dating-optimizer
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - api.datingoptimizer.com
    secretName: dating-optimizer-tls
  rules:
  - host: api.datingoptimizer.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: dating-optimizer-service
            port:
              number: 80

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: linkedin-headshot-ingress
  namespace: linkedin-headshot
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - api.linkedinheadshots.com
    secretName: linkedin-headshot-tls
  rules:
  - host: api.linkedinheadshots.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: linkedin-headshot-service
            port:
              number: 80
```

### Horizontal Pod Autoscaler
```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: dating-optimizer-hpa
  namespace: dating-optimizer
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: dating-optimizer-backend
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
      - type: Pods
        value: 4
        periodSeconds: 15
      selectPolicy: Max

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: linkedin-headshot-hpa
  namespace: linkedin-headshot
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: linkedin-headshot-backend
  minReplicas: 2
  maxReplicas: 8
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## 🚀 CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [main]
    paths:
      - 'dating-profile-optimizer/**'
      - 'linkedin-headshot/**'

env:
  REGISTRY: ghcr.io
  DATING_IMAGE_NAME: dating-optimizer-backend
  LINKEDIN_IMAGE_NAME: linkedin-headshot-backend

jobs:
  build-and-deploy-dating-optimizer:
    if: contains(github.event.head_commit.modified, 'dating-profile-optimizer/')
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2

    - name: Log in to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v4
      with:
        images: ${{ env.REGISTRY }}/${{ github.repository_owner }}/${{ env.DATING_IMAGE_NAME }}
        tags: |
          type=ref,event=branch
          type=sha,prefix={{branch}}-
          type=raw,value=latest

    - name: Build and push Docker image
      uses: docker/build-push-action@v4
      with:
        context: ./dating-profile-optimizer/backend
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

    - name: Deploy to Kubernetes
      uses: azure/k8s-deploy@v1
      with:
        manifests: |
          k8s/dating-optimizer/deployment.yaml
          k8s/dating-optimizer/service.yaml
          k8s/dating-optimizer/ingress.yaml
        images: |
          ${{ env.REGISTRY }}/${{ github.repository_owner }}/${{ env.DATING_IMAGE_NAME }}:${{ github.sha }}
        kubectl-version: 'latest'

  build-and-deploy-linkedin-headshot:
    if: contains(github.event.head_commit.modified, 'linkedin-headshot/')
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2

    - name: Log in to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v4
      with:
        images: ${{ env.REGISTRY }}/${{ github.repository_owner }}/${{ env.LINKEDIN_IMAGE_NAME }}

    - name: Build and push Docker image
      uses: docker/build-push-action@v4
      with:
        context: ./linkedin-headshot/backend
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}

    - name: Deploy to Kubernetes
      uses: azure/k8s-deploy@v1
      with:
        manifests: |
          k8s/linkedin-headshot/deployment.yaml
          k8s/linkedin-headshot/service.yaml
          k8s/linkedin-headshot/ingress.yaml
        images: |
          ${{ env.REGISTRY }}/${{ github.repository_owner }}/${{ env.LINKEDIN_IMAGE_NAME }}:${{ github.sha }}

  security-scan:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
      
    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: '.'
        format: 'sarif'
        output: 'trivy-results.sarif'
        
    - name: Upload Trivy scan results
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'
```

## 🔐 Production Security Configuration

### Network Policies
```yaml
# network-policies.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: dating-optimizer-netpol
  namespace: dating-optimizer
spec:
  podSelector:
    matchLabels:
      app: dating-optimizer-backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: nginx-ingress
    ports:
    - protocol: TCP
      port: 3002
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: shared-services
    ports:
    - protocol: TCP
      port: 5432  # PostgreSQL
    - protocol: TCP
      port: 6379  # Redis
  - to: []  # Allow external API calls
    ports:
    - protocol: TCP
      port: 443
    - protocol: TCP
      port: 80
```

### Pod Security Policy
```yaml
# pod-security-policy.yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: restricted-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
```

## 📊 Monitoring & Observability

### Prometheus Configuration
```yaml
# monitoring-stack.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s
    
    scrape_configs:
    - job_name: 'dating-optimizer'
      kubernetes_sd_configs:
      - role: endpoints
        namespaces:
          names:
          - dating-optimizer
      relabel_configs:
      - source_labels: [__meta_kubernetes_service_name]
        action: keep
        regex: dating-optimizer-service
        
    - job_name: 'linkedin-headshot'
      kubernetes_sd_configs:
      - role: endpoints
        namespaces:
          names:
          - linkedin-headshot
      relabel_configs:
      - source_labels: [__meta_kubernetes_service_name]
        action: keep
        regex: linkedin-headshot-service
        
    - job_name: 'postgres'
      static_configs:
      - targets: ['postgres-service.shared-services:5432']
      
    - job_name: 'redis'
      static_configs:
      - targets: ['redis-service.shared-services:6379']

    rule_files:
    - "/etc/prometheus/alert.rules"

    alerting:
      alertmanagers:
      - static_configs:
        - targets: ['alertmanager:9093']
```

### Grafana Dashboards
```yaml
# grafana-dashboard-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboard-dating-optimizer
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  dating-optimizer-dashboard.json: |
    {
      "dashboard": {
        "id": null,
        "title": "Dating Profile Optimizer - Production",
        "panels": [
          {
            "title": "API Request Rate",
            "type": "graph",
            "targets": [
              {
                "expr": "rate(http_requests_total{job=\"dating-optimizer\"}[5m])",
                "legendFormat": "{{ method }} {{ endpoint }}"
              }
            ]
          },
          {
            "title": "Response Time",
            "type": "graph",
            "targets": [
              {
                "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job=\"dating-optimizer\"}[5m]))",
                "legendFormat": "95th percentile"
              }
            ]
          },
          {
            "title": "Error Rate",
            "type": "stat",
            "targets": [
              {
                "expr": "rate(http_requests_total{job=\"dating-optimizer\",status=~\"5..\"}[5m]) / rate(http_requests_total{job=\"dating-optimizer\"}[5m]) * 100",
                "legendFormat": "Error Rate %"
              }
            ]
          }
        ]
      }
    }
```

### AlertManager Configuration
```yaml
# alertmanager-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: alertmanager-config
  namespace: monitoring
data:
  config.yml: |
    global:
      smtp_smarthost: 'localhost:587'
      smtp_from: 'alerts@yourcompany.com'
      
    route:
      group_by: ['alertname', 'cluster', 'service']
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 12h
      receiver: 'web.hook'
      routes:
      - match:
          severity: critical
        receiver: 'critical-alerts'
      - match:
          service: dating-optimizer
        receiver: 'dating-optimizer-team'
      - match:
          service: linkedin-headshot
        receiver: 'linkedin-headshot-team'
        
    receivers:
    - name: 'web.hook'
      webhook_configs:
      - url: 'http://your-webhook-url/'
        
    - name: 'critical-alerts'
      email_configs:
      - to: 'critical-alerts@yourcompany.com'
        subject: 'CRITICAL: {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}
      slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#alerts-critical'
        
    - name: 'dating-optimizer-team'
      email_configs:
      - to: 'dating-optimizer-team@yourcompany.com'
        
    - name: 'linkedin-headshot-team'
      email_configs:
      - to: 'linkedin-headshot-team@yourcompany.com'
```

## 💾 Backup & Disaster Recovery

### Database Backup Strategy
```yaml
# postgres-backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: shared-services
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: postgres-backup
            image: postgres:14-alpine
            command:
            - /bin/bash
            - -c
            - |
              pg_dump $DATABASE_URL | gzip > /backup/backup-$(date +%Y%m%d-%H%M%S).sql.gz
              # Upload to cloud storage
              aws s3 cp /backup/backup-$(date +%Y%m%d-%H%M%S).sql.gz s3://your-backup-bucket/postgres/
              # Clean up local files older than 7 days
              find /backup -name "backup-*.sql.gz" -mtime +7 -delete
            env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: database-url
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: aws-credentials
                  key: access-key-id
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: aws-credentials
                  key: secret-access-key
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc
          restartPolicy: OnFailure
```

### Disaster Recovery Plan
```bash
#!/bin/bash
# disaster-recovery.sh

set -e

# Configuration
NAMESPACE_DATING="dating-optimizer"
NAMESPACE_LINKEDIN="linkedin-headshot"
NAMESPACE_SHARED="shared-services"
BACKUP_BUCKET="your-backup-bucket"

echo "Starting disaster recovery process..."

# 1. Restore database from latest backup
echo "Restoring database..."
LATEST_BACKUP=$(aws s3 ls s3://${BACKUP_BUCKET}/postgres/ --recursive | sort | tail -n 1 | awk '{print $4}')
aws s3 cp s3://${BACKUP_BUCKET}/${LATEST_BACKUP} /tmp/latest-backup.sql.gz
gunzip /tmp/latest-backup.sql.gz

# Create new database pod for restoration
kubectl run postgres-restore --image=postgres:14-alpine -n ${NAMESPACE_SHARED} --rm -i --restart=Never -- psql $DATABASE_URL < /tmp/latest-backup.sql

# 2. Verify database integrity
echo "Verifying database integrity..."
kubectl exec -n ${NAMESPACE_SHARED} postgres-0 -- psql -U postgres -c "SELECT count(*) FROM users;"

# 3. Deploy applications
echo "Deploying applications..."
kubectl apply -f k8s/dating-optimizer/ -n ${NAMESPACE_DATING}
kubectl apply -f k8s/linkedin-headshot/ -n ${NAMESPACE_LINKEDIN}

# 4. Wait for deployments to be ready
echo "Waiting for deployments..."
kubectl wait --for=condition=available --timeout=600s deployment/dating-optimizer-backend -n ${NAMESPACE_DATING}
kubectl wait --for=condition=available --timeout=600s deployment/linkedin-headshot-backend -n ${NAMESPACE_LINKEDIN}

# 5. Run health checks
echo "Running health checks..."
kubectl exec -n ${NAMESPACE_DATING} deployment/dating-optimizer-backend -- curl -f http://localhost:3002/api/v1/health
kubectl exec -n ${NAMESPACE_LINKEDIN} deployment/linkedin-headshot-backend -- curl -f http://localhost:3001/api/v1/health

echo "Disaster recovery completed successfully!"
```

## 🚀 Mobile App Store Deployment

### iOS App Store Deployment
```bash
#!/bin/bash
# ios-deployment.sh

set -e

echo "Building iOS production release..."

# Navigate to iOS project
cd LinkedInHeadshotApp/ios  # or DatingProfileOptimizer/ios

# Clean previous builds
rm -rf build
rm -rf ~/Library/Developer/Xcode/DerivedData

# Install dependencies
bundle exec pod install

# Build and archive
xcodebuild -workspace LinkedInHeadshotApp.xcworkspace \
           -scheme LinkedInHeadshotApp \
           -configuration Release \
           -archivePath build/LinkedInHeadshotApp.xcarchive \
           -destination "generic/platform=iOS" \
           archive

# Export for App Store
xcodebuild -exportArchive \
           -archivePath build/LinkedInHeadshotApp.xcarchive \
           -exportPath build/ \
           -exportOptionsPlist ExportOptions.plist

# Upload to App Store Connect
xcrun altool --upload-app \
             --type ios \
             --file "build/LinkedIn Headshot Generator.ipa" \
             --username "$APP_STORE_CONNECT_USERNAME" \
             --password "$APP_STORE_CONNECT_PASSWORD"

echo "iOS app uploaded to App Store Connect successfully!"
```

### Android Play Store Deployment
```bash
#!/bin/bash
# android-deployment.sh

set -e

echo "Building Android production release..."

# Navigate to Android project
cd LinkedInHeadshotApp/android  # or DatingProfileOptimizer/android

# Clean previous builds
./gradlew clean

# Build release AAB (Android App Bundle)
./gradlew bundleRelease

# Sign the release (if not already configured in build.gradle)
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
          -keystore ../release.keystore \
          app/build/outputs/bundle/release/app-release.aab \
          upload

# Upload to Play Console using Google Play Developer API
# This requires setting up service account credentials
python3 upload_to_play_console.py \
  --service_account_json ../service-account.json \
  --package_name com.yourcompany.linkedinheadshot \
  --aab app/build/outputs/bundle/release/app-release.aab \
  --track production

echo "Android app uploaded to Play Store successfully!"
```

## 🔧 Production Maintenance

### Rolling Updates
```bash
#!/bin/bash
# rolling-update.sh

set -e

NAMESPACE=$1
APP_NAME=$2
NEW_IMAGE=$3

if [ $# -ne 3 ]; then
    echo "Usage: $0 <namespace> <app-name> <new-image>"
    exit 1
fi

echo "Starting rolling update for ${APP_NAME} in ${NAMESPACE}..."

# Update the deployment with new image
kubectl set image deployment/${APP_NAME} ${APP_NAME}=${NEW_IMAGE} -n ${NAMESPACE}

# Wait for rollout to complete
kubectl rollout status deployment/${APP_NAME} -n ${NAMESPACE} --timeout=600s

# Verify health after deployment
kubectl exec -n ${NAMESPACE} deployment/${APP_NAME} -- curl -f http://localhost:3001/api/v1/health

echo "Rolling update completed successfully!"
```

### Database Migrations in Production
```bash
#!/bin/bash
# production-migration.sh

set -e

echo "Running database migrations in production..."

# Create migration job
kubectl create job migration-$(date +%s) \
  --image=your-registry/dating-optimizer-backend:latest \
  --namespace=dating-optimizer \
  -- npm run migrate

# Wait for migration to complete
kubectl wait --for=condition=complete job/migration-$(date +%s) --timeout=600s -n dating-optimizer

# Check migration status
kubectl logs job/migration-$(date +%s) -n dating-optimizer

echo "Database migration completed!"
```

### SSL Certificate Renewal
```yaml
# cert-manager-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@yourcompany.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
```

## 📞 Production Support

### Emergency Contacts
- **DevOps Team**: devops@yourcompany.com
- **Backend Engineers**: backend-team@yourcompany.com  
- **Mobile Engineers**: mobile-team@yourcompany.com
- **24/7 Hotline**: +1-XXX-XXX-XXXX

### Monitoring URLs
- **Dating Optimizer API**: https://api.datingoptimizer.com/api/v1/health
- **LinkedIn Headshot API**: https://api.linkedinheadshots.com/api/v1/health
- **Grafana Dashboard**: https://monitoring.yourcompany.com
- **Status Page**: https://status.yourcompany.com

### Runbook Links
- **Incident Response**: [Internal Wiki Link]
- **Scaling Procedures**: [Internal Wiki Link]
- **Database Maintenance**: [Internal Wiki Link]
- **SSL Certificate Management**: [Internal Wiki Link]

---

**Document Version**: 1.0  
**Last Updated**: February 1, 2024  
**Next Review**: March 1, 2024  
**Approved By**: DevOps Team Lead

This deployment guide provides comprehensive production deployment procedures for both applications with enterprise-grade reliability, security, and scalability.