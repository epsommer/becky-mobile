// Production Deployment Safety Check
export function validateProductionEnvironment(): {
  safe: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Only run in production
  if (process.env.NODE_ENV !== 'production') {
    return { safe: true, errors, warnings }
  }

  console.log('🔍 PRODUCTION DEPLOYMENT SAFETY CHECK')

  // Required environment variables
  const required = {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  }

  // Check for missing required variables
  for (const [key, value] of Object.entries(required)) {
    if (!value || value.trim() === '') {
      errors.push(`Missing required environment variable: ${key}`)
    }
  }

  // Validate NEXTAUTH_SECRET strength
  if (required.NEXTAUTH_SECRET && required.NEXTAUTH_SECRET.length < 32) {
    errors.push('NEXTAUTH_SECRET must be at least 32 characters long')
  }

  // Validate ADMIN_PASSWORD strength
  if (required.ADMIN_PASSWORD) {
    const password = required.ADMIN_PASSWORD
    if (password.length < 12) {
      errors.push('ADMIN_PASSWORD must be at least 12 characters long')
    }
    if (!/[A-Z]/.test(password)) {
      warnings.push('ADMIN_PASSWORD should contain uppercase letters')
    }
    if (!/[a-z]/.test(password)) {
      warnings.push('ADMIN_PASSWORD should contain lowercase letters')
    }
    if (!/[0-9]/.test(password)) {
      warnings.push('ADMIN_PASSWORD should contain numbers')
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      warnings.push('ADMIN_PASSWORD should contain special characters')
    }
  }

  // Check for development defaults
  const developmentDefaults = [
    'dev-secret-key-123',
    'emergency-secret-key-123',
    'your-secret-here',
    'admin',
    'password',
    'test'
  ]

  for (const [key, value] of Object.entries(required)) {
    if (value && developmentDefaults.includes(value.toLowerCase())) {
      errors.push(`${key} is using a development default value - SECURITY RISK`)
    }
  }

  // Validate URL format
  if (required.NEXTAUTH_URL) {
    try {
      const url = new URL(required.NEXTAUTH_URL)
      if (url.protocol !== 'https:') {
        warnings.push('NEXTAUTH_URL should use HTTPS in production')
      }
    } catch {
      errors.push('NEXTAUTH_URL is not a valid URL')
    }
  }

  // Log results
  const safe = errors.length === 0

  if (!safe) {
    console.error('❌ PRODUCTION DEPLOYMENT BLOCKED - Security issues detected:')
    errors.forEach(error => console.error(`   - ${error}`))
  }

  if (warnings.length > 0) {
    console.warn('⚠️  PRODUCTION WARNINGS:')
    warnings.forEach(warning => console.warn(`   - ${warning}`))
  }

  if (safe && warnings.length === 0) {
    console.log('✅ PRODUCTION DEPLOYMENT SAFETY CHECK PASSED')
  }

  return { safe, errors, warnings }
}

// Middleware to block production deployment if unsafe
export function requireSecureProduction() {
  const check = validateProductionEnvironment()
  
  if (!check.safe) {
    throw new Error(
      'PRODUCTION DEPLOYMENT BLOCKED: ' + 
      check.errors.join(', ') + 
      '. Please fix these security issues before deploying.'
    )
  }

  return check
}