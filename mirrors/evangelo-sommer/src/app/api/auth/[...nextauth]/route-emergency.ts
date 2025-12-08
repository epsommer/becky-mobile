// EMERGENCY SIMPLE AUTHENTICATION ROUTE
import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

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
      },
      async authorize(credentials) {
        console.log("🔐 EMERGENCY AUTH - Email provided:", credentials?.email);
        
        if (!credentials || !credentials.email) {
          console.log("❌ EMERGENCY AUTH - No email provided");
          return null;
        }

        const adminEmail = process.env.ADMIN_EMAIL || "admin@evangelosommer.com";
        const inputEmail = credentials.email.toLowerCase().trim();
        const expectedEmail = adminEmail.toLowerCase().trim();

        console.log("🔍 EMERGENCY AUTH - Comparing:");
        console.log("  Input:", inputEmail);
        console.log("  Expected:", expectedEmail);
        console.log("  Match:", inputEmail === expectedEmail);

        if (inputEmail === expectedEmail) {
          console.log("✅ EMERGENCY AUTH - SUCCESS");
          return {
            id: "admin-001",
            email: adminEmail,
            name: "System Administrator",
            role: "SUPER_ADMIN"
          };
        }

        console.log("❌ EMERGENCY AUTH - FAILED");
        return null;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
        token.role = (user as unknown as { role: string }).role;
        console.log("🎫 JWT created for:", user.email?.substring(0, 3) + "***");
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user && token) {
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        (session.user as { role: string }).role = token.role as string;
        console.log("🎫 Session created for:", session.user.email?.substring(0, 3) + "***");
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  debug: true, // Force debug mode
  secret: process.env.NEXTAUTH_SECRET || "emergency-secret-key-123",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };