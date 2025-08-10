import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// Custom metrics for dating app specific performance
const bioGenerationTime = new Trend('bio_generation_duration');
const photoAnalysisTime = new Trend('photo_analysis_duration');
const profileLoadTime = new Trend('profile_load_duration');
const matchingTime = new Trend('matching_duration');
const conversationLoadTime = new Trend('conversation_load_duration');

const bioGenerationFailureRate = new Rate('bio_generation_failures');
const photoAnalysisFailureRate = new Rate('photo_analysis_failures');
const profileLoadFailureRate = new Rate('profile_load_failures');
const matchingFailureRate = new Rate('matching_failures');

const activeUsers = new Gauge('active_users_count');
const concurrentSessions = new Gauge('concurrent_sessions');

// Dating app specific configuration
export let options = {
  scenarios: {
    // New user registration and profile creation flow
    onboarding_flow: {
      executor: 'per-vu-iterations',
      vus: 10,
      iterations: 50,
      maxDuration: '10m',
      tags: { scenario: 'onboarding' },
    },
    
    // Active user browsing and engagement
    active_browsing: {
      executor: 'ramping-vus',
      startVUs: 20,
      stages: [
        { duration: '2m', target: 50 },   // Ramp up to 50 users
        { duration: '5m', target: 100 },  // Peak at 100 users
        { duration: '3m', target: 150 },  // Spike to 150 users
        { duration: '5m', target: 100 },  // Back to 100 users
        { duration: '2m', target: 0 },    // Ramp down
      ],
      tags: { scenario: 'browsing' },
    },
    
    // Heavy AI processing load (bio generation and photo analysis)
    ai_processing: {
      executor: 'constant-vus',
      vus: 30,
      duration: '8m',
      tags: { scenario: 'ai_processing' },
    },
    
    // Peak time simulation (evening engagement)
    peak_time: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      stages: [
        { duration: '2m', target: 10 },   // Gradual increase
        { duration: '5m', target: 30 },   // Peak engagement
        { duration: '3m', target: 50 },   // Super peak
        { duration: '5m', target: 20 },   // Wind down
        { duration: '2m', target: 5 },    // Back to normal
      ],
      preAllocatedVUs: 100,
      maxVUs: 200,
      tags: { scenario: 'peak_time' },
    },
    
    // Stress test for breaking points
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 200 },
        { duration: '3m', target: 300 },
        { duration: '5m', target: 400 }, // Push to breaking point
        { duration: '2m', target: 0 },
      ],
      tags: { scenario: 'stress' },
    }
  },
  
  // Performance thresholds specific to dating apps
  thresholds: {
    // General API performance
    'http_req_duration': [
      'p(95)<2000',    // 95% of requests under 2s
      'p(99)<5000',    // 99% of requests under 5s
    ],
    'http_req_failed': ['rate<0.05'], // Error rate under 5%
    
    // Dating app specific thresholds
    'bio_generation_duration': [
      'p(95)<8000',    // Bio generation under 8s for 95%
      'p(99)<15000',   // Bio generation under 15s for 99%
    ],
    'photo_analysis_duration': [
      'p(95)<10000',   // Photo analysis under 10s for 95%
      'p(99)<20000',   // Photo analysis under 20s for 99%
    ],
    'profile_load_duration': [
      'p(95)<1000',    // Profile loads under 1s for 95%
      'p(99)<3000',    // Profile loads under 3s for 99%
    ],
    'matching_duration': [
      'p(95)<2000',    // Matching under 2s for 95%
      'p(99)<5000',    // Matching under 5s for 99%
    ],
    
    // Failure rate thresholds
    'bio_generation_failures': ['rate<0.1'],    // Bio generation failure < 10%
    'photo_analysis_failures': ['rate<0.1'],    // Photo analysis failure < 10%
    'profile_load_failures': ['rate<0.05'],     // Profile load failure < 5%
    'matching_failures': ['rate<0.05'],         // Matching failure < 5%
  },
};

// Configuration
const BASE_URL = __ENV.API_URL || 'http://localhost:3002';
const API_VERSION = '/api/v1';

// Test data for dating app scenarios
const testUsers = [
  {
    email: 'user1@dating.test',
    password: 'testpass123',
    profile: {
      name: 'Alex Johnson',
      age: 28,
      bio: 'Love hiking and good coffee',
      interests: ['hiking', 'coffee', 'photography'],
      location: 'San Francisco, CA'
    }
  },
  {
    email: 'user2@dating.test',
    password: 'testpass123',
    profile: {
      name: 'Sarah Chen',
      age: 26,
      bio: 'Yoga instructor and travel enthusiast',
      interests: ['yoga', 'travel', 'meditation'],
      location: 'Los Angeles, CA'
    }
  },
  {
    email: 'user3@dating.test',
    password: 'testpass123',
    profile: {
      name: 'Mike Rodriguez',
      age: 32,
      bio: 'Software engineer who loves cooking',
      interests: ['coding', 'cooking', 'music'],
      location: 'Austin, TX'
    }
  }
];

const samplePhotos = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1494790108755-2616b332cdde?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop'
];

// Shared state for user sessions
let authTokens = {};
let userProfiles = {};

/**
 * Setup function - runs once before all scenarios
 */
export function setup() {
  console.log('Setting up dating app load test...');
  
  // Health check
  const healthResponse = http.get(`${BASE_URL}/health`);
  if (healthResponse.status !== 200) {
    throw new Error(`API health check failed: ${healthResponse.status}`);
  }
  
  console.log('API is healthy, starting load test');
  return { baseUrl: BASE_URL };
}

/**
 * Default function for basic user scenarios
 */
export default function(data) {
  const scenario = __ENV.SCENARIO || 'mixed';
  
  switch (scenario) {
    case 'onboarding':
      onboardingUserFlow();
      break;
    case 'browsing':
      activeBrowsingFlow();
      break;
    case 'ai_processing':
      aiProcessingFlow();
      break;
    case 'peak_time':
      peakTimeFlow();
      break;
    case 'stress':
      stressTestFlow();
      break;
    default:
      mixedUserFlow();
  }
}

/**
 * New user onboarding flow
 */
function onboardingUserFlow() {
  group('User Onboarding Flow', () => {
    const userIndex = Math.floor(Math.random() * testUsers.length);
    const userData = testUsers[userIndex];
    const uniqueEmail = `${Date.now()}_${__VU}_${userIndex}@dating.test`;
    
    // Step 1: User Registration
    group('Registration', () => {
      const registrationPayload = {
        email: uniqueEmail,
        password: userData.password,
        name: userData.profile.name,
        age: userData.profile.age
      };
      
      const registrationResponse = http.post(
        `${BASE_URL}${API_VERSION}/auth/register`,
        JSON.stringify(registrationPayload),
        {
          headers: { 'Content-Type': 'application/json' },
          tags: { endpoint: 'registration' },
        }
      );
      
      const registrationSuccess = check(registrationResponse, {
        'registration status is 201': (r) => r.status === 201,
        'registration returns token': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.token && body.token.length > 0;
          } catch {
            return false;
          }
        },
      });
      
      if (registrationSuccess) {
        const regBody = JSON.parse(registrationResponse.body);
        authTokens[__VU] = regBody.token;
        userProfiles[__VU] = regBody.user;
        activeUsers.add(1);
      }
    });
    
    sleep(1);
    
    // Step 2: Profile Creation
    if (authTokens[__VU]) {
      group('Profile Creation', () => {
        const profilePayload = {
          bio: userData.profile.bio,
          interests: userData.profile.interests,
          location: userData.profile.location
        };
        
        const profileResponse = http.put(
          `${BASE_URL}${API_VERSION}/profiles`,
          JSON.stringify(profilePayload),
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authTokens[__VU]}`
            },
            tags: { endpoint: 'profile_creation' },
          }
        );
        
        check(profileResponse, {
          'profile creation status is 200': (r) => r.status === 200,
          'profile creation successful': (r) => {
            try {
              const body = JSON.parse(r.body);
              return body.success === true;
            } catch {
              return false;
            }
          },
        });
      });
      
      sleep(2);
      
      // Step 3: Photo Upload
      group('Photo Upload', () => {
        const photoUrl = samplePhotos[Math.floor(Math.random() * samplePhotos.length)];
        const photoPayload = {
          photo_url: photoUrl,
          is_primary: true
        };
        
        const photoResponse = http.post(
          `${BASE_URL}${API_VERSION}/photos`,
          JSON.stringify(photoPayload),
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authTokens[__VU]}`
            },
            tags: { endpoint: 'photo_upload' },
          }
        );
        
        check(photoResponse, {
          'photo upload status is 201': (r) => r.status === 201,
          'photo upload successful': (r) => {
            try {
              const body = JSON.parse(r.body);
              return body.success === true;
            } catch {
              return false;
            }
          },
        });
      });
      
      sleep(1);
      
      // Step 4: Bio Generation
      group('AI Bio Generation', () => {
        const bioPayload = {
          style: 'casual',
          personality: userData.profile.interests,
          userProfile: userData.profile
        };
        
        const startTime = Date.now();
        const bioResponse = http.post(
          `${BASE_URL}${API_VERSION}/bios/generate`,
          JSON.stringify(bioPayload),
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authTokens[__VU]}`
            },
            tags: { endpoint: 'bio_generation' },
            timeout: '30s',
          }
        );
        const bioResponseTime = Date.now() - startTime;
        
        const bioSuccess = check(bioResponse, {
          'bio generation status is 200': (r) => r.status === 200,
          'bio generation returns content': (r) => {
            try {
              const body = JSON.parse(r.body);
              return body.bio && body.bio.length > 0;
            } catch {
              return false;
            }
          },
        });
        
        bioGenerationTime.add(bioResponseTime);
        bioGenerationFailureRate.add(!bioSuccess);
      });
    }
    
    sleep(2);
  });
}

/**
 * Active browsing flow for engaged users
 */
function activeBrowsingFlow() {
  group('Active Browsing Flow', () => {
    // Simulate logged-in user
    const token = authenticateUser();
    if (!token) return;
    
    concurrentSessions.add(1);
    
    // Browse profiles
    group('Profile Browsing', () => {
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        const profileResponse = http.get(
          `${BASE_URL}${API_VERSION}/profiles/discover?limit=10&offset=${i * 10}`,
          {
            headers: { 'Authorization': `Bearer ${token}` },
            tags: { endpoint: 'profile_discovery' },
          }
        );
        const profileResponseTime = Date.now() - startTime;
        
        const profileSuccess = check(profileResponse, {
          'profile discovery status is 200': (r) => r.status === 200,
          'profile discovery returns profiles': (r) => {
            try {
              const body = JSON.parse(r.body);
              return body.profiles && Array.isArray(body.profiles);
            } catch {
              return false;
            }
          },
        });
        
        profileLoadTime.add(profileResponseTime);
        profileLoadFailureRate.add(!profileSuccess);
        
        sleep(0.5);
      }
    });
    
    sleep(1);
    
    // Perform swipe actions
    group('Swipe Actions', () => {
      for (let i = 0; i < 10; i++) {
        const swipePayload = {
          target_user_id: Math.floor(Math.random() * 1000) + 1,
          action: Math.random() > 0.3 ? 'like' : 'pass' // 70% like rate
        };
        
        const startTime = Date.now();
        const swipeResponse = http.post(
          `${BASE_URL}${API_VERSION}/swipes`,
          JSON.stringify(swipePayload),
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            tags: { endpoint: 'swipe_action' },
          }
        );
        const swipeResponseTime = Date.now() - startTime;
        
        check(swipeResponse, {
          'swipe action status is 200 or 201': (r) => [200, 201].includes(r.status),
        });
        
        // Check for matches
        if (Math.random() < 0.1) { // 10% match rate
          group('Match Processing', () => {
            const matchStartTime = Date.now();
            const matchResponse = http.get(
              `${BASE_URL}${API_VERSION}/matches`,
              {
                headers: { 'Authorization': `Bearer ${token}` },
                tags: { endpoint: 'match_check' },
              }
            );
            const matchResponseTime = Date.now() - matchStartTime;
            
            const matchSuccess = check(matchResponse, {
              'match check status is 200': (r) => r.status === 200,
            });
            
            matchingTime.add(matchResponseTime);
            matchingFailureRate.add(!matchSuccess);
          });
        }
        
        sleep(0.3);
      }
    });
    
    sleep(1);
    
    // Check conversations
    group('Conversation Loading', () => {
      const startTime = Date.now();
      const conversationResponse = http.get(
        `${BASE_URL}${API_VERSION}/conversations`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          tags: { endpoint: 'conversations' },
        }
      );
      const conversationResponseTime = Date.now() - startTime;
      
      check(conversationResponse, {
        'conversation loading status is 200': (r) => r.status === 200,
      });
      
      conversationLoadTime.add(conversationResponseTime);
    });
    
    concurrentSessions.add(-1);
  });
}

/**
 * AI processing intensive flow
 */
function aiProcessingFlow() {
  group('AI Processing Flow', () => {
    const token = authenticateUser();
    if (!token) return;
    
    // Generate multiple bios with different styles
    group('Bio Generation Stress', () => {
      const styles = ['casual', 'professional', 'creative', 'adventurous'];
      
      styles.forEach(style => {
        const bioPayload = {
          style: style,
          personality: ['technology', 'music', 'travel'],
          userProfile: {
            age: 25 + Math.floor(Math.random() * 15),
            occupation: 'Software Engineer',
            location: 'San Francisco, CA'
          }
        };
        
        const startTime = Date.now();
        const bioResponse = http.post(
          `${BASE_URL}${API_VERSION}/bios/generate`,
          JSON.stringify(bioPayload),
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            tags: { endpoint: 'bio_generation', style: style },
            timeout: '45s',
          }
        );
        const bioResponseTime = Date.now() - startTime;
        
        const bioSuccess = check(bioResponse, {
          [`bio generation ${style} status is 200`]: (r) => r.status === 200,
          [`bio generation ${style} returns content`]: (r) => {
            try {
              const body = JSON.parse(r.body);
              return body.bio && body.bio.length > 0;
            } catch {
              return false;
            }
          },
        });
        
        bioGenerationTime.add(bioResponseTime);
        bioGenerationFailureRate.add(!bioSuccess);
        
        sleep(1);
      });
    });
    
    sleep(2);
    
    // Photo analysis stress
    group('Photo Analysis Stress', () => {
      samplePhotos.forEach((photoUrl, index) => {
        const analysisPayload = {
          photo_url: photoUrl,
          analysis_type: ['attractiveness', 'authenticity', 'lifestyle'][index % 3]
        };
        
        const startTime = Date.now();
        const analysisResponse = http.post(
          `${BASE_URL}${API_VERSION}/photos/analyze`,
          JSON.stringify(analysisPayload),
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            tags: { endpoint: 'photo_analysis' },
            timeout: '60s',
          }
        );
        const analysisResponseTime = Date.now() - startTime;
        
        const analysisSuccess = check(analysisResponse, {
          'photo analysis status is 200': (r) => r.status === 200,
          'photo analysis returns results': (r) => {
            try {
              const body = JSON.parse(r.body);
              return body.analysis && body.analysis.length > 0;
            } catch {
              return false;
            }
          },
        });
        
        photoAnalysisTime.add(analysisResponseTime);
        photoAnalysisFailureRate.add(!analysisSuccess);
        
        sleep(2);
      });
    });
  });
}

/**
 * Peak time user flow (mixed activities)
 */
function peakTimeFlow() {
  const activities = ['browse', 'swipe', 'chat', 'profile_update'];
  const activity = activities[Math.floor(Math.random() * activities.length)];
  
  group(`Peak Time - ${activity}`, () => {
    const token = authenticateUser();
    if (!token) return;
    
    switch (activity) {
      case 'browse':
        // Quick profile browsing
        const profileResponse = http.get(
          `${BASE_URL}${API_VERSION}/profiles/discover?limit=5`,
          {
            headers: { 'Authorization': `Bearer ${token}` },
            tags: { endpoint: 'quick_browse' },
          }
        );
        
        check(profileResponse, {
          'quick browse status is 200': (r) => r.status === 200,
        });
        break;
        
      case 'swipe':
        // Rapid swiping
        for (let i = 0; i < 3; i++) {
          const swipePayload = {
            target_user_id: Math.floor(Math.random() * 1000) + 1,
            action: Math.random() > 0.5 ? 'like' : 'pass'
          };
          
          http.post(
            `${BASE_URL}${API_VERSION}/swipes`,
            JSON.stringify(swipePayload),
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              tags: { endpoint: 'rapid_swipe' },
            }
          );
          
          sleep(0.1);
        }
        break;
        
      case 'chat':
        // Check messages
        const messageResponse = http.get(
          `${BASE_URL}${API_VERSION}/conversations`,
          {
            headers: { 'Authorization': `Bearer ${token}` },
            tags: { endpoint: 'message_check' },
          }
        );
        
        check(messageResponse, {
          'message check status is 200': (r) => r.status === 200,
        });
        break;
        
      case 'profile_update':
        // Minor profile update
        const updatePayload = {
          bio: `Updated bio at ${new Date().toISOString()}`
        };
        
        const updateResponse = http.put(
          `${BASE_URL}${API_VERSION}/profiles`,
          JSON.stringify(updatePayload),
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            tags: { endpoint: 'profile_update' },
          }
        );
        
        check(updateResponse, {
          'profile update status is 200': (r) => r.status === 200,
        });
        break;
    }
    
    sleep(0.5);
  });
}

/**
 * Stress test flow for breaking point analysis
 */
function stressTestFlow() {
  group('Stress Test Flow', () => {
    const token = authenticateUser();
    if (!token) return;
    
    // Aggressive profile browsing
    for (let i = 0; i < 20; i++) {
      http.get(
        `${BASE_URL}${API_VERSION}/profiles/discover?limit=20&offset=${i * 20}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          tags: { endpoint: 'stress_browse' },
        }
      );
      
      // Minimal sleep to stress the system
      sleep(0.05);
    }
    
    // Concurrent AI operations
    const bioRequests = [];
    for (let i = 0; i < 5; i++) {
      bioRequests.push(
        http.asyncRequest('POST', `${BASE_URL}${API_VERSION}/bios/generate`, 
          JSON.stringify({
            style: 'casual',
            personality: ['test'],
            userProfile: { age: 25, occupation: 'Test' }
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            tags: { endpoint: 'stress_bio' },
          })
      );
    }
    
    // Wait for all requests to complete
    bioRequests.forEach(req => {
      const response = req;
      check(response, {
        'stress bio request completed': (r) => r.status !== 0,
      });
    });
  });
}

/**
 * Mixed user flow for general load testing
 */
function mixedUserFlow() {
  const flows = [activeBrowsingFlow, aiProcessingFlow, peakTimeFlow];
  const selectedFlow = flows[Math.floor(Math.random() * flows.length)];
  selectedFlow();
}

/**
 * Authenticate user and return token
 */
function authenticateUser() {
  if (authTokens[__VU]) {
    return authTokens[__VU];
  }
  
  const userIndex = __VU % testUsers.length;
  const userData = testUsers[userIndex];
  
  const loginPayload = {
    email: userData.email,
    password: userData.password
  };
  
  const loginResponse = http.post(
    `${BASE_URL}${API_VERSION}/auth/login`,
    JSON.stringify(loginPayload),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'authentication' },
    }
  );
  
  const loginSuccess = check(loginResponse, {
    'login status is 200': (r) => r.status === 200,
  });
  
  if (loginSuccess) {
    try {
      const loginBody = JSON.parse(loginResponse.body);
      authTokens[__VU] = loginBody.token;
      return loginBody.token;
    } catch {
      return null;
    }
  }
  
  return null;
}

/**
 * Teardown function - runs once after all scenarios
 */
export function teardown(data) {
  console.log('Cleaning up dating app load test...');
  // Cleanup logic if needed
}

/**
 * Handle summary with custom reporting
 */
export function handleSummary(data) {
  return {
    'dating-app-load-test-report.html': htmlReport(data),
    'dating-app-load-test-summary.txt': textSummary(data, { indent: ' ', enableColors: true }),
    'dating-app-load-test-results.json': JSON.stringify(data),
  };
}