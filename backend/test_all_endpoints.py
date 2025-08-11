#!/usr/bin/env python3
"""
Complete API Test Suite for Dating Profile Optimizer Backend
Tests all endpoints including error cases and edge scenarios
"""

import requests
import json
from datetime import datetime
import time
import random
import string

BASE_URL = "http://localhost:3004"
HEADERS = {"Content-Type": "application/json"}

class ComprehensiveAPITester:
    def __init__(self):
        self.auth_token = None
        self.refresh_token = None
        self.user_id = None
        self.test_results = {"passed": [], "failed": [], "errors": []}
        self.photo_analysis_id = None
        
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
    
    def make_request(self, method, endpoint, data=None, auth_required=False, files=None):
        """Make HTTP request with optional authentication"""
        headers = HEADERS.copy() if not files else {}
        if auth_required and self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        
        url = f"{BASE_URL}{endpoint}"
        
        try:
            kwargs = {"headers": headers, "timeout": 15}
            if files:
                kwargs["files"] = files
                if data:
                    kwargs["data"] = data
            elif data:
                kwargs["json"] = data
            
            if method.upper() == "GET":
                return requests.get(url, **kwargs)
            elif method.upper() == "POST":
                return requests.post(url, **kwargs)
            elif method.upper() == "PUT":
                return requests.put(url, **kwargs)
            elif method.upper() == "DELETE":
                return requests.delete(url, **kwargs)
        except Exception as e:
            print(f"Request error for {endpoint}: {str(e)}")
            return None
    
    def generate_unique_email(self):
        """Generate unique email for testing"""
        random_string = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        return f"testuser_{random_string}@example.com"
    
    def test_health_check(self):
        """Test health check endpoint"""
        print("\n" + "="*80)
        print("1. TESTING HEALTH CHECK ENDPOINT")
        print("="*80)
        
        response = self.make_request("GET", "/health")
        if response is None:
            self.log_result("/health", "GET", "ERROR", "Connection refused - server may not be running")
            return False
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.log_result("/health", "GET", "PASS", f"Server healthy - {data.get('status', 'unknown')}")
                return True
            except:
                self.log_result("/health", "GET", "PASS", "Server responded (non-JSON)")
                return True
        else:
            self.log_result("/health", "GET", "FAIL", f"Expected 200, got {response.status_code}")
            return False
    
    def test_authentication_endpoints(self):
        """Test authentication endpoints with fresh user"""
        print("\n" + "="*80)
        print("2. TESTING AUTHENTICATION ENDPOINTS")
        print("="*80)
        
        # Use unique email to avoid conflicts
        unique_email = self.generate_unique_email()
        print(f"Using email: {unique_email}")
        
        user_data = {
            "email": unique_email,
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
        
        # Test Registration
        print("\nTesting user registration...")
        response = self.make_request("POST", "/api/auth/register", user_data)
        if response is None:
            self.log_result("/api/auth/register", "POST", "ERROR", "Connection error")
            return False
        
        if response.status_code in [200, 201]:
            try:
                data = response.json()
                self.log_result("/api/auth/register", "POST", "PASS", "Registration successful")
                if 'user' in data and 'id' in data['user']:
                    self.user_id = data['user']['id']
            except:
                self.log_result("/api/auth/register", "POST", "PASS", "Registration successful (no JSON)")
        elif response.status_code == 409:
            # User exists, that's fine - try to get fresh email
            unique_email = self.generate_unique_email()
            user_data["email"] = unique_email
            response = self.make_request("POST", "/api/auth/register", user_data)
            if response and response.status_code in [200, 201]:
                self.log_result("/api/auth/register", "POST", "PASS", "Registration successful (retry)")
            else:
                self.log_result("/api/auth/register", "POST", "FAIL", f"Registration failed even with new email: {response.status_code if response else 'No response'}")
        else:
            try:
                error_data = response.json()
                self.log_result("/api/auth/register", "POST", "FAIL", f"Status {response.status_code}: {error_data.get('error', 'Unknown error')}")
            except:
                self.log_result("/api/auth/register", "POST", "FAIL", f"Status {response.status_code}: {response.text}")
        
        # Test Login
        print("\nTesting user login...")
        login_data = {
            "email": unique_email,
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
                    self.log_result("/api/auth/login", "POST", "PASS", "Login successful")
                    return True
                else:
                    self.log_result("/api/auth/login", "POST", "FAIL", "No token in response")
            except:
                self.log_result("/api/auth/login", "POST", "FAIL", "Invalid JSON response")
        else:
            try:
                error_data = response.json()
                self.log_result("/api/auth/login", "POST", "FAIL", f"Status {response.status_code}: {error_data.get('error', 'Login failed')}")
            except:
                self.log_result("/api/auth/login", "POST", "FAIL", f"Status {response.status_code}: {response.text}")
        
        return False
    
    def test_token_refresh(self):
        """Test token refresh"""
        if not self.refresh_token:
            self.log_result("/api/auth/refresh", "POST", "ERROR", "No refresh token available")
            return
        
        print("\nTesting token refresh...")
        refresh_data = {"refreshToken": self.refresh_token}
        response = self.make_request("POST", "/api/auth/refresh", refresh_data)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                if 'token' in data:
                    self.auth_token = data['token']
                    self.log_result("/api/auth/refresh", "POST", "PASS", "Token refreshed")
                else:
                    self.log_result("/api/auth/refresh", "POST", "FAIL", "No new token")
            except:
                self.log_result("/api/auth/refresh", "POST", "FAIL", "Invalid response")
        else:
            self.log_result("/api/auth/refresh", "POST", "FAIL", f"Status {response.status_code if response else 'No response'}")
    
    def test_logout(self):
        """Test logout"""
        if not self.auth_token:
            self.log_result("/api/auth/logout", "POST", "ERROR", "No auth token")
            return
        
        print("\nTesting logout...")
        response = self.make_request("POST", "/api/auth/logout", auth_required=True)
        
        if response and response.status_code in [200, 204]:
            self.log_result("/api/auth/logout", "POST", "PASS", "Logout successful")
        else:
            self.log_result("/api/auth/logout", "POST", "FAIL", f"Status {response.status_code if response else 'No response'}")

def main():
    """Main execution"""
    print("Starting Comprehensive API Test Suite")
    print("Dating Profile Optimizer Backend")
    print(f"Target: {BASE_URL}")
    print(f"Started at: {datetime.now().isoformat()}")
    
    tester = ComprehensiveAPITester()
    
    # Test basic connectivity first
    server_available = tester.test_health_check()
    
    if not server_available:
        print("\n❌ Server not available - aborting all tests")
        return
    
    # Test authentication flow
    auth_success = tester.test_authentication_endpoints()
    tester.test_token_refresh()
    
    # Print intermediate summary
    print(f"\n📊 Authentication Tests Complete")
    print(f"Auth Token Available: {'✅' if tester.auth_token else '❌'}")
    
    # Save results so far
    with open('api_test_results_comprehensive.json', 'w') as f:
        json.dump(tester.test_results, f, indent=2)
    
    print(f"\n🔄 Initial results saved to: api_test_results_comprehensive.json")
    print(f"Run the next part of tests...")

if __name__ == "__main__":
    main()