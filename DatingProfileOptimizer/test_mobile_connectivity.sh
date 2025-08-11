#!/bin/bash
# Mobile App API Connectivity Test
# Tests connection to backend API at localhost:3004 using the same endpoints as the mobile app

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="http://localhost:3004"
TEST_USER_EMAIL="mobile.test@datingoptimizer.com"
TEST_USER_PASSWORD="TestPassword123@"
TEST_USER_FIRST_NAME="Test"
TEST_USER_LAST_NAME="User"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to log test results
log_test() {
    local test_name="$1"
    local status="$2"
    local message="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}${BOLD}[PASS]${NC} $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}${BOLD}[FAIL]${NC} $test_name"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    if [ -n "$message" ]; then
        echo -e "  $message"
    fi
    echo
}

# Function to make HTTP requests
make_request() {
    local method="$1"
    local url="$2"
    local data="$3"
    local headers="$4"
    local response_file=$(mktemp)
    local http_code_file=$(mktemp)
    
    if [ -n "$data" ] && [ -n "$headers" ]; then
        curl -s -X "$method" "$url" \
             -H "Content-Type: application/json" \
             -H "$headers" \
             -d "$data" \
             -w "%{http_code}" \
             -o "$response_file" \
             --connect-timeout 10 \
             --max-time 30 > "$http_code_file" 2>/dev/null
    elif [ -n "$data" ]; then
        curl -s -X "$method" "$url" \
             -H "Content-Type: application/json" \
             -d "$data" \
             -w "%{http_code}" \
             -o "$response_file" \
             --connect-timeout 10 \
             --max-time 30 > "$http_code_file" 2>/dev/null
    elif [ -n "$headers" ]; then
        curl -s -X "$method" "$url" \
             -H "Content-Type: application/json" \
             -H "$headers" \
             -w "%{http_code}" \
             -o "$response_file" \
             --connect-timeout 10 \
             --max-time 30 > "$http_code_file" 2>/dev/null
    else
        curl -s -X "$method" "$url" \
             -w "%{http_code}" \
             -o "$response_file" \
             --connect-timeout 10 \
             --max-time 30 > "$http_code_file" 2>/dev/null
    fi
    
    local http_code=$(cat "$http_code_file" 2>/dev/null || echo "000")
    local response=$(cat "$response_file" 2>/dev/null || echo "")
    
    rm -f "$response_file" "$http_code_file"
    
    echo "$http_code|$response"
}

# Test basic API connectivity
test_api_connectivity() {
    echo -e "${BLUE}${BOLD}=== Testing API Connectivity ===${NC}\n"
    
    local result=$(make_request "POST" "$API_BASE_URL/api/auth/login" '{"email":"test@test.com","password":"invalid"}' "")
    local http_code=$(echo "$result" | cut -d'|' -f1)
    
    if [ "$http_code" != "000" ]; then
        log_test "API Server Connectivity" "PASS" "Backend API is reachable at $API_BASE_URL (HTTP $http_code)"
        return 0
    else
        log_test "API Server Connectivity" "FAIL" "Cannot connect to backend API at $API_BASE_URL"
        return 1
    fi
}

# Test user registration
test_user_registration() {
    echo -e "${BLUE}${BOLD}=== Testing User Registration ===${NC}\n"
    
    # Use correct field names as expected by backend API
    local registration_data="{
        \"email\":\"$TEST_USER_EMAIL\",
        \"password\":\"$TEST_USER_PASSWORD\",
        \"firstName\":\"$TEST_USER_FIRST_NAME\",
        \"lastName\":\"$TEST_USER_LAST_NAME\",
        \"dateOfBirth\":\"1995-01-01\",
        \"gender\":\"other\",
        \"agreeToTerms\":\"true\",
        \"agreeToPrivacy\":\"true\"
    }"
    local result=$(make_request "POST" "$API_BASE_URL/api/auth/register" "$registration_data" "")
    local http_code=$(echo "$result" | cut -d'|' -f1)
    local response=$(echo "$result" | cut -d'|' -f2-)
    
    if [ "$http_code" = "201" ] || [ "$http_code" = "200" ]; then
        log_test "User Registration" "PASS" "Registration successful (HTTP $http_code)"
        return 0
    elif [ "$http_code" = "409" ]; then
        log_test "User Registration" "PASS" "User already exists (expected for repeated tests) (HTTP $http_code)"
        return 0
    else
        log_test "User Registration" "FAIL" "Registration failed (HTTP $http_code): $response"
        return 1
    fi
}

# Test user login and extract token
test_user_login() {
    echo -e "${BLUE}${BOLD}=== Testing User Login ===${NC}\n"
    
    local login_data="{\"email\":\"$TEST_USER_EMAIL\",\"password\":\"$TEST_USER_PASSWORD\"}"
    local result=$(make_request "POST" "$API_BASE_URL/api/auth/login" "$login_data" "")
    local http_code=$(echo "$result" | cut -d'|' -f1)
    local response=$(echo "$result" | cut -d'|' -f2-)
    
    if [ "$http_code" = "200" ]; then
        # Extract access token using simple grep/cut (basic JSON parsing)
        local access_token=""
        if echo "$response" | grep -q "token"; then
            # Try different token field patterns
            if echo "$response" | grep -q '"token"'; then
                access_token=$(echo "$response" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
            elif echo "$response" | grep -q '"access_token"'; then
                access_token=$(echo "$response" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')
            elif echo "$response" | grep -q '"accessToken"'; then
                access_token=$(echo "$response" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
            fi
        fi
        
        if [ -n "$access_token" ]; then
            log_test "User Login" "PASS" "Login successful, tokens received (HTTP $http_code)"
            echo "$access_token" > /tmp/dating_app_token
            return 0
        else
            log_test "User Login" "FAIL" "Login successful but no access token found"
            return 1
        fi
    else
        log_test "User Login" "FAIL" "Login failed (HTTP $http_code): $response"
        return 1
    fi
}

# Test user profile (authenticated endpoint)
test_user_profile() {
    echo -e "${BLUE}${BOLD}=== Testing User Profile ===${NC}\n"
    
    if [ ! -f "/tmp/dating_app_token" ]; then
        log_test "User Profile (Authenticated)" "FAIL" "No access token available for authentication"
        return 1
    fi
    
    local access_token=$(cat /tmp/dating_app_token)
    local result=$(make_request "GET" "$API_BASE_URL/api/user/profile" "" "Authorization: Bearer $access_token")
    local http_code=$(echo "$result" | cut -d'|' -f1)
    local response=$(echo "$result" | cut -d'|' -f2-)
    
    if [ "$http_code" = "200" ]; then
        log_test "User Profile (Authenticated)" "PASS" "Profile data retrieved successfully (HTTP $http_code)"
        return 0
    else
        log_test "User Profile (Authenticated)" "FAIL" "Profile request failed (HTTP $http_code): $response"
        return 1
    fi
}

# Test bio generation
test_bio_generation() {
    echo -e "${BLUE}${BOLD}=== Testing Bio Generation ===${NC}\n"
    
    if [ ! -f "/tmp/dating_app_token" ]; then
        log_test "Bio Generation" "FAIL" "No access token available for authentication"
        return 1
    fi
    
    local access_token=$(cat /tmp/dating_app_token)
    local bio_data='{
        "basic_info": {
            "age": 25,
            "location": "New York",
            "occupation": "Software Developer",
            "education": "Computer Science"
        },
        "personality": {
            "traits": ["funny", "adventurous", "intelligent"],
            "interests": ["hiking", "reading", "cooking"]
        },
        "goals": {
            "looking_for": "serious_relationship",
            "deal_breakers": ["smoking"]
        }
    }'
    
    local result=$(make_request "POST" "$API_BASE_URL/api/bio/generate" "$bio_data" "Authorization: Bearer $access_token")
    local http_code=$(echo "$result" | cut -d'|' -f1)
    local response=$(echo "$result" | cut -d'|' -f2-)
    
    if [ "$http_code" = "200" ]; then
        if echo "$response" | grep -q "generated_bio"; then
            log_test "Bio Generation" "PASS" "Bio generated successfully (HTTP $http_code)"
            return 0
        else
            log_test "Bio Generation" "FAIL" "Bio generation succeeded but no bio content found"
            return 1
        fi
    else
        log_test "Bio Generation" "FAIL" "Bio generation failed (HTTP $http_code): $response"
        return 1
    fi
}

# Test photo analysis endpoint (expected to have issues)
test_photo_analysis() {
    echo -e "${BLUE}${BOLD}=== Testing Photo Analysis ===${NC}\n"
    
    if [ ! -f "/tmp/dating_app_token" ]; then
        log_test "Photo Analysis" "FAIL" "No access token available for authentication"
        return 1
    fi
    
    local access_token=$(cat /tmp/dating_app_token)
    local photo_data='{"photo_url": "https://example.com/test-photo.jpg"}'
    
    local result=$(make_request "POST" "$API_BASE_URL/api/photo-analysis/analyze" "$photo_data" "Authorization: Bearer $access_token")
    local http_code=$(echo "$result" | cut -d'|' -f1)
    local response=$(echo "$result" | cut -d'|' -f2-)
    
    if [ "$http_code" = "200" ]; then
        log_test "Photo Analysis" "PASS" "Photo analysis endpoint is working (HTTP $http_code)"
        return 0
    elif [ "$http_code" = "404" ]; then
        log_test "Photo Analysis" "FAIL" "Photo analysis endpoint not found (expected based on current backend status) (HTTP $http_code)"
        return 1
    else
        log_test "Photo Analysis" "FAIL" "Photo analysis failed (HTTP $http_code): $response"
        return 1
    fi
}

# Test critical endpoints
test_critical_endpoints() {
    echo -e "${BLUE}${BOLD}=== Testing Critical Mobile App Endpoints ===${NC}\n"
    
    # Test endpoints that mobile app uses
    declare -a endpoints=(
        "GET|/api/health|Health Check"
        "POST|/api/auth/refresh|Auth Refresh Token"
        "GET|/api/payments/plans|Payment Plans"
    )
    
    for endpoint in "${endpoints[@]}"; do
        IFS='|' read -r method path name <<< "$endpoint"
        local result=$(make_request "$method" "$API_BASE_URL$path" "" "")
        local http_code=$(echo "$result" | cut -d'|' -f1)
        local response=$(echo "$result" | cut -d'|' -f2-)
        
        if [ "$http_code" = "200" ]; then
            log_test "$name" "PASS" "Endpoint available: $method $path (HTTP $http_code)"
        elif [ "$http_code" = "404" ]; then
            log_test "$name" "FAIL" "Endpoint not found: $method $path (HTTP $http_code)"
        else
            log_test "$name" "FAIL" "Endpoint error: $method $path (HTTP $http_code): $response"
        fi
    done
}

# Print final summary
print_summary() {
    echo -e "${BLUE}${BOLD}=== Mobile App API Connectivity Test Summary ===${NC}\n"
    
    local success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "${GREEN}${BOLD}Total Tests: $TOTAL_TESTS${NC}"
        echo -e "${GREEN}${BOLD}Passed: $PASSED_TESTS${NC}"
        echo -e "${GREEN}${BOLD}Failed: $FAILED_TESTS${NC}"
        echo -e "${GREEN}${BOLD}Success Rate: $success_rate%${NC}\n"
    elif [ $PASSED_TESTS -gt $FAILED_TESTS ]; then
        echo -e "${YELLOW}${BOLD}Total Tests: $TOTAL_TESTS${NC}"
        echo -e "${GREEN}${BOLD}Passed: $PASSED_TESTS${NC}"
        echo -e "${RED}${BOLD}Failed: $FAILED_TESTS${NC}"
        echo -e "${YELLOW}${BOLD}Success Rate: $success_rate%${NC}\n"
    else
        echo -e "${RED}${BOLD}Total Tests: $TOTAL_TESTS${NC}"
        echo -e "${GREEN}${BOLD}Passed: $PASSED_TESTS${NC}"
        echo -e "${RED}${BOLD}Failed: $FAILED_TESTS${NC}"
        echo -e "${RED}${BOLD}Success Rate: $success_rate%${NC}\n"
    fi
    
    echo -e "${BLUE}${BOLD}Mobile App Connectivity Assessment:${NC}"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "${GREEN}✅ Mobile app should be able to connect successfully to the backend API${NC}"
        echo -e "${GREEN}✅ All critical authentication endpoints are working${NC}"
        echo -e "${GREEN}✅ Core features (registration, login, profile, bio generation) are functional${NC}"
    elif [ $PASSED_TESTS -ge $FAILED_TESTS ]; then
        echo -e "${YELLOW}⚠️  Mobile app can connect but some features may not work properly${NC}"
        echo -e "${YELLOW}⚠️  Core authentication appears to be working${NC}"
        echo -e "${YELLOW}⚠️  Some advanced features may have issues${NC}"
    else
        echo -e "${RED}❌ Mobile app may have significant connectivity issues${NC}"
        echo -e "${RED}❌ Multiple critical endpoints are failing${NC}"
        echo -e "${RED}❌ App functionality will be severely limited${NC}"
    fi
    
    echo
    echo -e "${BLUE}Configuration Found in Mobile App:${NC}"
    echo -e "• API Base URL: ${BOLD}http://localhost:3004${NC}"
    echo -e "• Authentication: Bearer token system"
    echo -e "• Storage: AsyncStorage for tokens"
    echo -e "• Network library: fetch() API"
    
    echo
    echo -e "${BLUE}Next Steps for Mobile Testing:${NC}"
    echo -e "1. Ensure backend is running: ${BOLD}cd backend && PORT=3004 npm start${NC}"
    echo -e "2. Start React Native Metro: ${BOLD}cd DatingProfileOptimizer && npm start${NC}"
    echo -e "3. Run on Android: ${BOLD}npm run android${NC}"
    echo -e "4. Run on iOS: ${BOLD}npm run ios${NC}"
    echo
    echo -e "${YELLOW}Note: For Android emulator, you may need to use 10.0.2.2:3004 instead of localhost:3004${NC}"
    echo -e "${YELLOW}Note: For iOS simulator, localhost:3004 should work fine${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}${BOLD}Dating Profile Optimizer - Mobile App API Connectivity Test${NC}"
    echo -e "${BLUE}Testing backend API at: $API_BASE_URL${NC}"
    echo -e "${BLUE}Simulating mobile app API calls...${NC}\n"
    
    # Test basic connectivity first
    if ! test_api_connectivity; then
        echo -e "${RED}${BOLD}❌ Cannot connect to backend API. Please ensure:${NC}"
        echo -e "   1. Backend server is running: cd backend && PORT=3004 npm start"
        echo -e "   2. Server is listening on localhost:3004"
        echo -e "   3. No firewall blocking the connection\n"
        print_summary
        exit 1
    fi
    
    # Run all tests
    test_user_registration
    test_user_login
    test_user_profile
    test_bio_generation
    test_photo_analysis
    test_critical_endpoints
    
    # Print summary
    print_summary
    
    # Cleanup
    rm -f /tmp/dating_app_token
}

# Run the tests
main "$@"