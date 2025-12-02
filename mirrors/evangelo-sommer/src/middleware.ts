// src/middleware.ts
// Authentication and security middleware for protecting API routes
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { jwtVerify } from 'jose';

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 100; // 100 requests per 15 minutes
const LOGIN_RATE_LIMIT = 5; // 5 login attempts per 15 minutes

// In-memory rate limit store (use Redis in production for distributed systems)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Routes that require authentication
const protectedApiRoutes = [
  '/api/clients',
  '/api/conversations',
  '/api/participants',
  '/api/services',
  '/api/billing',
  '/api/follow-ups',
  '/api/time-entries',
  '/api/calendar',
  '/api/studio',
];

// Protected page routes (redirects to signin instead of JSON response)
const protectedPageRoutes = [
  '/studio',
  '/dashboard',
  '/select',
  '/gallery',
];

// Routes that are public (authentication, health checks, etc.)
const publicRoutes = [
  '/api/auth',
  '/api/health',
];

// Login routes that need stricter rate limiting
const loginRoutes = [
  '/api/auth/signin',
  '/api/auth/callback',
];

// Get client IP address
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0] || realIp || 'unknown';
}

// Verify mobile JWT token from Authorization header
async function verifyMobileToken(authHeader: string | null): Promise<{ sub: string; email: string; role: string } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || '');

    const { payload } = await jwtVerify(token, secret);

    // Check if token has required fields
    if (payload.userId && payload.email && payload.role) {
      return {
        sub: payload.userId as string,
        email: payload.email as string,
        role: payload.role as string,
      };
    }

    return null;
  } catch (error) {
    console.error('[Middleware] Mobile token verification failed:', error);
    return null;
  }
}

// Check and update rate limit
function checkRateLimit(ip: string, pathname: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = `${ip}:${pathname}`;
  const limit = loginRoutes.some(route => pathname.startsWith(route))
    ? LOGIN_RATE_LIMIT
    : MAX_REQUESTS_PER_WINDOW;

  // Clean up expired entries periodically
  if (Math.random() < 0.01) { // 1% chance
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetTime < now) {
        rateLimitStore.delete(k);
      }
    }
  }

  const record = rateLimitStore.get(key);

  if (!record || record.resetTime < now) {
    // Create new record or reset expired record
    const resetTime = now + RATE_LIMIT_WINDOW_MS;
    rateLimitStore.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: limit - 1, resetTime };
  }

  if (record.count >= limit) {
    // Rate limit exceeded
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  // Increment count
  record.count++;
  rateLimitStore.set(key, record);
  return { allowed: true, remaining: limit - record.count, resetTime: record.resetTime };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request);

  // Apply rate limiting to all API routes
  const rateLimit = checkRateLimit(ip, pathname);

  if (!rateLimit.allowed) {
    const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
    return NextResponse.json(
      {
        success: false,
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': loginRoutes.some(route => pathname.startsWith(route))
            ? LOGIN_RATE_LIMIT.toString()
            : MAX_REQUESTS_PER_WINDOW.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
        },
      }
    );
  }

  // Check if this is a protected page route
  const isProtectedPageRoute = protectedPageRoutes.some(route =>
    pathname.startsWith(route)
  );

  // Check if this is a protected API route
  const isProtectedApiRoute = protectedApiRoutes.some(route =>
    pathname.startsWith(route)
  );

  // Allow public routes
  const isPublicRoute = publicRoutes.some(route =>
    pathname.startsWith(route)
  );

  if ((!isProtectedApiRoute && !isProtectedPageRoute) || isPublicRoute) {
    // Add rate limit headers even for public routes
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString());
    return response;
  }

  // Check for mobile JWT token first (Authorization header)
  const authHeader = request.headers.get('authorization');
  let token = await verifyMobileToken(authHeader);

  // If no mobile token, try NextAuth session token
  if (!token) {
    token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
  }

  // If no token from either method, handle based on route type
  if (!token) {
    if (isProtectedPageRoute) {
      // Redirect to signin for page routes
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    } else {
      // Return JSON for API routes
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized - Authentication required',
          code: 'AUTH_REQUIRED'
        },
        { status: 401 }
      );
    }
  }

  // Verify user has required role (all routes require SUPER_ADMIN for now)
  if (token.role !== 'SUPER_ADMIN') {
    if (isProtectedPageRoute) {
      // Redirect to home for insufficient permissions on page routes
      return NextResponse.redirect(new URL('/', request.url));
    } else {
      // Return JSON for API routes
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden - Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS'
        },
        { status: 403 }
      );
    }
  }

  // Add user info to headers for API routes to access
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', token.sub as string);
  requestHeaders.set('x-user-email', token.email as string);
  requestHeaders.set('x-user-role', token.role as string);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Add rate limit headers to response
  response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
  response.headers.set('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString());

  return response;
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    '/api/:path*',
    '/((?!auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
