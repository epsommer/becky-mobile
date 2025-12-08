// Security Utility Library
import { User, UserRole, SecurityEvent, SecurityEventType, SecuritySeverity, LoginAttempt, RateLimitState } from '@/types/security'

// Rate limiting storage (in production, use Redis or database)
const rateLimitStorage = new Map<string, RateLimitState>()
const loginAttempts = new Map<string, LoginAttempt[]>()
const securityEvents: SecurityEvent[] = []

// Security Configuration
export const SECURITY_CONFIG = {
  JWT: {
    ACCESS_TOKEN_EXPIRY: '15m', // Short-lived access tokens
    REFRESH_TOKEN_EXPIRY: '7d',
    SECRET_ROTATION_INTERVAL: 24 * 60 * 60 * 1000 // 24 hours
  },
  RATE_LIMITS: {
    LOGIN_ATTEMPTS: {
      MAX_ATTEMPTS: 5,
      WINDOW_MS: 15 * 60 * 1000, // 15 minutes
      BLOCK_DURATION_MS: 30 * 60 * 1000 // 30 minutes
    },
    API_CALLS: {
      MAX_ATTEMPTS: 100,
      WINDOW_MS: 60 * 1000, // 1 minute
      BLOCK_DURATION_MS: 5 * 60 * 1000 // 5 minutes
    },
    PASSWORD_RESET: {
      MAX_ATTEMPTS: 3,
      WINDOW_MS: 60 * 60 * 1000, // 1 hour
      BLOCK_DURATION_MS: 2 * 60 * 60 * 1000 // 2 hours
    }
  },
  ACCOUNT: {
    MAX_FAILED_ATTEMPTS: 5,
    LOCKOUT_DURATION_MS: 30 * 60 * 1000, // 30 minutes
    PASSWORD_MIN_LENGTH: 12,
    REQUIRE_TWO_FACTOR: true
  }
} as const

// Role-based permissions
export const ROLE_PERMISSIONS = {
  SUPER_ADMIN: [
    'users:create', 'users:read', 'users:update', 'users:delete',
    'security:read', 'security:manage',
    'system:configure', 'system:backup',
    'audit:read', 'audit:export'
  ],
  ADMIN: [
    'users:create', 'users:read', 'users:update',
    'security:read',
    'clients:create', 'clients:read', 'clients:update', 'clients:delete',
    'services:manage', 'conversations:manage'
  ],
  MANAGER: [
    'users:read',
    'clients:create', 'clients:read', 'clients:update',
    'services:read', 'conversations:read'
  ],
  USER: [
    'clients:read',
    'services:read',
    'conversations:read'
  ],
  VIEWER: [
    'clients:read',
    'services:read'
  ]
} as const

// Rate Limiting Functions
export function checkRateLimit(
  identifier: string, 
  maxAttempts: number, 
  windowMs: number, 
  blockDurationMs: number
): { allowed: boolean; resetTime?: number; remainingAttempts?: number } {
  const now = Date.now()
  const key = `ratelimit:${identifier}`
  
  let state = rateLimitStorage.get(key)
  
  if (!state || now > state.resetTime) {
    // Reset or initialize
    state = {
      count: 0,
      resetTime: now + windowMs,
      blocked: false
    }
  }
  
  // Check if currently blocked
  if (state.blocked && now < state.resetTime) {
    return { 
      allowed: false, 
      resetTime: state.resetTime 
    }
  }
  
  // Increment count
  state.count++
  
  // Check if limit exceeded
  if (state.count > maxAttempts) {
    state.blocked = true
    state.resetTime = now + blockDurationMs
    rateLimitStorage.set(key, state)
    
    return { 
      allowed: false, 
      resetTime: state.resetTime 
    }
  }
  
  rateLimitStorage.set(key, state)
  
  return { 
    allowed: true, 
    remainingAttempts: maxAttempts - state.count 
  }
}

// Login Attempt Tracking
export function recordLoginAttempt(
  email: string, 
  ip: string, 
  userAgent: string, 
  success: boolean, 
  failureReason?: string
): void {
  const attempt: LoginAttempt = {
    id: crypto.randomUUID(),
    email: email.toLowerCase(),
    ip,
    userAgent,
    success,
    timestamp: new Date(),
    failureReason
  }
  
  const attempts = loginAttempts.get(email) || []
  attempts.push(attempt)
  
  // Keep only last 50 attempts per email
  if (attempts.length > 50) {
    attempts.splice(0, attempts.length - 50)
  }
  
  loginAttempts.set(email, attempts)
  
  // Log security event
  logSecurityEvent({
    type: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILURE',
    email,
    ip,
    userAgent,
    details: { failureReason },
    severity: success ? 'LOW' : 'MEDIUM'
  })
}

// Security Event Logging
export function logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp' | 'resolved'>): void {
  const securityEvent: SecurityEvent = {
    id: crypto.randomUUID(),
    timestamp: new Date(),
    resolved: false,
    ...event
  }
  
  securityEvents.push(securityEvent)
  
  // Keep only last 1000 events (in production, store in database)
  if (securityEvents.length > 1000) {
    securityEvents.splice(0, securityEvents.length - 1000)
  }
  
  // Alert on high/critical severity events
  if (event.severity === 'HIGH' || event.severity === 'CRITICAL') {
    console.warn('🚨 SECURITY ALERT:', event)
    // In production: send notifications, alerts, etc.
  }
}

// Check if account should be locked
export function shouldLockAccount(email: string): boolean {
  const attempts = loginAttempts.get(email.toLowerCase()) || []
  const recentFailures = attempts.filter(
    attempt => 
      !attempt.success && 
      Date.now() - attempt.timestamp.getTime() < SECURITY_CONFIG.RATE_LIMITS.LOGIN_ATTEMPTS.WINDOW_MS
  )
  
  return recentFailures.length >= SECURITY_CONFIG.ACCOUNT.MAX_FAILED_ATTEMPTS
}

// Permission checking
export function hasPermission(userRole: UserRole, permission: string): boolean {
  const rolePermissions: readonly string[] = ROLE_PERMISSIONS[userRole] || []
  return rolePermissions.includes(permission)
}

export function hasAnyPermission(userRole: UserRole, permissions: string[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission))
}

// IP Address utilities
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }
  
  return 'unknown'
}

// User Agent parsing
export function parseUserAgent(userAgent: string): { browser?: string; os?: string; device?: string } {
  // Simple user agent parsing (in production, use a proper library)
  const browser = /Chrome|Firefox|Safari|Edge|Opera/.exec(userAgent)?.[0]
  const os = /Windows|Mac|Linux|iOS|Android/.exec(userAgent)?.[0]
  const device = /Mobile|Tablet|Desktop/.exec(userAgent)?.[0] || 'Desktop'
  
  return { browser, os, device }
}

// Token utilities
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// Password validation
export function validatePasswordStrength(password: string): {
  isValid: boolean
  score: number
  feedback: string[]
} {
  const feedback: string[] = []
  let score = 0
  
  if (password.length < SECURITY_CONFIG.ACCOUNT.PASSWORD_MIN_LENGTH) {
    feedback.push(`Password must be at least ${SECURITY_CONFIG.ACCOUNT.PASSWORD_MIN_LENGTH} characters long`)
  } else {
    score += 1
  }
  
  if (!/[a-z]/.test(password)) {
    feedback.push('Password must contain at least one lowercase letter')
  } else {
    score += 1
  }
  
  if (!/[A-Z]/.test(password)) {
    feedback.push('Password must contain at least one uppercase letter')
  } else {
    score += 1
  }
  
  if (!/[0-9]/.test(password)) {
    feedback.push('Password must contain at least one number')
  } else {
    score += 1
  }
  
  if (!/[^a-zA-Z0-9]/.test(password)) {
    feedback.push('Password must contain at least one special character')
  } else {
    score += 1
  }
  
  return {
    isValid: feedback.length === 0 && score >= 4,
    score,
    feedback
  }
}

// Get security statistics
export function getSecurityStats(): {
  totalEvents: number
  recentEvents: SecurityEvent[]
  loginAttemptsByEmail: { [email: string]: number }
  rateLimitedIPs: string[]
} {
  const now = Date.now()
  const recentEvents = securityEvents
    .filter(event => now - event.timestamp.getTime() < 24 * 60 * 60 * 1000) // Last 24 hours
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 100)
  
  const loginAttemptsByEmail: { [email: string]: number } = {}
  for (const [email, attempts] of loginAttempts.entries()) {
    loginAttemptsByEmail[email] = attempts.filter(
      attempt => now - attempt.timestamp.getTime() < 24 * 60 * 60 * 1000
    ).length
  }
  
  const rateLimitedIPs: string[] = []
  for (const [key, state] of rateLimitStorage.entries()) {
    if (state.blocked && now < state.resetTime) {
      rateLimitedIPs.push(key.replace('ratelimit:', ''))
    }
  }
  
  return {
    totalEvents: securityEvents.length,
    recentEvents,
    loginAttemptsByEmail,
    rateLimitedIPs
  }
}