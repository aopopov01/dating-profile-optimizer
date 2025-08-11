#!/usr/bin/env python3
"""
Test endpoints that don't require authentication and debug authentication issues
"""

import requests
import json
from datetime import datetime
import traceback

BASE_URL = "http://localhost:3004"
HEADERS = {"Content-Type": "application/json"}

def test_endpoint_detailed(method, endpoint, data=None, description=""):
    """Test endpoint with detailed error reporting"""
    print(f"\n🧪 Testing: {method} {endpoint}")
    if description:
        print(f"   Description: {description}")
    
    try:
        url = f"{BASE_URL}{endpoint}"
        
        if method.upper() == "GET":
            response = requests.get(url, headers=HEADERS, timeout=10)
        elif method.upper() == "POST":
            response = requests.post(url, headers=HEADERS, json=data, timeout=10)
        elif method.upper() == "PUT":
            response = requests.put(url, headers=HEADERS, json=data, timeout=10)
        elif method.upper() == "DELETE":
            response = requests.delete(url, headers=HEADERS, timeout=10)
        
        print(f"   ✅ Status: {response.status_code}")
        print(f"   📝 Headers: {dict(response.headers)}")
        
        # Try to parse response
        try:
            response_data = response.json()
            print(f"   📊 Response: {json.dumps(response_data, indent=2)}")
        except:
            print(f"   📄 Response Text: {response.text}")
        
        return response
        
    except requests.exceptions.ConnectionError as e:
        print(f"   ❌ Connection Error: {e}")
        return None
    except requests.exceptions.Timeout as e:
        print(f"   ⏰ Timeout Error: {e}")
        return None
    except Exception as e:
        print(f"   🚨 Unexpected Error: {e}")
        print(f"   🔍 Traceback: {traceback.format_exc()}")
        return None

def test_public_endpoints():
    """Test endpoints that should work without authentication"""
    print("=" * 80)
    print("TESTING PUBLIC ENDPOINTS")
    print("=" * 80)
    
    # 1. Health Check
    test_endpoint_detailed("GET", "/health", description="Server health check")
    
    # 2. Test registration with detailed debugging
    user_data = {
        "email": "debug_user@example.com",
        "password": "TestPassword123!",
        "firstName": "Debug",
        "lastName": "User",
        "dateOfBirth": "1995-01-15",
        "gender": "male",
        "interestedIn": "women",
        "location": "San Francisco, CA",
        "agreeToTerms": True,
        "agreeToPrivacy": True
    }
    
    test_endpoint_detailed("POST", "/api/auth/register", user_data, "User registration with debug data")
    
    # 3. Test login with debug data
    login_data = {
        "email": "debug_user@example.com",
        "password": "TestPassword123!"
    }
    
    test_endpoint_detailed("POST", "/api/auth/login", login_data, "User login with debug credentials")

def test_endpoints_without_auth():
    """Test protected endpoints without auth (should return 401)"""
    print("\n" + "=" * 80)
    print("TESTING PROTECTED ENDPOINTS WITHOUT AUTH (Expect 401s)")
    print("=" * 80)
    
    endpoints_to_test = [
        ("GET", "/api/profile", None, "Get user profile"),
        ("PUT", "/api/profile", {"bio": "test"}, "Update user profile"),
        ("POST", "/api/bio/generate", {"style": "casual", "interests": ["hiking"]}, "Generate bio"),
        ("GET", "/api/bio/history", None, "Get bio history"),
        ("POST", "/api/photo/analyze", {"photoUrl": "https://example.com/photo.jpg"}, "Analyze photo"),
        ("POST", "/api/analytics/track", {"event": "test", "properties": {}}, "Track analytics"),
        ("GET", "/api/analytics/report", None, "Get analytics report"),
        ("GET", "/api/results/dashboard", None, "Get dashboard"),
        ("GET", "/api/results/improvements", None, "Get improvements")
    ]
    
    for method, endpoint, data, description in endpoints_to_test:
        test_endpoint_detailed(method, endpoint, data, description)

def test_nonexistent_endpoints():
    """Test non-existent endpoints"""
    print("\n" + "=" * 80)
    print("TESTING NON-EXISTENT ENDPOINTS (Expect 404s)")
    print("=" * 80)
    
    nonexistent_endpoints = [
        ("GET", "/api/nonexistent", "Non-existent GET endpoint"),
        ("POST", "/api/fake", "Non-existent POST endpoint"),
        ("GET", "/api/user/999999", "Non-existent user endpoint")
    ]
    
    for method, endpoint, description in nonexistent_endpoints:
        test_endpoint_detailed(method, endpoint, description=description)

def test_database_connection():
    """Test if we can infer database connection status from API behavior"""
    print("\n" + "=" * 80)
    print("TESTING DATABASE CONNECTION INFERENCE")
    print("=" * 80)
    
    # The health endpoint might tell us about database status
    response = test_endpoint_detailed("GET", "/health", description="Check database connection status")
    
    if response and response.status_code == 200:
        try:
            health_data = response.json()
            db_status = health_data.get('database', 'unknown')
            print(f"\n   💾 Database Status from Health Check: {db_status}")
            
            if db_status == 'connected':
                print("   ✅ Database appears to be connected")
            else:
                print("   ❌ Database connection issue detected")
                
        except:
            print("   ⚠️ Could not determine database status")

def main():
    print("🚀 Starting Detailed API Endpoint Testing")
    print(f"🎯 Target: {BASE_URL}")
    print(f"🕐 Started at: {datetime.now().isoformat()}")
    print("\nThis test will provide detailed information about each endpoint response")
    print("to help debug authentication and other issues.\n")
    
    # Run all test categories
    test_database_connection()
    test_public_endpoints()
    test_endpoints_without_auth()
    test_nonexistent_endpoints()
    
    print("\n" + "=" * 80)
    print("🏁 TESTING COMPLETE")
    print("=" * 80)
    print("Review the detailed output above to identify issues.")
    print("Look for:")
    print("• 500 errors indicate server-side problems")
    print("• Connection errors indicate server is not running")  
    print("• 401 errors are expected for protected endpoints without auth")
    print("• 404 errors are expected for non-existent endpoints")

if __name__ == "__main__":
    main()