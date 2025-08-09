#!/bin/bash

# Production Rollback Script for Mobile Apps Infrastructure
# LinkedIn Headshot Generator & Dating Profile Optimizer

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/tmp/mobile-apps-rollback-$(date +%Y%m%d-%H%M%S).log"

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
trap 'error "Rollback failed at line $LINENO. Exit code: $?"' ERR

# Usage function
usage() {
    cat << EOF
Usage: $0 [OPTIONS] ENVIRONMENT

Rollback mobile apps infrastructure to a previous version.

ARGUMENTS:
    ENVIRONMENT    Target environment (dev|staging|prod)

OPTIONS:
    -a, --app APP           Rollback specific app only (dating-optimizer|linkedin-headshot)
    -r, --revision REV      Target revision/version to rollback to
    -t, --target TARGET     Rollback target (deployment|infrastructure|all)
    -f, --force            Force rollback without confirmation
    -d, --dry-run          Show what would be rolled back without executing
    -l, --list-revisions   List available revisions for rollback
    -v, --verbose          Enable verbose output
    -h, --help             Show this help message

EXAMPLES:
    $0 prod                                 # Interactive rollback selection
    $0 staging -a linkedin-headshot         # Rollback LinkedIn Headshot in staging
    $0 prod -r 5 -a dating-optimizer        # Rollback to revision 5
    $0 prod -t deployment --dry-run         # Dry run deployment rollback
    $0 staging -l                           # List available revisions

ROLLBACK TARGETS:
    deployment      Rollback Kubernetes deployments only
    infrastructure  Rollback infrastructure changes (careful!)
    all            Rollback everything (default)

ENVIRONMENT VARIABLES:
    AWS_REGION              AWS region (default: us-east-1)
    ROLLBACK_TIMEOUT        Timeout for rollback operations (default: 600s)
EOF
}

# Default values
ENVIRONMENT=""
TARGET_APP=""
TARGET_REVISION=""
ROLLBACK_TARGET="all"
FORCE_ROLLBACK=false
DRY_RUN=false
LIST_REVISIONS=false
VERBOSE=false
ROLLBACK_TIMEOUT=600

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -a|--app)
            TARGET_APP="$2"
            shift 2
            ;;
        -r|--revision)
            TARGET_REVISION="$2"
            shift 2
            ;;
        -t|--target)
            ROLLBACK_TARGET="$2"
            shift 2
            ;;
        -f|--force)
            FORCE_ROLLBACK=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -l|--list-revisions)
            LIST_REVISIONS=true
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

# Validate rollback target
if [[ ! "$ROLLBACK_TARGET" =~ ^(deployment|infrastructure|all)$ ]]; then
    error "Rollback target must be one of: deployment, infrastructure, all"
    exit 1
fi

# Set verbosity
if [[ "$VERBOSE" == "true" ]]; then
    set -x
fi

# Environment-specific configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
CLUSTER_NAME="mobile-apps-${ENVIRONMENT}"
export AWS_DEFAULT_REGION="$AWS_REGION"

info "Starting rollback for $ENVIRONMENT environment"
info "Target app: ${TARGET_APP:-all}"
info "Target revision: ${TARGET_REVISION:-interactive}"
info "Rollback target: $ROLLBACK_TARGET"
info "Log file: $LOG_FILE"

# Prerequisites check
check_prerequisites() {
    info "Checking prerequisites..."
    
    local missing_tools=()
    
    # Check required tools
    for tool in aws kubectl helm; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        fi
    done
    
    if [[ "$ROLLBACK_TARGET" == "infrastructure" || "$ROLLBACK_TARGET" == "all" ]]; then
        if ! command -v terraform &> /dev/null; then
            missing_tools+=("terraform")
        fi
    fi
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured or expired"
        exit 1
    fi
    
    # Check cluster access
    if ! kubectl cluster-info &> /dev/null; then
        # Try to update kubeconfig
        info "Updating kubeconfig for cluster $CLUSTER_NAME..."
        aws eks update-kubeconfig --region "$AWS_REGION" --name "$CLUSTER_NAME"
    fi
    
    success "Prerequisites check passed"
}

# List available revisions
list_available_revisions() {
    info "Listing available revisions..."
    
    local apps=()
    if [[ -z "$TARGET_APP" ]]; then
        apps=("dating-optimizer" "linkedin-headshot")
    else
        apps=("$TARGET_APP")
    fi
    
    for app in "${apps[@]}"; do
        info "=== $app Revisions ==="
        
        # List deployment revisions
        info "Deployment revisions:"
        kubectl rollout history deployment/backend -n "${app}-${ENVIRONMENT}" || warn "No deployment history found for $app"
        echo
        
        # List Terraform state versions (if available)
        if command -v terraform &> /dev/null; then
            info "Infrastructure versions (Terraform workspace states):"
            cd "$PROJECT_ROOT/terraform"
            terraform workspace list | grep -v "\*" | sed 's/^  //' || warn "No Terraform workspaces found"
            cd - &> /dev/null
        fi
        echo
    done
}

# Get deployment revisions
get_deployment_revisions() {
    local app="$1"
    kubectl rollout history deployment/backend -n "${app}-${ENVIRONMENT}" --no-headers 2>/dev/null | awk '{print $1}' | sort -nr || echo ""
}

# Interactive revision selection
select_revision_interactive() {
    local app="$1"
    local revisions
    
    revisions=$(get_deployment_revisions "$app")
    
    if [[ -z "$revisions" ]]; then
        error "No deployment revisions found for $app"
        return 1
    fi
    
    info "Available revisions for $app:"
    local i=1
    local revision_array=()
    
    for rev in $revisions; do
        local revision_info
        revision_info=$(kubectl rollout history deployment/backend -n "${app}-${ENVIRONMENT}" --revision="$rev" 2>/dev/null | grep -E "(Deployment|Image|Created)" | head -3 || echo "Revision $rev")
        echo "$i) Revision $rev"
        echo "   $revision_info" | sed 's/^/   /'
        echo
        revision_array+=("$rev")
        ((i++))
    done
    
    echo "0) Cancel rollback"
    echo
    
    while true; do
        read -p "Select revision to rollback to (0-$((${#revision_array[@]})): " -r selection
        
        if [[ "$selection" =~ ^[0-9]+$ ]]; then
            if [[ "$selection" -eq 0 ]]; then
                info "Rollback cancelled by user"
                exit 0
            elif [[ "$selection" -ge 1 && "$selection" -le ${#revision_array[@]} ]]; then
                TARGET_REVISION="${revision_array[$((selection-1))]}"
                break
            fi
        fi
        
        warn "Invalid selection. Please choose a number between 0 and ${#revision_array[@]}"
    done
    
    info "Selected revision $TARGET_REVISION for $app"
}

# Rollback confirmation
confirm_rollback() {
    if [[ "$FORCE_ROLLBACK" == "true" ]]; then
        info "Force rollback enabled, skipping confirmation"
        return 0
    fi
    
    warn "You are about to perform a ROLLBACK in $ENVIRONMENT environment"
    warn "This action will revert your applications to a previous state"
    warn "Target: $ROLLBACK_TARGET"
    if [[ -n "$TARGET_APP" ]]; then
        warn "App: $TARGET_APP"
    fi
    if [[ -n "$TARGET_REVISION" ]]; then
        warn "Revision: $TARGET_REVISION"
    fi
    echo
    
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        warn "THIS IS A PRODUCTION ROLLBACK!"
        warn "This may affect live users and cause service disruption"
        echo
        read -p "Are you absolutely sure you want to continue? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            info "Rollback cancelled by user"
            exit 0
        fi
    else
        read -p "Continue with rollback? (y/n): " -r
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            info "Rollback cancelled by user"
            exit 0
        fi
    fi
}

# Rollback deployments
rollback_deployments() {
    if [[ "$ROLLBACK_TARGET" != "deployment" && "$ROLLBACK_TARGET" != "all" ]]; then
        info "Skipping deployment rollback (target: $ROLLBACK_TARGET)"
        return 0
    fi
    
    info "Rolling back Kubernetes deployments..."
    
    local apps=()
    if [[ -z "$TARGET_APP" ]]; then
        apps=("dating-optimizer" "linkedin-headshot")
    else
        apps=("$TARGET_APP")
    fi
    
    for app in "${apps[@]}"; do
        info "Rolling back $app deployment..."
        
        if [[ "$DRY_RUN" == "true" ]]; then
            info "DRY RUN: Would rollback $app deployment"
            if [[ -n "$TARGET_REVISION" ]]; then
                info "DRY RUN: Target revision: $TARGET_REVISION"
            else
                info "DRY RUN: Would rollback to previous revision"
            fi
            continue
        fi
        
        # Handle revision selection
        local rollback_revision="$TARGET_REVISION"
        if [[ -z "$rollback_revision" ]]; then
            if [[ "$FORCE_ROLLBACK" == "true" ]]; then
                # Auto-select previous revision
                local current_revision
                current_revision=$(kubectl get deployment backend -n "${app}-${ENVIRONMENT}" -o jsonpath='{.metadata.annotations.deployment\.kubernetes\.io/revision}' 2>/dev/null || echo "1")
                rollback_revision=$((current_revision - 1))
                
                if [[ "$rollback_revision" -lt 1 ]]; then
                    error "No previous revision available for $app (current: $current_revision)"
                    continue
                fi
                
                info "Auto-selected revision $rollback_revision for $app (previous revision)"
            else
                select_revision_interactive "$app"
                rollback_revision="$TARGET_REVISION"
            fi
        fi
        
        # Perform rollback
        info "Rolling back $app to revision $rollback_revision..."
        
        if kubectl rollout undo deployment/backend -n "${app}-${ENVIRONMENT}" --to-revision="$rollback_revision"; then
            info "Rollback initiated for $app, waiting for completion..."
            
            # Wait for rollback to complete
            if kubectl rollout status deployment/backend -n "${app}-${ENVIRONMENT}" --timeout="${ROLLBACK_TIMEOUT}s"; then
                success "$app rollback completed successfully"
                
                # Verify health
                local health_check_attempts=0
                local max_health_checks=10
                
                while [[ $health_check_attempts -lt $max_health_checks ]]; do
                    if kubectl get pods -n "${app}-${ENVIRONMENT}" -l app=backend --field-selector=status.phase=Running &> /dev/null; then
                        local ready_pods
                        ready_pods=$(kubectl get pods -n "${app}-${ENVIRONMENT}" -l app=backend --field-selector=status.phase=Running --no-headers | wc -l)
                        
                        if [[ "$ready_pods" -gt 0 ]]; then
                            success "$app pods are healthy after rollback ($ready_pods running)"
                            break
                        fi
                    fi
                    
                    ((health_check_attempts++))
                    info "Waiting for $app pods to become healthy... (attempt $health_check_attempts/$max_health_checks)"
                    sleep 10
                done
                
                if [[ $health_check_attempts -ge $max_health_checks ]]; then
                    error "$app pods are not healthy after rollback"
                fi
            else
                error "$app rollback timed out"
            fi
        else
            error "Failed to initiate rollback for $app"
        fi
    done
}

# Rollback infrastructure (careful operation)
rollback_infrastructure() {
    if [[ "$ROLLBACK_TARGET" != "infrastructure" && "$ROLLBACK_TARGET" != "all" ]]; then
        info "Skipping infrastructure rollback (target: $ROLLBACK_TARGET)"
        return 0
    fi
    
    warn "Infrastructure rollback requested - this is a dangerous operation!"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        info "DRY RUN: Would attempt infrastructure rollback"
        info "DRY RUN: This would involve Terraform state operations"
        return 0
    fi
    
    if [[ "$FORCE_ROLLBACK" != "true" ]]; then
        warn "Infrastructure rollback can cause data loss and service outages"
        warn "This operation requires careful manual intervention"
        warn "It's recommended to use Terraform directly for infrastructure changes"
        echo
        read -p "Do you really want to proceed with infrastructure rollback? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            info "Infrastructure rollback cancelled"
            return 0
        fi
    fi
    
    info "Infrastructure rollback is not automated for safety reasons"
    info "Please use the following steps manually:"
    echo
    info "1. Navigate to terraform directory: cd $PROJECT_ROOT/terraform"
    info "2. Select workspace: terraform workspace select $ENVIRONMENT"
    info "3. Review state: terraform show"
    info "4. If needed, import previous state or use terraform plan/apply carefully"
    echo
    warn "Manual intervention required for infrastructure rollback"
}

# Post-rollback verification
verify_rollback() {
    if [[ "$DRY_RUN" == "true" ]]; then
        info "Skipping verification (dry run mode)"
        return 0
    fi
    
    info "Verifying rollback..."
    
    local apps=()
    if [[ -z "$TARGET_APP" ]]; then
        apps=("dating-optimizer" "linkedin-headshot")
    else
        apps=("$TARGET_APP")
    fi
    
    for app in "${apps[@]}"; do
        info "Verifying $app rollback..."
        
        # Check deployment status
        local current_revision
        current_revision=$(kubectl get deployment backend -n "${app}-${ENVIRONMENT}" -o jsonpath='{.metadata.annotations.deployment\.kubernetes\.io/revision}' 2>/dev/null || echo "unknown")
        info "$app current revision: $current_revision"
        
        # Check pod status
        local running_pods
        running_pods=$(kubectl get pods -n "${app}-${ENVIRONMENT}" -l app=backend --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l || echo "0")
        
        if [[ "$running_pods" -gt 0 ]]; then
            success "$app has $running_pods running pods"
        else
            error "$app has no running pods"
        fi
        
        # Check service health
        local service_ip
        service_ip=$(kubectl get service backend -n "${app}-${ENVIRONMENT}" -o jsonpath='{.spec.clusterIP}' 2>/dev/null || echo "")
        
        if [[ -n "$service_ip" ]]; then
            success "$app service is available at $service_ip"
        else
            warn "$app service not found"
        fi
    done
    
    success "Rollback verification completed"
}

# Cleanup function
cleanup() {
    info "Cleaning up..."
    success "Rollback process completed. Log file: $LOG_FILE"
}

# Main rollback flow
main() {
    info "=== Mobile Apps Rollback Script ==="
    info "Environment: $ENVIRONMENT"
    info "AWS Region: $AWS_REGION"
    info "Cluster: $CLUSTER_NAME"
    echo
    
    check_prerequisites
    
    if [[ "$LIST_REVISIONS" == "true" ]]; then
        list_available_revisions
        exit 0
    fi
    
    confirm_rollback
    
    # Start rollback timer
    local start_time
    start_time=$(date +%s)
    
    rollback_deployments
    rollback_infrastructure
    verify_rollback
    
    # Calculate rollback time
    local end_time duration
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    
    success "=== Rollback completed successfully in ${duration}s ==="
    success "Environment: $ENVIRONMENT"
    success "Log file: $LOG_FILE"
    
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        warn "Production rollback complete!"
        warn "Monitor the applications closely for any issues"
        warn "Verify application functionality before considering the rollback successful"
    fi
}

# Trap cleanup
trap cleanup EXIT

# Run main function
main "$@"