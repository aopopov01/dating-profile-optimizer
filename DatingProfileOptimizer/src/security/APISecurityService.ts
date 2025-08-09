/**
 * API Security Service for Dating Profile Optimizer
 * Handles input validation, rate limiting, JWT verification, and request sanitization
 */

import validator from 'validator';
import { SECURITY_CONFIG, SECURITY_HEADERS, ERROR_MESSAGES } from './SecurityConfig';
import { securityLogger } from './SecurityLogger';
import { cryptoService } from './CryptoService';

export interface APIRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
  params?: Record<string, string>;
  query?: Record<string, string>;
  userAgent?: string;
  ipAddress?: string;
  userId?: string;
}

export interface APIResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  success: boolean;
  error?: string;
}

export interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'email' | 'url' | 'uuid' | 'date' | 'array' | 'object';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  allowedValues?: any[];
  customValidator?: (value: any) => boolean;
  sanitizer?: (value: any) => any;
}

export interface RateLimitRule {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: APIRequest) => string;
}

export interface SecurityPolicy {
  endpoint: string;
  methods: string[];
  requireAuth: boolean;
  requireMFA?: boolean;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  validationRules?: ValidationRule[];
  rateLimit?: RateLimitRule;
  allowedOrigins?: string[];
  maxRequestSize?: number;
  allowFileUpload?: boolean;
  encryptResponse?: boolean;
}

export class APISecurityService {
  private static instance: APISecurityService;
  private rateLimitMap: Map<string, { count: number; resetTime: number }> = new Map();
  private securityPolicies: Map<string, SecurityPolicy> = new Map();
  private blockedIPs: Set<string> = new Set();
  private suspiciousActivities: Map<string, number> = new Map();

  private constructor() {
    this.initializeSecurityPolicies();
    this.startCleanupTimer();
  }

  public static getInstance(): APISecurityService {
    if (!APISecurityService.instance) {
      APISecurityService.instance = new APISecurityService();
    }
    return APISecurityService.instance;
  }

  /**
   * Process and secure incoming API request
   */
  async processRequest(request: APIRequest): Promise<{
    allowed: boolean;
    modifiedRequest?: APIRequest;
    error?: string;
    statusCode?: number;
  }> {
    try {
      // Check if IP is blocked
      if (this.isIPBlocked(request.ipAddress)) {
        securityLogger.warn('blocked_ip_request', {
          ipAddress: request.ipAddress,
          url: request.url,
        });
        
        return {
          allowed: false,
          error: ERROR_MESSAGES.FORBIDDEN,
          statusCode: 403,
        };
      }

      // Get security policy for endpoint
      const policy = this.getSecurityPolicy(request.url, request.method);
      
      // Check rate limits
      const rateLimitResult = await this.checkRateLimit(request, policy?.rateLimit);
      if (!rateLimitResult.allowed) {
        return {
          allowed: false,
          error: rateLimitResult.error,
          statusCode: 429,
        };
      }

      // Validate request size
      if (policy?.maxRequestSize && this.getRequestSize(request) > policy.maxRequestSize) {
        securityLogger.warn('request_size_exceeded', {
          url: request.url,
          size: this.getRequestSize(request),
          limit: policy.maxRequestSize,
        });
        
        return {
          allowed: false,
          error: 'Request size exceeds limit',
          statusCode: 413,
        };
      }

      // Validate and sanitize input
      const validationResult = await this.validateRequest(request, policy);
      if (!validationResult.valid) {
        return {
          allowed: false,
          error: validationResult.error,
          statusCode: 400,
        };
      }

      // Check authentication if required
      if (policy?.requireAuth) {
        const authResult = await this.verifyAuthentication(request);
        if (!authResult.valid) {
          return {
            allowed: false,
            error: authResult.error,
            statusCode: 401,
          };
        }
        
        request.userId = authResult.userId;
      }

      // Check authorization
      if (policy?.requiredPermissions || policy?.requiredRoles) {
        const authzResult = await this.verifyAuthorization(request, policy);
        if (!authzResult.valid) {
          return {
            allowed: false,
            error: authzResult.error,
            statusCode: 403,
          };
        }
      }

      // Log API request
      securityLogger.logAPIRequest(request.url, request.method, request.userId, {
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
      });

      return {
        allowed: true,
        modifiedRequest: validationResult.sanitizedRequest,
      };
    } catch (error) {
      securityLogger.error('API security processing failed', {
        url: request.url,
        error: error.message,
      });
      
      return {
        allowed: false,
        error: 'Internal security error',
        statusCode: 500,
      };
    }
  }

  /**
   * Secure outgoing API response
   */
  async processResponse(
    response: any,
    request: APIRequest,
    policy?: SecurityPolicy
  ): Promise<APIResponse> {
    try {
      let processedResponse = { ...response };

      // Add security headers
      const securityHeaders = {
        ...SECURITY_HEADERS,
        'X-Request-ID': cryptoService.generateUUID(),
        'X-RateLimit-Remaining': await this.getRemainingRequests(request),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      };

      // Remove sensitive information from error responses
      if (!response.success && response.error) {
        processedResponse.error = this.sanitizeErrorMessage(response.error);
      }

      // Encrypt response if required
      if (policy?.encryptResponse && processedResponse.data) {
        const encrypted = await cryptoService.encrypt(JSON.stringify(processedResponse.data));
        processedResponse.data = encrypted;
        securityHeaders['Content-Type'] = 'application/json; encrypted=true';
      }

      // Remove internal fields
      if (processedResponse.data) {
        processedResponse.data = this.removeInternalFields(processedResponse.data);
      }

      return {
        statusCode: response.statusCode || (response.success ? 200 : 400),
        headers: securityHeaders,
        body: processedResponse,
        success: response.success,
        error: processedResponse.error,
      };
    } catch (error) {
      securityLogger.error('Response processing failed', {
        url: request.url,
        error: error.message,
      });

      return {
        statusCode: 500,
        headers: SECURITY_HEADERS,
        body: { success: false, error: 'Internal server error' },
        success: false,
        error: 'Response processing failed',
      };
    }
  }

  /**
   * Validate input data against security rules
   */
  async validateInput(data: any, rules: ValidationRule[]): Promise<{
    valid: boolean;
    errors: string[];
    sanitized: any;
  }> {
    const errors: string[] = [];
    const sanitized: any = {};

    for (const rule of rules) {
      const value = data[rule.field];

      // Check if required field is present
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${rule.field} is required`);
        continue;
      }

      // Skip validation for optional empty fields
      if (!rule.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      // Type validation
      const typeValidation = this.validateType(value, rule.type);
      if (!typeValidation.valid) {
        errors.push(`${rule.field} must be a valid ${rule.type}`);
        continue;
      }

      // Length validation for strings
      if (rule.type === 'string' && typeof value === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push(`${rule.field} must be at least ${rule.minLength} characters`);
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(`${rule.field} must not exceed ${rule.maxLength} characters`);
        }
      }

      // Numeric range validation
      if (rule.type === 'number' && typeof value === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors.push(`${rule.field} must be at least ${rule.min}`);
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push(`${rule.field} must not exceed ${rule.max}`);
        }
      }

      // Pattern validation
      if (rule.pattern && typeof value === 'string') {
        if (!rule.pattern.test(value)) {
          errors.push(`${rule.field} format is invalid`);
        }
      }

      // Allowed values validation
      if (rule.allowedValues && !rule.allowedValues.includes(value)) {
        errors.push(`${rule.field} must be one of: ${rule.allowedValues.join(', ')}`);
      }

      // Custom validation
      if (rule.customValidator && !rule.customValidator(value)) {
        errors.push(`${rule.field} is invalid`);
      }

      // Sanitize value
      let sanitizedValue = value;
      if (rule.sanitizer) {
        sanitizedValue = rule.sanitizer(value);
      } else {
        sanitizedValue = this.defaultSanitizer(value, rule.type);
      }

      sanitized[rule.field] = sanitizedValue;
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized,
    };
  }

  /**
   * Check if request should be blocked due to suspicious activity
   */
  async checkSuspiciousActivity(request: APIRequest): Promise<boolean> {
    const key = request.ipAddress || request.userId || 'unknown';
    const suspiciousCount = this.suspiciousActivities.get(key) || 0;

    // Check for SQL injection attempts
    if (this.containsSQLInjection(request)) {
      this.incrementSuspiciousActivity(key);
      securityLogger.warn('sql_injection_attempt', {
        ipAddress: request.ipAddress,
        userId: request.userId,
        url: request.url,
        body: request.body,
      });
      return true;
    }

    // Check for XSS attempts
    if (this.containsXSS(request)) {
      this.incrementSuspiciousActivity(key);
      securityLogger.warn('xss_attempt', {
        ipAddress: request.ipAddress,
        userId: request.userId,
        url: request.url,
        body: request.body,
      });
      return true;
    }

    // Check for directory traversal attempts
    if (this.containsDirectoryTraversal(request)) {
      this.incrementSuspiciousActivity(key);
      securityLogger.warn('directory_traversal_attempt', {
        ipAddress: request.ipAddress,
        userId: request.userId,
        url: request.url,
      });
      return true;
    }

    return false;
  }

  /**
   * Add security policy for specific endpoint
   */
  addSecurityPolicy(endpoint: string, policy: SecurityPolicy): void {
    this.securityPolicies.set(endpoint, policy);
  }

  /**
   * Block IP address
   */
  blockIP(ipAddress: string, reason: string): void {
    this.blockedIPs.add(ipAddress);
    securityLogger.warn('ip_blocked', { ipAddress, reason });
  }

  /**
   * Unblock IP address
   */
  unblockIP(ipAddress: string): void {
    this.blockedIPs.delete(ipAddress);
    securityLogger.info('ip_unblocked', { ipAddress });
  }

  // Private methods

  private initializeSecurityPolicies(): void {
    // Authentication endpoints
    this.addSecurityPolicy('/api/auth/login', {
      endpoint: '/api/auth/login',
      methods: ['POST'],
      requireAuth: false,
      validationRules: [
        {
          field: 'email',
          type: 'email',
          required: true,
          maxLength: 255,
        },
        {
          field: 'password',
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 128,
        },
      ],
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 5, // 5 login attempts per 15 minutes
      },
    });

    // Photo upload endpoint
    this.addSecurityPolicy('/api/photos/upload', {
      endpoint: '/api/photos/upload',
      methods: ['POST'],
      requireAuth: true,
      allowFileUpload: true,
      maxRequestSize: SECURITY_CONFIG.api.maxFileUploadSize,
      validationRules: [
        {
          field: 'file',
          type: 'object',
          required: true,
          customValidator: (file) => this.validateFileUpload(file),
        },
      ],
      rateLimit: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 10, // 10 uploads per minute
      },
    });

    // Profile data endpoints
    this.addSecurityPolicy('/api/profile/update', {
      endpoint: '/api/profile/update',
      methods: ['PUT', 'PATCH'],
      requireAuth: true,
      encryptResponse: true,
      validationRules: [
        {
          field: 'firstName',
          type: 'string',
          maxLength: 50,
          sanitizer: (value) => validator.escape(value.trim()),
        },
        {
          field: 'lastName',
          type: 'string',
          maxLength: 50,
          sanitizer: (value) => validator.escape(value.trim()),
        },
        {
          field: 'age',
          type: 'number',
          min: 18,
          max: 100,
        },
        {
          field: 'bio',
          type: 'string',
          maxLength: 1000,
          sanitizer: (value) => validator.escape(value.trim()),
        },
      ],
    });

    // Payment endpoints
    this.addSecurityPolicy('/api/payments/process', {
      endpoint: '/api/payments/process',
      methods: ['POST'],
      requireAuth: true,
      requireMFA: true,
      encryptResponse: true,
      validationRules: [
        {
          field: 'amount',
          type: 'number',
          required: true,
          min: 0.01,
          max: 1000,
        },
        {
          field: 'currency',
          type: 'string',
          required: true,
          allowedValues: ['USD', 'EUR', 'GBP'],
        },
        {
          field: 'paymentMethod',
          type: 'string',
          required: true,
          pattern: /^pm_[a-zA-Z0-9]+$/,
        },
      ],
      rateLimit: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 20, // 20 payment attempts per hour
      },
    });
  }

  private async checkRateLimit(request: APIRequest, rateLimit?: RateLimitRule): Promise<{
    allowed: boolean;
    error?: string;
  }> {
    if (!rateLimit) {
      return { allowed: true };
    }

    const key = rateLimit.keyGenerator ? rateLimit.keyGenerator(request) : 
                 request.userId || request.ipAddress || 'anonymous';
    
    const now = Date.now();
    const entry = this.rateLimitMap.get(key);

    if (!entry || now > entry.resetTime) {
      this.rateLimitMap.set(key, {
        count: 1,
        resetTime: now + rateLimit.windowMs,
      });
      return { allowed: true };
    }

    if (entry.count >= rateLimit.maxRequests) {
      securityLogger.warn('rate_limit_exceeded', {
        key,
        url: request.url,
        count: entry.count,
        limit: rateLimit.maxRequests,
      });
      
      return {
        allowed: false,
        error: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
      };
    }

    entry.count++;
    return { allowed: true };
  }

  private async validateRequest(request: APIRequest, policy?: SecurityPolicy): Promise<{
    valid: boolean;
    error?: string;
    sanitizedRequest?: APIRequest;
  }> {
    if (!policy?.validationRules) {
      return { valid: true, sanitizedRequest: request };
    }

    const bodyValidation = await this.validateInput(request.body || {}, policy.validationRules);
    
    if (!bodyValidation.valid) {
      return {
        valid: false,
        error: bodyValidation.errors.join(', '),
      };
    }

    const sanitizedRequest = {
      ...request,
      body: bodyValidation.sanitized,
    };

    return { valid: true, sanitizedRequest };
  }

  private async verifyAuthentication(request: APIRequest): Promise<{
    valid: boolean;
    userId?: string;
    error?: string;
  }> {
    const authHeader = request.headers.authorization || request.headers.Authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        valid: false,
        error: ERROR_MESSAGES.UNAUTHORIZED,
      };
    }

    const token = authHeader.slice(7);
    
    try {
      // In production, verify JWT token properly
      const decoded = JSON.parse(atob(token.split('.')[1])); // Mock decode
      
      if (decoded.exp * 1000 < Date.now()) {
        return {
          valid: false,
          error: ERROR_MESSAGES.INVALID_TOKEN,
        };
      }

      return {
        valid: true,
        userId: decoded.sub,
      };
    } catch (error) {
      return {
        valid: false,
        error: ERROR_MESSAGES.INVALID_TOKEN,
      };
    }
  }

  private async verifyAuthorization(request: APIRequest, policy: SecurityPolicy): Promise<{
    valid: boolean;
    error?: string;
  }> {
    // Mock authorization check - implement proper RBAC in production
    return { valid: true };
  }

  private validateType(value: any, type: string): { valid: boolean } {
    switch (type) {
      case 'string':
        return { valid: typeof value === 'string' };
      case 'number':
        return { valid: typeof value === 'number' && !isNaN(value) };
      case 'boolean':
        return { valid: typeof value === 'boolean' };
      case 'email':
        return { valid: typeof value === 'string' && validator.isEmail(value) };
      case 'url':
        return { valid: typeof value === 'string' && validator.isURL(value) };
      case 'uuid':
        return { valid: typeof value === 'string' && validator.isUUID(value) };
      case 'date':
        return { valid: typeof value === 'string' && validator.isISO8601(value) };
      case 'array':
        return { valid: Array.isArray(value) };
      case 'object':
        return { valid: typeof value === 'object' && value !== null };
      default:
        return { valid: true };
    }
  }

  private defaultSanitizer(value: any, type: string): any {
    if (type === 'string' && typeof value === 'string') {
      return validator.escape(value.trim());
    }
    return value;
  }

  private validateFileUpload(file: any): boolean {
    if (!file || !file.type || !file.size) {
      return false;
    }

    // Check file type
    if (!SECURITY_CONFIG.api.allowedFileTypes.includes(file.type)) {
      return false;
    }

    // Check file size
    if (file.size > SECURITY_CONFIG.api.maxFileUploadSize) {
      return false;
    }

    return true;
  }

  private containsSQLInjection(request: APIRequest): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|CREATE|ALTER|EXEC)\b)/i,
      /(--|;|\/\*|\*\/)/,
      /('|('')|"|(\")|`)/,
      /(OR|AND)\s+\d+\s*=\s*\d+/i,
    ];

    const testStrings = [
      request.url,
      JSON.stringify(request.body || {}),
      JSON.stringify(request.query || {}),
    ];

    return testStrings.some(str => 
      sqlPatterns.some(pattern => pattern.test(str))
    );
  }

  private containsXSS(request: APIRequest): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    ];

    const testStrings = [
      JSON.stringify(request.body || {}),
      JSON.stringify(request.query || {}),
    ];

    return testStrings.some(str => 
      xssPatterns.some(pattern => pattern.test(str))
    );
  }

  private containsDirectoryTraversal(request: APIRequest): boolean {
    const traversalPatterns = [
      /\.\.\//,
      /\.\.\\/,
      /%2e%2e%2f/i,
      /%2e%2e\\/i,
    ];

    return traversalPatterns.some(pattern => pattern.test(request.url));
  }

  private getSecurityPolicy(url: string, method: string): SecurityPolicy | undefined {
    for (const [endpoint, policy] of this.securityPolicies) {
      if (url.includes(endpoint) && policy.methods.includes(method)) {
        return policy;
      }
    }
    return undefined;
  }

  private getRequestSize(request: APIRequest): number {
    const bodySize = request.body ? JSON.stringify(request.body).length : 0;
    const urlSize = request.url.length;
    const headersSize = JSON.stringify(request.headers).length;
    
    return bodySize + urlSize + headersSize;
  }

  private isIPBlocked(ipAddress?: string): boolean {
    return ipAddress ? this.blockedIPs.has(ipAddress) : false;
  }

  private incrementSuspiciousActivity(key: string): void {
    const current = this.suspiciousActivities.get(key) || 0;
    this.suspiciousActivities.set(key, current + 1);

    // Block IP if too many suspicious activities
    if (current >= 5) {
      this.blockIP(key, 'Multiple suspicious activities detected');
    }
  }

  private async getRemainingRequests(request: APIRequest): Promise<string> {
    // Mock implementation - return remaining rate limit
    return '100';
  }

  private sanitizeErrorMessage(error: string): string {
    // Remove sensitive information from error messages
    const sanitizedError = error
      .replace(/password/gi, '[REDACTED]')
      .replace(/token/gi, '[REDACTED]')
      .replace(/key/gi, '[REDACTED]')
      .replace(/secret/gi, '[REDACTED]');

    return sanitizedError;
  }

  private removeInternalFields(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveFields = ['password', 'passwordHash', 'salt', 'secret', 'privateKey'];
    const cleaned = { ...data };

    for (const field of sensitiveFields) {
      delete cleaned[field];
    }

    return cleaned;
  }

  private startCleanupTimer(): void {
    // Clean up old rate limit entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.rateLimitMap.entries()) {
        if (now > entry.resetTime) {
          this.rateLimitMap.delete(key);
        }
      }

      // Clean up old suspicious activity entries every hour
      this.suspiciousActivities.clear();
    }, 5 * 60 * 1000);
  }
}

// Export singleton instance
export const apiSecurityService = APISecurityService.getInstance();