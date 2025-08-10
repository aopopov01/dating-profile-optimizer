#!/bin/bash

# Performance Testing Suite Runner for Dating Profile Optimizer
# Comprehensive performance testing with intelligent orchestration

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
API_URL="${API_URL:-http://localhost:3002}"
ENVIRONMENT="${NODE_ENV:-development}"
PARALLEL="${PARALLEL:-true}"
REPORT_PATH="${REPORT_PATH:-${SCRIPT_DIR}/test-results}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "${PURPLE}🔄 $1${NC}"
}

# Function to print usage
print_usage() {
    cat << EOF
Dating Profile Optimizer - Performance Testing Suite

Usage: $0 [OPTIONS] [TEST_SUITES...]

Options:
    -h, --help              Show this help message
    -u, --api-url URL       API URL to test (default: http://localhost:3002)
    -e, --environment ENV   Environment (development, staging, production)
    -p, --parallel          Run tests in parallel (default: true)
    -s, --sequential        Run tests sequentially
    -r, --report-path PATH  Report output path (default: ./test-results)
    -c, --config PATH       Configuration file path
    -v, --verbose           Verbose output
    --skip-checks          Skip pre-flight checks
    --quick                Run quick test suite only

Available Test Suites:
    load-testing           K6 load testing with dating app scenarios
    api-benchmarks         API endpoint benchmarking
    capacity-planning      Growth and capacity planning analysis
    database-performance   Database performance testing
    mobile-simulation      Mobile app performance simulation
    stress-testing         Stress testing to find breaking points
    ai-performance         AI processing performance testing

Examples:
    $0                                          # Run all tests
    $0 load-testing api-benchmarks             # Run specific tests
    $0 --api-url https://api.example.com       # Test remote API
    $0 --environment production --sequential   # Production testing
    $0 --quick                                 # Quick test suite

EOF
}

# Function to check dependencies
check_dependencies() {
    log_step "Checking dependencies..."
    
    local missing_deps=()
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        missing_deps+=("node")
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    fi
    
    # Check k6 (optional)
    if ! command -v k6 &> /dev/null; then
        log_warning "k6 not found - load testing will be limited"
    fi
    
    # Check Docker (optional)
    if ! command -v docker &> /dev/null; then
        log_warning "Docker not found - some tests may be limited"
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        log_info "Please install the missing dependencies and try again"
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js version 18 or higher is required (current: $(node -v))"
        exit 1
    fi
    
    log_success "All required dependencies found"
}

# Function to install npm dependencies
install_dependencies() {
    log_step "Installing/updating npm dependencies..."
    
    # Install performance testing dependencies
    cd "$SCRIPT_DIR"
    
    if [ ! -f "package.json" ]; then
        log_step "Creating package.json for performance testing..."
        cat > package.json << 'EOF'
{
  "name": "dating-optimizer-performance-tests",
  "version": "1.0.0",
  "description": "Performance testing suite for Dating Profile Optimizer",
  "scripts": {
    "test": "node comprehensive-test-runner.js",
    "benchmark": "node backend-benchmarks/dating-api-benchmarks.js",
    "capacity": "node capacity-planning/dating-capacity-planner.js"
  },
  "dependencies": {
    "axios": "^1.6.2",
    "js-yaml": "^4.1.0",
    "autocannon": "^7.12.0"
  },
  "devDependencies": {},
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF
    fi
    
    if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
        npm install
    else
        log_info "Dependencies already installed"
    fi
    
    log_success "Dependencies ready"
}

# Function to start backend services if needed
start_services() {
    if [ "$ENVIRONMENT" != "production" ] && [[ "$API_URL" == *"localhost"* ]]; then
        log_step "Checking if backend services need to be started..."
        
        # Check if API is responding
        if ! curl -f -s "$API_URL/health" > /dev/null 2>&1; then
            log_info "Backend API not responding, attempting to start services..."
            
            # Try to start with Docker Compose
            if [ -f "$PROJECT_ROOT/docker-compose.yml" ]; then
                log_step "Starting services with Docker Compose..."
                cd "$PROJECT_ROOT"
                docker-compose up -d
                
                # Wait for services to be ready
                log_step "Waiting for services to be ready..."
                for i in {1..30}; do
                    if curl -f -s "$API_URL/health" > /dev/null 2>&1; then
                        log_success "Backend services are ready"
                        break
                    fi
                    sleep 2
                    echo -n "."
                done
                echo
            else
                log_warning "Could not start backend services automatically"
                log_info "Please start the backend manually before running tests"
                exit 1
            fi
        else
            log_success "Backend API is already running"
        fi
    fi
}

# Function to create report directory
setup_reports() {
    log_step "Setting up report directory..."
    
    mkdir -p "$REPORT_PATH"
    
    # Create index.html for easy report browsing
    cat > "$REPORT_PATH/index.html" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Dating Profile Optimizer - Performance Test Reports</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .report-list { margin: 20px 0; }
        .report-item { margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Dating Profile Optimizer - Performance Test Reports</h1>
        <p>Generated: $(date)</p>
    </div>
    <div class="report-list">
        <p>Test reports will appear here after running the performance test suite.</p>
    </div>
</body>
</html>
EOF
    
    log_success "Report directory ready: $REPORT_PATH"
}

# Function to run the test suite
run_tests() {
    local test_suites=("$@")
    
    log_step "Starting comprehensive performance testing..."
    log_info "API URL: $API_URL"
    log_info "Environment: $ENVIRONMENT"
    log_info "Report Path: $REPORT_PATH"
    log_info "Parallel Execution: $PARALLEL"
    
    if [ ${#test_suites[@]} -gt 0 ]; then
        log_info "Test Suites: ${test_suites[*]}"
    else
        log_info "Test Suites: All available suites"
    fi
    
    echo
    
    cd "$SCRIPT_DIR"
    
    # Set environment variables
    export API_URL
    export NODE_ENV="$ENVIRONMENT"
    export REPORT_PATH
    export PARALLEL
    
    # Run the comprehensive test runner
    if [ ${#test_suites[@]} -gt 0 ]; then
        node comprehensive-test-runner.js "${test_suites[@]}"
    else
        node comprehensive-test-runner.js
    fi
}

# Function to generate summary report
generate_summary() {
    log_step "Generating test summary..."
    
    local latest_report
    latest_report=$(find "$REPORT_PATH" -name "comprehensive-test-results-*.json" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
    
    if [ -n "$latest_report" ] && [ -f "$latest_report" ]; then
        log_info "Latest report: $(basename "$latest_report")"
        
        # Extract key metrics using jq if available
        if command -v jq &> /dev/null; then
            echo
            log_info "Test Summary:"
            echo "  Total Tests: $(jq -r '.summary.totalTests' "$latest_report")"
            echo "  Completed: $(jq -r '.summary.completed' "$latest_report")"
            echo "  Failed: $(jq -r '.summary.failed' "$latest_report")"
            echo "  Success Rate: $(jq -r '.summary.successRate' "$latest_report")%"
            echo
        fi
        
        # Show HTML report location
        local html_report="${latest_report%.json}.html"
        if [ -f "$html_report" ]; then
            log_success "HTML Report: file://$html_report"
        fi
    else
        log_warning "No test results found"
    fi
}

# Function to cleanup
cleanup() {
    log_step "Cleaning up..."
    
    # Stop Docker services if we started them
    if [ "$ENVIRONMENT" != "production" ] && [ -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        if docker-compose ps | grep -q "Up"; then
            log_info "Stopping Docker Compose services..."
            cd "$PROJECT_ROOT"
            docker-compose down
        fi
    fi
    
    log_success "Cleanup completed"
}

# Main execution function
main() {
    local test_suites=()
    local skip_checks=false
    local quick_mode=false
    local verbose=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                print_usage
                exit 0
                ;;
            -u|--api-url)
                API_URL="$2"
                shift 2
                ;;
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -p|--parallel)
                PARALLEL="true"
                shift
                ;;
            -s|--sequential)
                PARALLEL="false"
                shift
                ;;
            -r|--report-path)
                REPORT_PATH="$2"
                shift 2
                ;;
            -c|--config)
                CONFIG_PATH="$2"
                export CONFIG_PATH
                shift 2
                ;;
            -v|--verbose)
                verbose=true
                set -x
                shift
                ;;
            --skip-checks)
                skip_checks=true
                shift
                ;;
            --quick)
                quick_mode=true
                test_suites=("api-benchmarks" "capacity-planning")
                shift
                ;;
            -*|--*)
                log_error "Unknown option $1"
                print_usage
                exit 1
                ;;
            *)
                test_suites+=("$1")
                shift
                ;;
        esac
    done
    
    # Set trap for cleanup
    trap cleanup EXIT
    
    # Print header
    echo
    log_success "Dating Profile Optimizer - Performance Testing Suite"
    echo "=================================================="
    echo
    
    # Run setup steps
    if [ "$skip_checks" != true ]; then
        check_dependencies
        install_dependencies
        start_services
    fi
    
    setup_reports
    
    # Run tests
    if [ ${#test_suites[@]} -gt 0 ]; then
        run_tests "${test_suites[@]}"
    else
        run_tests
    fi
    
    # Generate summary
    generate_summary
    
    echo
    log_success "Performance testing completed successfully!"
    echo
    log_info "Reports available at: $REPORT_PATH"
    echo
}

# Run main function with all arguments
main "$@"