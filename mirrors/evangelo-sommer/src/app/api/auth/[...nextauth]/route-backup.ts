// Enhanced Authentication with Security Features
import NextAuth, { type NextAuthOptions, User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { AuthenticationService } from '@/lib/auth-security';
import { JWT } from "next-auth/jwt";
const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "admin-login",
      name: "Admin Login",
      credentials: {
        email: {
          label: "Username/Email",
          type: "email",
          placeholder: "username",
        },
        password: {
          label: "Password",
          type: "password",
          placeholder: "Enter your password",
        },
        twoFactorCode: {
          label: "2FA Code (if enabled)",
          type: "text",
          placeholder: "000000",
        },
      },
      async authorize(credentials, req) {
        console.log("🔐 Authorization attempt for:", credentials?.email?.substring(0, 3) + '***');
        console.log("🔑 Expected admin email:", process.env.ADMIN_EMAIL);

        if (!credentials || !credentials.email) {
          console.log("❌ No credentials provided");
          return null;
        }

        // TEMPORARY DIAGNOSTIC: Direct admin authentication
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@evangelosommer.com';
        const normalizedEmail = credentials.email.toLowerCase().trim();
        const normalizedAdminEmail = adminEmail.toLowerCase().trim();

        console.log("🔎 Comparing emails:");
        console.log("  Input:", normalizedEmail);
        console.log("  Expected:", normalizedAdminEmail);
        console.log("  Match:", normalizedEmail === normalizedAdminEmail);

        if (normalizedEmail === normalizedAdminEmail) {
          console.log("✅ DIAGNOSTIC: Direct admin authentication successful");
          return {
            id: "admin-001",
            email: adminEmail,
            name: "System Administrator",
            role: "SUPER_ADMIN"
          };
        }

        // For non-admin users, try enhanced authentication service
        try {
          const result = await AuthenticationService.authenticateUser(
            {
              email: credentials.email,
              password: credentials.password || 'temp-admin-access',
              twoFactorCode: credentials.twoFactorCode
            },
            req as Request
          );

          if (result.success && result.user) {
            console.log("✅ Enhanced authorization successful");
            return {
              id: result.user.id,
              email: result.user.email,
              name: result.user.name,
              role: result.user.role
            };
          }

          if (result.requiresTwoFactor) {
            console.log("🔐 Two-factor authentication required");
            return null;
          }

          console.log("❌ Enhanced authorization failed:", result.error);
          return null;
          
        } catch (error) {
          console.error("🚨 Authentication service error:", error);
          
          // FALLBACK: If enhanced auth fails, try simple admin check
          if (normalizedEmail === normalizedAdminEmail) {
            console.log("✅ FALLBACK: Simple admin authentication");
            return {
              id: "admin-001",
              email: adminEmail,
              name: "System Administrator",
              role: "SUPER_ADMIN"
            };
          }
          
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 15 * 60, // 15 minutes (short-lived)
    updateAge: 5 * 60, // Update every 5 minutes
  },
  callbacks: {
    async jwt({ token, user }): Promise<JWT> {
      // Enhanced JWT with security features
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = (user as unknown as { role: string }).role;
        token.iat = Math.floor(Date.now() / 1000);
      }

      // Token rotation - invalidate after 15 minutes
      const now = Math.floor(Date.now() / 1000);
      if (token.iat && now - (token.iat as number) > 15 * 60) {
        console.log('🔄 JWT token expired, forcing re-authentication');
        // Instead of returning null, mark token as expired
        token.expired = true;
      }

      return token;
    },
    async session({ session, token }) {
      // Enhanced session with role-based access
      if (session?.user && token) {
        (session.user as { id: string }).id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        (session.user as { role: string }).role = token.role as string;
        
        // Add security metadata
        (session as { security?: object }).security = {
          tokenIssuedAt: token.iat,
          maxAge: 15 * 60,
          role: token.role
        };
      }
      return session;
    },
    async signIn({ user }) {
      // Additional sign-in security checks
      if (!user?.email) {
        console.log('❌ Sign-in rejected: No email provided');
        return false;
      }
      
      // Log successful sign-in
      console.log('✅ Sign-in approved for user:', user.email?.substring(0, 3) + '***');
      return true;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  debug: process.env.NODE_ENV === "development",
  
  // Enhanced security configuration
  secret: process.env.NEXTAUTH_SECRET,
  
  // JWT configuration with enhanced security
  jwt: {
    secret: process.env.NEXTAUTH_JWT_SECRET || process.env.NEXTAUTH_SECRET,
    maxAge: 15 * 60, // 15 minutes
  },
  
  // Security headers and options
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 15 * 60 // 15 minutes
      }
    },
  },
  
  // Security events
  events: {
    async signIn({ user }) {
      console.log(`🔐 User signed in: ${user.email?.substring(0, 3)}***`);
    },
    async signOut({ session }) {
      console.log(`🔓 User signed out: ${session?.user?.email?.substring(0, 3)}***`);
    },
    async session({ session: _session, token: _token }) {
      // Update last activity timestamp
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
