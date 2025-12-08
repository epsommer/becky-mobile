// Enhanced Authentication Security System
import bcrypt from 'bcrypt';
import {
  checkRateLimit,
  recordLoginAttempt,
  logSecurityEvent,
  shouldLockAccount,
  getClientIp,
  generateSecureToken,
  SECURITY_CONFIG
} from './security'
import { UserRole, SecurityEventType } from '@/types/security'

// Temporary secure user storage (in production, use encrypted database)
const secureUserStore = new Map<string, {
  id: string
  email: string
  name: string
  role: UserRole
  passwordHash: string
  salt: string
  twoFactorSecret?: string
  twoFactorEnabled: boolean
  failedLoginAttempts: number
  lockedUntil?: number
  lastLogin?: number
  ipWhitelist?: string[]
  emailVerified: boolean
  createdAt: number
}>()

// Session management
const activeSessions = new Map<string, {
  userId: string
  email: string
  role: UserRole
  ip: string
  userAgent: string
  createdAt: number
  lastActivity: number
  isValid: boolean
}>()

// Two-factor codes storage (temporary - use Redis in production)
const twoFactorCodes = new Map<string, {
  userId: string
  code: string
  expiresAt: number
}>()

// Initialize with secure admin user
if (!secureUserStore.has('admin@evangelosommer.com')) {
  secureUserStore.set('admin@evangelosommer.com', {
    id: 'admin-001',
    email: 'admin@evangelosommer.com',
    name: 'System Administrator',
    role: 'SUPER_ADMIN',
    passwordHash: 'secure-hash-placeholder', // In production: bcrypt hash
    salt: 'secure-salt-placeholder',
    twoFactorEnabled: true,
    failedLoginAttempts: 0,
    emailVerified: true,
    createdAt: Date.now()
  })
}

export class AuthenticationService {
  
  // Secure login with comprehensive validation
  static async authenticateUser(
    credentials: { email?: string; password?: string; twoFactorCode?: string },
    request: Request
  ): Promise<{ 
    success: boolean
    user?: any
    requiresTwoFactor?: boolean
    error?: string
    remainingAttempts?: number
  }> {
    const ip = getClientIp(request)
    const userAgent = request.headers.get('user-agent') || 'Unknown'
    const email = credentials.email?.toLowerCase().trim()

    // Input validation
    if (!email || !credentials.password) {
      logSecurityEvent({
        type: 'LOGIN_FAILURE',
        email: email || 'unknown',
        ip,
        userAgent,
        details: { reason: 'Missing credentials' },
        severity: 'LOW'
      })
      return { success: false, error: 'Invalid credentials provided' }
    }

    // Rate limiting check
    const rateLimitResult = checkRateLimit(
      `login:${ip}:${email}`,
      SECURITY_CONFIG.RATE_LIMITS.LOGIN_ATTEMPTS.MAX_ATTEMPTS,
      SECURITY_CONFIG.RATE_LIMITS.LOGIN_ATTEMPTS.WINDOW_MS,
      SECURITY_CONFIG.RATE_LIMITS.LOGIN_ATTEMPTS.BLOCK_DURATION_MS
    )

    if (!rateLimitResult.allowed) {
      logSecurityEvent({
        type: 'SUSPICIOUS_ACTIVITY',
        email,
        ip,
        userAgent,
        details: { reason: 'Rate limit exceeded', resetTime: rateLimitResult.resetTime },
        severity: 'HIGH'
      })
      return { 
        success: false, 
        error: `Too many login attempts. Try again later.`,
        remainingAttempts: 0
      }
    }

    // Check if user exists
    const user = secureUserStore.get(email)
    if (!user) {
      recordLoginAttempt(email, ip, userAgent, false, 'User not found')
      return { success: false, error: 'Invalid credentials' }
    }

    // Check if account is locked
    if (user.lockedUntil && Date.now() < user.lockedUntil) {
      logSecurityEvent({
        type: 'UNAUTHORIZED_ACCESS',
        userId: user.id,
        email,
        ip,
        userAgent,
        details: { reason: 'Account locked', lockedUntil: user.lockedUntil },
        severity: 'MEDIUM'
      })
      return { success: false, error: 'Account is temporarily locked' }
    }

    // IP whitelist check (if configured)
    if (user.ipWhitelist && user.ipWhitelist.length > 0 && !user.ipWhitelist.includes(ip)) {
      logSecurityEvent({
        type: 'UNAUTHORIZED_ACCESS',
        userId: user.id,
        email,
        ip,
        userAgent,
        details: { reason: 'IP not whitelisted', allowedIPs: user.ipWhitelist },
        severity: 'HIGH'
      })
      return { success: false, error: 'Access denied from this location' }
    }

    // Password verification (simplified - use bcrypt in production)
    const isPasswordValid = await this.verifyPassword(credentials.password, user.passwordHash, user.salt)
    
    if (!isPasswordValid) {
      user.failedLoginAttempts++
      
      // Lock account after too many failures
      if (user.failedLoginAttempts >= SECURITY_CONFIG.ACCOUNT.MAX_FAILED_ATTEMPTS) {
        user.lockedUntil = Date.now() + SECURITY_CONFIG.ACCOUNT.LOCKOUT_DURATION_MS
        
        logSecurityEvent({
          type: 'ACCOUNT_LOCKED',
          userId: user.id,
          email,
          ip,
          userAgent,
          details: { failedAttempts: user.failedLoginAttempts },
          severity: 'HIGH'
        })
      }

      secureUserStore.set(email, user)
      recordLoginAttempt(email, ip, userAgent, false, 'Invalid password')
      
      return { 
        success: false, 
        error: 'Invalid credentials',
        remainingAttempts: Math.max(0, SECURITY_CONFIG.ACCOUNT.MAX_FAILED_ATTEMPTS - user.failedLoginAttempts)
      }
    }

    // Check if two-factor authentication is required
    if (user.twoFactorEnabled && !credentials.twoFactorCode) {
      // Generate and send 2FA code
      const twoFactorCode = this.generateTwoFactorCode()
      const codeId = generateSecureToken(16)
      
      twoFactorCodes.set(codeId, {
        userId: user.id,
        code: twoFactorCode,
        expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes
      })

      // In production: send via SMS/email/authenticator app
      console.log(`🔐 2FA Code for ${email}: ${twoFactorCode}`)

      return {
        success: false,
        requiresTwoFactor: true,
        error: 'Two-factor authentication required'
      }
    }

    // Verify two-factor code if provided
    if (user.twoFactorEnabled && credentials.twoFactorCode) {
      const isValidTwoFactor = await this.verifyTwoFactorCode(user.id, credentials.twoFactorCode)
      
      if (!isValidTwoFactor) {
        recordLoginAttempt(email, ip, userAgent, false, 'Invalid 2FA code')
        return { success: false, error: 'Invalid two-factor authentication code' }
      }
    }

    // Successful authentication
    user.failedLoginAttempts = 0
    user.lockedUntil = undefined
    user.lastLogin = Date.now()
    secureUserStore.set(email, user)

    // Create secure session
    const sessionToken = generateSecureToken(32)
    activeSessions.set(sessionToken, {
      userId: user.id,
      email: user.email,
      role: user.role,
      ip,
      userAgent,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      isValid: true
    })

    recordLoginAttempt(email, ip, userAgent, true)
    
    logSecurityEvent({
      type: 'LOGIN_SUCCESS',
      userId: user.id,
      email,
      ip,
      userAgent,
      details: { twoFactorUsed: user.twoFactorEnabled },
      severity: 'LOW'
    })

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    }
  }

  // Password verification using bcrypt
  private static async verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
    try {
      // Use bcrypt to securely compare password with hash
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  // Generate 2FA code
  private static generateTwoFactorCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  // Verify 2FA code
  private static async verifyTwoFactorCode(userId: string, providedCode: string): Promise<boolean> {
    // Find valid code for user
    for (const [codeId, codeData] of twoFactorCodes.entries()) {
      if (codeData.userId === userId && Date.now() < codeData.expiresAt) {
        if (codeData.code === providedCode) {
          twoFactorCodes.delete(codeId) // Use code only once
          return true
        }
      }
    }
    
    // Clean up expired codes
    for (const [codeId, codeData] of twoFactorCodes.entries()) {
      if (Date.now() >= codeData.expiresAt) {
        twoFactorCodes.delete(codeId)
      }
    }
    
    return false
  }

  // Validate session
  static validateSession(sessionToken: string, ip: string): {
    valid: boolean
    user?: any
    error?: string
  } {
    const session = activeSessions.get(sessionToken)
    
    if (!session || !session.isValid) {
      return { valid: false, error: 'Invalid session' }
    }

    // Check session expiry (1 hour of inactivity)
    const sessionTimeout = 60 * 60 * 1000 // 1 hour
    if (Date.now() - session.lastActivity > sessionTimeout) {
      session.isValid = false
      activeSessions.set(sessionToken, session)
      
      logSecurityEvent({
        type: 'LOGIN_FAILURE',
        userId: session.userId,
        email: session.email,
        ip,
        userAgent: session.userAgent,
        details: { reason: 'Session expired' },
        severity: 'LOW'
      })
      
      return { valid: false, error: 'Session expired' }
    }

    // IP validation (optional strict mode)
    if (session.ip !== ip && process.env.STRICT_IP_VALIDATION === 'true') {
      logSecurityEvent({
        type: 'SUSPICIOUS_ACTIVITY',
        userId: session.userId,
        email: session.email,
        ip,
        userAgent: session.userAgent,
        details: { reason: 'IP address changed', originalIP: session.ip },
        severity: 'HIGH'
      })
      
      return { valid: false, error: 'Session IP mismatch' }
    }

    // Update last activity
    session.lastActivity = Date.now()
    activeSessions.set(sessionToken, session)

    return {
      valid: true,
      user: {
        id: session.userId,
        email: session.email,
        role: session.role
      }
    }
  }

  // Logout and invalidate session
  static logout(sessionToken: string): void {
    const session = activeSessions.get(sessionToken)
    if (session) {
      session.isValid = false
      activeSessions.set(sessionToken, session)
    }
  }

  // Get all active sessions for user (for security monitoring)
  static getUserSessions(userId: string): Array<{
    ip: string
    userAgent: string
    lastActivity: Date
    current: boolean
  }> {
    const userSessions = []
    
    for (const [token, session] of activeSessions.entries()) {
      if (session.userId === userId && session.isValid) {
        userSessions.push({
          ip: session.ip,
          userAgent: session.userAgent,
          lastActivity: new Date(session.lastActivity),
          current: false // Will be set by the calling code
        })
      }
    }
    
    return userSessions
  }
}