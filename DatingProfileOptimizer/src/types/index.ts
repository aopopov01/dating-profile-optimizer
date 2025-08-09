/**
 * TypeScript type definitions for Dating Profile Optimizer
 */

// User Profile Types
export interface UserProfile {
  id: string;
  email: string;
  age: number;
  gender: 'male' | 'female' | 'non-binary' | 'other';
  location?: string;
  profession: string;
  interests: string[];
  personalityType: 'extrovert' | 'introvert' | 'adventurous' | 'creative' | 'professional' | 'casual';
  lookingFor?: string;
  currentBio?: string;
  createdAt: string;
  updatedAt: string;
}

// Photo Analysis Types
export interface PhotoAnalysisResult {
  id: string;
  uri: string;
  userId: string;
  qualityScore: number;
  attractivenessScore: number;
  backgroundScore: number;
  outfitScore: number;
  expressionScore: number;
  overallScore: number;
  recommendations: string[];
  strengths: string[];
  improvements: string[];
  technicalIssues: string[];
  rank?: number;
  isMain?: boolean;
  analyzedAt: string;
}

export interface PhotoOptimizationResult {
  originalUri: string;
  optimizedUri: string;
  improvements: string[];
  beforeScore: number;
  afterScore: number;
}

// Bio Generation Types
export interface GeneratedBio {
  id: string;
  userId: string;
  text: string;
  style: 'professional' | 'casual' | 'witty' | 'adventurous';
  score: number;
  personalityMatch: number;
  platform?: string;
  reasoning: string[];
  createdAt: string;
}

export interface BioGenerationRequest {
  userProfile: UserProfile;
  photoInsights: PhotoInsights;
  style: 'professional' | 'casual' | 'witty' | 'adventurous';
  platform: string;
  customInstructions?: string;
}

export interface PhotoInsights {
  mainVibe: string;
  lifestyleSignals: string[];
  strengths: string[];
  activities: string[];
  colorPalette: string[];
  settingTypes: string[];
}

// Success Tracking Types
export interface SuccessMetrics {
  id: string;
  userId: string;
  platform: string;
  matchesBefore: number;
  matchesAfter: number;
  improvementPercentage: number;
  trackingPeriodDays: number;
  optimizationDate: string;
  reportedAt: string;
}

export interface PlatformMetrics {
  platform: string;
  matches: number;
  likes: number;
  superLikes?: number;
  conversationRate: number;
  dateRate: number;
  trackingDate: string;
}

// Payment and Subscription Types
export interface PricingTier {
  id: string;
  name: string;
  price: number;
  currency: string;
  features: string[];
  popular?: boolean;
  stripePriceId?: string;
  billingPeriod?: 'one-time' | 'monthly' | 'yearly';
}

export interface Purchase {
  id: string;
  userId: string;
  tierId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentIntentId: string;
  purchaseDate: string;
  expiresAt?: string;
}

export interface Subscription {
  id: string;
  userId: string;
  tierId: string;
  stripeSubscriptionId: string;
  status: 'active' | 'canceled' | 'past_due' | 'incomplete';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
}

// Platform Configuration Types
export interface PlatformConfig {
  name: string;
  identifier: string;
  photoLimit: number;
  bioCharacterLimit: number;
  primaryAudience: string;
  keySuccessFactors: string[];
  photoPreferences: string[];
  bioStyle: string;
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
  };
  features: string[];
}

export interface PlatformOptimization {
  platform: string;
  photoOrder: string[];
  bioText: string;
  improvementScore: number;
  recommendations: string[];
  expectedIncrease: number;
  compatibilityScore: number;
}

// Analytics and Tracking Types
export interface UserEvent {
  eventName: string;
  userId: string;
  properties: { [key: string]: any };
  timestamp: string;
  sessionId: string;
}

export interface AnalyticsData {
  userId: string;
  sessionId: string;
  screenViews: string[];
  userActions: UserEvent[];
  conversionFunnel: {
    step: string;
    completed: boolean;
    timestamp: string;
  }[];
  deviceInfo: DeviceInfo;
}

// Comprehensive Analytics Types
export interface AnalyticsConfig {
  mixpanel: {
    token: string;
    trackAutomaticEvents: boolean;
  };
  amplitude: {
    apiKey: string;
    trackingOptions: {
      deviceId: boolean;
      ipAddress: boolean;
      platform: boolean;
    };
  };
  firebase: {
    enabled: boolean;
    automaticDataCollection: boolean;
  };
  segment: {
    writeKey: string;
    trackAppLifecycleEvents: boolean;
  };
  datadog: {
    clientToken: string;
    applicationId: string;
    environment: string;
  };
}

export interface UserBehaviorEvent {
  id: string;
  eventType: 
    | 'screen_view' 
    | 'user_action' 
    | 'conversion' 
    | 'engagement' 
    | 'error' 
    | 'performance'
    | 'ai_interaction'
    | 'payment'
    | 'social_share';
  eventName: string;
  userId?: string;
  sessionId: string;
  properties: Record<string, any>;
  timestamp: string;
  platform: 'ios' | 'android';
  appVersion: string;
  deviceInfo: DetailedDeviceInfo;
  networkInfo: NetworkInfo;
  locationInfo?: LocationInfo;
}

export interface DetailedDeviceInfo extends DeviceInfo {
  deviceId: string;
  manufacturer: string;
  brand: string;
  buildNumber: string;
  bundleId: string;
  systemName: string;
  systemVersion: string;
  timezone: string;
  carrier?: string;
  batteryLevel?: number;
  isEmulator: boolean;
  totalMemory: number;
  availableMemory: number;
}

export interface NetworkInfo {
  type: 'wifi' | 'cellular' | 'none' | 'unknown';
  isConnected: boolean;
  speed?: number;
  strength?: number;
  carrier?: string;
}

export interface LocationInfo {
  country: string;
  region: string;
  city?: string;
  timezone: string;
  coordinates?: Coordinates;
}

// Business Intelligence Types
export interface BusinessMetrics {
  userId?: string;
  timestamp: string;
  metrics: {
    // Revenue Metrics
    revenue: {
      dailyRevenue: number;
      monthlyRecurringRevenue: number;
      averageRevenuePerUser: number;
      lifetimeValue: number;
      churnRate: number;
      refundRate: number;
    };
    
    // User Acquisition
    acquisition: {
      dailyActiveUsers: number;
      monthlyActiveUsers: number;
      newUserRegistrations: number;
      customerAcquisitionCost: number;
      organicVsPaidRatio: number;
      retentionRate: {
        day1: number;
        day7: number;
        day30: number;
      };
    };
    
    // Conversion Metrics
    conversion: {
      signupToPhotoUpload: number;
      photoUploadToAnalysis: number;
      analysisToOptimization: number;
      freeToPreemium: number;
      trialToPaid: number;
      checkoutAbandonment: number;
    };
    
    // Engagement Metrics
    engagement: {
      sessionDuration: number;
      screenViews: number;
      featuresUsed: string[];
      socialShares: number;
      supportTickets: number;
      appRating: number;
    };
  };
}

export interface CohortAnalysis {
  cohortId: string;
  cohortDate: string;
  userCount: number;
  retentionData: {
    period: string;
    activeUsers: number;
    retentionRate: number;
    revenue: number;
  }[];
  demographicBreakdown: {
    ageGroups: Record<string, number>;
    genderDistribution: Record<string, number>;
    locationDistribution: Record<string, number>;
  };
}

export interface FunnelAnalysis {
  funnelName: string;
  steps: {
    stepName: string;
    users: number;
    conversionRate: number;
    dropoffRate: number;
    avgTimeToNext: number;
  }[];
  totalConversionRate: number;
  segmentBreakdown: Record<string, FunnelAnalysis>;
}

// AI Performance Monitoring Types
export interface AIModelPerformance {
  modelId: string;
  modelType: 'photo_analysis' | 'bio_generation' | 'optimization' | 'headshot_generation';
  version: string;
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    processingTime: number;
    successRate: number;
    errorRate: number;
    userSatisfaction: number;
  };
  costs: {
    apiCalls: number;
    totalCost: number;
    costPerUser: number;
    costPerSuccess: number;
  };
  qualityMetrics: {
    photoAnalysis?: {
      accuracyScore: number;
      falsePositiveRate: number;
      userAgreementRate: number;
    };
    bioGeneration?: {
      relevanceScore: number;
      originalityScore: number;
      engagementPrediction: number;
    };
    headshotGeneration?: {
      professionalismScore: number;
      likabilityScore: number;
      brandAlignmentScore: number;
    };
  };
  timestamp: string;
}

export interface AIUsageAnalytics {
  userId: string;
  feature: 'photo_analysis' | 'bio_generation' | 'optimization' | 'headshot_generation';
  inputData: {
    photoCount?: number;
    bioLength?: number;
    processingComplexity: 'low' | 'medium' | 'high';
  };
  outputQuality: {
    userRating: number;
    systemConfidence: number;
    improvementSuggestions: string[];
  };
  performance: {
    processingTime: number;
    retryCount: number;
    errorOccurred: boolean;
    errorType?: string;
  };
  userBehavior: {
    acceptedSuggestions: number;
    rejectedSuggestions: number;
    customModifications: number;
    shareRate: number;
  };
  timestamp: string;
}

// Marketing Attribution Types
export interface MarketingAttribution {
  userId: string;
  conversionEvent: string;
  touchpoints: {
    channel: string;
    campaign: string;
    source: string;
    medium: string;
    content?: string;
    term?: string;
    timestamp: string;
    value: number;
  }[];
  attributionModel: 'first_touch' | 'last_touch' | 'linear' | 'time_decay' | 'data_driven';
  revenue: number;
  conversionDate: string;
}

export interface CampaignPerformance {
  campaignId: string;
  campaignName: string;
  channel: 'google' | 'facebook' | 'tiktok' | 'instagram' | 'organic' | 'referral' | 'email';
  metrics: {
    impressions: number;
    clicks: number;
    conversions: number;
    cost: number;
    revenue: number;
    ctr: number;
    cpa: number;
    roas: number;
    ltv: number;
  };
  demographics: {
    age: Record<string, number>;
    gender: Record<string, number>;
    location: Record<string, number>;
  };
  creativePerformance: {
    creativeId: string;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
  }[];
  timeRange: DateRange;
}

export interface ViralCoefficient {
  userId: string;
  referralSource: 'organic_share' | 'referral_program' | 'social_media' | 'word_of_mouth';
  sharesGenerated: number;
  clicksGenerated: number;
  conversionsGenerated: number;
  viralCoefficient: number;
  networkEffect: {
    platformConnections: number;
    industryInfluence: number;
    socialMediaFollowers: number;
  };
  contentShared: {
    type: 'before_after' | 'headshot' | 'success_story' | 'optimization_tips';
    platform: string;
    engagement: number;
  }[];
  timestamp: string;
}

// Operational Metrics Types
export interface ApplicationPerformance {
  timestamp: string;
  metrics: {
    // Performance
    appLaunchTime: number;
    screenLoadTimes: Record<string, number>;
    apiResponseTimes: Record<string, number>;
    crashRate: number;
    anrRate: number;
    memoryUsage: number;
    cpuUsage: number;
    batteryUsage: number;
    networkLatency: number;
    
    // Reliability
    uptime: number;
    errorRate: number;
    successRate: number;
    timeouts: number;
    retries: number;
    
    // Resource Usage
    dataUsage: number;
    storageUsage: number;
    bandwidthUsage: number;
    apiCallCount: number;
    
    // User Experience
    userRating: number;
    supportTickets: number;
    bugReports: number;
    featureRequests: number;
  };
}

export interface SecurityMetrics {
  timestamp: string;
  metrics: {
    authenticationAttempts: number;
    failedLogins: number;
    suspiciousActivity: number;
    dataBreachAttempts: number;
    encryptionFailures: number;
    certificateIssues: number;
    privacyViolations: number;
    complianceScore: number;
  };
  incidents: {
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    type: string;
    description: string;
    resolved: boolean;
    timestamp: string;
  }[];
}

// LinkedIn Headshot Generator Specific Types
export interface LinkedInAnalytics extends UserBehaviorEvent {
  headshotGeneration: {
    industryType: string;
    professionalLevel: 'entry' | 'mid' | 'senior' | 'executive' | 'entrepreneur';
    stylePreferences: string[];
    brandAlignment: number;
    networkConnections: number;
    profileViews: {
      before: number;
      after: number;
      improvement: number;
    };
    careerImpact: {
      interviewCallbacks: number;
      networkingConnections: number;
      jobOffers: number;
      salaryIncrease?: number;
    };
  };
}

export interface ProfessionalMetrics {
  userId: string;
  headshot: {
    generationTime: number;
    qualityScore: number;
    professionalismRating: number;
    brandConsistency: number;
    industryAppropriate: boolean;
  };
  businessOutcome: {
    profileViewIncrease: number;
    connectionAcceptanceRate: number;
    messageResponseRate: number;
    recruiterInquiries: number;
    brandRecognition: number;
  };
  referralNetwork: {
    taConnections: number;
    directReferrals: number;
    networkViralCoefficient: number;
    influenceScore: number;
  };
  timestamp: string;
}

// Dashboard Configuration Types
export interface DashboardConfig {
  dashboardId: string;
  name: string;
  description: string;
  audience: 'executive' | 'product' | 'marketing' | 'operations' | 'technical';
  refreshRate: number;
  widgets: DashboardWidget[];
  filters: DashboardFilter[];
  alerts: DashboardAlert[];
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'heatmap' | 'funnel' | 'cohort';
  title: string;
  description?: string;
  dataSource: string;
  query: string;
  visualization: {
    chartType?: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
    dimensions: string[];
    metrics: string[];
    colors?: string[];
  };
  size: 'small' | 'medium' | 'large' | 'full';
  position: { row: number; col: number };
}

export interface DashboardFilter {
  id: string;
  name: string;
  type: 'date' | 'category' | 'numeric' | 'boolean';
  values: any[];
  defaultValue: any;
  required: boolean;
}

export interface DashboardAlert {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  channels: ('email' | 'slack' | 'webhook' | 'push')[];
  recipients: string[];
  enabled: boolean;
}

// A/B Testing Types
export interface ABTestConfig {
  testId: string;
  name: string;
  description: string;
  hypothesis: string;
  variants: {
    id: string;
    name: string;
    allocation: number;
    config: Record<string, any>;
  }[];
  targetAudience: {
    criteria: Record<string, any>;
    sampleSize: number;
  };
  metrics: {
    primary: string[];
    secondary: string[];
  };
  duration: {
    startDate: string;
    endDate: string;
    minRunTime: number;
  };
  status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
}

export interface ABTestResult {
  testId: string;
  variant: string;
  metrics: Record<string, {
    value: number;
    confidence: number;
    significance: number;
    improvement: number;
  }>;
  sampleSize: number;
  conversionRate: number;
  statisticalPower: number;
  timestamp: string;
}

export interface DeviceInfo {
  platform: 'ios' | 'android';
  version: string;
  model: string;
  screenSize: {
    width: number;
    height: number;
  };
  appVersion: string;
}

// Navigation Types
export interface NavigationState {
  currentScreen: string;
  previousScreen?: string;
  params?: { [key: string]: any };
  timestamp: string;
}

export interface ScreenProps {
  navigation: any;
  route: any;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface BatchProcessingStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalItems: number;
  completedItems: number;
  currentItem?: string;
  estimatedTimeRemaining?: number;
  error?: string;
}

// UI Component Types
export interface PhotoCardProps {
  photo: PhotoAnalysisResult;
  onPress?: () => void;
  showScore?: boolean;
  showRecommendations?: boolean;
  compact?: boolean;
}

export interface BioCardProps {
  bio: GeneratedBio;
  selected?: boolean;
  onSelect?: () => void;
  onRegenerate?: () => void;
  showDetails?: boolean;
}

export interface PricingCardProps {
  tier: PricingTier;
  selected?: boolean;
  onSelect?: () => void;
  popular?: boolean;
  discount?: number;
}

// Form and Input Types
export interface ProfileFormData {
  age: string;
  gender: string;
  location: string;
  profession: string;
  interests: string[];
  personalityType: string;
  lookingFor: string;
  bio: string;
}

export interface FormValidationError {
  field: string;
  message: string;
}

export interface FormState {
  data: ProfileFormData;
  errors: FormValidationError[];
  isSubmitting: boolean;
  isValid: boolean;
}

// Utility Types
export interface DateRange {
  start: string;
  end: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
}

// Configuration Types
export interface AppConfig {
  apiEndpoint: string;
  stripePublishableKey: string;
  mixpanelToken: string;
  sentryDsn: string;
  environment: 'development' | 'staging' | 'production';
  features: {
    enableAnalytics: boolean;
    enablePushNotifications: boolean;
    enableInAppPurchases: boolean;
    enableSocialSharing: boolean;
    enableOfflineMode: boolean;
  };
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  userId?: string;
  screen?: string;
  action?: string;
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// State Management Types
export interface AppState {
  user: {
    profile: UserProfile | null;
    isAuthenticated: boolean;
    purchases: Purchase[];
    subscriptions: Subscription[];
  };
  photos: {
    uploaded: string[];
    analyses: PhotoAnalysisResult[];
    optimized: PhotoOptimizationResult[];
    currentBatch?: BatchProcessingStatus;
  };
  bios: {
    generated: GeneratedBio[];
    selected?: GeneratedBio;
    isGenerating: boolean;
  };
  optimization: {
    results: { [platform: string]: PlatformOptimization };
    currentPlatform: string;
    successMetrics?: SuccessMetrics;
  };
  ui: {
    currentScreen: string;
    loading: boolean;
    errors: AppError[];
    navigation: NavigationState;
  };
}

// Action Types for State Management
export type AppAction =
  | { type: 'SET_USER_PROFILE'; payload: UserProfile }
  | { type: 'SET_AUTHENTICATION'; payload: boolean }
  | { type: 'ADD_PHOTO_ANALYSIS'; payload: PhotoAnalysisResult }
  | { type: 'SET_BATCH_STATUS'; payload: BatchProcessingStatus }
  | { type: 'ADD_GENERATED_BIO'; payload: GeneratedBio }
  | { type: 'SELECT_BIO'; payload: string }
  | { type: 'SET_OPTIMIZATION_RESULTS'; payload: { [platform: string]: PlatformOptimization } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_ERROR'; payload: AppError }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'SET_CURRENT_SCREEN'; payload: string };

// Hook Types
export interface UsePhotoAnalysis {
  analyzePhotos: (uris: string[]) => Promise<PhotoAnalysisResult[]>;
  isAnalyzing: boolean;
  error: string | null;
  progress: number;
}

export interface UseBioGeneration {
  generateBios: (request: BioGenerationRequest) => Promise<GeneratedBio[]>;
  regenerateBio: (bioId: string, improvements: string[]) => Promise<GeneratedBio>;
  isGenerating: boolean;
  error: string | null;
}

export interface UsePayment {
  processPurchase: (tier: PricingTier) => Promise<boolean>;
  processSubscription: (tier: PricingTier) => Promise<boolean>;
  isProcessing: boolean;
  error: string | null;
}

// Export all types as a namespace for easier importing
export * from './index';