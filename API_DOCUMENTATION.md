# Dating Profile Optimizer API Documentation

## 📋 Overview

The Dating Profile Optimizer API provides comprehensive endpoints for AI-powered photo analysis, bio generation, and dating profile optimization. Built with Node.js, Express, and integrated with OpenAI, Stripe, and advanced analytics.

### Base URL
- **Development**: `http://localhost:3002`
- **Staging**: `https://staging-api.datingoptimizer.com`
- **Production**: `https://api.datingoptimizer.com`

### API Version
Current version: `v1`

All API endpoints are prefixed with `/api/v1/`

## 🔐 Authentication

### JWT Token Authentication
Most endpoints require authentication using JWT tokens.

```bash
Authorization: Bearer <jwt_token>
```

### Get Authentication Token
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "subscription_tier": "premium"
    }
  }
}
```

## 👤 User Management

### Register New User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe",
  "age": 28,
  "gender": "male",
  "dating_preferences": {
    "platforms": ["tinder", "bumble", "hinge"],
    "age_range": [25, 35],
    "looking_for": "serious_relationship"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "email": "user@example.com",
    "token": "jwt_token_here",
    "subscription_tier": "free",
    "credits_remaining": 1
  }
}
```

### Get User Profile
```http
GET /api/v1/users/profile
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "subscription_tier": "premium",
    "credits_remaining": 25,
    "total_photos_analyzed": 45,
    "total_bios_generated": 12,
    "match_improvement_rate": 285,
    "created_at": "2024-01-15T10:00:00Z",
    "last_active": "2024-02-01T15:30:00Z"
  }
}
```

### Update User Preferences
```http
PATCH /api/v1/users/preferences
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "dating_platforms": ["tinder", "bumble"],
  "personality_traits": ["outgoing", "creative", "adventurous"],
  "relationship_goals": "serious_relationship",
  "notification_preferences": {
    "email_tips": true,
    "match_updates": false
  }
}
```

## 📸 Photo Analysis

### Upload and Analyze Photos
```http
POST /api/v1/photos/analyze
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

photos: [File, File, File]  // Up to 10 photos
platform: "tinder" | "bumble" | "hinge" | "match"
analysis_type: "comprehensive" | "quick"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "analysis_id": "uuid",
    "photos": [
      {
        "photo_id": "uuid",
        "url": "https://cloudinary.com/image1.jpg",
        "overall_score": 87,
        "detailed_scores": {
          "attractiveness": 85,
          "photo_quality": 92,
          "background": 78,
          "lighting": 89,
          "facial_expression": 91,
          "outfit_appropriateness": 84,
          "pose_confidence": 88
        },
        "platform_optimization": {
          "tinder": {
            "score": 89,
            "recommendations": [
              "Great main profile photo - shows genuine smile",
              "Consider cropping to focus more on face",
              "Excellent lighting and image quality"
            ]
          },
          "bumble": {
            "score": 85,
            "recommendations": [
              "Perfect for Bumble's professional focus",
              "Shows personality well",
              "Consider adding activity-based photo"
            ]
          }
        },
        "improvement_suggestions": [
          {
            "category": "background",
            "suggestion": "Try outdoor setting for more dynamic look",
            "impact": "medium",
            "priority": 2
          },
          {
            "category": "pose",
            "suggestion": "Angle body slightly to create more visual interest",
            "impact": "low",
            "priority": 3
          }
        ],
        "ai_insights": {
          "perceived_age": 27,
          "dominant_emotions": ["happiness", "confidence"],
          "style_category": "casual_professional",
          "suitable_for_main_photo": true
        }
      }
    ],
    "overall_profile_score": 84,
    "recommended_photo_order": ["photo_id_1", "photo_id_3", "photo_id_2"],
    "credits_used": 1,
    "credits_remaining": 24
  }
}
```

### Get Photo Analysis Results
```http
GET /api/v1/photos/analysis/{analysis_id}
Authorization: Bearer <jwt_token>
```

### Delete Photo Analysis
```http
DELETE /api/v1/photos/analysis/{analysis_id}
Authorization: Bearer <jwt_token>
```

## ✍️ Bio Generation

### Generate AI Bio
```http
POST /api/v1/bios/generate
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "personality_traits": ["adventurous", "creative", "ambitious"],
  "interests": ["hiking", "photography", "cooking", "travel"],
  "profession": "Software Developer",
  "education": "Computer Science Degree",
  "relationship_goals": "serious_relationship",
  "platform": "tinder",
  "bio_style": "witty" | "sincere" | "adventurous" | "professional",
  "length": "short" | "medium" | "long",
  "include_humor": true,
  "include_call_to_action": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bio_id": "uuid",
    "generated_bios": [
      {
        "version": 1,
        "text": "Adventure seeker by day, code debugger by night 🚀 When I'm not exploring new hiking trails, you'll find me experimenting in the kitchen or planning my next travel escape. Looking for someone to share life's adventures with - from spontaneous weekend trips to cozy movie nights. Swipe right if you're ready for genuine connections and maybe some terrible dad jokes along the way! 😄",
        "style": "witty",
        "length": 158,
        "platform_optimized": true,
        "psychological_appeal_score": 89,
        "engagement_prediction": 94
      },
      {
        "version": 2,
        "text": "Software developer with a passion for the outdoors and authentic connections. Love capturing life's moments through my camera lens and creating memorable experiences through food and travel. Seeking someone genuine who values adventure, laughter, and building something meaningful together.",
        "style": "sincere",
        "length": 127,
        "platform_optimized": true,
        "psychological_appeal_score": 85,
        "engagement_prediction": 88
      },
      {
        "version": 3,
        "text": "Tech professional | Adventure enthusiast | Amateur chef 👨‍💻🏔️👨‍🍳 Believer in work hard, play harder. Weekend warrior seeking a partner in crime for hiking adventures, food experiments, and building amazing memories. Ready to delete this app with the right person!",
        "style": "adventurous",
        "length": 141,
        "platform_optimized": true,
        "psychological_appeal_score": 92,
        "engagement_prediction": 96
      }
    ],
    "psychology_analysis": {
      "dominant_traits_conveyed": ["adventurous", "genuine", "ambitious"],
      "target_demographic_appeal": {
        "age_25_30": 94,
        "age_31_35": 89,
        "professionals": 96,
        "outdoor_enthusiasts": 98
      },
      "conversation_starters": [
        "What's your favorite hiking trail?",
        "Best dish you've ever cooked?",
        "Most memorable travel experience?"
      ]
    },
    "platform_specific_optimization": {
      "character_count": "optimal",
      "emoji_usage": "effective",
      "call_to_action_strength": "high",
      "keyword_optimization": ["adventure", "travel", "genuine", "connection"]
    },
    "credits_used": 1,
    "credits_remaining": 23
  }
}
```

### Get Bio Generation History
```http
GET /api/v1/bios/history
Authorization: Bearer <jwt_token>
```

### A/B Test Bio Performance
```http
POST /api/v1/bios/{bio_id}/ab-test
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "variant_bio": "Alternative bio text here...",
  "test_duration_days": 7,
  "success_metrics": ["matches", "conversations", "dates"]
}
```

## 📊 Success Tracking

### Record Match Data
```http
POST /api/v1/tracking/matches
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "platform": "tinder",
  "matches_count": 15,
  "period_start": "2024-01-01T00:00:00Z",
  "period_end": "2024-01-07T23:59:59Z",
  "profile_version": "optimized_v2",
  "photo_set_id": "uuid",
  "bio_id": "uuid"
}
```

### Get Success Metrics
```http
GET /api/v1/tracking/metrics
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overall_improvement": {
      "match_rate_increase": 285,
      "conversation_rate_increase": 156,
      "date_conversion_increase": 89
    },
    "platform_performance": {
      "tinder": {
        "before_optimization": {
          "matches_per_week": 2.3,
          "conversations_per_week": 0.8,
          "dates_per_month": 0.5
        },
        "after_optimization": {
          "matches_per_week": 8.9,
          "conversations_per_week": 2.5,
          "dates_per_month": 1.8
        },
        "improvement_percentage": 287
      }
    },
    "time_series_data": [
      {
        "date": "2024-01-01",
        "matches": 3,
        "conversations": 1,
        "platform": "tinder"
      }
    ]
  }
}
```

## 💳 Payment & Subscriptions

### Get Pricing Plans
```http
GET /api/v1/payments/plans
```

**Response:**
```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "basic",
        "name": "Basic Package",
        "price": 9.99,
        "currency": "USD",
        "features": [
          "Photo analysis for up to 5 photos",
          "1 AI-generated bio",
          "Basic success tracking"
        ],
        "credits": 5,
        "stripe_price_id": "price_basic_id"
      },
      {
        "id": "premium",
        "name": "Premium Package",
        "price": 19.99,
        "currency": "USD",
        "features": [
          "Photo analysis for up to 15 photos",
          "3 AI-generated bios with A/B testing",
          "Advanced success tracking",
          "Messaging tips and conversation starters"
        ],
        "credits": 20,
        "stripe_price_id": "price_premium_id"
      },
      {
        "id": "complete",
        "name": "Complete Makeover",
        "price": 39.99,
        "currency": "USD",
        "features": [
          "Unlimited photo analysis",
          "Unlimited bio generation",
          "Complete success tracking dashboard",
          "30-day support and consultation",
          "Premium conversation coaching"
        ],
        "credits": 100,
        "stripe_price_id": "price_complete_id"
      }
    ]
  }
}
```

### Create Payment Intent
```http
POST /api/v1/payments/create-intent
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "plan_id": "premium",
  "payment_method_id": "pm_card_visa"
}
```

### Process Purchase
```http
POST /api/v1/payments/purchase
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "payment_intent_id": "pi_stripe_payment_intent_id",
  "plan_id": "premium"
}
```

## 📈 Analytics & Insights

### Get User Analytics Dashboard
```http
GET /api/v1/analytics/dashboard
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "profile_health_score": 89,
    "weekly_performance": {
      "matches": 12,
      "conversations": 4,
      "response_rate": 67,
      "improvement_vs_last_week": 15
    },
    "photo_performance": [
      {
        "photo_id": "uuid",
        "views": 1250,
        "likes": 156,
        "engagement_rate": 12.5,
        "position_in_profile": 1
      }
    ],
    "bio_performance": {
      "bio_id": "uuid",
      "match_rate": 8.9,
      "conversation_starter_effectiveness": 76,
      "a_b_test_status": "active"
    },
    "recommendations": [
      {
        "type": "photo_optimization",
        "priority": "high",
        "suggestion": "Update your main photo for 23% better performance",
        "action_required": "upload_new_photo"
      }
    ]
  }
}
```

### Track Custom Events
```http
POST /api/v1/analytics/events
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "event_type": "profile_updated",
  "properties": {
    "platform": "tinder",
    "changes_made": ["main_photo", "bio"],
    "session_duration": 1800
  },
  "timestamp": "2024-02-01T15:30:00Z"
}
```

## 🔍 Dating Psychology Features

### Get Personality Analysis
```http
POST /api/v1/psychology/personality-analysis
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "responses": [
    {
      "question_id": "extroversion_1",
      "response": 7
    },
    {
      "question_id": "openness_3",
      "response": 9
    }
  ]
}
```

### Get Dating Tips
```http
GET /api/v1/psychology/tips
Authorization: Bearer <jwt_token>
?category=messaging&personality_type=outgoing&platform=bumble
```

### Get Conversation Starters
```http
GET /api/v1/psychology/conversation-starters
Authorization: Bearer <jwt_token>
?match_interests=["hiking","travel"]&style=witty
```

## ⚡ Batch Operations

### Batch Photo Analysis
```http
POST /api/v1/batch/photo-analysis
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

photos: [File1, File2, File3, ...]  // Up to 20 photos
platforms: ["tinder", "bumble", "hinge"]
priority: "high" | "normal" | "low"
```

### Batch Bio Generation
```http
POST /api/v1/batch/bio-generation
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "variations_per_style": 3,
  "styles": ["witty", "sincere", "adventurous"],
  "platforms": ["tinder", "bumble"],
  "personality_profile": {
    "traits": ["adventurous", "creative"],
    "interests": ["hiking", "photography"]
  }
}
```

## 🚨 Error Handling

### Standard Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid photo format. Please upload JPEG or PNG files.",
    "details": {
      "field": "photos[0]",
      "accepted_formats": ["image/jpeg", "image/png"]
    }
  },
  "request_id": "req_uuid_here"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTHENTICATION_REQUIRED` | 401 | Valid JWT token required |
| `INSUFFICIENT_CREDITS` | 402 | Not enough credits for operation |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `FILE_TOO_LARGE` | 413 | File exceeds maximum size limit |
| `UNSUPPORTED_FILE_TYPE` | 415 | File type not supported |
| `AI_SERVICE_UNAVAILABLE` | 503 | AI service temporarily unavailable |
| `SUBSCRIPTION_REQUIRED` | 402 | Premium subscription required |

## 🔒 Rate Limiting

### Rate Limits by Plan

| Plan | Endpoint Type | Requests/Hour | Burst Limit |
|------|---------------|---------------|-------------|
| Free | Photo Analysis | 5 | 2 |
| Free | Bio Generation | 3 | 1 |
| Basic | Photo Analysis | 20 | 5 |
| Basic | Bio Generation | 15 | 3 |
| Premium | Photo Analysis | 100 | 10 |
| Premium | Bio Generation | 50 | 8 |
| Complete | All Endpoints | 500 | 50 |

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642789200
```

## 🔐 Security Features

### API Security Headers
All API responses include security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`

### Data Encryption
- All photos encrypted at rest using AES-256
- PII data encrypted in database
- JWT tokens signed with RS256

### Photo Privacy
- Automatic deletion after 30 days (configurable)
- No photos used for AI training without explicit consent
- GDPR-compliant data handling

## 📝 Webhook Events

### Configure Webhooks
```http
POST /api/v1/webhooks/configure
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "url": "https://your-app.com/webhook",
  "events": ["analysis.completed", "bio.generated", "payment.succeeded"],
  "secret": "your_webhook_secret"
}
```

### Webhook Event Examples

#### Photo Analysis Completed
```json
{
  "event": "analysis.completed",
  "data": {
    "user_id": "uuid",
    "analysis_id": "uuid",
    "overall_score": 87,
    "credits_used": 1
  },
  "timestamp": "2024-02-01T15:30:00Z"
}
```

#### Payment Succeeded
```json
{
  "event": "payment.succeeded",
  "data": {
    "user_id": "uuid",
    "plan": "premium",
    "amount": 19.99,
    "currency": "USD",
    "credits_added": 20
  },
  "timestamp": "2024-02-01T15:30:00Z"
}
```

## 📋 API Testing

### Health Check
```http
GET /api/v1/health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "1.2.0",
  "timestamp": "2024-02-01T15:30:00Z",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "openai": "healthy",
    "stripe": "healthy"
  }
}
```

### API Status
```http
GET /api/v1/status
```

## 📚 SDKs and Libraries

### JavaScript/TypeScript SDK
```javascript
import { DatingOptimizerAPI } from '@dating-optimizer/sdk';

const client = new DatingOptimizerAPI({
  apiKey: 'your_api_key',
  environment: 'production'
});

// Analyze photos
const analysis = await client.photos.analyze({
  photos: [photoFile1, photoFile2],
  platform: 'tinder'
});

// Generate bio
const bio = await client.bios.generate({
  personality: ['adventurous', 'creative'],
  style: 'witty'
});
```

### React Native Integration
```javascript
import { DatingOptimizerClient } from '@dating-optimizer/react-native';

const client = new DatingOptimizerClient({
  apiKey: process.env.DATING_OPTIMIZER_API_KEY
});

// Component example
const PhotoAnalysisScreen = () => {
  const [analysis, setAnalysis] = useState(null);
  
  const analyzePhotos = async (photos) => {
    const result = await client.analyzePhotos(photos);
    setAnalysis(result);
  };
  
  return (
    <View>
      {/* UI components */}
    </View>
  );
};
```

---

## 📞 Support

For API support, technical questions, or feature requests:
- **Documentation**: Complete guides available in repository
- **GitHub Issues**: Bug reports and feature requests
- **Email Support**: api-support@datingoptimizer.com
- **Status Page**: https://status.datingoptimizer.com

---

**API Version**: 1.2.0  
**Last Updated**: February 1, 2024  
**Swagger/OpenAPI**: Available at `/docs` endpoint