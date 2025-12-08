// Security Types and Interfaces
export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  status: UserStatus
  lastLogin?: Date
  failedLoginAttempts: number
  lockedUntil?: Date
  createdAt: Date
  updatedAt: Date
  twoFactorEnabled: boolean
  emailVerified?: Date
}

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER'

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'LOCKED'

export interface LoginAttempt {
  id: string
  email: string
  ip: string
  userAgent: string
  success: boolean
  timestamp: Date
  failureReason?: string
  location?: string
}

export interface SecurityEvent {
  id: string
  type: SecurityEventType
  userId?: string
  email?: string
  ip: string
  userAgent: string
  details: any
  severity: SecuritySeverity
  timestamp: Date
  resolved: boolean
}

export type SecurityEventType = 
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'ACCOUNT_LOCKED'
  | 'PASSWORD_RESET'
  | 'UNAUTHORIZED_ACCESS'
  | 'SUSPICIOUS_ACTIVITY'
  | 'ROLE_CHANGE'
  | 'ACCOUNT_STATUS_CHANGE'

export type SecuritySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface RateLimitRule {
  endpoint: string
  maxAttempts: number
  windowMs: number
  blockDurationMs: number
}

export interface SecurityConfig {
  jwt: {
    secret: string
    expiresIn: string
    refreshExpiresIn: string
  }
  rateLimit: {
    login: RateLimitRule
    api: RateLimitRule
    passwordReset: RateLimitRule
  }
  account: {
    maxFailedAttempts: number
    lockoutDurationMs: number
    passwordMinLength: number
    requireTwoFactor: boolean
  }
}

export interface AuthSession {
  user: {
    id: string
    email: string
    name: string
    role: UserRole
    permissions: string[]
  }
  expires: string
  accessToken: string
  refreshToken?: string
}

export interface Permission {
  id: string
  name: string
  description: string
  resource: string
  action: string
}

export interface RolePermission {
  role: UserRole
  permissions: Permission[]
}

// Rate limiting interfaces
export interface RateLimitState {
  count: number
  resetTime: number
  blocked: boolean
}

export interface RateLimitStorage {
  [key: string]: RateLimitState
}