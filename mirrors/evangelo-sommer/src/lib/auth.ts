// Shared NextAuth configuration
import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
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
      },
      async authorize(credentials) {
        console.log("🔐 SECURE AUTH - Login attempt for:", credentials?.email?.substring(0, 3) + '***');

        if (!credentials || !credentials.email) {
          console.log("❌ SECURE AUTH - No credentials provided");
          return null;
        }

        const inputEmail = credentials.email.toLowerCase().trim();
        console.log("📧 Input email:", inputEmail);
        console.log("🔑 Password provided:", !!credentials.password);

        // Always require password
        if (!credentials.password) {
          console.log("❌ AUTH - No password provided");
          return null;
        }

        try {
          // Check database for admin user
          const adminUser = await prisma.adminUser.findUnique({
            where: { email: inputEmail }
          });

          if (!adminUser) {
            console.log("❌ AUTH - User not found in database");
            return null;
          }

          if (!adminUser.isActive) {
            console.log("❌ AUTH - User account is deactivated");
            return null;
          }

          // Verify password against database hash
          const isValidPassword = await bcrypt.compare(
            credentials.password,
            adminUser.passwordHash
          );

          if (isValidPassword) {
            console.log("✅ AUTH - Success");
            return {
              id: adminUser.id,
              email: adminUser.email,
              name: adminUser.name,
              role: adminUser.role
            };
          } else {
            console.log("❌ AUTH - Invalid password");
            return null;
          }
        } catch (error) {
          console.error("❌ AUTH ERROR - Database or password verification failed:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: process.env.NODE_ENV === 'production' ? 3600 : 86400, // 1 hour prod, 24 hours dev
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
        token.role = (user as any).role;
        token.env = process.env.NODE_ENV;
        console.log("🎫 JWT created for:", user.email?.substring(0, 3) + "***", "in", process.env.NODE_ENV);
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user && token) {
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        (session.user as any).role = token.role;
        (session.user as any).env = token.env;
        console.log("🎫 Session created for:", session.user.email?.substring(0, 3) + "***");
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      // All authentication is handled in authorize callback
      return true;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET || (
    process.env.NODE_ENV === 'production'
      ? undefined // Force error in production if no secret
      : "dev-secret-key-123" // Only allow fallback in development
  ),
};
