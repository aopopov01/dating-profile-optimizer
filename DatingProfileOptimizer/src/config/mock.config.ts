/**
 * Mock Configuration for Dating Profile Optimizer
 * Controls mock service behavior and feature flags
 */

import { Platform } from 'react-native';

export interface MockConfig {
  enabled: boolean;
  version: string;
  features: {
    ai_analysis: boolean;
    bio_generation: boolean;
    social_integration: boolean;
    premium_features: boolean;
    analytics: boolean;
    push_notifications: boolean;
  };
  simulation: {
    network_delay_ms: number;
    success_rate: number;
    realistic_processing: boolean;
  };
  demo_data: {
    use_demo_photos: boolean;
    demo_profiles_count: number;
    realistic_scores: boolean;
  };
}

export const MOCK_CONFIG: MockConfig = {
  enabled: true, // Set to false when real APIs are configured
  version: '2.1.0',
  
  features: {
    ai_analysis: true,
    bio_generation: true,
    social_integration: true,
    premium_features: true,
    analytics: true,
    push_notifications: true
  },
  
  simulation: {
    network_delay_ms: 2000, // Realistic AI processing delay
    success_rate: 0.92, // 92% success rate for mock operations
    realistic_processing: true // Simulate actual processing time
  },
  
  demo_data: {
    use_demo_photos: true,
    demo_profiles_count: 25,
    realistic_scores: true // Generate realistic score ranges
  }
};

// Mock Feature Availability
export const MOCK_FEATURE_FLAGS = {
  premium_analysis: true,
  social_integration: true,
  photo_optimization: true,
  bio_generator: true,
  success_tracking: true,
  push_notifications: true,
  offline_mode: true,
  demo_mode: true
};