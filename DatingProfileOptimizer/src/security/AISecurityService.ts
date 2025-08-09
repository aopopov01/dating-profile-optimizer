/**
 * AI Security Service for Dating Profile Optimizer
 * Handles AI model protection, API key security, input validation, and abuse prevention
 */

import CryptoJS from 'crypto-js';
import { securityLogger } from './SecurityLogger';
import { cryptoService } from './CryptoService';
import { apiSecurityService } from './APISecurityService';
import { SECURITY_CONFIG } from './SecurityConfig';

export interface AIRequest {
  userId: string;
  operation: 'photo_analysis' | 'bio_generation' | 'optimization' | 'scoring';
  input: any;
  timestamp: string;
  sessionId: string;
  modelVersion?: string;
  parameters?: Record<string, any>;
}

export interface AIResponse {
  requestId: string;
  result: any;
  confidence: number;
  modelVersion: string;
  processingTime: number;
  cost: number;
  flagged: boolean;
  flags?: string[];
  metadata?: Record<string, any>;
}

export interface AIUsageQuota {
  userId: string;
  operation: string;
  dailyLimit: number;
  monthlyLimit: number;
  dailyUsed: number;
  monthlyUsed: number;
  lastReset: string;
  tier: 'free' | 'basic' | 'premium' | 'unlimited';
}

export interface AISecurityPolicy {
  operation: string;
  inputValidation: {
    maxImageSize: number;
    allowedFormats: string[];
    maxTextLength: number;
    contentFilters: string[];
  };
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  costProtection: {
    maxCostPerRequest: number;
    maxDailyCost: number;
    alertThreshold: number;
  };
  outputValidation: {
    contentFilters: string[];
    confidenceThreshold: number;
    maxResponseLength: number;
  };
}

export interface AIThreatDetection {
  type: 'adversarial_input' | 'prompt_injection' | 'data_extraction' | 'model_abuse' | 'cost_abuse';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  mitigation: string;
}

export class AISecurityService {
  private static instance: AISecurityService;
  private securityPolicies: Map<string, AISecurityPolicy> = new Map();
  private usageQuotas: Map<string, AIUsageQuota> = new Map();
  private apiKeys: Map<string, { key: string; encrypted: boolean }> = new Map();
  private threatPatterns: Map<string, RegExp> = new Map();

  private constructor() {
    this.initializeSecurityPolicies();
    this.initializeThreatPatterns();
  }

  public static getInstance(): AISecurityService {
    if (!AISecurityService.instance) {
      AISecurityService.instance = new AISecurityService();
    }
    return AISecurityService.instance;
  }

  /**
   * Initialize AI security service
   */
  async initialize(): Promise<void> {
    try {
      // Load encrypted API keys
      await this.loadAPIKeys();
      
      // Initialize usage quotas
      await this.initializeUsageQuotas();
      
      // Set up cost monitoring
      this.startCostMonitoring();

      securityLogger.info('ai_security_initialized', {
        policies: this.securityPolicies.size,
        quotaUsers: this.usageQuotas.size,
      });
    } catch (error) {
      securityLogger.error('AI security initialization failed', { error });
      throw new Error('Failed to initialize AI security service');
    }
  }

  /**
   * Secure AI request processing
   */
  async processAIRequest(request: AIRequest): Promise<{
    allowed: boolean;
    response?: AIResponse;
    error?: string;
    threats?: AIThreatDetection[];
  }> {
    try {
      const policy = this.securityPolicies.get(request.operation);
      if (!policy) {
        return {
          allowed: false,
          error: 'Unsupported AI operation',
        };
      }

      // Check usage quotas
      const quotaCheck = await this.checkUsageQuota(request.userId, request.operation);
      if (!quotaCheck.allowed) {
        return {
          allowed: false,
          error: quotaCheck.error,
        };
      }

      // Validate input
      const inputValidation = await this.validateAIInput(request, policy);
      if (!inputValidation.valid) {
        return {
          allowed: false,
          error: inputValidation.error,
          threats: inputValidation.threats,
        };
      }

      // Check for threats
      const threatDetection = await this.detectThreats(request);
      if (threatDetection.some(t => t.severity === 'critical' || t.severity === 'high')) {
        securityLogger.warn('ai_threat_detected', {
          userId: request.userId,
          operation: request.operation,
          threats: threatDetection,
        });

        return {
          allowed: false,
          error: 'Security threat detected in request',
          threats: threatDetection,
        };
      }

      // Process request securely
      const response = await this.executeSecureAIRequest(request, policy);
      
      // Update usage quotas
      await this.updateUsageQuota(request.userId, request.operation, response.cost);

      // Log AI usage
      securityLogger.info('ai_request_processed', {
        userId: request.userId,
        operation: request.operation,
        cost: response.cost,
        processingTime: response.processingTime,
      });

      return {
        allowed: true,
        response,
        threats: threatDetection.filter(t => t.severity === 'low' || t.severity === 'medium'),
      };
    } catch (error) {
      securityLogger.error('AI request processing failed', {
        userId: request.userId,
        operation: request.operation,
        error: error.message,
      });

      return {
        allowed: false,
        error: 'AI request processing failed',
      };
    }
  }

  /**
   * Validate image input for AI processing
   */
  async validateImageInput(imageData: any, operation: string): Promise<{
    valid: boolean;
    error?: string;
    sanitizedData?: any;
    threats?: AIThreatDetection[];
  }> {
    try {
      const policy = this.securityPolicies.get(operation);
      if (!policy) {
        return { valid: false, error: 'Invalid operation' };
      }

      const threats: AIThreatDetection[] = [];

      // Check image size
      if (imageData.size > policy.inputValidation.maxImageSize) {
        return {
          valid: false,
          error: `Image size exceeds limit (${imageData.size} > ${policy.inputValidation.maxImageSize})`,
        };
      }

      // Check image format
      if (!policy.inputValidation.allowedFormats.includes(imageData.type)) {
        return {
          valid: false,
          error: `Unsupported image format: ${imageData.type}`,
        };
      }

      // Check for malicious content in metadata
      if (imageData.exif) {
        const maliciousPatterns = [
          /<script/i,
          /javascript:/i,
          /vbscript:/i,
          /onload=/i,
        ];

        const exifString = JSON.stringify(imageData.exif);
        for (const pattern of maliciousPatterns) {
          if (pattern.test(exifString)) {
            threats.push({
              type: 'adversarial_input',
              severity: 'high',
              confidence: 90,
              description: 'Malicious code detected in image metadata',
              mitigation: 'Strip metadata before processing',
            });
            break;
          }
        }
      }

      // Sanitize image data
      const sanitizedData = {
        data: imageData.data,
        type: imageData.type,
        size: imageData.size,
        // Remove potentially malicious metadata
      };

      // Check for adversarial patterns in image data
      const adversarialCheck = await this.checkAdversarialImage(imageData);
      if (adversarialCheck.detected) {
        threats.push({
          type: 'adversarial_input',
          severity: 'medium',
          confidence: adversarialCheck.confidence,
          description: 'Potential adversarial image pattern detected',
          mitigation: 'Apply input preprocessing',
        });
      }

      return {
        valid: threats.every(t => t.severity !== 'critical' && t.severity !== 'high'),
        sanitizedData,
        threats,
      };
    } catch (error) {
      securityLogger.error('Image validation failed', { error });
      return { valid: false, error: 'Image validation failed' };
    }
  }

  /**
   * Validate text input for AI processing
   */
  async validateTextInput(text: string, operation: string): Promise<{
    valid: boolean;
    error?: string;
    sanitizedText?: string;
    threats?: AIThreatDetection[];
  }> {
    try {
      const policy = this.securityPolicies.get(operation);
      if (!policy) {
        return { valid: false, error: 'Invalid operation' };
      }

      const threats: AIThreatDetection[] = [];

      // Check text length
      if (text.length > policy.inputValidation.maxTextLength) {
        return {
          valid: false,
          error: `Text length exceeds limit (${text.length} > ${policy.inputValidation.maxTextLength})`,
        };
      }

      // Check for prompt injection attempts
      const injectionCheck = this.detectPromptInjection(text);
      if (injectionCheck.detected) {
        threats.push({
          type: 'prompt_injection',
          severity: injectionCheck.severity,
          confidence: injectionCheck.confidence,
          description: injectionCheck.description,
          mitigation: 'Sanitize or reject input',
        });
      }

      // Check for data extraction attempts
      const extractionCheck = this.detectDataExtractionAttempt(text);
      if (extractionCheck.detected) {
        threats.push({
          type: 'data_extraction',
          severity: 'high',
          confidence: extractionCheck.confidence,
          description: 'Potential data extraction attempt detected',
          mitigation: 'Block request and monitor user',
        });
      }

      // Sanitize text
      const sanitizedText = this.sanitizeTextInput(text);

      return {
        valid: threats.every(t => t.severity !== 'critical' && t.severity !== 'high'),
        sanitizedText,
        threats,
      };
    } catch (error) {
      securityLogger.error('Text validation failed', { error });
      return { valid: false, error: 'Text validation failed' };
    }
  }

  /**
   * Secure API key management
   */
  async rotateAPIKey(service: string): Promise<void> {
    try {
      // Generate new API key
      const newKey = await this.generateSecureAPIKey();
      
      // Encrypt and store new key
      const encrypted = await cryptoService.encrypt(newKey);
      this.apiKeys.set(service, { key: JSON.stringify(encrypted), encrypted: true });
      
      // Log key rotation
      securityLogger.info('api_key_rotated', { service });
    } catch (error) {
      securityLogger.error('API key rotation failed', { service, error });
      throw new Error('Failed to rotate API key');
    }
  }

  /**
   * Get usage statistics for monitoring
   */
  async getUsageStatistics(userId?: string): Promise<{
    totalRequests: number;
    totalCost: number;
    operationBreakdown: Record<string, { requests: number; cost: number }>;
    quotaUtilization: Record<string, number>;
    anomalies: Array<{ type: string; description: string; severity: string }>;
  }> {
    try {
      let totalRequests = 0;
      let totalCost = 0;
      const operationBreakdown: Record<string, { requests: number; cost: number }> = {};
      const quotaUtilization: Record<string, number> = {};
      const anomalies: Array<{ type: string; description: string; severity: string }> = [];

      const quotas = userId ? 
        [this.usageQuotas.get(userId)].filter(Boolean) : 
        Array.from(this.usageQuotas.values());

      for (const quota of quotas) {
        if (!quota) continue;

        totalRequests += quota.dailyUsed;
        
        const operation = quota.operation;
        if (!operationBreakdown[operation]) {
          operationBreakdown[operation] = { requests: 0, cost: 0 };
        }
        operationBreakdown[operation].requests += quota.dailyUsed;

        // Calculate quota utilization
        const dailyUtilization = (quota.dailyUsed / quota.dailyLimit) * 100;
        const monthlyUtilization = (quota.monthlyUsed / quota.monthlyLimit) * 100;
        quotaUtilization[`${quota.userId}-${operation}`] = Math.max(dailyUtilization, monthlyUtilization);

        // Detect anomalies
        if (dailyUtilization > 80) {
          anomalies.push({
            type: 'quota_exhaustion',
            description: `User ${quota.userId} approaching daily quota limit for ${operation}`,
            severity: dailyUtilization > 95 ? 'high' : 'medium',
          });
        }
      }

      return {
        totalRequests,
        totalCost,
        operationBreakdown,
        quotaUtilization,
        anomalies,
      };
    } catch (error) {
      securityLogger.error('Failed to get usage statistics', { error });
      throw new Error('Failed to retrieve usage statistics');
    }
  }

  // Private methods

  private initializeSecurityPolicies(): void {
    const policies: Array<[string, AISecurityPolicy]> = [
      ['photo_analysis', {
        operation: 'photo_analysis',
        inputValidation: {
          maxImageSize: 10 * 1024 * 1024, // 10MB
          allowedFormats: ['image/jpeg', 'image/png', 'image/webp'],
          maxTextLength: 0,
          contentFilters: ['explicit', 'violence'],
        },
        rateLimit: {
          requestsPerMinute: 10,
          requestsPerHour: 100,
          requestsPerDay: 500,
        },
        costProtection: {
          maxCostPerRequest: 0.50,
          maxDailyCost: 25.00,
          alertThreshold: 20.00,
        },
        outputValidation: {
          contentFilters: ['inappropriate', 'offensive'],
          confidenceThreshold: 0.7,
          maxResponseLength: 5000,
        },
      }],
      ['bio_generation', {
        operation: 'bio_generation',
        inputValidation: {
          maxImageSize: 0,
          allowedFormats: [],
          maxTextLength: 2000,
          contentFilters: ['inappropriate', 'personal_info'],
        },
        rateLimit: {
          requestsPerMinute: 5,
          requestsPerHour: 50,
          requestsPerDay: 200,
        },
        costProtection: {
          maxCostPerRequest: 0.25,
          maxDailyCost: 10.00,
          alertThreshold: 8.00,
        },
        outputValidation: {
          contentFilters: ['inappropriate', 'personal_info', 'contact_info'],
          confidenceThreshold: 0.8,
          maxResponseLength: 1000,
        },
      }],
    ];

    for (const [operation, policy] of policies) {
      this.securityPolicies.set(operation, policy);
    }
  }

  private initializeThreatPatterns(): void {
    this.threatPatterns.set('prompt_injection', /(?:ignore|forget|disregard).{0,50}(?:previous|above|instructions|rules)/i);
    this.threatPatterns.set('data_extraction', /(?:show|tell|give).{0,50}(?:training|data|database|secret|key|token)/i);
    this.threatPatterns.set('jailbreak', /(?:developer|admin|god|root).{0,50}mode/i);
    this.threatPatterns.set('role_play', /(?:you are|act as|pretend|roleplay).{0,50}(?:admin|developer|unrestricted)/i);
  }

  private async loadAPIKeys(): Promise<void> {
    // Load encrypted API keys from secure storage
    // This is a mock implementation
    const mockKeys = {
      'openai': 'encrypted_openai_key',
      'anthropic': 'encrypted_anthropic_key',
      'google': 'encrypted_google_key',
    };

    for (const [service, key] of Object.entries(mockKeys)) {
      this.apiKeys.set(service, { key, encrypted: true });
    }
  }

  private async initializeUsageQuotas(): Promise<void> {
    // Initialize with default quotas - in production, load from database
  }

  private async checkUsageQuota(userId: string, operation: string): Promise<{
    allowed: boolean;
    error?: string;
  }> {
    const quotaKey = `${userId}-${operation}`;
    let quota = this.usageQuotas.get(quotaKey);

    if (!quota) {
      quota = this.createDefaultQuota(userId, operation);
      this.usageQuotas.set(quotaKey, quota);
    }

    // Reset counters if needed
    await this.resetQuotaIfExpired(quota);

    if (quota.dailyUsed >= quota.dailyLimit) {
      return {
        allowed: false,
        error: 'Daily quota exceeded',
      };
    }

    if (quota.monthlyUsed >= quota.monthlyLimit) {
      return {
        allowed: false,
        error: 'Monthly quota exceeded',
      };
    }

    return { allowed: true };
  }

  private async validateAIInput(request: AIRequest, policy: AISecurityPolicy): Promise<{
    valid: boolean;
    error?: string;
    threats?: AIThreatDetection[];
  }> {
    const threats: AIThreatDetection[] = [];

    // Validate based on operation type
    if (request.operation === 'photo_analysis' && request.input.image) {
      const imageValidation = await this.validateImageInput(request.input.image, request.operation);
      if (!imageValidation.valid) {
        return imageValidation;
      }
      if (imageValidation.threats) {
        threats.push(...imageValidation.threats);
      }
    }

    if (request.input.text) {
      const textValidation = await this.validateTextInput(request.input.text, request.operation);
      if (!textValidation.valid) {
        return { ...textValidation, threats };
      }
      if (textValidation.threats) {
        threats.push(...textValidation.threats);
      }
    }

    return { valid: true, threats };
  }

  private async detectThreats(request: AIRequest): Promise<AIThreatDetection[]> {
    const threats: AIThreatDetection[] = [];

    // Check for unusual request patterns
    const requestPattern = this.analyzeRequestPattern(request);
    if (requestPattern.suspicious) {
      threats.push({
        type: 'model_abuse',
        severity: 'medium',
        confidence: requestPattern.confidence,
        description: 'Unusual request pattern detected',
        mitigation: 'Monitor user activity',
      });
    }

    return threats;
  }

  private async executeSecureAIRequest(request: AIRequest, policy: AISecurityPolicy): Promise<AIResponse> {
    const startTime = Date.now();
    const requestId = cryptoService.generateUUID();

    try {
      // Get secure API key
      const apiKey = await this.getDecryptedAPIKey('openai');
      
      // Mock AI processing with security measures
      const result = await this.mockAIProcessing(request, apiKey);
      
      const processingTime = Date.now() - startTime;
      const cost = this.calculateRequestCost(request.operation, processingTime);

      // Validate output
      const outputValidation = this.validateAIOutput(result, policy);
      
      return {
        requestId,
        result: outputValidation.sanitizedResult,
        confidence: result.confidence || 0.8,
        modelVersion: '1.0',
        processingTime,
        cost,
        flagged: outputValidation.flagged,
        flags: outputValidation.flags,
        metadata: {
          inputSize: JSON.stringify(request.input).length,
          outputSize: JSON.stringify(result).length,
        },
      };
    } catch (error) {
      securityLogger.error('Secure AI request execution failed', { requestId, error });
      throw error;
    }
  }

  private async getDecryptedAPIKey(service: string): Promise<string> {
    const keyData = this.apiKeys.get(service);
    if (!keyData) {
      throw new Error(`API key not found for service: ${service}`);
    }

    if (keyData.encrypted) {
      const encryptedData = JSON.parse(keyData.key);
      return await cryptoService.decrypt(encryptedData);
    }

    return keyData.key;
  }

  private async mockAIProcessing(request: AIRequest, apiKey: string): Promise<any> {
    // Mock AI processing - replace with actual AI service calls
    return {
      result: `Processed ${request.operation}`,
      confidence: 0.85,
    };
  }

  private calculateRequestCost(operation: string, processingTime: number): number {
    const baseCosts = {
      'photo_analysis': 0.10,
      'bio_generation': 0.05,
      'optimization': 0.15,
      'scoring': 0.03,
    };

    const baseCost = baseCosts[operation] || 0.05;
    const timeFactor = Math.min(processingTime / 1000 / 10, 2); // Cap at 2x for long requests
    
    return Math.round((baseCost * (1 + timeFactor)) * 100) / 100;
  }

  private validateAIOutput(result: any, policy: AISecurityPolicy): {
    sanitizedResult: any;
    flagged: boolean;
    flags: string[];
  } {
    const flags: string[] = [];
    let sanitizedResult = { ...result };

    // Check for inappropriate content
    if (result.result && typeof result.result === 'string') {
      const text = result.result.toLowerCase();
      
      for (const filter of policy.outputValidation.contentFilters) {
        if (text.includes(filter)) {
          flags.push(`inappropriate_content_${filter}`);
        }
      }

      // Remove potential personal information
      sanitizedResult.result = result.result
        .replace(/\b[\w._%+-]+@[\w.-]+\.[A-Z]{2,}\b/gi, '[EMAIL]')
        .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
        .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CREDIT_CARD]');
    }

    // Check confidence threshold
    if (result.confidence < policy.outputValidation.confidenceThreshold) {
      flags.push('low_confidence');
    }

    // Check response length
    const responseLength = JSON.stringify(result).length;
    if (responseLength > policy.outputValidation.maxResponseLength) {
      flags.push('response_too_long');
      // Truncate response if needed
      if (sanitizedResult.result && typeof sanitizedResult.result === 'string') {
        sanitizedResult.result = sanitizedResult.result.substring(0, policy.outputValidation.maxResponseLength);
      }
    }

    return {
      sanitizedResult,
      flagged: flags.length > 0,
      flags,
    };
  }

  private detectPromptInjection(text: string): {
    detected: boolean;
    severity: 'low' | 'medium' | 'high';
    confidence: number;
    description: string;
  } {
    const patterns = [
      { pattern: this.threatPatterns.get('prompt_injection')!, severity: 'high' as const, confidence: 90 },
      { pattern: this.threatPatterns.get('jailbreak')!, severity: 'high' as const, confidence: 85 },
      { pattern: this.threatPatterns.get('role_play')!, severity: 'medium' as const, confidence: 75 },
    ];

    for (const { pattern, severity, confidence } of patterns) {
      if (pattern.test(text)) {
        return {
          detected: true,
          severity,
          confidence,
          description: 'Prompt injection pattern detected',
        };
      }
    }

    return {
      detected: false,
      severity: 'low',
      confidence: 0,
      description: 'No prompt injection detected',
    };
  }

  private detectDataExtractionAttempt(text: string): {
    detected: boolean;
    confidence: number;
  } {
    const extractionPattern = this.threatPatterns.get('data_extraction')!;
    
    if (extractionPattern.test(text)) {
      return { detected: true, confidence: 80 };
    }

    return { detected: false, confidence: 0 };
  }

  private sanitizeTextInput(text: string): string {
    return text
      .replace(/[<>]/g, '') // Remove potential HTML
      .replace(/javascript:/gi, '') // Remove javascript protocols
      .trim()
      .substring(0, 2000); // Ensure max length
  }

  private async checkAdversarialImage(imageData: any): Promise<{
    detected: boolean;
    confidence: number;
  }> {
    // Mock adversarial detection - in production, use specialized tools
    return { detected: false, confidence: 0 };
  }

  private analyzeRequestPattern(request: AIRequest): {
    suspicious: boolean;
    confidence: number;
  } {
    // Mock pattern analysis - in production, analyze request patterns
    return { suspicious: false, confidence: 0 };
  }

  private createDefaultQuota(userId: string, operation: string): AIUsageQuota {
    const defaultLimits = {
      'photo_analysis': { daily: 50, monthly: 1000 },
      'bio_generation': { daily: 20, monthly: 500 },
      'optimization': { daily: 10, monthly: 200 },
      'scoring': { daily: 100, monthly: 2000 },
    };

    const limits = defaultLimits[operation] || { daily: 10, monthly: 100 };

    return {
      userId,
      operation,
      dailyLimit: limits.daily,
      monthlyLimit: limits.monthly,
      dailyUsed: 0,
      monthlyUsed: 0,
      lastReset: new Date().toISOString(),
      tier: 'free',
    };
  }

  private async resetQuotaIfExpired(quota: AIUsageQuota): Promise<void> {
    const now = new Date();
    const lastReset = new Date(quota.lastReset);
    
    // Reset daily quota
    if (now.getDate() !== lastReset.getDate() || now.getMonth() !== lastReset.getMonth()) {
      quota.dailyUsed = 0;
    }

    // Reset monthly quota
    if (now.getMonth() !== lastReset.getMonth()) {
      quota.monthlyUsed = 0;
    }

    quota.lastReset = now.toISOString();
  }

  private async updateUsageQuota(userId: string, operation: string, cost: number): Promise<void> {
    const quotaKey = `${userId}-${operation}`;
    const quota = this.usageQuotas.get(quotaKey);
    
    if (quota) {
      quota.dailyUsed++;
      quota.monthlyUsed++;
    }
  }

  private async generateSecureAPIKey(): Promise<string> {
    return await cryptoService.generateSecureKey(64);
  }

  private startCostMonitoring(): void {
    // Monitor costs every hour
    setInterval(async () => {
      try {
        const stats = await this.getUsageStatistics();
        
        for (const anomaly of stats.anomalies) {
          if (anomaly.severity === 'high') {
            securityLogger.critical('ai_cost_anomaly', anomaly);
          } else {
            securityLogger.warn('ai_usage_anomaly', anomaly);
          }
        }
      } catch (error) {
        securityLogger.error('Cost monitoring failed', { error });
      }
    }, 60 * 60 * 1000);
  }
}

// Export singleton instance
export const aiSecurityService = AISecurityService.getInstance();