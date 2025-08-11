#!/usr/bin/env node
/**
 * Mobile App API Connectivity Test
 * Tests the React Native app's connection to the backend API running on localhost:3004
 * 
 * This script simulates the mobile app's API calls to verify connectivity and functionality
 */

const fetch = require('node-fetch');

// Configuration
const API_BASE_URL = 'http://localhost:3004';
const TEST_USER = {
  email: 'test@datingoptimizer.com',
  password: 'TestPassword123!',
  first_name: 'Test',
  last_name: 'User'
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Test results tracking
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

/**
 * Make HTTP request with error handling
 */
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      timeout: 10000,
      ...options
    });
    
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data,
      headers: response.headers
    };
  } catch (error) {
    throw new Error(`Network error: ${error.message}`);
  }
}

/**
 * Log test result
 */
function logTest(testName, passed, message = '', data = null) {
  testResults.total++;
  const status = passed ? 'PASS' : 'FAIL';
  const color = passed ? colors.green : colors.red;
  
  console.log(`${color}${colors.bold}[${status}]${colors.reset} ${testName}`);
  
  if (message) {
    console.log(`  ${message}`);
  }
  
  if (data && !passed) {
    console.log(`  Data: ${JSON.stringify(data, null, 2)}`);
  }
  
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
    testResults.errors.push({ test: testName, message, data });
  }
  
  console.log('');
}

/**
 * Test basic API connectivity
 */
async function testApiConnectivity() {
  console.log(`${colors.blue}${colors.bold}=== Testing API Connectivity ===${colors.reset}\n`);
  
  try {
    const response = await makeRequest(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: 'invalid' })
    });
    
    logTest(
      'API Server Connectivity',
      true,
      `Backend API is reachable at ${API_BASE_URL} (Status: ${response.status})`
    );
    
    return true;
  } catch (error) {
    logTest(
      'API Server Connectivity',
      false,
      `Cannot connect to backend API at ${API_BASE_URL}`,
      error.message
    );
    return false;
  }
}

/**
 * Test user registration endpoint
 */
async function testUserRegistration() {
  console.log(`${colors.blue}${colors.bold}=== Testing User Registration ===${colors.reset}\n`);
  
  try {
    const response = await makeRequest(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER)
    });
    
    if (response.ok) {
      logTest(
        'User Registration',
        true,
        'Registration successful or user already exists',
        response.data
      );
      return { success: true, data: response.data };
    } else if (response.status === 409) {
      logTest(
        'User Registration',
        true,
        'User already exists (expected for repeated tests)',
        response.data
      );
      return { success: true, data: response.data };
    } else {
      logTest(
        'User Registration',
        false,
        `Registration failed: ${response.statusText}`,
        response.data
      );
      return { success: false, data: response.data };
    }
  } catch (error) {
    logTest('User Registration', false, 'Registration request failed', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test user login endpoint
 */
async function testUserLogin() {
  console.log(`${colors.blue}${colors.bold}=== Testing User Login ===${colors.reset}\n`);
  
  try {
    const response = await makeRequest(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password
      })
    });
    
    if (response.ok && response.data.tokens) {
      logTest(
        'User Login',
        true,
        'Login successful, tokens received',
        { user: response.data.user?.email, hasTokens: !!response.data.tokens }
      );
      return { 
        success: true, 
        data: response.data,
        accessToken: response.data.tokens.access_token
      };
    } else {
      logTest(
        'User Login',
        false,
        `Login failed: ${response.statusText}`,
        response.data
      );
      return { success: false, data: response.data };
    }
  } catch (error) {
    logTest('User Login', false, 'Login request failed', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test authenticated user profile endpoint
 */
async function testUserProfile(accessToken) {
  console.log(`${colors.blue}${colors.bold}=== Testing User Profile ===${colors.reset}\n`);
  
  if (!accessToken) {
    logTest('User Profile', false, 'No access token available for authentication');
    return { success: false };
  }
  
  try {
    const response = await makeRequest(`${API_BASE_URL}/api/user/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      logTest(
        'User Profile (Authenticated)',
        true,
        'Profile data retrieved successfully',
        { userId: response.data.user?.id, email: response.data.user?.email }
      );
      return { success: true, data: response.data };
    } else {
      logTest(
        'User Profile (Authenticated)',
        false,
        `Profile request failed: ${response.statusText}`,
        response.data
      );
      return { success: false, data: response.data };
    }
  } catch (error) {
    logTest('User Profile (Authenticated)', false, 'Profile request failed', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test bio generation endpoint
 */
async function testBioGeneration(accessToken) {
  console.log(`${colors.blue}${colors.bold}=== Testing Bio Generation ===${colors.reset}\n`);
  
  if (!accessToken) {
    logTest('Bio Generation', false, 'No access token available for authentication');
    return { success: false };
  }
  
  try {
    const bioRequest = {
      basic_info: {
        age: 25,
        location: 'New York',
        occupation: 'Software Developer',
        education: 'Computer Science'
      },
      personality: {
        traits: ['funny', 'adventurous', 'intelligent'],
        interests: ['hiking', 'reading', 'cooking']
      },
      goals: {
        looking_for: 'serious_relationship',
        deal_breakers: ['smoking']
      }
    };
    
    const response = await makeRequest(`${API_BASE_URL}/api/bio/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bioRequest)
    });
    
    if (response.ok && response.data.generated_bio) {
      logTest(
        'Bio Generation',
        true,
        'Bio generated successfully',
        { 
          bioLength: response.data.generated_bio.length,
          hasVariations: !!response.data.variations
        }
      );
      return { success: true, data: response.data };
    } else {
      logTest(
        'Bio Generation',
        false,
        `Bio generation failed: ${response.statusText}`,
        response.data
      );
      return { success: false, data: response.data };
    }
  } catch (error) {
    logTest('Bio Generation', false, 'Bio generation request failed', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test photo analysis endpoint (expected to have some issues based on background info)
 */
async function testPhotoAnalysis(accessToken) {
  console.log(`${colors.blue}${colors.bold}=== Testing Photo Analysis ===${colors.reset}\n`);
  
  if (!accessToken) {
    logTest('Photo Analysis', false, 'No access token available for authentication');
    return { success: false };
  }
  
  try {
    // Test the photo analysis endpoint that's mentioned in the mobile app
    const response = await makeRequest(`${API_BASE_URL}/api/photo-analysis/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        photo_url: 'https://example.com/test-photo.jpg'
      })
    });
    
    if (response.ok) {
      logTest(
        'Photo Analysis',
        true,
        'Photo analysis endpoint is working',
        response.data
      );
      return { success: true, data: response.data };
    } else if (response.status === 404) {
      logTest(
        'Photo Analysis',
        false,
        'Photo analysis endpoint not found (expected based on current backend status)',
        `Status: ${response.status}`
      );
      return { success: false, expected: true, data: response.data };
    } else {
      logTest(
        'Photo Analysis',
        false,
        `Photo analysis failed: ${response.statusText}`,
        response.data
      );
      return { success: false, data: response.data };
    }
  } catch (error) {
    logTest('Photo Analysis', false, 'Photo analysis request failed', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test critical endpoints that are essential for mobile app functionality
 */
async function testCriticalEndpoints() {
  console.log(`${colors.blue}${colors.bold}=== Testing Critical Mobile App Endpoints ===${colors.reset}\n`);
  
  const criticalEndpoints = [
    { name: 'Health Check', url: `${API_BASE_URL}/api/health`, method: 'GET' },
    { name: 'Auth Refresh', url: `${API_BASE_URL}/api/auth/refresh`, method: 'POST' },
    { name: 'Payment Plans', url: `${API_BASE_URL}/api/payments/plans`, method: 'GET' },
  ];
  
  for (const endpoint of criticalEndpoints) {
    try {
      const response = await makeRequest(endpoint.url, {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        logTest(
          endpoint.name,
          true,
          `Endpoint available: ${endpoint.method} ${endpoint.url}`,
          `Status: ${response.status}`
        );
      } else if (response.status === 404) {
        logTest(
          endpoint.name,
          false,
          `Endpoint not found: ${endpoint.method} ${endpoint.url}`,
          `Status: ${response.status}`
        );
      } else {
        logTest(
          endpoint.name,
          false,
          `Endpoint error: ${response.statusText}`,
          response.data
        );
      }
    } catch (error) {
      logTest(endpoint.name, false, `Connection failed`, error.message);
    }
  }
}

/**
 * Print final test summary
 */
function printSummary() {
  console.log(`${colors.blue}${colors.bold}=== Mobile App API Connectivity Test Summary ===${colors.reset}\n`);
  
  const successRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  const summaryColor = testResults.failed === 0 ? colors.green : 
                      testResults.failed < testResults.passed ? colors.yellow : colors.red;
  
  console.log(`${summaryColor}${colors.bold}Total Tests: ${testResults.total}${colors.reset}`);
  console.log(`${colors.green}${colors.bold}Passed: ${testResults.passed}${colors.reset}`);
  console.log(`${colors.red}${colors.bold}Failed: ${testResults.failed}${colors.reset}`);
  console.log(`${summaryColor}${colors.bold}Success Rate: ${successRate}%${colors.reset}\n`);
  
  if (testResults.failed > 0) {
    console.log(`${colors.red}${colors.bold}Failed Tests:${colors.reset}`);
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.test}: ${error.message}`);
    });
    console.log('');
  }
  
  // Mobile app specific recommendations
  console.log(`${colors.blue}${colors.bold}Mobile App Connectivity Assessment:${colors.reset}`);
  
  if (testResults.failed === 0) {
    console.log(`${colors.green}✅ Mobile app should be able to connect successfully to the backend API${colors.reset}`);
    console.log(`${colors.green}✅ All critical authentication endpoints are working${colors.reset}`);
    console.log(`${colors.green}✅ Core features (registration, login, profile, bio generation) are functional${colors.reset}`);
  } else if (testResults.passed >= testResults.failed) {
    console.log(`${colors.yellow}⚠️  Mobile app can connect but some features may not work properly${colors.reset}`);
    console.log(`${colors.yellow}⚠️  Core authentication appears to be working${colors.reset}`);
    console.log(`${colors.yellow}⚠️  Some advanced features may have issues${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ Mobile app may have significant connectivity issues${colors.reset}`);
    console.log(`${colors.red}❌ Multiple critical endpoints are failing${colors.reset}`);
    console.log(`${colors.red}❌ App functionality will be severely limited${colors.reset}`);
  }
  
  console.log(`\n${colors.blue}Next Steps:${colors.reset}`);
  console.log(`1. Ensure backend is running: ${colors.bold}cd backend && PORT=3004 npm start${colors.reset}`);
  console.log(`2. Start mobile app: ${colors.bold}cd DatingProfileOptimizer && npm start${colors.reset}`);
  console.log(`3. Test on device/emulator: ${colors.bold}npm run android${colors.reset} or ${colors.bold}npm run ios${colors.reset}`);
  console.log(`4. Check network configuration on the device/emulator if issues persist`);
}

/**
 * Main test runner
 */
async function runTests() {
  console.log(`${colors.blue}${colors.bold}Dating Profile Optimizer - Mobile App API Connectivity Test${colors.reset}`);
  console.log(`${colors.blue}Testing backend API at: ${API_BASE_URL}${colors.reset}\n`);
  
  // Test basic connectivity first
  const isApiReachable = await testApiConnectivity();
  
  if (!isApiReachable) {
    console.log(`${colors.red}${colors.bold}❌ Cannot connect to backend API. Please ensure:${colors.reset}`);
    console.log(`   1. Backend server is running: cd backend && PORT=3004 npm start`);
    console.log(`   2. Server is listening on localhost:3004`);
    console.log(`   3. No firewall blocking the connection\n`);
    printSummary();
    process.exit(1);
  }
  
  // Run core authentication tests
  const registrationResult = await testUserRegistration();
  const loginResult = await testUserLogin();
  
  let accessToken = null;
  if (loginResult.success) {
    accessToken = loginResult.accessToken;
  }
  
  // Run authenticated tests
  await testUserProfile(accessToken);
  await testBioGeneration(accessToken);
  await testPhotoAnalysis(accessToken);
  
  // Test critical endpoints
  await testCriticalEndpoints();
  
  // Print final summary
  printSummary();
}

// Error handling for the entire script
process.on('uncaughtException', (error) => {
  console.error(`${colors.red}${colors.bold}Uncaught Exception:${colors.reset}`, error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error(`${colors.red}${colors.bold}Unhandled Rejection:${colors.reset}`, error);
  process.exit(1);
});

// Run the tests
if (require.main === module) {
  runTests().catch(error => {
    console.error(`${colors.red}${colors.bold}Test execution failed:${colors.reset}`, error);
    process.exit(1);
  });
}

module.exports = { runTests, testResults };