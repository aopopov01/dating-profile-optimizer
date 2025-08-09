/**
 * Security Configuration for Dating Profile Optimizer
 * Centralized security settings and constants
 */

export interface SecurityConfig {
  encryption: {
    algorithm: string;
    keySize: number;
    ivSize: number;
    tagSize: number;
    iterations: number;
  };
  jwt: {
    issuer: string;
    audience: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
    algorithm: string;
  };
  auth: {
    maxLoginAttempts: number;
    lockoutDurationMinutes: number;
    passwordMinLength: number;
    passwordRequireSpecialChar: boolean;
    passwordRequireNumber: boolean;
    passwordRequireUppercase: boolean;
    sessionTimeoutMinutes: number;
    mfaRequired: boolean;
  };
  api: {
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
    maxFileUploadSize: number;
    allowedFileTypes: string[];
    requestTimeoutMs: number;
  };
  storage: {
    encryptSensitiveData: boolean;
    dataRetentionDays: number;
    automaticBackup: boolean;
    secureDeleteEnabled: boolean;
  };
  monitoring: {
    enableSecurityLogging: boolean;
    alertOnSuspiciousActivity: boolean;
    logRetentionDays: number;
    enablePerformanceMonitoring: boolean;
  };
  compliance: {
    gdprEnabled: boolean;
    ccpaEnabled: boolean;
    dataMinimizationEnabled: boolean;
    consentRequired: boolean;
  };
}

export const SECURITY_CONFIG: SecurityConfig = {
  encryption: {
    algorithm: 'aes-256-gcm',
    keySize: 32, // 256 bits
    ivSize: 12, // 96 bits for GCM
    tagSize: 16, // 128 bits for GCM
    iterations: 100000, // PBKDF2 iterations
  },
  jwt: {
    issuer: 'dating-profile-optimizer',
    audience: 'dpo-mobile-app',
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
    algorithm: 'RS256',
  },
  auth: {
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,
    passwordMinLength: 8,
    passwordRequireSpecialChar: true,
    passwordRequireNumber: true,
    passwordRequireUppercase: true,
    sessionTimeoutMinutes: 30,
    mfaRequired: true,
  },
  api: {
    rateLimitWindowMs: 60000, // 1 minute
    rateLimitMaxRequests: 100,
    maxFileUploadSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    requestTimeoutMs: 30000,
  },
  storage: {
    encryptSensitiveData: true,
    dataRetentionDays: 365,
    automaticBackup: true,
    secureDeleteEnabled: true,
  },
  monitoring: {
    enableSecurityLogging: true,
    alertOnSuspiciousActivity: true,
    logRetentionDays: 90,
    enablePerformanceMonitoring: true,
  },
  compliance: {
    gdprEnabled: true,
    ccpaEnabled: true,
    dataMinimizationEnabled: true,
    consentRequired: true,
  },
};

export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https:; script-src 'self'; style-src 'self' 'unsafe-inline'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export const SENSITIVE_DATA_FIELDS = [
  'email',
  'phone',
  'location',
  'dateOfBirth',
  'socialSecurityNumber',
  'creditCardNumber',
  'biometricData',
  'personalPhotos',
];

export const PII_DATA_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'address',
  'dateOfBirth',
  'profilePhotos',
  'location',
  'profession',
  'interests',
];

export const SECURITY_EVENTS = {
  LOGIN_SUCCESS: 'auth.login.success',
  LOGIN_FAILURE: 'auth.login.failure',
  LOGIN_LOCKED: 'auth.login.locked',
  LOGOUT: 'auth.logout',
  PASSWORD_CHANGE: 'auth.password.change',
  MFA_ENABLED: 'auth.mfa.enabled',
  MFA_DISABLED: 'auth.mfa.disabled',
  SUSPICIOUS_ACTIVITY: 'security.suspicious.activity',
  DATA_BREACH_ATTEMPT: 'security.breach.attempt',
  UNAUTHORIZED_ACCESS: 'security.unauthorized.access',
  FILE_UPLOAD: 'data.file.upload',
  DATA_EXPORT: 'data.export',
  DATA_DELETE: 'data.delete',
  API_RATE_LIMIT_EXCEEDED: 'api.rate.limit.exceeded',
  PAYMENT_PROCESSED: 'payment.processed',
  PAYMENT_FAILED: 'payment.failed',
} as const;

export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'Access denied',
  INVALID_TOKEN: 'Invalid or expired token',
  RATE_LIMIT_EXCEEDED: 'Too many requests, please try again later',
  INVALID_INPUT: 'Invalid input data',
  FILE_TOO_LARGE: 'File size exceeds maximum limit',
  INVALID_FILE_TYPE: 'File type not allowed',
  ACCOUNT_LOCKED: 'Account temporarily locked due to multiple failed attempts',
  WEAK_PASSWORD: 'Password does not meet security requirements',
  MFA_REQUIRED: 'Multi-factor authentication required',
  SESSION_EXPIRED: 'Session has expired, please log in again',
} as const;

export const CRYPTO_CONSTANTS = {
  SALT_ROUNDS: 12,
  KEY_DERIVATION_ITERATIONS: 100000,
  SECURE_RANDOM_BYTES: 32,
  JWT_SECRET_LENGTH: 64,
  API_KEY_LENGTH: 32,
  ENCRYPTION_KEY_LENGTH: 32,
} as const;