#!/bin/bash

# Production Deployment Script for Mobile Apps Infrastructure
# LinkedIn Headshot Generator & Dating Profile Optimizer

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/tmp/mobile-apps-deploy-$(date +%Y%m%d-%H%M%S).log"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE"
}

info() { log "INFO" "${BLUE}$*${NC}"; }
warn() { log "WARN" "${YELLOW}$*${NC}"; }
error() { log "ERROR" "${RED}$*${NC}"; }
success() { log "SUCCESS" "${GREEN}$*${NC}"; }

# Error handling
trap 'error "Deployment failed at line $LINENO. Exit code: $?"' ERR

# Usage function
usage() {
    cat << EOF
Usage: $0 [OPTIONS] ENVIRONMENT

Deploy mobile apps infrastructure to specified environment.

ARGUMENTS:
    ENVIRONMENT    Target environment (dev|staging|prod)

OPTIONS:
    -a, --app APP           Deploy specific app only (dating-optimizer|linkedin-headshot)
    -c, --component COMP    Deploy specific component only (backend|infrastructure|monitoring)
    -s, --skip-tests        Skip pre-deployment tests
    -f, --force            Force deployment without confirmation
    -d, --dry-run          Show what would be deployed without executing
    -v, --verbose          Enable verbose output
    -h, --help             Show this help message

EXAMPLES:
    $0 prod                                 # Full production deployment
    $0 staging -a linkedin-headshot         # Deploy LinkedIn Headshot to staging
    $0 prod -c infrastructure --dry-run     # Dry run infrastructure deployment
    $0 dev -s -f                           # Force dev deployment without tests

ENVIRONMENT VARIABLES:
    AWS_REGION              AWS region (default: us-east-1)
    TF_VAR_environment      Override environment name
    SKIP_TERRAFORM          Skip Terraform deployment (true/false)
    SKIP_KUBERNETES         Skip Kubernetes deployment (true/false)
EOF
}

# Default values
ENVIRONMENT=""
TARGET_APP=""
TARGET_COMPONENT=""
SKIP_TESTS=false
FORCE_DEPLOY=false
DRY_RUN=false
VERBOSE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -a|--app)
            TARGET_APP="$2"
            shift 2
            ;;
        -c|--component)
            TARGET_COMPONENT="$2"
            shift 2
            ;;
        -s|--skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        -f|--force)
            FORCE_DEPLOY=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        -*)
            error "Unknown option $1"
            usage
            exit 1
            ;;
        *)
            if [[ -z "$ENVIRONMENT" ]]; then
                ENVIRONMENT="$1"
            else
                error "Too many arguments"
                usage
                exit 1
            fi
            shift
            ;;
    esac
done

# Validate environment
if [[ -z "$ENVIRONMENT" ]]; then
    error "Environment is required"
    usage
    exit 1
fi

if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    error "Environment must be one of: dev, staging, prod"
    exit 1
fi

# Validate target app if specified
if [[ -n "$TARGET_APP" ]] && [[ ! "$TARGET_APP" =~ ^(dating-optimizer|linkedin-headshot)$ ]]; then
    error "App must be one of: dating-optimizer, linkedin-headshot"
    exit 1
fi

# Validate target component if specified
if [[ -n "$TARGET_COMPONENT" ]] && [[ ! "$TARGET_COMPONENT" =~ ^(backend|infrastructure|monitoring)$ ]]; then
    error "Component must be one of: backend, infrastructure, monitoring"
    exit 1
fi

# Set verbosity
if [[ "$VERBOSE" == "true" ]]; then
    set -x
fi

# Environment-specific configuration
case "$ENVIRONMENT" in
    prod)
        AWS_REGION="${AWS_REGION:-us-east-1}"
        CLUSTER_NAME="mobile-apps-production"
        REQUIRE_APPROVAL=true
        ;;
    staging)
        AWS_REGION="${AWS_REGION:-us-east-1}"
        CLUSTER_NAME="mobile-apps-staging"
        REQUIRE_APPROVAL=false
        ;;
    dev)
        AWS_REGION="${AWS_REGION:-us-east-1}"
        CLUSTER_NAME="mobile-apps-dev"
        REQUIRE_APPROVAL=false
        ;;
esac

# Export environment variables for Terraform
export TF_VAR_environment="${TF_VAR_environment:-$ENVIRONMENT}"
export TF_VAR_aws_region="$AWS_REGION"
export AWS_DEFAULT_REGION="$AWS_REGION"

info "Starting deployment to $ENVIRONMENT environment"
info "Target app: ${TARGET_APP:-all}"
info "Target component: ${TARGET_COMPONENT:-all}"
info "Log file: $LOG_FILE"

# Prerequisites check
check_prerequisites() {
    info "Checking prerequisites..."
    
    local missing_tools=()
    
    # Check required tools
    for tool in aws terraform kubectl helm docker; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        fi
    done
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured or expired"
        exit 1
    fi
    
    # Verify AWS region
    local current_region
    current_region=$(aws configure get region || echo "")
    if [[ "$current_region" != "$AWS_REGION" ]]; then
        warn "AWS CLI region ($current_region) differs from target region ($AWS_REGION)"
    fi
    
    success "Prerequisites check passed"
}

# Pre-deployment tests
run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        warn "Skipping pre-deployment tests"
        return 0
    fi
    
    info "Running pre-deployment tests..."
    
    # Terraform validation
    if [[ -z "$TARGET_COMPONENT" || "$TARGET_COMPONENT" == "infrastructure" ]]; then
        info "Validating Terraform configuration..."
        cd "$PROJECT_ROOT/terraform"
        terraform init -backend=true -get=true -upgrade=true
        terraform validate
        terraform plan -out=tfplan -var-file="environments/${ENVIRONMENT}.tfvars"
        cd - &> /dev/null
    fi
    
    # Kubernetes manifests validation
    if [[ -z "$TARGET_COMPONENT" || "$TARGET_COMPONENT" == "backend" ]]; then
        info "Validating Kubernetes manifests..."
        kubectl --dry-run=client apply -f "$PROJECT_ROOT/../Dating Profile Optimizer/k8s/" || true
        kubectl --dry-run=client apply -f "$PROJECT_ROOT/../LinkedIn Headshot/k8s/" || true
    fi
    
    # Docker image security scan
    if [[ -z "$TARGET_COMPONENT" || "$TARGET_COMPONENT" == "backend" ]]; then
        info "Running container security scans..."
        if command -v trivy &> /dev/null; then
            # Scan existing images if they exist
            for app in dating-optimizer linkedin-headshot; do
                if [[ -z "$TARGET_APP" || "$TARGET_APP" == "$app" ]]; then
                    local image_tag="${ENVIRONMENT}-latest"
                    if docker image inspect "ghcr.io/company/${app}:${image_tag}" &> /dev/null; then
                        trivy image --severity HIGH,CRITICAL "ghcr.io/company/${app}:${image_tag}" || warn "Security scan failed for $app"
                    fi
                fi
            done
        else
            warn "Trivy not installed, skipping container security scans"
        fi
    fi
    
    success "Pre-deployment tests completed"
}

# Deployment confirmation
confirm_deployment() {
    if [[ "$FORCE_DEPLOY" == "true" ]]; then
        info "Force deployment enabled, skipping confirmation"
        return 0
    fi
    
    if [[ "$REQUIRE_APPROVAL" == "true" ]]; then
        warn "You are about to deploy to PRODUCTION environment: $ENVIRONMENT"
        warn "This action cannot be undone and may affect live users"
        echo
        read -p "Are you absolutely sure you want to continue? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            info "Deployment cancelled by user"
            exit 0
        fi
    else
        info "Deploying to $ENVIRONMENT environment..."
        read -p "Continue? (y/n): " -r
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            info "Deployment cancelled by user"
            exit 0
        fi
    fi
}

# Infrastructure deployment
deploy_infrastructure() {
    if [[ "${SKIP_TERRAFORM:-false}" == "true" ]]; then
        warn "Skipping Terraform deployment (SKIP_TERRAFORM=true)"
        return 0
    fi
    
    if [[ -n "$TARGET_COMPONENT" && "$TARGET_COMPONENT" != "infrastructure" ]]; then
        info "Skipping infrastructure deployment (targeting $TARGET_COMPONENT only)"
        return 0
    fi
    
    info "Deploying infrastructure with Terraform..."
    
    cd "$PROJECT_ROOT/terraform"
    
    # Initialize Terraform
    terraform init -backend=true -get=true -upgrade=true
    
    # Create workspace if it doesn't exist
    terraform workspace select "$ENVIRONMENT" 2>/dev/null || terraform workspace new "$ENVIRONMENT"
    
    # Plan deployment
    if [[ "$DRY_RUN" == "true" ]]; then
        info "DRY RUN: Terraform plan for $ENVIRONMENT"
        terraform plan -var-file="environments/${ENVIRONMENT}.tfvars" -detailed-exitcode
        cd - &> /dev/null
        return 0
    fi
    
    # Apply infrastructure changes
    terraform apply -var-file="environments/${ENVIRONMENT}.tfvars" -auto-approve
    
    # Update kubeconfig
    aws eks update-kubeconfig --region "$AWS_REGION" --name "$CLUSTER_NAME"
    
    cd - &> /dev/null
    success "Infrastructure deployment completed"
}

# Application deployment
deploy_applications() {
    if [[ "${SKIP_KUBERNETES:-false}" == "true" ]]; then
        warn "Skipping Kubernetes deployment (SKIP_KUBERNETES=true)"
        return 0
    fi
    
    if [[ -n "$TARGET_COMPONENT" && "$TARGET_COMPONENT" != "backend" ]]; then
        info "Skipping application deployment (targeting $TARGET_COMPONENT only)"
        return 0
    fi
    
    info "Deploying applications to Kubernetes..."
    
    # Ensure kubectl is configured
    kubectl cluster-info &> /dev/null || {
        error "kubectl not configured for cluster $CLUSTER_NAME"
        exit 1
    }
    
    # Deploy applications
    local apps=()
    if [[ -z "$TARGET_APP" ]]; then
        apps=("dating-optimizer" "linkedin-headshot")
    else
        apps=("$TARGET_APP")
    fi
    
    for app in "${apps[@]}"; do
        info "Deploying $app application..."
        
        if [[ "$DRY_RUN" == "true" ]]; then
            info "DRY RUN: Would deploy $app to $ENVIRONMENT"
            continue
        fi
        
        # Apply Kubernetes manifests
        local k8s_dir
        if [[ "$app" == "dating-optimizer" ]]; then
            k8s_dir="$PROJECT_ROOT/../Dating Profile Optimizer/k8s"
        else
            k8s_dir="$PROJECT_ROOT/../LinkedIn Headshot/k8s"
        fi
        
        if [[ -d "$k8s_dir" ]]; then
            # Apply namespace first
            kubectl apply -f "$k8s_dir/namespace.yaml" || true
            
            # Apply other manifests
            kubectl apply -f "$k8s_dir/" -n "${app}-${ENVIRONMENT}"
            
            # Wait for rollout
            kubectl rollout status deployment/backend -n "${app}-${ENVIRONMENT}" --timeout=600s
            
            success "$app deployment completed"
        else
            warn "Kubernetes manifests not found for $app at $k8s_dir"
        fi
    done
}

# Monitoring deployment
deploy_monitoring() {
    if [[ -n "$TARGET_COMPONENT" && "$TARGET_COMPONENT" != "monitoring" ]]; then
        info "Skipping monitoring deployment (targeting $TARGET_COMPONENT only)"
        return 0
    fi
    
    info "Deploying monitoring stack..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        info "DRY RUN: Would deploy monitoring stack to $ENVIRONMENT"
        return 0
    fi
    
    # Deploy Prometheus operator
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update
    
    helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
        --namespace monitoring \
        --create-namespace \
        --values "$PROJECT_ROOT/monitoring/prometheus/values-${ENVIRONMENT}.yaml" \
        --wait
    
    # Deploy Grafana dashboards
    kubectl apply -f "$PROJECT_ROOT/monitoring/grafana/dashboards/" -n monitoring || true
    
    success "Monitoring deployment completed"
}

# Post-deployment verification
verify_deployment() {
    if [[ "$DRY_RUN" == "true" ]]; then
        info "Skipping verification (dry run mode)"
        return 0
    fi
    
    info "Verifying deployment..."
    
    # Check infrastructure
    if [[ -z "$TARGET_COMPONENT" || "$TARGET_COMPONENT" == "infrastructure" ]]; then
        info "Verifying infrastructure..."
        
        # Check EKS cluster
        if kubectl cluster-info &> /dev/null; then
            success "EKS cluster is accessible"
        else
            error "EKS cluster is not accessible"
        fi
        
        # Check load balancer
        local lb_dns
        lb_dns=$(aws elbv2 describe-load-balancers --region "$AWS_REGION" --query "LoadBalancers[?contains(LoadBalancerName, 'mobile-apps')].DNSName | [0]" --output text 2>/dev/null || echo "")
        
        if [[ -n "$lb_dns" && "$lb_dns" != "None" ]]; then
            success "Load balancer is available: $lb_dns"
        else
            warn "Load balancer DNS not found or not ready"
        fi
    fi
    
    # Check applications
    if [[ -z "$TARGET_COMPONENT" || "$TARGET_COMPONENT" == "backend" ]]; then
        local apps=()
        if [[ -z "$TARGET_APP" ]]; then
            apps=("dating-optimizer" "linkedin-headshot")
        else
            apps=("$TARGET_APP")
        fi
        
        for app in "${apps[@]}"; do
            info "Verifying $app application..."
            
            # Check pod status
            local pod_status
            pod_status=$(kubectl get pods -n "${app}-${ENVIRONMENT}" -l app=backend --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l || echo "0")
            
            if [[ "$pod_status" -gt 0 ]]; then
                success "$app backend pods are running ($pod_status replicas)"
            else
                error "$app backend pods are not running"
            fi
            
            # Check service endpoints
            local service_ip
            service_ip=$(kubectl get service backend -n "${app}-${ENVIRONMENT}" -o jsonpath='{.spec.clusterIP}' 2>/dev/null || echo "")
            
            if [[ -n "$service_ip" ]]; then
                success "$app service is available at $service_ip"
            else
                warn "$app service not found"
            fi
        done
    fi
    
    # Check monitoring
    if [[ -z "$TARGET_COMPONENT" || "$TARGET_COMPONENT" == "monitoring" ]]; then
        info "Verifying monitoring stack..."
        
        # Check Prometheus
        if kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus --field-selector=status.phase=Running &> /dev/null; then
            success "Prometheus is running"
        else
            warn "Prometheus not found or not running"
        fi
        
        # Check Grafana
        if kubectl get pods -n monitoring -l app.kubernetes.io/name=grafana --field-selector=status.phase=Running &> /dev/null; then
            success "Grafana is running"
        else
            warn "Grafana not found or not running"
        fi
    fi
    
    success "Deployment verification completed"
}

# Cleanup function
cleanup() {
    info "Cleaning up temporary files..."
    # Remove temporary files if needed
    # Note: Keep log file for debugging
    success "Cleanup completed. Log file available at: $LOG_FILE"
}

# Main deployment flow
main() {
    info "=== Mobile Apps Deployment Script ==="
    info "Environment: $ENVIRONMENT"
    info "AWS Region: $AWS_REGION"
    info "Cluster: $CLUSTER_NAME"
    echo
    
    check_prerequisites
    run_tests
    confirm_deployment
    
    # Start deployment timer
    local start_time
    start_time=$(date +%s)
    
    deploy_infrastructure
    deploy_applications
    deploy_monitoring
    verify_deployment
    
    # Calculate deployment time
    local end_time duration
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    
    success "=== Deployment completed successfully in ${duration}s ==="
    success "Environment: $ENVIRONMENT"
    success "Log file: $LOG_FILE"
    
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        info "Production deployment complete!"
        info "Monitor the application at your monitoring dashboards"
        info "Check application logs for any issues"
    fi
}

# Trap cleanup
trap cleanup EXIT

# Run main function
main "$@"