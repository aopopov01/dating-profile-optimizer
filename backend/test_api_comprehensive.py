#!/usr/bin/env python3
"""
Comprehensive API Test Suite for Dating Profile Optimizer Backend
Tests all endpoints systematically with proper error handling and reporting.
"""

import requests
import json
from datetime import datetime
import time

# Configuration
BASE_URL = "http://localhost:3004"
HEADERS = {"Content-Type": "application/json"}

class APITester:
    def __init__(self):
        self.auth_token = None
        self.refresh_token = None
        self.user_id = None
        self.test_results = {
            "passed": [],
            "failed": [],
            "errors": []
        }
    
    def log_result(self, endpoint, method, status, message, response_data=None):
        """Log test results"""
        result = {
            "endpoint": endpoint,
            "method": method,
            "status": status,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        
        if status == "PASS":
            self.test_results["passed"].append(result)
        elif status == "FAIL":
            self.test_results["failed"].append(result)
        else:
            self.test_results["errors"].append(result)
        
        print(f"[{status}] {method} {endpoint}: {message}")
    
    def make_request(self, method, endpoint, data=None, auth_required=False):
        """Make HTTP request with optional authentication"""
        headers = HEADERS.copy()
        if auth_required and self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        
        url = f"{BASE_URL}{endpoint}"
        
        try:
            if method.upper() == "GET":
                return requests.get(url, headers=headers, timeout=10)
            elif method.upper() == "POST":
                return requests.post(url, headers=headers, json=data, timeout=10)
            elif method.upper() == "PUT":
                return requests.put(url, headers=headers, json=data, timeout=10)
            elif method.upper() == "DELETE":
                return requests.delete(url, headers=headers, timeout=10)
        except requests.exceptions.ConnectionError:
            return None
        except Exception as e:
            print(f"Request error: {str(e)}")
            return None
    
    def test_health_check(self):
        """Test health check endpoint"""
        print("\n" + "="*60)
        print("1. TESTING HEALTH CHECK ENDPOINT")
        print("="*60)
        
        response = self.make_request("GET", "/health")
        if response is None:
            self.log_result("/health", "GET", "ERROR", "Connection refused - server may not be running")
            return False
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.log_result("/health", "GET", "PASS", f"Status: {response.status_code}, Response: {data}")
                return True
            except:
                self.log_result("/health", "GET", "PASS", f"Status: {response.status_code}, Text response")
                return True
        else:
            self.log_result("/health", "GET", "FAIL", f"Expected 200, got {response.status_code}")
            return False
    
    def test_authentication(self):
        """Test all authentication endpoints"""
        print("\n" + "="*60)
        print("2. TESTING AUTHENTICATION ENDPOINTS")
        print("="*60)
        
        # Test data for user registration
        user_data = {
            "email": "testuser@example.com",
            "password": "TestPassword123!",
            "firstName": "Test",
            "lastName": "User",
            "dateOfBirth": "1995-01-15",
            "gender": "male",
            "interestedIn": "women",
            "location": "San Francisco, CA",
            "agreeToTerms": True,
            "agreeToPrivacy": True
        }
        
        # 2a. User Registration
        print("\nTesting user registration...")
        response = self.make_request("POST", "/api/auth/register", user_data)
        if response is None:
            self.log_result("/api/auth/register", "POST", "ERROR", "Connection error")
            return False
        
        if response.status_code in [200, 201]:
            try:
                data = response.json()
                self.log_result("/api/auth/register", "POST", "PASS", "User registered successfully")
                if 'user' in data and 'id' in data['user']:
                    self.user_id = data['user']['id']
            except:
                self.log_result("/api/auth/register", "POST", "PASS", "Registration successful (no JSON)")
        else:
            try:
                error_data = response.json()
                self.log_result("/api/auth/register", "POST", "FAIL", f"Status {response.status_code}: {error_data.get('error', 'Unknown error')}")
            except:
                self.log_result("/api/auth/register", "POST", "FAIL", f"Status {response.status_code}: {response.text}")
        
        # 2b. User Login
        print("\nTesting user login...")
        login_data = {
            "email": "testuser@example.com",
            "password": "TestPassword123!"
        }
        
        response = self.make_request("POST", "/api/auth/login", login_data)
        if response is None:
            self.log_result("/api/auth/login", "POST", "ERROR", "Connection error")
            return False
        
        if response.status_code == 200:
            try:
                data = response.json()
                if 'token' in data:
                    self.auth_token = data['token']
                    if 'refreshToken' in data:
                        self.refresh_token = data['refreshToken']
                    self.log_result("/api/auth/login", "POST", "PASS", "Login successful, token obtained")
                    return True
                else:
                    self.log_result("/api/auth/login", "POST", "FAIL", "No token in response")
            except:
                self.log_result("/api/auth/login", "POST", "FAIL", "Invalid JSON response")
        else:
            try:
                error_data = response.json()
                self.log_result("/api/auth/login", "POST", "FAIL", f"Status {response.status_code}: {error_data.get('error', 'Unknown error')}")
            except:
                self.log_result("/api/auth/login", "POST", "FAIL", f"Status {response.status_code}: {response.text}")
        
        return False
    
    def test_token_refresh(self):
        """Test token refresh endpoint"""
        if not self.refresh_token:
            self.log_result("/api/auth/refresh", "POST", "ERROR", "No refresh token available")
            return
        
        print("\nTesting token refresh...")
        refresh_data = {"refreshToken": self.refresh_token}
        response = self.make_request("POST", "/api/auth/refresh", refresh_data)
        
        if response is None:
            self.log_result("/api/auth/refresh", "POST", "ERROR", "Connection error")
            return
        
        if response.status_code == 200:
            try:
                data = response.json()
                if 'token' in data:
                    old_token = self.auth_token
                    self.auth_token = data['token']
                    self.log_result("/api/auth/refresh", "POST", "PASS", "Token refreshed successfully")
                else:
                    self.log_result("/api/auth/refresh", "POST", "FAIL", "No new token in response")
            except:
                self.log_result("/api/auth/refresh", "POST", "FAIL", "Invalid JSON response")
        else:
            self.log_result("/api/auth/refresh", "POST", "FAIL", f"Status {response.status_code}")
    
    def test_profile_endpoints(self):
        """Test profile endpoints"""
        print("\n" + "="*60)
        print("3. TESTING PROFILE ENDPOINTS")
        print("="*60)
        
        if not self.auth_token:
            self.log_result("/api/profile", "GET", "ERROR", "No auth token for testing")
            return
        
        # 3a. Get Profile
        print("\nTesting GET profile...")
        response = self.make_request("GET", "/api/profile", auth_required=True)
        if response is None:
            self.log_result("/api/profile", "GET", "ERROR", "Connection error")
        elif response.status_code == 200:
            try:
                data = response.json()
                self.log_result("/api/profile", "GET", "PASS", "Profile retrieved successfully")
            except:
                self.log_result("/api/profile", "GET", "PASS", "Profile retrieved (non-JSON)")
        else:
            self.log_result("/api/profile", "GET", "FAIL", f"Status {response.status_code}")
        
        # 3b. Update Profile
        print("\nTesting PUT profile...")
        profile_update = {
            "bio": "Updated bio for testing",
            "interests": ["hiking", "photography", "cooking"],
            "location": "Los Angeles, CA"
        }
        
        response = self.make_request("PUT", "/api/profile", profile_update, auth_required=True)
        if response is None:
            self.log_result("/api/profile", "PUT", "ERROR", "Connection error")
        elif response.status_code in [200, 204]:
            self.log_result("/api/profile", "PUT", "PASS", "Profile updated successfully")
        else:
            self.log_result("/api/profile", "PUT", "FAIL", f"Status {response.status_code}")

def main():
    """Main test execution"""
    print("Starting Comprehensive API Test Suite")
    print("Dating Profile Optimizer Backend")
    print(f"Target: {BASE_URL}")
    print(f"Started at: {datetime.now().isoformat()}")
    
    tester = APITester()
    
    # Run all tests
    server_available = tester.test_health_check()
    
    if server_available:
        auth_success = tester.test_authentication()
        tester.test_token_refresh()
        tester.test_profile_endpoints()
    else:
        print("\n❌ Server not available - skipping remaining tests")
        return
    
    # Print summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    total_tests = len(tester.test_results["passed"]) + len(tester.test_results["failed"]) + len(tester.test_results["errors"])
    passed = len(tester.test_results["passed"])
    failed = len(tester.test_results["failed"])
    errors = len(tester.test_results["errors"])
    
    print(f"Total Tests: {total_tests}")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"🚨 Errors: {errors}")
    
    if tester.test_results["failed"]:
        print("\nFAILED TESTS:")
        for result in tester.test_results["failed"]:
            print(f"  • {result['method']} {result['endpoint']}: {result['message']}")
    
    if tester.test_results["errors"]:
        print("\nERROR TESTS:")
        for result in tester.test_results["errors"]:
            print(f"  • {result['method']} {result['endpoint']}: {result['message']}")
    
    # Save detailed results
    with open('api_test_results.json', 'w') as f:
        json.dump(tester.test_results, f, indent=2)
    
    print(f"\nDetailed results saved to: api_test_results.json")

if __name__ == "__main__":
    main()